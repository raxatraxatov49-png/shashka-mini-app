
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
const GROUP_TTL = 10 * 60 * 1000;

const WEBHOOK_URL = 'https://shashka-mini-app.onrender.com/telegram-webhook';
const MINI_APP_LINK = 'https://t.me/shashkaoyinibot?startapp=';

const WEBHOOK_SECRET = crypto
  .createHash('sha256')
  .update(BOT_TOKEN)
  .digest('hex')
  .slice(0, 32);

if (!BOT_TOKEN && !DEV) {
  console.error('BOT_TOKEN o‘rnatilmagan.');
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

/* ---------- Umumiy yordamchi funksiyalar ---------- */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function playerName(player) {
  if (!player) return 'Ойыншы';

  if (player.username) {
    return '@' + player.username;
  }

  return [
    player.first_name,
    player.last_name
  ].filter(Boolean).join(' ') || player.name || 'Ойыншы';
}

function playerLink(player) {
  if (!player || !player.id) {
    return 'Ойыншы';
  }

  return `<a href="tg://user?id=${encodeURIComponent(String(player.id))}">${escapeHtml(playerName(player))}</a>`;
}

function createGroupToken(room, player) {
  const userId = String(player.id);

  let token = room.tokens.get(userId);

  if (token) return token;

  token = crypto.randomBytes(16).toString('hex');

  room.tokens.set(userId, token);

  groupTokens.set(token, {
    code: room.code,
    userId
  });

  return token;
}

/* ---------- Guruh o‘yinlari ---------- */

const groupRooms = new Map();
const groupTokens = new Map();
const groupPlayerRooms = new Map();

function roomText(room) {
  let text = '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n';

  room.players.forEach((player, index) => {
    const id = String(player.id);
    const entered = room.entered.has(id);

    text += `${index + 1}. ${playerLink(player)}${entered ? ' ✅' : ''}\n`;
  });

  if (room.players.length < 2) {
    text += '\nЕкінші ойыншыны күтеміз...';
  } else if (!room.started) {
    text += '\n\n🎮 Екі ойыншы да өз батырмасын басып, ойынға кірсін.';
    text += '\nБірінші кірген ойыншы тақтаны бірден көреді.';
  } else {
    text += '\n\n♟️ Ойын басталды! Сәттілік!';
  }

  return text;
}

function roomKeyboard(room) {
  if (room.players.length < 2) {
    return {
      inline_keyboard: [[
        {
          text: '♟️ ҚОСЫЛУ',
          callback_data: 'gj:' + room.code
        }
      ]]
    };
  }

  const rows = room.players.map((player, index) => {
    const token = createGroupToken(room, player);

    return [{
      text: `🎮 ${index + 1}-ОЙЫНШЫ — ОЙЫНҒА КІРУ`,
      url: MINI_APP_LINK + 'group_' + token
    }];
  });

  return {
    inline_keyboard: rows
  };
}

async function updateGroupRoom(room) {
  if (!room.messageId) return;

  await telegramApi('editMessageText', {
    chat_id: room.chatId,
    message_id: room.messageId,
    text: roomText(room),
    parse_mode: 'HTML',
    reply_markup: roomKeyboard(room)
  });
}

async function answerCallback(id, text, alert = false) {
  try {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: id,
      text,
      show_alert: alert
    });
  } catch (error) {
    console.error('Callback answer:', error.message);
  }
}

function cleanupGroupRoom(code) {
  const room = groupRooms.get(code);
  if (!room) return;

  clearTimeout(room.timer);

  if (room.pendingGame && games.has(room.pendingGame.id)) {
    games.delete(room.pendingGame.id);

    for (const id of [
      room.pendingGame.p.w,
      room.pendingGame.p.b
    ]) {
      const user = users.get(id);

      if (user && user.game === room.pendingGame.id) {
        user.game = null;
      }

      send(user, {
        t: 'group_error',
        code: 'expired'
      });
    }
  }

  for (const player of room.players) {
    const id = String(player.id);

    if (groupPlayerRooms.get(id) === code) {
      groupPlayerRooms.delete(id);
    }
  }

  for (const token of room.tokens.values()) {
    groupTokens.delete(token);
  }

  groupRooms.delete(code);
}

