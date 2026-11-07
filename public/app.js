
(() => {
'use strict';

const tg = window.Telegram && window.Telegram.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  try { tg.setHeaderColor('#efe3cf'); tg.setBackgroundColor('#efe3cf'); } catch (e) {}
}

const $ = (id) => document.getElementById(id);

const haptic = (k) => {
  try {
    tg && tg.HapticFeedback &&
    (k === 'sel'
      ? tg.HapticFeedback.selectionChanged()
      : tg.HapticFeedback.impactOccurred(k));
  } catch (e) {}
};

const S = {
  ws: null,
  me: null,
  g: null,
  sel: null,
  q: [],
  busy: false,
  unread: 0,
  retry: 0,
  searching: false,
  awayTimer: null,
  inviteCode: null,
  inviteLink: '',
  joinCode: null,
  groupCode: null,
  fatal: false
};

const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18l-1-11 5 4 5-7 5 7 5-4-1 11z"/></svg>';

/* ---------- Start parametrlarini o‘qish ---------- */

function getStartValue() {
  let value = '';

  try {
    value = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param
      ? tg.initDataUnsafe.start_param
      : '';
  } catch (e) {}

  if (!value) {
    const p = new URLSearchParams(location.search);
    value = p.get('startapp') || p.get('invite') || '';
  }

  return value;
}

/* ---------- Do‘st bilan o‘ynash ---------- */

function getStartCode() {
  const value = getStartValue();
  return value.startsWith('invite_') ? value.slice(7) : '';
}

/* ---------- Guruh o‘yini ---------- */

// Bu yerda endi oddiy xona kodi emas,
// har bir o‘yinшы uchun alohida 32 belgili token keladi.
function getGroupCode() {
  const value = getStartValue();

  if (!value.startsWith('group_')) return '';

  const token = value.slice(6);

  return /^[a-f0-9]{32}$/.test(token) ? token : '';
}

function showInviteStatus(message) {
  const el = $('inviteStatus');
  if (el) el.textContent = message;
}

function openInviteSheet() {
  S.inviteCode = null;
  S.inviteLink = '';

  $('inviteLink').value = '';
  $('btnCopyInvite').disabled = true;
  $('btnShareInvite').disabled = true;

  showInviteStatus('Taklif havolasi tayyorlanmoqda...');
  $('sheetInvite').classList.remove('hidden');

  send({ t: 'invite_create' });
  haptic('light');
}

function createInviteLink(code) {
  return `https://t.me/shashkaoyinibot?startapp=invite_${encodeURIComponent(code)}`;
}

async function copyInviteLink() {
  if (!S.inviteLink) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(S.inviteLink);
    } else {
      const input = $('inviteLink');
      input.focus();
      input.select();

      const copied = document.execCommand('copy');
      if (!copied) throw new Error('Copy failed');
    }

    showInviteStatus('Havola nusxalandi! Do‘stingizga yuboring.');
    haptic('light');
  } catch (e) {
    const input = $('inviteLink');
    input.focus();
    input.select();

    showInviteStatus('Havolani bosib ushlab, nusxalashingiz mumkin.');
  }
}

function shareInviteLink() {
  if (!S.inviteLink) return;

  const text = 'Keling, birga shashka o‘ynaymiz!';

  const shareUrl =
    'https://t.me/share/url?url=' + encodeURIComponent(S.inviteLink) +
    '&text=' + encodeURIComponent(text);

  try {
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  } catch (e) {
    window.open(shareUrl, '_blank');
  }
}

function cancelInvite() {
  send({ t: 'invite_cancel' });

  S.inviteCode = null;
  S.inviteLink = '';

  $('sheetInvite').classList.add('hidden');
}

/* ---------- Ulanish ---------- */

