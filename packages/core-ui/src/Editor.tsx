import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import * as monaco from 'monaco-editor';
import MonacoEditor, { loader } from '@monaco-editor/react';

// Configure loader to use locally bundled Monaco instead of CDN (prevents 15-second timeout and offline blank screen)
loader.config({ monaco });

type Theme = 'vs-dark' | 'vs' | 'hc-black';
type Language = 'cpp' | 'python' | 'c' | 'plaintext';

const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'C++', value: 'cpp' },
  { label: 'Python', value: 'python' },
  { label: 'C', value: 'c' },
  { label: 'Plain Text', value: 'plaintext' },
];

const DEFAULT_CODE: Record<Language, string> = {
  cpp: `// CavalloCode - Arduino / ESP32 Starter
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
  python: `# CavalloCode - MicroPython / Raspberry Pi Starter
import machine
import time

led = machine.Pin(25, machine.Pin.OUT)

while True:
    led.toggle()
    time.sleep(1)`,
  c: `// CavalloCode - C Starter
#include <stdio.h>

int main() {
    printf("Hello from CavalloCode!\\n");
    return 0;
}`,
  plaintext: '',
};

interface MonacoEditorProps {
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

class EditorErrorBoundary extends Component<{ children: ReactNode; fallbackValue: string; onChange: (v: string) => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Monaco Editor encountered an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', color: '#ccc', padding: 8 }}>
          <div style={{ color: '#e74c3c', marginBottom: 4, fontSize: 12 }}>Editor fallback mode (Monaco runtime recovering)</div>
          <textarea
            value={this.props.fallbackValue}
            onChange={(e) => this.props.onChange(e.target.value)}
            style={{ flex: 1, backgroundColor: '#252526', color: '#d4d4d4', border: '1px solid #3c3c3c', fontFamily: 'monospace', fontSize: 13, resize: 'none', padding: 8 }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export const CavalloMonacoEditor: React.FC<MonacoEditorProps> = ({

  theme = 'vs-dark',
  onThemeChange,
}) => {
  const [language, setLanguage] = useState<Language>('cpp');
  const [code, setCode] = useState<string>(DEFAULT_CODE['cpp']);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          backgroundColor: theme === 'vs' ? '#f3f3f3' : '#2d2d2d',
          borderBottom: '1px solid #3c3c3c',
          fontSize: '12px',
          color: theme === 'vs' ? '#333' : '#ccc',
        }}
      >
        <span style={{ marginRight: 4 }}>Language:</span>
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            onClick={() => handleLanguageChange(l.value)}
            style={{
              background: language === l.value ? '#007acc' : 'transparent',
              color: language === l.value ? 'white' : theme === 'vs' ? '#333' : '#ccc',
              border: '1px solid #555',
              borderRadius: '3px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {l.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ marginRight: 4 }}>Theme:</span>
        {(['vs-dark', 'vs', 'hc-black'] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => onThemeChange?.(t)}
            style={{
              background: theme === t ? '#007acc' : 'transparent',
              color: theme === t ? 'white' : theme === 'vs' ? '#333' : '#ccc',
              border: '1px solid #555',
              borderRadius: '3px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <EditorErrorBoundary fallbackValue={code} onChange={setCode}>
          <MonacoEditor
            height="100%"
            language={language}
            value={code}
            theme={theme}
            onChange={(val) => setCode(val ?? '')}
            options={{
              fontSize: 14,
              fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              minimap: { enabled: true },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              lineNumbers: 'on',
              folding: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        </EditorErrorBoundary>
      </div>
    </div>
  );
};


export default CavalloMonacoEditor;

