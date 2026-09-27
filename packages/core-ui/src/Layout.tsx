import React, { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import './theme.css';
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

export type Theme = 'vs-dark' | 'vs' | 'hc-black' | 'cavallo-ocean' | 'cavallo-forest';

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
  platformioPath?: string;
  onPlatformioPathChange?: (path: string) => void;
  onPortChange?: (port: string) => void;
  onBaudChange?: (baud: number) => void;
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
  activePort = '',
  activeBaud = 115200,
  platformioPath = '',
  onPlatformioPathChange,
  onPortChange,
  onBaudChange,
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
  const [settingsSection, setSettingsSection] = useState<'general' | 'appearance' | 'hardware' | 'ai' | 'extensions' | 'shortcuts'>('general');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [installedExtensions, setInstalledExtensions] = useState<Array<{ id: string; path: string; boards: Array<{ id: string; name: string }>; themes?: Array<{ id: string; name: string }>; commands?: Array<{ id: string; title: string; description: string }> }>>([]);
  const [extensionOutput, setExtensionOutput] = useState('');
  const [hardwarePorts, setHardwarePorts] = useState<Array<{ path: string; manufacturer?: string; vendorId?: string; productId?: string }>>([]);
  const [portError, setPortError] = useState('');
  const [debugToolbarVisible, setDebugToolbarVisible] = useState(false);
  const [gdbPath, setGdbPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('my-firmware')
  const [newProjectTemplate, setNewProjectTemplate] = useState<'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico'>('esp32')
  const [projectError, setProjectError] = useState('')

  useEffect(() => { (window as any).api?.getAIConfig?.().then(setAiConfig).catch(console.warn); }, []);
  useEffect(() => { (window as any).api?.getInstalledExtensions?.().then(setInstalledExtensions).catch(console.warn); }, []);
  useEffect(() => {
    document.documentElement.dataset.cavalloTheme = theme;
    return () => { delete document.documentElement.dataset.cavalloTheme; };
  }, [theme]);
  useEffect(() => {
    if (activeActivity !== 'hardware') return;
    void refreshHardwarePorts();
  }, [activeActivity]);
  useEffect(() => { if (debugOutput) setDebugToolbarVisible(true); }, [debugOutput]);

  useEffect(() => {
    const openSerial = () => { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); };
    const openDebug = () => { setActiveActivity('debug'); setDebugToolbarVisible(true); };
    const openExtensionGuide = () => { setSettingsSection('extensions'); setActiveActivity('settings'); };
    const openShortcuts = () => { setSettingsSection('shortcuts'); setActiveActivity('settings'); };
    window.addEventListener('cavallo:open-serial', openSerial);
    window.addEventListener('cavallo:open-debug', openDebug);
    window.addEventListener('cavallo:extension-guide', openExtensionGuide);
    window.addEventListener('cavallo:keyboard-shortcuts', openShortcuts);
    return () => {
      window.removeEventListener('cavallo:open-serial', openSerial);
      window.removeEventListener('cavallo:open-debug', openDebug);
      window.removeEventListener('cavallo:extension-guide', openExtensionGuide);
      window.removeEventListener('cavallo:keyboard-shortcuts', openShortcuts);
    };
  }, []);

  const askAssistant = async (prompt: string) => {
    if (!onAskAI || aiBusy) return;
    if (aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim()) {
      setAiMessages((messages) => [...messages, { role: 'assistant', text: 'AI Assistant requires your own API key. Add it under Settings → AI Assistant. Local Ollama can be used without an API key.' }]);
      return;
    }
    setAiMessages((messages) => [...messages, { role: 'user', text: prompt }]);
    setAiBusy(true);
    try {
      const answer = await onAskAI(prompt);
      setAiMessages((messages) => [...messages, { role: 'assistant', text: answer }]);
    } catch (error: any) {
      setAiMessages((messages) => [...messages, { role: 'assistant', text: `Error: ${error?.message || error}` }]);
    } finally { setAiBusy(false); }
  };

  const refreshHardwarePorts = async () => {
    setPortError('');
    try {
      const ports = await (window as any).cavallo?.listPorts?.();
      setHardwarePorts(Array.isArray(ports) ? ports : []);
    } catch (error: any) {
      setPortError(error?.message || String(error));
    }
  };

  const saveAIConfiguration = async () => {
    try {
      const result = await (window as any).api?.configureAI?.(aiConfig);
      if (!result?.success) throw new Error('AI settings could not be saved.');
      setAiConfig((current) => ({ ...current, apiKey: '', hasApiKey: current.provider === 'ollama' ? false : Boolean(current.apiKey || current.hasApiKey) }));
      setSettingsMessage('AI Assistant settings saved securely.');
    } catch (error: any) {
      setSettingsMessage(error?.message || String(error));
    }
  };

  const runExtensionCommand = async (id: string) => {
    try {
      const output = await (window as any).api?.executeExtensionCommand?.(id);
      setExtensionOutput(String(output || 'Extension command completed.'));
    } catch (error: any) { setExtensionOutput(error?.message || String(error)); }
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
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault(); setCommandPaletteOpen(true);
      }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault(); setBottomOpen((open) => !open);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault(); setActiveActivity('explorer');
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'x') { event.preventDefault(); setActiveActivity('extensions'); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); setActiveActivity('debug'); setDebugToolbarVisible(true); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') { event.preventDefault(); setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'b') { event.preventDefault(); window.dispatchEvent(new Event('cavallo:compile')); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'u') { event.preventDefault(); window.dispatchEvent(new Event('cavallo:flash')); }
      if (event.key === 'F5') { event.preventDefault(); onDebugAction?.('continue'); }
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
    File: ['New Window', 'Open Folder...', 'Save', 'Exit'],
    Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Find', 'Replace'],
    Selection: ['Select All', 'Expand Selection', 'Shrink Selection'],
    View: ['Command Palette...', 'Explorer', 'Hardware Manager', 'Serial Monitor', 'Toggle Panel'],
    Hardware: ['Compile / Verify', 'Upload / Flash', 'Auto-Detect Ports', 'Select Board'],
    Run: ['Start Debugging', 'Run Without Debugging'],
    Terminal: ['New Terminal', 'Clear Terminal', 'Kill Terminal'],
    Help: ['Keyboard Shortcuts', 'Extension Development Guide', 'Check for Updates...', 'Documentation', 'About CavalloCode']
  };

  useEffect(() => {
    const compile = () => { void handleCompile(); };
    const flash = () => { void handleFlash(); };
    const startDebug = () => onStartDebug?.(gdbPath);
    window.addEventListener('cavallo:compile', compile);
    window.addEventListener('cavallo:flash', flash);
    window.addEventListener('cavallo:start-debug', startDebug);
    return () => {
      window.removeEventListener('cavallo:compile', compile);
      window.removeEventListener('cavallo:flash', flash);
      window.removeEventListener('cavallo:start-debug', startDebug);
    };
  }, [handleCompile, handleFlash, onStartDebug, gdbPath]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--cc-root)',
        color: 'var(--cc-foreground)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* ── 1. FRAMELESS WINDOW TITLEBAR (30px) ── */}
      <div
        style={{
          height: '30px',
          backgroundColor: 'var(--cc-surface)',
          borderBottom: '1px solid var(--cc-border)',
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
                  background: activeMenu === menu ? 'var(--cc-activity)' : 'transparent',
                  color: activeMenu === menu ? 'var(--cc-foreground-strong)' : 'var(--cc-foreground)',
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
                    backgroundColor: 'var(--cc-sidebar)',
                    border: '1px solid var(--cc-border-soft)',
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
                        if (item === 'New Window') void (window as any).api?.openNewWindow?.();
                        if (item === 'Open Folder...') onOpenFolder?.();
                        if (item === 'Exit') void (window as any).api?.closeWindow?.();
                        if (menu === 'Edit' || menu === 'Selection') {
                          const commands: Record<string, string> = { Undo: 'undo', Redo: 'redo', Cut: 'cut', Copy: 'copy', Paste: 'paste', Find: 'find', Replace: 'replace', 'Select All': 'selectAll', 'Expand Selection': 'expandSelection', 'Shrink Selection': 'shrinkSelection' };
                          const command = commands[item]; if (command) window.dispatchEvent(new CustomEvent('cavallo:editor-command', { detail: command }));
                        }
                        if (item === 'Explorer') setActiveActivity('explorer');
                        if (item === 'Hardware Manager') setActiveActivity('hardware');
                        if (item === 'New Terminal') { setBottomOpen(true); setBottomTab('terminal'); setActiveActivity('serial'); }
                        if (item === 'Clear Terminal') window.dispatchEvent(new Event('cavallo:clear-terminal'));
                        if (item === 'Kill Terminal') window.dispatchEvent(new Event('cavallo:kill-terminal'));
                        if (item.includes('Compile')) handleCompile();
                        if (item.includes('Upload')) handleFlash();
                        if (item.includes('Toggle Panel')) setBottomOpen(!bottomOpen);
                        if (item === 'Select Board') setActiveActivity('hardware');
                        if (item === 'Auto-Detect Ports') { setActiveActivity('serial'); setBottomTab('terminal'); setBottomOpen(true); window.setTimeout(() => window.dispatchEvent(new Event('cavallo:refresh-ports')), 0); }
                        if (item === 'Serial Monitor') { setActiveActivity('serial'); setBottomOpen(true); setBottomTab('terminal'); }
                        if (item === 'Select Theme' || item === 'Theme') setActiveActivity('settings');
                        if (item === 'Check for Updates...') void (window as any).api?.checkForUpdates?.();
        if (item === 'Extension Development Guide') window.dispatchEvent(new Event('cavallo:extension-guide'));
                        if (item === 'Keyboard Shortcuts') window.dispatchEvent(new Event('cavallo:keyboard-shortcuts'));
                        if (item === 'Documentation') void (window as any).api?.openExternal?.('https://github.com/Cavallo-Enterprises/CavalloCode/blob/main/docs/EXTENSION_DEVELOPMENT.md');
                        if (item === 'About CavalloCode') { setSettingsSection('general'); setActiveActivity('settings'); }
                        if (item === 'Start Debugging') { setActiveActivity('debug'); setDebugToolbarVisible(true); window.dispatchEvent(new Event('cavallo:start-debug')); }
                        if (item === 'Run Without Debugging') window.dispatchEvent(new Event('cavallo:compile'));
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        color: 'var(--cc-foreground)',
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
            backgroundColor: 'var(--cc-sidebar)',
            border: '1px solid var(--cc-border)',
            height: '22px',
            width: '380px',
            cursor: 'pointer',
            fontSize: '12px',
            color: 'var(--cc-muted)',
            WebkitAppRegion: 'no-drag' as any
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#007acc')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--cc-border)')}
        >
          <Search size={12} color="var(--cc-muted)" />
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
            backgroundColor: 'var(--cc-activity)',
            borderRight: '1px solid var(--cc-sidebar)',
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
                setBottomTab('terminal');
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
              title="AI Assistant"
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
                  backgroundColor: 'var(--cc-sidebar)',
                  borderRight: '1px solid var(--cc-border)',
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
                    borderBottom: '1px solid var(--cc-border)',
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
                    {activeActivity === 'ai' && 'AI ASSISTANT'}
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
                          color: 'var(--cc-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <ChevronDown size={14} />
                        <span>{workspaceRoot ? workspaceRoot.split(/[\\/]/).pop() : 'CAVALLO-WORKSPACE'}</span>
                      </div>
                      <button onClick={onOpenFolder} style={{ ...sidebarBtnStyle, background: 'var(--cc-border)', margin: '4px 12px 8px', width: 'calc(100% - 24px)' }}>Open Folder</button>
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
                              color: isSelected ? 'var(--cc-foreground-strong)' : 'var(--cc-foreground)',
                              backgroundColor: isSelected ? 'var(--cc-selected)' : 'transparent',
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
                        <div style={{ color: 'var(--cc-muted)', marginBottom: 4 }}>TARGET BOARD</div>
                        <select value={activeBoard} onChange={(event) => onBoardChange?.(event.target.value)} style={debugInputStyle}>
                          <option>ESP32 Dev Module</option><option>Arduino Uno</option><option>Arduino Nano</option><option>Raspberry Pi Pico</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ color: 'var(--cc-muted)', marginBottom: 4 }}>COMMUNICATION PORT</div>
                        <select value={activePort} onFocus={() => void refreshHardwarePorts()} onChange={(event) => onPortChange?.(event.target.value)} style={debugInputStyle}>
                          <option value="">Select a port</option>
                          {hardwarePorts.map((port) => <option key={port.path} value={port.path}>{port.path} — {port.manufacturer || port.vendorId || 'Serial device'}</option>)}
                        </select>
                        <button onClick={() => void refreshHardwarePorts()} style={{ ...sidebarBtnStyle, background: 'var(--cc-border)', marginTop: 5 }}>Refresh Ports</button>
                        {portError && <div style={{ color: '#f48771', marginTop: 4 }}>{portError}</div>}
                      </div>
                      <div>
                        <div style={{ color: 'var(--cc-muted)', marginBottom: 4 }}>FLASH BAUD RATE</div>
                        <div style={{ padding: '6px 8px', background: 'var(--cc-surface)', border: '1px solid var(--cc-border)', color: 'var(--cc-foreground-strong)' }}>
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
                      {aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim() && <div role="status" style={{ padding: 9, background: '#3b3221', borderLeft: '3px solid #d7ba7d', lineHeight: 1.45 }}>
                        AI Assistant uses your own API key. Add one in Settings to enable cloud providers. <button onClick={() => { setActiveActivity('settings'); setSettingsSection('ai'); }} style={{ ...sidebarBtnStyle, background: '#0e639c', marginTop: 6 }}>Open AI Settings</button>
                      </div>}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 5 }}>
                        <button disabled={aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim()} onClick={() => askAssistant('Diagnose the recent serial error or crash. Identify likely cause and concrete fixes.')} style={aiQuickButtonStyle}>🔍 Debug Serial Error</button>
                        <button disabled={aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim()} onClick={() => askAssistant('Review this firmware for pinout conflicts and RAM/Flash usage. Suggest safe optimizations.')} style={aiQuickButtonStyle}>⚡ Optimize Pinout & Memory</button>
                        <button disabled={aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim()} onClick={() => askAssistant('Generate reusable embedded driver boilerplate for the sensor or actuator described in the current conversation.')} style={aiQuickButtonStyle}>🛠️ Generate Driver Code</button>
                      </div>
                      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {aiMessages.map((message, index) => <div key={index} style={{ padding: 8, background: message.role === 'assistant' ? 'var(--cc-surface)' : '#263746', color: 'var(--cc-foreground)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          <div style={{ color: message.role === 'assistant' ? '#4ec9b0' : '#9cdcfe', fontWeight: 600, marginBottom: 4 }}>{message.role === 'assistant' ? 'AI Assistant' : 'You'}</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: 'inherit' }}>{message.text}</pre>
                          {message.role === 'assistant' && <div style={{ display: 'flex', gap: 5, marginTop: 6 }}><button onClick={() => onInsertAI?.(message.text, 'insert')} style={iconBtnStyle}><Code2 size={12} /> Insert into Editor</button><button onClick={() => onInsertAI?.(message.text, 'apply')} style={iconBtnStyle}>Apply Fix</button></div>}
                        </div>)}
                        {!aiMessages.length && <div style={{ color: 'var(--cc-muted)', padding: 8 }}>Ask about firmware, boards, serial errors, or embedded drivers.</div>}
                      </div>
                      <form onSubmit={(event) => { event.preventDefault(); const prompt = aiInput.trim(); if (prompt) { setAiInput(''); void askAssistant(prompt); } }} style={{ display: 'flex', gap: 5 }}>
                        <input value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder={aiBusy ? 'AI Assistant is responding…' : 'Ask AI Assistant'} disabled={aiBusy || (aiConfig.provider !== 'ollama' && !aiConfig.hasApiKey && !aiConfig.apiKey.trim())} style={debugInputStyle} />
                        <button type="submit" disabled={aiBusy} style={{ ...iconBtnStyle, background: '#0e639c' }}><Send size={13} /></button>
                      </form>
                    </div>
                  )}

                  {activeActivity === 'extensions' && (
                    <div style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ color: 'var(--cc-muted)', marginBottom: 2 }}>LOADED EXTENSIONS ({installedExtensions.length})</div>
                      {installedExtensions.map((extension) => <ExtensionCard key={extension.id} name={extension.id} ver="Loaded" arch={extension.boards.map((board) => board.name).join(', ') || extension.path} />)}
                      {!installedExtensions.length && <div style={{ color: 'var(--cc-muted)' }}>No extensions are currently loaded.</div>}
                    </div>
                  )}

                  {activeActivity === 'settings' && (
                    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(['general', 'appearance', 'hardware', 'ai', 'extensions', 'shortcuts'] as const).map((section) => <button key={section} onClick={() => setSettingsSection(section)} style={{ ...settingsNavButtonStyle, background: settingsSection === section ? 'var(--cc-selected)' : 'transparent', borderLeft: settingsSection === section ? '2px solid #007acc' : '2px solid transparent' }}>{section === 'ai' ? 'AI Assistant' : section === 'shortcuts' ? 'Keyboard Shortcuts' : section[0].toUpperCase() + section.slice(1)}</button>)}
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
                    {debugToolbarVisible && <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 8px', background: 'var(--cc-sidebar)', borderBottom: '1px solid var(--cc-border)', flexShrink: 0 }}>
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
                        backgroundColor: 'var(--cc-sidebar)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflowX: 'auto',
                        borderBottom: '1px solid var(--cc-surface)',
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
                              backgroundColor: isActive ? 'var(--cc-surface)' : 'var(--cc-tab)',
                              color: isActive ? 'var(--cc-foreground-strong)' : 'var(--cc-muted)',
                              borderRight: '1px solid var(--cc-sidebar)',
                              borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <FileCode size={13} color={isActive ? '#007acc' : 'var(--cc-muted)'} />
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
                              onMouseEnter={(e) => ((e.currentTarget as HTMLSpanElement).style.backgroundColor = 'var(--cc-border-soft)')}
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
                        backgroundColor: 'var(--cc-surface)',
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: 'var(--cc-muted)',
                        borderBottom: '1px solid var(--cc-tab)',
                        flexShrink: 0
                      }}
                    >
                      <span>src</span>
                      <ChevronRight size={12} style={{ margin: '0 4px' }} />
                      <span style={{ color: 'var(--cc-foreground)' }}>{activeFile.name}</span>
                    </div>

                    {/* Monaco Editor Canvas */}
                    <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'hidden' }}>
                      {activeActivity === 'settings' ? <SettingsPage
                        section={settingsSection}
                        onSectionChange={setSettingsSection}
                        theme={theme}
                        onThemeChange={onThemeChange}
                        board={activeBoard}
                        onBoardChange={(board) => onBoardChange?.(board)}
                        baud={activeBaud}
                        onBaudChange={(baud) => onBaudChange?.(baud)}
                        platformioPath={platformioPath}
                        onPlatformioPathChange={onPlatformioPathChange}
                        workspaceRoot={workspaceRoot}
                        aiConfig={aiConfig}
                        onAIConfigChange={(config) => { setSettingsMessage(''); setAiConfig(config); }}
                        onSaveAI={() => void saveAIConfiguration()}
                        aiMessage={settingsMessage}
                        extensions={installedExtensions}
                        extensionOutput={extensionOutput}
                        onRunExtensionCommand={runExtensionCommand}
                      /> : children}
                    </div>
                  </div>
                </Allotment.Pane>

                {/* Bottom Panel (Collapsible: Terminal / Build Output) */}
                <Allotment.Pane minSize={bottomOpen ? 100 : 0} preferredSize={bottomOpen ? 240 : 0} visible={bottomOpen}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: 'var(--cc-surface)',
                        borderTop: '1px solid var(--cc-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Panel Tabs Header */}
                      <div
                        style={{
                          height: '30px',
                          backgroundColor: 'var(--cc-sidebar)',
                          borderBottom: '1px solid var(--cc-border)',
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
                              color: bottomTab === 'terminal' ? 'var(--cc-foreground-strong)' : 'var(--cc-muted)',
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
                            style={{ background: 'transparent', border: 'none', borderBottom: bottomTab === 'plotter' ? '2px solid #007acc' : '2px solid transparent', color: bottomTab === 'plotter' ? 'var(--cc-foreground-strong)' : 'var(--cc-muted)', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                          >
                            Serial Plotter
                          </button>
                          <button
                            onClick={() => setBottomTab('build')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: bottomTab === 'build' ? '2px solid #007acc' : '2px solid transparent',
                              color: bottomTab === 'build' ? 'var(--cc-foreground-strong)' : 'var(--cc-muted)',
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
                            style={{ background: 'transparent', border: 'none', color: 'var(--cc-muted)', cursor: 'pointer', padding: 4 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ height: '100%', display: bottomTab === 'terminal' ? 'block' : 'none' }}><PanelErrorBoundary title="Serial Monitor">{terminalComponent}</PanelErrorBoundary></div>
                        <div style={{ height: '100%', display: bottomTab === 'plotter' ? 'block' : 'none' }}><PanelErrorBoundary title="Serial Plotter">{plotterComponent}</PanelErrorBoundary></div>
                        <div style={{ height: '100%', display: bottomTab === 'build' ? 'block' : 'none' }}>
                          <div
                            style={{
                              height: '100%',
                              padding: '8px 12px',
                              backgroundColor: 'var(--cc-root)',
                              color: 'var(--cc-foreground)',
                              fontFamily: 'Consolas, monospace',
                              fontSize: '12px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              userSelect: 'text'
                            }}
                          >
                            {buildLogs}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Allotment.Pane>
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
          color: 'var(--cc-foreground-strong)',
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
      color: active ? 'var(--cc-foreground-strong)' : 'var(--cc-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      outline: 'none',
      transition: 'color 0.15s ease'
    }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--cc-foreground)';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--cc-muted)';
    }}
  >
    {icon}
  </button>
);

