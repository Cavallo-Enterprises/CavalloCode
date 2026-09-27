import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { Play, Zap, Terminal, RefreshCw, Folder, Sun, Moon, Bug, Cpu, Cable } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFile: (fileName: string) => void;
  onCompile: () => void;
  onFlash: () => void;
  onClearTerminal: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  files: Array<{ name: string; path: string; isDirectory?: boolean }>;
  onSelectBoard: (board: string) => void;
  onToggleSerial: () => void;
  serialConnected: boolean;
  onOpenDebug: () => void;
  onOpenSerial: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onOpenFile,
  onCompile,
  onFlash,
  onClearTerminal,
  onToggleTheme,
  isDark,
  files,
  onSelectBoard,
  onToggleSerial,
  serialConnected,
  onOpenDebug,
  onOpenSerial
}) => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'P') && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runAndClose = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '60px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <Command
        label="CavalloCode Command Palette"
        style={{
          width: '560px',
          maxHeight: '400px',
          backgroundColor: '#252526',
          border: '1px solid #454545',
          color: '#cccccc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #3c3c3c', padding: '0 8px' }}>
          <span style={{ color: '#007acc', marginRight: 8, fontSize: 13, fontWeight: 'bold' }}>&gt;</span>
          <Command.Input
            placeholder="Type a command or search files..."
            autoFocus
            style={{
              flex: 1,
              padding: '10px 4px',
              fontSize: '13px',
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: 'none',
              outline: 'none'
            }}
          />
        </div>

        <Command.List
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '4px 0'
          }}
        >
          <Command.Empty style={{ padding: '12px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
            No matching commands found.
          </Command.Empty>

          <Command.Group heading="Hardware & Toolchain" style={{ padding: '0 4px' }}>
            <Command.Item
              onSelect={() => runAndClose(onCompile)}
              style={itemStyle}
            >
              <Play size={14} color="#4ec9b0" />
              <span>Hardware: Compile Firmware (PlatformIO / AVR)</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runAndClose(onFlash)}
              style={itemStyle}
            >
              <Zap size={14} color="#e5c07b" />
              <span>Hardware: Flash / Upload to Connected Target</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Serial Monitor & Terminal" style={{ padding: '0 4px' }}>
            <Command.Item
              onSelect={() => runAndClose(onOpenSerial)}
              style={itemStyle}
            >
              <Terminal size={14} color="#569cd6" />
              <span>View: Open Serial Monitor</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runAndClose(onClearTerminal)}
              style={itemStyle}
            >
              <RefreshCw size={14} color="#9cdcfe" />
              <span>Build Console: Clear Logs</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Files" style={{ padding: '0 4px' }}>
            {files.filter((file) => !file.isDirectory).map((file) => <Command.Item key={file.path} onSelect={() => runAndClose(() => onOpenFile(file.path))} style={itemStyle}>
              <Folder size={14} color="#dcdc96" /><span>File: Open {file.name}</span>
            </Command.Item>)}
          </Command.Group>

          <Command.Group heading="Board & Debug" style={{ padding: '0 4px' }}>
            {['ESP32 Dev Module', 'Arduino Uno', 'Arduino Nano', 'Raspberry Pi Pico'].map((board) => <Command.Item key={board} onSelect={() => runAndClose(() => onSelectBoard(board))} style={itemStyle}>
              <Cpu size={14} color="#4ec9b0" /><span>Board: Select {board}</span>
            </Command.Item>)}
              <Command.Item onSelect={() => runAndClose(onOpenSerial)} style={itemStyle}>
              <Cable size={14} color="#569cd6" /><span>Serial Monitor: Open</span>
            </Command.Item>
            <Command.Item onSelect={() => runAndClose(onToggleSerial)} style={itemStyle}>
              <Cable size={14} color="#569cd6" /><span>Serial: {serialConnected ? 'Disconnect' : 'Connect'}</span>
            </Command.Item>
            <Command.Item onSelect={() => runAndClose(onOpenDebug)} style={itemStyle}>
              <Bug size={14} color="#e5c07b" /><span>Debug: Open Debug & Run</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Preferences & View" style={{ padding: '0 4px' }}>
            <Command.Item
              onSelect={() => runAndClose(onToggleTheme)}
              style={itemStyle}
            >
              {isDark ? <Sun size={14} color="#ce9178" /> : <Moon size={14} color="#ce9178" />}
              <span>Preferences: Switch Color Theme ({isDark ? 'Light' : 'Dark'})</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '6px 12px',
  fontSize: '13px',
  color: '#cccccc',
  cursor: 'pointer',
  userSelect: 'none'
};
