import React, { useState } from 'react';
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
  value?: string;
  onChange?: (val: string) => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onCursorChange?: (line: number, col: number) => void;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  showToolbar?: boolean;
  breakpointFile?: string;
  breakpoints?: Array<{ file: string; line: number }>;
  onBreakpointsChange?: (breakpoints: Array<{ file: string; line: number }>) => void;
}

type EditorErrorBoundaryProps = { children: React.ReactNode; fallbackValue: string; onChange: (v: string) => void };

class EditorErrorBoundary extends React.Component<EditorErrorBoundaryProps, { hasError: boolean }> {
  declare props: Readonly<EditorErrorBoundaryProps>;
  declare state: { hasError: boolean };
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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

export const CavalloMonacoEditor = ({
  value,
  onChange,
  language: propLanguage,
  onLanguageChange,
  onCursorChange,
  theme = 'vs-dark',
  onThemeChange,
  showToolbar = false,
  breakpointFile = 'active-file',
  breakpoints: breakpointList,
  onBreakpointsChange,
}: MonacoEditorProps) => {
  const breakpoints: Array<{ file: string; line: number }> = breakpointList || [];
  const [internalLanguage, setInternalLanguage] = useState<Language>('cpp');
  const [internalCode, setInternalCode] = useState<string>(DEFAULT_CODE['cpp']);
  const editorRef = React.useRef<any>(null);
  const breakpointDecorations = React.useRef<string[]>([]);
  const breakpointsRef = React.useRef(breakpoints);
  breakpointsRef.current = breakpoints;

  const activeLanguage = propLanguage || internalLanguage;
  const activeCode = value !== undefined ? value : internalCode;

  const handleLanguageChange = (lang: Language) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      setInternalLanguage(lang);
      setInternalCode(DEFAULT_CODE[lang]);
    }
  };

  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal ?? '';
    if (onChange) {
      onChange(val);
    } else {
      setInternalCode(val);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
    editor.onMouseDown((event: any) => {
      const gutterTypes = [monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN, monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS];
      const line = event.target.position?.lineNumber;
      if (!line || !gutterTypes.includes(event.target.type)) return;
      const current = breakpointsRef.current;
      const next = current.some((point) => point.file === breakpointFile && point.line === line)
        ? current.filter((point) => point.file !== breakpointFile || point.line !== line)
        : [...current, { file: breakpointFile, line }];
      onBreakpointsChange?.(next);
    });
  };

  React.useEffect(() => {
    if (!editorRef.current) return;
    breakpointDecorations.current = editorRef.current.deltaDecorations(breakpointDecorations.current, breakpoints
      .filter((point) => point.file === breakpointFile)
      .map((point) => ({
        range: new monaco.Range(point.line, 1, point.line, 1),
        options: { isWholeLine: true, glyphMarginClassName: 'cavallo-breakpoint-glyph' }
      })));
  }, [breakpoints, breakpointFile]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <style>{`.monaco-editor .cavallo-breakpoint-glyph { background: #e51400; border-radius: 50%; width: 10px !important; height: 10px !important; margin-left: 5px; margin-top: 4px; }`}</style>
      {/* Optional Editor Toolbar */}
      {showToolbar && (
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
                background: activeLanguage === l.value ? '#007acc' : 'transparent',
                color: activeLanguage === l.value ? 'white' : theme === 'vs' ? '#333' : '#ccc',
                border: '1px solid #555',
                borderRadius: '0px',
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
                borderRadius: '0px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, height: '100%', width: '100%', overflow: 'hidden' }}>
        <EditorErrorBoundary fallbackValue={activeCode} onChange={handleCodeChange}>
          <MonacoEditor
            height="100%"
            language={activeLanguage}
            value={activeCode}
            theme={theme}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              minimap: { enabled: true },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              lineNumbers: 'on',
              glyphMargin: true,
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

