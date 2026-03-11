/**
 * WhatsApp Group Link Watcher
 *
 * Polls all group chats every 10 minutes, detects WhatsApp invite links
 * (https://chat.whatsapp.com/XXX) using regex + a free LLM via OpenRouter,
 * and automatically joins any new groups found.
 */

import logger from '../../utils/logger.js';
import { getWAClient, WAChat, WAClientHandle, WAMessage } from '../../interfaces/whatsapp/auth.js';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FREE_MODEL = 'google/gemma-3-12b-it:free';
const INVITE_REGEX = /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]{10,})/g;
const MAX_LOG_ENTRIES = 100;

export interface WatcherLogEntry {
  ts: number;
  type: 'scan' | 'found' | 'joined' | 'already_joined' | 'error' | 'skip';
  message: string;
  chatName?: string;
  inviteCode?: string;
}

interface WatcherStatus {
  running: boolean;
  startedAt: number | null;
  lastTickAt: number | null;
  nextTickAt: number | null;
  chatsScanned: number;
  linksFound: number;
  groupsJoined: number;
  log: WatcherLogEntry[];
}

class GroupLinkWatcher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private startedAt: number | null = null;
  private lastTickAt: number | null = null;
  private nextTickAt: number | null = null;

  /** chatId → timestamp of last processed message (to avoid reprocessing) */
  private lastSeenAt = new Map<string, number>();
  /** invite codes already attempted (success or failure) — prevent duplicates */
  private joinedCodes = new Set<string>();
  /** subset of joinedCodes that actually succeeded */
  private successfulCodes = new Set<string>();

  private chatsScanned = 0;
  private linksFound = 0;
  private groupsJoined = 0;
  private log: WatcherLogEntry[] = [];

  start(): { ok: boolean; message: string } {
    if (this.running) {
      return { ok: false, message: 'Watcher is already running' };
    }

    this.running = true;
    this.startedAt = Date.now();
    this.addLog('scan', 'Watcher started — will poll every 10 minutes');

    // Run immediately on start, then every 10 min
    this.runTick();
    this.timer = setInterval(() => this.runTick(), POLL_INTERVAL_MS);

    return { ok: true, message: 'Watcher started — first scan running now' };
  }

  stop(): { ok: boolean; message: string } {
    if (!this.running) {
      return { ok: false, message: 'Watcher is not running' };
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;
    this.nextTickAt = null;
    this.addLog('scan', 'Watcher stopped');

    return { ok: true, message: 'Watcher stopped' };
  }

  getStatus(): WatcherStatus {
    return {
      running: this.running,
      startedAt: this.startedAt,
      lastTickAt: this.lastTickAt,
      nextTickAt: this.nextTickAt,
      chatsScanned: this.chatsScanned,
      linksFound: this.linksFound,
      groupsJoined: this.groupsJoined,
      log: [...this.log].reverse(), // newest first
    };
  }

  /** Reset stats & seen-state (useful for testing) */
  reset() {
    this.lastSeenAt.clear();
    this.joinedCodes.clear();
    this.successfulCodes.clear();
    this.chatsScanned = 0;
    this.linksFound = 0;
    this.groupsJoined = 0;
    this.log = [];
    this.addLog('scan', 'Watcher state reset');
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private runTick() {
    this.lastTickAt = Date.now();
    this.nextTickAt = Date.now() + POLL_INTERVAL_MS;
    this.tick().catch(err => {
      logger.error('GroupLinkWatcher tick error', { error: err.message });
      this.addLog('error', `Tick error: ${err.message}`);
    });
  }

  private async tick() {
    const client = getWAClient();
    if (!client) {
      this.addLog('skip', 'WhatsApp not connected — skipping scan');
      return;
    }

    this.addLog('scan', 'Starting group chat scan…');

    const allChats = await client.getChats();
    const groups = allChats.filter(c => c.isGroup);

    this.addLog('scan', `Found ${groups.length} groups to scan`);

    for (const group of groups) {
      await this.scanGroup(client, group).catch(err => {
        logger.warn('GroupLinkWatcher: error scanning group', {
          group: group.name,
          error: err.message,
        });
        this.addLog('error', `Error scanning "${group.name}": ${err.message}`, group.name);
      });
    }

    this.addLog('scan', `Scan complete — ${this.chatsScanned} chats processed, ${this.groupsJoined} groups joined total`);
  }

  private async scanGroup(client: WAClientHandle, group: WAChat) {
    const chatId: string = group.id._serialized;
    const chatName: string = group.name ?? chatId;
    const lastSeen = this.lastSeenAt.get(chatId) ?? 0;

    const msgs: WAMessage[] = await group.fetchMessages({ limit: 30 });
    this.chatsScanned++;

    // Only look at messages newer than what we've already processed
    const newMsgs = msgs.filter(m => m.timestamp > lastSeen && !m.fromMe);

    if (newMsgs.length === 0) return;

    // Update high-water mark
    const maxTs = Math.max(...newMsgs.map(m => m.timestamp));
    this.lastSeenAt.set(chatId, maxTs);

    // Step 1: Regex scan — fast and reliable
    const regexCodes = this.extractCodesViaRegex(newMsgs.map(m => m.body ?? '').join('\n'));

    // Step 2: LLM scan — catches edge cases (shortened, partial, mentioned inline)
    let llmCodes: string[] = [];
    const combinedText = newMsgs.map(m => m.body ?? '').join('\n');
    if (combinedText.trim().length > 0) {
      llmCodes = await this.extractCodesViaLLM(combinedText, chatName);
    }

    const allCodes = [...new Set([...regexCodes, ...llmCodes])];

    if (allCodes.length === 0) return;

    this.linksFound += allCodes.length;
    this.addLog('found', `Found ${allCodes.length} invite link(s) in "${chatName}"`, chatName);

    for (const code of allCodes) {
      await this.joinGroup(client, code, chatName);
    }
  }

  private extractCodesViaRegex(text: string): string[] {
    const codes: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(INVITE_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      codes.push(match[1]);
    }
    return codes;
  }

  private async extractCodesViaLLM(text: string, chatName: string): Promise<string[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logger.warn('GroupLinkWatcher: OPENROUTER_API_KEY not set — LLM link detection disabled, regex-only mode active');
      return [];
    }

    try {
      const prompt = `You are a WhatsApp group link detector. Your ONLY job is to find WhatsApp group invite links in the text below.

A WhatsApp invite link looks like: https://chat.whatsapp.com/XXXXXXXXXX

Extract ALL invite codes (the part after chat.whatsapp.com/) from the text.
Return ONLY a JSON array of invite codes (strings), nothing else.
If no links found, return: []

Text:
${text.slice(0, 2000)}`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://clawdagent.app',
          'X-Title': 'ClawdAgent WhatsApp Watcher',
        },
        body: JSON.stringify({
          model: FREE_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0,
        }),
      });

      if (!res.ok) return [];

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content: string = data.choices?.[0]?.message?.content ?? '[]';

      // Parse the JSON array the LLM returns
      const jsonMatch = content.match(/\[.*?\]/s);
      if (!jsonMatch) return [];

      const codes = JSON.parse(jsonMatch[0]) as unknown;
      if (!Array.isArray(codes)) return [];

      return codes.filter((c): c is string =>
        typeof c === 'string' && /^[A-Za-z0-9]{20,}$/.test(c),
      );
    } catch (err: any) {
      logger.warn('GroupLinkWatcher LLM extraction failed', { error: err.message, chat: chatName });
      return [];
    }
  }

  private async joinGroup(client: WAClientHandle, code: string, sourceChatName: string) {
    if (this.joinedCodes.has(code)) {
      const prevResult = this.successfulCodes.has(code) ? 'already joined' : 'previously failed';
      this.addLog('already_joined', `Code ${code} ${prevResult} — skipping`, sourceChatName, code);
      return;
    }

    this.joinedCodes.add(code);

    try {
      const chatId = await client.acceptInvite(code);
      this.groupsJoined++;
      this.successfulCodes.add(code);
      this.addLog('joined', `Joined group via code ${code} (chatId: ${chatId})`, sourceChatName, code);
      logger.info('GroupLinkWatcher: auto-joined group', { code, chatId, sourceChatName });
    } catch (err: any) {
      this.addLog('error', `Failed to join code ${code}: ${err.message}`, sourceChatName, code);
      logger.warn('GroupLinkWatcher: join failed', { code, error: err.message });
    }
  }

  private addLog(type: WatcherLogEntry['type'], message: string, chatName?: string, inviteCode?: string) {
    this.log.push({ ts: Date.now(), type, message, chatName, inviteCode });
    if (this.log.length > MAX_LOG_ENTRIES) {
      this.log.splice(0, this.log.length - MAX_LOG_ENTRIES);
    }
  }
}

// Singleton
export const groupLinkWatcher = new GroupLinkWatcher();
