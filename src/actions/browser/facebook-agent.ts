/**
 * Facebook AI Agent — autonomous Facebook automation with AI-generated content.
 * Ported from Python/Selenium to TypeScript/Playwright.
 *
 * Capabilities: posting, commenting, friend requests, group joins, messaging.
 * Uses OpenRouter/Anthropic for smart content generation with configurable tone.
 * Includes scheduling, safety limits, active hours, and self-post avoidance.
 */
import { BrowserSessionManager } from './session-manager.js';
import { FacebookAccountManager, type FacebookAccount } from './facebook-manager.js';
import { toPlaywrightCookies, validateFacebookCookies } from './facebook-cookies.js';
import { AIClient, type AIRequest } from '../../core/ai-client.js';
import logger from '../../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────

export type ActionType = 'post' | 'comment' | 'friend_request' | 'group_join' | 'message';

export interface AgentConfig {
  /** Account ID from FacebookAccountManager */
  accountId: string;
  /** Enabled action types */
  actions: ActionType[];
  /** Scheduling config per action */
  schedule: Record<ActionType, { intervalMinutes: number; dailyLimit: number }>;
  /** Active hours (24h format) */
  activeHours: { weekday: { start: number; end: number }; weekend: { start: number; end: number } };
  /** Content generation settings */
  content: {
    tone: string;            // e.g. "friendly and professional"
    language: string;        // e.g. "Hebrew" or "English"
    topics: string[];        // e.g. ["tech", "marketing"]
    promoLink?: string;      // Optional promotional link to inject
    promoFrequency: number;  // 0-1, percentage of posts with promo link
    maxLength: number;       // Max chars per generated content
  };
  /** Safety limits */
  safety: {
    minDelaySeconds: number;     // Min delay between any actions
    maxActionsPerHour: number;
    pauseOnErrorCount: number;   // Pause after N consecutive errors
    pauseDurationMinutes: number;
  };
  /** Group URLs to interact with */
  groups: string[];
  /** Test mode — log actions but don't execute */
  testMode: boolean;
}

export interface AgentStatus {
  accountId: string;
  state: 'stopped' | 'running' | 'paused' | 'error';
  sessionId: string | null;
  currentAction: string | null;
  stats: AgentStats;
  lastError: string | null;
  startedAt: string | null;
  lastAction: string | null;
  lastActionTime: string | null;
  nextActionTime: string | null;
  config: AgentConfig;
}

export interface AgentStats {
  posts: number;
  comments: number;
  friendRequests: number;
  groupJoins: number;
  messages: number;
  errors: number;
  totalActions: number;
  actionsThisHour: number;
  lastActionAt: string | null;
}

export interface AgentLogEntry {
  timestamp: string;
  action: ActionType | 'system';
  status: 'success' | 'error' | 'skipped' | 'info';
  message: string;
  details?: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  accountId: '',
  actions: ['post', 'comment'],
  schedule: {
    post: { intervalMinutes: 60, dailyLimit: 5 },
    comment: { intervalMinutes: 30, dailyLimit: 20 },
    friend_request: { intervalMinutes: 120, dailyLimit: 10 },
    group_join: { intervalMinutes: 180, dailyLimit: 3 },
    message: { intervalMinutes: 45, dailyLimit: 10 },
  },
  activeHours: {
    weekday: { start: 8, end: 22 },
    weekend: { start: 10, end: 23 },
  },
  content: {
    tone: 'friendly and engaging',
    language: 'Hebrew',
    topics: ['general'],
    promoFrequency: 0,
    maxLength: 500,
  },
  safety: {
    minDelaySeconds: 30,
    maxActionsPerHour: 15,
    pauseOnErrorCount: 3,
    pauseDurationMinutes: 30,
  },
  groups: [],
  testMode: false,
};

// ── Facebook Agent Class ──────────────────────────────────────────────

export class FacebookAgent {
  private static instances: Map<string, FacebookAgent> = new Map();