async function sendPlayerGroupLink(room, player) {
  const userId = String(player.id);
  const token = createGroupToken(room, player);

  try {
    await telegramApi('sendMessage', {
      chat_id: userId,
      text:
        '♟️ ШАШКА ОЙЫНЫ\n\n' +
        'Сіз топтық ойынға шақырылдыңыз!\n' +
        'Ойынға кіру үшін төмендегі батырманы басыңыз.',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🎮 ОЙЫНҒА КІРУ',
            url: MINI_APP_LINK + 'group_' + token
          }
        ]]
      }
    });

    room.entered.add(userId);
    return true;
  } catch (error) {
    console.error(
      'Private link error for ' + userId + ':',
      error.message
    );

    return false;
  }
}

async function sendLinksToBothPlayers(room) {
  if (room.players.length !== 2) return;

  await Promise.all(
    room.players.map(player =>
      sendPlayerGroupLink(room, player)
    )
  );

  try {
    await updateGroupRoom(room);
  } catch (error) {
    console.error('Lobby update:', error.message);
  }
}

async function handleGroupCallback(query) {
  const data = String(query.data || '');
  const from = query.from;
  const userId = String(from.id);

  const joinMatch = data.match(/^gj:([a-f0-9]{12})$/);

  if (!joinMatch) return false;

  const code = joinMatch[1];
  const room = groupRooms.get(code);

  if (!room || room.started) {
    await answerCallback(
      query.id,
      'Бұл ойынның уақыты аяқталған.',
      true
    );
    return true;
  }

  const already = room.players.some(
    player => String(player.id) === userId
  );

  if (already) {
    await answerCallback(
      query.id,
      'Сіз ойынға қосылдыңыз.'
    );
    return true;
  }

  if (room.players.length >= 2) {
    await answerCallback(
      query.id,
      'Ойыншылар толып кетті.',
      true
    );
    return true;
  }

  if (groupPlayerRooms.has(userId)) {
    await answerCallback(
      query.id,
      'Сіз басқа топтық ойынға қосылғансыз.',
      true
    );
    return true;
  }

  const player = {
    id: userId,
    username: from.username || '',
    first_name: from.first_name || '',
    last_name: from.last_name || ''
  };

  room.players.push(player);
  groupPlayerRooms.set(userId, code);

  await answerCallback(
    query.id,
    'Сіз ойынға қосылдыңыз!'
  );

  if (room.players.length === 2) {
    await sendLinksToBothPlayers(room);
  } else {
    try {
      await updateGroupRoom(room);
    } catch (error) {
      console.error('Lobby update:', error.message);
    }
  }

  return true;
}

/* ---------- Telegram webhook ---------- */

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

    if (update.callback_query) {
      await handleGroupCallback(update.callback_query);

      res.writeHead(200);
      return res.end('ok');
    }

    const message = update.message;

    if (!message || typeof message.text !== 'string') {
      res.writeHead(200);
      return res.end('ok');
    }

    if (
      /^\/game(?:@\w+)?(?:\s|$)/.test(message.text) &&
      ['group', 'supergroup'].includes(message.chat.type)
    ) {
      const code = crypto.randomBytes(6).toString('hex');

      const room = {
        code,
        chatId: message.chat.id,
        messageId: null,
        players: [],
        entered: new Set(),
        connected: new Set(),
        tokens: new Map(),
        pendingGame: null,
        started: false,
        timer: null
      };

      room.timer = setTimeout(() => {
        cleanupGroupRoom(code);
      }, GROUP_TTL);

      if (room.timer.unref) room.timer.unref();

      groupRooms.set(code, room);

      const sent = await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text: roomText(room),
        parse_mode: 'HTML',
        reply_markup: roomKeyboard(room)
      });

      room.messageId = sent.result.message_id;
    }

    if (
      /^\/start(?:@\w+)?(?:\s|$)/.test(message.text) &&
      message.chat.type === 'private'
    ) {
      await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text:
          '♟ Қош келдіңіз!\n\n' +
          'Шашка ойынын бастаңыз және қарсыластарыңызды жеңіңіз! 🎮',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'БАСТАУ',
              web_app: {
                url: 'https://shashka-mini-app.onrender.com'
              }
            }
          ]]
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
    await telegramApi('setMyCommands', {
      commands: [
        {
          command: 'game',
          description: 'Shashka o‘yinini yaratish'
        }
      ],
      scope: {
        type: 'all_group_chats'
      }
    });

    console.log('Telegram /game komandasi sozlandi');

    const result = await telegramApi('setWebhook', {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query']
    });

    console.log('Telegram webhook:', result.description);
  } catch (error) {
    console.error('Telegram setup error:', error.message);
  }
}