function connect() {
  if (
    S.ws &&
    (S.ws.readyState === WebSocket.CONNECTING ||
     S.ws.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
  );

  S.ws = ws;

  ws.onopen = () => {
    S.retry = 0;
    $('conn').classList.add('hidden');

    const p = new URLSearchParams(location.search);

    if (tg && tg.initData) {
      ws.send(JSON.stringify({
        t: 'auth',
        initData: tg.initData
      }));
    } else if (p.get('dev')) {
      ws.send(JSON.stringify({
        t: 'auth',
        dev: {
          id: p.get('id') || p.get('dev'),
          name: p.get('dev')
        }
      }));
    } else {
      fatal(
        'Telegram ichida oching',
        'Bu o‘yin faqat Telegram Mini App sifatida ishlaydi.'
      );
    }
  };

  ws.onmessage = (e) => {
    try {
      onMsg(JSON.parse(e.data));
    } catch (err) {
      console.error(err);
    }
  };

  ws.onclose = () => {
    if (S.ws !== ws || S.fatal) return;

    S.ws = null;

    $('conn').classList.remove('hidden');
    setSearching(false);

    setTimeout(
      connect,
      Math.min(1000 * 2 ** S.retry++, 5000)
    );
  };
}

const send = (m) =>
  S.ws && S.ws.readyState === 1 &&
  S.ws.send(JSON.stringify(m));

function fatal(t, s) {
  S.fatal = true;

  $('fatalTitle').textContent = t;
  $('fatalSub').textContent = s;

  $('fatal').classList.remove('hidden');
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && (!S.ws || S.ws.readyState > 1)) {
    connect();
  }
});

/* ---------- Yordamchilar ---------- */

const COLORS = [
  '#3aa6a0', '#e0954a', '#5b7fc7', '#b8627d',
  '#7a9e4b', '#8e6bbf', '#c9704a'
];

function setAva(el, p) {
  el.textContent = '';
  el.style.background = '';

  const letter = () => {
    el.textContent = '';

    el.style.background =
      COLORS[
        [...p.name].reduce(
          (a, c) => a + c.codePointAt(0),
          0
        ) % COLORS.length
      ];

    el.append((p.name[0] || '?').toUpperCase());
  };

  if (p.avatar) {
    const im = new Image();

    im.referrerPolicy = 'no-referrer';
    im.onerror = letter;
    im.src = p.avatar;

    el.append(im);
  } else {
    letter();
  }
}

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.toggle('active', s.id === id);
  });

  if (tg) {
    try {
      id === 'game'
        ? (
            tg.BackButton.show(),
            tg.enableClosingConfirmation()
          )
        : (
            tg.BackButton.hide(),
            tg.disableClosingConfirmation()
          );
    } catch (e) {}
  }
}

if (tg) {
  try {
    tg.BackButton.onClick(() => {
      if (S.g && !S.g.over) {
        $('sheetMenu').classList.remove('hidden');
      }
    });
  } catch (e) {}
}

function setSearching(on) {
  S.searching = on;

  const b = $('btnBatl');

  b.classList.toggle('busy', on);

  b.innerHTML = on
    ? '<span class="spin"></span>Raqib qidirilmoqda…'
    : 'BATL';

  $('btnCancel').classList.toggle('hidden', !on);
}

/* ---------- Xabarlarni boshqarish ---------- */

