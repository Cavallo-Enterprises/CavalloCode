import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1152000];

interface SerialPort {
  path: string;
  manufacturer?: string;
}

export const WebGLTerminal: React.FC = () => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [selectedBaud, setSelectedBaud] = useState(115200);
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        selectionBackground: '#264f78',
      },
      scrollback: 10000,
    });

    term.open(termRef.current);

    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch (e) {
      console.warn('WebGL addon failed, falling back to canvas renderer', e);
    }

    term.writeln('\x1b[32m╔══════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[32m║   CavalloCode Serial Monitor v1.0.0      ║\x1b[0m');
    term.writeln('\x1b[32m╚══════════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[33mSelect a port and baud rate above to begin.\x1b[0m\n');

    xtermRef.current = term;

    // Request serial ports via IPC (preload exposes window.api)
    if ((window as any).api?.listSerialPorts) {
      (window as any).api.listSerialPorts().then((detected: SerialPort[]) => {
        setPorts(detected);
        if (detected.length > 0) setSelectedPort(detected[0].path);
      });
    } else {
      // Fallback demo ports if IPC not available
      const demoPorts = [{ path: 'COM3', manufacturer: 'Arduino LLC' }, { path: 'COM4', manufacturer: 'Silicon Labs' }];
      setPorts(demoPorts);
      setSelectedPort(demoPorts[0].path);
    }

    return () => {
      term.dispose();
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleConnect = () => {
    const term = xtermRef.current;
    if (!term || !selectedPort) return;
    const ts = showTimestamps ? `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ` : '';
    term.writeln(`${ts}\x1b[32mConnecting to ${selectedPort} @ ${selectedBaud} baud...\x1b[0m`);
    // Real connection via window.api.connectSerial(selectedPort, selectedBaud) here
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e' }}>
      {/* Terminal Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          backgroundColor: '#2d2d2d',
          borderBottom: '1px solid #3c3c3c',
          fontSize: '12px',
          color: '#ccc',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#569cd6', fontWeight: 'bold' }}>SERIAL MONITOR</span>
        <div style={{ width: 1, height: 16, background: '#555', margin: '0 4px' }} />

        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          style={{ background: '#3c3c3c', color: '#ccc', border: '1px solid #555', borderRadius: 3, padding: '1px 4px', fontSize: 12 }}
        >
          {ports.length === 0 && <option value="">No ports detected</option>}
          {ports.map((p) => (
            <option key={p.path} value={p.path}>{p.path} {p.manufacturer ? `(${p.manufacturer})` : ''}</option>
          ))}
        </select>

        <select
          value={selectedBaud}
          onChange={(e) => setSelectedBaud(Number(e.target.value))}
          style={{ background: '#3c3c3c', color: '#ccc', border: '1px solid #555', borderRadius: 3, padding: '1px 4px', fontSize: 12 }}
        >
          {BAUD_RATES.map((b) => (
            <option key={b} value={b}>{b} baud</option>
          ))}
        </select>

        <button onClick={handleConnect} style={btnStyle('#007acc')}>Connect</button>
        <button onClick={() => setIsPaused(!isPaused)} style={btnStyle(isPaused ? '#c0392b' : '#555')}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={handleClear} style={btnStyle('#555')}>Clear</button>

        <div style={{ flex: 1 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} />
          Timestamps
        </label>
      </div>

      {/* xterm.js Canvas */}
      <div ref={termRef} style={{ flex: 1, overflow: 'hidden', padding: '4px' }} />
    </div>
  );
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: 3,
    padding: '2px 10px',
    cursor: 'pointer',
    fontSize: 12,
  };
}

export default WebGLTerminal;

