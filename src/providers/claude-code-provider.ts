import { spawn } from 'child_process';
import { join } from 'path';
import logger from '../utils/logger.js';

export interface ClaudeCodeResponse {
  text: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  cost: number; // always 0 — uses Max subscription
}

/**
 * Resolve the Claude Code CLI's actual JS entry point.
 * On Windows, `claude` is a .cmd batch wrapper around `node cli.js`.
 * We call `node.exe cli.js` directly to avoid cmd.exe mangling special characters
 * (Hebrew, parentheses, pipes, etc.) in prompts.
 */
function resolveCliEntryPoint(): string | null {
  try {
    const appData = process.env.APPDATA;
    if (appData) {
      const cliJs = join(appData, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      return cliJs;
    }
  } catch {}
  return null;
}

/**
 * Run the Claude CLI via spawn — calls node.exe directly (no cmd.exe shell)
 * to avoid Windows cmd.exe breaking on Hebrew/special characters in prompts.
 */
function spawnClaude(
  cliPath: string,
  args: string[],
  options: { timeout?: number; cwd?: string; maxBuffer?: number; cliEntryPoint?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 120000;
    const maxBuffer = options.maxBuffer || 1024 * 1024 * 10;

    let proc;
    if (options.cliEntryPoint) {
      // Direct node.exe invocation — bypasses cmd.exe entirely
      // Arguments pass through cleanly: Hebrew, (), |, &, etc. all work
      proc = spawn(process.execPath, [options.cliEntryPoint, ...args], {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        cwd: options.cwd,
        env: process.env,
      });
    } else {
      // Fallback: shell-based (only for simple commands like --version)
      proc = spawn(cliPath, args, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        cwd: options.cwd,
        env: process.env,
      });
    }

    // Close stdin immediately — prevents CLI from waiting for input
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    let killed = false;

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (stdout.length > maxBuffer) {
        killed = true;
        proc.kill();
        reject(new Error('maxBuffer exceeded'));
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
      reject(new Error(`TIMEOUT: Claude CLI did not respond within ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return; // already rejected
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export class ClaudeCodeProvider {
  private available: boolean = false;
  private authenticated: boolean = false;
  private cliPath: string;
  private cliEntryPoint: string | null = null;
  private lastCheckAt: number = 0;

  constructor(cliPath: string = 'claude') {
    this.cliPath = cliPath;
    // Resolve the actual JS entry point to bypass cmd.exe on Windows
    this.cliEntryPoint = resolveCliEntryPoint();
    if (this.cliEntryPoint) {
      logger.info('Claude Code CLI entry point resolved', { path: this.cliEntryPoint });
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      // Version check can use shell (simple command, no special chars)
      const { stdout: version } = await spawnClaude(this.cliPath, ['--version'], { timeout: 10000 });
      logger.info('Claude Code CLI found', { version: version.trim() });
      this.available = true;

      // Auth check — use direct node.exe path to avoid cmd.exe issues
      const { stdout: authCheck } = await spawnClaude(
        this.cliPath,
        ['-p', 'respond with just OK', '--output-format', 'json'],
        { timeout: 90000, cliEntryPoint: this.cliEntryPoint ?? undefined },
      );

      const parsed = JSON.parse(authCheck);
      if (parsed.result || parsed.content || parsed.type === 'result') {
        this.authenticated = true;
        this.lastCheckAt = Date.now();
        logger.info('Claude Code CLI authenticated');
        return true;
      }

      return false;
    } catch (err: any) {
      logger.warn('Claude Code CLI not available', { error: err.message });
      this.available = false;
      this.authenticated = false;
      return false;
    }
  }

  async chat(params: {
    system?: string;
    message: string;
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<ClaudeCodeResponse> {
    if (!this.available || !this.authenticated) {
      throw new Error('Claude Code CLI not available or not authenticated');
    }

    const { system, message, model } = params;

    // Build the full prompt with system context
    let fullPrompt = '';
    if (system) {
      fullPrompt += `<system>\n${system}\n</system>\n\n`;
    }
    fullPrompt += message;

    // Direct node.exe invocation passes args without shell interpretation
    const args: string[] = ['-p', fullPrompt, '--output-format', 'json'];
    if (model) args.push('--model', model);

    try {
      const { stdout } = await spawnClaude(this.cliPath, args, {
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 10,
        cliEntryPoint: this.cliEntryPoint ?? undefined,
      });

      return this.parseResponse(stdout, model);
    } catch (err: any) {
      if (err.message.includes('not authenticated') || err.message.includes('login')) {
        this.authenticated = false;
        throw new Error('Claude Code CLI: authentication expired. Run "claude login" to re-authenticate.');
      }
      if (err.message.includes('TIMEOUT') || err.message.includes('killed')) {
        throw new Error('Claude Code CLI: request timed out (120s)');
      }
      throw new Error(`Claude Code CLI error: ${err.message}`);
    }
  }

  async chatWithHistory(params: {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
  }): Promise<ClaudeCodeResponse> {
    // Pack conversation into a single prompt (CLI doesn't support multi-turn in -p mode)
    let packed = '';
    if (params.system) {
      packed += `<system>\n${params.system}\n</system>\n\n`;
    }
    for (const msg of params.messages) {
      if (msg.role === 'user') {
        packed += `Human: ${msg.content}\n\n`;
      } else {
        packed += `Assistant: ${msg.content}\n\n`;
      }
    }

    return this.chat({ message: packed, maxTokens: params.maxTokens });
  }

  async agenticTask(params: {
    task: string;
    workingDir?: string;
    allowedTools?: string[];
    timeout?: number;
  }): Promise<ClaudeCodeResponse> {
    if (!this.available || !this.authenticated) {
      throw new Error('Claude Code CLI not available');
    }

    const { task, workingDir, allowedTools, timeout } = params;

    const args: string[] = ['-p', task, '--output-format', 'json'];
    if (allowedTools && allowedTools.length > 0) {
      args.push('--allowedTools', allowedTools.join(','));
    }

    const { stdout } = await spawnClaude(this.cliPath, args, {
      timeout: timeout || 300000,
      maxBuffer: 1024 * 1024 * 50,
      cwd: workingDir,
      cliEntryPoint: this.cliEntryPoint ?? undefined,
    });

    let result: any;
    try {
      result = JSON.parse(stdout);
    } catch {
      return { text: stdout.trim(), model: 'claude-code-agent', cost: 0 };
    }

    const text = result.result || (typeof result.content === 'string' ? result.content : '') || stdout.trim();

    return {
      text,
      model: 'claude-code-agent',
      usage: result.usage,
      cost: 0,
    };
  }

  getStatus(): { available: boolean; authenticated: boolean; cliPath: string; lastCheckAt: number } {
    return {
      available: this.available,
      authenticated: this.authenticated,
      cliPath: this.cliPath,
      lastCheckAt: this.lastCheckAt,
    };
  }

  isReady(): boolean {
    return this.available && this.authenticated;
  }

  markUnauthenticated(): void {
    this.authenticated = false;
  }

  private parseResponse(stdout: string, model?: string): ClaudeCodeResponse {
    let result: any;
    try {
      result = JSON.parse(stdout);
    } catch {
      return { text: stdout.trim(), model: model || 'claude-code-cli', cost: 0 };
    }

    let text = '';
    if (result.result) {
      text = result.result;
    } else if (result.content) {
      if (Array.isArray(result.content)) {
        text = result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
      } else {
        text = String(result.content);
      }
    } else if (typeof result === 'string') {
      text = result;
    } else {
      text = stdout.trim();
    }

    return {
      text,
      model: result.model || model || 'claude-code-cli',
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0,
      },
      cost: result.total_cost_usd || 0,
    };
  }
}