function onMsg(m) {
  switch (m.t) {
    case 'hello': {
      S.me = m.me;

      setAva($('meAva'), m.me);
      $('meName').textContent = m.me.name;

      // Guruh o‘yiniga shaxsiy token orqali kirish
      S.groupCode = getGroupCode();

      if (S.groupCode) {
        $('sheetInvite').classList.remove('hidden');

        showInviteStatus(
          '♟️ O‘yin xonasiga ulanmoqda...'
        );

        send({
          t: 'group_join',
          code: S.groupCode
        });
      } else {
        if (!S.joinCode) {
          S.joinCode = getStartCode();
        }

        if (S.joinCode) {
          $('sheetInvite').classList.remove('hidden');

          showInviteStatus(
            'Do‘stingizning o‘yin xonasiga ulanmoqda...'
          );

          send({
            t: 'invite_join',
            code: S.joinCode
          });
        }
      }

      break;
    }

    case 'group_waiting':
      $('sheetInvite').classList.remove('hidden');

      showInviteStatus(
        m.message ||
        'Sіз ойынға кірдіңіз. Екінші ойыншының кіруін күтіңіз...'
      );

      break;

    case 'group_error':
      $('sheetInvite').classList.remove('hidden');

      showInviteStatus(
        m.code === 'expired'
          ? 'Бұл ойынның уақыты аяқталған. Топта /game деп жазыңыз.'
          : m.code === 'full'
            ? 'Бұл ойын бөлмесі толып кетті.'
            : m.code === 'busy'
              ? 'Сіз қазір басқа ойындасыз.'
              : m.code === 'waiting'
                ? 'Екінші ойыншы әлі ойынға кірген жоқ.'
                : 'Ойын бөлмесіне қосылу мүмкін болмады.'
      );

      break;

    case 'searching':
      setSearching(true);
      break;

    case 'idle':
      setSearching(false);
      break;

    case 'invite_created': {
      S.inviteCode = m.code;
      S.inviteLink = createInviteLink(m.code);

      $('inviteLink').value = S.inviteLink;
      $('btnCopyInvite').disabled = false;
      $('btnShareInvite').disabled = false;

      showInviteStatus(
        'Havola tayyor! Uni do‘stingizga yuboring.'
      );

      break;
    }

    case 'invite_joined':
      showInviteStatus(
        'Do‘stingiz qo‘shildi! O‘yin boshlanmoqda...'
      );
      break;

    case 'invite_expired':
      S.inviteCode = null;
      S.inviteLink = '';

      $('inviteLink').value = '';
      $('btnCopyInvite').disabled = true;
      $('btnShareInvite').disabled = true;

      showInviteStatus(
        'Taklif havolasi muddati tugadi. Yangi taklif yarating.'
      );

      break;

    case 'invite_cancelled':
      S.inviteCode = null;
      S.inviteLink = '';

      $('sheetInvite').classList.add('hidden');
      break;

    case 'game':
      startGame(m);
      break;

    case 'move':
    case 'over':
      S.q.push(m);
      pump();
      break;

    case 'chat':
      addChat(m);
      break;

    case 'away':
      showAway(m);
      break;

    case 'replaced':
      S.fatal = true;

      fatal(
        'Boshқа qurilmada ochildi',
        'Bu hisob boshqa joyda ochilgan. Shu yerda davom etish uchun o‘yinni qayta oching.'
      );

      break;

    case 'error':
      if (m.code === 'auth') {
        fatal(
          'Kirish xatosi',
          'Telegram orqali tasdiqlab bo‘lmadi. O‘yinni bot orqali qayta oching.'
        );
      } else if (m.code === 'invite_invalid') {
        showInviteStatus(
          'Taklif havolasi noto‘g‘ri yoki mavjud emas.'
        );
      } else if (m.code === 'invite_expired') {
        showInviteStatus(
          'Taklif havolasining muddati tugagan.'
        );
      } else if (m.code === 'invite_self') {
        showInviteStatus(
          'O‘zingizning taklif havolangiz orqali qo‘shila olmaysiz.'
        );
      } else if (m.code === 'busy') {
        showInviteStatus(
          'O‘yinchi hozir boshqa o‘yinda.'
        );
      }

      break;
  }
}

/* ---------- O‘yin ---------- */

const flip = () => S.g.you === 'b';

const rc = (i) => {
  let r = i >> 3;
  let c = i & 7;

  if (flip()) {
    r = 7 - r;
    c = 7 - c;
  }

  return [r, c];
};

const place = (el, i) => {
  const [r, c] = rc(i);

  el.style.transform =
    `translate(${c * 100}%,${r * 100}%)`;
};

