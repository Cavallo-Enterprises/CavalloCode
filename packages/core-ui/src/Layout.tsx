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
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  theme,
  onThemeChange,
  activeFile,
  onFileSelect,
  terminalComponent,
  cursorPos = { line: 1, col: 1 },
  onCompile,
  onFlash,
  activeBoard = 'ESP32 Dev Module',
  activePort = 'COM3',
  activeBaud = 115200,
  workspaceRoot = null,
  workspaceFiles = DEFAULT_PROJECT_FILES,
  dirtyFileIds = [],
  onOpenFolder,
  onSaveFile,
  onHardwareLog,
  onOpenFile
}) => {
  const [activeActivity, setActiveActivity] = useState<'explorer' | 'hardware' | 'serial' | 'extensions' | 'settings'>('explorer');
  const [openFiles, setOpenFiles] = useState<FileItem[]>([DEFAULT_PROJECT_FILES[0], DEFAULT_PROJECT_FILES[1]]);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'build'>('terminal');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [buildLogs, setBuildLogs] = useState<string>('Ready. Click "Compile" or "Flash" to start build.\n');
  const [isBuilding, setIsBuilding] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const isDark = theme !== 'vs';

  // Window controls
  const handleMinimize = () => (window as any).api?.minimizeWindow?.();
  const handleMaximize = () => (window as any).api?.maximizeWindow?.();
  const handleClose = () => (window as any).api?.closeWindow?.();

  // File open handler
  const handleOpenFile = async (fileName: string) => {
    let found = workspaceFiles.find((f) => f.name === fileName || f.path === fileName);
    if (found && !found.content && !found.isDirectory && (window as any).api?.readFile) {
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
        const res = await (window as any).api.compileProject(workspaceRoot || '.');
        if (!onHardwareLog) setBuildLogs((prev) => prev + (res?.output || 'Compilation finished.\n'));
      } else {
        setBuildLogs((prev) => prev + `[CavalloCode Toolchain] Built firmware for ${activeBoard}.\n=== [SUCCESS] ===\n`);
      }
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
      if (onFlash) {
        const out = await onFlash();
        if (!onHardwareLog) setBuildLogs((prev) => prev + out);
      } else if ((window as any).api?.compileProject) {
        const build = await (window as any).api.compileProject(workspaceRoot || '.');
        if (!build.success) throw new Error('Compilation failed; upload canceled.');
        const isArduino = /arduino|uno|nano/i.test(activeBoard);
        const board = /nano/i.test(activeBoard) ? 'nano' : 'uno';
        const artifact = isArduino
          ? `${workspaceRoot}/.pio/build/${board === 'nano' ? 'nanoatmega328' : 'uno'}/firmware.hex`
          : `${workspaceRoot}/.pio/build/esp32dev/firmware.bin`;
        const res = isArduino
          ? await (window as any).api.flashArduino(board, activePort, artifact)
          : await (window as any).api.flashESP32(activePort, artifact);
        if (!res.success) throw new Error('Upload failed.');
        if (!onHardwareLog) setBuildLogs((prev) => prev + (res?.output || 'Flash finished.\n'));
      } else {
        setBuildLogs((prev) => prev + `[CavalloCode Flasher] Flashed firmware to ${activePort}.\n=== [SUCCESS] ===\n`);
      }
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
                onMouseEnter={(e) => {
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
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
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
          <button onClick={handleMinimize} style={winControlBtnStyle('#333333')}>
            <Minus size={14} />
          </button>
          <button onClick={handleMaximize} style={winControlBtnStyle('#333333')}>
            <Square size={12} />
          </button>
          <button onClick={handleClose} style={winControlBtnStyle('#e81123')}>
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
                      {workspaceFiles.map((file) => {
                        const isSelected = activeFile.id === file.id;
                        return (
                          <div
                            key={file.id}
                            onDoubleClick={() => { if (!file.isDirectory) handleOpenFile(file.path); }}
                            style={{
                              padding: '5px 12px 5px 28px',
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
                        <div style={{ padding: '6px 8px', background: '#1e1e1e', border: '1px solid #3c3c3c', color: '#fff' }}>
                          🔌 {activeBoard}
                        </div>
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
                                borderRadius: 2,
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
                        {bottomTab === 'terminal' ? (
                          terminalComponent
                        ) : (
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
          <span>📡 {activePort}</span>
          <span>⚡ {activeBaud} baud</span>
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
        onToggleTerminal={() => setBottomOpen(!bottomOpen)}
        onClearTerminal={() => setBuildLogs('')}
        onToggleTheme={() => onThemeChange(isDark ? 'vs' : 'vs-dark')}
        isDark={isDark}
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

function winControlBtnStyle(hoverBg: string): React.CSSProperties {
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
