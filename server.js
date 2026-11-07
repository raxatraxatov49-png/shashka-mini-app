
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const G = require('./lib/game');
const { verifyInitData } = require('./lib/telegram');

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV = process.env.DEV === '1';
const GRACE = Number(process.env.GRACE_SECONDS) || 30;
const PUBLIC = path.join(__dirname, 'public');
const INVITE_TTL = 10 * 60 * 1000;

const WEBHOOK_URL = 'https://shashka-mini-app.onrender.com/telegram-webhook';

const WEBHOOK_SECRET = crypto
  .createHash('sha256')
  .update(BOT_TOKEN)
  .digest('hex')
  .slice(0, 32);

if (!BOT_TOKEN && !DEV) {
  console.error('BOT_TOKEN o‘rnatilmagan. Telegram bot tokenini BOT_TOKEN muhit o‘zgaruvchisiga yozing.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

async function telegramApi(method, data) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description || 'Telegram API error');
  }

  return result;
}

async function handleTelegramWebhook(req, res) {
  if (
    req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET
  ) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    let body = '';

    for await (const chunk of req) {
      body += chunk;

      if (body.length > 1024 * 1024) {
        res.writeHead(413);
        return res.end('Too large');
      }
    }

    const update = JSON.parse(body);
    const message = update.message;

    if (
      message &&
      typeof message.text === 'string' &&
      /^\/start(?:@\w+)?(?:\s|$)/.test(message.text)
    ) {
      await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text: '♟ Қош келдіңіз!\n\nШашка ойынын бастаңыз және қарсыластарыңызды жеңіңіз! 🎮',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'БАСТАУ',
                web_app: {
                  url: 'https://shashka-mini-app.onrender.com'
                }
              }
            ]
          ]
        }
      });
    }

    res.writeHead(200);
    res.end('ok');
  } catch (error) {
    console.error('Telegram webhook error:', error.message);
    res.writeHead(200);
    res.end('ok');
  }
}

async function setupTelegramWebhook() {
  if (!BOT_TOKEN || DEV) return;

  try {
    const result = await telegramApi('setWebhook', {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message']
    });

    console.log('Telegram webhook:', result.description);
  } catch (error) {
    console.error('Webhook setup error:', error.message);
  }
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method === 'POST' && url === '/telegram-webhook') {
    return handleTelegramWebhook(req, res);
  }

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);

  if (!file.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 4096
});

const users = new Map();
const games = new Map();
const invites = new Map();
const userInvites = new Map();

let queue = [];
let gameSeq = 0;

const send = (u, msg) => {
  if (u && u.ws && u.ws.readyState === 1) {
    u.ws.send(JSON.stringify(msg));
  }
};

const pub = (u) => ({
  name: u.name,
  avatar: u.avatar
});

const legalList = (g, side) =>
  g.st.turn === side && !g.st.over
    ? G.legalMoves(g.st).map(({ from, to, cap }) => ({ from, to, cap }))
    : [];

const sideOfUser = (g, id) =>
  g.p.w === id ? 'w' : 'b';

function gameState(g, uid) {
  const you = sideOfUser(g, uid);

  return {
    t: 'game',
    id: g.id,
    you,
    players: {
      w: pub(users.get(g.p.w)),
      b: pub(users.get(g.p.b))
    },
    board: G.view(g.st),
    turn: g.st.turn,
    legal: legalList(g, you),
    score: g.st.score,
    chainPos: g.st.chain ? g.st.chain.pos : null,
    chat: g.chat
  };
}

function dequeue(id) {
  queue = queue.filter((x) => x !== id);
}

function removeInvite(code) {
  const invite = invites.get(code);
  if (!invite) return;

  clearTimeout(invite.timer);
  invites.delete(code);

  if (userInvites.get(invite.ownerId) === code) {
    userInvites.delete(invite.ownerId);
  }
}

function removeUserInvite(userId) {
  const code = userInvites.get(userId);
  if (code) removeInvite(code);
}