/* ---------- HTTP server ---------- */

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

/* ---------- WebSocket ---------- */

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
  name: u ? u.name : 'Ойыншы',
  avatar: u ? u.avatar : null
});

const legalList = (g, side) =>
  g.st.turn === side && !g.st.over && !g.waitingForOpponent
    ? G.legalMoves(g.st).map(({ from, to, cap }) => ({
        from,
        to,
        cap
      }))
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
    chat: g.chat,
    waitingForOpponent: Boolean(g.waitingForOpponent)
  };
}

function dequeue(id) {
  queue = queue.filter(x => x !== id);
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

/* ---------- O‘yinni boshlash ---------- */

function startGame(a, b, groupInfo = null) {
  dequeue(a.id);
  dequeue(b.id);

  removeUserInvite(a.id);
  removeUserInvite(b.id);

  const [w, bl] = Math.random() < 0.5
    ? [a, b]
    : [b, a];

  const g = {
    id: 'g' + ++gameSeq,
    p: {
      w: w.id,
      b: bl.id
    },
    st: G.newGame(),
    chat: [],
    timers: {},
    lastChat: {},
    groupInfo,
    waitingForOpponent: false
  };

  games.set(g.id, g);
  a.game = b.game = g.id;

  send(a, gameState(g, a.id));
  send(b, gameState(g, b.id));

  return g;
}

function ensureRoomUser(player) {
  const id = String(player.id);

  let u = users.get(id);

  if (!u) {
    const name = player.username
      ? '@' + player.username
      : [
          player.first_name,
          player.last_name
        ].filter(Boolean).join(' ') || 'Ойыншы';

    u = {
      id,
      name,
      avatar: null,
      game: null,
      ws: null
    };

    users.set(id, u);
  }

  return u;
}

function createPendingGroupGame(room) {
  const first = ensureRoomUser(room.players[0]);
  const second = ensureRoomUser(room.players[1]);

  dequeue(first.id);
  dequeue(second.id);

  removeUserInvite(first.id);
  removeUserInvite(second.id);

  const [w, bl] = Math.random() < 0.5
    ? [first, second]
    : [second, first];

  const g = {
    id: 'g' + ++gameSeq,
    p: {
      w: w.id,
      b: bl.id
    },
    st: G.newGame(),
    chat: [],
    timers: {},
    lastChat: {},
    groupInfo: {
      chatId: room.chatId,
      code: room.code
    },
    waitingForOpponent: true
  };

  games.set(g.id, g);

  first.game = g.id;
  second.game = g.id;

  room.pendingGame = g;

  return g;
}

/* ---------- O‘yinni tugatish ---------- */

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

  if (g.groupInfo) {
    const winnerId = winner === 'w'
      ? g.p.w
      : winner === 'b'
        ? g.p.b
        : null;

    const winnerUser = winnerId
      ? users.get(winnerId)
      : null;

    const resultText = winnerUser
      ? `🏆 ЖЕҢІМПАЗ: ${playerLink({
          id: winnerId,
          name: winnerUser.name,
          username: winnerUser.username || ''
        })}`
      : '🤝 Ойын тең аяқталды!';

    telegramApi('sendMessage', {
      chat_id: g.groupInfo.chatId,
      text:
        '♟️ <b>ШАШКА ОЙЫНЫ АЯҚТАЛДЫ!</b>\n\n' +
        resultText,
      parse_mode: 'HTML'
    }).catch(err => {
      console.error('Group result error:', err.message);
    });

    cleanupGroupRoom(g.groupInfo.code);
  }
}

