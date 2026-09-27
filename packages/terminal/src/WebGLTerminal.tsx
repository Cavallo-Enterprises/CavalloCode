import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
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
  onOutput?: (chunk: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const WebGLTerminal: React.FC<WebGLTerminalProps> = ({ onPortSelect, onBaudSelect, onOutput, onConnectionChange }) => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const disposeTimerRef = useRef<number | null>(null);
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
  const onOutputRef = useRef(onOutput);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onPortSelectRef = useRef(onPortSelect);
  const onBaudSelectRef = useRef(onBaudSelect);
  onOutputRef.current = onOutput;
  onConnectionChangeRef.current = onConnectionChange;
  onPortSelectRef.current = onPortSelect;
  onBaudSelectRef.current = onBaudSelect;

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
    if (disposeTimerRef.current !== null) {
      window.clearTimeout(disposeTimerRef.current);
      disposeTimerRef.current = null;
    }
    let term = xtermRef.current;
    if (!term) {
      term = new Terminal({
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

      // Keep xterm's built-in renderer here. The WebGL addon currently fails
      // while restoring the renderer during terminal disposal in Electron.
      term.writeln('\x1b[32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[32m║   CavalloCode High-Performance Serial Monitor v1.0.0    ║\x1b[0m');
      term.writeln('\x1b[32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
      term.writeln('\x1b[90mReady. Select target port and baud rate to connect.\x1b[0m\n');
      xtermRef.current = term;
    }
    void (window as any).cavallo?.getStatus?.().then((status: { connected: boolean; port: string; baudRate: number }) => {
      setIsConnected(status.connected);
      onConnectionChangeRef.current?.(status.connected);
      if (status.port) { setSelectedPort(status.port); onPortSelectRef.current?.(status.port); }
      if (status.baudRate) { setSelectedBaud(status.baudRate); onBaudSelectRef.current?.(status.baudRate); }
    }).catch((error: unknown) => console.warn('Failed to read serial status:', error));

    // Listen for incoming serial data from main process
    const removeDataListener = (window as any).cavallo?.onSerialData?.((chunk: string) => {
      onOutputRef.current?.(chunk);
      if (!isPausedRef.current && xtermRef.current) {
        xtermRef.current.write(chunk);
        if (autoScrollRef.current) xtermRef.current.scrollToBottom();
      }
    });
    const removeErrorListener = (window as any).api?.onSerialError?.((message: string) => { setIsConnected(false); onConnectionChangeRef.current?.(false); term.writeln(`\r\n\x1b[31m[Serial error] ${message}\x1b[0m`); });

    void refreshPortsRef.current();
    let disposed = false;
    let refreshFrame = 0;
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => { if (!disposed) term.refresh(0, term.rows - 1); });
    });
    if (termRef.current) resizeObserver?.observe(termRef.current);

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      resizeObserver?.disconnect();
      removeDataListener?.();
      removeErrorListener?.();
      disposeTimerRef.current = window.setTimeout(() => {
        if (xtermRef.current === term) {
          xtermRef.current = null;
          term.dispose();
        }
        disposeTimerRef.current = null;
      }, 0);
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleToggleConnect = async () => {
    const term = xtermRef.current;
    if (!term) return;

    if (isConnected) {
      try {
        await (window as any).cavallo?.disconnectSerial?.();
        setIsConnected(false);
        onConnectionChange?.(false);
        term.writeln(`\n\x1b[33m[Disconnected] Port ${selectedPort} closed.\x1b[0m\n`);
      } catch (error: any) { term.writeln(`\r\n\x1b[31m[Disconnect error] ${error?.message || error}\x1b[0m`); }
    } else {
      if (!selectedPort) {
        term.writeln(`\n\x1b[31m[Error] No serial port selected. Connect a hardware board and retry.\x1b[0m\n`);
        return;
      }
      if (!(window as any).cavallo?.connectSerial) {
        term.writeln('\x1b[31m[Error] Serial connection API is unavailable. Restart the app and check its installation.\x1b[0m\n');
        return;
      }
      term.writeln(`\n\x1b[32m[Connecting] Opening ${selectedPort} @ ${selectedBaud} baud...\x1b[0m`);
      if ((window as any).cavallo?.connectSerial) {
        try {
          const res = await (window as any).cavallo.connectSerial(selectedPort, selectedBaud);
          if (res?.success) {
            setIsConnected(true);
            onConnectionChange?.(true);
            term.writeln(`\x1b[32m[Connected] Serial link active on ${selectedPort}.\x1b[0m\n`);
          } else {
            term.writeln(`\x1b[31m[Error] Failed to open ${selectedPort}.\x1b[0m\n`);
          }
        } catch (err: any) {
          term.writeln(`\x1b[31m[Error] ${err?.message || 'Connection failed'}\x1b[0m\n`);
        }
      }
    }
  };

  const refreshPortsRef = useRef(refreshPorts)
  const toggleConnectionRef = useRef(handleToggleConnect)
  refreshPortsRef.current = refreshPorts
  toggleConnectionRef.current = handleToggleConnect

  useEffect(() => {
    const refresh = () => { void refreshPortsRef.current(); };
    const toggle = () => { void toggleConnectionRef.current(); };
    window.addEventListener('cavallo:refresh-ports', refresh);
    window.addEventListener('cavallo:toggle-serial', toggle);
    return () => {
      window.removeEventListener('cavallo:refresh-ports', refresh);
      window.removeEventListener('cavallo:toggle-serial', toggle);
    };
  }, []);

  const changeSerialConfiguration = async (port: string, baud: number) => {
    setSelectedPort(port);
    setSelectedBaud(baud);
    onPortSelect?.(port);
    onBaudSelect?.(baud);
    if (!isConnected) return;
    try {
      await (window as any).cavallo.disconnectSerial();
      const result = await (window as any).cavallo.connectSerial(port, baud);
      if (!result?.success) throw new Error('Serial reconnect failed.');
      xtermRef.current?.writeln(`\r\n\x1b[32m[Reconnected] ${port} @ ${baud} baud.\x1b[0m`);
    } catch (error: any) {
      setIsConnected(false);
      onConnectionChange?.(false);
      xtermRef.current?.writeln(`\r\n\x1b[31m[Reconnect error] ${error?.message || error}\x1b[0m`);
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
            void changeSerialConfiguration(e.target.value, selectedBaud);
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
            void changeSerialConfiguration(selectedPort, b);
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
      <div ref={termRef} style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', padding: '4px' }} />
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

