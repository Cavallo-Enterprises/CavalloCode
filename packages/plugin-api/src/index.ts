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
  uploadHandler?(port: string, file: string): Promise<boolean>;
}
