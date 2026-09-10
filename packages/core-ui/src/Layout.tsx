import React from 'react';

export const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#252526', color: '#cccccc' }}>
      {/* Top Menu Bar */}
      <div style={{ height: '30px', backgroundColor: '#333333', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '12px' }}>
        <img src="cavallocode.png" alt="Logo" style={{ height: '16px', marginRight: '10px' }} />
        <span>File</span> <span style={{ marginLeft: '10px' }}>Edit</span> <span style={{ marginLeft: '10px' }}>Hardware</span>
      </div>
      
      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '250px', backgroundColor: '#252526', borderRight: '1px solid #3c3c3c', padding: '10px' }}>
          EXPLORER
        </div>
        
        {/* Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          
          {/* Bottom Panel (Terminal) */}
          <div style={{ height: '200px', backgroundColor: '#1e1e1e', borderTop: '1px solid #3c3c3c', padding: '10px' }}>
            TERMINAL
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div style={{ height: '22px', backgroundColor: '#007acc', color: 'white', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '12px' }}>
        <span>esp32</span> <span style={{ marginLeft: '10px' }}>COM3</span> <span style={{ marginLeft: '10px' }}>115200</span>
      </div>
    </div>
  );
};
