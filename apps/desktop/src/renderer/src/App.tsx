import React, { useState } from 'react';
import { Layout, CavalloMonacoEditor } from 'core-ui/src/index';
import { WebGLTerminal } from 'terminal/src/index';

type Theme = 'vs-dark' | 'vs' | 'hc-black';

function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>('vs-dark');
  const [terminalHeight, setTerminalHeight] = useState(220);

  return (
    <Layout theme={theme} onThemeChange={setTheme}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Monaco Editor — takes all remaining space */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CavalloMonacoEditor theme={theme} onThemeChange={setTheme} />
        </div>

        {/* Resize handle */}
        <div
          style={{
            height: 4,
            background: '#007acc',
            cursor: 'ns-resize',
            flexShrink: 0,
            opacity: 0.6,
          }}
          onMouseDown={(e) => {
            const startY = e.clientY;
            const startH = terminalHeight;
            const onMove = (ev: MouseEvent) => {
              const delta = startY - ev.clientY;
              setTerminalHeight(Math.max(80, Math.min(600, startH + delta)));
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />

        {/* WebGL Serial Terminal — resizable */}
        <div style={{ height: terminalHeight, flexShrink: 0, borderTop: '1px solid #3c3c3c' }}>
          <WebGLTerminal />
        </div>
      </div>
    </Layout>
  );
}

export default App;

