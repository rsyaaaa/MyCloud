const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');

function parseCookie(cookieStr) {
  const list = {};
  if (!cookieStr) return list;
  cookieStr.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function setupTerminalWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname !== '/ws/terminal') {
      return; // Let other potential handlers manage or ignore
    }

    try {
      // 1. Authenticate user from cookie or query token
      const cookies = parseCookie(request.headers.cookie);
      let token = cookies.token;

      if (!token && request.url.includes('token=')) {
        const urlParams = new URL(request.url, `http://${request.headers.host}`);
        token = urlParams.searchParams.get('token');
      }

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);

      if (!user || user.role !== 'admin') {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // 2. Complete WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, user);
      });
    } catch (err) {
      console.error('[Terminal WS Upgrade Error]:', err.message);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request, user) => {
    console.log(`[Terminal] New bash PTY session opened by admin: ${user.username}`);

    const shell = process.env.SHELL || '/bin/bash';
    const workingDir = process.env.HOME || '/home/autofocusxioo';

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          USER: 'autofocusxioo'
        }
      });
    } catch (err) {
      console.error('[Terminal] Failed to spawn PTY:', err);
      ws.send(`\r\n\x1b[31m[MyCloud Error] Gagal membuka shell terminal: ${err.message}\x1b[0m\r\n`);
      ws.close();
      return;
    }

    // PTY -> WebSocket
    ptyProcess.onData((data) => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      } catch (e) {}
    });

    // WebSocket -> PTY
    ws.on('message', (message) => {
      try {
        const text = message.toString();

        // Check if message is a JSON resize or ping event
        if (text.startsWith('{') && text.endsWith('}')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
              ptyProcess.resize(Math.max(10, parsed.cols), Math.max(5, parsed.rows));
              return;
            }
            if (parsed.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
              return;
            }
          } catch (e) {
            // Not JSON or parse failed, treat as raw input
          }
        }

        ptyProcess.write(text);
      } catch (err) {
        console.error('[Terminal] Write error:', err);
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(`\r\n\x1b[33m[Session Closed] Process exited with code ${exitCode}\x1b[0m\r\n`);
          ws.close();
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      console.log(`[Terminal] Session closed by client for user: ${user.username}`);
      try {
        ptyProcess.kill();
      } catch (e) {}
    });

    ws.on('error', (err) => {
      console.warn('[Terminal] WebSocket error:', err.message);
      try {
        ptyProcess.kill();
      } catch (e) {}
    });
  });

  return wss;
}

module.exports = { setupTerminalWebSocket };

