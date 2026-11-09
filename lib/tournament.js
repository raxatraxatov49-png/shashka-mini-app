'use strict';

/*
  Турнир: сетка құру, нәтиже өңдеу, сетка суретін салу.
  Telegram-мен байланысты код server.js ішінде, мұнда тек логика мен сурет.
*/

const fs = require('fs');
const path = require('path');

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 64;

/* ---------- Мәтіндер (kk / uz / ru) ---------- */

const TT = {
  kk: {
    cmdTurnir: 'Турнир бастау (тек админдер)',
    regTitle: '🏆 <b>ТУРНИР — ТІРКЕУ</b>',
    regCount: '👥 Қатысушылар: <b>{n}/{max}</b> (кемінде {min})',
    regTime: '⏳ Тіркеу аяқталуына: <b>{m} мин</b>. {max} адам жиналса, турнир бірден басталады.',
    regHint: 'Қосылу үшін төмендегі батырманы басыңыз.',
    regEmpty: 'Әзірге ешкім жоқ.',
    joinBtn: '✅ Қосылу ({n}/{max})',
    startBtn: '▶️ Бастау (тек админдер)',
    adminOnly: '⛔ Турнирді тек топ админдері бастай алады.',
    adminOnlyBtn: '⛔ Бұл батырманы тек топ админдері баса алады.',
    alreadyRunning: '⚠️ Бұл топта турнир әлдеқашан жүріп жатыр.',
    joined: '✅ Сіз турнирге қосылдыңыз!',
    alreadyJoined: 'Сіз тіркелгенсіз.',
    full: 'Орын қалмады.',
    regClosed: 'Тіркеу жабылған.',
    needMin: 'Бастау үшін кемінде {min} ойыншы керек (қазір {n}).',
    cancelled: '❌ Турнир өтпеді: тіркелген ойыншы жеткіліксіз (кемінде {min} керек).',
    started: '🏆 <b>ТУРНИР БАСТАЛДЫ!</b>\n\n👥 Қатысушылар: <b>{n}</b>',
    matchTitle: '🎲 <b>Турнир — {round}</b>',
    enterBtn: '🎮 Ойынға кіру',
    dm: '🏆 <b>Турнир — {round}</b>\n\n⚔️ Қарсыласыңыз: {opp}\n\nОйынға кіру үшін батырманы басыңыз. Қарсыласыңыз кіргеннен кейін 90 секундта кірмесеңіз, жеңіліс есептеледі.',
    playing: '⚔️ Ойын басталды',
    matchDone: '✅ Жеңімпаз: {name}',
    byTimeout: '(уақыт бітті)',
    byResign: '(қарсылас берілді)',
    byLeft: '(қарсылас шығып кетті)',
    byAbsent: '(қарсылас ойынға кірмеді)',
    byNoShow: '(екеуі де кірмеді, жеребе бойынша)',
    byRandom: '(қатарынан тең, жеребе бойынша)',
    drawReplay: '🤝 Тең! Ойын қайта ойналады.',
    champion: '🏆 <b>ТУРНИР ЖЕҢІМПАЗЫ: {name}</b>\n\n🎉 Құттықтаймыз!',
    bracketTitle: 'Турнир сеткасы — {n} ойыншы',
    winnerCol: 'ЖЕҢІМПАЗ',
    rounds: { 2: 'Финал', 4: 'Жартылай финал', 8: 'Ширек финал' },
    qual: ['Бірінші саралау', 'Екінші саралау', 'Үшінші саралау'],
    player: 'Ойыншы'
  },
  uz: {
    cmdTurnir: 'Turnir boshlash (faqat adminlar)',
    regTitle: '🏆 <b>TURNIR — RO‘YXATDAN O‘TISH</b>',
    regCount: '👥 Qatnashchilar: <b>{n}/{max}</b> (kamida {min})',
    regTime: '⏳ Ro‘yxat tugashiga: <b>{m} daq</b>. {max} kishi yig‘ilsa, turnir darhol boshlanadi.',
    regHint: 'Qo‘shilish uchun quyidagi tugmani bosing.',
    regEmpty: 'Hozircha hech kim yo‘q.',
    joinBtn: '✅ Qo‘shilish ({n}/{max})',
    startBtn: '▶️ Boshlash (faqat adminlar)',
    adminOnly: '⛔ Turnirni faqat guruh adminlari boshlay oladi.',
    adminOnlyBtn: '⛔ Bu tugmani faqat guruh adminlari bosa oladi.',
    alreadyRunning: '⚠️ Bu guruhda turnir allaqachon davom etmoqda.',
    joined: '✅ Siz turnirga qo‘shildingiz!',
    alreadyJoined: 'Siz ro‘yxatdan o‘tgansiz.',
    full: 'Joy qolmadi.',
    regClosed: 'Ro‘yxat yopilgan.',
    needMin: 'Boshlash uchun kamida {min} o‘yinchi kerak (hozir {n}).',
    cancelled: '❌ Turnir o‘tmadi: o‘yinchilar yetarli emas (kamida {min} kerak).',
    started: '🏆 <b>TURNIR BOSHLANDI!</b>\n\n👥 Qatnashchilar: <b>{n}</b>',
    matchTitle: '🎲 <b>Turnir — {round}</b>',
    enterBtn: '🎮 O‘yinga kirish',
    dm: '🏆 <b>Turnir — {round}</b>\n\n⚔️ Raqibingiz: {opp}\n\nO‘yinga kirish uchun tugmani bosing. Raqibingiz kirgandan keyin 90 soniyada kirmasangiz, mag‘lubiyat hisoblanadi.',
    playing: '⚔️ O‘yin boshlandi',
    matchDone: '✅ G‘olib: {name}',
    byTimeout: '(vaqt tugadi)',
    byResign: '(raqib taslim bo‘ldi)',
    byLeft: '(raqib chiqib ketdi)',
    byAbsent: '(raqib o‘yinga kirmadi)',
    byNoShow: '(ikkalasi ham kirmadi, qur’a bo‘yicha)',
    byRandom: '(ketma-ket durang, qur’a bo‘yicha)',
    drawReplay: '🤝 Durang! O‘yin qayta o‘ynaladi.',
    champion: '🏆 <b>TURNIR G‘OLIBI: {name}</b>\n\n🎉 Tabriklaymiz!',
    bracketTitle: 'Turnir setkasi — {n} o‘yinchi',
    winnerCol: 'G‘OLIB',
    rounds: { 2: 'Final', 4: 'Yarim final', 8: 'Chorak final' },
    qual: ['Birinchi saralash', 'Ikkinchi saralash', 'Uchinchi saralash'],
    player: 'O‘yinchi'
  },
  ru: {
    cmdTurnir: 'Начать турнир (только админы)',
    regTitle: '🏆 <b>ТУРНИР — РЕГИСТРАЦИЯ</b>',
    regCount: '👥 Участники: <b>{n}/{max}</b> (минимум {min})',
    regTime: '⏳ До конца регистрации: <b>{m} мин</b>. Если наберётся {max} человек, турнир начнётся сразу.',
    regHint: 'Нажмите кнопку ниже, чтобы присоединиться.',
    regEmpty: 'Пока никого нет.',
    joinBtn: '✅ Участвовать ({n}/{max})',
    startBtn: '▶️ Начать (только админы)',
    adminOnly: '⛔ Начать турнир могут только админы группы.',
    adminOnlyBtn: '⛔ Эту кнопку могут нажимать только админы группы.',
    alreadyRunning: '⚠️ В этой группе турнир уже идёт.',
    joined: '✅ Вы записаны на турнир!',
    alreadyJoined: 'Вы уже зарегистрированы.',
    full: 'Мест нет.',
    regClosed: 'Регистрация закрыта.',
    needMin: 'Для старта нужно минимум {min} игроков (сейчас {n}).',
    cancelled: '❌ Турнир не состоялся: недостаточно игроков (нужно минимум {min}).',
    started: '🏆 <b>ТУРНИР НАЧАЛСЯ!</b>\n\n👥 Участников: <b>{n}</b>',
    matchTitle: '🎲 <b>Турнир — {round}</b>',
    enterBtn: '🎮 Войти в игру',
    dm: '🏆 <b>Турнир — {round}</b>\n\n⚔️ Ваш соперник: {opp}\n\nНажмите кнопку, чтобы войти в игру. Если не зайдёте в течение 90 секунд после соперника, вам засчитают поражение.',
    playing: '⚔️ Игра началась',
    matchDone: '✅ Победитель: {name}',
    byTimeout: '(время вышло)',
    byResign: '(соперник сдался)',
    byLeft: '(соперник вышел)',
    byAbsent: '(соперник не зашёл в игру)',
    byNoShow: '(оба не зашли, по жребию)',
    byRandom: '(ничьи подряд, по жребию)',
    drawReplay: '🤝 Ничья! Игра будет сыграна заново.',
    champion: '🏆 <b>ПОБЕДИТЕЛЬ ТУРНИРА: {name}</b>\n\n🎉 Поздравляем!',
    bracketTitle: 'Турнирная сетка — {n} игроков',
    winnerCol: 'ПОБЕДИТЕЛЬ',
    rounds: { 2: 'Финал', 4: 'Полуфинал', 8: 'Четвертьфинал' },
    qual: ['Первый отборочный', 'Второй отборочный', 'Третий отборочный'],
    player: 'Игрок'
  }
};

