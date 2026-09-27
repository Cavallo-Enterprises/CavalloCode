import React, { useCallback, useState } from 'react';
import { Layout, CavalloMonacoEditor, DEFAULT_PROJECT_FILES, FileItem, Theme } from 'core-ui/src/index';
import { SerialMonitor, SerialPlotter } from 'terminal/src/index';

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
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>(DEFAULT_PROJECT_FILES);
  const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);

  const loadWorkspace = useCallback(async (root: string) => {
    const files: FileItem[] = [];
    const walk = async (directory: string) => {
      const entries = await window.api.readDirectory(directory);
      for (const entry of entries) {
        if (entry.isDirectory && ['node_modules', '.git', '.pio', 'dist', 'out'].includes(entry.name)) continue;
        const id = entry.path;
        if (entry.isDirectory) {
          files.push({ id, name: entry.name, path: entry.path, language: 'plaintext', content: '', isDirectory: true });
          await walk(entry.path);
        } else {
          const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()!.toLowerCase()}` : '';
          const language: FileItem['language'] = ['.cpp', '.cc', '.cxx', '.h', '.hpp'].includes(extension) ? 'cpp'
            : extension === '.c' ? 'c' : ['.py'].includes(extension) ? 'python' : 'plaintext';
          files.push({ id, name: entry.name, path: entry.path, language, content: '' });
        }
      }
    };
    await walk(root);
    setWorkspaceRoot(root);
    setWorkspaceFiles(files);
  }, []);

  const handleCodeChange = (newVal: string) => {
    setFileContents((prev) => ({
      ...prev,
      [activeFile.id]: newVal
    }));
    setDirtyFileIds((prev) => prev.includes(activeFile.id) ? prev : [...prev, activeFile.id]);
  };

  const saveActiveFile = useCallback(async () => {
    if (!activeFile.path || !workspaceRoot) return;
    await window.api.writeFile(activeFile.path, fileContents[activeFile.id] ?? activeFile.content);
    setDirtyFileIds((prev) => prev.filter((id) => id !== activeFile.id));
  }, [activeFile, fileContents, workspaceRoot]);

  const handleFileSelect = (file: FileItem) => {
    setActiveFile(file);
    setCursorPos({ line: 1, col: 1 });
  };

  const openWorkspaceFile = async (file: FileItem) => {
    const content = await window.api.readFile(file.path);
    setFileContents((prev) => ({ ...prev, [file.id]: content }));
    setActiveFile({ ...file, content });
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
      workspaceRoot={workspaceRoot}
      workspaceFiles={workspaceFiles}
      dirtyFileIds={dirtyFileIds}
      onOpenFolder={async () => {
        const directory = await window.api.openDirectory();
        if (directory) await loadWorkspace(directory);
      }}
      onSaveFile={saveActiveFile}
      onOpenFile={openWorkspaceFile}
      onHardwareLog={window.api.onHardwareBuildLog}
      onCompile={async () => {
        const result = await window.api.compileProject(workspaceRoot || '.');
        if (!result.success) throw new Error('PlatformIO compilation failed.');
        return result.output;
      }}
      onFlash={async () => {
        const root = workspaceRoot || '.';
        const build = await window.api.compileProject(root);
        if (!build.success) throw new Error('Compilation failed; upload canceled.');
        const isArduino = /arduino|uno|nano/i.test(activeBoard);
        const board = /nano/i.test(activeBoard) ? 'nano' : 'uno';
        const artifact = isArduino
          ? `${root}/.pio/build/${board === 'nano' ? 'nanoatmega328' : 'uno'}/firmware.hex`
          : `${root}/.pio/build/esp32dev/firmware.bin`;
        const result = isArduino
          ? await window.api.flashArduino(board, activePort, artifact)
          : await window.api.flashESP32(activePort, artifact);
        if (!result.success) throw new Error('Hardware flashing failed.');
        return result.output;
      }}
      terminalComponent={
        <SerialMonitor
          onPortSelect={(p) => setActivePort(p)}
          onBaudSelect={(b) => setActiveBaud(b)}
        />
      }
      plotterComponent={<SerialPlotter />}
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