function startGame(a, b) {
  dequeue(a.id);
  dequeue(b.id);

  removeUserInvite(a.id);
  removeUserInvite(b.id);

  const [w, bl] = Math.random() < 0.5
    ? [a, b]
    : [b, a];

  const g = {
    id: 'g' + ++gameSeq,
    p: { w: w.id, b: bl.id },
    st: G.newGame(),
    chat: [],
    timers: {},
    lastChat: {}
  };

  games.set(g.id, g);
  a.game = b.game = g.id;

  send(a, gameState(g, a.id));
  send(b, gameState(g, b.id));
}

function finish(g, winner, reason) {
  if (!games.has(g.id)) return;

  games.delete(g.id);
  Object.values(g.timers).forEach(clearTimeout);

  for (const id of [g.p.w, g.p.b]) {
    const u = users.get(id);

    if (u) {
      u.game = null;
      send(u, {
        t: 'over',
        result: winner || 'draw',
        reason,
        score: g.st.score
      });
    }
  }
}

function createInvite(u) {
  if (u.game && games.has(u.game)) {
    return send(u, { t: 'error', code: 'busy' });
  }

  const existing = userInvites.get(u.id);

  if (existing && invites.has(existing)) {
    return send(u, {
      t: 'invite_created',
      code: existing,
      expiresIn: INVITE_TTL / 1000
    });
  }

  removeUserInvite(u.id);
  dequeue(u.id);

  const code = crypto.randomBytes(6).toString('hex');

  const invite = {
    ownerId: u.id,
    timer: null
  };

  invite.timer = setTimeout(() => {
    removeInvite(code);
    send(users.get(u.id), {
      t: 'invite_expired',
      code
    });
  }, INVITE_TTL);

  if (invite.timer.unref) invite.timer.unref();

  invites.set(code, invite);
  userInvites.set(u.id, code);

  send(u, {
    t: 'invite_created',
    code,
    expiresIn: INVITE_TTL / 1000
  });
}

function joinInvite(u, code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{12}$/.test(code)) {
    return send(u, { t: 'error', code: 'invite_invalid' });
  }

  if (u.game && games.has(u.game)) {
    return send(u, { t: 'error', code: 'busy' });
  }

  const invite = invites.get(code);

  if (!invite) {
    return send(u, { t: 'error', code: 'invite_expired' });
  }

  if (invite.ownerId === u.id) {
    return send(u, { t: 'error', code: 'invite_self' });
  }

  const owner = users.get(invite.ownerId);

  if (!owner || !owner.ws || owner.ws.readyState !== 1) {
    removeInvite(code);
    return send(u, { t: 'error', code: 'invite_expired' });
  }

  if (owner.game && games.has(owner.game)) {
    removeInvite(code);
    return send(u, { t: 'error', code: 'busy' });
  }

  removeInvite(code);
  dequeue(u.id);

  send(owner, { t: 'invite_joined' });
  startGame(owner, u);
}

