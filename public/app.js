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

/* ---------- TIL SOZLAMALARI ---------- */

const LANG_KEY = 'shashka_language';

let LANG = 'uz';

try {
  LANG = localStorage.getItem(LANG_KEY) || 'uz';
} catch (e) {}

if (LANG !== 'uz' && LANG !== 'kk') LANG = 'uz';

const KZ = {
  'Taklif havolasi tayyorlanmoqda...':'Шақыру сілтемесі дайындалуда...',
  'Havola nusxalandi! Do‘stingizga yuboring.':'Сілтеме көшірілді! Досыңызға жіберіңіз.',
  'Havolani bosib ushlab, nusxalashingiz mumkin.':'Сілтемені басып ұстап, көшіре аласыз.',
  'Keling, birga shashka o‘ynaymiz!':'Келіңіз, бірге дойбы ойнайық!',
  'Telegram ichida oching':'Telegram ішінде ашыңыз',
  'Bu o‘yin faqat Telegram Mini App sifatida ishlaydi.':'Бұл ойын тек Telegram Mini App ішінде жұмыс істейді.',
  'Raqib qidirilmoqda…':'Қарсылас ізделуде…',
  'BATL':'ОЙНАУ',
  'Do‘stingizning o‘yin xonasiga ulanmoqda...':'Досыңыздың ойын бөлмесіне қосылуда...',
  'Ikkinchi o‘yinchining kirishini kuting...':'Екінші ойыншының кіруін күтіңіз...',
  'Bu o‘yinning vaqti tugagan. Guruhda /game deb yozing.':'Бұл ойынның уақыты аяқталды. Топта /game деп жазыңыз.',
  'Bu o‘yin xonasi to‘lib ketdi.':'Бұл ойын бөлмесі толып кетті.',
  'Siz hozir boshqa o‘yindasiz.':'Сіз қазір басқа ойындасыз.',
  'Ikkinchi o‘yinchi hali o‘yinga kirmagan.':'Екінші ойыншы әлі ойынға кірмеді.',
  'O‘yin xonasiga qo‘shilish imkoni bo‘lmadi.':'Ойын бөлмесіне қосылу мүмкін болмады.',
  'Havola tayyor! Uni do‘stingizga yuboring.':'Сілтеме дайын! Оны досыңызға жіберіңіз.',
  'Do‘stingiz qo‘shildi! O‘yin boshlanmoqda...':'Досыңыз қосылды! Ойын басталуда...',
  'Taklif muddati tugadi. Yangi taklif yarating.':'Шақыру мерзімі аяқталды. Жаңа шақыру жасаңыз.',
  'Boshqa qurilmada ochildi':'Басқа құрылғыда ашылды',
  'Bu hisob boshqa joyda ochilgan. Shu yerda davom etish uchun o‘yinni qayta oching.':'Бұл аккаунт басқа құрылғыда ашылған. Жалғастыру үшін ойынды қайта ашыңыз.',
  'Kirish xatosi':'Кіру қатесі',
  'Telegram orqali tasdiqlab bo‘lmadi. O‘yinni bot orqali qayta oching.':'Telegram арқылы растау мүмкін болмады. Ойынды бот арқылы қайта ашыңыз.',
  'Taklif havolasi noto‘g‘ri yoki mavjud emas.':'Шақыру сілтемесі қате немесе жарамсыз.',
  'Taklif havolasining muddati tugagan.':'Шақыру сілтемесінің мерзімі аяқталған.',
  'O‘zingizning taklif havolangiz orqali qo‘shila olmaysiz.':'Өз шақыру сілтемеңіз арқылы қосыла алмайсыз.',
  'O‘yinchi hozir boshqa o‘yinda.':'Ойыншы қазір басқа ойында.',
  'Durang':'Тең ойын',
  'Siz yutdingiz!':'Сіз жеңдіңіз!',
  'Siz yutqazdingiz':'Сіз жеңілдіңіз',
  'Raqibning barcha shashkalari olindi':'Қарсыластың барлық дойбылары алынды',
  'Barcha shashkalaringiz olindi':'Барлық дойбыларыңыз алынды',
  'Raqibda yurish imkoni qolmadi':'Қарсыластың жүріс жасау мүмкіндігі қалмады',
  'Sizda yurish imkoni qolmadi':'Сізде жүріс жасау мүмкіндігі қалмады',
  'Raqib taslim bo‘ldi':'Қарсылас берілді',
  'Siz taslim bo‘ldingiz':'Сіз берілдіңіз',
  'Raqib o‘yindan chiqib ketdi':'Қарсылас ойыннан шықты',
  'Aloqa uzilgani uchun o‘yin tugadi':'Байланыс үзілгендіктен ойын аяқталды',
  'Raqibning vaqti tugadi':'Қарсыластың уақыты аяқталды',
  'Sizning vaqtingiz tugadi':'Сіздің уақытыңыз аяқталды',
  'Raqib 90 soniya ichida o‘yinga kirmadi':'Қарсылас 90 секунд ішінде ойынға кірмеді',
  'Siz 90 soniya ichida o‘yinga kirmadingiz':'Сіз 90 секунд ішінде ойынға кірмедіңіз',
  '15 ta yurish davomida urish va oddiy shashka yurishi bo‘lmadi':'15 жүріс бойы ұру немесе қарапайым жүріс жасалмады',
  'Ikkinchi o‘yinchi kutilmoqda...':'Екінші ойыншы күтілуде...',
  'Raqib kirishiga:':'Қарсыластың кіруіне:',
  'Urishni davom ettiring!':'Ұруды жалғастырыңыз!',
  'Urish majburiy!':'Ұру міндетті!',
  'Sizning yurishingiz':'Сіздің жүрісіңіз',
  'Kutilmoqda':'Күтілуде',
  'O‘yin boshlanishini kutmoqda...':'Ойынның басталуын күтуде...',
  'O‘ylanmoqda…':'Ойланып жатыр…',
  'Raqib aloqadan uzildi.':'Қарсыласпен байланыс үзілді.',
  'soniyada qaytmasa, g‘alaba sizga beriladi.':'секунд ішінде оралмаса, жеңіс сізге беріледі.',
  'Haqiqatan ham taslim bo‘lasizmi?':'Шынымен берілгіңіз келе ме?',
  'Sozlamalar':'Баптаулар',
  'Til':'Тіл',
  'Yopish':'Жабу',
  'Menyu':'Мәзір',
  'Chat':'Чат',
  'Do‘st bilan o‘ynash':'Доспен ойнау',
  'Tasodifiy raqib':'Кездейсоқ қарсылас',
  'Do‘stni taklif qilish':'Досты шақыру',
  'Havolani nusxalash':'Сілтемені көшіру',
  'Yuborish':'Жіберу',
  'Bekor qilish':'Болдырмау',
  'Taslim bo‘lish':'Берілу',
  'Qayta o‘ynash':'Қайта ойнау',
  'Asosiy menyu':'Басты мәзір',
  'Xabar yozing...':'Хабар жазыңыз...',
  'Yutish':'Жеңу'
};

