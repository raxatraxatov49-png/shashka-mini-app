
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

const TURN_SECONDS = 60;
const TURN_MS = TURN_SECONDS * 1000;

const GROUP_WAIT_SECONDS = 90;
const GROUP_WAIT_MS = GROUP_WAIT_SECONDS * 1000;

const WEBHOOK_URL = 'https://shashka-mini-app.onrender.com/telegram-webhook';
const MINI_APP_LINK = 'https://t.me/shashkaoyinibot?startapp=';

const WEBHOOK_SECRET = crypto
  .createHash('sha256')
  .update(BOT_TOKEN)
  .digest('hex')
  .slice(0, 32);

if (!BOT_TOKEN && !DEV) {
  console.error('BOT_TOKEN орнатылмаған.');
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
    throw new Error(result.description || 'Telegram API қатесі');
  }

  return result;
}

/* ---------- Көмекші функциялар ---------- */

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

  if (player.username) return '@' + player.username;

  return [
    player.first_name,
    player.last_name
  ].filter(Boolean).join(' ') || player.name || 'Ойыншы';
}

function playerLink(player) {
  if (!player || !player.id) return 'Ойыншы';

  return `<a href="tg://user?id=${encodeURIComponent(String(player.id))}">${escapeHtml(playerName(player))}</a>`;
}

const groupRooms = new Map();
const groupTokens = new Map();
const groupPlayerRooms = new Map();

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

/* ---------- Топтық ойын бөлмесі ---------- */

function roomText(room) {
  let text = '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n';

  room.players.forEach((player, index) => {
    const id = String(player.id);
    const entered = room.entered.has(id);

    text += `${index + 1}. ${playerLink(player)}${entered ? ' ✅' : ''}\n`;
  });

  if (room.players.length < 2) {
    text += '\nЕкінші ойыншының қосылуын күтеміз...';
  } else if (!room.started) {
    text += '\n\n📩 Екі ойыншыға да ойынға кіру батырмасы жеке хабарлама арқылы жіберілді.';
    text += '\n\n📱 Жеке хабарламаларыңызды тексеріңіздер!';
    text += '\n⏳ Бірінші кірген ойыншыға 1 минут 30 секунд беріледі.';
  } else {
    text += '\n\n🎮 <b>Ойын басталды!</b>\nСәттілік!';
  }

  return text;
}

function roomKeyboard(room) {
  if (room.players.length < 2) {
    return {
      inline_keyboard: [[
        {
          text: '♟️ ОЙЫНҒА ҚОСЫЛУ',
          callback_data: 'gj:' + room.code
        }
      ]]
    };
  }

  return { inline_keyboard: [] };
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

/*
 * Ескі хабарламаны өшіріп,
 * топқа жаңадан ойын басталғаны туралы хабарлама жібереді.
 */
async function replaceGroupRoomMessage(room) {
  if (!room) return;

  if (room.messageId) {
    try {
      await telegramApi('deleteMessage', {
        chat_id: room.chatId,
        message_id: room.messageId
      });
    } catch (error) {
      console.error('Ескі хабарламаны өшіру қатесі:', error.message);
    }
  }

  const text =
    '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n' +
    room.players.map((player, index) =>
      `${index + 1}. ${playerLink(player)} ✅`
    ).join('\n') +
    '\n\n🎮 <b>Ойын басталды!</b>\n' +
    'Сәттілік!';

  const sent = await telegramApi('sendMessage', {
    chat_id: room.chatId,
    text,
    parse_mode: 'HTML'
  });

  room.messageId = sent.result.message_id;
}

async function answerCallback(id, text, alert = false) {
  try {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: id,
      text,
      show_alert: alert
    });
  } catch (error) {
    console.error('Жауап жіберу қатесі:', error.message);
  }
}

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

const sideOfUser = (g, id) =>
  g.p.w === String(id) ? 'w' : 'b';