function handle(u, m) {
  switch (m.t) {
    case 'find': {
      if (u.game && games.has(u.game)) {
        return send(u, gameState(games.get(u.game), u.id));
      }

      if (queue.includes(u.id)) {
        return send(u, { t: 'searching' });
      }

      queue = queue.filter((id) => {
        const user = users.get(id);
        return user && user.ws && !user.game;
      });

      const oppId = queue.shift();

      if (oppId) {
        const opp = users.get(oppId);
        if (opp && !opp.game) return startGame(opp, u);
      }

      queue.push(u.id);
      return send(u, { t: 'searching' });
    }

    case 'cancel':
      dequeue(u.id);
      return send(u, { t: 'idle' });

    case 'invite_create':
      return createInvite(u);

    case 'invite_join':
      return joinInvite(u, m.code);

    case 'invite_cancel':
      removeUserInvite(u.id);
      return send(u, { t: 'invite_cancelled' });

    case 'move': {
      const g = games.get(u.game);

      if (!g || !Number.isInteger(m.from) || !Number.isInteger(m.to)) {
        return;
      }

      const side = sideOfUser(g, u.id);

      if (g.st.turn !== side) {
        return send(u, gameState(g, u.id));
      }

      const step = G.applyMove(g.st, m.from, m.to);

      if (!step) {
        return send(u, gameState(g, u.id));
      }

      const base = {
        t: 'move',
        step,
        turn: g.st.turn,
        score: g.st.score,
        board: G.view(g.st),
        chainPos: g.st.chain ? g.st.chain.pos : null
      };

      for (const id of [g.p.w, g.p.b]) {
        send(users.get(id), {
          ...base,
          legal: legalList(g, sideOfUser(g, id))
        });
      }

      if (g.st.over) {
        finish(g, g.st.over.winner, g.st.over.reason);
      }

      return;
    }

    case 'resign': {
      const g = games.get(u.game);

      if (g) {
        finish(g, G.other(sideOfUser(g, u.id)), 'resign');
      }

      return;
    }

    case 'chat': {
      const g = games.get(u.game);

      if (!g || typeof m.text !== 'string') return;

      const text = m.text.trim().slice(0, 300);
      const now = Date.now();

      if (!text || now - (g.lastChat[u.id] || 0) < 400) {
        return;
      }

      g.lastChat[u.id] = now;

      const msg = {
        t: 'chat',
        from: sideOfUser(g, u.id),
        name: u.name,
        text,
        ts: now
      };

      g.chat.push(msg);
      if (g.chat.length > 100) g.chat.shift();

      for (const id of [g.p.w, g.p.b]) {
        send(users.get(id), msg);
      }

      return;
    }
  }
}

function onAuth(ws, m) {
  let info = null;

  if (DEV && m.dev && m.dev.id) {
    info = {
      id: 'dev' + String(m.dev.id).slice(0, 20),
      name: String(m.dev.name || 'Dev').slice(0, 40),
      avatar: null
    };
  } else {
    info = verifyInitData(m.initData, BOT_TOKEN);
  }

  if (!info) {
    ws.send(JSON.stringify({ t: 'error', code: 'auth' }));
    return ws.close();
  }

  let u = users.get(info.id);

  if (u && u.ws && u.ws !== ws) {
    send(u, { t: 'replaced' });
    u.ws.close();
  }

  if (!u) {
    u = { id: info.id, game: null };
    users.set(info.id, u);
  }

  Object.assign(u, info, { ws });
  ws.user = u;

  send(u, { t: 'hello', me: pub(u) });

  const g = u.game && games.get(u.game);

  if (g) {
    clearTimeout(g.timers[u.id]);
    delete g.timers[u.id];

    send(u, gameState(g, u.id));

    const opp = users.get(g.p[G.other(sideOfUser(g, u.id))]);

    send(opp, { t: 'away', left: false });

    if (g.timers[opp.id]) {
      send(u, { t: 'away', left: true, seconds: GRACE });
    }
  } else {
    u.game = null;
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const authTimer = setTimeout(() => {
    if (!ws.user) ws.close();
  }, 10000);

  ws.on('message', (raw) => {
    let m;

    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }

    if (!m || typeof m.t !== 'string') return;

    if (!ws.user) {
      return m.t === 'auth' ? onAuth(ws, m) : undefined;
    }

    if (ws.user.ws !== ws) return;

    handle(ws.user, m);
  });

  ws.on('close', () => {
    clearTimeout(authTimer);

    const u = ws.user;

    if (!u || u.ws !== ws) return;

    u.ws = null;
    dequeue(u.id);
    removeUserInvite(u.id);

    const g = u.game && games.get(u.game);

    if (!g) return;

    const side = sideOfUser(g, u.id);

    send(users.get(g.p[G.other(side)]), {
      t: 'away',
      left: true,
      seconds: GRACE
    });

    g.timers[u.id] = setTimeout(() => {
      finish(g, G.other(side), 'left');
    }, GRACE * 1000);
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 15000).unref();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Shashka server: http://localhost:${PORT}${DEV ? '  (DEV rejim)' : ''}`);
    setupTelegramWebhook();
  });
}

module.exports = {
  server,
  games,
  users,
  invites
};