function texts(lang) {
  return TT[lang] || TT.kk;
}

function fmt(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) =>
    vars && vars[k] !== undefined ? String(vars[k]) : m
  );
}

/*
  Кезең атауы: соңғы үшеуі Ширек финал / Жартылай финал / Финал,
  олардан бұрынғылары Бірінші саралау, Екінші саралау, ...
  size — сетка өлшемі (2-нің дәрежесі), r — кезең нөмірі (0-ден).
*/
function roundLabel(lang, size, r) {
  const T = texts(lang);
  const players = size / 2 ** r;

  if (T.rounds[players]) return T.rounds[players];

  return T.qual[r] || (r + 1) + '/' + Math.log2(size);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- Сетка құру ---------- */

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newMatch(round, index) {
  return {
    id: round + '-' + index,
    round,
    index,
    a: null,
    b: null,
    winner: null,
    status: 'pending', // pending | playing | done
    bye: false,
    messageId: null,
    roomCode: null,
    link: null,
    attempts: 0,
    timer: null
  };
}

/*
  playerIds: ойыншылар id тізімі (4..64).
  Қайтарады: { size, rounds } — size = 2-нің дәрежесі (4, 8, 16, 32, 64).
  Ойыншы саны толық дәреже болмаса, кейбіреуі бірінші турда «bye» алады
  (қарсыласынсыз келесі кезеңге өтеді).
*/
function buildRounds(playerIds, rng = Math.random) {
  const n = playerIds.length;

  if (n < 2) throw new Error('Not enough players');

  let size = 2;
  while (size < n) size *= 2;

  const ids = shuffle(playerIds.slice(), rng);
  const firstRound = size / 2;
  const pairs = n - firstRound; // екі ойыншылы матчтар саны
  const byes = firstRound - pairs; // бір ойыншылы матчтар саны

  const slots = [];
  let k = 0;

  for (let i = 0; i < pairs; i++) {
    slots.push([ids[k++], ids[k++]]);
  }

  for (let i = 0; i < byes; i++) {
    slots.push([ids[k++], null]);
  }

  shuffle(slots, rng);

  const rounds = [];

  for (let r = 0, count = size / 2; count >= 1; r++, count /= 2) {
    const list = [];

    for (let i = 0; i < count; i++) list.push(newMatch(r, i));

    rounds.push(list);
  }

  const t = { size, rounds, champion: null };

  slots.forEach(([a, b], i) => {
    const m = rounds[0][i];

    m.a = a;
    m.b = b;

    if (!b) {
      m.bye = true;
      m.status = 'done';
      m.winner = a;
      propagate(t, m);
    }
  });

  return t;
}

// Матч жеңімпазын келесі кезеңдегі орынға қояды
function propagate(t, m) {
  if (m.round >= t.rounds.length - 1) {
    t.champion = m.winner;
    return;
  }

  const parent = t.rounds[m.round + 1][m.index >> 1];

  if (m.index % 2 === 0) parent.a = m.winner;
  else parent.b = m.winner;
}

function roundDone(t, r) {
  return t.rounds[r].every(m => m.status === 'done');
}

function findMatch(t, id) {
  for (const round of t.rounds) {
    for (const m of round) if (m.id === id) return m;
  }

  return null;
}

/* ---------- Ойыншы аты ---------- */

function makePlayer(from) {
  const name =
    [from.first_name, from.last_name].filter(Boolean).join(' ') ||
    from.username ||
    '';

  return {
    id: String(from.id),
    username: from.username || '',
    first_name: from.first_name || '',
    last_name: from.last_name || '',
    name: name.slice(0, 40)
  };
}

// Суретке: шрифт көрсете алмайтын белгілерді (эмодзи, символ) алып тастаймыз
function imageName(p, fallback) {
  let s = String((p && p.name) || '')
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s && p && p.username) s = '@' + p.username;

  return s || fallback || '?';
}