  private config: AgentConfig;
  private state: 'stopped' | 'running' | 'paused' | 'error' = 'stopped';
  private sessionId: string | null = null;
  private currentAction: string | null = null;
  private stats: AgentStats = this.freshStats();
  private lastError: string | null = null;
  private startedAt: string | null = null;
  private logs: AgentLogEntry[] = [];
  private consecutiveErrors = 0;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActionTimes: Map<ActionType, number> = new Map();
  private dailyActionCounts: Map<ActionType, number> = new Map();
  private dailyResetDate: string = '';
  private selfPostIds: Set<string> = new Set();
  private aiClient: AIClient;

  private constructor(config: AgentConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiClient = new AIClient();
  }

  /** Get or create an agent for an account */
  static getAgent(accountId: string): FacebookAgent | undefined {
    return FacebookAgent.instances.get(accountId);
  }

  /** Create a new agent for an account */
  static createAgent(config: AgentConfig): FacebookAgent {
    if (FacebookAgent.instances.has(config.accountId)) {
      throw new Error(`Agent already exists for account ${config.accountId}`);
    }
    const agent = new FacebookAgent(config);
    FacebookAgent.instances.set(config.accountId, agent);
    return agent;
  }

  /** Remove agent instance */
  static removeAgent(accountId: string): void {
    const agent = FacebookAgent.instances.get(accountId);
    if (agent) {
      agent.stop().catch(() => {});
      FacebookAgent.instances.delete(accountId);
    }
  }

  /** List all active agents */
  static listAgents(): AgentStatus[] {
    return [...FacebookAgent.instances.values()].map(a => a.getStatus());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.state === 'running') throw new Error('Agent is already running');

    const fbMgr = FacebookAccountManager.getInstance();
    const account = fbMgr.getAccount(this.config.accountId);
    if (!account) throw new Error(`Account ${this.config.accountId} not found`);

    const validation = validateFacebookCookies(account.cookies);
    if (!validation.valid) {
      throw new Error(`Cannot start — missing cookies: ${validation.missing.join(', ')}`);
    }

    this.state = 'running';
    this.startedAt = new Date().toISOString();
    this.consecutiveErrors = 0;
    this.stats = this.freshStats();
    this.log('system', 'info', `Agent started for account "${account.name}"`);

    // Launch browser session
    try {
      await this.ensureSession(account);
      this.log('system', 'info', `Browser session ready: ${this.sessionId}`);
    } catch (err: any) {
      this.state = 'error';
      this.lastError = err.message;
      this.log('system', 'error', `Failed to launch browser: ${err.message}`);
      throw err;
    }