function tr(text) {
  return LANG === 'kk' ? (KZ[text] || text) : text;
}

const originalText = new WeakMap();

function translateNode(node) {
  if (!node || node.nodeType !== 3) return;

  const parent = node.parentElement;

  if (
    parent &&
    (
      parent.closest('.m') ||
      ['meName', 'myName', 'oppName'].includes(parent.id)
    )
  ) return;

  let original = originalText.get(node);

  if (original === undefined) {
    original = node.nodeValue;
    originalText.set(node, original);
  }

  const translated = tr(original);

  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
}

function translatePage() {
  document.querySelectorAll('body *').forEach((el) => {
    if (
      el.closest('.m') ||
      ['meName', 'myName', 'oppName'].includes(el.id)
    ) return;

    el.childNodes.forEach(translateNode);

    ['placeholder', 'title', 'aria-label'].forEach((attr) => {
      if (el.hasAttribute(attr)) {
        const value = el.getAttribute(attr);
        const translated = tr(value);

        if (translated !== value) {
          if (!el.dataset['original' + attr]) {
            el.dataset['original' + attr] = value;
          }
          el.setAttribute(attr, translated);
        } else if (el.dataset['original' + attr]) {
          el.setAttribute(attr, el.dataset['original' + attr]);
        }
      }
    });
  });
}