/* ---------- Мәтіндік сетка (сурет жасалмаса) ---------- */

function bracketText(t, lang) {
  const T = texts(lang);
  const lines = ['🏆 <b>' + escapeHtml(fmt(T.bracketTitle, { n: t.players.length })) + '</b>'];

  const nm = id => {
    const p = id ? t.byId.get(String(id)) : null;

    return p ? escapeHtml(p.name || T.player) : '—';
  };

  t.rounds.forEach((matches, r) => {
    const started = matches.some(m => m.a || m.b);

    if (!started) return;

    lines.push('', '<b>' + escapeHtml(roundLabel(lang, t.size, r)) + '</b>');

    for (const m of matches) {
      const a = m.winner && m.winner === m.a ? '✅ ' + nm(m.a) : nm(m.a);
      const b = m.winner && m.winner === m.b ? '✅ ' + nm(m.b) : nm(m.b);

      lines.push('▫️ ' + a + ' — ' + b);
    }
  });

  const text = lines.join('\n');

  return text.length > 3800 ? text.slice(0, 3790) + '…' : text;
}

/* ---------- Сурет салу ---------- */

const L = {
  boxW: 180,
  boxH: 30,
  rowGap: 4,
  matchGap: 10,
  colGap: 40,
  padX: 25,
  top: 80,
  bottom: 20
};

