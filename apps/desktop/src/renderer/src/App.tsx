import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Layout, CavalloMonacoEditor, DEFAULT_PROJECT_FILES, FileItem, Theme, UpdateNotifier } from 'core-ui/src/index';
import { SerialMonitor, SerialPlotter } from 'terminal/src/index';

function App(): ReactElement {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('cavallo.theme') as Theme) || 'vs-dark');
  const [activeFile, setActiveFile] = useState<FileItem>(DEFAULT_PROJECT_FILES[0]);
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DEFAULT_PROJECT_FILES.forEach((f) => {
      initial[f.id] = f.content;
    });
    return initial;
  });
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [activeBoard, setActiveBoard] = useState(() => localStorage.getItem('cavallo.board') || 'ESP32 Dev Module');
  const [activePort, setActivePort] = useState('');
  const [activeBaud, setActiveBaud] = useState(() => Number(localStorage.getItem('cavallo.baud')) || 115200);
  const [platformioPath, setPlatformioPath] = useState(() => localStorage.getItem('cavallo.platformioPath') || '');
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>(DEFAULT_PROJECT_FILES);
  const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);
  const [breakpoints, setBreakpoints] = useState<Array<{ file: string; line: number }>>([]);
  const [debugOutput, setDebugOutput] = useState('');
  const [debuggerRunning, setDebuggerRunning] = useState(false);
  const [recentLogs, setRecentLogs] = useState('');
  const [serialConnected, setSerialConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem('cavallo.theme', theme);
    localStorage.setItem('cavallo.board', activeBoard);
    localStorage.setItem('cavallo.baud', String(activeBaud));
    localStorage.setItem('cavallo.platformioPath', platformioPath);
  }, [theme, activeBoard, activeBaud, platformioPath]);

  useEffect(() => window.api?.onDebugOutput?.((event) => {
    setDebugOutput((current) => (current + event.text).slice(-20000));
    if (/GDB exited/i.test(event.text)) setDebuggerRunning(false);
  }) || undefined, []);
  useEffect(() => {
    if (debuggerRunning) void window.api?.debugSetBreakpoints?.(breakpoints);
  }, [breakpoints, debuggerRunning]);

  const appendRecentLog = useCallback((line: string) => setRecentLogs((current) => `${current}${line}\n`.split(/\r?\n/).slice(-50).join('\n')), []);
  useEffect(() => window.cavallo?.onSerialData?.(appendRecentLog) || undefined, [appendRecentLog]);
  const subscribeHardwareLogs = useCallback((callback: (line: string) => void) => window.api?.onHardwareBuildLog?.((line) => { appendRecentLog(line); callback(line); }) || (() => {}), [appendRecentLog]);
  const handleAskAI = useCallback((prompt: string) => window.api.askAI(prompt, {
    code: fileContents[activeFile.id] ?? activeFile.content,
    fileName: activeFile.name,
    board: activeBoard,
    logs: recentLogs,
  }), [activeFile, activeBoard, fileContents, recentLogs]);
  const handleInsertAI = (answer: string, mode: 'insert' | 'apply') => {
    const code = answer.match(/```(?:[\w+-]+)?\s*([\s\S]*?)```/)?.[1]?.trim() || answer;
    setFileContents((current) => ({ ...current, [activeFile.id]: mode === 'insert' ? `${current[activeFile.id] ?? activeFile.content}\n${code}` : code }));
    setDirtyFileIds((current) => current.includes(activeFile.id) ? current : [...current, activeFile.id]);
  };

  const handleDebugAction = (action: string) => {
    const actions: Record<string, () => Promise<unknown>> = {
      continue: window.api.debugContinue,
      pause: window.api.debugPause,
      'step-over': window.api.debugStepOver,
      'step-into': window.api.debugStepInto,
      'step-out': window.api.debugStepOut,
      restart: window.api.debugRestart,
      stop: window.api.debugStop,
    };
    if (action === 'stop') setDebuggerRunning(false);
    void actions[action]?.();
  };

  const loadWorkspace = useCallback(async (root: string) => {
    const files: FileItem[] = [];
    const walk = async (directory: string, depth = 0) => {
      const entries = await window.api.readDirectory(directory);
      for (const entry of entries) {
        if (entry.isDirectory && ['node_modules', '.git', '.pio', 'dist', 'out'].includes(entry.name)) continue;
        const id = entry.path;
        if (entry.isDirectory) {
          files.push({ id, name: entry.name, path: entry.path, language: 'plaintext', content: '', isDirectory: true, depth });
          await walk(entry.path, depth + 1);
        } else {
          const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()!.toLowerCase()}` : '';
          const language: FileItem['language'] = ['.cpp', '.cc', '.cxx', '.h', '.hpp'].includes(extension) ? 'cpp'
            : extension === '.c' ? 'c' : ['.py'].includes(extension) ? 'python' : 'plaintext';
          files.push({ id, name: entry.name, path: entry.path, language, content: '', depth });
        }
      }
    };
    await walk(root);
    setWorkspaceRoot(root);
    setWorkspaceFiles(files);
    return files;
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
    if (Object.prototype.hasOwnProperty.call(fileContents, file.id)) {
      setActiveFile({ ...file, content: fileContents[file.id] });
      setCursorPos({ line: 1, col: 1 });
      return;
    }
    const content = await window.api.readFile(file.path);
    setFileContents((prev) => ({ ...prev, [file.id]: content }));
    setActiveFile({ ...file, content });
    setCursorPos({ line: 1, col: 1 });
  };

  return (
    <>
    <Layout
      theme={theme}
      onThemeChange={setTheme}
      activeFile={activeFile}
      onFileSelect={handleFileSelect}
      cursorPos={cursorPos}
      activeBoard={activeBoard}
      activePort={activePort}
      activeBaud={activeBaud}
      platformioPath={platformioPath}
      onPlatformioPathChange={setPlatformioPath}
      workspaceRoot={workspaceRoot}
      workspaceFiles={workspaceFiles}
      dirtyFileIds={dirtyFileIds}
      onOpenFolder={async () => {
        const directory = await window.api.openDirectory();
        if (directory) await loadWorkspace(directory);
      }}
      onCreateProject={async (name, template) => {
        const projectPath = await window.api.createProjectTemplate(name, template);
        if (!projectPath) return null;
        const files = await loadWorkspace(projectPath);
        const mainFile = files?.find((file) => !file.isDirectory && /(^|[\\/])main\.cpp$/.test(file.path));
        if (mainFile) await openWorkspaceFile(mainFile);
        return projectPath;
      }}
      onBoardChange={setActiveBoard}
      onPortChange={setActivePort}
      onBaudChange={setActiveBaud}
      serialConnected={serialConnected}
      onToggleSerial={() => window.dispatchEvent(new Event('cavallo:toggle-serial'))}
      onOpenSerial={() => window.dispatchEvent(new Event('cavallo:open-serial'))}
      onOpenDebug={() => window.dispatchEvent(new Event('cavallo:open-debug'))}
      onSaveFile={saveActiveFile}
      onOpenFile={openWorkspaceFile}
      onHardwareLog={subscribeHardwareLogs}
      debugOutput={debugOutput}
      onDebugAction={handleDebugAction}
      onStartDebug={(gdbPath) => {
        const root = workspaceRoot || '.';
        const elf = `${root}/.pio/build/${/pico|rp2040/i.test(activeBoard) ? 'pico' : /arduino\s+nano/i.test(activeBoard) ? 'nanoatmega328' : /arduino\s+uno/i.test(activeBoard) ? 'uno' : 'esp32dev'}/firmware.elf`;
        const executable = gdbPath || (/esp32/i.test(activeBoard) ? 'xtensa-esp32-elf-gdb' : 'arm-none-eabi-gdb');
        void window.api.startDebug(elf, executable, breakpoints).then((result) => {
          setDebuggerRunning(result.success);
          if (!result.success) setDebugOutput((current) => `${current}\nUnable to start debugger.\n`);
        }).catch((error) => setDebugOutput((current) => `${current}\n${error?.message || error}\n`));
        setDebugOutput((current) => `${current}\nStarting ${executable} for ${elf}…\n`);
      }}
      onAskAI={handleAskAI}
      onInsertAI={handleInsertAI}
      onCompile={async () => {
        if (!workspaceRoot) throw new Error('Open a project folder before compiling.');
        const result = await window.api.compileProject(workspaceRoot, activeBoard, platformioPath);
        if (!result.success) throw new Error('PlatformIO compilation failed.');
        return result.output;
      }}
      onFlash={async () => {
        if (!workspaceRoot) throw new Error('Open a project folder before uploading.');
        if (!activePort) throw new Error('Select a serial port before uploading.');
        const root = workspaceRoot;
        const build = await window.api.compileProject(root, activeBoard, platformioPath);
        if (!build.success) throw new Error('Compilation failed; upload canceled.');
        const environment = /pico|rp2040/i.test(activeBoard) ? 'pico' : /arduino\s+nano/i.test(activeBoard) ? 'nanoatmega328' : /arduino\s+uno/i.test(activeBoard) ? 'uno' : 'esp32dev';
        const extension = /pico|rp2040/i.test(activeBoard) ? 'uf2' : /arduino|uno|nano/i.test(activeBoard) ? 'hex' : 'bin';
        const picoName = root.split(/[\\/]/).pop();
        const artifact = `${root}/${/pico|rp2040/i.test(activeBoard) ? `build/${picoName}.${extension}` : `.pio/build/${environment}/firmware.${extension}`}`;
        const result = await window.api.flashHardware(activeBoard, activePort, artifact);
        if (!result.success) throw new Error('Hardware flashing failed.');
        return result.output;
      }}
      terminalComponent={
        <SerialMonitor
          onPortSelect={(p) => setActivePort(p)}
          onBaudSelect={(b) => setActiveBaud(b)}
          onConnectionChange={setSerialConnected}
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
        breakpointFile={activeFile.path}
        breakpoints={breakpoints}
        onBreakpointsChange={setBreakpoints}
      />
    </Layout>
    <UpdateNotifier />
    </>
  );
}

export default App;