function startGame(m) {
  S.q = [];
  S.busy = false;
  S.sel = null;
  S.unread = 0;
  S.joinCode = null;
  S.groupCode = null;

  S.g = {
    id: m.id,
    you: m.you,
    players: m.players,
    board: m.board,
    turn: m.turn,
    legal: m.legal,
    score: m.score,
    chainPos: m.chainPos,
    over: null,
    last: null
  };

  setSearching(false);

  [
    'sheetMenu',
    'sheetChat',
    'sheetInvite',
    'result',
    'away'
  ].forEach((i) => {
    $(i).classList.add('hidden');
  });

  const opp = m.players[m.you === 'w' ? 'b' : 'w'];
  const me = m.players[m.you];

  setAva($('oppAva'), opp);
  setAva($('myAva'), me);

  $('oppName').textContent = opp.name;
  $('myName').textContent = me.name;

  $('oppDot').className =
    'pdot ' + (m.you === 'w' ? 'b' : 'w');

  $('myDot').className = 'pdot ' + m.you;

  buildSquares();
  renderPieces();

  $('msgs').textContent = '';

  m.chat.forEach((c) => addChat(c, true));

  updateBadge();
  refresh();
  show('game');
}

let sqEls = [];

function buildSquares() {
  const wrap = $('squares');

  wrap.textContent = '';
  sqEls = [];

  for (let d = 0; d < 64; d++) {
    let r = d >> 3;
    let c = d & 7;

    if (flip()) {
      r = 7 - r;
      c = 7 - c;
    }

    const i = r * 8 + c;
    const el = document.createElement('div');

    el.className =
      'sq' + ((r + c) % 2 ? ' d' : '');

    wrap.append(el);
    sqEls[i] = el;
  }
}

let pcEls = new Map();

function pieceEl(p, i) {
  const el = document.createElement('div');

  el.className =
    'pc ' +
    p.toLowerCase() +
    (p === p.toUpperCase() ? ' king' : '');

  el.innerHTML = '<i></i>';
  el.firstChild.insertAdjacentHTML('beforeend', CROWN);

  place(el, i);

  return el;
}

function renderPieces() {
  const wrap = $('pieces');

  wrap.textContent = '';
  pcEls = new Map();

  S.g.board.forEach((p, i) => {
    if (p) {
      const el = pieceEl(p, i);

      wrap.append(el);
      pcEls.set(i, el);
    }
  });
}

const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));

async function pump() {
  if (S.busy) return;

  S.busy = true;

  while (S.q.length) {
    const m = S.q.shift();

    if (m.t === 'move') {
      await doMove(m);
    } else {
      await doOver(m);
    }
  }

  S.busy = false;
}

async function doMove(m) {
  const g = S.g;
  if (!g) return;

  const { from, to, cap, king } = m.step;
  const el = pcEls.get(from);

  if (el) {
    pcEls.delete(from);
    pcEls.set(to, el);

    place(el, to);

    if (king) el.classList.add('king');

    el.style.zIndex = 2;

    setTimeout(() => {
      el.style.zIndex = '';
    }, 300);
  }

  if (cap != null) {
    const ce = pcEls.get(cap);

    pcEls.delete(cap);

    if (ce) {
      setTimeout(() => ce.classList.add('gone'), 120);
      setTimeout(() => ce.remove(), 460);
    }
  }

  haptic(cap != null ? 'medium' : 'light');

  Object.assign(g, {
    board: m.board,
    turn: m.turn,
    legal: m.legal,
    score: m.score,
    chainPos: m.chainPos,
    last: [from, to]
  });

  S.sel = null;

  refresh();

  await sleep(cap != null ? 340 : 260);

  const ok = g.board.every(
    (p, i) => !!p === pcEls.has(i)
  );

  if (!ok && !S.q.length) {
    renderPieces();
    refresh();
  }
}