const ExtensionCard: React.FC<{ name: string; ver: string; arch: string }> = ({ name, ver, arch }) => (
  <div style={{ padding: '6px 8px', background: 'var(--cc-surface)', border: '1px solid var(--cc-border)' }}>
    <div style={{ fontWeight: 600, color: 'var(--cc-foreground-strong)' }}>{name}</div>
    <div style={{ color: 'var(--cc-muted)', fontSize: '11px' }}>{arch} • {ver} • Active</div>
  </div>
);

const iconBtnStyle: React.CSSProperties = {
  background: 'var(--cc-tab)',
  border: '1px solid var(--cc-border)',
  color: 'var(--cc-foreground)',
  padding: '3px 8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 0
};

const sidebarBtnStyle: React.CSSProperties = {
  flex: 1,
  color: 'var(--cc-foreground-strong)',
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
  background: 'var(--cc-surface)',
  color: 'var(--cc-foreground)',
  border: '1px solid #555',
  padding: '6px 7px',
  fontSize: 12,
};

const sectionTitleStyle: React.CSSProperties = { color: 'var(--cc-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', marginBottom: 5 };
const debugPaneStyle: React.CSSProperties = { margin: 0, padding: 6, maxHeight: 100, overflow: 'auto', background: 'var(--cc-surface)', color: 'var(--cc-foreground)', whiteSpace: 'pre-wrap', fontSize: 11 };
const aiQuickButtonStyle: React.CSSProperties = { textAlign: 'left', background: 'var(--cc-tab)', color: '#ddd', border: '1px solid var(--cc-border)', padding: '7px 8px', cursor: 'pointer', fontSize: 11 };
const settingsNavButtonStyle: React.CSSProperties = { textAlign: 'left', background: 'transparent', color: 'var(--cc-foreground)', border: 'none', padding: '7px 9px', cursor: 'pointer', fontSize: 12 };

