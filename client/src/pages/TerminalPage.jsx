import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon, RefreshCw, Maximize2, Minimize2,
  Trash2, ShieldCheck, Wifi, ArrowUp, ArrowDown, CornerDownLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TerminalPage() {
  const { user } = useAuth();
  const terminalRef = useRef(null);
  const xtermInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);

  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initTerminal = () => {
    if (!terminalRef.current) return;

    // Clean up old instance if exists
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.dispose();
      xtermInstanceRef.current = null;
    }

    setStatus('connecting');

    // Create xterm instance with Genesis dark theme
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: window.innerWidth < 640 ? 12 : 14,
      lineHeight: 1.25,
      theme: {
        background: '#000000',
        foreground: '#FAFAFA',
        cursor: '#C2410C',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(194, 65, 12, 0.40)',
        black: '#0A0A0A',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#E5E7EB',
        brightBlack: '#52525B',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FDE047',
        brightBlue: '#60A5FA',
        brightMagenta: '#C084FC',
        brightCyan: '#67E8F9',
        brightWhite: '#FFFFFF'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to backend WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Send initial terminal dimensions
      const dims = { type: 'resize', cols: term.cols, rows: term.rows };
      ws.send(JSON.stringify(dims));
      term.focus();
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    ws.onerror = (err) => {
      console.warn('Terminal WS error:', err);
      setStatus('disconnected');
    };

    // User typing in terminal -> send to WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle container resize
    const handleResize = () => {
      try {
        if (fitAddonRef.current && xtermInstanceRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          fitAddonRef.current.fit();
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: xtermInstanceRef.current.cols,
            rows: xtermInstanceRef.current.rows
          }));
        }
      } catch (e) {}
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  useEffect(() => {
    const cleanup = initTerminal();
    return () => {
      if (cleanup) cleanup();
      if (wsRef.current) wsRef.current.close();
      if (xtermInstanceRef.current) xtermInstanceRef.current.dispose();
    };
  }, []);

  // Fit again when fullscreen toggles
  useEffect(() => {
    setTimeout(() => {
      if (fitAddonRef.current && xtermInstanceRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        fitAddonRef.current.fit();
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: xtermInstanceRef.current.cols,
          rows: xtermInstanceRef.current.rows
        }));
      }
    }, 150);
  }, [isFullscreen]);

  const sendQuickCommand = (cmd) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\n');
      if (xtermInstanceRef.current) xtermInstanceRef.current.focus();
    }
  };

  const sendKey = (keySequence) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(keySequence);
      if (xtermInstanceRef.current) xtermInstanceRef.current.focus();
    }
  };

  const handleClear = () => {
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.clear();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('\x0c'); // Send Ctrl+L
      }
      xtermInstanceRef.current.focus();
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-[#EF4444]">
        Akses ditolak. Terminal hanya dapat diakses oleh Administrator.
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 mx-auto animate-enter transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-[#000000] p-3' : 'max-w-7xl'}`}>
      <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] bg-[#000000] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[16px] overflow-hidden shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0A0A0E] border-b border-[#1F1F27] gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/30 shadow-sm">
              <TerminalIcon className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-[15px] text-white">
                  Server Terminal
                </span>
                <span className="text-[11px] font-mono text-[#9C9C9C] hidden sm:inline">
                  autofocus-server (bash)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {status === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    Terhubung (Active PTY)
                  </span>
                )}
                {status === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F59E0B]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                    Menghubungkan...
                  </span>
                )}
                {status === 'disconnected' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#EF4444]">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                    Terputus
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-[6px] text-[12px] font-medium text-[#9C9C9C] hover:text-white bg-[#14141A] hover:bg-[#1F1F27] border border-[#272733] transition-colors flex items-center gap-1.5"
              title="Bersihkan layar (Ctrl+L)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={initTerminal}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-[6px] text-[12px] font-medium text-[#9C9C9C] hover:text-white bg-[#14141A] hover:bg-[#1F1F27] border border-[#272733] transition-colors flex items-center gap-1.5"
              title="Mulai ulang sesi terminal"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-[6px] text-[12px] font-medium text-[#9C9C9C] hover:text-white bg-[#14141A] hover:bg-[#1F1F27] border border-[#272733] transition-colors flex items-center gap-1.5"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick Commands Bar (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[#050508] border-b border-[#1A1A22] text-[11px] overflow-x-auto scrollbar-none">
          <span className="text-[#6B6B6B] font-mono mr-1">Quick:</span>
          {[
            { label: 'df -h', cmd: 'df -h' },
            { label: 'free -h', cmd: 'free -h' },
            { label: 'htop', cmd: 'htop' },
            { label: 'docker ps', cmd: 'docker ps' },
            { label: 'mycloud status', cmd: 'systemctl --user status mycloud.service' },
            { label: 'top', cmd: 'top' },
            { label: 'ls -la', cmd: 'ls -la' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => sendQuickCommand(item.cmd)}
              className="px-2 py-0.5 rounded-[4px] bg-[#121218] hover:bg-[#C2410C] text-[#A1A1AA] hover:text-white font-mono border border-[#1F1F27] hover:border-[#C2410C] transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Terminal Screen Container */}
        <div
          ref={terminalRef}
          className="flex-1 w-full p-3 overflow-hidden bg-black cursor-text"
          onClick={() => xtermInstanceRef.current?.focus()}
        />

        {/* Mobile Keyboard Helpers Bar (Crucial for smartphone management) */}
        <div className="flex sm:hidden items-center justify-between px-2 py-1.5 bg-[#0A0A0E] border-t border-[#1F1F27] text-[11px] font-mono gap-1 overflow-x-auto">
          <button
            onClick={() => sendKey('\t')}
            className="px-2 py-1 bg-[#1A1A22] active:bg-[#C2410C] text-[#FAFAFA] rounded border border-[#2A2A35]"
          >
            Tab
          </button>
          <button
            onClick={() => sendKey('\x03')}
            className="px-2 py-1 bg-[#1A1A22] active:bg-[#EF4444] text-[#FAFAFA] rounded border border-[#2A2A35]"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => sendKey('\x1b')}
            className="px-2 py-1 bg-[#1A1A22] active:bg-[#C2410C] text-[#FAFAFA] rounded border border-[#2A2A35]"
          >
            Esc
          </button>
          <button
            onClick={() => sendKey('\x1b[A')}
            className="px-2.5 py-1 bg-[#1A1A22] active:bg-[#C2410C] text-[#FAFAFA] rounded border border-[#2A2A35]"
            title="Up Arrow"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => sendKey('\x1b[B')}
            className="px-2.5 py-1 bg-[#1A1A22] active:bg-[#C2410C] text-[#FAFAFA] rounded border border-[#2A2A35]"
            title="Down Arrow"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => sendKey('\r')}
            className="px-2.5 py-1 bg-[#C2410C] text-white rounded font-bold"
            title="Enter"
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

