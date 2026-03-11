export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: 'opus' | 'sonnet' | 'haiku' | 'dynamic' | 'ollama';
  preferredOllamaModel?: string;  // e.g. 'glm5', 'qwen3-next', 'deepseek-v3.1'
  tools: string[];
  maxTokens: number;
  temperature: number;
  maxToolIterations?: number;
  /** When true, agent history is isolated from the main chat session.
   *  History is keyed as `agent-<id>-<userId>` instead of the main conversationId. */
  isolatedSession?: boolean;
}