const legalList = (g, side) =>
  g.st.turn === side && !g.st.over && !g.waitingForOpponent
    ? G.legalMoves(g.st).map(({ from, to, cap }) => ({
        from,
        to,
        cap
      }))
    : [];

/* ---------- Таймерлер ---------- */

function clearTurnTimer(g) {
  if (!g) return;

  if (g.turnTimer) clearTimeout(g.turnTimer);

  g.turnTimer = null;
  g.turnDeadline = null;
  g.turnTimerSide = null;
}

function clearGroupWaitingTimer(room) {
  if (!room) return;

  if (room.waitingTimer) {
    clearTimeout(room.waitingTimer);
  }

  room.waitingTimer = null;
  room.waitingDeadline = null;
}

function groupWaitingMessage(room) {
  const remaining = room.waitingDeadline
    ? Math.max(
        0,
        Math.ceil((room.waitingDeadline - Date.now()) / 1000)
      )
    : GROUP_WAIT_SECONDS;

  return {
    t: 'group_waiting',
    count: room.connected.size,
    seconds: remaining,
    deadline: room.waitingDeadline || null,
    message: 'Қарсыластың ойынға кіруін күтіңіз...'
  };
}

function sendGroupWaiting(room) {
  if (!room || !room.waitingDeadline || room.started) return;

  const message = groupWaitingMessage(room);

  for (const player of room.players) {
    send(users.get(String(player.id)), message);
  }
}

function startGroupWaitingTimer(room, g, firstPlayerId) {
  if (!room || !g || room.started || !g.waitingForOpponent) {
    return;
  }

  if (!room.firstConnectedId) {
    room.firstConnectedId = String(firstPlayerId);
  }

  if (!room.waitingDeadline) {
    room.waitingDeadline = Date.now() + GROUP_WAIT_MS;
  }

  sendGroupWaiting(room);

  if (room.waitingTimer) return;

  const deadline = room.waitingDeadline;

  const check = () => {
    if (
      !groupRooms.has(room.code) ||
      !games.has(g.id) ||
      room.started ||
      !g.waitingForOpponent ||
      room.waitingDeadline !== deadline
    ) {
      return;
    }

    const remaining = deadline - Date.now();

    if (remaining > 0) {
      room.waitingTimer = setTimeout(check, remaining);

      if (room.waitingTimer.unref) {
        room.waitingTimer.unref();
      }

      return;
    }

    room.waitingTimer = null;

    if (room.started || !games.has(g.id) || !g.waitingForOpponent) {
      return;
    }

    const winnerSide = sideOfUser(g, room.firstConnectedId);

    finish(g, winnerSide, 'opponent_timeout');
  };

  room.waitingTimer = setTimeout(
    check,
    Math.max(0, deadline - Date.now())
  );

  if (room.waitingTimer.unref) {
    room.waitingTimer.unref();
  }
}

function sendTurnTimer(g) {
  if (
    !g ||
    !games.has(g.id) ||
    g.waitingForOpponent ||
    g.st.over ||
    !g.turnDeadline
  ) return;

  const remaining = Math.max(
    0,
    Math.ceil((g.turnDeadline - Date.now()) / 1000)
  );

  const message = {
    t: 'turn_timer',
    side: g.turnTimerSide,
    seconds: remaining,
    deadline: g.turnDeadline
  };

  send(users.get(g.p.w), message);
  send(users.get(g.p.b), message);
}