    // Start the agent loop
    this.scheduleNextAction();
  }

  async stop(): Promise<void> {
    this.state = 'stopped';
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    // Close browser session
    if (this.sessionId) {
      try {
        const mgr = BrowserSessionManager.getInstance();
        await mgr.closeSession(this.sessionId);
      } catch { /* best effort */ }
      this.sessionId = null;
    }

    this.log('system', 'info', 'Agent stopped');
    logger.info('Facebook agent stopped', { accountId: this.config.accountId });
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.log('system', 'info', 'Agent paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.consecutiveErrors = 0;
    this.log('system', 'info', 'Agent resumed');
    this.scheduleNextAction();
  }

  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    this.log('system', 'info', 'Configuration updated');
  }

  getStatus(): AgentStatus {
    // Calculate last action info
    let lastAction: string | null = null;
    let lastActionTime: string | null = this.stats.lastActionAt;
    let latestTime = 0;
    for (const [action, time] of this.lastActionTimes) {
      if (time > latestTime) {
        latestTime = time;
        lastAction = action;
      }
    }

    // Estimate next action time
    let nextActionTime: string | null = null;
    if (this.state === 'running') {
      const nextDelay = this.config.safety.minDelaySeconds * 1000;
      const lastMs = latestTime || Date.now();
      nextActionTime = new Date(lastMs + nextDelay).toISOString();
    }

    return {
      accountId: this.config.accountId,
      state: this.state,
      sessionId: this.sessionId,
      currentAction: this.currentAction,
      stats: { ...this.stats },
      lastError: this.lastError,
      startedAt: this.startedAt,
      lastAction,
      lastActionTime,
      nextActionTime,
      config: this.config,
    };
  }

  getLogs(limit = 50): AgentLogEntry[] {
    return this.logs.slice(-limit);
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  // ── Main Agent Loop ───────────────────────────────────────────────

  private scheduleNextAction(): void {
    if (this.state !== 'running') return;

    const delay = Math.max(this.config.safety.minDelaySeconds * 1000, 5000);
    this.loopTimer = setTimeout(() => this.actionLoop(), delay);
  }

  private async actionLoop(): Promise<void> {
    if (this.state !== 'running') return;

    try {
      // Check active hours
      if (!this.isWithinActiveHours()) {
        this.log('system', 'skipped', 'Outside active hours, sleeping 5 min');
        this.loopTimer = setTimeout(() => this.actionLoop(), 5 * 60_000);
        return;
      }

      // Check hourly limit
      this.updateHourlyCount();
      if (this.stats.actionsThisHour >= this.config.safety.maxActionsPerHour) {
        this.log('system', 'skipped', `Hourly limit reached (${this.stats.actionsThisHour}/${this.config.safety.maxActionsPerHour})`);
        this.loopTimer = setTimeout(() => this.actionLoop(), 60_000);
        return;
      }

      // Reset daily counters if new day
      this.resetDailyCountsIfNeeded();

      // Pick next action
      const action = this.pickNextAction();
      if (!action) {
        this.log('system', 'skipped', 'No actions available (all at daily limit or not ready)');
        this.loopTimer = setTimeout(() => this.actionLoop(), 60_000);
        return;
      }

      // Ensure we have a valid browser session
      const account = FacebookAccountManager.getInstance().getAccount(this.config.accountId);
      if (!account) {
        this.state = 'error';
        this.lastError = 'Account deleted';
        return;
      }
      await this.ensureSession(account);

      // Validate browser is responsive before executing
      const page = this.getPage();
      if (!page) {
        this.log('system', 'error', 'Browser page not available — recreating session');
        this.sessionId = null;
        await this.ensureSession(account);
        if (!this.getPage()) throw new Error('Failed to create browser session');
      } else {
        // Quick health check — can we still interact with the page?
        try {
          await page.evaluate('1 + 1');
        } catch {
          this.log('system', 'error', 'Browser unresponsive — recreating session');
          this.sessionId = null;
          await this.ensureSession(account);
        }
      }

      // Execute the action
      this.currentAction = action;
      await this.executeAction(action);
      this.currentAction = null;
      this.consecutiveErrors = 0;

    } catch (err: any) {
      this.consecutiveErrors++;
      this.stats.errors++;
      this.lastError = err.message;
      this.currentAction = null;
      // Include stack trace for better debugging
      const stack = err.stack ? `\n${err.stack.split('\n').slice(0, 5).join('\n')}` : '';
      this.log('system', 'error', `Action loop error: ${err.message}`, stack);

      // Auto-pause on too many consecutive errors
      if (this.consecutiveErrors >= this.config.safety.pauseOnErrorCount) {
        this.state = 'paused';
        this.log('system', 'error', `Paused after ${this.consecutiveErrors} consecutive errors. Will resume in ${this.config.safety.pauseDurationMinutes} min.`);

        this.loopTimer = setTimeout(() => {
          if (this.state === 'paused') {
            this.state = 'running';
            this.consecutiveErrors = 0;
            this.log('system', 'info', 'Auto-resumed after error pause');
            this.actionLoop();
          }
        }, this.config.safety.pauseDurationMinutes * 60_000);
        return;
      }
    }

    // Schedule next
    this.scheduleNextAction();
  }

  // ── Action Execution ──────────────────────────────────────────────

  private async executeAction(action: ActionType): Promise<void> {
    const page = this.getPage();
    if (!page) throw new Error('No active page');

    this.log(action, 'info', `Executing: ${action}`);

    switch (action) {
      case 'post':
        await this.executePost(page);
        break;
      case 'comment':
        await this.executeComment(page);
        break;
      case 'friend_request':
        await this.executeFriendRequest(page);
        break;
      case 'group_join':
        await this.executeGroupJoin(page);
        break;
      case 'message':
        await this.executeMessage(page);
        break;
    }

    // Update stats
    this.stats.totalActions++;
    this.stats.actionsThisHour++;
    this.stats.lastActionAt = new Date().toISOString();
    this.lastActionTimes.set(action, Date.now());
    this.dailyActionCounts.set(action, (this.dailyActionCounts.get(action) || 0) + 1);

    switch (action) {
      case 'post': this.stats.posts++; break;
      case 'comment': this.stats.comments++; break;
      case 'friend_request': this.stats.friendRequests++; break;
      case 'group_join': this.stats.groupJoins++; break;
      case 'message': this.stats.messages++; break;
    }
  }

  // ── Post Action ───────────────────────────────────────────────────

  private async executePost(page: any): Promise<void> {
    // Navigate to Facebook home
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.randomDelay(2000, 4000);

    // Generate content
    const content = await this.generateContent('post', {
      context: 'Writing a new Facebook post on my timeline',
    });

    if (this.config.testMode) {
      this.log('post', 'success', `[TEST] Would post: "${content.slice(0, 100)}..."`);
      return;
    }

    // Click "What's on your mind?" to open post composer
    try {
      const composerTrigger = await page.$('[aria-label="What\'s on your mind?"], [role="button"][aria-label*="mind"], span:text("What\'s on your mind")');
      if (composerTrigger) {
        await composerTrigger.click();
        await this.randomDelay(1500, 3000);
      } else {
        // Try alternative selector
        await page.click('[data-pagelet="FeedComposer"] [role="button"], [aria-label="Create a post"]', { timeout: 5000 });
        await this.randomDelay(1500, 3000);
      }
    } catch {
      this.log('post', 'error', 'Could not find post composer');
      throw new Error('Post composer not found');
    }

    // Type the content
    try {
      const editor = await page.$('[contenteditable="true"][role="textbox"], [data-contents="true"], div[aria-label*="post"]');
      if (editor) {
        await editor.click();
        await this.typeHumanLike(page, editor, content);
        await this.randomDelay(1000, 2000);
      } else {
        throw new Error('Post editor not found');
      }
    } catch (err: any) {
      this.log('post', 'error', `Failed to type post: ${err.message}`);
      throw err;
    }

    // Click Post button
    try {
      await page.click('[aria-label="Post"], button:has-text("Post"), [data-testid="post-button"]', { timeout: 5000 });
      await this.randomDelay(3000, 5000);
      this.log('post', 'success', `Posted: "${content.slice(0, 80)}..."`);
    } catch (err: any) {
      this.log('post', 'error', `Failed to submit post: ${err.message}`);
      // Try to close the dialog
      await page.keyboard.press('Escape').catch(() => {});
      throw err;
    }
  }

  // ── Comment Action ────────────────────────────────────────────────

  private async executeComment(page: any): Promise<void> {
    // Navigate to news feed
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.randomDelay(3000, 5000);

    // Scroll to find posts
    await page.evaluate('window.scrollBy(0, 400)');
    await this.randomDelay(1500, 3000);

    // Find posts in the feed
    const posts = await page.$$('[data-pagelet^="FeedUnit"], [role="article"]');
    if (posts.length === 0) {
      this.log('comment', 'skipped', 'No posts found in feed');
      return;
    }

    // Pick a random post (avoid first 1-2 which may be ads/pinned)
    const startIdx = Math.min(2, posts.length - 1);
    const postIdx = startIdx + Math.floor(Math.random() * Math.min(5, posts.length - startIdx));
    const post = posts[Math.min(postIdx, posts.length - 1)];

    // Read the post content for context
    let postText = '';
    try {
      postText = await post.evaluate((el: any) => {
        const textEl = el.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"], div[dir="auto"]');
        return (textEl?.textContent || el.textContent || '').slice(0, 500);
      });
    } catch { /* */ }

    // Check if this is our own post (avoid self-commenting)
    const isOwnPost = await this.isOwnPost(post);
    if (isOwnPost) {
      this.log('comment', 'skipped', 'Skipping own post');
      return;
    }

    // Generate contextual comment
    const content = await this.generateContent('comment', {
      context: `Commenting on a Facebook post. The post says: "${postText.slice(0, 300)}"`,
    });

    if (this.config.testMode) {
      this.log('comment', 'success', `[TEST] Would comment: "${content.slice(0, 100)}..."`);
      return;
    }

    // Click comment button on the post
    try {
      const commentBtn = await post.$('[aria-label="Leave a comment"], [aria-label*="Comment"], [data-testid="UFI2CommentLink"]');
      if (commentBtn) {
        await commentBtn.click();
      } else {
        // Try clicking "Comment" text
        const commentText = await post.$('span:has-text("Comment")');
        if (commentText) await commentText.click();
        else throw new Error('Comment button not found');
      }
      await this.randomDelay(1500, 2500);
    } catch (err: any) {
      this.log('comment', 'error', `Could not click comment: ${err.message}`);
      throw err;
    }

    // Type the comment
    try {
      const commentBox = await post.$('[contenteditable="true"][role="textbox"], [placeholder*="comment" i]');
      if (commentBox) {
        await commentBox.click();
        await this.typeHumanLike(page, commentBox, content);
        await this.randomDelay(500, 1500);

        // Submit with Enter
        await page.keyboard.press('Enter');
        await this.randomDelay(2000, 4000);
        this.log('comment', 'success', `Commented: "${content.slice(0, 80)}..."`);
      } else {
        throw new Error('Comment box not found');
      }
    } catch (err: any) {
      this.log('comment', 'error', `Failed to type comment: ${err.message}`);
      throw err;
    }
  }

  // ── Friend Request Action ─────────────────────────────────────────

  private async executeFriendRequest(page: any): Promise<void> {
    // Navigate to "People You May Know"
    await page.goto('https://www.facebook.com/find-friends/browser/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.randomDelay(3000, 5000);

    if (this.config.testMode) {
      this.log('friend_request', 'success', '[TEST] Would send friend request');
      return;
    }

    // Find "Add Friend" buttons
    try {
      const addButtons = await page.$$('[aria-label="Add friend"], button:has-text("Add Friend"), [aria-label*="Add Friend"]');
      if (addButtons.length === 0) {
        this.log('friend_request', 'skipped', 'No friend suggestions found');
        return;
      }

      // Pick a random one (not the first — more natural)
      const idx = Math.floor(Math.random() * Math.min(5, addButtons.length));
      await addButtons[idx].click();
      await this.randomDelay(2000, 4000);
      this.log('friend_request', 'success', 'Friend request sent');
    } catch (err: any) {
      this.log('friend_request', 'error', `Failed: ${err.message}`);
      throw err;
    }
  }

  // ── Group Join Action ─────────────────────────────────────────────

  private async executeGroupJoin(page: any): Promise<void> {
    if (this.config.groups.length === 0) {
      this.log('group_join', 'skipped', 'No groups configured');
      return;
    }

    // Pick a random group from config
    const groupUrl = this.config.groups[Math.floor(Math.random() * this.config.groups.length)];
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.randomDelay(3000, 5000);

    if (this.config.testMode) {
      this.log('group_join', 'success', `[TEST] Would join group: ${groupUrl}`);
      return;
    }

    try {
      const joinBtn = await page.$('[aria-label="Join group"], button:has-text("Join Group"), button:has-text("Join")');
      if (joinBtn) {
        await joinBtn.click();
        await this.randomDelay(2000, 4000);
        this.log('group_join', 'success', `Joined group: ${groupUrl}`);
      } else {
        this.log('group_join', 'skipped', 'No join button found (may already be a member)');
      }
    } catch (err: any) {
      this.log('group_join', 'error', `Failed to join: ${err.message}`);
      throw err;
    }
  }

  // ── Message Action ────────────────────────────────────────────────

  private async executeMessage(page: any): Promise<void> {
    // Navigate to Messenger
    await page.goto('https://www.facebook.com/messages/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.randomDelay(3000, 5000);

    // Find recent conversations
    const convos = await page.$$('[data-testid="mwthreadlist-item"], [role="row"][aria-label], a[href*="/messages/t/"]');
    if (convos.length === 0) {
      this.log('message', 'skipped', 'No conversations found');
      return;
    }

    // Pick a recent conversation
    const idx = Math.floor(Math.random() * Math.min(5, convos.length));
    await convos[idx].click();
    await this.randomDelay(2000, 4000);

    // Read the last few messages for context
    let lastMessages = '';
    try {
      lastMessages = await page.evaluate(`(() => {
        const msgs = document.querySelectorAll('[data-scope="messages_table"] div[dir="auto"], [role="row"] div[dir="auto"]');
        return [...msgs].slice(-5).map(m => m.textContent?.trim()).filter(Boolean).join(' | ');
      })()`);
    } catch { /* */ }

    // Generate response
    const content = await this.generateContent('message', {
      context: `Replying to a Facebook Messenger conversation. Recent messages: "${lastMessages.slice(0, 300)}"`,
    });

    if (this.config.testMode) {
      this.log('message', 'success', `[TEST] Would message: "${content.slice(0, 100)}..."`);
      return;
    }

    // Type and send
    try {
      const msgBox = await page.$('[contenteditable="true"][role="textbox"], [aria-label*="message" i][contenteditable="true"]');
      if (msgBox) {
        await msgBox.click();
        await this.typeHumanLike(page, msgBox, content);
        await this.randomDelay(500, 1500);
        await page.keyboard.press('Enter');
        await this.randomDelay(2000, 3000);
        this.log('message', 'success', `Sent message: "${content.slice(0, 80)}..."`);
      } else {
        throw new Error('Message box not found');
      }
    } catch (err: any) {
      this.log('message', 'error', `Failed to send message: ${err.message}`);
      throw err;
    }
  }

  // ── AI Content Generation ─────────────────────────────────────────

  private async generateContent(action: ActionType, opts: { context: string }): Promise<string> {
    const { tone, language, topics, promoLink, promoFrequency, maxLength } = this.config.content;

    const shouldIncludePromo = promoLink && Math.random() < promoFrequency;

    const systemPrompt = `You are a social media content generator for Facebook.
Write in ${language}. Tone: ${tone}.
Topics of interest: ${topics.join(', ')}.
${shouldIncludePromo ? `Include this promotional link naturally: ${promoLink}` : ''}
Rules:
- Maximum ${maxLength} characters
- Sound natural and human, never robotic
- No hashtag spam (max 2-3 relevant ones for posts only)
- For comments: be brief, authentic, add value to the conversation
- For messages: be conversational and friendly
- NEVER mention being an AI or automated
- Output ONLY the content text, nothing else`;

    const userPrompt = `Action: ${action}
Context: ${opts.context}

Generate the content:`;

    try {
      const response = await this.aiClient.chat({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: Math.ceil(maxLength / 2),
        temperature: 0.8,
        isSubAgent: true, // Use cheaper models
      });

      let text = response.content.trim();
      // Strip quotes if the AI wrapped it
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1);
      }

      return text.slice(0, maxLength);
    } catch (err: any) {
      this.log(action, 'error', `AI generation failed: ${err.message}`);
      throw new Error(`Content generation failed: ${err.message}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async ensureSession(account: FacebookAccount): Promise<void> {
    const mgr = BrowserSessionManager.getInstance();

    // Check if existing session is still valid
    if (this.sessionId) {
      const session = mgr.getSession(this.sessionId);
      if (session && session.status === 'running') return;
      this.sessionId = null;
    }

    // Create new headless session
    const session = await mgr.createSession(undefined, false);
    this.sessionId = session.id;

    // Inject cookies
    const page = mgr.getPage(session.id);
    if (!page) throw new Error('Failed to get page');

    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const context = page.context();
    await context.addCookies(toPlaywrightCookies(account.cookies));
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);
  }

  private getPage(): any {
    if (!this.sessionId) return null;
    return BrowserSessionManager.getInstance().getPage(this.sessionId);
  }

  private async isOwnPost(postElement: any): Promise<boolean> {
    try {
      const postId = await postElement.evaluate((el: any) => {
        return el.getAttribute('data-pagelet') || el.getAttribute('id') || '';
      });
      return this.selfPostIds.has(postId);
    } catch {
      return false;
    }
  }

  private async typeHumanLike(page: any, element: any, text: string): Promise<void> {
    // Type character by character with random delays for human-like behavior
    for (const char of text) {
      await element.type(char, { delay: 30 + Math.random() * 80 });
      // Occasional longer pause (like thinking)
      if (Math.random() < 0.05) {
        await this.randomDelay(300, 800);
      }
    }
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(r => setTimeout(r, delay));
  }

  private isWithinActiveHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const hours = isWeekend ? this.config.activeHours.weekend : this.config.activeHours.weekday;
    return hour >= hours.start && hour < hours.end;
  }

  private pickNextAction(): ActionType | null {
    const now = Date.now();
    const available: { action: ActionType; priority: number }[] = [];

    for (const action of this.config.actions) {
      const schedule = this.config.schedule[action];
      const lastTime = this.lastActionTimes.get(action) || 0;
      const dailyCount = this.dailyActionCounts.get(action) || 0;

      // Check daily limit
      if (dailyCount >= schedule.dailyLimit) continue;

      // Check interval
      const elapsed = now - lastTime;
      const intervalMs = schedule.intervalMinutes * 60_000;
      if (elapsed < intervalMs) continue;

      // Priority: actions that haven't been done recently get higher priority
      const priority = elapsed / intervalMs;
      available.push({ action, priority });
    }

    if (available.length === 0) return null;

    // Weighted random selection based on priority
    const totalPriority = available.reduce((sum, a) => sum + a.priority, 0);
    let rand = Math.random() * totalPriority;
    for (const { action, priority } of available) {
      rand -= priority;
      if (rand <= 0) return action;
    }

    return available[0].action;
  }

  private updateHourlyCount(): void {
    // Simple hourly tracking — reset if last action was more than 1 hour ago
    const now = Date.now();
    const lastAction = this.stats.lastActionAt ? new Date(this.stats.lastActionAt).getTime() : 0;
    if (now - lastAction > 3600_000) {
      this.stats.actionsThisHour = 0;
    }
  }

  private resetDailyCountsIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyResetDate !== today) {
      this.dailyResetDate = today;
      this.dailyActionCounts.clear();
    }
  }

  private freshStats(): AgentStats {
    return {
      posts: 0, comments: 0, friendRequests: 0, groupJoins: 0, messages: 0,
      errors: 0, totalActions: 0, actionsThisHour: 0, lastActionAt: null,
    };
  }

  private log(action: ActionType | 'system', status: AgentLogEntry['status'], message: string, details?: string): void {
    const entry: AgentLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      status,
      message,
      details,
    };
    this.logs.push(entry);
    // Keep last 500 entries
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
    logger.info(`[FB-Agent] ${action}: ${message}`, { accountId: this.config.accountId, status });
  }
}