async function doOver(m) {
  const g = S.g;
  if (!g) return;

  g.over = m;
  g.legal = [];

  refresh();

  await sleep(500);

  const win = m.result === g.you;
  const draw = m.result === 'draw';

  $('resEmoji').textContent =
    draw ? '🤝' : win ? '🏆' : '😔';

  $('resTitle').textContent =
    draw
      ? 'Durang'
      : win
        ? 'Siz yutdingiz!'
        : 'Siz yutqazdingiz';

  const R = {
    no_pieces: win
      ? 'Raqibning barcha shashkalari olindi'
      : 'Barcha shashkalaringiz olindi',

    no_moves: win
      ? 'Raqibda yurish imkoni qolmadi'
      : 'Sizda yurish imkoni qolmadi',

    resign: win
      ? 'Raqib taslim bo‘ldi'
      : 'Siz taslim bo‘ldingiz',

    left: win
      ? 'Raqib o‘yindan chiqib ketdi'
      : 'Aloqa uzilgani uchun o‘yin tugadi',

    draw: '15 ta yurish davomida urish va oddiy shashka yurishi bo‘lmadi'
  };

  $('resSub').textContent = R[m.reason] || '';

  $('sheetMenu').classList.add('hidden');
  $('away').classList.add('hidden');
  $('result').classList.remove('hidden');

  haptic(win ? 'heavy' : 'light');

  try {
    tg && tg.HapticFeedback &&
    tg.HapticFeedback.notificationOccurred(
      draw ? 'warning' : win ? 'success' : 'error'
    );
  } catch (e) {}
}

/* ---------- Ko‘rinishni yangilash ---------- */

function refresh() {
  const g = S.g;
  if (!g) return;

  const mine = g.turn === g.you && !g.over;

  $('myAva').classList.toggle('turn', mine);
  $('oppAva').classList.toggle(
    'turn',
    !mine && !g.over
  );

  const must =
    mine && g.legal.some((m) => m.cap != null);

  const ms = $('mySub');

  ms.textContent = g.over
    ? ''
    : mine
      ? (
          g.chainPos != null
            ? 'Urishni davom ettiring!'
            : must
              ? 'Urish majburiy!'
              : 'Sizning yurishingiz'
        )
      : 'Kutilmoqda';

  ms.classList.toggle('hot', must);

  $('oppSub').textContent =
    g.over ? '' : mine ? '' : 'O‘ylanmoqda…';

  $('myCap').textContent = g.score[g.you];

  $('oppCap').textContent =
    g.score[g.you === 'w' ? 'b' : 'w'];

  if (g.chainPos != null && mine) {
    S.sel = g.chainPos;
  } else if (mine && S.sel == null) {
    const f = [
      ...new Set(g.legal.map((m) => m.from))
    ];

    if (f.length === 1) {
      S.sel = f[0];
    }
  }

  if (!mine) {
    S.sel = null;
  }

  const movable = new Set(
    mine ? g.legal.map((m) => m.from) : []
  );

  pcEls.forEach((el, i) => {
    el.classList.toggle('can', movable.has(i));
    el.classList.toggle('sel', i === S.sel);
  });

  sqEls.forEach((el, i) => {
    const t = S.sel != null
      ? g.legal.find(
          (m) => m.from === S.sel && m.to === i
        )
      : null;

    el.classList.toggle('tgt', !!t);
    el.classList.toggle(
      'cap',
      !!(t && t.cap != null)
    );

    el.classList.toggle('sel', i === S.sel);

    el.classList.toggle(
      'last',
      !!g.last && g.last.includes(i)
    );
  });
}

/* ---------- Shashka yurishlari ---------- */

$('field').addEventListener('pointerdown', (e) => {
  const g = S.g;

  if (
    !g ||
    g.over ||
    g.turn !== g.you ||
    S.busy ||
    S.q.length
  ) {
    return;
  }

  const r = $('field').getBoundingClientRect();

  let c = Math.floor(
    ((e.clientX - r.left) / r.width) * 8
  );

  let rw = Math.floor(
    ((e.clientY - r.top) / r.height) * 8
  );

  if (c < 0 || c > 7 || rw < 0 || rw > 7) return;

  if (flip()) {
    c = 7 - c;
    rw = 7 - rw;
  }

  const i = rw * 8 + c;

  if (
    S.sel != null &&
    g.legal.some(
      (m) => m.from === S.sel && m.to === i
    )
  ) {
    send({
      t: 'move',
      from: S.sel,
      to: i
    });

    S.sel = null;
    refresh();

    return;
  }

  if (g.chainPos != null) return;

  if (g.legal.some((m) => m.from === i)) {
    S.sel = i;
    haptic('sel');
  } else {
    S.sel = null;
  }

  refresh();
});