function startTurnTimer(g) {
  if (!g || !games.has(g.id)) return;

  clearTurnTimer(g);

  if (g.waitingForOpponent || g.st.over) return;

  const side = g.st.turn;
  const deadline = Date.now() + TURN_MS;

  g.turnTimerSide = side;
  g.turnDeadline = deadline;

  sendTurnTimer(g);

  const checkTimeout = () => {
    if (!games.has(g.id)) return;
    if (g.waitingForOpponent || g.st.over) return;

    if (
      g.st.turn !== side ||
      g.turnTimerSide !== side ||
      g.turnDeadline !== deadline
    ) return;

    const remaining = deadline - Date.now();

    if (remaining > 0) {
      g.turnTimer = setTimeout(checkTimeout, remaining);

      if (g.turnTimer.unref) {
        g.turnTimer.unref();
      }

      return;
    }

    finish(g, G.other(side), 'timeout');
  };

  g.turnTimer = setTimeout(checkTimeout, TURN_MS);

  if (g.turnTimer.unref) {
    g.turnTimer.unref();
  }
}

/* ---------- Топтық бөлмені тазалау ---------- */

function cleanupGroupRoom(code) {
  const room = groupRooms.get(code);
  if (!room) return;

  clearTimeout(room.timer);
  clearGroupWaitingTimer(room);

  if (room.pendingGame && games.has(room.pendingGame.id)) {
    const pending = room.pendingGame;

    clearTurnTimer(pending);
    games.delete(pending.id);

    for (const id of [pending.p.w, pending.p.b]) {
      const user = users.get(id);

      if (user && user.game === pending.id) {
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

/* ---------- Жеке хабарлама ---------- */

async function sendPlayerGroupLink(room, player) {
  const userId = String(player.id);
  const token = createGroupToken(room, player);

  try {
    await telegramApi('sendMessage', {
      chat_id: userId,
      text:
        '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n' +
        'Сіз топтық ойынға шақырылдыңыз!\n\n' +
        'Ойынға кіру үшін төмендегі батырманы басыңыз.',
      parse_mode: 'HTML',
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
      `Жеке хабарлама жіберілмеді (${userId}):`,
      error.message
    );

    return false;
  }
}

async function sendLinksToBothPlayers(room) {
  if (room.players.length !== 2) return;

  const results = await Promise.all(
    room.players.map(player => sendPlayerGroupLink(room, player))
  );

  room.privateSent = results.filter(Boolean).length;

  try {
    await updateGroupRoom(room);
  } catch (error) {
    console.error('Топ хабарламасын жаңарту қатесі:', error.message);
  }

  if (room.privateSent < 2) {
    try {
      await telegramApi('sendMessage', {
        chat_id: room.chatId,
        text:
          '⚠️ Кейбір ойыншыларға жеке хабарлама жіберілмеді.\n' +
          'Ботқа жеке чатта /start командасын жіберіп, қайта тексеріңіздер.',
        reply_to_message_id: room.messageId || undefined
      });
    } catch (error) {
      console.error('Ескерту жіберу қатесі:', error.message);
    }
  }
}

/* ---------- Топқа қосылу ---------- */

async function handleGroupCallback(query) {
  const data = String(query.data || '');
  const from = query.from;
  const userId = String(from.id);

  const match = data.match(/^gj:([a-f0-9]{12})$/);
  if (!match) return false;

  const code = match[1];
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
    await answerCallback(query.id, 'Сіз ойынға қосылып қойғансыз.');
    return true;
  }

  if (room.players.length >= 2) {
    await answerCallback(query.id, 'Ойыншылар саны толды.', true);
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

  await answerCallback(query.id, 'Сіз ойынға қосылдыңыз!');

  if (room.players.length === 2) {
    await sendLinksToBothPlayers(room);
  } else {
    try {
      await updateGroupRoom(room);
    } catch (error) {
      console.error('Топ хабарламасын жаңарту қатесі:', error.message);
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
      const creatorId = String(message.from.id);

      if (groupPlayerRooms.has(creatorId)) {
        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          reply_to_message_id: message.message_id,
          text:
            `⛔ ${playerLink({
              id: creatorId,
              username: message.from.username || '',
              first_name: message.from.first_name || '',
              last_name: message.from.last_name || ''
            })}\n\n` +
            'Сіз қазір шашка ойнап жатырсыз!\n' +
            'Жаңа ойын ашу үшін алдымен қазіргі ойынды аяқтаңыз. ♟️',
          parse_mode: 'HTML'
        });

        res.writeHead(200);
        return res.end('ok');
      }

      const code = crypto.randomBytes(6).toString('hex');

      const room = {
        code,
        chatId: message.chat.id,
        commandMessageId: message.message_id,
        messageId: null,
        players: [],
        entered: new Set(),
        connected: new Set(),
        tokens: new Map(),
        pendingGame: null,
        started: false,
        timer: null,
        waitingTimer: null,
        waitingDeadline: null,
        firstConnectedId: null,
        privateSent: 0
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
          '♟️ Қош келдіңіз!\n\n' +
          'Шашка ойынын бастаңыз және қарсыластарыңызды жеңіңіз! 🎮',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 ОЙЫНДЫ БАСТАУ',
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
    console.error('Telegram webhook қатесі:', error.message);
    res.writeHead(200);
    res.end('ok');
  }
}

async function setupTelegramWebhook() {
  if (!BOT_TOKEN || DEV) return;

  try {
    await telegramApi('setMyCommands', {
      commands: [{
        command: 'game',
        description: 'Шашка ойынын құру'
      }],
      scope: { type: 'all_group_chats' }
    });

    console.log('/game командасы орнатылды');

    const result = await telegramApi('setWebhook', {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query']
    });

    console.log('Telegram webhook:', result.description);
  } catch (error) {
    console.error('Telegram баптау қатесі:', error.message);
  }
}

/* ---------- HTTP ---------- */

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

/* ---------- Ойын күйі ---------- */

function gameState(g, uid) {
  const you = sideOfUser(g, uid);

  const remaining = g.turnDeadline
    ? Math.max(
        0,
        Math.ceil((g.turnDeadline - Date.now()) / 1000)
      )
    : null;

  const room = g.groupInfo
    ? groupRooms.get(g.groupInfo.code)
    : null;

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
    waitingForOpponent: Boolean(g.waitingForOpponent),
    turnSeconds: remaining,
    turnDeadline: g.turnDeadline || null,
    groupWaitDeadline: room ? room.waitingDeadline : null
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

/* ---------- Ойынды бастау ---------- */

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
    p: { w: w.id, b: bl.id },
    st: G.newGame(),
    chat: [],
    timers: {},
    turnTimer: null,
    turnDeadline: null,
    turnTimerSide: null,
    lastChat: {},
    groupInfo,
    waitingForOpponent: false
  };

  games.set(g.id, g);
  a.game = b.game = g.id;

  send(a, gameState(g, a.id));
  send(b, gameState(g, b.id));

  startTurnTimer(g);

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
      username: player.username || '',
      avatar: null,
      game: null,
      ws: null
    };

    users.set(id, u);
  } else {
    u.name = playerName(player);
    u.username = player.username || '';
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
    p: { w: w.id, b: bl.id },
    st: G.newGame(),
    chat: [],
    timers: {},
    turnTimer: null,
    turnDeadline: null,
    turnTimerSide: null,
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

/* ---------- Ойынды аяқтау ---------- */

function finish(g, winner, reason) {
  if (!games.has(g.id)) return;

  games.delete(g.id);

  clearTurnTimer(g);
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
    const room = groupRooms.get(g.groupInfo.code);
    const chatId = g.groupInfo.chatId;

    const winnerId = winner === 'w'
      ? g.p.w
      : winner === 'b'
        ? g.p.b
        : null;

    const winnerUser = winnerId
      ? users.get(winnerId)
      : null;

    let resultText;

    if (winnerUser) {
      resultText =
        `🏆 <b>ЖЕҢІМПАЗ:</b> ${playerLink({
          id: winnerId,
          username: winnerUser.username || '',
          first_name: winnerUser.username ? '' : winnerUser.name
        })}`;

      if (reason === 'timeout') {
        resultText += '\n⏰ Қарсыласының жүріс уақыты аяқталды.';
      } else if (reason === 'opponent_timeout') {
        resultText += '\n⏰ Қарсыласы 1 минут 30 секунд ішінде ойынға кірмеді.';
      } else if (reason === 'resign') {
        resultText += '\n🏁 Қарсыласы ойынды аяқтады.';
      } else if (reason === 'left') {
        resultText += '\n📴 Қарсыласының байланысы үзілді.';
      }
    } else {
      resultText = '🤝 Ойын тең аяқталды!';
    }

    const oldMessageIds = room
      ? [...new Set([
          room.commandMessageId,
          room.messageId
        ].filter(Boolean))]
      : [];

    cleanupGroupRoom(g.groupInfo.code);

    (async () => {
      for (const messageId of oldMessageIds) {
        try {
          await telegramApi('deleteMessage', {
            chat_id: chatId,
            message_id: messageId
          });
        } catch (error) {
          console.error('Ескі хабарламаны өшіру қатесі:', error.message);
        }
      }

      try {
        await telegramApi('sendMessage', {
          chat_id: chatId,
          text:
            '♟️ <b>ШАШКА ОЙЫНЫ АЯҚТАЛДЫ!</b>\n\n' +
            resultText,
          parse_mode: 'HTML'
        });
      } catch (error) {
        console.error('Жеңімпаз хабарламасы қатесі:', error.message);
      }
    })();
  }
}

/* ---------- Топтық ойынды бастау ---------- */

function startGroupMatch(room, g) {
  if (!room || !g || room.started || !games.has(g.id)) return;

  const first = users.get(String(room.players[0].id));
  const second = users.get(String(room.players[1].id));

  const bothConnected =
    first && second &&
    first.ws && first.ws.readyState === 1 &&
    second.ws && second.ws.readyState === 1 &&
    room.connected.has(String(first.id)) &&
    room.connected.has(String(second.id));

  if (!bothConnected) return;

  room.started = true;
  g.waitingForOpponent = false;

  clearGroupWaitingTimer(room);
  clearTimeout(room.timer);

  startTurnTimer(g);

  send(first, gameState(g, first.id));
  send(second, gameState(g, second.id));

  send(first, { t: 'group_started' });
  send(second, { t: 'group_started' });

  // Ескі хабарлама өшіріліп, жаңа хабарлама жіберіледі.
  replaceGroupRoomMessage(room).catch(error => {
    console.error('Ойын басталғандағы хабарлама қатесі:', error.message);
  });
}

function joinGroupGame(u, token) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{32}$/.test(token)
  ) {
    return send(u, { t: 'group_error', code: 'invalid' });
  }

  const tokenInfo = groupTokens.get(token);

  if (!tokenInfo || tokenInfo.userId !== String(u.id)) {
    return send(u, { t: 'group_error', code: 'invalid' });
  }

  const room = groupRooms.get(tokenInfo.code);

  if (!room) {
    return send(u, { t: 'group_error', code: 'expired' });
  }

  if (room.started) {
    const existingGame = room.pendingGame;

    if (
      existingGame &&
      games.has(existingGame.id) &&
      (existingGame.p.w === u.id || existingGame.p.b === u.id)
    ) {
      send(u, gameState(existingGame, u.id));
      sendTurnTimer(existingGame);
      return;
    }

    return send(u, { t: 'group_error', code: 'expired' });
  }

  if (room.players.length !== 2) {
    return send(u, { t: 'group_error', code: 'waiting' });
  }

  if (u.game && games.has(u.game)) {
    const existing = games.get(u.game);

    if (
      !existing.groupInfo ||
      existing.groupInfo.code !== room.code
    ) {
      return send(u, { t: 'group_error', code: 'busy' });
    }
  }

  room.connected.add(String(u.id));

  dequeue(u.id);
  removeUserInvite(u.id);

  let g = room.pendingGame;

  if (!g || !games.has(g.id)) {
    g = createPendingGroupGame(room);
  }

  if (!room.firstConnectedId) {
    room.firstConnectedId = String(u.id);
  }

  const first = users.get(String(room.players[0].id));
  const second = users.get(String(room.players[1].id));

  const bothConnected =
    first && second &&
    first.ws && first.ws.readyState === 1 &&
    second.ws && second.ws.readyState === 1 &&
    room.connected.has(String(first.id)) &&
    room.connected.has(String(second.id));

  if (bothConnected) {
    startGroupMatch(room, g);
    return;
  }

  startGroupWaitingTimer(room, g, room.firstConnectedId);

  send(u, gameState(g, u.id));
  send(u, groupWaitingMessage(room));

  sendGroupWaiting(room);
}

/* ---------- Досыңмен ойнау ---------- */

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
  if (
    typeof code !== 'string' ||
    !/^[a-f0-9]{12}$/.test(code)
  ) {
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

/* ---------- Хабарламаларды басқару ---------- */

function handle(u, m) {
  switch (m.t) {
    case 'group_join':
      return joinGroupGame(u, m.token || m.code);

    case 'find': {
      if (u.game && games.has(u.game)) {
        return send(u, gameState(games.get(u.game), u.id));
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
      ) return;

      const side = sideOfUser(g, u.id);

      if (g.st.turn !== side) {
        return send(u, gameState(g, u.id));
      }

      if (
        g.turnTimerSide === side &&
        g.turnDeadline &&
        Date.now() >= g.turnDeadline
      ) {
        return finish(g, G.other(side), 'timeout');
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
        return;
      }

      if (g.st.turn !== g.turnTimerSide) {
        startTurnTimer(g);
      } else {
        sendTurnTimer(g);
      }

      return;
    }

    case 'resign': {
      const g = games.get(u.game);

      if (g && !g.waitingForOpponent) {
        finish(g, G.other(sideOfUser(g, u.id)), 'resign');
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

      if (!text || now - (g.lastChat[u.id] || 0) < 400) return;

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

/* ---------- Авторизация ---------- */

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

  info.id = String(info.id);

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
      const roomCode = groupPlayerRooms.get(String(u.id));
      const room = roomCode && groupRooms.get(roomCode);

      if (room) {
        room.connected.add(String(u.id));

        if (!room.firstConnectedId) {
          room.firstConnectedId = String(u.id);
        }

        const first = users.get(String(room.players[0].id));
        const second = users.get(String(room.players[1].id));

        const bothConnected =
          first && second &&
          first.ws && first.ws.readyState === 1 &&
          second.ws && second.ws.readyState === 1 &&
          room.connected.has(String(first.id)) &&
          room.connected.has(String(second.id));

        if (bothConnected && room.pendingGame) {
          startGroupMatch(room, room.pendingGame);
        } else if (room.pendingGame) {
          startGroupWaitingTimer(
            room,
            room.pendingGame,
            room.firstConnectedId
          );

          send(u, groupWaitingMessage(room));
          sendGroupWaiting(room);
        }
      }
    } else {
      const opp = users.get(
        g.p[G.other(sideOfUser(g, u.id))]
      );

      send(opp, { t: 'away', left: false });

      if (g.timers[opp.id]) {
        send(u, {
          t: 'away',
          left: true,
          seconds: GRACE
        });
      }

      sendTurnTimer(g);
    }
  } else {
    u.game = null;
  }
}

/* ---------- WebSocket қосылымы ---------- */

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
      if (room && room.waitingDeadline) {
        sendGroupWaiting(room);
      }

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
    if (!ws.isAlive) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 15000).unref();

/* ---------- Серверді іске қосу ---------- */

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(
      `Shashka сервері: http://localhost:${PORT}${DEV ? ' (DEV режимі)' : ''}`
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