function createLanguageSettings() {
  const panel = document.querySelector('#sheetMenu .panel.small');
  if (!panel || $('languageSettings')) return;

  const box = document.createElement('div');
  box.id = 'languageSettings';

  box.style.cssText = `
    margin-bottom:14px;
    padding:14px;
    border-radius:14px;
    background:rgba(0,0,0,.06);
    text-align:center;
  `;

  box.innerHTML = `
    <div id="languageTitle" style="font-weight:800;margin-bottom:10px">
      ⚙️ Sozlamalar
    </div>
    <div id="languageLabel" style="font-size:13px;margin-bottom:10px">
      🌐 Til
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" id="langUz" style="
        flex:1;padding:11px 5px;border:0;border-radius:10px;
        font-weight:800;background:#efe3cf;color:#2b1f17">
        🇺🇿 O‘zbekcha
      </button>
      <button type="button" id="langKz" style="
        flex:1;padding:11px 5px;border:0;border-radius:10px;
        font-weight:800;background:#efe3cf;color:#2b1f17">
        🇰🇿 Қазақша
      </button>
    </div>
  `;

  panel.insertBefore(box, panel.firstChild);

  $('langUz').onclick = () => changeLanguage('uz');
  $('langKz').onclick = () => changeLanguage('kk');

  updateLanguageButtons();
}

function updateLanguageButtons() {
  const uz = $('langUz');
  const kz = $('langKz');

  if (!uz || !kz) return;

  uz.style.opacity = LANG === 'uz' ? '1' : '.55';
  kz.style.opacity = LANG === 'kk' ? '1' : '.55';
}

function changeLanguage(lang) {
  if (lang !== 'uz' && lang !== 'kk') return;

  LANG = lang;

  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {}

  translatePage();
  updateLanguageButtons();

  if ($('languageTitle')) {
    $('languageTitle').textContent = tr('Sozlamalar');
    $('languageLabel').textContent = '🌐 ' + tr('Til');
  }

  if (S.g) refresh();

  haptic('sel');
}

const textObserver = new MutationObserver((records) => {
  records.forEach((record) => {
    if (record.type === 'characterData') {
      translateNode(record.target);
    }

    record.addedNodes && record.addedNodes.forEach((node) => {
      if (node.nodeType === 3) {
        translateNode(node);
      } else if (node.nodeType === 1) {
        node.querySelectorAll('*').forEach((el) => {
          el.childNodes.forEach(translateNode);
        });
        node.childNodes.forEach(translateNode);
      }
    });
  });
});

textObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

/* ---------- HAPTIC ---------- */

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
  groupJoinSent: false,
  groupWaiting: false,
  groupWaitDeadline: null,
  fatal: false
};

const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18l-1-11 5 4 5-7 5 7 5-4-1 11z"/></svg>';

/* ---------- START PARAMETRLARI ---------- */

function getStartValue() {
  const values = [];

  // Telegram WebApp start_param
  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
      values.push(tg.initDataUnsafe.start_param);
    }
  } catch (e) {}

  // Telegram initData ichidan start_param
  try {
    if (tg && tg.initData) {
      const data = new URLSearchParams(tg.initData);
      const value = data.get('start_param');
      if (value) values.push(value);
    }
  } catch (e) {}

  // Oddiy URL parametrlar
  try {
    const params = new URLSearchParams(location.search);

    [
      'tgWebAppStartParam',
      'startapp',
      'start_param',
      'invite'
    ].forEach((key) => {
      const value = params.get(key);
      if (value) values.push(value);
    });
  } catch (e) {}

  // URL hash ichidan ham tekshirish
  try {
    const hash = location.hash || '';
    const hashParams = new URLSearchParams(
      hash.startsWith('#') ? hash.slice(1) : hash
    );

    [
      'tgWebAppStartParam',
      'startapp',
      'start_param',
      'invite'
    ].forEach((key) => {
      const value = hashParams.get(key);
      if (value) values.push(value);
    });
  } catch (e) {}

  // Telegram ayrim holatlarda parametrni URL ichida kodlangan holda beradi
  for (const value of values) {
    if (typeof value !== 'string') continue;

    const clean = value.trim();

    if (
      clean.startsWith('group_') ||
      clean.startsWith('invite_')
    ) {
      return clean;
    }
  }

  return values.find(v => typeof v === 'string' && v.trim()) || '';
}

