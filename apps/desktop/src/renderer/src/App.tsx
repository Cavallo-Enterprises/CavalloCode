import React, { useState } from 'react';
import { Layout, CavalloMonacoEditor, DEFAULT_PROJECT_FILES, FileItem, Theme } from 'core-ui/src/index';
import { WebGLTerminal } from 'terminal/src/index';

function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>('vs-dark');
  const [activeFile, setActiveFile] = useState<FileItem>(DEFAULT_PROJECT_FILES[0]);
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DEFAULT_PROJECT_FILES.forEach((f) => {
      initial[f.id] = f.content;
    });
    return initial;
  });
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [activeBoard, setActiveBoard] = useState('ESP32 Dev Module');
  const [activePort, setActivePort] = useState('COM3');
  const [activeBaud, setActiveBaud] = useState(115200);

  const handleCodeChange = (newVal: string) => {
    setFileContents((prev) => ({
      ...prev,
      [activeFile.id]: newVal
    }));
  };

  const handleFileSelect = (file: FileItem) => {
    setActiveFile(file);
    setCursorPos({ line: 1, col: 1 });
  };

  return (
    <Layout
      theme={theme}
      onThemeChange={setTheme}
      activeFile={activeFile}
      onFileSelect={handleFileSelect}
      cursorPos={cursorPos}
      activeBoard={activeBoard}
      activePort={activePort}
      activeBaud={activeBaud}
      terminalComponent={
        <WebGLTerminal
          onPortSelect={(p) => setActivePort(p)}
          onBaudSelect={(b) => setActiveBaud(b)}
        />
      }
    >
      <CavalloMonacoEditor
        value={fileContents[activeFile.id] !== undefined ? fileContents[activeFile.id] : activeFile.content}
        onChange={handleCodeChange}
        language={activeFile.language}
        onCursorChange={(line, col) => setCursorPos({ line, col })}
        theme={theme}
        onThemeChange={setTheme}
      />
    </Layout>
  );
}

export default App;