/* ---------- Raqib uzilishi ---------- */

function showAway(m) {
  clearInterval(S.awayTimer);

  const el = $('away');

  if (!m.left) {
    el.classList.add('hidden');
    return;
  }

  let n = m.seconds;

  const upd = () => {
    el.textContent =
      `Raqib aloqadan uzildi. ${n} soniyada qaytmasa, g‘alaba sizga beriladi.`;
  };

  upd();
  el.classList.remove('hidden');

  S.awayTimer = setInterval(() => {
    n = Math.max(0, n - 1);

    upd();

    if (!n) {
      clearInterval(S.awayTimer);
    }
  }, 1000);

  haptic('medium');
}

/* ---------- Chat ---------- */

function addChat(m, silent) {
  if (!S.g) return;

  const mine = m.from === S.g.you;
  const box = $('msgs');
  const d = document.createElement('div');

  d.className = 'm ' + (mine ? 'me' : 'opp');
  d.textContent = m.text;

  box.append(d);
  box.scrollTop = box.scrollHeight;

  if (
    !mine &&
    !silent &&
    $('sheetChat').classList.contains('hidden')
  ) {
    S.unread++;
    updateBadge();
    haptic('light');
  }
}

function updateBadge() {
  const b = $('badge');

  b.textContent = S.unread > 9 ? '9+' : S.unread;
  b.classList.toggle('hidden', !S.unread);
}

function sendChat() {
  const i = $('chatInput');
  const t = i.value.trim();

  if (!t) return;

  send({
    t: 'chat',
    text: t
  });

  i.value = '';
}

$('btnChat').onclick = () => {
  S.unread = 0;
  updateBadge();

  $('sheetChat').classList.remove('hidden');

  const b = $('msgs');
  b.scrollTop = b.scrollHeight;
};

$('btnCloseChat').onclick = () =>
  $('sheetChat').classList.add('hidden');

$('sheetChat').addEventListener('pointerdown', (e) => {
  if (e.target.id === 'sheetChat') {
    $('sheetChat').classList.add('hidden');
  }
});

$('btnSend').onclick = sendChat;

$('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendChat();
  }
});

/* ---------- Tugmalar ---------- */

$('btnBatl').onclick = () => {
  if (!S.searching) {
    setSearching(true);
    send({ t: 'find' });
    haptic('light');
  }
};

$('btnCancel').onclick = () =>
  send({ t: 'cancel' });

$('btnFriend').onclick = openInviteSheet;

$('btnCloseInvite').onclick = cancelInvite;
$('btnCancelInvite').onclick = cancelInvite;
$('btnCopyInvite').onclick = copyInviteLink;
$('btnShareInvite').onclick = shareInviteLink;

$('sheetInvite').addEventListener('pointerdown', (e) => {
  if (e.target.id === 'sheetInvite') {
    cancelInvite();
  }
});

$('btnMenu').onclick = () =>
  $('sheetMenu').classList.remove('hidden');

$('btnCloseMenu').onclick = () =>
  $('sheetMenu').classList.add('hidden');

$('sheetMenu').addEventListener('pointerdown', (e) => {
  if (e.target.id === 'sheetMenu') {
    $('sheetMenu').classList.add('hidden');
  }
});

$('btnResign').onclick = () => {
  const go = () => send({ t: 'resign' });

  if (tg && tg.showConfirm) {
    tg.showConfirm(
      'Haqiqatan ham taslim bo‘lasizmi?',
      (ok) => ok && go()
    );
  } else if (
    confirm('Haqiqatan ham taslim bo‘lasizmi?')
  ) {
    go();
  }

  $('sheetMenu').classList.add('hidden');
};

$('btnToMenu').onclick = () => {
  S.g = null;

  $('result').classList.add('hidden');
  show('menu');
};

$('btnAgain').onclick = () => {
  S.g = null;

  $('result').classList.add('hidden');
  show('menu');

  setSearching(true);
  send({ t: 'find' });
};

/* ---------- Ishga tushirish ---------- */

connect();

})();
