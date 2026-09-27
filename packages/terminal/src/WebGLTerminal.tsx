import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

interface SerialPort {
  path: string;
  manufacturer?: string;
  friendlyName?: string;
  vendorId?: string;
  productId?: string;
}

interface WebGLTerminalProps {
  onPortSelect?: (port: string) => void;
  onBaudSelect?: (baud: number) => void;
}

export const WebGLTerminal: React.FC<WebGLTerminalProps> = ({ onPortSelect, onBaudSelect }) => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [selectedBaud, setSelectedBaud] = useState(115200);
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const autoScrollRef = useRef(autoScroll);
  const isPausedRef = useRef(isPaused);
  autoScrollRef.current = autoScroll;
  isPausedRef.current = isPaused;
  const [sendText, setSendText] = useState('');

  const refreshPorts = async () => {
    if ((window as any).cavallo?.listPorts) {
      try {
        const detected: SerialPort[] = await (window as any).cavallo.listPorts();
        setPorts(detected);
        if (detected.length > 0 && !selectedPort) {
          setSelectedPort(detected[0].path);
          onPortSelect?.(detected[0].path);
        }
      } catch (err) {
        console.warn('Failed to list serial ports:', err);
      }
    }
  };

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
      console.warn('WebGL addon fallback to canvas:', e);
    }

    term.writeln('\x1b[32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[32m║   CavalloCode High-Performance Serial Monitor v1.0.0    ║\x1b[0m');
    term.writeln('\x1b[32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90mReady. Select target port and baud rate to connect.\x1b[0m\n');

    xtermRef.current = term;

    // Listen for incoming serial data from main process
    const removeDataListener = (window as any).cavallo?.onSerialData?.((chunk: string) => {
      if (!isPausedRef.current && xtermRef.current) {
        xtermRef.current.write(chunk);
        if (autoScrollRef.current) xtermRef.current.scrollToBottom();
      }
    });
    const removeErrorListener = (window as any).api?.onSerialError?.((message: string) => term.writeln(`\r\n\x1b[31m[Serial error] ${message}\x1b[0m`));

    refreshPorts();

    return () => {
      term.dispose();
      removeDataListener?.();
      removeErrorListener?.();
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleToggleConnect = async () => {
    const term = xtermRef.current;
    if (!term) return;

    const ts = '';

    if (isConnected) {
      await (window as any).cavallo?.disconnectSerial?.();
      setIsConnected(false);
      term.writeln(`\n${ts}\x1b[33m[Disconnected] Port ${selectedPort} closed.\x1b[0m\n`);
    } else {
      if (!selectedPort) {
        term.writeln(`\n\x1b[31m[Error] No serial port selected. Connect a hardware board and retry.\x1b[0m\n`);
        return;
      }
      term.writeln(`\n${ts}\x1b[32m[Connecting] Opening ${selectedPort} @ ${selectedBaud} baud...\x1b[0m`);
      if ((window as any).cavallo?.connectSerial) {
        try {
          const res = await (window as any).cavallo.connectSerial(selectedPort, selectedBaud);
          if (res?.success) {
            setIsConnected(true);
            term.writeln(`${ts}\x1b[32m[Connected] Serial link active on ${selectedPort}.\x1b[0m\n`);
          } else {
            term.writeln(`${ts}\x1b[31m[Error] Failed to open ${selectedPort}.\x1b[0m\n`);
          }
        } catch (err: any) {
          term.writeln(`${ts}\x1b[31m[Error] ${err?.message || 'Connection failed'}\x1b[0m\n`);
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
      {/* Terminal Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c',
          fontSize: '12px',
          color: '#cccccc',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#569cd6', fontWeight: 600, letterSpacing: '0.5px' }}>SERIAL MONITOR</span>
        <div style={{ width: 1, height: 16, background: '#3c3c3c', margin: '0 4px' }} />

        {/* Dynamic Port Dropdown */}
        <select
          value={selectedPort}
          onFocus={refreshPorts}
          onChange={(e) => {
            setSelectedPort(e.target.value);
            onPortSelect?.(e.target.value);
          }}
          style={selectStyle}
        >
          {ports.length === 0 && <option value="">No serial devices detected</option>}
          {ports.map((p) => (
            <option key={p.path} value={p.path}>
              {p.path} - {p.manufacturer || p.friendlyName || `${p.vendorId || 'USB'}:${p.productId || 'device'}`}
            </option>
          ))}
        </select>

        {/* Baud Rate Selector */}
        <select
          value={selectedBaud}
          onChange={(e) => {
            const b = Number(e.target.value);
            setSelectedBaud(b);
            onBaudSelect?.(b);
          }}
          style={selectStyle}
        >
          {BAUD_RATES.map((b) => (
            <option key={b} value={b}>{b} baud</option>
          ))}
        </select>

        {/* Connect / Disconnect button */}
        <button
          onClick={handleToggleConnect}
          style={btnStyle(isConnected ? '#c0392b' : '#16a34a')}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>

        <button
          onClick={() => setIsPaused(!isPaused)}
          style={btnStyle(isPaused ? '#d97706' : '#3c3c3c')}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        <button onClick={handleClear} style={btnStyle('#3c3c3c')}>
          Clear Output
        </button>

        <div style={{ flex: 1 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#aaa' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>

      {/* xterm.js Canvas */}
      <div ref={termRef} style={{ flex: 1, overflow: 'hidden', padding: '4px' }} />
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (!sendText || !isConnected) return;
        try {
          await (window as any).cavallo.sendSerialData(`${sendText}\r\n`);
          setSendText('');
        } catch (error: any) {
          xtermRef.current?.writeln(`\r\n\x1b[31m[Send error] ${error?.message || error}\x1b[0m`);
        }
      }} style={{ display: 'flex', gap: 6, padding: '6px 8px', background: '#252526', borderTop: '1px solid #3c3c3c' }}>
        <input value={sendText} onChange={(event) => setSendText(event.target.value)} placeholder="Send serial text…" disabled={!isConnected} style={{ flex: 1, ...selectStyle }} />
        <button type="submit" disabled={!isConnected} style={btnStyle('#0e639c')}>Send</button>
      </form>
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  background: '#3c3c3c',
  color: '#cccccc',
  border: '1px solid #555555',
  borderRadius: 0,
  padding: '2px 6px',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer'
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 0,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background 0.15s ease',
  };
}


export default WebGLTerminal;