/* ---------- Guruh Mini App ulanishi ---------- */

function joinGroupGame(u, token) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{32}$/.test(token)
  ) {
    return send(u, {
      t: 'group_error',
      code: 'invalid'
    });
  }

  const tokenInfo = groupTokens.get(token);

  if (!tokenInfo || tokenInfo.userId !== String(u.id)) {
    return send(u, {
      t: 'group_error',
      code: 'invalid'
    });
  }

  const room = groupRooms.get(tokenInfo.code);

  if (!room) {
    return send(u, {
      t: 'group_error',
      code: 'expired'
    });
  }

  if (room.started) {
    const existingGame = room.pendingGame;

    if (
      existingGame &&
      games.has(existingGame.id) &&
      (existingGame.p.w === u.id || existingGame.p.b === u.id)
    ) {
      return send(u, gameState(existingGame, u.id));
    }

    return send(u, {
      t: 'group_error',
      code: 'expired'
    });
  }

  if (room.players.length !== 2) {
    return send(u, {
      t: 'group_error',
      code: 'waiting'
    });
  }

  if (u.game && games.has(u.game)) {
    const existing = games.get(u.game);

    if (
      !existing.groupInfo ||
      existing.groupInfo.code !== room.code
    ) {
      return send(u, {
        t: 'group_error',
        code: 'busy'
      });
    }
  }

  room.connected.add(String(u.id));

  dequeue(u.id);
  removeUserInvite(u.id);

  let g = room.pendingGame;

  if (!g || !games.has(g.id)) {
    g = createPendingGroupGame(room);
  }

  const first = users.get(String(room.players[0].id));
  const second = users.get(String(room.players[1].id));

  const bothConnected =
    first && second &&
    first.ws && first.ws.readyState === 1 &&
    second.ws && second.ws.readyState === 1 &&
    room.connected.has(String(first.id)) &&
    room.connected.has(String(second.id));

  if (!bothConnected) {
    send(u, gameState(g, u.id));

    send(u, {
      t: 'group_waiting',
      count: room.connected.size,
      message: 'Екінші ойыншының кіруін күтіңіз...'
    });

    return;
  }

  room.started = true;
  g.waitingForOpponent = false;

  clearTimeout(room.timer);

  send(first, gameState(g, first.id));
  send(second, gameState(g, second.id));

  send(first, {
    t: 'group_started'
  });

  send(second, {
    t: 'group_started'
  });

  updateGroupRoom(room).catch(error => {
    console.error('Started lobby update:', error.message);
  });
}

/* ---------- Do‘st bilan o‘ynash ---------- */

