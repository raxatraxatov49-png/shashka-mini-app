'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const G = require('./lib/game');
const { verifyInitData } = require('./lib/telegram');
const { createShop } = require('./lib/shop');
const { t: tx, normLang, detectLang, DEFAULT_LANG } = require('./lib/i18n');

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

/*
  ДЕРЕКТЕРДІ САҚТАУ
  -----------------
  Render-дің файлдық жүйесі уақытша: әр deploy/restart кезінде
  groups.json, admins.json сияқты файлдар өшіп кетеді.
  Сондықтан тұрақты сақтау қажет. Екі нұсқа бар:

  1) Upstash Redis (тегін, диск қажет емес) — ұсынылады.
     Render Environment-ке қосыңыз:
       UPSTASH_REDIS_REST_URL
       UPSTASH_REDIS_REST_TOKEN

  2) Render Persistent Disk (ақылы) — Mount Path: /var/data,
     Environment: DATA_DIR=/var/data

  Екеуі де жоқ болса — файлға жазады, бірақ deploy кезінде өшеді.
*/

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'shashka:';

const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const BLOCKED_FILE = path.join(DATA_DIR, 'blocked-groups.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

const STORAGE_MODE = USE_REDIS
  ? 'Upstash Redis'
  : (process.env.DATA_DIR ? 'Persistent Disk (' + DATA_DIR + ')' : 'Файл (УАҚЫТША!)');

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

async function redisCommand(args) {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + REDIS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || ('Redis HTTP ' + response.status));
  }

  return result.result;
}

/* Деректерді жүктеу: Redis -> файл (бұрынғы деректерді көшіру) -> fallback */
async function storeLoad(name, file, fallback) {
  if (USE_REDIS) {
    const raw = await redisCommand(['GET', REDIS_PREFIX + name]);

    if (raw !== null && raw !== undefined) {
      return JSON.parse(raw);
    }

    // Redis-те жоқ: жергілікті файл болса, бір рет көшіреміз
    const local = readJSON(file, undefined);

    if (local !== undefined) {
      await redisCommand(['SET', REDIS_PREFIX + name, JSON.stringify(local)]);
      return local;
    }

    return fallback;
  }

  return readJSON(file, fallback);
}

const writeQueue = new Map();
let flushPromise = null;

