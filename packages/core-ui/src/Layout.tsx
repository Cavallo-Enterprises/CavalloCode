import React, { useState } from 'react';

type Theme = 'vs-dark' | 'vs' | 'hc-black';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const DEMO_FILES: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'main.cpp', type: 'file' },
      { name: 'config.h', type: 'file' },
    ],
  },
  { name: 'platformio.ini', type: 'file' },
  { name: 'README.md', type: 'file' },
];

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, depth }) => {
  const [open, setOpen] = useState(true);
  const isFolder = node.type === 'folder';

  return (
    <div>
      <div
        onClick={() => isFolder && setOpen(!open)}
        style={{
          padding: `2px 0 2px ${8 + depth * 12}px`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          color: '#ccc',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = '#2a2d2e')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent')}
      >
        <span style={{ color: isFolder ? '#dcdc96' : '#9cdcfe' }}>
          {isFolder ? (open ? '▾' : '▸') : '  '}
        </span>
        <span style={{ color: isFolder ? '#dcdc96' : '#9cdcfe' }}>
          {isFolder ? '📁' : getFileIcon(node.name)}
        </span>
        {node.name}
      </div>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeNode key={child.name} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

function getFileIcon(name: string): string {
  if (name.endsWith('.cpp') || name.endsWith('.c') || name.endsWith('.h')) return '🔷';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.ini') || name.endsWith('.json')) return '⚙️';
  return '📄';
}

interface LayoutProps {
  children: React.ReactNode;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

const MENU_ITEMS = ['File', 'Edit', 'Selection', 'View', 'Hardware', 'Tools', 'Help'];

export const Layout: React.FC<LayoutProps> = ({ children, theme, onThemeChange }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [board, setBoard] = useState('ESP32 Dev Module');
  const [port, setPort] = useState('COM3');
  const [baud, setBaud] = useState('115200');

  const isDark = theme !== 'vs';
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const menuBg = isDark ? '#3c3c3c' : '#dddddd';
  const sidebarBg = isDark ? '#252526' : '#f3f3f3';
  const borderColor = isDark ? '#3c3c3c' : '#cccccc';
  const textColor = isDark ? '#cccccc' : '#333333';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: bg, color: textColor, fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>

      {/* ── TOP MENU BAR ── */}
      <div style={{ height: 30, background: menuBg, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flexShrink: 0, borderBottom: `1px solid ${borderColor}` }}>
        {/* App Icon */}
        <img
          src="cavallocode.png"
          alt="CavalloCode"
          style={{ height: 18, width: 18, marginRight: 6, objectFit: 'contain' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {MENU_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => setActiveMenu(activeMenu === item ? null : item)}
            style={{
              background: activeMenu === item ? (isDark ? '#094771' : '#c2d5f5') : 'transparent',
              color: textColor,
              border: 'none',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: 12,
              borderRadius: 2,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 220, background: sidebarBg, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Sidebar header */}
          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 'bold', color: isDark ? '#bbb' : '#555', letterSpacing: 1, textTransform: 'uppercase' }}>
            Explorer
          </div>
          {/* Cavallo Logo */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 8px', borderBottom: `1px solid ${borderColor}` }}>
            <img
              src="cavallologo.png"
              alt="Cavallo"
              style={{ height: 22, objectFit: 'contain', opacity: 0.8 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          {/* File Tree */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {DEMO_FILES.map((node) => (
              <FileTreeNode key={node.name} node={node} depth={0} />
            ))}
          </div>
        </div>

        {/* ── EDITOR + TERMINAL AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        height: 22,
        background: '#007acc',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: 12,
        gap: 16,
        flexShrink: 0,
      }}>
        <span>🔌 {board}</span>
        <span>📡 {port}</span>
        <span>⚡ {baud} baud</span>
        <div style={{ flex: 1 }} />
        <span style={{ opacity: 0.8 }}>CavalloCode v1.0.0 — Cavallo-Enterprises</span>
        <span style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => onThemeChange(isDark ? 'vs' : 'vs-dark')}>
          {isDark ? '☀ Light' : '🌙 Dark'}
        </span>
      </div>
    </div>
  );
};

export default Layout;