interface SettingsPageProps {
  section: 'general' | 'appearance' | 'hardware' | 'ai' | 'extensions' | 'shortcuts';
  onSectionChange: (section: SettingsPageProps['section']) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  board: string;
  onBoardChange: (board: string) => void;
  baud: number;
  onBaudChange: (baud: number) => void;
  platformioPath: string;
  onPlatformioPathChange?: (path: string) => void;
  workspaceRoot: string | null;
  aiConfig: { provider: 'openai' | 'gemini' | 'anthropic' | 'ollama'; apiKey: string; hasApiKey: boolean; model: string; endpoint: string };
  onAIConfigChange: (config: SettingsPageProps['aiConfig']) => void;
  onSaveAI: () => void;
  aiMessage: string;
  extensions: Array<{ id: string; path: string; boards: Array<{ id: string; name: string }>; themes?: Array<{ id: string; name: string }>; commands?: Array<{ id: string; title: string; description: string }> }>;
  extensionOutput: string;
  onRunExtensionCommand: (id: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = (props) => {
  const { section, onSectionChange, theme, onThemeChange, board, onBoardChange, baud, onBaudChange, platformioPath, onPlatformioPathChange, workspaceRoot, aiConfig, onAIConfigChange, onSaveAI, aiMessage, extensions, extensionOutput, onRunExtensionCommand } = props;
  const sections: Array<{ id: SettingsPageProps['section']; title: string }> = [
    { id: 'general', title: 'General' }, { id: 'appearance', title: 'Appearance' },
    { id: 'hardware', title: 'Hardware' }, { id: 'ai', title: 'AI Assistant' }, { id: 'extensions', title: 'Extensions' }, { id: 'shortcuts', title: 'Keyboard Shortcuts' },
  ];
  const inputStyle: React.CSSProperties = { width: '100%', maxWidth: 520, boxSizing: 'border-box', background: 'var(--cc-border)', color: '#ddd', border: '1px solid #555', padding: '7px 9px', fontSize: 13 };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 560, margin: '18px 0' };
  const heading = sections.find((item) => item.id === section)?.title || 'General';
  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cc-surface)', color: 'var(--cc-foreground)', overflow: 'hidden' }}>
    <header style={{ padding: '18px 24px 12px', borderBottom: '1px solid var(--cc-control)', flexShrink: 0 }}>
      <div style={{ fontSize: 19, fontWeight: 500 }}>Settings</div>
      <div style={{ fontSize: 11, color: 'var(--cc-muted)', marginTop: 4 }}>Preferences for your workspace and hardware toolchain</div>
    </header>
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <nav aria-label="Settings categories" style={{ width: 190, flexShrink: 0, padding: 12, borderRight: '1px solid var(--cc-control)', overflowY: 'auto' }}>
        {sections.map((item) => <button key={item.id} onClick={() => onSectionChange(item.id)} style={{ ...settingsNavButtonStyle, width: '100%', background: section === item.id ? 'var(--cc-selected)' : 'transparent', borderLeft: section === item.id ? '2px solid #007acc' : '2px solid transparent' }}>{item.title}</button>)}
      </nav>
      <main style={{ flex: 1, minWidth: 0, padding: '20px 28px', overflow: 'auto' }}>
        <h2 style={{ fontSize: 17, fontWeight: 500, margin: '0 0 16px' }}>{heading}</h2>
        {section === 'general' && <>
          <div style={sectionTitleStyle}>WORKSPACE</div>
          <label style={fieldStyle}>Current folder<input readOnly value={workspaceRoot || 'No folder opened'} style={inputStyle} /></label>
          <div style={{ color: 'var(--cc-muted)', fontSize: 12, maxWidth: 560 }}>Use File → Open Folder to load a local firmware project. Files open in the editor and can be saved with Ctrl+S / Cmd+S.</div>
          <div style={{ ...sectionTitleStyle, marginTop: 28 }}>DEFAULT TARGET</div>
          <label style={fieldStyle}>Board<select value={board} onChange={(event) => onBoardChange(event.target.value)} style={inputStyle}><option>ESP32 Dev Module</option><option>Arduino Uno</option><option>Arduino Nano</option><option>Raspberry Pi Pico</option></select></label>
        </>}
        {section === 'appearance' && <>
          <div style={sectionTitleStyle}>COLOR THEME</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {(['vs-dark', 'vs', 'hc-black', 'cavallo-ocean', 'cavallo-forest'] as const).map((value) => <button key={value} onClick={() => onThemeChange(value)} style={{ ...iconBtnStyle, background: theme === value ? '#0e639c' : 'var(--cc-control)', padding: '8px 14px' }}>{({ 'vs-dark': 'Dark', vs: 'Light', 'hc-black': 'High Contrast', 'cavallo-ocean': 'Ocean', 'cavallo-forest': 'Forest' })[value]}</button>)}
          </div>
          <p style={{ color: 'var(--cc-muted)', fontSize: 12 }}>Editor and workbench theme.</p>
        </>}
        {section === 'hardware' && <>
          <div style={sectionTitleStyle}>DEFAULT SERIAL SETTINGS</div>
          <label style={fieldStyle}>Target board<select value={board} onChange={(event) => onBoardChange(event.target.value)} style={inputStyle}><option>ESP32 Dev Module</option><option>Arduino Uno</option><option>Arduino Nano</option><option>Raspberry Pi Pico</option></select></label>
          <label style={fieldStyle}>Monitor baud rate<select value={baud} onChange={(event) => onBaudChange(Number(event.target.value))} style={inputStyle}>{[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map((rate) => <option key={rate} value={rate}>{rate}</option>)}</select></label>
          {!/pico|rp2040/i.test(board) && <label style={fieldStyle}>PlatformIO executable path<input value={platformioPath} onChange={(event) => onPlatformioPathChange?.(event.target.value)} placeholder="platformio (PATH) or full executable path" style={inputStyle} /><span style={{ color: 'var(--cc-muted)', fontSize: 12 }}>Install PlatformIO Core and leave this blank to use PATH, or enter the full path to its CLI executable.</span></label>}
          <div style={{ color: 'var(--cc-muted)', fontSize: 12, maxWidth: 560 }}>Choose a detected serial port in Hardware Manager or Serial Monitor. Compile and Upload actions use the selected board and port.</div>
        </>}
        {section === 'ai' && <>
          <div style={{ maxWidth: 560, padding: 10, background: 'var(--cc-sidebar)', borderLeft: '3px solid #007acc', fontSize: 12, lineHeight: 1.5 }}>AI Assistant does not include a hosted AI account or API key. Enter your own provider key below, or use a local Ollama server.</div>
          <label style={fieldStyle}>Provider<select value={aiConfig.provider} onChange={(event) => onAIConfigChange({ ...aiConfig, provider: event.target.value as typeof aiConfig.provider, apiKey: '', hasApiKey: false })} style={inputStyle}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option><option value="ollama">Local Ollama</option></select></label>
          <label style={fieldStyle}>Model<input value={aiConfig.model} onChange={(event) => onAIConfigChange({ ...aiConfig, model: event.target.value })} placeholder={aiConfig.provider === 'ollama' ? 'llama3.2' : 'Provider model ID'} style={inputStyle} /></label>
          {aiConfig.provider === 'ollama' ? <label style={fieldStyle}>Ollama endpoint<input value={aiConfig.endpoint} onChange={(event) => onAIConfigChange({ ...aiConfig, endpoint: event.target.value })} placeholder="http://localhost:11434" style={inputStyle} /></label> : <label style={fieldStyle}>Your API key<input type="password" value={aiConfig.apiKey} onChange={(event) => onAIConfigChange({ ...aiConfig, apiKey: event.target.value })} placeholder={aiConfig.hasApiKey ? 'Key saved securely; enter to replace' : 'Paste your own API key'} style={inputStyle} /></label>}
          <button onClick={onSaveAI} style={{ ...iconBtnStyle, background: '#0e639c', padding: '7px 14px' }}>Save AI Settings</button>
          {aiConfig.provider !== 'ollama' && <div style={{ color: aiConfig.hasApiKey ? '#4ec9b0' : '#d7ba7d', fontSize: 12, marginTop: 8 }}>{aiConfig.hasApiKey ? 'An API key is saved in OS secure storage.' : 'A personal API key is required to use this provider.'}</div>}
          {aiMessage && <div role="status" style={{ color: aiMessage.includes('saved') ? '#4ec9b0' : '#f48771', fontSize: 12, marginTop: 8 }}>{aiMessage}</div>}
        </>}
        {section === 'extensions' && <>
          <div style={sectionTitleStyle}>LOADED EXTENSIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, maxWidth: 640 }}>
            {extensions.map((extension) => <ExtensionCard key={extension.id} name={extension.id} ver="Loaded" arch={extension.boards.map((item) => item.name).join(', ') || extension.path} />)}
            {!extensions.length && <div style={{ color: 'var(--cc-muted)', fontSize: 12 }}>No extensions are loaded.</div>}
          </div>
          <p style={{ color: 'var(--cc-muted)', fontSize: 12, maxWidth: 640 }}>Built-in hardware extensions are activated when CavalloCode starts and contribute board/toolchain support.</p>
          <div style={{ ...sectionTitleStyle, marginTop: 24 }}>BUILT-IN EXTENSION COMMANDS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640, marginTop: 12 }}>
            {extensions.flatMap((extension) => extension.commands || []).map((command) => <button key={command.id} onClick={() => onRunExtensionCommand(command.id)} title={command.description} style={{ ...iconBtnStyle, textAlign: 'left', padding: 10 }}>{command.title}</button>)}
          </div>
          {extensionOutput && <pre role="status" style={{ whiteSpace: 'pre-wrap', maxWidth: 640, background: 'var(--cc-sidebar)', padding: 12, color: 'var(--cc-foreground)', fontSize: 12 }}>{extensionOutput}</pre>}
          <div style={{ ...sectionTitleStyle, marginTop: 24 }}>BUILT-IN THEMES</div>
          <p style={{ color: 'var(--cc-muted)', fontSize: 12 }}>Cavallo Ocean and Cavallo Forest are theme extensions. Select them from Settings → Appearance.</p>
          <div style={{ ...sectionTitleStyle, marginTop: 28 }}>EXTENSION DEVELOPMENT</div>
          <p style={{ color: 'var(--cc-foreground)', fontSize: 13, lineHeight: 1.6, maxWidth: 700 }}>Extensions are TypeScript packages that export a default <code>CavalloPlugin</code>. Implement <code>activate(context)</code> and <code>deactivate()</code>; add disposables to <code>context.subscriptions</code> so resources are released on unload. Board extensions can implement <code>registerBoard()</code> with an id, display name, vendor, architecture, and default baud rate. Upload integrations may implement <code>uploadHandler(port, file)</code>.</p>
          <pre style={{ maxWidth: 700, padding: 12, background: 'var(--cc-sidebar)', color: 'var(--cc-foreground)', overflow: 'auto', fontSize: 12 }}>{`import type { CavalloPlugin } from 'plugin-api';\n\nconst extension: CavalloPlugin = {\n  activate(context) { console.info('Extension ready', context.extensionPath); },\n  deactivate() {},\n  registerBoard() { return [{ id: 'my-board', name: 'My Board', vendor: 'Example', architecture: 'esp32', defaultBaudRate: 115200 }]; }\n};\nexport default extension;`}</pre>
          <p style={{ color: 'var(--cc-muted)', fontSize: 12, lineHeight: 1.6, maxWidth: 700 }}>Place source under <code>extensions/&lt;extension-name&gt;/src/index.ts</code>, add a package manifest and typecheck it with the workspace. Register built-ins in <code>apps/desktop/src/main/index.ts</code>; they are loaded by the extension host at startup. Always dispose timers, listeners, and processes. Extension packages run in the trusted desktop process; only install code you trust.</p>
        </>}
        {section === 'shortcuts' && <div style={{ maxWidth: 640 }}>{[['Ctrl/Cmd + Shift + P', 'Command Palette'], ['Ctrl/Cmd + ,', 'Settings'], ['Ctrl/Cmd + S', 'Save active file'], ['Ctrl/Cmd + B', 'Toggle bottom panel'], ['Ctrl/Cmd + Shift + E', 'Explorer'], ['Ctrl/Cmd + Shift + X', 'Extensions'], ['Ctrl/Cmd + Shift + D', 'Debug & Run'], ['Ctrl/Cmd + Shift + M', 'Serial Monitor'], ['Ctrl/Cmd + Shift + B', 'Compile firmware'], ['Ctrl/Cmd + Shift + U', 'Upload firmware'], ['F5', 'Continue debugging']].map(([keys, action]) => <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 4px', borderBottom: '1px solid var(--cc-border)', fontSize: 13 }}><span>{action}</span><code>{keys}</code></div>)}</div>}
      </main>
    </div>
  </div>;
};

interface PanelErrorBoundaryProps { title: string; children?: React.ReactNode }
interface PanelErrorBoundaryState { error: string | null }
class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { error: null };
  private readonly panelTitle: string;
  private readonly panelContent?: React.ReactNode;
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.panelTitle = props.title;
    this.panelContent = props.children;
  }
  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState { return { error: error.message }; }
  componentDidCatch(error: Error) { console.error(`[${this.panelTitle}] panel failed to render`, error); }
  render() {
    if (this.state.error) return <div role="alert" style={{ padding: 16, color: '#f48771', background: 'var(--cc-surface)', fontSize: 12 }}>Could not render {this.panelTitle}: {this.state.error}</div>;
    return this.panelContent;
  }
}

function winControlBtnStyle(): React.CSSProperties {
  return {
    width: '46px',
    height: '30px',
    background: 'transparent',
    border: 'none',
    color: 'var(--cc-foreground)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.15s ease',
  };
}

export default Layout;
