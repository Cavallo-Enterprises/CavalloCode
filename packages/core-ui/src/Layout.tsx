import React, { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import {
  Files,
  Cpu,
  Terminal as TerminalIcon,
  Boxes,
  Settings as SettingsIcon,
  Minus,
  Square,
  X,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Check,
  Upload,
  Search,
  CheckCircle,
  Bug,
  Bot,
  Play,
  Pause,
  StepForward,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Send,
  Code2,
} from 'lucide-react';
import { CommandPalette } from './CommandPalette';

export type Theme = 'vs-dark' | 'vs' | 'hc-black';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  language: 'cpp' | 'python' | 'c' | 'plaintext';
  content: string;
  isDirectory?: boolean;
  depth?: number;
}

export const DEFAULT_PROJECT_FILES: FileItem[] = [
  {
    id: 'main-cpp',
    name: 'main.cpp',
    path: 'src/main.cpp',
    language: 'cpp',
    content: `// CavalloCode - ESP32 / Arduino Starter
#include <Arduino.h>

#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[CavalloCode] Hardware Initialized successfully.");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
  Serial.println("Heartbeat pulse OK");
}`
  },
  {
    id: 'config-h',
    name: 'config.h',
    path: 'src/config.h',
    language: 'cpp',
    content: `// CavalloCode - Hardware Configuration
#pragma once

#define BOARD_NAME "ESP32 Dev Module"
#define DEFAULT_BAUD 115200
#define WIFI_SSID "Cavallo-IoT-Lab"
#define WIFI_PASS "secure-robotics-2026"
`
  },
  {
    id: 'platformio-ini',
    name: 'platformio.ini',
    path: 'platformio.ini',
    language: 'plaintext',
    content: `; CavalloCode Project Configuration File
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
upload_speed = 921600
`
  },
  {
    id: 'readme-md',
    name: 'README.md',
    path: 'README.md',
    language: 'plaintext',
    content: `# Cavallo-Project

Firmware project developed with **CavalloCode Hardware IDE**.
Supports ESP32, Arduino Uno, and Raspberry Pi Pico (RP2040).
`
  }
];

interface LayoutProps {
  children: React.ReactNode;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  activeFile: FileItem;
  onFileSelect: (file: FileItem) => void;
  terminalComponent?: React.ReactNode;
  plotterComponent?: React.ReactNode;
  cursorPos?: { line: number; col: number };
  onCompile?: () => Promise<string>;
  onFlash?: () => Promise<string>;
  activeBoard?: string;
  activePort?: string;
  activeBaud?: number;
  workspaceRoot?: string | null;
  workspaceFiles?: FileItem[];
  dirtyFileIds?: string[];
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onHardwareLog?: (callback: (line: string) => void) => () => void;
  onOpenFile?: (file: FileItem) => void;
  debugOutput?: string;
  onStartDebug?: (gdbPath: string) => void;
  onDebugAction?: (action: 'continue' | 'pause' | 'step-over' | 'step-into' | 'step-out' | 'restart' | 'stop') => void;
  onAskAI?: (prompt: string) => Promise<string>;
  onInsertAI?: (text: string, mode: 'insert' | 'apply') => void;
  onCreateProject?: (name: string, template: 'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico') => Promise<string | null>;
  onBoardChange?: (board: string) => void;
  serialConnected?: boolean;
  onToggleSerial?: () => void;
  onOpenDebug?: () => void;
  onOpenSerial?: () => void;
}