async function flushWrites() {
  while (writeQueue.size) {
    const [name, json] = writeQueue.entries().next().value;

    try {
      await redisCommand(['SET', REDIS_PREFIX + name, json]);

      if (writeQueue.get(name) === json) {
        writeQueue.delete(name);
      }
    } catch (error) {
      console.error('Redis жазу қатесі:', name, error.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

function flushStorage() {
  if (!flushPromise) {
    flushPromise = flushWrites().finally(() => {
      flushPromise = null;
    });
  }

  return flushPromise;
}

function storeSave(name, file, data) {
  try {
    writeJSON(file, data);
  } catch (error) {
    console.error('Файлға жазу қатесі:', file, error.message);
  }

  if (USE_REDIS) {
    writeQueue.set(name, JSON.stringify(data));
    flushStorage();
  }
}

/* ---------- Рұқсаттар ---------- */

const PERMISSIONS = {
  stats: '📊 Статистика',
  groups: '👥 Қосылған топтар',
  games: '🎮 Белсенді ойындар',
  broadcast: '📢 Топтарға хабарлама',
  group_manage: '🚫 Топтарды басқару',
  admin_manage: '👑 Админдерді басқару',
  coins: '🪙 Койн беру'
};

const DEFAULT_PERMISSIONS = [
  'stats',
  'groups',
  'games'
];

function parseAdmins(data) {
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

const admins = new Map();

function saveAdmins() {
  storeSave('admins', ADMINS_FILE, [...admins.values()]);
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

const savedGroups = new Map();

function saveGroups() {
  storeSave('groups', GROUPS_FILE, [...savedGroups.values()]);
}

/* ---------- Блокталған топтар ---------- */

const blockedGroups = new Set();

function saveBlockedGroups() {
  storeSave('blocked', BLOCKED_FILE, [...blockedGroups]);
}

/* ---------- Тұрақты статистика ---------- */

const stats = {
  totalGames: 0,
  totalGroupGames: 0,
  users: {}
};

/* ---------- Дүкен: койн, тақта/тас, дос шақыру ---------- */

const SHOP_FILE = path.join(DATA_DIR, 'shop.json');

const saveShop = data => storeSave('shop', SHOP_FILE, data);

let shop = createShop({}, saveShop);

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Ойыншы алғаш қашан кіргенін stats.users-тен аламыз
const firstSeen = {
  get: id => (hasOwn(stats.users, id) ? stats.users[id] : undefined),
  has: id => hasOwn(stats.users, id)
};

const shopMsg = (id, ev) => {
  const m = Object.assign({ t: 'shop' }, shop.view(id));
  if (ev) m.ev = ev;
  return m;
};

function saveStats() {
  storeSave('stats', STATS_FILE, stats);
}

function trackUser(id) {
  id = String(id);

  if (stats.users[id]) return;

  stats.users[id] = Date.now();
  saveStats();
}

/* ---------- Тіл баптаулары (чат / топ бойынша) ---------- */

const LANGS_FILE = path.join(DATA_DIR, 'langs.json');
const chatLangs = new Map();

function getLang(chatId) {
  return normLang(chatLangs.get(String(chatId)));
}

function hasLang(chatId) {
  return chatLangs.has(String(chatId));
}

function setLang(chatId, lang) {
  chatLangs.set(String(chatId), normLang(lang));
  storeSave('langs', LANGS_FILE, Object.fromEntries(chatLangs));
}

function tgLangFromInitData(initData) {
  try {
    const user = JSON.parse(new URLSearchParams(initData).get('user'));
    return (user && user.language_code) || '';
  } catch {
    return '';
  }
}

// Мини апп тілі: жеке чатта таңдалған тіл, болмаса Telegram тілі, болмаса қазақша
function userLang(u) {
  const id = String(u.id);

  if (chatLangs.has(id)) return chatLangs.get(id);

  return normLang(detectLang(u.tgLang));
}

/* ---------- Пайдаланушыларға хабар тарату ---------- */

const UNREACHABLE_FILE = path.join(DATA_DIR, 'unreachable.json');
const unreachableUsers = new Set();
let userBroadcastRunning = false;

function saveUnreachable() {
  storeSave('unreachable', UNREACHABLE_FILE, [...unreachableUsers]);
}

// Ботты ашқан / мини аппқа кірген, бірақ ботты бұғаттамаған адамдар
function reachableUserIds() {
  return Object.keys(stats.users).filter(
    id => !unreachableUsers.has(id)
  );
}

async function runUserBroadcast(adminChatId, fromChatId, messageId) {
  const ids = reachableUserIds();

  let success = 0;
  let failed = 0;
  let unreachable = 0;

  for (const id of ids) {
    let attempts = 0;

    while (attempts < 3) {
      attempts++;

      try {
        await telegramApi('copyMessage', {
          chat_id: id,
          from_chat_id: fromChatId,
          message_id: messageId
        });

        success++;
        break;
      } catch (error) {
        const retryAfter = Number(
          error.telegram?.parameters?.retry_after || 0
        );

        if (retryAfter > 0 && attempts < 3) {
          await delay((retryAfter + 1) * 1000);
          continue;
        }

        const description = String(error.message || '');

        if (
          /blocked|deactivated|chat not found|can't initiate|user not found|forbidden/i
            .test(description)
        ) {
          unreachableUsers.add(id);
          unreachable++;
        } else {
          failed++;
        }

        console.error(
          'Пайдаланушыға хабар жіберілмеді:',
          id,
          description
        );

        break;
      }
    }

    await delay(50);
  }

  if (unreachable) saveUnreachable();

  try {
    await telegramApi('sendMessage', {
      chat_id: adminChatId,
      text:
        '📨 <b>ХАБАР ТАРАТУ АЯҚТАЛДЫ</b>\n\n' +
        `👤 Барлық алушы: ${ids.length}\n` +
        `✅ Жеткізілді: ${success}\n` +
        `🚫 Ботты бұғаттаған / қолжетімсіз: ${unreachable}\n` +
        `❌ Басқа қате: ${failed}`,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Админге есеп жіберілмеді:', error.message);
  }

  userBroadcastRunning = false;
}

/* ---------- Рейтинг (топтағы ойын очколары) ---------- */

const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const WIN_POINTS = 10;

// chatId -> Map(userId -> { name, points, games, wins })
const ratings = new Map();

const RANKS = [
  { key: 'bronze', min: 0, icon: '🥉' },
  { key: 'silver', min: 50, icon: '🥈' },
  { key: 'gold', min: 150, icon: '🥇' },
  { key: 'platinum', min: 300, icon: '💠' },
  { key: 'diamond', min: 600, icon: '💎' },
  { key: 'master', min: 1000, icon: '👑' }
];

function saveRatings() {
  const data = {};

  for (const [chatId, members] of ratings) {
    data[chatId] = Object.fromEntries(members);
  }

  storeSave('ratings', RATINGS_FILE, data);
}

function rankIndex(points) {
  let index = 0;

  RANKS.forEach((rank, i) => {
    if (points >= rank.min) index = i;
  });

  return index;
}

function rankLabel(lang, index) {
  const rank = RANKS[index];

  return rank.icon + ' ' + tx(lang, 'rank_' + rank.key);
}

// Ойыншының барлық топтардағы жалпы көрсеткіші
function userTotals(userId) {
  const id = String(userId);
  const total = { points: 0, games: 0, wins: 0 };

  for (const members of ratings.values()) {
    const entry = members.get(id);

    if (!entry) continue;

    total.points += entry.points || 0;
    total.games += entry.games || 0;
    total.wins += entry.wins || 0;
  }

  return total;
}

// Топтың тізімі: очко, жеңіс, ойын саны бойынша
function groupBoard(chatId) {
  const members = ratings.get(String(chatId));

  if (!members) return [];

  return [...members.entries()].sort((a, b) =>
    (b[1].points - a[1].points) ||
    (b[1].wins - a[1].wins) ||
    (a[1].games - b[1].games)
  );
}

function ratingName(userId, fallback) {
  const u = users.get(String(userId));

  return (
    (u && (u.name || u.username)) ||
    fallback ||
    'Ойыншы'
  );
}

// Ойын біткенде екі ойыншыға да жазады. Қайтарады: id -> { before, after }
function recordGroupGame(chatId, ids, winnerId) {
  const key = String(chatId);

  if (!ratings.has(key)) ratings.set(key, new Map());

  const members = ratings.get(key);
  const result = {};

  for (const rawId of ids) {
    const id = String(rawId);
    const before = userTotals(id).points;

    const entry = members.get(id) || {
      name: '',
      points: 0,
      games: 0,
      wins: 0
    };

    entry.name = ratingName(id, entry.name);
    entry.games++;

    if (winnerId && id === String(winnerId)) {
      entry.wins++;
      entry.points += WIN_POINTS;
    }

    members.set(id, entry);

    result[id] = {
      before,
      after: userTotals(id).points
    };
  }

  saveRatings();

  return result;
}

function ratingMessage(chatId) {
  const lang = getLang(chatId);
  const board = groupBoard(chatId).slice(0, 10);

  if (!board.length) {
    return tx(lang, 'ratingEmpty');
  }

  const medals = ['🥇', '🥈', '🥉'];

  const lines = board.map(([id, entry], index) => {
    const place = medals[index] || `${index + 1}.`;
    const rank = RANKS[rankIndex(userTotals(id).points)].icon;

    return (
      `${place} ${escapeHtml(entry.name || 'Ойыншы')} — ` +
      `<b>${entry.points}</b> ⭐ ${rank}`
    );
  });

  return (
    tx(lang, 'ratingTitle') + '\n\n' +
    lines.join('\n') + '\n\n' +
    tx(lang, 'ratingFooter')
  );
}

function meMessage(chatId, from, inGroup) {
  const lang = getLang(chatId);
  const totals = userTotals(from.id);
  const index = rankIndex(totals.points);

  const name =
    [from.first_name, from.last_name].filter(Boolean).join(' ') ||
    from.username ||
    'Ойыншы';

  const lines = [
    `👤 <b>${escapeHtml(name)}</b>`,
    '',
    `${tx(lang, 'meRank')}: ${rankLabel(lang, index)}`,
    `${tx(lang, 'mePoints')}: <b>${totals.points}</b>`,
    `${tx(lang, 'meGames')}: ${totals.games}`,
    `${tx(lang, 'meWins')}: ${totals.wins}`
  ];

  if (index < RANKS.length - 1) {
    lines.push(
      '',
      tx(lang, 'meNext', {
        rank: rankLabel(lang, index + 1),
        left: RANKS[index + 1].min - totals.points
      })
    );
  } else {
    lines.push('', tx(lang, 'meMax'));
  }

  if (inGroup) {
    const place = groupBoard(chatId).findIndex(
      ([id]) => id === String(from.id)
    );

    if (place >= 0) {
      lines.push(tx(lang, 'mePlace', { place: place + 1 }));
    }
  }

  lines.push('', tx(lang, 'meNote'));

  return lines.join('\n');
}

async function initStorage() {
  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const adminData = await storeLoad('admins', ADMINS_FILE, []);
      const groupData = await storeLoad('groups', GROUPS_FILE, []);
      const blockedData = await storeLoad('blocked', BLOCKED_FILE, []);
      const statsData = await storeLoad('stats', STATS_FILE, null);
      const langData = await storeLoad('langs', LANGS_FILE, {});
      const ratingData = await storeLoad('ratings', RATINGS_FILE, {});
      const shopData = await storeLoad('shop', SHOP_FILE, {});
      const unreachableData = await storeLoad('unreachable', UNREACHABLE_FILE, []);

      shop = createShop(shopData, saveShop);

      admins.clear();
      for (const [k, v] of parseAdmins(adminData)) admins.set(k, v);

      savedGroups.clear();
      if (Array.isArray(groupData)) {
        for (const g of groupData) {
          if (g && g.id) savedGroups.set(String(g.id), g);
        }
      }

      blockedGroups.clear();
      if (Array.isArray(blockedData)) {
        for (const id of blockedData) blockedGroups.add(String(id));
      }

      unreachableUsers.clear();
      if (Array.isArray(unreachableData)) {
        for (const id of unreachableData) unreachableUsers.add(String(id));
      }

      ratings.clear();
      if (ratingData && typeof ratingData === 'object') {
        for (const [chatId, members] of Object.entries(ratingData)) {
          ratings.set(
            String(chatId),
            new Map(Object.entries(members || {}))
          );
        }
      }

      chatLangs.clear();
      if (langData && typeof langData === 'object') {
        for (const [id, l] of Object.entries(langData)) {
          chatLangs.set(String(id), normLang(l));
        }
      }

      const groupGamesSum = [...savedGroups.values()].reduce(
        (sum, g) => sum + (Number(g.gameCount) || 0),
        0
      );

      if (statsData && typeof statsData === 'object') {
        stats.totalGames = Number(statsData.totalGames) || 0;
        stats.totalGroupGames = Number(statsData.totalGroupGames) || 0;
        stats.users = statsData.users && typeof statsData.users === 'object'
          ? statsData.users
          : {};
      }

      // Ескі деректерден көшіру: өткен топ ойындарын жоғалтпау
      if (stats.totalGroupGames < groupGamesSum) {
        stats.totalGroupGames = groupGamesSum;
      }

      if (stats.totalGames < stats.totalGroupGames) {
        stats.totalGames = stats.totalGroupGames;
      }

      console.log('Сақтау режимі:', STORAGE_MODE);
      console.log(
        `Жүктелді: топ ${savedGroups.size}, админ ${admins.size}, ` +
        `блок ${blockedGroups.size}, ойыншы ${Object.keys(stats.users).length}`
      );

      if (!USE_REDIS && !process.env.DATA_DIR && process.env.RENDER) {
        console.warn(
          '⚠️ ЕСКЕРТУ: Render-де тұрақты сақтау бапталмаған! ' +
          'Әр deploy кезінде статистика өшеді. ' +
          'UPSTASH_REDIS_REST_URL/TOKEN немесе DATA_DIR+Disk орнатыңыз.'
        );
      }

      return;
    } catch (error) {
      lastError = error;
      console.error(`Деректерді жүктеу қатесі (${attempt}/5):`, error.message);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  // Бос деректермен іске қосып, барын үстіне жазып жібермеу үшін тоқтатамыз
  console.error('Деректерді жүктеу мүмкін болмады. Сервер тоқтатылды:', lastError && lastError.message);
  process.exit(1);
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

  stats.totalGames++;
  saveStats();

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

  if (room.sharedToken) {
    groupTokens.delete(room.sharedToken);
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

  if (hasPermission(adminId, 'broadcast')) {
    rows.push([{
      text: '📨 Пайдаланушыларға хабарлама',
      callback_data: 'adm:ubc'
    }]);
  }

  if (hasPermission(adminId, 'coins')) {
    rows.push([{
      text: '🪙 Койн беру',
      callback_data: 'adm:coins'
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
  try {
    return await telegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } catch (error) {
    // «🔄 Жаңарту» басылғанда мәтін өзгермесе Telegram қате береді — елемейміз
    if (String(error.message).includes('message is not modified')) {
      return null;
    }

    throw error;
  }
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

function requiredPermission(data) {
  if (data === 'adm:stats') return 'stats';

  if (
    data.startsWith('adm:groups:') ||
    data.startsWith('adm:group:')
  ) return 'groups';

  if (data === 'adm:games') return 'games';

  if (data.startsWith('adm:coins')) return 'coins';

  if (
    data.startsWith('adm:broadcast') ||
    data.startsWith('adm:ubc')
  ) return 'broadcast';

  if (
    data.startsWith('adm:block') ||
    data.startsWith('adm:groupblock:') ||
    data.startsWith('adm:groupunblock:')
  ) return 'group_manage';

  if (
    data.startsWith('adm:admin') ||
    data.startsWith('adm:perm:')
  ) return 'admin_manage';

  return null;
}

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

  const needed = requiredPermission(data);

  if (needed && !hasPermission(adminId, needed)) {
    await answerCallback(
      query.id,
      '⛔ Бұл бөлімге рұқсатыңыз жоқ!',
      true
    );

    return true;
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

  /* Пайдаланушыларға хабар тарату */

  if (data === 'adm:ubc') {
    adminBroadcastDrafts.set(adminId, {
      waiting: true,
      target: 'users'
    });

    await editAdminMessage(
      chatId,
      messageId,
      '📨 <b>ПАЙДАЛАНУШЫЛАРҒА ХАБАРЛАМА</b>\n\n' +
      `👤 Алушылар саны: <b>${reachableUserIds().length}</b>\n\n` +
      'Жібергіңіз келген хабарламаны осы чатқа жіберіңіз:\n' +
      '• мәтін немесе сілтеме\n' +
      '• фото (қаласаңыз, жазуымен бірге)\n\n' +
      'Хабарлама дәл өзіңіз жібергендей болып барлығына жетеді.\n\n' +
      '❌ Болдырмау үшін /cancel жазыңыз.',
      {
        inline_keyboard: [[{
          text: '❌ Болдырмау',
          callback_data: 'adm:ubc:cancel'
        }]]
      }
    );

    await answerCallback(query.id, 'Хабарлама күтілуде.');

    return true;
  }

  if (data === 'adm:ubc:confirm') {
    const draft = adminBroadcastDrafts.get(adminId);

    if (!draft || draft.target !== 'users' || !draft.source) {
      await answerCallback(query.id, 'Хабарлама табылмады.', true);
      return true;
    }

    if (userBroadcastRunning) {
      await answerCallback(
        query.id,
        'Алдыңғы тарату әлі аяқталған жоқ.',
        true
      );
      return true;
    }

    userBroadcastRunning = true;
    adminBroadcastDrafts.delete(adminId);

    await answerCallback(query.id, 'Жіберу басталды!');

    await editAdminMessage(
      chatId,
      messageId,
      '📨 <b>ХАБАР ТАРАТЫЛУДА...</b>\n\n' +
      'Аяқталған соң есеп жіберемін.',
      {
        inline_keyboard: [[{
          text: '🔙 Басты мәзір',
          callback_data: 'adm:home'
        }]]
      }
    );

    runUserBroadcast(
      chatId,
      draft.source.chatId,
      draft.source.messageId
    ).catch(error => {
      userBroadcastRunning = false;
      console.error(error.message);
    });

    return true;
  }

  if (data === 'adm:ubc:cancel') {
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

  /* Койн беру */

  if (data === 'adm:coins') {
    adminActions.set(adminId, {
      action: 'coins_id'
    });

    await editAdminMessage(
      chatId,
      messageId,
      '🪙 <b>КОЙН БЕРУ</b>\n\n' +
      'Койн беретін адамның Telegram ID нөмірін жіберіңіз.\n\n' +
      '❌ Болдырмау: /cancel',
      {
        inline_keyboard: [[{
          text: '🔙 Басты мәзір',
          callback_data: 'adm:home'
        }]]
      }
    );

    await answerCallback(query.id, 'Telegram ID күтілуде.');

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

    const text =
      '📊 <b>БОТ СТАТИСТИКАСЫ</b>\n\n' +
      `👥 Қосылған топтар: ${all.length}\n` +
      `🌐 Ашық топтар: ${publicCount}\n` +
      `🔒 Жабық топтар: ${privateCount}\n` +
      `🚫 Блокталған топтар: ${blockedGroups.size}\n\n` +
      `🎮 Барлық ойындар: ${stats.totalGames}\n` +
      `👥 Топтағы ойындар: ${stats.totalGroupGames}\n` +
      `⚔️ Белсенді ойындар: ${games.size}\n\n` +
      `👤 Барлық ойыншылар: ${Object.keys(stats.users).length}\n` +
      `🟢 Қазір онлайн: ${[...users.values()].filter(u => u.ws).length}\n\n` +
      `💾 Сақтау: ${escapeHtml(STORAGE_MODE)}`;

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

/* Топтағы батырма үшін ортақ токен (тек осы бөлменің 2 ойыншысы кіре алады) */
function createSharedToken(room) {
  if (room.sharedToken) return room.sharedToken;

  const token = crypto.randomBytes(16).toString('hex');

  room.sharedToken = token;

  groupTokens.set(token, {
    code: room.code,
    userId: null,
    shared: true
  });

  return token;
}

function roomText(room) {
  const lang = getLang(room.chatId);

  let text = tx(lang, 'roomTitle') + '\n\n';

  room.players.forEach((player, index) => {
    const id = String(player.id);
    const entered = room.entered.has(id);

    text +=
      `${index + 1}. ${playerLink(player)}` +
      `${entered ? ' ✅' : ''}\n`;
  });

  if (room.players.length < 2) {
    text += tx(lang, 'roomSearching');
  } else if (!room.started) {
    text += tx(lang, 'roomFound');
  } else {
    text += tx(lang, 'roomStarted');
  }

  return text;
}

function roomKeyboard(room) {
  const lang = getLang(room.chatId);

  if (room.players.length < 2) {
    return {
      inline_keyboard: [[{
        text: tx(lang, 'btnJoin'),
        callback_data: 'gj:' + room.code
      }]]
    };
  }

  if (!room.started) {
    return {
      inline_keyboard: [[{
        text: tx(lang, 'btnEnter'),
        url: MINI_APP_LINK + 'group_' + createSharedToken(room)
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

  const lang = getLang(room.chatId);

  const text =
    tx(lang, 'roomTitle') + '\n\n' +
    room.players.map((player, index) =>
      `${index + 1}. ${playerLink(player)} ✅`
    ).join('\n') +
    tx(lang, 'roomStarted');

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

async function announceGroupGame(room) {
  if (room.players.length !== 2) return;

  const oldMessageId = room.messageId;

  // Жаңа хабарлама: ойынға кіру батырмасымен (ескісін өзгертпей, жаңадан жібереміз)
  try {
    const sent = await telegramApi('sendMessage', {
      chat_id: room.chatId,
      text: roomText(room),
      parse_mode: 'HTML',
      reply_markup: roomKeyboard(room)
    });

    room.messageId = sent.result.message_id;
  } catch (error) {
    console.error('Топқа ойын хабарламасы жіберілмеді:', error.message);
    return;
  }

  // Ескі «Ойынға қосылу» хабарламасын өшіреміз
  if (oldMessageId) {
    try {
      await telegramApi('deleteMessage', {
        chat_id: room.chatId,
        message_id: oldMessageId
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
  const lang = getLang(
    query.message && query.message.chat
      ? query.message.chat.id
      : (room ? room.chatId : '')
  );

  if (!room || room.started) {
    await answerCallback(
      query.id,
      tx(lang, 'roomExpired'),
      true
    );

    return true;
  }

  if (isGroupBlocked(room.chatId)) {
    await answerCallback(
      query.id,
      tx(lang, 'groupBlocked'),
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
      tx(lang, 'alreadyJoined')
    );

    return true;
  }

  if (room.players.length >= 2) {
    await answerCallback(
      query.id,
      tx(lang, 'roomFull'),
      true
    );

    return true;
  }

  if (groupPlayerRooms.has(userId)) {
    await answerCallback(
      query.id,
      tx(lang, 'otherRoom'),
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
    tx(lang, 'joined')
  );

  if (room.players.length === 2) {
    clearTimeout(room.searchTimer);
    room.searchTimer = null;

    await announceGroupGame(room);
  } else {
    try {
      await updateGroupRoom(room);
    } catch (error) {
      console.error(error.message);
    }
  }

  return true;
}

/* ---------- Жеке чаттағы /start батырмалары ---------- */

const MINI_APP_URL = 'https://shashka-mini-app.onrender.com';

function mainKeyboard(lang) {
  return {
    inline_keyboard: [
      [{
        text: tx(lang, 'btnStart'),
        web_app: { url: MINI_APP_URL + '/?lang=' + lang }
      }],
      [{
        text: tx(lang, 'btnGroup'),
        url: 'https://t.me/shashkaoyinibot?startgroup=true'
      }]
    ]
  };
}

async function sendMainMenu(chatId, lang) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text: tx(lang, 'startText'),
    parse_mode: 'HTML',
    reply_markup: mainKeyboard(lang)
  });
}

/* ---------- /language ---------- */

function languageKeyboard() {
  return {
    inline_keyboard: [[
      { text: '🇺🇿 O‘zbekcha', callback_data: 'lang:uz' },
      { text: '🇰🇿 Қазақша', callback_data: 'lang:kk' },
      { text: '🇷🇺 Русский', callback_data: 'lang:ru' }
    ]]
  };
}

async function handleLangCallback(query) {
  const match = String(query.data || '').match(/^lang:(uz|kk|ru)$/);

  if (!match) return false;

  const lang = match[1];
  const chat = query.message && query.message.chat;

  if (!chat) {
    await answerCallback(query.id, '');
    return true;
  }

  // Топта тілді тек топ админдері өзгерте алады
  if (chat.type !== 'private') {
    let allowed = false;

    try {
      const member = await telegramApi('getChatMember', {
        chat_id: chat.id,
        user_id: query.from.id
      });

      allowed = ['creator', 'administrator'].includes(
        member.result && member.result.status
      );
    } catch (error) {
      console.error('getChatMember қатесі:', error.message);
    }

    if (!allowed) {
      await answerCallback(
        query.id,
        tx(getLang(chat.id), 'langAdminOnly'),
        true
      );

      return true;
    }
  }

  setLang(chat.id, lang);

  await answerCallback(query.id, tx(lang, 'langSaved'));

  try {
    await telegramApi('editMessageText', {
      chat_id: chat.id,
      message_id: query.message.message_id,
      text: tx(lang, 'langSaved')
    });
  } catch (error) {
    if (!String(error.message).includes('message is not modified')) {
      console.error(error.message);
    }
  }

  // Жеке чатта: жаңа тілдегі мәтін және жаңартылған төменгі батырмалар
  if (chat.type === 'private') {
    try {
      await sendMainMenu(chat.id, lang);
    } catch (error) {
      console.error(error.message);
    }
  }

  return true;
}

/* ---------- Топқа қосылғандағы хабарлама ---------- */

async function sendGroupWelcome(chatId) {
  if (isGroupBlocked(chatId)) return;

  const text = tx(getLang(chatId), 'groupWelcome');

  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/* ---------- Реферал: /start ref_ID ---------- */

const REF_TEXTS = {
  kk: (name, n) => `🎉 ${name} сілтемең арқылы қосылды! +${n} койн`,
  uz: (name, n) => `🎉 ${name} havolang orqali qo‘shildi! +${n} koin`,
  ru: (name, n) => `🎉 ${name} присоединился по твоей ссылке! +${n} коинов`
};

async function handleStartReferral(message) {
  const m = /^\/start(?:@\w+)?\s+ref_([0-9a-zA-Z_]{1,30})\s*$/.exec(message.text || '');

  if (!m || !message.from || message.from.is_bot) return;

  const inviterId = m[1];
  const inviteeId = String(message.from.id);

  const inviteeName =
    [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') ||
    message.from.username ||
    'Ойыншы';

  // trackUser бұрын шақырылды: firstSeen-де осы адам жаңа болса ғана койн беріледі
  const r = shop.claimReferral(inviteeId, inviteeName, inviterId, firstSeen);

  if (!r.ok) return;

  // Шақырушы мини аппта отырса, бірден көрсетеміз
  send(users.get(inviterId), shopMsg(inviterId, {
    type: 'ref',
    ok: true,
    name: inviteeName,
    reward: r.reward
  }));

  // Боттан хабарлама
  try {
    const lang = getLang(inviterId);
    const text = (REF_TEXTS[lang] || REF_TEXTS.kk)(escapeHtml(inviteeName), r.reward);

    await telegramApi('sendMessage', {
      chat_id: inviterId,
      text,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Реферал хабары жіберілмеді:', error.message);
  }
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
      if (await handleLangCallback(update.callback_query)) {
        res.writeHead(200);
        return res.end('ok');
      }

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

    /* Ботқа жазған адамды хабар тарату тізіміне қосу */

    if (
      message.chat &&
      message.chat.type === 'private' &&
      message.from &&
      !message.from.is_bot
    ) {
      trackUser(message.from.id);

      if (unreachableUsers.delete(String(message.from.id))) {
        saveUnreachable();
      }
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

    /* Пайдаланушыларға тарататын хабарды қабылдау: мәтін, сілтеме, фото */

    if (
      message.chat.type === 'private' &&
      message.from &&
      isAdmin(message.from.id) &&
      !/^\/[a-z_]+(?:@\w+)?(?:\s|$)/i.test(message.text || '')
    ) {
      const adminId = String(message.from.id);
      const draft = adminBroadcastDrafts.get(adminId);

      if (
        draft &&
        draft.waiting &&
        draft.target === 'users' &&
        hasPermission(adminId, 'broadcast')
      ) {
        adminBroadcastDrafts.set(adminId, {
          waiting: false,
          target: 'users',
          source: {
            chatId: message.chat.id,
            messageId: message.message_id
          }
        });

        // Админге қалай көрінетінін алдын ала көрсетеміз
        try {
          await telegramApi('copyMessage', {
            chat_id: message.chat.id,
            from_chat_id: message.chat.id,
            message_id: message.message_id
          });
        } catch (error) {
          console.error(error.message);
        }

        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          text:
            '📨 <b>ХАБАРДЫ ТЕКСЕРІҢІЗ</b>\n\n' +
            'Жоғарыдағы хабарлама ' +
            `<b>${reachableUserIds().length}</b> пайдаланушыға жіберіледі.\n\n` +
            '⚠️ Жіберуді растайсыз ба?',
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{
                text: '✅ БАРЛЫҒЫНА ЖІБЕРУ',
                callback_data: 'adm:ubc:confirm'
              }],
              [{
                text: '❌ БОЛДЫРМАУ',
                callback_data: 'adm:ubc:cancel'
              }]
            ]
          }
        });

        res.writeHead(200);
        return res.end('ok');
      }
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
        const needPerm = {
          add_admin: 'admin_manage',
          block_group: 'group_manage',
          unblock_group: 'group_manage',
          coins_id: 'coins',
          coins_amount: 'coins'
        }[action.action];

        if (needPerm && !hasPermission(adminId, needPerm)) {
          adminActions.delete(adminId);

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text: '⛔ Бұл әрекетке рұқсатыңыз жоқ.'
          });

          res.writeHead(200);
          return res.end('ok');
        }

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

        if (action.action === 'coins_id') {
          if (!/^\d+$/.test(input)) {
            await telegramApi('sendMessage', {
              chat_id: message.chat.id,
              text: '⚠️ ID қате. Тек оң сан енгізіңіз.'
            });

            res.writeHead(200);
            return res.end('ok');
          }

          if (!hasOwn(stats.users, input)) {
            await telegramApi('sendMessage', {
              chat_id: message.chat.id,
              text:
                '⚠️ Бұл ID бойынша ойыншы табылмады.\n' +
                'Ол ботқа немесе мини аппқа кіруі керек. Басқа ID жіберіңіз немесе /cancel.'
            });

            res.writeHead(200);
            return res.end('ok');
          }

          adminActions.set(adminId, {
            action: 'coins_amount',
            target: input
          });

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text:
              '🪙 <b>КОЙН САНЫ</b>\n\n' +
              `🆔 ID: <code>${escapeHtml(input)}</code>\n` +
              `💰 Қазіргі койн: <b>${shop.get(input).coins}</b>\n\n` +
              'Қанша койн беру керек? Санды жіберіңіз (мысалы <code>500</code>).\n' +
              'Азайту үшін минус қойыңыз (мысалы <code>-100</code>).\n\n' +
              '❌ Болдырмау: /cancel',
            parse_mode: 'HTML'
          });

          res.writeHead(200);
          return res.end('ok');
        }

        if (action.action === 'coins_amount') {
          const amount = Number(input);

          const r = shop.addCoins(action.target, amount);

          if (!r.ok) {
            await telegramApi('sendMessage', {
              chat_id: message.chat.id,
              text: '⚠️ Сан қате (0 болмауы керек, ең көбі 1 000 000 000). Қайта жіберіңіз немесе /cancel.'
            });

            res.writeHead(200);
            return res.end('ok');
          }

          adminActions.delete(adminId);

          await telegramApi('sendMessage', {
            chat_id: message.chat.id,
            text:
              '✅ <b>КОЙН БЕРІЛДІ</b>\n\n' +
              `🆔 ID: <code>${escapeHtml(action.target)}</code>\n` +
              `➕ Сома: <b>${amount > 0 ? '+' : ''}${Math.trunc(amount)}</b>\n` +
              `💰 Жаңа баланс: <b>${r.coins}</b>`,
            parse_mode: 'HTML',
            reply_markup: adminKeyboard(adminId)
          });

          // Ойыншы мини аппта болса, балансы бірден жаңарады
          send(users.get(action.target), shopMsg(action.target));

          // Ойыншыға боттан хабар (тек койн қосқанда)
          if (amount > 0) {
            try {
              const lang = getLang(action.target);
              const texts = {
                kk: `🎁 Саған ${Math.trunc(amount)} койн берілді!`,
                uz: `🎁 Sizga ${Math.trunc(amount)} koin berildi!`,
                ru: `🎁 Вам начислено ${Math.trunc(amount)} коинов!`
              };

              await telegramApi('sendMessage', {
                chat_id: action.target,
                text: texts[lang] || texts.kk
              });
            } catch (error) {
              console.error('Койн хабары жіберілмеді:', error.message);
            }
          }

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

      if (draft && draft.waiting && hasPermission(adminId, 'broadcast')) {
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
            tx(getLang(message.chat.id), 'alreadyPlaying'),
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
        sharedToken: null,
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

    /* /rating: тек топта */

    if (/^\/rating(?:@\w+)?(?:\s|$)/i.test(message.text)) {
      if (['group', 'supergroup'].includes(message.chat.type)) {
        await telegramApi('sendMessage', {
          chat_id: message.chat.id,
          text: ratingMessage(message.chat.id),
          parse_mode: 'HTML'
        });
      }

      res.writeHead(200);
      return res.end('ok');
    }

    /* /me: жеке чатта да, топта да */

    if (/^\/me(?:@\w+)?(?:\s|$)/i.test(message.text) && message.from) {
      await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text: meMessage(
          message.chat.id,
          message.from,
          ['group', 'supergroup'].includes(message.chat.type)
        ),
        parse_mode: 'HTML'
      });

      res.writeHead(200);
      return res.end('ok');
    }

    /* /language: жеке чатта да, топта да */

    if (/^\/language(?:@\w+)?(?:\s|$)/.test(message.text)) {
      await telegramApi('sendMessage', {
        chat_id: message.chat.id,
        text: tx(getLang(message.chat.id), 'chooseLang'),
        reply_markup: languageKeyboard()
      });

      res.writeHead(200);
      return res.end('ok');
    }

    /* Start */

    if (
      /^\/start(?:@\w+)?(?:\s|$)/.test(
        message.text
      ) &&
      message.chat.type === 'private'
    ) {
      // Тіл әлі таңдалмаған болса, Telegram тілін қолданамыз
      if (!hasLang(message.chat.id)) {
        setLang(
          message.chat.id,
          normLang(detectLang(message.from && message.from.language_code))
        );
      }

      await sendMainMenu(
        message.chat.id,
        getLang(message.chat.id)
      );

      await handleStartReferral(message);
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
    const commandLocales = [
      { code: null, lang: 'kk' },
      { code: 'kk', lang: 'kk' },
      { code: 'uz', lang: 'uz' },
      { code: 'ru', lang: 'ru' }
    ];

    for (const { code, lang } of commandLocales) {
      const extra = code ? { language_code: code } : {};

      await telegramApi('setMyCommands', {
        commands: [
          {
            command: 'game',
            description: tx(lang, 'cmdGame')
          },
          {
            command: 'rating',
            description: tx(lang, 'cmdRating')
          },
          {
            command: 'me',
            description: tx(lang, 'cmdMe')
          },
          {
            command: 'language',
            description: tx(lang, 'cmdLanguage')
          }
        ],
        scope: {
          type: 'all_group_chats'
        },
        ...extra
      });

      await telegramApi('setMyCommands', {
        commands: [
          {
            command: 'start',
            description: tx(lang, 'cmdStart')
          },
          {
            command: 'language',
            description: tx(lang, 'cmdLanguage')
          },
          {
            command: 'me',
            description: tx(lang, 'cmdMe')
          },
          {
            command: 'admin',
            description: tx(lang, 'cmdAdmin')
          }
        ],
        scope: {
          type: 'all_private_chats'
        },
        ...extra
      });
    }

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

    const lang = getLang(chatId);

    let resultText;

    if (winnerUser) {
      resultText =
        `${tx(lang, 'winner')} ${playerLink({
          id: winnerId,
          username: winnerUser.username || '',
          first_name: winnerUser.username
            ? ''
            : winnerUser.name
        })}`;

      if (reason === 'timeout') {
        resultText += '\n' + tx(lang, 'rTimeout');
      } else if (reason === 'opponent_timeout') {
        resultText += '\n' + tx(lang, 'rOppTimeout');
      } else if (reason === 'resign') {
        resultText += '\n' + tx(lang, 'rResign');
      } else if (reason === 'left') {
        resultText += '\n' + tx(lang, 'rLeft');
      }
    } else {
      resultText = tx(lang, 'drawText');
    }

    // Очколар: жеңіс +10, жеңіліс 0 (ойын басталмаса есептелмейді)
    if (reason !== 'opponent_timeout') {
      const ids = [String(g.p.w), String(g.p.b)];

      const recorded = recordGroupGame(
        chatId,
        ids,
        winnerId ? String(winnerId) : null
      );

      if (winnerId) {
        const loserId = ids.find(id => id !== String(winnerId));
        const winnerName = escapeHtml(ratingName(winnerId));

        resultText +=
          '\n\n' +
          tx(lang, 'resultPoints', {
            name: winnerName,
            points: WIN_POINTS
          }) +
          '\n' +
          tx(lang, 'resultZero', {
            name: escapeHtml(ratingName(loserId))
          });

        const win = recorded[String(winnerId)];
        const oldRank = rankIndex(win.before);
        const newRank = rankIndex(win.after);

        if (newRank > oldRank) {
          resultText +=
            '\n\n' +
            tx(lang, 'rankUp', {
              name: winnerName,
              rank: rankLabel(lang, newRank)
            });
        }
      }
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
            tx(getLang(chatId), 'gameOver') + '\n\n' +
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

  stats.totalGames++;
  stats.totalGroupGames++;
  saveStats();

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

  if (!tokenInfo) {
    return send(u, {
      t: 'group_error',
      code: 'invalid'
    });
  }

  const room = groupRooms.get(tokenInfo.code);

  if (tokenInfo.shared) {
    // Ортақ токен: тек осы бөлменің 2 ойыншысы кіре алады
    const isPlayer = room && room.players.some(
      player => String(player.id) === String(u.id)
    );

    if (room && !isPlayer) {
      return send(u, {
        t: 'group_error',
        code: 'full'
      });
    }
  } else if (tokenInfo.userId !== String(u.id)) {
    return send(u, {
      t: 'group_error',
      code: 'invalid'
    });
  }

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

  // Топтағы ойын: мини апп топтың тілінде ашылады
  send(u, {
    t: 'lang',
    lang: getLang(room.chatId)
  });

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

    case 'shop_get':
      return send(u, shopMsg(u.id));

    case 'shop_buy': {
      const r = shop.buy(u.id, String(m.kind), String(m.id));

      return send(u, shopMsg(u.id, {
        type: 'buy',
        ok: r.ok,
        code: r.code || null,
        id: String(m.id)
      }));
    }

    case 'shop_use': {
      const r = shop.use(u.id, String(m.kind), String(m.id));

      return send(u, shopMsg(u.id, {
        type: 'use',
        ok: r.ok,
        code: r.code || null,
        id: String(m.id)
      }));
    }

    case 'ref_claim': {
      const inviterId = String(m.code || '')
        .replace(/[^0-9a-zA-Z_]/g, '')
        .slice(0, 30);

      if (!inviterId) return;

      const r = shop.claimReferral(
        u.id,
        u.name,
        inviterId,
        firstSeen
      );

      if (!r.ok) return;

      send(u, shopMsg(u.id));

      return send(users.get(inviterId), shopMsg(inviterId, {
        type: 'ref',
        ok: true,
        name: u.name,
        reward: r.reward
      }));
    }

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

    if (info) info.tgLang = tgLangFromInitData(m.initData);
  }

  if (!info) {
    ws.send(JSON.stringify({
      t: 'error',
      code: 'auth'
    }));

    return ws.close();
  }

  info.id = String(info.id);

  trackUser(info.id);

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
    me: pub(u),
    lang: userLang(u)
  });

  send(u, shopMsg(u.id));

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
  const shutdown = async signal => {
    console.log(signal + ': жабылар алдында деректер сақталуда...');

    try {
      await Promise.race([
        flushStorage(),
        new Promise(r => setTimeout(r, 8000))
      ]);
    } catch (error) {
      console.error(error.message);
    }

    process.exit(0);
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  initStorage().then(() => {
    server.listen(PORT, () => {
      console.log(
        `Shashka сервері: http://localhost:${PORT}` +
        `${DEV ? ' (DEV режимі)' : ''}`
      );

      console.log('Негізгі админ:', OWNER_ID);
      console.log('Қосымша админдер:', admins.size);
      console.log('Блокталған топтар:', blockedGroups.size);

      setupTelegramWebhook();
    });
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
  blockedGroups,
  stats,
  initStorage
};