function getStartCode() {
  const value = getStartValue();

  return value.startsWith('invite_')
    ? value.slice(7)
    : '';
}

function getGroupCode() {
  const value = getStartValue();

  if (!value.startsWith('group_')) return '';

  const token = value.slice(6);

  return /^[a-f0-9]{32}$/i.test(token)
    ? token.toLowerCase()
    : '';
}

function showInviteStatus(message) {
  const el = $('inviteStatus');
  if (el) el.textContent = tr(message);
}

/* ---------- DO‘ST BILAN O‘YNASH ---------- */

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

  const text = tr('Keling, birga shashka o‘ynaymiz!');

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

/* ---------- ULANISH ---------- */

function connect() {
  if (
    S.ws &&
    (S.ws.readyState === WebSocket.CONNECTING ||
     S.ws.readyState === WebSocket.OPEN)
  ) return;

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

  $('fatalTitle').textContent = tr(t);
  $('fatalSub').textContent = tr(s);

  $('fatal').classList.remove('hidden');
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && (!S.ws || S.ws.readyState > 1)) {
    connect();
  }
});

/* ---------- YORDAMCHILAR ---------- */

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
    ? '<span class="spin"></span>' + tr('Raqib qidirilmoqda…')
    : tr('BATL');

  $('btnCancel').classList.toggle('hidden', !on);
}

/* ---------- XABARLARNI BOSHQARISH ---------- */

function onMsg(m) {
  switch (m.t) {
    case 'hello': {
      S.me = m.me;

      setAva($('meAva'), m.me);
      $('meName').textContent = m.me.name;

      S.groupCode = getGroupCode();

      if (S.groupCode && !S.groupJoinSent) {
        S.groupJoinSent = true;
        S.groupWaiting = true;

        $('sheetInvite').classList.add('hidden');

        send({
          t: 'group_join',
          token: S.groupCode
        });
      } else {
        if (!S.joinCode) S.joinCode = getStartCode();

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

    case 'group_waiting': {
      S.groupWaiting = true;

      if (m.deadline) {
        S.groupWaitDeadline = m.deadline;
      } else if (m.seconds != null && !S.groupWaitDeadline) {
        S.groupWaitDeadline = Date.now() + m.seconds * 1000;
      }

      $('sheetInvite').classList.add('hidden');

      if (S.g) {
        S.g.waitingForOpponent = true;
        S.g.legal = [];
        S.g.groupWaitDeadline = S.groupWaitDeadline;

        refresh();
        show('game');
      }

      break;
    }

    case 'group_started':
      S.groupWaiting = false;
      S.groupWaitDeadline = null;

      if (S.g) {
        S.g.waitingForOpponent = false;
        S.g.groupWaitDeadline = null;
        refresh();
        show('game');
      }

      $('sheetInvite').classList.add('hidden');
      haptic('heavy');
      break;

    case 'group_error':
      $('sheetInvite').classList.remove('hidden');

      showInviteStatus(
        m.code === 'expired'
          ? 'Bu o‘yinning vaqti tugagan. Guruhda /game deb yozing.'
          : m.code === 'full'
            ? 'Bu o‘yin xonasi to‘lib ketdi.'
            : m.code === 'busy'
              ? 'Siz hozir boshqa o‘yindasiz.'
              : m.code === 'waiting'
                ? 'Ikkinchi o‘yinchi hali o‘yinga kirmagan.'
                : 'O‘yin xonasiga qo‘shilish imkoni bo‘lmadi.'
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

      showInviteStatus('Havola tayyor! Uni do‘stingizga yuboring.');
      break;
    }

    case 'invite_joined':
      showInviteStatus('Do‘stingiz qo‘shildi! O‘yin boshlanmoqda...');
      break;

    case 'invite_expired':
      S.inviteCode = null;
      S.inviteLink = '';

      $('inviteLink').value = '';
      $('btnCopyInvite').disabled = true;
      $('btnShareInvite').disabled = true;

      showInviteStatus('Taklif muddati tugadi. Yangi taklif yarating.');
      break;

    case 'invite_cancelled':
      S.inviteCode = null;
      S.inviteLink = '';
      $('sheetInvite').classList.add('hidden');
      break;

    case 'game':
      startGame(m);
      break;

    case 'turn_timer':
      if (S.g) {
        S.g.turnDeadline = m.deadline || null;
        S.g.turnTimerSide = m.side || null;
        refresh();
      }
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
        'Boshqa qurilmada ochildi',
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
        showInviteStatus('Taklif havolasi noto‘g‘ri yoki mavjud emas.');
      } else if (m.code === 'invite_expired') {
        showInviteStatus('Taklif havolasining muddati tugagan.');
      } else if (m.code === 'invite_self') {
        showInviteStatus('O‘zingizning taklif havolangiz orqali qo‘shila olmaysiz.');
      } else if (m.code === 'busy') {
        showInviteStatus('O‘yinchi hozir boshqa o‘yinda.');
      }
      break;
  }
}

/* ---------- O‘YIN ---------- */

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
  el.style.transform = `translate(${c * 100}%,${r * 100}%)`;
};

