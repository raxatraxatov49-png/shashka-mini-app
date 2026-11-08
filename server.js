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

const OWNER_ID = '8032280418';

const DATA_DIR = process.env.DATA_DIR || __dirname;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const BLOCKED_FILE = path.join(DATA_DIR, 'blocked-groups.json');

/* ---------- JSON сақтау ---------- */

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  const temp = file + '.tmp';

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2)
  );

  fs.renameSync(temp, file);
}

/* ---------- Рұқсаттар ---------- */

const PERMISSIONS = {
  stats: '📊 Статистика',
  groups: '👥 Қосылған топтар',
  games: '🎮 Белсенді ойындар',
  broadcast: '📢 Топтарға хабарлама',
  group_manage: '🚫 Топтарды басқару',
  admin_manage: '👑 Админдерді басқару'
};

const DEFAULT_PERMISSIONS = [
  'stats',
  'groups',
  'games'
];

function loadAdmins() {
  const data = readJSON(ADMINS_FILE, []);

  const result = new Map();

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || !item.id) continue;

      result.set(String(item.id), {
        id: String(item.id),
        permissions: Array.isArray(item.permissions)
          ? item.permissions.filter(p => PERMISSIONS[p])
          : [...DEFAULT_PERMISSIONS]
      });
    }
  }

  return result;
}

const admins = loadAdmins();

function saveAdmins() {
  writeJSON(
    ADMINS_FILE,
    [...admins.values()]
  );
}

function isOwner(id) {
  return String(id) === OWNER_ID;
}

function isAdmin(id) {
  return isOwner(id) || admins.has(String(id));
}

function hasPermission(id, permission) {
  if (isOwner(id)) return true;

  const admin = admins.get(String(id));

  return Boolean(
    admin &&
    admin.permissions.includes(permission)
  );
}

function getAdminPermissions(id) {
  if (isOwner(id)) {
    return Object.keys(PERMISSIONS);
  }

  return admins.get(String(id))?.permissions || [];
}

/* ---------- Топтарды жүктеу ---------- */

function loadGroups() {
  const data = readJSON(GROUPS_FILE, []);

  if (!Array.isArray(data)) return new Map();

  return new Map(
    data.map(g => [String(g.id), g])
  );
}

const savedGroups = loadGroups();

function saveGroups() {
  writeJSON(
    GROUPS_FILE,
    [...savedGroups.values()]
  );
}

/* ---------- Блокталған топтар ---------- */

function loadBlockedGroups() {
  const data = readJSON(BLOCKED_FILE, []);

  return new Set(
    Array.isArray(data)
      ? data.map(String)
      : []
  );
}

const blockedGroups = loadBlockedGroups();

function saveBlockedGroups() {
  writeJSON(
    BLOCKED_FILE,
    [...blockedGroups]
  );
}

function isGroupBlocked(id) {
  return blockedGroups.has(String(id));
}

/* ---------- Баптаулар ---------- */

const INVITE_TTL = 10 * 60 * 1000;
const GROUP_TTL = 10 * 60 * 1000;

const GROUP_SEARCH_SECONDS = 120;
const GROUP_SEARCH_MS = GROUP_SEARCH_SECONDS * 1000;

const TURN_SECONDS = 60;
const TURN_MS = TURN_SECONDS * 1000;

const GROUP_WAIT_SECONDS = 90;
const GROUP_WAIT_MS = GROUP_WAIT_SECONDS * 1000;

const WEBHOOK_URL =
  'https://shashka-mini-app.onrender.com/telegram-webhook';

const MINI_APP_LINK =
  'https://t.me/shashkaoyinibot?startapp=';

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

/* ---------- Telegram API ---------- */

async function telegramApi(method, data) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    const error = new Error(
      result.description || 'Telegram API қатесі'
    );

    error.telegram = result;
    throw error;
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

  if (player.username) {
    return '@' + player.username;
  }

  return [
    player.first_name,
    player.last_name
  ].filter(Boolean).join(' ') || player.name || 'Ойыншы';
}

function playerLink(player) {
  if (!player || !player.id) return 'Ойыншы';

  return `<a href="tg://user?id=${encodeURIComponent(String(player.id))}">${escapeHtml(playerName(player))}</a>`;
}

/* ---------- Топтарды сақтау ---------- */

async function registerGroup(chat) {
  if (
    !chat ||
    !['group', 'supergroup'].includes(chat.type)
  ) {
    return;
  }

  const id = String(chat.id);
  const old = savedGroups.get(id);

  const group = {
    id,
    title: chat.title || old?.title || 'Атаусыз топ',
    username: chat.username || null,
    type: chat.username ? 'public' : 'private',
    inviteLink: old?.inviteLink || null,
    addedAt: old?.addedAt || Date.now(),
    gameCount: Number(old?.gameCount) || 0,
    lastGameAt: old?.lastGameAt || null
  };

  if (group.username) {
    group.inviteLink = 'https://t.me/' + group.username;
  } else if (!group.inviteLink) {
    try {
      const result = await telegramApi(
        'createChatInviteLink',
        {
          chat_id: id,
          name: 'Shashka Bot'
        }
      );

      group.inviteLink = result.result.invite_link;
    } catch (error) {
      console.log(
        'Жабық топ сілтемесі алынбады:',
        error.message
      );
    }
  }

  savedGroups.set(id, group);
  saveGroups();

  console.log('Топ тіркелді:', group.title, id);
}

function removeGroup(id) {
  if (savedGroups.delete(String(id))) {
    saveGroups();
    console.log('Топ тізімнен өшірілді:', id);
  }
}

function incrementGroupGameCount(chatId) {
  const group = savedGroups.get(String(chatId));

  if (!group) return;

  group.gameCount =
    (Number(group.gameCount) || 0) + 1;

  group.lastGameAt = Date.now();

  savedGroups.set(String(chatId), group);
  saveGroups();
}

/* ---------- Ойын күйі ---------- */

const groupRooms = new Map();
const groupTokens = new Map();
const groupPlayerRooms = new Map();

const users = new Map();
const games = new Map();
const invites = new Map();
const userInvites = new Map();

let queue = [];
let gameSeq = 0;

function send(u, msg) {
  if (u && u.ws && u.ws.readyState === 1) {
    u.ws.send(JSON.stringify(msg));
  }
}

const pub = u => ({
  name: u ? u.name : 'Ойыншы',
  avatar: u ? u.avatar : null
});

const sideOfUser = (g, id) =>
  g.p.w === String(id) ? 'w' : 'b';

const legalList = (g, side) =>
  g.st.turn === side &&
  !g.st.over &&
  !g.waitingForOpponent
    ? G.legalMoves(g.st).map(({ from, to, cap }) => ({
        from,
        to,
        cap
      }))
    : [];

/* ---------- Таймерлер ---------- */

function clearTurnTimer(g) {
  if (!g) return;

  if (g.turnTimer) {
    clearTimeout(g.turnTimer);
  }

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
        Math.ceil(
          (room.waitingDeadline - Date.now()) / 1000
        )
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
  if (!room || !room.waitingDeadline || room.started) {
    return;
  }

  const message = groupWaitingMessage(room);

  for (const player of room.players) {
    send(users.get(String(player.id)), message);
  }
}

