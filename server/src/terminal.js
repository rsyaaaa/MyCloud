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

// Persistent PTY sessions map (persists across client navigation, page reloads, and logouts)
const sessions = new Map();

function getOrCreateSession(user) {
  const sessionId = user.id;
  let session = sessions.get(sessionId);

  if (session && session.ptyProcess && !session.isDead) {
    return session;
  }

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
        USER: user.username || 'autofocusxioo'
      }
    });
  } catch (err) {
    console.error('[Terminal] Failed to spawn PTY:', err);
    throw err;
  }

  session = {
    id: sessionId,
    username: user.username,
    ptyProcess,
    buffer: '',
    maxBufferSize: 300 * 1024, // 300 KB scrollback buffer
    attachedSockets: new Set(),
    cols: 80,
    rows: 24,
    isDead: false,
    createdAt: Date.now(),
    lastActive: Date.now()
  };

  ptyProcess.onData((data) => {
    session.lastActive = Date.now();
    session.buffer += data;
    if (session.buffer.length > session.maxBufferSize) {
      session.buffer = session.buffer.slice(session.buffer.length - session.maxBufferSize);
    }

    // Broadcast output to all currently attached WebSockets for this admin
    for (const ws of session.attachedSockets) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(data);
        } catch (e) {}
      }
    }
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`[Terminal] PTY process exited with code ${exitCode}, signal ${signal}`);
    session.isDead = true;
    for (const ws of session.attachedSockets) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(`\r\n\x1b[33m[Session Closed] Process exited with code ${exitCode}\x1b[0m\r\n`);
        } catch (e) {}
      }
    }
    sessions.delete(sessionId);
  });

  sessions.set(sessionId, session);
  return session;
}

function resetSession(user) {
  const sessionId = user.id;
  const session = sessions.get(sessionId);
  if (session) {
    try {
      session.ptyProcess.kill();
    } catch (e) {}
    sessions.delete(sessionId);
  }
  return getOrCreateSession(user);
}

function setupTerminalWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname !== '/ws/terminal') {
      return;
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
    console.log(`[Terminal] Admin ${user.username} connected to persistent PTY session.`);

    let session;
    try {
      session = getOrCreateSession(user);
    } catch (err) {
      ws.send(`\r\n\x1b[31m[MyCloud Error] Gagal membuka shell terminal: ${err.message}\x1b[0m\r\n`);
      ws.close();
      return;
    }

    session.attachedSockets.add(ws);

    // Replay persistent scrollback history buffer to the client
    if (session.buffer) {
      ws.send(session.buffer);
    }

    // WebSocket -> PTY
    ws.on('message', (message) => {
      try {
        const text = message.toString();

        // Check if message is a JSON resize, ping, or reset event
        if (text.startsWith('{') && text.endsWith('}')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
              session.cols = Math.max(10, parsed.cols);
              session.rows = Math.max(5, parsed.rows);
              session.ptyProcess.resize(session.cols, session.rows);
              return;
            }
            if (parsed.type === 'reset') {
              console.log(`[Terminal] User requested explicit session reset`);
              session.attachedSockets.delete(ws);
              const freshSession = resetSession(user);
              freshSession.attachedSockets.add(ws);
              session = freshSession;
              ws.send(`\r\n\x1b[32m[Terminal Session Reset - Fresh Shell Started]\x1b[0m\r\n`);
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

        session.ptyProcess.write(text);
      } catch (err) {
        console.error('[Terminal] Write error:', err);
      }
    });

    const detach = () => {
      session.attachedSockets.delete(ws);
      console.log(`[Terminal] Client detached. Active connections: ${session.attachedSockets.size}. Shell remains alive in background.`);
    };

    ws.on('close', detach);
    ws.on('error', (err) => {
      console.warn('[Terminal] WebSocket error:', err.message);
      detach();
    });
  });

  return wss;
}

module.exports = { setupTerminalWebSocket };
