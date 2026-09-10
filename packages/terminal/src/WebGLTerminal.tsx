import React, { useEffect, useRef } from 'react';
// import { Terminal } from 'xterm';
// import { WebglAddon } from 'xterm-addon-webgl';
// import 'xterm/css/xterm.css';

export const WebGLTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#1e1e1e' }
    });
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
      
      term.writeln('CavalloCode Serial Monitor Initialized...');
    }
    
    return () => term.dispose();
    */
  }, []);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
};