export const Layout = ({
  children,
  theme,
  onThemeChange,
  activeFile,
  onFileSelect,
  terminalComponent,
  plotterComponent,
  cursorPos = { line: 1, col: 1 },
  onCompile,
  onFlash,
  activeBoard = 'ESP32 Dev Module',
  activePort = 'COM3',
  activeBaud = 115200,
  workspaceRoot: workspaceRootProp,
  workspaceFiles: workspaceFilesProp,
  dirtyFileIds: dirtyFileIdsProp,
  onOpenFolder,
  onSaveFile,
  onHardwareLog,
  onOpenFile,
  debugOutput = '',
  onStartDebug,
  onDebugAction,
  onAskAI,
  onInsertAI,
  onCreateProject,
  onBoardChange,
  serialConnected = false,
  onToggleSerial,
  onOpenDebug,
  onOpenSerial
}: LayoutProps) => {
  const workspaceRoot: string | null = workspaceRootProp ?? null;
  const workspaceFiles: FileItem[] = workspaceFilesProp ?? DEFAULT_PROJECT_FILES;
  const dirtyFileIds: string[] = dirtyFileIdsProp ?? [];
  const [activeActivity, setActiveActivity] = useState<'explorer' | 'hardware' | 'serial' | 'debug' | 'ai' | 'extensions' | 'settings'>('explorer');
  const [openFiles, setOpenFiles] = useState<FileItem[]>([DEFAULT_PROJECT_FILES[0], DEFAULT_PROJECT_FILES[1]]);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'plotter' | 'build'>('terminal');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [buildLogs, setBuildLogs] = useState<string>('Ready. Click "Compile" or "Flash" to start build.\n');
  const [isBuilding, setIsBuilding] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [watchExpressions, setWatchExpressions] = useState<string[]>([]);
  const [watchInput, setWatchInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiConfig, setAiConfig] = useState<{ provider: 'openai' | 'gemini' | 'anthropic' | 'ollama'; apiKey: string; hasApiKey: boolean; model: string; endpoint: string }>({ provider: 'openai', apiKey: '', hasApiKey: false, model: 'gpt-4o-mini', endpoint: 'http://localhost:11434' });
  const [debugToolbarVisible, setDebugToolbarVisible] = useState(false);
  const [gdbPath, setGdbPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('my-firmware')
  const [newProjectTemplate, setNewProjectTemplate] = useState<'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico'>('esp32')
  const [projectError, setProjectError] = useState('')

  useEffect(() => { (window as any).api?.getAIConfig?.().then(setAiConfig).catch(console.warn); }, []);
  useEffect(() => { if (debugOutput) setDebugToolbarVisible(true); }, [debugOutput]);

  useEffect(() => {
    const openSerial = () => { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); };
    const openDebug = () => { setActiveActivity('debug'); setDebugToolbarVisible(true); };
    window.addEventListener('cavallo:open-serial', openSerial);
    window.addEventListener('cavallo:open-debug', openDebug);
    return () => {
      window.removeEventListener('cavallo:open-serial', openSerial);
      window.removeEventListener('cavallo:open-debug', openDebug);
    };
  }, []);

  const askAssistant = async (prompt: string) => {
    if (!onAskAI || aiBusy) return;
    setAiMessages((messages) => [...messages, { role: 'user', text: prompt }]);
    setAiBusy(true);
    try {
      const answer = await onAskAI(prompt);
      setAiMessages((messages) => [...messages, { role: 'assistant', text: answer }]);
    } catch (error: any) {
      setAiMessages((messages) => [...messages, { role: 'assistant', text: `Error: ${error?.message || error}` }]);
    } finally { setAiBusy(false); }
  };

  const isDark = theme !== 'vs';

  // Window controls
  const handleMinimize = () => (window as any).api?.minimizeWindow?.();
  const handleMaximize = () => (window as any).api?.maximizeWindow?.();
  const handleClose = () => (window as any).api?.closeWindow?.();

  // File open handler
  const handleOpenFile = async (fileName: string) => {
    let found = workspaceFiles.find((f) => f.name === fileName || f.path === fileName);
    if (found && !found.content && !found.isDirectory && !onOpenFile && (window as any).api?.readFile) {
      found = { ...found, content: await (window as any).api.readFile(found.path) };
    }
    if (found) {
      if (!openFiles.some((f) => f.id === found.id)) {
        setOpenFiles([...openFiles, found]);
      }
      (onOpenFile || onFileSelect)(found);
    }
  };

  useEffect(() => onHardwareLog?.((line) => {
    setBuildLogs((prev) => `${prev}${line}\n`);
    setBottomOpen(true);
    setBottomTab('build');
  }), [onHardwareLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSaveFile?.();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setActiveActivity('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSaveFile]);

  const handleCloseTab = (e: React.MouseEvent, fileToClose: FileItem) => {
    e.stopPropagation();
    const updated = openFiles.filter((f) => f.id !== fileToClose.id);
    setOpenFiles(updated);
    if (activeFile.id === fileToClose.id && updated.length > 0) {
      onFileSelect(updated[updated.length - 1]);
    }
  };

  // Compile hardware
  const handleCompile = async () => {
    setIsBuilding(true);
    setBottomOpen(true);
    setBottomTab('build');
    setBuildLogs((prev) => prev + `\n[${new Date().toLocaleTimeString()}] Starting build for ${activeBoard}...\n`);
    try {
      if (onCompile) {
        const out = await onCompile();
                        if (!onHardwareLog) setBuildLogs((prev) => prev + out);
      } else if ((window as any).api?.compileProject) {
        const res = await (window as any).api.compileProject(workspaceRoot || '.', activeBoard);
        if (!res?.success) throw new Error('Hardware compiler failed.');
        if (!onHardwareLog) setBuildLogs((prev) => prev + (res?.output || 'Compilation finished.\n'));
      } else throw new Error('No hardware compiler is connected to the main process.');
    } catch (err: any) {
      setBuildLogs((prev) => prev + `[Error] ${err?.message || err}\n`);
    } finally {
      setIsBuilding(false);
    }
  };

  // Flash hardware
  const handleFlash = async () => {
    setIsBuilding(true);
    setBottomOpen(true);
    setBottomTab('build');
    setBuildLogs((prev) => prev + `\n[${new Date().toLocaleTimeString()}] Flashing target on ${activePort}...\n`);
    try {
      if (!activePort) throw new Error('Select a serial port before uploading.')
      if (!workspaceRoot) throw new Error('Open a project folder before uploading.')
      if (onFlash) {
        const out = await onFlash();
        if (!onHardwareLog) setBuildLogs((prev) => prev + out);
      } else if ((window as any).api?.compileProject) {
        const build = await (window as any).api.compileProject(workspaceRoot, activeBoard);
        if (!build.success) throw new Error('Compilation failed; upload canceled.');
        const isArduino = /arduino|uno|nano/i.test(activeBoard);
        const board = /nano/i.test(activeBoard) ? 'nano' : 'uno';
        const isPico = /pico|rp2040/i.test(activeBoard);
        const environment = isPico ? 'pico' : board === 'nano' ? 'nanoatmega328' : 'uno';
        const artifact = isPico
          ? `${workspaceRoot}/build/${String(workspaceRoot).split(/[\\/]/).pop()}.uf2`
          : isArduino ? `${workspaceRoot}/.pio/build/${environment}/firmware.hex` : `${workspaceRoot}/.pio/build/esp32dev/firmware.bin`;
        const res = await (window as any).api.flashHardware(activeBoard, activePort, artifact);
        if (!res.success) throw new Error('Upload failed.');
        if (!onHardwareLog) setBuildLogs((prev) => prev + (res?.output || 'Flash finished.\n'));
      } else throw new Error('No hardware flasher is connected to the main process.');
    } catch (err: any) {
      setBuildLogs((prev) => prev + `[Error] ${err?.message || err}\n`);
    } finally {
      setIsBuilding(false);
    }
  };

  const MENUS: Record<string, string[]> = {
    File: ['New File', 'Open File...', 'Save', 'Save All', 'Exit'],
    Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Find', 'Replace'],
    Selection: ['Select All', 'Expand Selection', 'Shrink Selection'],
    View: ['Command Palette...', 'Explorer', 'Hardware Manager', 'Serial Monitor', 'Toggle Panel'],
    Hardware: ['Compile / Verify', 'Upload / Flash', 'Auto-Detect Ports', 'Select Board'],
    Run: ['Start Debugging', 'Run Without Debugging'],
    Terminal: ['New Terminal', 'Clear Terminal', 'Kill Terminal'],
    Help: ['Documentation', 'About CavalloCode']
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#181818',
        color: '#cccccc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* ── 1. FRAMELESS WINDOW TITLEBAR (30px) ── */}
      <div
        style={{
          height: '30px',
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0',
          WebkitAppRegion: 'drag' as any,
          flexShrink: 0,
          zIndex: 1000
        }}
      >
        {/* Left: App Logo + Menus */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', WebkitAppRegion: 'no-drag' as any }}>
          <img
            src="cavallocode.png"
            alt="Logo"
            style={{ height: '16px', width: '16px', margin: '0 8px 0 10px', objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          {Object.keys(MENUS).map((menu) => (
            <div key={menu} style={{ position: 'relative' }}>
              <button
                onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                style={{
                  background: activeMenu === menu ? '#333333' : 'transparent',
                  color: activeMenu === menu ? '#ffffff' : '#cccccc',
                  border: 'none',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '0px',
                  outline: 'none'
                }}
                onMouseEnter={() => {
                  if (activeMenu && activeMenu !== menu) setActiveMenu(menu);
                }}
              >
                {menu}
              </button>
              {activeMenu === menu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '30px',
                    left: 0,
                    backgroundColor: '#252526',
                    border: '1px solid #454545',
                    minWidth: '160px',
                    zIndex: 10000,
                    padding: '4px 0'
                  }}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  {MENUS[menu].map((item) => (
                    <div
                      key={item}
                      onClick={() => {
                        setActiveMenu(null);
                        if (item.includes('Command Palette')) setCommandPaletteOpen(true);
                        if (item === 'Save') onSaveFile?.();
                        if (item.includes('Compile')) handleCompile();
                        if (item.includes('Upload')) handleFlash();
                        if (item.includes('Toggle Panel')) setBottomOpen(!bottomOpen);
                        if (item === 'Select Board') setActiveActivity('hardware');
                        if (item === 'Auto-Detect Ports') { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); window.setTimeout(() => window.dispatchEvent(new Event('cavallo:refresh-ports')), 0); }
                        if (item === 'Serial Monitor') { setActiveActivity('serial'); setBottomOpen(true); setBottomTab('terminal'); }
                        if (item === 'Select Theme' || item === 'Theme') setActiveActivity('settings');
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        color: '#cccccc',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = '#04395e')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent')}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Quick Hardware Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '12px', gap: '4px' }}>
            <button
              onClick={handleCompile}
              disabled={isBuilding}
              title="Compile / Verify Firmware"
              style={iconBtnStyle}
            >
              <Check size={13} color="#4ec9b0" />
            </button>
            <button
              onClick={handleFlash}
              disabled={isBuilding}
              title="Upload / Flash to Target"
              style={iconBtnStyle}
            >
              <Upload size={13} color="#e5c07b" />
            </button>
          </div>
        </div>

        {/* Center: Command Search Bar */}
        <div
          onClick={() => setCommandPaletteOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#252526',
            border: '1px solid #3c3c3c',
            height: '22px',
            width: '380px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#999999',
            WebkitAppRegion: 'no-drag' as any
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#007acc')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#3c3c3c')}
        >
          <Search size={12} color="#888888" />
          <span>CavalloCode — {activeFile.name} (Ctrl+Shift+P)</span>
        </div>

        {/* Right: Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', WebkitAppRegion: 'no-drag' as any }}>
          <button onClick={handleMinimize} style={winControlBtnStyle()}>
            <Minus size={14} />
          </button>
          <button onClick={handleMaximize} style={winControlBtnStyle()}>
            <Square size={12} />
          </button>
          <button onClick={handleClose} style={winControlBtnStyle()}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── 2. WORKBENCH (ACTIVITY BAR + DOCKABLE ALLOTMENT) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 48px Fixed Activity Bar */}
        <div
          style={{
            width: '48px',
            backgroundColor: '#333333',
            borderRight: '1px solid #252526',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            flexShrink: 0
          }}
        >
          {/* Top Activity Icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <ActivityBarButton
              active={activeActivity === 'explorer'}
              icon={<Files size={22} />}
              title="File Explorer (Ctrl+Shift+E)"
              onClick={() => setActiveActivity('explorer')}
            />
            <ActivityBarButton
              active={activeActivity === 'hardware'}
              icon={<Cpu size={22} />}
              title="Hardware Manager & Toolchains"
              onClick={() => setActiveActivity('hardware')}
            />
            <ActivityBarButton
              active={activeActivity === 'serial'}
              icon={<TerminalIcon size={22} />}
              title="Serial Monitor & Output"
              onClick={() => {
                setActiveActivity('serial');
                setBottomOpen(true);
              }}
            />
            <ActivityBarButton
              active={activeActivity === 'debug'}
              icon={<Bug size={22} />}
              title="Debug & Run"
              onClick={() => { setActiveActivity('debug'); setDebugToolbarVisible(true); }}
            />
            <ActivityBarButton
              active={activeActivity === 'ai'}
              icon={<Bot size={22} />}
              title="Cavallo AI Hardware Copilot"
              onClick={() => setActiveActivity('ai')}
            />
            <ActivityBarButton
              active={activeActivity === 'extensions'}
              icon={<Boxes size={22} />}
              title="Extensions & Hardware Packs"
              onClick={() => setActiveActivity('extensions')}
            />
          </div>

          {/* Bottom Settings Icon */}
          <div style={{ width: '100%' }}>
            <ActivityBarButton
              active={activeActivity === 'settings'}
              icon={<SettingsIcon size={22} />}
              title="Settings & Themes"
              onClick={() => setActiveActivity('settings')}
            />
          </div>
        </div>

        {/* Allotment Split Pane Workspace */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Allotment>
            {/* Left Sidebar Pane (200px - 350px) */}
            <Allotment.Pane minSize={180} maxSize={450} preferredSize={240}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#252526',
                  borderRight: '1px solid #3c3c3c',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Sidebar Header */}
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#bbbbbb',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid #3c3c3c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>
                    {activeActivity === 'explorer' && 'EXPLORER: CAVALLO-PROJECT'}
                    {activeActivity === 'hardware' && 'HARDWARE MANAGER'}
                    {activeActivity === 'serial' && 'SERIAL STATUS'}
                    {activeActivity === 'debug' && 'DEBUG & RUN'}
                    {activeActivity === 'ai' && 'CAVALLO AI'}
                    {activeActivity === 'extensions' && 'EXTENSIONS'}
                    {activeActivity === 'settings' && 'SETTINGS'}
                  </span>
                </div>

                {/* Sidebar Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                  {activeActivity === 'explorer' && (
                    <div>
                      <div
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#cccccc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <ChevronDown size={14} />
                        <span>{workspaceRoot ? workspaceRoot.split(/[\\/]/).pop() : 'CAVALLO-WORKSPACE'}</span>
                      </div>
                      <button onClick={onOpenFolder} style={{ ...sidebarBtnStyle, background: '#3c3c3c', margin: '4px 12px 8px', width: 'calc(100% - 24px)' }}>Open Folder</button>
                      <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} aria-label="New project name" style={debugInputStyle} />
                        <select value={newProjectTemplate} onChange={(event) => setNewProjectTemplate(event.target.value as typeof newProjectTemplate)} style={debugInputStyle}>
                          <option value="esp32">ESP32 / PlatformIO</option><option value="arduino-uno">Arduino Uno / PlatformIO</option><option value="arduino-nano">Arduino Nano / PlatformIO</option><option value="pico">Raspberry Pi Pico / CMake</option>
                        </select>
                        <button onClick={async () => { try { setProjectError(''); await onCreateProject?.(newProjectName, newProjectTemplate); } catch (error: any) { setProjectError(error?.message || String(error)); } }} disabled={!newProjectName.trim()} style={{ ...sidebarBtnStyle, background: '#0e639c' }}>Create Project</button>
                        {projectError && <span style={{ color: '#f48771', fontSize: 11 }}>{projectError}</span>}
                      </div>
                      {workspaceFiles.map((file) => {
                        const isSelected = activeFile.id === file.id;
                        return (
                          <div
                            key={file.id}
                            onDoubleClick={() => { if (!file.isDirectory) handleOpenFile(file.path); }}
                            style={{
                              padding: `5px 12px 5px ${28 + (file.depth || 0) * 14}px`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '13px',
                              color: isSelected ? '#ffffff' : '#cccccc',
                              backgroundColor: isSelected ? '#37373d' : 'transparent',
                              borderLeft: isSelected ? '2px solid #007acc' : '2px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#2a2d2e';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                            }}
                          >
                            {file.isDirectory ? <ChevronRight size={14} color="#c5c5c5" /> : file.name.endsWith('.cpp') || file.name.endsWith('.h') ? (
                              <FileCode size={14} color="#569cd6" />
                            ) : (
                              <FileText size={14} color="#9cdcfe" />
                            )}
                            <span>{file.name}{dirtyFileIds.includes(file.id) ? ' •' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeActivity === 'hardware' && (
                    <div style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div style={{ color: '#888', marginBottom: 4 }}>TARGET BOARD</div>
                        <select value={activeBoard} onChange={(event) => onBoardChange?.(event.target.value)} style={debugInputStyle}>
                          <option>ESP32 Dev Module</option><option>Arduino Uno</option><option>Arduino Nano</option><option>Raspberry Pi Pico</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ color: '#888', marginBottom: 4 }}>COMMUNICATION PORT</div>
                        <div style={{ padding: '6px 8px', background: '#1e1e1e', border: '1px solid #3c3c3c', color: '#fff' }}>
                          📡 {activePort}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', marginBottom: 4 }}>FLASH BAUD RATE</div>
                        <div style={{ padding: '6px 8px', background: '#1e1e1e', border: '1px solid #3c3c3c', color: '#fff' }}>
                          ⚡ {activeBaud} baud
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={handleCompile} style={{ ...sidebarBtnStyle, background: '#0e639c' }}>
                          Verify / Compile
                        </button>
                        <button onClick={handleFlash} style={{ ...sidebarBtnStyle, background: '#d97706' }}>
                          Upload
                        </button>
                      </div>
                    </div>
                  )}

                  {activeActivity === 'debug' && (
                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
                      <input value={gdbPath} onChange={(event) => setGdbPath(event.target.value)} aria-label="GDB executable" title="GDB executable on PATH or full path; leave empty to use the board default" placeholder="GDB executable (optional)" style={debugInputStyle} />
                      <button onClick={() => onStartDebug?.(gdbPath)} style={{ ...sidebarBtnStyle, background: '#0e639c' }}>Start Debugging</button>
                      <section>
                        <div style={sectionTitleStyle}>VARIABLES / REGISTERS</div>
                        <pre style={debugPaneStyle}>{debugOutput.split(/\r?\n/).filter((line) => /\$\d+\s*=|=|register|local/i.test(line)).slice(-12).join('\n') || 'Variables appear after execution pauses.'}</pre>
                      </section>
                      <section>
                        <div style={sectionTitleStyle}>WATCH</div>
                        <form onSubmit={(event) => { event.preventDefault(); if (watchInput.trim()) { setWatchExpressions((items) => [...items, watchInput.trim()]); setWatchInput(''); } }} style={{ display: 'flex', gap: 4 }}>
                          <input value={watchInput} onChange={(event) => setWatchInput(event.target.value)} placeholder="Add expression" style={debugInputStyle} />
                          <button type="submit" style={iconBtnStyle}>+</button>
                        </form>
                        {watchExpressions.map((expression, index) => <div key={`${expression}-${index}`} onClick={() => (window as any).api?.debugEvaluate?.(expression)} style={{ padding: '4px 2px', color: '#9cdcfe', cursor: 'pointer' }} title="Click to evaluate">⌕ {expression}</div>)}
                      </section>
                      <section>
                        <div style={sectionTitleStyle}>CALL STACK</div>
                        <pre style={debugPaneStyle}>{debugOutput.split(/\r?\n/).filter((line) => /frame|#\d+\s|at\s+.*\(/i.test(line)).slice(-12).join('\n') || 'Call stack appears when the target pauses.'}</pre>
                      </section>
                    </div>
                  )}

                  {activeActivity === 'ai' && (
                    <div style={{ height: '100%', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 5 }}>
                        <button onClick={() => askAssistant('Diagnose the recent serial error or crash. Identify likely cause and concrete fixes.')} style={aiQuickButtonStyle}>🔍 Debug Serial Error</button>
                        <button onClick={() => askAssistant('Review this firmware for pinout conflicts and RAM/Flash usage. Suggest safe optimizations.')} style={aiQuickButtonStyle}>⚡ Optimize Pinout & Memory</button>
                        <button onClick={() => askAssistant('Generate reusable embedded driver boilerplate for the sensor or actuator described in the current conversation.')} style={aiQuickButtonStyle}>🛠️ Generate Driver Code</button>
                      </div>
                      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {aiMessages.map((message, index) => <div key={index} style={{ padding: 8, background: message.role === 'assistant' ? '#1e1e1e' : '#263746', color: '#d4d4d4', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          <div style={{ color: message.role === 'assistant' ? '#4ec9b0' : '#9cdcfe', fontWeight: 600, marginBottom: 4 }}>{message.role === 'assistant' ? 'Cavallo AI' : 'You'}</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: 'inherit' }}>{message.text}</pre>
                          {message.role === 'assistant' && <div style={{ display: 'flex', gap: 5, marginTop: 6 }}><button onClick={() => onInsertAI?.(message.text, 'insert')} style={iconBtnStyle}><Code2 size={12} /> Insert into Editor</button><button onClick={() => onInsertAI?.(message.text, 'apply')} style={iconBtnStyle}>Apply Fix</button></div>}
                        </div>)}
                        {!aiMessages.length && <div style={{ color: '#888', padding: 8 }}>Ask about firmware, boards, serial errors, or embedded drivers.</div>}
                      </div>
                      <form onSubmit={(event) => { event.preventDefault(); const prompt = aiInput.trim(); if (prompt) { setAiInput(''); void askAssistant(prompt); } }} style={{ display: 'flex', gap: 5 }}>
                        <input value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder={aiBusy ? 'Cavallo AI is responding…' : 'Ask Cavallo AI'} disabled={aiBusy} style={debugInputStyle} />
                        <button type="submit" disabled={aiBusy} style={{ ...iconBtnStyle, background: '#0e639c' }}><Send size={13} /></button>
                      </form>
                    </div>
                  )}

                  {activeActivity === 'extensions' && (
                    <div style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ color: '#888', marginBottom: 2 }}>INSTALLED EXTENSIONS (3)</div>
                      <ExtensionCard name="Espressif ESP32 Toolchain" ver="v1.0.0" arch="Xtensa / RISC-V" />
                      <ExtensionCard name="Arduino AVR Core" ver="v1.0.0" arch="ATmega328P" />
                      <ExtensionCard name="Raspberry Pi Pico SDK" ver="v1.0.0" arch="RP2040" />
                    </div>
                  )}

                  {activeActivity === 'settings' && (
                    <div style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div style={sectionTitleStyle}>CAVALLO AI PROVIDER</div>
                        <select value={aiConfig.provider} onChange={(event) => setAiConfig({ ...aiConfig, provider: event.target.value as typeof aiConfig.provider })} style={debugInputStyle}>
                          <option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option><option value="ollama">Local Ollama</option>
                        </select>
                        <input value={aiConfig.model} onChange={(event) => setAiConfig({ ...aiConfig, model: event.target.value })} placeholder="Model" style={{ ...debugInputStyle, marginTop: 5 }} />
                        {aiConfig.provider === 'ollama' ? <input value={aiConfig.endpoint} onChange={(event) => setAiConfig({ ...aiConfig, endpoint: event.target.value })} placeholder="Ollama endpoint" style={{ ...debugInputStyle, marginTop: 5 }} /> : <input type="password" value={aiConfig.apiKey} onChange={(event) => setAiConfig({ ...aiConfig, apiKey: event.target.value })} placeholder={aiConfig.hasApiKey ? 'API key saved securely; enter to replace' : 'Provider API key'} style={{ ...debugInputStyle, marginTop: 5 }} />}
                        <button onClick={() => (window as any).api?.configureAI?.(aiConfig)} style={{ ...sidebarBtnStyle, background: '#0e639c', marginTop: 6 }}>Save AI Settings</button>
                      </div>
                      <div>
                        <div style={{ color: '#888', marginBottom: 4 }}>COLOR THEME</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => onThemeChange('vs-dark')}
                            style={{ ...sidebarBtnStyle, background: theme === 'vs-dark' ? '#007acc' : '#3c3c3c' }}
                          >
                            Dark
                          </button>
                          <button
                            onClick={() => onThemeChange('vs')}
                            style={{ ...sidebarBtnStyle, background: theme === 'vs' ? '#007acc' : '#3c3c3c' }}
                          >
                            Light
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Allotment.Pane>

            {/* Right Main Workbench (Editor + Bottom Panel) */}
            <Allotment.Pane>
              <Allotment vertical>
                {/* Top: Monaco Editor Area */}
                <Allotment.Pane minSize={200}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
                    {debugToolbarVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 8px', background: '#252526', borderBottom: '1px solid #3c3c3c', flexShrink: 0 }}>
                      <span style={{ color: '#4ec9b0', fontSize: 11, fontWeight: 600, marginRight: 4 }}>DEBUG</span>
                      <button title="Continue" onClick={() => onDebugAction?.('continue')} style={iconBtnStyle}><Play size={13} /></button>
                      <button title="Pause" onClick={() => onDebugAction?.('pause')} style={iconBtnStyle}><Pause size={13} /></button>
                      <button title="Step Over" onClick={() => onDebugAction?.('step-over')} style={iconBtnStyle}><StepForward size={13} /></button>
                      <button title="Step Into" onClick={() => onDebugAction?.('step-into')} style={iconBtnStyle}><ArrowDown size={13} /></button>
                      <button title="Step Out" onClick={() => onDebugAction?.('step-out')} style={iconBtnStyle}><ArrowUp size={13} /></button>
                      <button title="Restart" onClick={() => onDebugAction?.('restart')} style={iconBtnStyle}><RotateCcw size={13} /></button>
                      <button title="Stop" onClick={() => onDebugAction?.('stop')} style={{ ...iconBtnStyle, color: '#f48771' }}><Square size={12} /></button>
                    </div>}
                    {/* Tab Bar (35px) */}
                    <div
                      style={{
                        height: '35px',
                        backgroundColor: '#252526',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflowX: 'auto',
                        borderBottom: '1px solid #1e1e1e',
                        flexShrink: 0
                      }}
                    >
                      {openFiles.map((f) => {
                        const isActive = activeFile.id === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => (onOpenFile || onFileSelect)(f)}
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              backgroundColor: isActive ? '#1e1e1e' : '#2d2d2d',
                              color: isActive ? '#ffffff' : '#969696',
                              borderRight: '1px solid #252526',
                              borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <FileCode size={13} color={isActive ? '#007acc' : '#888888'} />
                            <span>{f.name}{dirtyFileIds.includes(f.id) ? ' •' : ''}</span>
                            <span
                              onClick={(e) => handleCloseTab(e, f)}
                              style={{
                                marginLeft: 4,
                                padding: 2,
                                borderRadius: 0,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLSpanElement).style.backgroundColor = '#454545')}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLSpanElement).style.backgroundColor = 'transparent')}
                            >
                              <X size={12} />
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Breadcrumbs (22px) */}
                    <div
                      style={{
                        height: '22px',
                        backgroundColor: '#1e1e1e',
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: '#888888',
                        borderBottom: '1px solid #2d2d2d',
                        flexShrink: 0
                      }}
                    >
                      <span>src</span>
                      <ChevronRight size={12} style={{ margin: '0 4px' }} />
                      <span style={{ color: '#cccccc' }}>{activeFile.name}</span>
                    </div>

                    {/* Monaco Editor Canvas */}
                    <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
                      {children}
                    </div>
                  </div>
                </Allotment.Pane>

                {/* Bottom Panel (Collapsible: Terminal / Build Output) */}
                {bottomOpen && (
                  <Allotment.Pane minSize={100} preferredSize={240}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#1e1e1e',
                        borderTop: '1px solid #3c3c3c',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Panel Tabs Header */}
                      <div
                        style={{
                          height: '30px',
                          backgroundColor: '#252526',
                          borderBottom: '1px solid #3c3c3c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 8px',
                          flexShrink: 0
                        }}
                      >
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setBottomTab('terminal')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: bottomTab === 'terminal' ? '2px solid #007acc' : '2px solid transparent',
                              color: bottomTab === 'terminal' ? '#ffffff' : '#888888',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Serial Monitor
                          </button>
                          <button
                            onClick={() => setBottomTab('plotter')}
                            style={{ background: 'transparent', border: 'none', borderBottom: bottomTab === 'plotter' ? '2px solid #007acc' : '2px solid transparent', color: bottomTab === 'plotter' ? '#fff' : '#888', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                          >
                            Serial Plotter
                          </button>
                          <button
                            onClick={() => setBottomTab('build')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: bottomTab === 'build' ? '2px solid #007acc' : '2px solid transparent',
                              color: bottomTab === 'build' ? '#ffffff' : '#888888',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Build Console
                          </button>
                        </div>

                        {/* Panel Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => setBottomOpen(false)}
                            title="Close Panel"
                            style={{ background: 'transparent', border: 'none', color: '#888888', cursor: 'pointer', padding: 4 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        {bottomTab === 'terminal' ? terminalComponent : bottomTab === 'plotter' ? plotterComponent : (
                          <div
                            style={{
                              height: '100%',
                              padding: '8px 12px',
                              backgroundColor: '#181818',
                              color: '#d4d4d4',
                              fontFamily: 'Consolas, monospace',
                              fontSize: '12px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              userSelect: 'text'
                            }}
                          >
                            {buildLogs}
                          </div>
                        )}
                      </div>
                    </div>
                  </Allotment.Pane>
                )}
              </Allotment>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>

      {/* ── 3. STATUS BAR (22px) ── */}
      <div
        style={{
          height: '22px',
          backgroundColor: '#007acc',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '12px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>🔌 {activeBoard}</span>
          <span onClick={() => { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); }} title="Open Serial Monitor" style={{ cursor: 'pointer' }}>📡 {activePort || 'No port selected'} {serialConnected ? '●' : ''}</span>
          <span onClick={() => { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); }} title="Open Serial Monitor" style={{ cursor: 'pointer' }}>⚡ {activeBaud} baud</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} /> Ready
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            onClick={() => setCommandPaletteOpen(true)}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Command Palette (Ctrl+Shift+P)
          </span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>UTF-8</span>
          <span style={{ textTransform: 'uppercase' }}>{activeFile.language}</span>
          <span
            onClick={() => onThemeChange(isDark ? 'vs' : 'vs-dark')}
            style={{ cursor: 'pointer' }}
          >
            {isDark ? '☀ Light' : '🌙 Dark'}
          </span>
        </div>
      </div>

      {/* ── 4. COMMAND PALETTE MODAL ── */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenFile={handleOpenFile}
        onCompile={handleCompile}
        onFlash={handleFlash}
        onClearTerminal={() => setBuildLogs('')}
        onToggleTheme={() => onThemeChange(isDark ? 'vs' : 'vs-dark')}
        isDark={isDark}
        files={workspaceFiles}
        onSelectBoard={(board) => onBoardChange?.(board)}
        serialConnected={serialConnected}
        onToggleSerial={() => { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); window.setTimeout(() => onToggleSerial?.(), 0); }}
        onOpenSerial={onOpenSerial || (() => { setActiveActivity('serial'); setBottomOpen(true); setBottomTab('terminal'); })}
        onOpenDebug={onOpenDebug || (() => { setActiveActivity('debug'); setDebugToolbarVisible(true); })}
      />
    </div>
  );
};

const ActivityBarButton: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}> = ({ active, icon, title, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: '100%',
      height: '48px',
      background: 'transparent',
      border: 'none',
      borderLeft: active ? '2px solid #007acc' : '2px solid transparent',
      color: active ? '#ffffff' : '#858585',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      outline: 'none',
      transition: 'color 0.15s ease'
    }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#cccccc';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#858585';
    }}
  >
    {icon}
  </button>
);

const ExtensionCard: React.FC<{ name: string; ver: string; arch: string }> = ({ name, ver, arch }) => (
  <div style={{ padding: '6px 8px', background: '#1e1e1e', border: '1px solid #3c3c3c' }}>
    <div style={{ fontWeight: 600, color: '#fff' }}>{name}</div>
    <div style={{ color: '#888', fontSize: '11px' }}>{arch} • {ver} • Active</div>
  </div>
);

const iconBtnStyle: React.CSSProperties = {
  background: '#2d2d2d',
  border: '1px solid #3c3c3c',
  color: '#cccccc',
  padding: '3px 8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 0
};

const sidebarBtnStyle: React.CSSProperties = {
  flex: 1,
  color: '#ffffff',
  border: 'none',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  borderRadius: 0
};

const debugInputStyle: React.CSSProperties = {
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
  background: '#1e1e1e',
  color: '#d4d4d4',
  border: '1px solid #555',
  padding: '6px 7px',
  fontSize: 12,
};

const sectionTitleStyle: React.CSSProperties = { color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', marginBottom: 5 };
const debugPaneStyle: React.CSSProperties = { margin: 0, padding: 6, maxHeight: 100, overflow: 'auto', background: '#1e1e1e', color: '#ccc', whiteSpace: 'pre-wrap', fontSize: 11 };
const aiQuickButtonStyle: React.CSSProperties = { textAlign: 'left', background: '#2d2d2d', color: '#ddd', border: '1px solid #3c3c3c', padding: '7px 8px', cursor: 'pointer', fontSize: 11 };

function winControlBtnStyle(): React.CSSProperties {
  return {
    width: '46px',
    height: '30px',
    background: 'transparent',
    border: 'none',
    color: '#cccccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.15s ease',
  };
}

export default Layout;