function startGame(m) {
  S.q = [];
  S.busy = false;
  S.sel = null;
  S.unread = 0;
  S.joinCode = null;

  S.g = {
    id: m.id,
    you: m.you,
    players: m.players,
    board: m.board,
    turn: m.turn,
    legal: m.legal,
    score: m.score,
    chainPos: m.chainPos,
    waitingForOpponent: Boolean(
      m.waitingForOpponent || S.groupWaiting
    ),
    turnDeadline: m.turnDeadline || null,
    turnTimerSide: m.turnDeadline ? m.turn : null,
    groupWaitDeadline: S.groupWaitDeadline,
    over: null,
    last: null
  };

  S.groupWaiting = S.g.waitingForOpponent;

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

  $('oppDot').className = 'pdot ' + (m.you === 'w' ? 'b' : 'w');
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

    el.className = 'sq' + ((r + c) % 2 ? ' d' : '');

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
  g.turnDeadline = null;
  g.groupWaitDeadline = null;

  S.groupWaitDeadline = null;
  S.groupWaiting = false;

  refresh();

  await sleep(500);

  const win = m.result === g.you;
  const draw = m.result === 'draw';

  $('resEmoji').textContent =
    draw ? '🤝' : win ? '🏆' : '😔';

  $('resTitle').textContent =
    tr(
      draw
        ? 'Durang'
        : win
          ? 'Siz yutdingiz!'
          : 'Siz yutqazdingiz'
    );

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

    timeout: win
      ? 'Raqibning vaqti tugadi'
      : 'Sizning vaqtingiz tugadi',

    opponent_timeout: win
      ? 'Raqib 90 soniya ichida o‘yinga kirmadi'
      : 'Siz 90 soniya ichida o‘yinga kirmadingiz',

    draw: '15 ta yurish davomida urish va oddiy shashka yurishi bo‘lmadi'
  };

  $('resSub').textContent = tr(R[m.reason] || '');

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

/* ---------- KO‘RINISHNI YANGILASH ---------- */

function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');

  return `${mm}:${ss}`;
}