function sendTurnTimer(g) {
  if (
    !g ||
    !games.has(g.id) ||
    g.waitingForOpponent ||
    g.st.over ||
    !g.turnDeadline
  ) {
    return;
  }

  const remaining = Math.max(
    0,
    Math.ceil(
      (g.turnDeadline - Date.now()) / 1000
    )
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
    ) {
      return;
    }

    const remaining = deadline - Date.now();

    if (remaining > 0) {
      g.turnTimer = setTimeout(
        checkTimeout,
        remaining
      );

      if (g.turnTimer.unref) {
        g.turnTimer.unref();
      }

      return;
    }

    finish(g, G.other(side), 'timeout');
  };

  g.turnTimer = setTimeout(
    checkTimeout,
    TURN_MS
  );

  if (g.turnTimer.unref) {
    g.turnTimer.unref();
  }
}

/* ---------- Ойын функциялары ---------- */

function gameState(g, uid) {
  const you = sideOfUser(g, uid);

  const remaining = g.turnDeadline
    ? Math.max(
        0,
        Math.ceil(
          (g.turnDeadline - Date.now()) / 1000
        )
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
    groupWaitDeadline: room
      ? room.waitingDeadline
      : null
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
    p: {
      w: w.id,
      b: bl.id
    },
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

/* ---------- Топ бөлмелерін тазалау ---------- */

function cleanupGroupRoom(code) {
  const room = groupRooms.get(code);

  if (!room) return;

  clearTimeout(room.timer);
  clearTimeout(room.searchTimer);
  clearGroupWaitingTimer(room);

  if (
    room.pendingGame &&
    games.has(room.pendingGame.id)
  ) {
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

/* ---------- Топты блоктау ---------- */

function blockGroup(id) {
  id = String(id).trim();

  if (!/^-?\d+$/.test(id)) {
    return false;
  }

  blockedGroups.add(id);
  saveBlockedGroups();

  // Осы топтағы барлық бөлмелерді жабу
  for (const [code, room] of [...groupRooms.entries()]) {
    if (String(room.chatId) === id) {
      cleanupGroupRoom(code);
    }
  }

  // Осы топқа қатысты белсенді ойындарды тоқтату
  for (const [gameId, g] of [...games.entries()]) {
    if (
      g.groupInfo &&
      String(g.groupInfo.chatId) === id
    ) {
      clearTurnTimer(g);
      Object.values(g.timers || {}).forEach(clearTimeout);

      games.delete(gameId);

      for (const playerId of [g.p.w, g.p.b]) {
        const u = users.get(playerId);

        if (u && u.game === gameId) {
          u.game = null;
        }

        send(u, {
          t: 'group_error',
          code: 'blocked'
        });
      }
    }
  }

  console.log('Топ блокталды:', id);

  return true;
}

function unblockGroup(id) {
  id = String(id).trim();

  if (!blockedGroups.has(id)) {
    return false;
  }

  blockedGroups.delete(id);
  saveBlockedGroups();

  console.log('Топ блоктан шығарылды:', id);

  return true;
}

/* ---------- Админ хабарламалары ---------- */

const adminBroadcastDrafts = new Map();
const adminActions = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBroadcast(adminId, messageText) {
  let success = 0;
  let failed = 0;
  let removed = 0;

  const groups = [...savedGroups.values()]
    .filter(g => !isGroupBlocked(g.id));

  for (const group of groups) {
    try {
      await telegramApi('sendMessage', {
        chat_id: group.id,
        text: messageText
      });

      success++;
    } catch (error) {
      failed++;

      const description = error.message || '';

      if (
        description.includes('chat not found') ||
        description.includes('bot was kicked') ||
        description.includes('bot was blocked')
      ) {
        removeGroup(group.id);
        removed++;
      }

      const retryAfter = Number(
        error.telegram?.parameters?.retry_after || 0
      );

      if (retryAfter > 0) {
        await delay((retryAfter + 1) * 1000);
      }

      console.error(
        'Хабар жіберу қатесі:',
        group.title,
        error.message
      );
    }

    await delay(60);
  }

  try {
    await telegramApi('sendMessage', {
      chat_id: adminId,
      text:
        '📢 <b>ХАБАР ТАРАТУ АЯҚТАЛДЫ</b>\n\n' +
        `👥 Барлық қолжетімді топ: ${groups.length}\n` +
        `✅ Жеткізілді: ${success}\n` +
        `❌ Жеткізілмеді: ${failed}\n` +
        `🗑 Тізімнен өшірілді: ${removed}`,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error(
      'Админге есеп жіберілмеді:',
      error.message
    );
  }
}

/* ---------- Админ панель пернетақтасы ---------- */

function adminKeyboard(adminId) {
  const rows = [];

  if (hasPermission(adminId, 'stats')) {
    rows.push([{
      text: '📊 Статистика',
      callback_data: 'adm:stats'
    }]);
  }

  if (hasPermission(adminId, 'groups')) {
    rows.push([{
      text: '👥 Қосылған топтар',
      callback_data: 'adm:groups:0'
    }]);
  }

  if (hasPermission(adminId, 'games')) {
    rows.push([{
      text: '🎮 Белсенді ойындар',
      callback_data: 'adm:games'
    }]);
  }

  if (hasPermission(adminId, 'broadcast')) {
    rows.push([{
      text: '📢 Топтарға хабарлама',
      callback_data: 'adm:broadcast'
    }]);
  }

  if (hasPermission(adminId, 'group_manage')) {
    rows.push([{
      text: '🚫 Топтарды басқару',
      callback_data: 'adm:block'
    }]);
  }

  if (hasPermission(adminId, 'admin_manage')) {
    rows.push([{
      text: '👑 Админдерді басқару',
      callback_data: 'adm:admins'
    }]);
  }

  rows.push([{
    text: '🔄 Жаңарту',
    callback_data: 'adm:home'
  }]);

  return {
    inline_keyboard: rows
  };
}

async function openAdmin(chatId) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text:
      '🔐 <b>SHASHKA BOT ADMIN PANEL</b>\n\n' +
      'Қош келдіңіз!\n\n' +
      'Басқару бөлімін таңдаңыз:',
    parse_mode: 'HTML',
    reply_markup: adminKeyboard(chatId)
  });
}

async function editAdminMessage(
  chatId,
  messageId,
  text,
  keyboard
) {
  return telegramApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

/* ---------- Админдер тізімі ---------- */

function adminsKeyboard() {
  const rows = [
    [{
      text: '➕ Админ қосу',
      callback_data: 'adm:admin:add'
    }]
  ];

  for (const admin of admins.values()) {
    rows.push([{
      text: '👤 ' + admin.id,
      callback_data: 'adm:admin:' + admin.id
    }]);
  }

  rows.push([{
    text: '🔙 Басты мәзір',
    callback_data: 'adm:home'
  }]);

  return {
    inline_keyboard: rows
  };
}

function adminDetailKeyboard(id) {
  const admin = admins.get(String(id));

  if (!admin) {
    return {
      inline_keyboard: [[{
        text: '🔙 Админдер',
        callback_data: 'adm:admins'
      }]]
    };
  }

  const rows = [];

  for (const [permission, title] of Object.entries(PERMISSIONS)) {
    const enabled = admin.permissions.includes(permission);

    rows.push([{
      text:
        (enabled ? '✅ ' : '❌ ') + title,
      callback_data:
        `adm:perm:${id}:${permission}`
    }]);
  }

  rows.push([{
    text: '🗑 Админді өшіру',
    callback_data: 'adm:admin:remove:' + id
  }]);

  rows.push([{
    text: '🔙 Админдер тізімі',
    callback_data: 'adm:admins'
  }]);

  return {
    inline_keyboard: rows
  };
}

/* ---------- Топ басқару мәзірі ---------- */

function groupManageKeyboard() {
  return {
    inline_keyboard: [
      [{
        text: '🚫 Топты блоктау',
        callback_data: 'adm:block:add'
      }],
      [{
        text: '🔓 Топты блоктан шығару',
        callback_data: 'adm:block:remove'
      }],
      [{
        text: '📋 Блокталған топтар',
        callback_data: 'adm:block:list'
      }],
      [{
        text: '🔙 Басты мәзір',
        callback_data: 'adm:home'
      }]
    ]
  };
}

/* ---------- Админ callback ---------- */

async function handleAdminCallback(query) {
  const data = String(query.data || '');

  if (!data.startsWith('adm:')) {
    return false;
  }

  const adminId = String(query.from.id);

  if (!isAdmin(adminId)) {
    await answerCallback(
      query.id,
      '⛔ Рұқсат жоқ!',
      true
    );

    return true;
  }

  if (
    !query.message ||
    query.message.chat.type !== 'private'
  ) {
    await answerCallback(
      query.id,
      'Админ панель тек жеке чатта жұмыс істейді.',
      true
    );

    return true;
  }

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  const permissionMap = [
    ['adm:stats', 'stats'],
    ['adm:groups:', 'groups'],
    ['adm:games', 'games'],
    ['adm:broadcast', 'broadcast'],
    ['adm:block', 'group_manage'],
    ['adm:admin:', 'admin_manage'],
    ['adm:admins', 'admin_manage']
  ];

  for (const [prefix, permission] of permissionMap) {
    if (
      data === prefix ||
      (prefix.endsWith(':') && data.startsWith(prefix))
    ) {
      if (!hasPermission(adminId, permission)) {
        await answerCallback(
          query.id,
          '⛔ Бұл бөлімге рұқсатыңыз жоқ!',
          true
        );

        return true;
      }
    }
  }

  /* Хабар тарату */

  if (data === 'adm:broadcast') {
    adminBroadcastDrafts.set(adminId, {
      waiting: true,
      text: null
    });

    await editAdminMessage(
      chatId,
      messageId,
      '📢 <b>ТОПТАРҒА ХАБАР ЖІБЕРУ</b>\n\n' +
      'Жібергіңіз келген хабарламаны осы чатқа жазыңыз.\n\n' +
      '❌ Болдырмау үшін /cancel жазыңыз.',
      {
        inline_keyboard: [[{
          text: '❌ Болдырмау',
          callback_data: 'adm:broadcast:cancel'
        }]]
      }
    );

    await answerCallback(query.id, 'Хабарлама күтілуде.');

    return true;
  }

  if (data === 'adm:broadcast:confirm') {
    const draft = adminBroadcastDrafts.get(adminId);

    if (!draft || !draft.text) {
      await answerCallback(
        query.id,
        'Хабарлама табылмады.',
        true
      );

      return true;
    }

    const messageText = draft.text;

    adminBroadcastDrafts.delete(adminId);

    await answerCallback(
      query.id,
      'Жіберу басталды!'
    );

    await editAdminMessage(
      chatId,
      messageId,
      '📢 <b>ХАБАР ТАРАТЫЛУДА...</b>\n\n' +
      'Хабарлама қолжетімді топтарға жіберілуде.',
      {
        inline_keyboard: [[{
          text: '🔙 Басты мәзір',
          callback_data: 'adm:home'
        }]]
      }
    );

    runBroadcast(chatId, messageText).catch(
      error => console.error(error.message)
    );

    return true;
  }

  if (data === 'adm:broadcast:cancel') {
    adminBroadcastDrafts.delete(adminId);

    await editAdminMessage(
      chatId,
      messageId,
      '❌ Хабарлама тарату тоқтатылды.',
      adminKeyboard(adminId)
    );

    await answerCallback(query.id, 'Болдырылмады.');

    return true;
  }

  /* Админ қосу */

  if (data === 'adm:admin:add') {
    adminActions.set(adminId, {
      action: 'add_admin'
    });

    await editAdminMessage(
      chatId,
      messageId,
      '➕ <b>АДМИН ҚОСУ</b>\n\n' +
      'Жаңа админнің Telegram ID нөмірін жіберіңіз.\n\n' +
      'Жаңа админге бастапқыда статистика, топтар және ойындар бөлімдеріне рұқсат беріледі.\n\n' +
      '❌ Болдырмау: /cancel',
      {
        inline_keyboard: [[{
          text: '🔙 Артқа',
          callback_data: 'adm:admins'
        }]]
      }
    );

    await answerCallback(query.id, 'Telegram ID күтілуде.');

    return true;
  }

  /* Админ өшіру */

  if (data.startsWith('adm:admin:remove:')) {
    const targetId = data.slice(
      'adm:admin:remove:'.length
    );

    if (isOwner(targetId)) {
      await answerCallback(
        query.id,
        'Негізгі админді өшіру мүмкін емес!',
        true
      );

      return true;
    }

    if (!admins.has(targetId)) {
      await answerCallback(
        query.id,
        'Админ табылмады.',
        true
      );

      return true;
    }

    admins.delete(targetId);
    saveAdmins();

    await editAdminMessage(
      chatId,
      messageId,
      '✅ Админ өшірілді.\n\n' +
      `🆔 ID: <code>${escapeHtml(targetId)}</code>`,
      adminsKeyboard()
    );

    await answerCallback(query.id, 'Админ өшірілді.');

    return true;
  }

  /* Админ рұқсаттарын өзгерту */

  if (data.startsWith('adm:perm:')) {
    const parts = data.split(':');

    const targetId = parts[2];
    const permission = parts[3];

    const target = admins.get(targetId);

    if (!target || !PERMISSIONS[permission]) {
      await answerCallback(
        query.id,
        'Админ немесе рұқсат табылмады.',
        true
      );

      return true;
    }

    const index = target.permissions.indexOf(permission);

    if (index >= 0) {
      target.permissions.splice(index, 1);
    } else {
      target.permissions.push(permission);
    }

    admins.set(targetId, target);
    saveAdmins();

    await editAdminMessage(
      chatId,
      messageId,
      '👑 <b>АДМИН РҰҚСАТТАРЫ</b>\n\n' +
      `🆔 ID: <code>${escapeHtml(targetId)}</code>\n\n` +
      'Қажетті бөлімдерді қосыңыз немесе өшіріңіз:',
      adminDetailKeyboard(targetId)
    );

    await answerCallback(query.id, 'Рұқсат өзгертілді.');

    return true;
  }

  /* Админнің мәліметтері */

  if (
    data.startsWith('adm:admin:') &&
    !data.startsWith('adm:admin:add') &&
    !data.startsWith('adm:admin:remove:')
  ) {
    const targetId = data.slice('adm:admin:'.length);
    const target = admins.get(targetId);

    if (!target) {
      await answerCallback(query.id, 'Админ табылмады.', true);
      return true;
    }

    const permissions = target.permissions
      .map(p => PERMISSIONS[p])
      .filter(Boolean)
      .join('\n') || 'Рұқсат берілмеген';

    await editAdminMessage(
      chatId,
      messageId,
      '👑 <b>АДМИН АҚПАРАТЫ</b>\n\n' +
      `🆔 ID: <code>${escapeHtml(targetId)}</code>\n\n` +
      `🔐 Рұқсаттары:\n${permissions}\n\n` +
      'Рұқсаттарды өзгерту үшін төмендегі батырмаларды басыңыз.',
      adminDetailKeyboard(targetId)
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Топты блоктау */

  if (data === 'adm:block:add') {
    adminActions.set(adminId, {
      action: 'block_group'
    });

    await editAdminMessage(
      chatId,
      messageId,
      '🚫 <b>ТОПТЫ БЛОКТАУ</b>\n\n' +
      'Блоктағыңыз келген топтың ID нөмірін жіберіңіз.\n\n' +
      'Мысалы:\n' +
      '<code>-1001234567890</code>\n\n' +
      '❌ Болдырмау: /cancel',
      {
        inline_keyboard: [[{
          text: '🔙 Артқа',
          callback_data: 'adm:block'
        }]]
      }
    );

    await answerCallback(query.id, 'Топ ID күтілуде.');

    return true;
  }

  if (data === 'adm:block:remove') {
    adminActions.set(adminId, {
      action: 'unblock_group'
    });

    await editAdminMessage(
      chatId,
      messageId,
      '🔓 <b>ТОПТЫ БЛОКТАН ШЫҒАРУ</b>\n\n' +
      'Блоктан шығарғыңыз келген топтың ID нөмірін жіберіңіз.\n\n' +
      '❌ Болдырмау: /cancel',
      {
        inline_keyboard: [[{
          text: '🔙 Артқа',
          callback_data: 'adm:block'
        }]]
      }
    );

    await answerCallback(query.id, 'Топ ID күтілуде.');

    return true;
  }

  if (data === 'adm:block:list') {
    const ids = [...blockedGroups];

    const list = ids.length
      ? ids.map((id, i) =>
          `${i + 1}. <code>${escapeHtml(id)}</code>`
        ).join('\n')
      : 'Блокталған топ жоқ.';

    await editAdminMessage(
      chatId,
      messageId,
      '🚫 <b>БЛОКТАЛҒАН ТОПТАР</b>\n\n' +
      `📊 Барлығы: ${ids.length}\n\n${list}`,
      groupManageKeyboard()
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Админдер мәзірі */

  if (data === 'adm:admins') {
    const list = [...admins.values()];

    await editAdminMessage(
      chatId,
      messageId,
      '👑 <b>АДМИНДЕРДІ БАСҚАРУ</b>\n\n' +
      `👑 Негізгі админ: <code>${OWNER_ID}</code>\n` +
      `👥 Қосымша админдер: ${list.length}\n\n` +
      'Админ қосу немесе тізімнен админді таңдау:',
      adminsKeyboard()
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Топ басқару мәзірі */

  if (data === 'adm:block') {
    await editAdminMessage(
      chatId,
      messageId,
      '🚫 <b>ТОПТАРДЫ БАСҚАРУ</b>\n\n' +
      `📊 Блокталған топтар: ${blockedGroups.size}\n\n` +
      'Қажетті әрекетті таңдаңыз:',
      groupManageKeyboard()
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Негізгі мәзір */

  if (data === 'adm:home') {
    await editAdminMessage(
      chatId,
      messageId,
      '🔐 <b>SHASHKA BOT ADMIN PANEL</b>\n\n' +
      'Басқару бөлімін таңдаңыз:',
      adminKeyboard(adminId)
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Статистика */

  if (data === 'adm:stats') {
    const all = [...savedGroups.values()];

    const publicCount = all.filter(
      g => g.type === 'public'
    ).length;

    const privateCount = all.filter(
      g => g.type === 'private'
    ).length;

    const totalGames = all.reduce(
      (sum, group) =>
        sum + (Number(group.gameCount) || 0),
      0
    );

    const text =
      '📊 <b>БОТ СТАТИСТИКАСЫ</b>\n\n' +
      `👥 Қосылған топтар: ${all.length}\n` +
      `🌐 Ашық топтар: ${publicCount}\n` +
      `🔒 Жабық топтар: ${privateCount}\n` +
      `🚫 Блокталған топтар: ${blockedGroups.size}\n\n` +
      `🎮 Жами топ ойындары: ${totalGames}\n` +
      `⚔️ Белсенді ойындар: ${games.size}\n` +
      `👤 Танылған ойыншылар: ${users.size}`;

    await editAdminMessage(
      chatId,
      messageId,
      text,
      adminKeyboard(adminId)
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Қосылған топтар */

  if (data.startsWith('adm:groups:')) {
    const requestedPage = Number(
      data.split(':')[2]
    );

    const page = Number.isInteger(requestedPage)
      ? Math.max(0, requestedPage)
      : 0;

    const all = [...savedGroups.values()].sort(
      (a, b) => b.addedAt - a.addedAt
    );

    const perPage = 8;

    const totalPages = Math.max(
      1,
      Math.ceil(all.length / perPage)
    );

    const current = Math.min(
      page,
      totalPages - 1
    );

    const items = all.slice(
      current * perPage,
      (current + 1) * perPage
    );

    let text =
      '👥 <b>ҚОСЫЛҒАН ТОПТАР</b>\n\n' +
      `📊 Жалпы топ: ${all.length}\n` +
      `📄 Бет: ${current + 1}/${totalPages}\n\n`;

    const rows = items.map((g, index) => [{
      text:
        `${current * perPage + index + 1}. ${g.title}`.slice(0, 60),
      callback_data: 'adm:group:' + g.id
    }]);

    const nav = [];

    if (current > 0) {
      nav.push({
        text: '⬅️ Артқа',
        callback_data: 'adm:groups:' + (current - 1)
      });
    }

    if (current + 1 < totalPages) {
      nav.push({
        text: 'Келесі ➡️',
        callback_data: 'adm:groups:' + (current + 1)
      });
    }

    if (nav.length) rows.push(nav);

    rows.push([{
      text: '🔙 Басты мәзір',
      callback_data: 'adm:home'
    }]);

    if (!items.length) {
      text += 'Әзірге бот қосылған топ жоқ.';
    }

    await editAdminMessage(
      chatId,
      messageId,
      text,
      { inline_keyboard: rows }
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  /* Топ ақпараты */

  if (data.startsWith('adm:group:')) {
    const id = data.slice('adm:group:'.length);
    const group = savedGroups.get(id);

    if (!group) {
      await editAdminMessage(
        chatId,
        messageId,
        '⚠️ Бұл топ тізімде жоқ.',
        {
          inline_keyboard: [[{
            text: '🔙 Топтар тізімі',
            callback_data: 'adm:groups:0'
          }]]
        }
      );

      await answerCallback(query.id, 'Топ табылмады.');

      return true;
    }

    const link = group.inviteLink
      ? `\n\n🔗 <a href="${escapeHtml(group.inviteLink)}">ТОПҚА ӨТУ</a>`
      : '\n\n🔗 Сілтеме жоқ';

    const blocked = isGroupBlocked(id);

    const text =
      '👥 <b>ТОП АҚПАРАТЫ</b>\n\n' +
      `📝 Атауы: ${escapeHtml(group.title)}\n` +
      `🆔 ID: <code>${escapeHtml(group.id)}</code>\n` +
      `🌐 Түрі: ${group.type === 'public' ? 'Ашық топ' : 'Жабық топ'}\n` +
      `🎮 Өткізілген ойындар: ${Number(group.gameCount) || 0}\n` +
      `🚫 Күйі: ${blocked ? 'Блокталған' : 'Белсенді'}` +
      link;

    const rows = [];

    if (blocked) {
      rows.push([{
        text: '🔓 Блоктан шығару',
        callback_data: 'adm:groupunblock:' + id
      }]);
    } else {
      rows.push([{
        text: '🚫 Блоктау',
        callback_data: 'adm:groupblock:' + id
      }]);
    }

    rows.push([{
      text: '🔙 Топтар тізімі',
      callback_data: 'adm:groups:0'
    }]);

    await editAdminMessage(
      chatId,
      messageId,
      text,
      { inline_keyboard: rows }
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  if (data.startsWith('adm:groupblock:')) {
    const id = data.slice('adm:groupblock:'.length);

    if (!blockGroup(id)) {
      await answerCallback(
        query.id,
        'Топ ID қате!',
        true
      );

      return true;
    }

    await editAdminMessage(
      chatId,
      messageId,
      '🚫 <b>ТОП БЛОКТАЛДЫ</b>\n\n' +
      `🆔 ID: <code>${escapeHtml(id)}</code>\n\n` +
      'Бұл топта боттың ойын функциялары тоқтатылды.',
      groupManageKeyboard()
    );

    await answerCallback(query.id, 'Топ блокталды.');

    return true;
  }

  if (data.startsWith('adm:groupunblock:')) {
    const id = data.slice('adm:groupunblock:'.length);

    if (!unblockGroup(id)) {
      await answerCallback(
        query.id,
        'Бұл топ блокталмаған.',
        true
      );

      return true;
    }

    await editAdminMessage(
      chatId,
      messageId,
      '🔓 <b>ТОП БЛОКТАН ШЫҒАРЫЛДЫ</b>\n\n' +
      `🆔 ID: <code>${escapeHtml(id)}</code>`,
      groupManageKeyboard()
    );

    await answerCallback(query.id, 'Топ блоктан шығарылды.');

    return true;
  }

  /* Белсенді ойындар */

  if (data === 'adm:games') {
    const text =
      '🎮 <b>БЕЛСЕНДІ ОЙЫНДАР</b>\n\n' +
      `Қазір жүріп жатқан ойындар: ${games.size}\n` +
      `Іздеу кезегіндегі ойыншылар: ${queue.length}\n` +
      `Топтық бөлмелер: ${groupRooms.size}`;

    await editAdminMessage(
      chatId,
      messageId,
      text,
      adminKeyboard(adminId)
    );

    await answerCallback(query.id, 'Дайын!');

    return true;
  }

  await answerCallback(
    query.id,
    'Белгісіз команда.'
  );

  return true;
}

/* ---------- Callback жауабы ---------- */

async function answerCallback(id, text, alert = false) {
  try {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: id,
      text,
      show_alert: alert
    });
  } catch (error) {
    console.error(
      'Жауап жіберу қатесі:',
      error.message
    );
  }
}

/* ---------- Топтық ойын ---------- */

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

function roomText(room) {
  let text = '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n';

  room.players.forEach((player, index) => {
    const id = String(player.id);
    const entered = room.entered.has(id);

    text +=
      `${index + 1}. ${playerLink(player)}` +
      `${entered ? ' ✅' : ''}\n`;
  });

  if (room.players.length < 2) {
    text +=
      '\n🔎 Қарсылас ізделуде...\n' +
      '♟️ Ойынға қосылу үшін төмендегі батырманы басыңыз.\n' +
      '⏳ Қарсылас табуға 2 минут беріледі.';
  } else if (!room.started) {
    text +=
      '\n\n📩 Екі ойыншыға да ойынға кіру батырмасы жеке хабарлама арқылы жіберілді.';
    text +=
      '\n\n📱 Жеке хабарламаларыңызды тексеріңіздер!';
    text +=
      '\n⏳ Бірінші кірген ойыншыға 1 минут 30 секунд беріледі.';
  } else {
    text += '\n\n🎮 <b>Ойын басталды!</b>\nСәттілік!';
  }

  return text;
}

function roomKeyboard(room) {
  if (room.players.length < 2) {
    return {
      inline_keyboard: [[{
        text: '♟️ ОЙЫНҒА ҚОСЫЛУ',
        callback_data: 'gj:' + room.code
      }]]
    };
  }

  return {
    inline_keyboard: []
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

async function replaceGroupRoomMessage(room) {
  if (!room) return;

  if (room.messageId) {
    try {
      await telegramApi('deleteMessage', {
        chat_id: room.chatId,
        message_id: room.messageId
      });
    } catch (error) {
      console.error(error.message);
    }
  }

  const text =
    '♟️ <b>ШАШКА ОЙЫНЫ</b>\n\n' +
    room.players.map((player, index) =>
      `${index + 1}. ${playerLink(player)} ✅`
    ).join('\n') +
    '\n\n🎮 <b>Ойын басталды!</b>\nСәттілік!';

  const sent = await telegramApi('sendMessage', {
    chat_id: room.chatId,
    text,
    parse_mode: 'HTML'
  });

  room.messageId = sent.result.message_id;
}

async function expireGroupSearch(code) {
  const room = groupRooms.get(code);

  if (!room || room.started || room.players.length >= 2) {
    return;
  }

  const chatId = room.chatId;

  const messageIds = [
    room.commandMessageId,
    room.messageId
  ].filter(Boolean);

  cleanupGroupRoom(code);

  for (const messageId of messageIds) {
    try {
      await telegramApi('deleteMessage', {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error(error.message);
    }
  }
}

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
        inline_keyboard: [[{
          text: '🎮 ОЙЫНҒА КІРУ',
          url: MINI_APP_LINK + 'group_' + token
        }]]
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
    room.players.map(
      player => sendPlayerGroupLink(room, player)
    )
  );

  room.privateSent = results.filter(Boolean).length;

  try {
    await updateGroupRoom(room);
  } catch (error) {
    console.error(error.message);
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
      console.error(error.message);
    }
  }
}

/* ---------- Топ callback ---------- */

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

  if (isGroupBlocked(room.chatId)) {
    await answerCallback(
      query.id,
      '🚫 Бұл топта бот бұғатталған.',
      true
    );

    cleanupGroupRoom(code);

    return true;
  }

  const already = room.players.some(
    player => String(player.id) === userId
  );

  if (already) {
    await answerCallback(
      query.id,
      'Сіз ойынға қосылып қойғансыз.'
    );

    return true;
  }

  if (room.players.length >= 2) {
    await answerCallback(
      query.id,
      'Ойыншылар саны толды.',
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
    clearTimeout(room.searchTimer);
    room.searchTimer = null;

    await sendLinksToBothPlayers(room);
  } else {
    try {
      await updateGroupRoom(room);
    } catch (error) {
      console.error(error.message);
    }
  }

  return true;
}

/* ---------- Топқа қосылғандағы хабарлама ---------- */

async function sendGroupWelcome(chatId) {
  if (isGroupBlocked(chatId)) return;

  const text =
    '♟️ <b>Сәлеметсіздер ме!</b>\n\n' +
    'Мен — Шашка ойынының ботымын! 🎮\n\n' +
    'Енді осы топта достарыңызбен шашка ойнай аласыздар.\n\n' +
    '🎯 Ойынды бастау үшін:\n' +
    '<b>/game</b> командасын жазыңыз.\n\n' +
    '👥 Екі ойыншы қосылып, ойын басталады!\n\n' +
    'Жеңіске жеткен ойыншыны анықтаймыз. Сәтті ойын! 🏆';

  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/* ---------- Telegram webhook ---------- */

async function handleTelegramWebhook(req, res) {
  if (
    req.headers['x-telegram-bot-api-secret-token'] !==
    WEBHOOK_SECRET
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

    /* Callback */

    if (update.callback_query) {
      if (
        await handleAdminCallback(
          update.callback_query
        )
      ) {
        res.writeHead(200);
        return res.end('ok');
      }

      await handleGroupCallback(
        update.callback_query
      );

      res.writeHead(200);
      return res.end('ok');
    }

    /* Боттың топқа қосылуы немесе шығарылуы */

    if (update.my_chat_member) {
      const memberUpdate = update.my_chat_member;
      const chat = memberUpdate.chat;
      const newMember = memberUpdate.new_chat_member;
      const status = newMember.status;

      if (
        ['group', 'supergroup'].includes(chat.type)
      ) {
        if (
          status === 'left' ||
          status === 'kicked' ||
          (
            status === 'restricted' &&
            !newMember.is_member
          )
        ) {
          removeGroup(chat.id);
        } else if (
          status === 'member' ||
          status === 'administrator' ||
          (
            status === 'restricted' &&
            newMember.is_member
          )
        ) {
          await registerGroup(chat);
        }
      }

      res.writeHead(200);
      return res.end('ok');
    }

    const message = update.message;

    if (!message) {
      res.writeHead(200);
      return res.end('ok');
    }

    /* Админ командасы */

    if (
      message.chat.type === 'private' &&
      /^\/admin(?:@\w+)?(?:\s|$)/.test(
        message.text || ''
      )
    ) {
      if (isAdmin(message.from.id)) {
        adminBroadcastDrafts.delete(
          String(message.from.id)
        );

        adminActions.delete(
          String(message.from.id)
        );

        await openAdmin(message.chat.id);
      } else {
        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          text:
            '⛔ Сізде админ панельге кіруге рұқсат жоқ.'
        });
      }

      res.writeHead(200);
      return res.end('ok');
    }

    /* Админнің ID енгізуі және хабарлама жіберуі */

    if (
      message.chat.type === 'private' &&
      message.from &&
      isAdmin(message.from.id) &&
      typeof message.text === 'string'
    ) {
      const adminId = String(message.from.id);
      const input = message.text.trim();

      if (/^\/cancel(?:@\w+)?$/i.test(input)) {
        adminActions.delete(adminId);
        adminBroadcastDrafts.delete(adminId);

        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          text: '❌ Әрекет тоқтатылды.',
          reply_markup: adminKeyboard(adminId)
        });

        res.writeHead(200);
        return res.end('ok');
      }

      const action = adminActions.get(adminId);

      if (action) {
        if (input.startsWith('/')) {
          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: '⚠️ ID нөмірін жіберіңіз немесе /cancel жазыңыз.'
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (!/^-?\d+$/.test(input)) {
          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: '⚠️ ID қате. Тек сан енгізіңіз.'
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (action.action === 'add_admin') {
          if (input === OWNER_ID) {
            await telegramApi('sendMessage', {
              chat_id: message.chat.id,
              text: 'Бұл ID негізгі админге тиесілі.'
            });

            res.writeHead(200);
            return res.end('ok');
          }

          if (admins.has(input)) {
            await telegramApi('sendMessage', {
              chat_id: message.chat.id,
              text: 'Бұл адам админ болып тіркелген.'
            });

            res.writeHead(200);
            return res.end('ok');
          }

          admins.set(input, {
            id: input,
            permissions: [...DEFAULT_PERMISSIONS]
          });

          saveAdmins();
          adminActions.delete(adminId);

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text:
              '✅ <b>АДМИН ҚОСЫЛДЫ</b>\n\n' +
              `🆔 ID: <code>${escapeHtml(input)}</code>\n\n` +
              'Бастапқы рұқсаттар:\n' +
              '📊 Статистика\n' +
              '👥 Қосылған топтар\n' +
              '🎮 Белсенді ойындар\n\n' +
              'Қалған рұқсаттарды админдерді басқару бөлімінен бере аласыз.',
            parse_mode: 'HTML',
            reply_markup: adminKeyboard(adminId)
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (action.action === 'block_group') {
          const ok = blockGroup(input);

          adminActions.delete(adminId);

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: ok
              ? '🚫 <b>ТОП БЛОКТАЛДЫ</b>\n\n' +
                `🆔 ID: <code>${escapeHtml(input)}</code>\n\n` +
                'Бұл топта боттың ойын функциялары тоқтатылды.'
              : '⚠️ Топ ID дұрыс емес.',
            parse_mode: 'HTML',
            reply_markup: adminKeyboard(adminId)
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (action.action === 'unblock_group') {
          const ok = unblockGroup(input);

          adminActions.delete(adminId);

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: ok
              ? '🔓 <b>ТОП БЛОКТАН ШЫҒАРЫЛДЫ</b>\n\n' +
                `🆔 ID: <code>${escapeHtml(input)}</code>`
              : '⚠️ Бұл топ блокталмаған.',
            parse_mode: 'HTML',
            reply_markup: adminKeyboard(adminId)
          });

          res.writeHead(200);
          return res.end('ok');
        }
      }

      /* Хабарлама тарату мәтіні */

      const draft = adminBroadcastDrafts.get(adminId);

      if (draft && draft.waiting) {
        if (!input) {
          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: '⚠️ Хабарлама бос болмауы керек.'
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (input.length > 4000) {
          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: '⚠️ Хабарлама 4000 белгіден аспауы керек.'
          });

          res.writeHead(200);
          return res.end('ok');
        }

        adminBroadcastDrafts.set(adminId, {
          waiting: false,
          text: input
        });

        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          text:
            '📢 <b>ХАБАРДЫ ТЕКСЕРІҢІЗ</b>\n\n' +
            'Қол жетімді барлық топтарға мына мәтін жіберіледі:\n\n' +
            escapeHtml(input) +
            '\n\n⚠️ Жіберуді растайсыз ба?',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{
                text: '✅ БАРЛЫҚ ТОПҚА ЖІБЕРУ',
                callback_data: 'adm:broadcast:confirm'
              }],
              [{
                text: '❌ БОЛДЫРМАУ',
                callback_data: 'adm:broadcast:cancel'
              }]
            ]
          }
        });

        res.writeHead(200);
        return res.end('ok');
      }
    }

    /* Топқа қосылғандағы сәлемдесу */

    if (
      ['group', 'supergroup'].includes(
        message.chat.type
      ) &&
      Array.isArray(message.new_chat_members)
    ) {
      const botId = BOT_TOKEN.split(':')[0];

      const botWasAdded =
        message.new_chat_members.some(
          member =>
            member.is_bot &&
            String(member.id) === botId
        );

      if (botWasAdded) {
        await registerGroup(message.chat);
        await sendGroupWelcome(message.chat.id);
      }
    }

    if (typeof message.text !== 'string') {
      res.writeHead(200);
      return res.end('ok');
    }

    /* Топтағы командаларға блок тексеру */

    if (
      ['group', 'supergroup'].includes(
        message.chat.type
      ) &&
      isGroupBlocked(message.chat.id)
    ) {
      res.writeHead(200);
      return res.end('ok');
    }

    /* Топтық ойын ашу */

    if (
      /^\/game(?:@\w+)?(?:\s|$)/.test(
        message.text
      ) &&
      ['group', 'supergroup'].includes(
        message.chat.type
      )
    ) {
      await registerGroup(message.chat);

      const creatorId = String(message.from.id);

      if (groupPlayerRooms.has(creatorId)) {
        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          reply_to_message_id: message.message_id,
          text:
            `${playerLink({
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

      const creator = {
        id: creatorId,
        username: message.from.username || '',
        first_name: message.from.first_name || '',
        last_name: message.from.last_name || ''
      };

      const room = {
        code,
        chatId: message.chat.id,
        commandMessageId: message.message_id,
        messageId: null,
        players: [creator],
        entered: new Set(),
        connected: new Set(),
        tokens: new Map(),
        pendingGame: null,
        started: false,
        timer: null,
        searchTimer: null,
        waitingTimer: null,
        waitingDeadline: null,
        firstConnectedId: null,
        privateSent: 0
      };

      groupPlayerRooms.set(creatorId, code);

      room.timer = setTimeout(() => {
        cleanupGroupRoom(code);
      }, GROUP_TTL);

      if (room.timer.unref) {
        room.timer.unref();
      }

      groupRooms.set(code, room);

      const sent = await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text: roomText(room),
        parse_mode: 'HTML',
        reply_markup: roomKeyboard(room)
      });

      room.messageId = sent.result.message_id;

      room.searchTimer = setTimeout(() => {
        expireGroupSearch(code).catch(
          error => console.error(error.message)
        );
      }, GROUP_SEARCH_MS);

      if (room.searchTimer.unref) {
        room.searchTimer.unref();
      }
    }

    /* Start */

    if (
      /^\/start(?:@\w+)?(?:\s|$)/.test(
        message.text
      ) &&
      message.chat.type === 'private'
    ) {
      await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text:
          '♟️ Қош келдіңіз!\n\n' +
          'Шашка ойынын бастаңыз және қарсыластарыңызды жеңіңіз! 🎮',
        reply_markup: {
          inline_keyboard: [
            [{
              text: '🎮 ОЙЫНДЫ БАСТАУ',
              web_app: {
                url: 'https://shashka-mini-app.onrender.com'
              }
            }],
            [{
              text: '👥 ГРУППАДА ОЙНАУ',
              url: 'https://t.me/shashkaoyinibot?startgroup=true'
            }]
          ]
        }
      });
    }

    res.writeHead(200);
    res.end('ok');
  } catch (error) {
    console.error(
      'Telegram webhook қатесі:',
      error.message
    );

    res.writeHead(200);
    res.end('ok');
  }
}

/* ---------- Telegram баптаулары ---------- */

async function setupTelegramWebhook() {
  if (!BOT_TOKEN || DEV) return;

  try {
    await telegramApi('setMyCommands', {
      commands: [{
        command: 'game',
        description: 'Шашка ойынын құру'
      }],
      scope: {
        type: 'all_group_chats'
      }
    });

    await telegramApi('setMyCommands', {
      commands: [
        {
          command: 'start',
          description: 'Ботты іске қосу'
        },
        {
          command: 'admin',
          description: 'Админ панель'
        }
      ],
      scope: {
        type: 'all_private_chats'
      }
    });

    console.log('Telegram командалары орнатылды');

    const result = await telegramApi('setWebhook', {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: [
        'message',
        'callback_query',
        'my_chat_member'
      ]
    });

    console.log(
      'Telegram webhook:',
      result.description
    );
  } catch (error) {
    console.error(
      'Telegram баптау қатесі:',
      error.message
    );
  }
}

/* ---------- HTTP ---------- */

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(
    (req.url || '/').split('?')[0]
  );

  if (
    req.method === 'POST' &&
    url === '/telegram-webhook'
  ) {
    return handleTelegramWebhook(req, res);
  }

  if (url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'text/plain'
    });

    return res.end('ok');
  }

  const rel = url === '/'
    ? 'index.html'
    : url.replace(/^\/+/, '');

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
      'Content-Type':
        MIME[path.extname(file)] ||
        'application/octet-stream',
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

/* ---------- Ойын функциялары ---------- */

function startGroupWaitingTimer(
  room,
  g,
  firstPlayerId
) {
  if (
    !room ||
    !g ||
    room.started ||
    !g.waitingForOpponent
  ) {
    return;
  }

  if (!room.firstConnectedId) {
    room.firstConnectedId = String(firstPlayerId);
  }

  if (!room.waitingDeadline) {
    room.waitingDeadline =
      Date.now() + GROUP_WAIT_MS;
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
      room.waitingTimer = setTimeout(
        check,
        remaining
      );

      if (room.waitingTimer.unref) {
        room.waitingTimer.unref();
      }

      return;
    }

    room.waitingTimer = null;

    if (
      room.started ||
      !games.has(g.id) ||
      !g.waitingForOpponent
    ) {
      return;
    }

    const winnerSide = sideOfUser(
      g,
      room.firstConnectedId
    );

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
          first_name: winnerUser.username
            ? ''
            : winnerUser.name
        })}`;

      if (reason === 'timeout') {
        resultText +=
          '\n⏰ Қарсыласының жүріс уақыты аяқталды.';
      } else if (reason === 'opponent_timeout') {
        resultText +=
          '\n⏰ Қарсыласы 1 минут 30 секунд ішінде ойынға кірмеді.';
      } else if (reason === 'resign') {
        resultText +=
          '\n🏁 Қарсыласы ойынды аяқтады.';
      } else if (reason === 'left') {
        resultText +=
          '\n📴 Қарсыласының байланысы үзілді.';
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
          console.error(error.message);
        }
      }

      // Блокталған топқа хабар жібермеу
      if (isGroupBlocked(chatId)) return;

      try {
        await telegramApi('sendMessage', {
          chat_id: chatId,
          text:
            '♟️ <b>ШАШКА ОЙЫНЫ АЯҚТАЛДЫ!</b>\n\n' +
            resultText,
          parse_mode: 'HTML'
        });
      } catch (error) {
        console.error(error.message);
      }
    })();
  }
}

function startGroupMatch(room, g) {
  if (
    !room ||
    !g ||
    room.started ||
    !games.has(g.id) ||
    isGroupBlocked(room.chatId)
  ) {
    return;
  }

  const first = users.get(
    String(room.players[0].id)
  );

  const second = users.get(
    String(room.players[1].id)
  );

  const bothConnected =
    first &&
    second &&
    first.ws &&
    first.ws.readyState === 1 &&
    second.ws &&
    second.ws.readyState === 1 &&
    room.connected.has(String(first.id)) &&
    room.connected.has(String(second.id));

  if (!bothConnected) return;

  room.started = true;

  incrementGroupGameCount(room.chatId);

  g.waitingForOpponent = false;

  clearGroupWaitingTimer(room);
  clearTimeout(room.timer);
  clearTimeout(room.searchTimer);

  startTurnTimer(g);

  send(first, gameState(g, first.id));
  send(second, gameState(g, second.id));

  send(first, {
    t: 'group_started'
  });

  send(second, {
    t: 'group_started'
  });

  replaceGroupRoomMessage(room).catch(
    error => console.error(error.message)
  );
}

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

  if (
    !tokenInfo ||
    tokenInfo.userId !== String(u.id)
  ) {
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

  if (isGroupBlocked(room.chatId)) {
    cleanupGroupRoom(room.code);

    return send(u, {
      t: 'group_error',
      code: 'blocked'
    });
  }

  if (room.started) {
    const existingGame = room.pendingGame;

    if (
      existingGame &&
      games.has(existingGame.id) &&
      (
        existingGame.p.w === u.id ||
        existingGame.p.b === u.id
      )
    ) {
      send(u, gameState(existingGame, u.id));
      sendTurnTimer(existingGame);

      return;
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

  if (!room.firstConnectedId) {
    room.firstConnectedId = String(u.id);
  }

  const first = users.get(
    String(room.players[0].id)
  );

  const second = users.get(
    String(room.players[1].id)
  );

  const bothConnected =
    first &&
    second &&
    first.ws &&
    first.ws.readyState === 1 &&
    second.ws &&
    second.ws.readyState === 1 &&
    room.connected.has(String(first.id)) &&
    room.connected.has(String(second.id));

  if (bothConnected) {
    startGroupMatch(room, g);
    return;
  }

  startGroupWaitingTimer(
    room,
    g,
    room.firstConnectedId
  );

  send(u, gameState(g, u.id));
  send(u, groupWaitingMessage(room));

  sendGroupWaiting(room);
}

/* ---------- Шақыру ---------- */

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

  if (invite.timer.unref) {
    invite.timer.unref();
  }

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

/* ---------- WebSocket хабарламалары ---------- */

function handle(u, m) {
  switch (m.t) {
    case 'group_join':
      return joinGroupGame(
        u,
        m.token || m.code
      );

    case 'find': {
      if (u.game && games.has(u.game)) {
        return send(
          u,
          gameState(games.get(u.game), u.id)
        );
      }

      if (queue.includes(u.id)) {
        return send(u, {
          t: 'searching'
        });
      }

      queue = queue.filter(id => {
        const user = users.get(id);

        return user &&
          user.ws &&
          !user.game;
      });

      const oppId = queue.shift();

      if (oppId) {
        const opp = users.get(oppId);

        if (opp && !opp.game) {
          return startGame(opp, u);
        }
      }

      queue.push(u.id);

      return send(u, {
        t: 'searching'
      });
    }

    case 'cancel':
      dequeue(u.id);

      return send(u, {
        t: 'idle'
      });

    case 'invite_create':
      return createInvite(u);

    case 'invite_join':
      return joinInvite(u, m.code);

    case 'invite_cancel':
      removeUserInvite(u.id);

      return send(u, {
        t: 'invite_cancelled'
      });

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

      if (
        g.turnTimerSide === side &&
        g.turnDeadline &&
        Date.now() >= g.turnDeadline
      ) {
        return finish(
          g,
          G.other(side),
          'timeout'
        );
      }

      const step = G.applyMove(
        g.st,
        m.from,
        m.to
      );

      if (!step) {
        return send(u, gameState(g, u.id));
      }

      const base = {
        t: 'move',
        step,
        turn: g.st.turn,
        score: g.st.score,
        board: G.view(g.st),
        chainPos: g.st.chain
          ? g.st.chain.pos
          : null
      };

      for (const id of [g.p.w, g.p.b]) {
        send(users.get(id), {
          ...base,
          legal: legalList(
            g,
            sideOfUser(g, id)
          )
        });
      }

      if (g.st.over) {
        finish(
          g,
          g.st.over.winner,
          g.st.over.reason
        );

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

      if (
        !g ||
        g.waitingForOpponent ||
        typeof m.text !== 'string'
      ) {
        return;
      }

      const text = m.text.trim().slice(0, 300);
      const now = Date.now();

      if (
        !text ||
        now - (g.lastChat[u.id] || 0) < 400
      ) {
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

/* ---------- Авторизация ---------- */

function onAuth(ws, m) {
  let info = null;

  if (DEV && m.dev && m.dev.id) {
    info = {
      id: 'dev' + String(m.dev.id).slice(0, 20),
      name: String(
        m.dev.name || 'Dev'
      ).slice(0, 40),
      avatar: null
    };
  } else {
    info = verifyInitData(
      m.initData,
      BOT_TOKEN
    );
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
    send(u, {
      t: 'replaced'
    });

    u.ws.close();
  }

  if (!u) {
    u = {
      id: info.id,
      game: null
    };

    users.set(info.id, u);
  }

  Object.assign(u, info, {
    ws
  });

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
      const roomCode = groupPlayerRooms.get(
        String(u.id)
      );

      const room = roomCode &&
        groupRooms.get(roomCode);

      if (room) {
        if (isGroupBlocked(room.chatId)) {
          cleanupGroupRoom(room.code);

          return send(u, {
            t: 'group_error',
            code: 'blocked'
          });
        }

        room.connected.add(String(u.id));

        if (!room.firstConnectedId) {
          room.firstConnectedId = String(u.id);
        }

        const first = users.get(
          String(room.players[0].id)
        );

        const second = users.get(
          String(room.players[1].id)
        );

        const bothConnected =
          first &&
          second &&
          first.ws &&
          first.ws.readyState === 1 &&
          second.ws &&
          second.ws.readyState === 1 &&
          room.connected.has(String(first.id)) &&
          room.connected.has(String(second.id));

        if (
          bothConnected &&
          room.pendingGame
        ) {
          startGroupMatch(
            room,
            room.pendingGame
          );
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

    if (!m || typeof m.t !== 'string') {
      return;
    }

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

    const roomCode = groupPlayerRooms.get(
      String(u.id)
    );

    const room = roomCode &&
      groupRooms.get(roomCode);

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
      users.get(
        g.p[G.other(side)]
      ),
      {
        t: 'away',
        left: true,
        seconds: GRACE
      }
    );

    g.timers[u.id] = setTimeout(() => {
      finish(
        g,
        G.other(side),
        'left'
      );
    }, GRACE * 1000);
  });
});

/* ---------- WebSocket ping ---------- */

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 15000).unref();

/* ---------- Серверді іске қосу ---------- */

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(
      `Shashka сервері: http://localhost:${PORT}` +
      `${DEV ? ' (DEV режимі)' : ''}`
    );

    console.log(
      'Негізгі админ:',
      OWNER_ID
    );

    console.log(
      'Қосымша админдер:',
      admins.size
    );

    console.log(
      'Блокталған топтар:',
      blockedGroups.size
    );

    setupTelegramWebhook();
  });
}

module.exports = {
  server,
  games,
  users,
  invites,
  groupRooms,
  savedGroups,
  admins,
  blockedGroups
};