function createInvite(u) {
  if (u.game && games.has(u.game)) {
    return send(u, {
      t: 'error',
      code: 'busy'
    });
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
  if (
    typeof code !== 'string' ||
    !/^[a-f0-9]{12}$/.test(code)
  ) {
    return send(u, {
      t: 'error',
      code: 'invite_invalid'
    });
  }

  if (u.game && games.has(u.game)) {
    return send(u, {
      t: 'error',
      code: 'busy'
    });
  }

  const invite = invites.get(code);

  if (!invite) {
    return send(u, {
      t: 'error',
      code: 'invite_expired'
    });
  }

  if (invite.ownerId === u.id) {
    return send(u, {
      t: 'error',
      code: 'invite_self'
    });
  }

  const owner = users.get(invite.ownerId);

  if (!owner || !owner.ws || owner.ws.readyState !== 1) {
    removeInvite(code);

    return send(u, {
      t: 'error',
      code: 'invite_expired'
    });
  }

  if (owner.game && games.has(owner.game)) {
    removeInvite(code);

    return send(u, {
      t: 'error',
      code: 'busy'
    });
  }

  removeInvite(code);
  dequeue(u.id);

  send(owner, {
    t: 'invite_joined'
  });

  startGame(owner, u);
}

/* ---------- Xabarlarni boshqarish ---------- */

function handle(u, m) {
  switch (m.t) {
    case 'group_join':
      return joinGroupGame(u, m.token || m.code);

    case 'find': {
      if (u.game && games.has(u.game)) {
        const current = games.get(u.game);

        return send(u, gameState(current, u.id));
      }

      if (queue.includes(u.id)) {
        return send(u, { t: 'searching' });
      }

      queue = queue.filter(id => {
        const user = users.get(id);
        return user && user.ws && !user.game;
      });

      const oppId = queue.shift();

      if (oppId) {
        const opp = users.get(oppId);

        if (opp && !opp.game) {
          return startGame(opp, u);
        }
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

      if (
        !g ||
        g.waitingForOpponent ||
        !Number.isInteger(m.from) ||
        !Number.isInteger(m.to)
      ) {
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

      if (g && !g.waitingForOpponent) {
        finish(
          g,
          G.other(sideOfUser(g, u.id)),
          'resign'
        );
      }

      return;
    }

    case 'chat': {
      const g = games.get(u.game);

      if (!g || g.waitingForOpponent || typeof m.text !== 'string') {
        return;
      }

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

      if (g.chat.length > 100) {
        g.chat.shift();
      }

      for (const id of [g.p.w, g.p.b]) {
        send(users.get(id), msg);
      }

      return;
    }
  }
}

/* ---------- Telegram foydalanuvchisini tekshirish ---------- */

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
    ws.send(JSON.stringify({
      t: 'error',
      code: 'auth'
    }));

    return ws.close();
  }

  info.id = String(info.id);

  let u = users.get(info.id);

  if (u && u.ws && u.ws !== ws) {
    send(u, { t: 'replaced' });
    u.ws.close();
  }

  if (!u) {
    u = {
      id: info.id,
      game: null
    };

    users.set(info.id, u);
  }

  Object.assign(u, info, { ws });
  ws.user = u;

  send(u, {
    t: 'hello',
    me: pub(u)
  });

  const g = u.game && games.get(u.game);

  if (g) {
    clearTimeout(g.timers[u.id]);
    delete g.timers[u.id];

    send(u, gameState(g, u.id));

    if (g.waitingForOpponent) {
      send(u, {
        t: 'group_waiting',
        count: 1,
        message: 'Екінші ойыншының кіруін күтіңіз...'
      });
    } else {
      const opp = users.get(
        g.p[G.other(sideOfUser(g, u.id))]
      );

      send(opp, {
        t: 'away',
        left: false
      });

      if (g.timers[opp.id]) {
        send(u, {
          t: 'away',
          left: true,
          seconds: GRACE
        });
      }
    }
  } else {
    u.game = null;
  }
}

/* ---------- WebSocket ulanishi ---------- */

wss.on('connection', ws => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const authTimer = setTimeout(() => {
    if (!ws.user) ws.close();
  }, 10000);

  ws.on('message', raw => {
    let m;

    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }

    if (!m || typeof m.t !== 'string') return;

    if (!ws.user) {
      return m.t === 'auth'
        ? onAuth(ws, m)
        : undefined;
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

    const roomCode = groupPlayerRooms.get(String(u.id));
    const room = roomCode && groupRooms.get(roomCode);

    if (room && !room.started) {
      room.connected.delete(String(u.id));
    }

    const g = u.game && games.get(u.game);

    if (!g) return;

    if (g.waitingForOpponent) {
      const otherId = g.p[G.other(sideOfUser(g, u.id))];
      const other = users.get(otherId);

      send(other, {
        t: 'group_waiting',
        count: room ? room.connected.size : 0,
        message: 'Екінші ойыншының кіруін күтіңіз...'
      });

      return;
    }

    const side = sideOfUser(g, u.id);

    send(
      users.get(g.p[G.other(side)]),
      {
        t: 'away',
        left: true,
        seconds: GRACE
      }
    );

    g.timers[u.id] = setTimeout(() => {
      finish(g, G.other(side), 'left');
    }, GRACE * 1000);
  });
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 15000).unref();

/* ---------- Serverni ishga tushirish ---------- */

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(
      `Shashka server: http://localhost:${PORT}${DEV ? ' (DEV rejim)' : ''}`
    );

    setupTelegramWebhook();
  });
}

module.exports = {
  server,
  games,
  users,
  invites,
  groupRooms
};