function refresh() {
  const g = S.g;
  if (!g) return;

  const waiting = Boolean(g.waitingForOpponent);
  const mine = g.turn === g.you && !g.over && !waiting;

  $('myAva').classList.toggle('turn', mine);
  $('oppAva').classList.toggle(
    'turn',
    !mine && !g.over && !waiting
  );

  const must =
    mine && g.legal.some((m) => m.cap != null);

  const ms = $('mySub');

  let waitingText = tr('Ikkinchi o‘yinchi kutilmoqda...');

  if (waiting && g.groupWaitDeadline) {
    const seconds = Math.max(
      0,
      Math.ceil((g.groupWaitDeadline - Date.now()) / 1000)
    );

    waitingText = `⏳ ${tr('Raqib kirishiga:')} ${formatClock(seconds)}`;
  }

  ms.textContent = g.over
    ? ''
    : waiting
      ? waitingText
      : mine
        ? (
            g.chainPos != null
              ? tr('Urishni davom ettiring!')
              : must
                ? tr('Urish majburiy!')
                : tr('Sizning yurishingiz')
          )
        : tr('Kutilmoqda');

  ms.classList.toggle('hot', must);

  $('oppSub').textContent =
    g.over
      ? ''
      : waiting
        ? tr('O‘yin boshlanishini kutmoqda...')
        : mine
          ? ''
          : tr('O‘ylanmoqda…');

  if (
    !waiting &&
    !g.over &&
    g.turnDeadline &&
    g.turnTimerSide
  ) {
    const seconds = Math.max(
      0,
      Math.ceil((g.turnDeadline - Date.now()) / 1000)
    );

    const clock = ` ⏱ ${formatClock(seconds)}`;

    if (g.turnTimerSide === g.you) {
      ms.textContent += clock;
    } else {
      $('oppSub').textContent += clock;
    }
  }

  $('myCap').textContent = g.score[g.you];

  $('oppCap').textContent =
    g.score[g.you === 'w' ? 'b' : 'w'];

  if (waiting) {
    S.sel = null;
  } else if (g.chainPos != null && mine) {
    S.sel = g.chainPos;
  } else if (mine && S.sel == null) {
    const f = [...new Set(g.legal.map((m) => m.from))];

    if (f.length === 1) S.sel = f[0];
  }

  if (!mine) S.sel = null;

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
    el.classList.toggle('cap', !!(t && t.cap != null));
    el.classList.toggle('sel', i === S.sel);

    el.classList.toggle(
      'last',
      !!g.last && g.last.includes(i)
    );
  });
}

/* Тайmerni yangilash */
setInterval(() => {
  if (!S.g || S.g.over) return;

  if (S.g.waitingForOpponent && S.g.groupWaitDeadline) {
    refresh();
    return;
  }

  if (S.g.turnDeadline) {
    refresh();
  }
}, 1000);

/* ---------- SHASHKA YURISHLARI ---------- */

$('field').addEventListener('pointerdown', (e) => {
  const g = S.g;

  if (
    !g ||
    g.over ||
    g.waitingForOpponent ||
    g.turn !== g.you ||
    S.busy ||
    S.q.length
  ) return;

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

/* ---------- RAQIB UZILISHI ---------- */

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
      `${tr('Raqib aloqadan uzildi.')} ${n} ${tr('soniyada qaytmasa, g‘alaba sizga beriladi.')}`;
  };

  upd();
  el.classList.remove('hidden');

  S.awayTimer = setInterval(() => {
    n = Math.max(0, n - 1);
    upd();

    if (!n) clearInterval(S.awayTimer);
  }, 1000);

  haptic('medium');
}

/* ---------- CHAT ---------- */

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
  if (e.key === 'Enter') sendChat();
});

/* ---------- TUGMALAR ---------- */

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
  if (e.target.id === 'sheetInvite') cancelInvite();
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
      tr('Haqiqatan ham taslim bo‘lasizmi?'),
      (ok) => ok && go()
    );
  } else if (confirm(tr('Haqiqatan ham taslim bo‘lasizmi?'))) {
    go();
  }

  $('sheetMenu').classList.add('hidden');
};

$('btnToMenu').onclick = () => {
  S.g = null;
  S.groupWaiting = false;
  S.groupWaitDeadline = null;
  S.groupJoinSent = false;

  $('result').classList.add('hidden');
  show('menu');
};

$('btnAgain').onclick = () => {
  S.g = null;
  S.groupWaiting = false;
  S.groupWaitDeadline = null;
  S.groupJoinSent = false;

  $('result').classList.add('hidden');
  show('menu');

  setSearching(true);
  send({ t: 'find' });
};

/* ---------- ISHGA TUSHIRISH ---------- */

createLanguageSettings();
translatePage();
updateLanguageButtons();

connect();

})();