let canvasLib = null;
let canvasTried = false;
let fontReady = false;

function loadCanvas() {
  if (canvasTried) return canvasLib;

  canvasTried = true;

  try {
    canvasLib = require('@napi-rs/canvas');
  } catch (error) {
    console.warn('@napi-rs/canvas жоқ — турнир сеткасы мәтін түрінде жіберіледі.');
    canvasLib = null;
    return null;
  }

  // Кирилл мен латынды көрсететін шрифт іздейміз
  const candidates = [
    path.join(__dirname, '..', 'fonts', 'DejaVuSans.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'
  ];

  const boldCandidates = [
    path.join(__dirname, '..', 'fonts', 'DejaVuSans-Bold.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf'
  ];

  try {
    const { GlobalFonts } = canvasLib;
    const regular = candidates.find(f => fs.existsSync(f));
    const bold = boldCandidates.find(f => fs.existsSync(f));

    if (GlobalFonts && regular) {
      GlobalFonts.registerFromPath(regular, 'TourneyFont');
      fontReady = true;
    }

    if (GlobalFonts && bold) {
      GlobalFonts.registerFromPath(bold, 'TourneyFontBold');
    }
  } catch (error) {
    console.warn('Шрифт тіркелмеді:', error.message);
  }

  return canvasLib;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;

  let s = text;

  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) {
    s = s.slice(0, -1);
  }

  return s + '…';
}

function slotStyle(state) {
  switch (state) {
    case 'win':
      return { fill: '#12301f', stroke: '#1f6b3a', text: '#7ef0a8', bar: '#22c55e' };
    case 'champion':
      return { fill: '#3a2f10', stroke: '#c9a227', text: '#f6c453', bar: null };
    case 'empty':
      return { fill: '#10141c', stroke: '#1b2230', text: '#4a5368', bar: null };
    default:
      return { fill: '#161b26', stroke: '#232b3c', text: '#8d96aa', bar: null };
  }
}

function drawSlot(ctx, x, y, text, state, fontPx) {
  const st = slotStyle(state);

  roundedRect(ctx, x, y, L.boxW, L.boxH, 6);
  ctx.fillStyle = st.fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = st.stroke;
  ctx.stroke();

  if (st.bar) {
    roundedRect(ctx, x + 4, y + 8, 3, L.boxH - 16, 1.5);
    ctx.fillStyle = st.bar;
    ctx.fill();
  }

  if (text) {
    ctx.fillStyle = st.text;
    ctx.font = fontPx;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const pad = st.bar ? 14 : 10;

    ctx.fillText(fitText(ctx, text, L.boxW - pad - 8), x + pad, y + L.boxH / 2 + 1);
  }
}

/*
  Сетка суретін PNG Buffer ретінде қайтарады.
  @napi-rs/canvas орнатылмаған болса, null қайтарады.
*/
function renderBracketPng(t, lang) {
  const lib = loadCanvas();

  if (!lib) return null;

  const T = texts(lang);
  const R = t.rounds.length; // кезеңдер саны
  const cols = R + 1; // + жеңімпаз бағаны
  const matchH = L.boxH * 2 + L.rowGap;
  const pitch = matchH + L.matchGap;

  const width = Math.max(
    520,
    L.padX * 2 + cols * L.boxW + (cols - 1) * L.colGap
  );

  const height = L.top + t.rounds[0].length * pitch + L.bottom;

  const canvas = lib.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const family = fontReady ? '"TourneyFont", ' : '';
  const familyBold = fontReady ? '"TourneyFontBold", "TourneyFont", ' : '';
  const fontName = '14px ' + family + 'sans-serif';
  const fontBold = 'bold 22px ' + familyBold + 'sans-serif';
  const fontHead = 'bold 12px ' + familyBold + 'sans-serif';

  // Фон
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, width, height);

  // Тақырып
  ctx.fillStyle = '#ffffff';
  ctx.font = fontBold;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(fmt(T.bracketTitle, { n: t.players.length }), L.padX, 32);

  const colX = c => L.padX + c * (L.boxW + L.colGap);

  // Бағандар атауы
  ctx.font = fontHead;
  ctx.fillStyle = '#9aa4b8';

  for (let r = 0; r < R; r++) {
    ctx.fillText(
      roundLabel(lang, t.size, r).toUpperCase(),
      colX(r),
      62
    );
  }

  ctx.fillText(T.winnerCol, colX(R), 62);

  // Матч орталықтары (y)
  const centers = [];

  for (let r = 0; r < R; r++) {
    centers[r] = [];

    t.rounds[r].forEach((m, i) => {
      if (r === 0) {
        centers[r][i] = L.top + i * pitch + matchH / 2;
      } else {
        centers[r][i] = (centers[r - 1][2 * i] + centers[r - 1][2 * i + 1]) / 2;
      }
    });
  }

  // Сызықтар
  ctx.strokeStyle = '#2a3347';
  ctx.lineWidth = 1.5;

  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  for (let r = 0; r < R; r++) {
    const xRight = colX(r) + L.boxW;
    const xMid = xRight + L.colGap / 2;
    const xNext = colX(r + 1);

    if (r === R - 1) {
      line(xRight, centers[r][0], xNext, centers[r][0]);
      continue;
    }

    t.rounds[r + 1].forEach((parent, i) => {
      const y0 = centers[r][2 * i];
      const y1 = centers[r][2 * i + 1];
      const yp = centers[r + 1][i];

      line(xRight, y0, xMid, y0);
      line(xRight, y1, xMid, y1);
      line(xMid, y0, xMid, y1);
      line(xMid, yp, xNext, yp);
    });
  }

  // Ойыншылар
  const nameOf = id => (id ? imageName(t.byId.get(String(id)), T.player) : '');

  for (let r = 0; r < R; r++) {
    t.rounds[r].forEach((m, i) => {
      const x = colX(r);
      const y0 = centers[r][i] - matchH / 2;
      const y1 = y0 + L.boxH + L.rowGap;

      const stateA = m.winner && m.winner === m.a ? 'win' : m.a ? 'normal' : 'empty';
      const stateB = m.winner && m.winner === m.b ? 'win' : m.b ? 'normal' : 'empty';

      drawSlot(ctx, x, y0, nameOf(m.a), stateA, fontName);
      drawSlot(ctx, x, y1, m.bye ? '' : nameOf(m.b), stateB, fontName);
    });
  }

  // Жеңімпаз
  const finalCenter = centers[R - 1][0];
  const wy = finalCenter - L.boxH / 2;

  if (t.champion) {
    drawSlot(ctx, colX(R), wy, '★ ' + nameOf(t.champion), 'champion', fontName);
  } else {
    drawSlot(ctx, colX(R), wy, '', 'empty', fontName);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  TT,
  texts,
  fmt,
  roundLabel,
  escapeHtml,
  shuffle,
  buildRounds,
  propagate,
  roundDone,
  findMatch,
  makePlayer,
  imageName,
  bracketText,
  renderBracketPng
};
