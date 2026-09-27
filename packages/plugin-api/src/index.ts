export interface ExtensionContext {
  subscriptions: { dispose(): any }[];
  extensionPath: string;
}

export interface CavalloBoardDefinition {
  id: string;
  name: string;
  vendor: string;
  architecture: 'esp32' | 'avr' | 'rp2040' | 'arm' | 'riscv';
  defaultBaudRate: number;
}

export interface CavalloPlugin {
  activate(context: ExtensionContext): void;
  deactivate(): void;
  registerBoard?(): CavalloBoardDefinition[];
  registerThemes?(): CavalloThemeDefinition[];
  registerCommands?(): CavalloCommandDefinition[];
  uploadHandler?(port: string, file: string): Promise<boolean>;
}

export interface CavalloThemeDefinition { id: string; name: string }
export interface CavalloCommandDefinition { id: string; title: string; description: string; execute(): string | Promise<string> }

export type CavalloAIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export interface CavalloAIContext {
  code: string;
  fileName: string;
  board: string;
  logs: string;
}

export interface CavalloAIConfiguration {
  provider: CavalloAIProvider;
  apiKey: string;
  model: string;
  endpoint: string;
}
