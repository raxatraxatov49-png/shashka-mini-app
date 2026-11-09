
(() => {
'use strict';

const tg = window.Telegram && window.Telegram.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  try {
    tg.setHeaderColor('#121212');
    tg.setBackgroundColor('#121212');
  } catch (e) {}
}

const $ = (id) => document.getElementById(id);

/* ---------- ТІЛДЕР (uz / kk / ru) ---------- */

const LANGS = ['uz', 'kk', 'ru'];

function pickLang(v) {
  v = String(v || '').toLowerCase().slice(0, 2);
  return LANGS.includes(v) ? v : null;
}

let LANG = (() => {
  try {
    const q = pickLang(new URLSearchParams(location.search).get('lang'));
    if (q) return q;
  } catch (e) {}

  try {
    const s = pickLang(localStorage.getItem('shashka_lang'));
    if (s) return s;
  } catch (e) {}

  try {
    const c = pickLang(
      tg && tg.initDataUnsafe && tg.initDataUnsafe.user &&
      tg.initDataUnsafe.user.language_code
    );
    if (c) return c;
  } catch (e) {}

  return 'kk';
})();

const I18N = {
  "kk": {
    "playerRole": "Дойбы ойыншысы",
    "menuTitle": "Дойбы",
    "randomTitle": "Кездейсоқ қарсылас",
    "randomDesc": "Қазір қарсылас іздеп жүрген ойыншымен ойнаңыз",
    "play": "ОЙНАУ",
    "cancel": "Бас тарту",
    "friendTitle": "Досыңмен ойнау",
    "friendDesc": "Досыңа шақыру сілтемесін жіберіп, бірге дойбы ойна",
    "friendBtn": "ДОСЫҢМЕН ОЙНАУ",
    "boardTitle": "Классикалық тақта",
    "copyLink": "Сілтемені көшіру",
    "shareTg": "Telegram арқылы жіберу",
    "menu": "Мәзір",
    "chat": "Чат",
    "inviteFriend": "Досыңды шақыру",
    "close": "Жабу",
    "inviteLinkPh": "Шақыру сілтемесі",
    "cancelInvite": "Шақырудан бас тарту",
    "resign": "Берілемін",
    "msgPh": "Хабарлама жазыңыз…",
    "send": "Жіберу",
    "again": "Қайта ойнау",
    "toMenu": "Басты мәзір",
    "connLost": "Байланыс үзілді. Қайта қосылуда…",
    "waitFriend": "Дос күтілуде…",
    "invPreparing": "Шақыру сілтемесі дайындалуда...",
    "linkCopied": "Сілтеме көшірілді! Енді досыңызға жіберіңіз.",
    "copyFailed": "Көшіру мүмкін болмады. Сілтеме: {link}",
    "inviteText": "Кел, бірге дойбы ойнайық!",
    "openViaTg": "Telegram арқылы ашыңыз",
    "onlyTgApp": "Бұл ойын тек Telegram Mini App ішінде жұмыс істейді.",
    "searching": "Қарсылас ізделуде…",
    "joiningFriend": "Досыңыздың ойын бөлмесіне қосылуда...",
    "gErrExpired": "Бұл ойынның уақыты аяқталды. Топқа /game деп жазыңыз.",
    "gErrFull": "Бұл ойын бөлмесінде бос орын жоқ.",
    "gErrBusy": "Сіз қазір басқа ойындасыз.",
    "gErrWaiting": "Екінші ойыншы әлі ойынға кірген жоқ.",
    "gErrJoin": "Ойын бөлмесіне қосылу мүмкін болмады.",
    "linkReady": "Сілтеме дайын! Оны досыңызға жіберіңіз.",
    "friendJoined": "Досыңыз қосылды! Ойын басталуда...",
    "linkExpiredRenew": "Сілтеменің мерзімі өтті. Жаңасы жасалуда...",
    "inviteExpiredNew": "Шақыру мерзімі аяқталды. Жаңа шақыру жасаңыз.",
    "replacedTitle": "Басқа құрылғыда ашылды",
    "replacedSub": "Бұл есептік жазба басқа жерде ашылған. Осы жерде жалғастыру үшін ойынды қайта ашыңыз.",
    "authTitle": "Кіру қатесі",
    "authSub": "Telegram арқылы растау мүмкін болмады. Ойынды бот арқылы қайта ашыңыз.",
    "inviteInvalid": "Шақыру сілтемесі қате немесе жарамсыз.",
    "inviteExpired": "Шақыру сілтемесінің мерзімі аяқталған.",
    "inviteSelf": "Өзіңіздің шақыру сілтемеңіз арқылы қосыла алмайсыз.",
    "playerBusy": "Ойыншы қазір басқа ойында.",
    "draw": "Тең ойын!",
    "youWin": "Сіз жеңдіңіз!",
    "youLose": "Сіз жеңілдіңіз",
    "rNoPiecesWin": "Қарсыластың барлық тастары алынды",
    "rNoPiecesLose": "Сіздің барлық тастарыңыз алынды",
    "rNoMovesWin": "Қарсыластың жүретін жолы қалмады",
    "rNoMovesLose": "Сіздің жүретін жолыңыз қалмады",
    "rResignWin": "Қарсылас берілді",
    "rResignLose": "Сіз берілдіңіз",
    "rLeftWin": "Қарсылас ойыннан шығып кетті",
    "rLeftLose": "Байланыс үзілгендіктен ойын аяқталды",
    "rTimeoutWin": "Қарсыластың уақыты аяқталды",
    "rTimeoutLose": "Сіздің уақытыңыз аяқталды",
    "rOppTimeoutWin": "Қарсылас 90 секунд ішінде ойынға кірмеді",
    "rOppTimeoutLose": "Сіз 90 секунд ішінде ойынға кірмедіңіз",
    "rDraw": "15 жүріс бойы тасты алу да, қарапайым жүріс те болған жоқ",
    "waitSecond": "Екінші ойыншы күтілуде...",
    "waitEnter": "⏳ Қарсыластың кіруіне: {t}",
    "keepCapturing": "Тасты алуды жалғастырыңыз!",
    "mustCapture": "Тасты алу міндетті!",
    "yourTurn": "Сіздің кезегіңіз",
    "waitTurn": "Кезегін күтіңіз",
    "waitStart": "Ойынның басталуын күтуде...",
    "thinking": "Ойланып жатыр…",
    "youReady": "Сіз дайынсыз",
    "friendAutoStart": "Дос сілтемемен кіргенде ойын өзі басталады",
    "awayMsg": "Қарсыласпен байланыс үзілді. {n} секунд ішінде оралмаса, жеңіс сізге беріледі.",
    "confirmResign": "Шынымен берілгіңіз келе ме?",
    "shopTitle": "Магазин",
    "tabBoards": "Тақталар",
    "tabPieces": "Тастар",
    "shopTile": "Магазин",
    "shopTileSub": "Тақта мен тастар",
    "friendsTile": "Достар",
    "friendsTileSub": "+{n} койн / дос",
    "shopInviteBtn": "Достарды шақырып койн жина",
    "refTitle": "Достарды шақыр",
    "refHead": "Әр дос = {n} койн",
    "refDesc": "Досың сілтеме арқылы алғаш рет кіріп, Telegram арқылы расталса, саған {n} койн автоматты түрде қосылады.",
    "invitedCount": "шақырылған дос",
    "invitedEmpty": "Әзірге ешкім жоқ",
    "refJoined": "🎉 {name} қосылды! +{n} койн",
    "inUse": "✓ Қолданыста",
    "choose": "Таңдау",
    "bought": "Сатып алынды",
    "selected": "Таңдалды",
    "noCoins": "Койн жетпейді. Достарды шақыр!",
    "item_b0": "Классикалық",
    "item_b1": "Жасыл шалғын",
    "item_b2": "Мұхит",
    "item_b3": "Қара мәрмәр",
    "item_b4": "Алтын сарай",
    "item_p0": "Классикалық",
    "item_p1": "Қызыл және көк",
    "item_p2": "Алтын және күміс",
    "item_p3": "Неон",
    "item_p4": "Алмаз",
    "rar0": "Қарапайым",
    "rar1": "Сирек",
    "rar2": "Эпик",
    "rar3": "Аңызға айналған"
  },
  "uz": {
    "playerRole": "Shashka o‘yinchisi",
    "menuTitle": "Shashka",
    "randomTitle": "Tasodifiy raqib",
    "randomDesc": "Hozir raqib izlayotgan o‘yinchi bilan o‘ynang",
    "play": "O‘YNASH",
    "cancel": "Bekor qilish",
    "friendTitle": "Do‘st bilan o‘ynash",
    "friendDesc": "Do‘stingizga taklif havolasini yuborib, birga shashka o‘ynang",
    "friendBtn": "DO‘ST BILAN O‘YNASH",
    "boardTitle": "Klassik taxta",
    "copyLink": "Havolani nusxalash",
    "shareTg": "Telegram orqali yuborish",
    "menu": "Menyu",
    "chat": "Chat",
    "inviteFriend": "Do‘stni taklif qilish",
    "close": "Yopish",
    "inviteLinkPh": "Taklif havolasi",
    "cancelInvite": "Taklifni bekor qilish",
    "resign": "Taslim bo‘laman",
    "msgPh": "Xabar yozing…",
    "send": "Yuborish",
    "again": "Qayta o‘ynash",
    "toMenu": "Asosiy menyu",
    "connLost": "Aloqa uzildi. Qayta ulanmoqda…",
    "waitFriend": "Do‘st kutilmoqda…",
    "invPreparing": "Taklif havolasi tayyorlanmoqda...",
    "linkCopied": "Havola nusxalandi! Endi do‘stingizga yuboring.",
    "copyFailed": "Nusxalab bo‘lmadi. Havola: {link}",
    "inviteText": "Kel, birga shashka o‘ynaymiz!",
    "openViaTg": "Telegram orqali oching",
    "onlyTgApp": "Bu o‘yin faqat Telegram Mini App ichida ishlaydi.",
    "searching": "Raqib izlanmoqda…",
    "joiningFriend": "Do‘stingizning o‘yin xonasiga qo‘shilmoqda...",
    "gErrExpired": "Bu o‘yinning vaqti tugadi. Guruhga /game deb yozing.",
    "gErrFull": "Bu o‘yin xonasida bo‘sh joy yo‘q.",
    "gErrBusy": "Siz hozir boshqa o‘yindasiz.",
    "gErrWaiting": "Ikkinchi o‘yinchi hali o‘yinga kirmadi.",
    "gErrJoin": "O‘yin xonasiga qo‘shilib bo‘lmadi.",
    "linkReady": "Havola tayyor! Uni do‘stingizga yuboring.",
    "friendJoined": "Do‘stingiz qo‘shildi! O‘yin boshlanmoqda...",
    "linkExpiredRenew": "Havola muddati tugadi. Yangisi yaratilmoqda...",
    "inviteExpiredNew": "Taklif muddati tugadi. Yangi taklif yarating.",
    "replacedTitle": "Boshqa qurilmada ochildi",
    "replacedSub": "Bu hisob boshqa joyda ochilgan. Shu yerda davom etish uchun o‘yinni qayta oching.",
    "authTitle": "Kirish xatosi",
    "authSub": "Telegram orqali tasdiqlab bo‘lmadi. O‘yinni bot orqali qayta oching.",
    "inviteInvalid": "Taklif havolasi noto‘g‘ri yoki yaroqsiz.",
    "inviteExpired": "Taklif havolasining muddati tugagan.",
    "inviteSelf": "O‘zingizning taklif havolangiz orqali qo‘shila olmaysiz.",
    "playerBusy": "O‘yinchi hozir boshqa o‘yinda.",
    "draw": "Durang!",
    "youWin": "Siz yutdingiz!",
    "youLose": "Siz yutqazdingiz",
    "rNoPiecesWin": "Raqibning barcha toshlari olindi",
    "rNoPiecesLose": "Sizning barcha toshlaringiz olindi",
    "rNoMovesWin": "Raqibning yurish imkoni qolmadi",
    "rNoMovesLose": "Sizning yurish imkoningiz qolmadi",
    "rResignWin": "Raqib taslim bo‘ldi",
    "rResignLose": "Siz taslim bo‘ldingiz",
    "rLeftWin": "Raqib o‘yindan chiqib ketdi",
    "rLeftLose": "Aloqa uzilgani sababli o‘yin tugadi",
    "rTimeoutWin": "Raqibning vaqti tugadi",
    "rTimeoutLose": "Sizning vaqtingiz tugadi",
    "rOppTimeoutWin": "Raqib 90 soniya ichida o‘yinga kirmadi",
    "rOppTimeoutLose": "Siz 90 soniya ichida o‘yinga kirmadingiz",
    "rDraw": "15 yurish davomida tosh olinmadi va oddiy toshda yurish ham bo‘lmadi",
    "waitSecond": "Ikkinchi o‘yinchi kutilmoqda...",
    "waitEnter": "⏳ Raqibning kirishiga: {t}",
    "keepCapturing": "Tosh olishni davom ettiring!",
    "mustCapture": "Tosh olish majburiy!",
    "yourTurn": "Sizning navbatingiz",
    "waitTurn": "Navbatni kuting",
    "waitStart": "O‘yin boshlanishi kutilmoqda...",
    "thinking": "O‘ylayapti…",
    "youReady": "Siz tayyorsiz",
    "friendAutoStart": "Do‘st havola orqali kirganda o‘yin o‘zi boshlanadi",
    "awayMsg": "Raqib bilan aloqa uzildi. {n} soniya ichida qaytmasa, g‘alaba sizga beriladi.",
    "confirmResign": "Haqiqatan taslim bo‘lmoqchimisiz?",
    "shopTitle": "Do‘kon",
    "tabBoards": "Taxtalar",
    "tabPieces": "Toshlar",
    "shopTile": "Do‘kon",
    "shopTileSub": "Taxta va toshlar",
    "friendsTile": "Do‘stlar",
    "friendsTileSub": "+{n} koin / do‘st",
    "shopInviteBtn": "Do‘stlarni taklif qilib koin yig‘",
    "refTitle": "Do‘stlarni taklif qil",
    "refHead": "Har bir do‘st = {n} koin",
    "refDesc": "Do‘stingiz havola orqali birinchi marta kirib, Telegram orqali tasdiqlansa, sizga {n} koin avtomatik qo‘shiladi.",
    "invitedCount": "taklif qilingan do‘st",
    "invitedEmpty": "Hozircha hech kim yo‘q",
    "refJoined": "🎉 {name} qo‘shildi! +{n} koin",
    "inUse": "✓ Ishlatilmoqda",
    "choose": "Tanlash",
    "bought": "Sotib olindi",
    "selected": "Tanlandi",
    "noCoins": "Koin yetmaydi. Do‘stlarni taklif qil!",
    "item_b0": "Klassik",
    "item_b1": "Yashil o‘tloq",
    "item_b2": "Okean",
    "item_b3": "Qora marmar",
    "item_b4": "Oltin saroy",
    "item_p0": "Klassik",
    "item_p1": "Qizil va ko‘k",
    "item_p2": "Oltin va kumush",
    "item_p3": "Neon",
    "item_p4": "Olmos",
    "rar0": "Oddiy",
    "rar1": "Noyob",
    "rar2": "Epik",
    "rar3": "Afsonaviy"
  },
  "ru": {
    "playerRole": "Игрок в шашки",
    "menuTitle": "Шашки",
    "randomTitle": "Случайный соперник",
    "randomDesc": "Сыграйте с игроком, который сейчас ищет соперника",
    "play": "ИГРАТЬ",
    "cancel": "Отмена",
    "friendTitle": "Играть с другом",
    "friendDesc": "Отправьте другу ссылку-приглашение и играйте вместе",
    "friendBtn": "ИГРАТЬ С ДРУГОМ",
    "boardTitle": "Классическая доска",
    "copyLink": "Скопировать ссылку",
    "shareTg": "Отправить через Telegram",
    "menu": "Меню",
    "chat": "Чат",
    "inviteFriend": "Пригласить друга",
    "close": "Закрыть",
    "inviteLinkPh": "Ссылка-приглашение",
    "cancelInvite": "Отменить приглашение",
    "resign": "Сдаться",
    "msgPh": "Напишите сообщение…",
    "send": "Отправить",
    "again": "Играть ещё раз",
    "toMenu": "Главное меню",
    "connLost": "Связь потеряна. Переподключение…",
    "waitFriend": "Ожидание друга…",
    "invPreparing": "Готовим ссылку-приглашение...",
    "linkCopied": "Ссылка скопирована! Теперь отправьте её другу.",
    "copyFailed": "Не удалось скопировать. Ссылка: {link}",
    "inviteText": "Давай сыграем в шашки вместе!",
    "openViaTg": "Откройте через Telegram",
    "onlyTgApp": "Эта игра работает только внутри Telegram Mini App.",
    "searching": "Поиск соперника…",
    "joiningFriend": "Подключение к игровой комнате друга...",
    "gErrExpired": "Время этой игры истекло. Напишите /game в группе.",
    "gErrFull": "В этой игровой комнате нет свободных мест.",
    "gErrBusy": "Вы сейчас в другой игре.",
    "gErrWaiting": "Второй игрок ещё не вошёл в игру.",
    "gErrJoin": "Не удалось подключиться к игровой комнате.",
    "linkReady": "Ссылка готова! Отправьте её другу.",
    "friendJoined": "Друг присоединился! Игра начинается...",
    "linkExpiredRenew": "Срок ссылки истёк. Создаём новую...",
    "inviteExpiredNew": "Срок приглашения истёк. Создайте новое.",
    "replacedTitle": "Открыто на другом устройстве",
    "replacedSub": "Этот аккаунт открыт в другом месте. Чтобы продолжить здесь, откройте игру заново.",
    "authTitle": "Ошибка входа",
    "authSub": "Не удалось подтвердить через Telegram. Откройте игру заново через бота.",
    "inviteInvalid": "Ссылка-приглашение неверна или недействительна.",
    "inviteExpired": "Срок действия приглашения истёк.",
    "inviteSelf": "Нельзя присоединиться по собственной ссылке.",
    "playerBusy": "Игрок сейчас в другой игре.",
    "draw": "Ничья!",
    "youWin": "Вы победили!",
    "youLose": "Вы проиграли",
    "rNoPiecesWin": "Все шашки соперника взяты",
    "rNoPiecesLose": "Все ваши шашки взяты",
    "rNoMovesWin": "У соперника не осталось ходов",
    "rNoMovesLose": "У вас не осталось ходов",
    "rResignWin": "Соперник сдался",
    "rResignLose": "Вы сдались",
    "rLeftWin": "Соперник вышел из игры",
    "rLeftLose": "Игра закончилась из-за потери связи",
    "rTimeoutWin": "У соперника закончилось время",
    "rTimeoutLose": "У вас закончилось время",
    "rOppTimeoutWin": "Соперник не вошёл в игру за 90 секунд",
    "rOppTimeoutLose": "Вы не вошли в игру за 90 секунд",
    "rDraw": "За 15 ходов не было ни взятия, ни хода простой шашкой",
    "waitSecond": "Ожидание второго игрока...",
    "waitEnter": "⏳ До входа соперника: {t}",
    "keepCapturing": "Продолжайте брать шашки!",
    "mustCapture": "Взятие обязательно!",
    "yourTurn": "Ваш ход",
    "waitTurn": "Ожидайте хода",
    "waitStart": "Ожидание начала игры...",
    "thinking": "Думает…",
    "youReady": "Вы готовы",
    "friendAutoStart": "Игра начнётся, когда друг войдёт по ссылке",
    "awayMsg": "Связь с соперником потеряна. Если он не вернётся за {n} сек., победа достанется вам.",
    "confirmResign": "Вы действительно хотите сдаться?",
    "shopTitle": "Магазин",
    "tabBoards": "Доски",
    "tabPieces": "Шашки",
    "shopTile": "Магазин",
    "shopTileSub": "Доски и шашки",
    "friendsTile": "Друзья",
    "friendsTileSub": "+{n} коинов / друг",
    "shopInviteBtn": "Пригласи друзей и копи коины",
    "refTitle": "Пригласи друзей",
    "refHead": "Каждый друг = {n} коинов",
    "refDesc": "Когда друг впервые зайдёт по ссылке и вход подтвердится через Telegram, вам автоматически начислится {n} коинов.",
    "invitedCount": "приглашённых друзей",
    "invitedEmpty": "Пока никого нет",
    "refJoined": "🎉 {name} присоединился! +{n} коинов",
    "inUse": "✓ Используется",
    "choose": "Выбрать",
    "bought": "Куплено",
    "selected": "Выбрано",
    "noCoins": "Не хватает коинов. Пригласи друзей!",
    "item_b0": "Классическая",
    "item_b1": "Зелёный луг",
    "item_b2": "Океан",
    "item_b3": "Чёрный мрамор",
    "item_b4": "Золотой дворец",
    "item_p0": "Классические",
    "item_p1": "Красные и синие",
    "item_p2": "Золото и серебро",
    "item_p3": "Неон",
    "item_p4": "Алмаз",
    "rar0": "Обычный",
    "rar1": "Редкий",
    "rar2": "Эпический",
    "rar3": "Легендарный"
  }
};

const tr = (key, vars) => {
  let s = (I18N[LANG] && I18N[LANG][key]);

  if (s === undefined) s = I18N.kk[key];
  if (s === undefined) return key;

  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) =>
      vars[k] !== undefined ? String(vars[k]) : m
    );
  }

  return s;
};

function applyStatic() {
  document.documentElement.lang = LANG;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = tr(el.dataset.i18nPh);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  });
}

function setLang(l) {
  l = pickLang(l);

  if (!l || l === LANG) return;

  LANG = l;

  try { localStorage.setItem('shashka_lang', l); } catch (e) {}

  applyStatic();
  setSearching(S.searching);
  if (S.shop) { renderShop(); renderRefs(); }

  if (S.g) {
    if (S.g.invite) {
      S.g.players.b.name = tr('waitFriend');
      $('oppName').textContent = tr('waitFriend');
    }

    refresh();
  }
}


/* ---------- ДІРІЛ ӘСЕРІ ---------- */

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
  inviteMode: false,
  joinCode: null,
  groupCode: null,
  groupJoinSent: false,
  groupWaiting: false,
  groupWaitDeadline: null,
  fatal: false,
  refSent: false,
  shop: null,
  shopTab: 'boards'
};

const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18l-1-11 5 4 5-7 5 7 5-4-1 11z"/></svg>';

/* ---------- БАСТАПҚЫ ПАРАМЕТРЛЕР ---------- */

function getStartValue() {
  const values = [];

  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
      values.push(tg.initDataUnsafe.start_param);
    }
  } catch (e) {}

  try {
    if (tg && tg.initData) {
      const data = new URLSearchParams(tg.initData);
      const value = data.get('start_param');
      if (value) values.push(value);
    }
  } catch (e) {}

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
  if (el) el.textContent = message;

  const bar = $('invStatus');
  if (bar && S.inviteMode) bar.textContent = message;
}

function enableInviteButtons(on) {
  ['btnCopyInvite', 'btnShareInvite', 'btnInvCopy', 'btnInvShare'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !on;
  });
}

/* ---------- ДОСПЕН ОЙНАУ ---------- */

function startInviteRoom() {
  if (!S.me || S.g) return;

  S.inviteMode = true;
  S.inviteCode = null;
  S.inviteLink = '';

  const board = Array(64).fill(null);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r * 8 + c] = 'b';
        else if (r > 4) board[r * 8 + c] = 'w';
      }
    }
  }

  S.q = [];
  S.busy = false;
  S.sel = null;
  S.unread = 0;

  S.g = {
    id: 'invite',
    you: 'w',
    players: {
      w: S.me,
      b: { name: tr('waitFriend'), avatar: null }
    },
    board,
    turn: 'w',
    legal: [],
    score: { w: 0, b: 0 },
    chainPos: null,
    waitingForOpponent: true,
    turnDeadline: null,
    turnTimerSide: null,
    groupWaitDeadline: null,
    invite: true,
    over: null,
    last: null
  };

  ['sheetMenu', 'sheetChat', 'sheetInvite', 'result', 'away'].forEach((i) => {
    $(i).classList.add('hidden');
  });

  setAva($('myAva'), S.me);
  $('myName').textContent = S.me.name;

  const oa = $('oppAva');
  oa.textContent = '?';
  oa.style.background = '';
  oa.classList.add('wait');

  $('oppName').textContent = tr('waitFriend');
  $('oppDot').className = 'pdot b';
  $('myDot').className = 'pdot w';

  $('msgs').textContent = '';
  updateBadge();

  $('game').classList.add('inviting');
  enableInviteButtons(false);
  showInviteStatus(tr('invPreparing'));

  buildSquares();
  renderPieces();
  refresh();
  show('game');

  send({ t: 'invite_create' });
  haptic('light');
}

function leaveInviteRoom() {
  S.inviteMode = false;
  S.inviteCode = null;
  S.inviteLink = '';
  S.g = null;

  $('game').classList.remove('inviting');
  $('oppAva').classList.remove('wait');

  show('menu');
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
      const ta = document.createElement('textarea');
      ta.value = S.inviteLink;
      ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.append(ta);
      ta.focus();
      ta.select();

      const copied = document.execCommand('copy');
      ta.remove();

      if (!copied) throw new Error('Көшіру сәтсіз аяқталды');
    }

    showInviteStatus(tr('linkCopied'));
    haptic('light');
  } catch (e) {
    showInviteStatus(tr('copyFailed', { link: S.inviteLink }));
  }
}

function shareInviteLink() {
  if (!S.inviteLink) return;

  const text = tr('inviteText');

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

  if (S.inviteMode) leaveInviteRoom();
}

/* ---------- ҚОСЫЛУ ---------- */

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
        tr('openViaTg'),
        tr('onlyTgApp')
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

  ws.onerror = (e) => {
    console.error('WebSocket қатесі:', e);
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

/* ---------- КӨМЕКШІ ФУНКЦИЯЛАР ---------- */

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
      if (id === 'game') {
        tg.BackButton.show();
        tg.enableClosingConfirmation();
      } else {
        id === 'shop' || id === 'refs'
          ? tg.BackButton.show()
          : tg.BackButton.hide();
        tg.disableClosingConfirmation();
      }
    } catch (e) {}
  }
}

if (tg) {
  try {
    tg.BackButton.onClick(() => {
      if (
        $('shop').classList.contains('active') ||
        $('refs').classList.contains('active')
      ) {
        show('menu');
        return;
      }

      if (S.inviteMode) {
        cancelInvite();
        return;
      }

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
    ? '<span class="spin"></span>' + tr('searching')
    : tr('play');

  $('btnCancel').classList.toggle('hidden', !on);
}

/* ---------- ХАБАРЛАРДЫ ӨҢДЕУ ---------- */

function onMsg(m) {
  switch (m.t) {
    case 'hello': {
      S.me = m.me;
      if (m.lang) setLang(m.lang);

      setAva($('meAva'), m.me);
      $('meName').textContent = m.me.name;

      const refCode = getRefCode();

      if (refCode && !S.refSent) {
        S.refSent = true;
        send({ t: 'ref_claim', code: refCode });
      }

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
            tr('joiningFriend')
          );

          send({
            t: 'invite_join',
            code: S.joinCode
          });
        }
      }

      if (S.inviteMode) send({ t: 'invite_create' });

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
          ? tr('gErrExpired')
          : m.code === 'full'
            ? tr('gErrFull')
            : m.code === 'busy'
              ? tr('gErrBusy')
              : m.code === 'waiting'
                ? tr('gErrWaiting')
                : tr('gErrJoin')
      );

      break;

    case 'shop':
      onShop(m);
      break;

    case 'lang':
      setLang(m.lang);
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
      enableInviteButtons(true);

      showInviteStatus(tr('linkReady'));
      break;
    }

    case 'invite_joined':
      showInviteStatus(tr('friendJoined'));
      break;

    case 'invite_expired':
      S.inviteCode = null;
      S.inviteLink = '';

      $('inviteLink').value = '';
      enableInviteButtons(false);

      if (S.inviteMode) {
        showInviteStatus(tr('linkExpiredRenew'));
        send({ t: 'invite_create' });
      } else {
        showInviteStatus(tr('inviteExpiredNew'));
      }
      break;

    case 'invite_cancelled':
      S.inviteCode = null;
      S.inviteLink = '';
      $('sheetInvite').classList.add('hidden');
      if (S.inviteMode) leaveInviteRoom();
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
        tr('replacedTitle'),
        tr('replacedSub')
      );
      break;

    case 'error':
      if (m.code === 'auth') {
        fatal(
          tr('authTitle'),
          tr('authSub')
        );
      } else if (m.code === 'invite_invalid') {
        showInviteStatus(tr('inviteInvalid'));
      } else if (m.code === 'invite_expired') {
        showInviteStatus(tr('inviteExpired'));
      } else if (m.code === 'invite_self') {
        showInviteStatus(tr('inviteSelf'));
      } else if (m.code === 'busy') {
        showInviteStatus(tr('playerBusy'));
      }
      break;
  }
}

/* ---------- ОЙЫН ---------- */

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

  S.inviteMode = false;
  $('game').classList.remove('inviting');
  $('oppAva').classList.remove('wait');

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
    draw ? tr('draw') : win ? tr('youWin') : tr('youLose');

  const R = {
    no_pieces: tr(win ? 'rNoPiecesWin' : 'rNoPiecesLose'),
    no_moves: tr(win ? 'rNoMovesWin' : 'rNoMovesLose'),
    resign: tr(win ? 'rResignWin' : 'rResignLose'),
    left: tr(win ? 'rLeftWin' : 'rLeftLose'),
    timeout: tr(win ? 'rTimeoutWin' : 'rTimeoutLose'),
    opponent_timeout: tr(win ? 'rOppTimeoutWin' : 'rOppTimeoutLose'),
    draw: tr('rDraw')
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

/* ---------- ЭКРАНДЫ ЖАҢАРТУ ---------- */

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

  let waitingText = tr('waitSecond');

  if (waiting && g.groupWaitDeadline) {
    const seconds = Math.max(
      0,
      Math.ceil((g.groupWaitDeadline - Date.now()) / 1000)
    );

    waitingText = tr('waitEnter', { t: formatClock(seconds) });
  }

  ms.textContent = g.over
    ? ''
    : waiting
      ? waitingText
      : mine
        ? (
            g.chainPos != null
              ? tr('keepCapturing')
              : must
                ? tr('mustCapture')
                : tr('yourTurn')
          )
        : tr('waitTurn');

  ms.classList.toggle('hot', must);

  $('oppSub').textContent =
    g.over
      ? ''
      : waiting
        ? tr('waitStart')
        : mine
          ? ''
          : tr('thinking');

  if (g.invite) {
    ms.textContent = tr('youReady');
    $('oppSub').textContent = tr('friendAutoStart');
  }

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

/* УАҚЫТТЫ ЖАҢАРТУ */
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

/* ---------- ДОЙБЫ ЖҮРІСТЕРІ ---------- */

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

/* ---------- ҚАРСЫЛАСПЕН БАЙЛАНЫС ---------- */

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
      tr('awayMsg', { n });
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

/* ---------- ЧАТ ---------- */

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

/* ---------- БАТЫРМАЛАР ---------- */

$('btnBatl').onclick = () => {
  if (!S.searching) {
    setSearching(true);
    send({ t: 'find' });
    haptic('light');
  }
};

$('btnCancel').onclick = () =>
  send({ t: 'cancel' });

$('btnFriend').onclick = startInviteRoom;

$('btnInvCopy').onclick = copyInviteLink;
$('btnInvShare').onclick = shareInviteLink;
$('btnInvCancel').onclick = cancelInvite;

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
      tr('confirmResign'),
      (ok) => ok && go()
    );
  } else if (confirm(tr('confirmResign'))) {
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

/* ---------- ДҮКЕН ---------- */

// Түстер тек осында. Ойын тақтасы мен дүкен суреті сол түстерді қолданады.
// b0 / p0 — бұрынғы style.css дизайны, оны өзгертпейміз.
const SKINS = {
  boards: {
    b0: { a: '#d8cbb5', b: '#75583e' },
    b1: { a: '#eeeed2', b: '#6a9b4f' },
    b2: { a: '#dbe9f4', b: '#4b7fb5' },
    b3: { a: '#9a9a9a', b: '#2b2b2f' },
    b4: { a: '#fff0b8', b: '#c58a12' }
  },
  pieces: {
    p0: {
      w: 'radial-gradient(circle at 35% 30%,#fff,#e9e3d5 70%,#cfc6b3)',
      k: 'radial-gradient(circle at 35% 30%,#5a5a5f,#26262a 65%,#121214)'
    },
    p1: {
      w: 'radial-gradient(circle at 35% 30%,#ff9a9a,#c42b2b)',
      k: 'radial-gradient(circle at 35% 30%,#8fb7ff,#2b55c4)'
    },
    p2: {
      w: 'radial-gradient(circle at 35% 30%,#fff1a8,#d9a017)',
      k: 'radial-gradient(circle at 35% 30%,#fff,#a9b0b8)'
    },
    p3: {
      w: 'radial-gradient(circle at 35% 30%,#b4fff0,#00d1a0)',
      k: 'radial-gradient(circle at 35% 30%,#ffb4f4,#d100b0)'
    },
    p4: {
      w: 'radial-gradient(circle at 35% 30%,#fff,#7fd8ff 60%,#3a9bd6)',
      k: 'radial-gradient(circle at 35% 30%,#fff,#d3a6ff 60%,#8c4fd6)'
    }
  }
};

(function buildSkinCss() {
  let css = '';

  for (const [id, c] of Object.entries(SKINS.boards)) {
    if (id === 'b0') continue;

    css +=
      `#field[data-board="${id}"] .sq{background:${c.a}}` +
      `#field[data-board="${id}"] .sq.d{background:${c.b}}`;
  }

  for (const [id, c] of Object.entries(SKINS.pieces)) {
    if (id === 'p0') continue;

    css +=
      `#field[data-pieces="${id}"] .pc.w>i{background:${c.w}}` +
      `#field[data-pieces="${id}"] .pc.b>i{background:${c.k}}`;
  }

  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);
})();

const fmt = (n) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const rarity = (p) => (p === 0 ? 0 : p <= 1500 ? 1 : p <= 4000 ? 2 : 3);

function toast(text) {
  const el = document.createElement('div');

  el.className = 'toast';
  el.textContent = text;
  document.body.append(el);

  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2000);
}

function applySkin() {
  if (!S.shop) return;

  const f = $('field');

  f.dataset.board = S.shop.use.boards;
  f.dataset.pieces = S.shop.use.pieces;
}

function thumb(kind, id) {
  if (kind === 'boards') {
    const c = SKINS.boards[id];
    let h = '';

    for (let r = 0; r < 4; r++) {
      for (let q = 0; q < 4; q++) {
        h += `<i style="background:${(r + q) % 2 ? c.b : c.a}"></i>`;
      }
    }

    return `<div class="tb">${h}</div>`;
  }

  const c = SKINS.pieces[id];

  return (
    '<div class="tp">' +
    `<b style="background:${c.w}"></b>` +
    `<b style="background:${c.k}"></b>` +
    '</div>'
  );
}

function renderShop() {
  const m = S.shop;
  if (!m) return;

  const kind = S.shopTab;

  $('tabBoards').classList.toggle('on', kind === 'boards');
  $('tabPieces').classList.toggle('on', kind === 'pieces');

  const html = Object.entries(m.prices[kind]).map(([id, price]) => {
    const own = m.own[kind].includes(id);
    const used = m.use[kind] === id;

    let btn;

    if (used) {
      btn = `<button class="sbuy on" type="button" disabled>${tr('inUse')}</button>`;
    } else if (own) {
      btn = `<button class="sbuy use" type="button" data-act="use" data-kind="${kind}" data-id="${id}">${tr('choose')}</button>`;
    } else {
      btn =
        `<button class="sbuy${m.coins < price ? ' no' : ''}" type="button" data-act="buy" data-kind="${kind}" data-id="${id}">` +
        `<i class="coin"></i>${fmt(price)}</button>`;
    }

    return (
      `<div class="sitem${used ? ' sel' : ''}">` +
      `<div class="spv">${thumb(kind, id)}</div>` +
      `<h3>${tr('item_' + id)}</h3>` +
      `<div class="rar r${rarity(price)}">${tr('rar' + rarity(price))}</div>` +
      btn +
      '</div>'
    );
  });

  $('shopGrid').innerHTML = html.join('');
}

function refLinkValue() {
  return S.shop
    ? `https://t.me/shashkaoyinibot?startapp=ref_${S.shop.ref}`
    : '';
}

function renderRefs() {
  const m = S.shop;
  if (!m) return;

  $('refLink').value = refLinkValue();
  $('refHead').textContent = tr('refHead', { n: m.reward });
  $('refDesc').textContent = tr('refDesc', { n: m.reward });
  $('refCount').textContent = m.invitedCount;

  const box = $('refList');
  box.textContent = '';

  if (!m.invited.length) {
    const p = document.createElement('p');

    p.className = 'empty';
    p.textContent = tr('invitedEmpty');
    box.append(p);

    return;
  }

  m.invited.forEach((f) => {
    const row = document.createElement('div');
    const ava = document.createElement('div');
    const name = document.createElement('b');
    const rw = document.createElement('span');

    row.className = 'rrow';
    ava.className = 'ava';
    rw.className = 'rw';

    setAva(ava, { name: f.name || '?', avatar: null });

    name.textContent = f.name || '—';
    rw.textContent = '+' + m.reward;

    row.append(ava, name, rw);
    box.append(row);
  });
}

function onShop(m) {
  S.shop = m;

  document.querySelectorAll('.cnum').forEach((e) => {
    e.textContent = fmt(m.coins);
  });

  $('tileReward').textContent = tr('friendsTileSub', { n: m.reward });

  applySkin();
  renderShop();
  renderRefs();

  const ev = m.ev;
  if (!ev) return;

  if (ev.type === 'buy') {
    if (ev.ok) {
      toast(`${tr('bought')}: ${tr('item_' + ev.id)}`);
      haptic('medium');
    } else if (ev.code === 'no_coins') {
      toast(tr('noCoins'));
    }
  } else if (ev.type === 'use') {
    if (ev.ok) {
      toast(`${tr('selected')}: ${tr('item_' + ev.id)}`);
      haptic('light');
    }
  } else if (ev.type === 'ref') {
    toast(tr('refJoined', { name: ev.name, n: ev.reward }));
    haptic('heavy');
  }
}

function getRefCode() {
  const m = /^ref_([0-9a-zA-Z_]{1,30})$/.exec(getStartValue());

  return m ? m[1] : '';
}

function openShop(tab) {
  if (tab) S.shopTab = tab;

  send({ t: 'shop_get' });
  renderShop();
  show('shop');
}

function openRefs() {
  send({ t: 'shop_get' });
  renderRefs();
  show('refs');
}

async function copyRefLink() {
  const link = refLinkValue();
  if (!link) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
    } else {
      const ta = document.createElement('textarea');

      ta.value = link;
      ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.append(ta);
      ta.focus();
      ta.select();

      const ok = document.execCommand('copy');
      ta.remove();

      if (!ok) throw new Error('copy');
    }

    toast(tr('linkCopied'));
    haptic('light');
  } catch (e) {
    toast(tr('copyFailed', { link }));
  }
}

function shareRefLink() {
  const link = refLinkValue();
  if (!link) return;

  const url =
    'https://t.me/share/url?url=' + encodeURIComponent(link) +
    '&text=' + encodeURIComponent(tr('inviteText'));

  try {
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
  } catch (e) {
    window.open(url, '_blank');
  }
}

$('btnCoins').onclick = () => openShop();
$('btnShop').onclick = () => openShop();
$('btnRefs').onclick = openRefs;
$('btnShopRefs').onclick = openRefs;

document.querySelectorAll('[data-back]').forEach((b) => {
  b.onclick = () => show('menu');
});

$('tabBoards').onclick = () => { S.shopTab = 'boards'; renderShop(); };
$('tabPieces').onclick = () => { S.shopTab = 'pieces'; renderShop(); };

$('shopGrid').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b || !S.shop) return;

  const { act, kind, id } = b.dataset;

  if (act === 'buy') {
    if (S.shop.coins < S.shop.prices[kind][id]) {
      toast(tr('noCoins'));
      return;
    }

    send({ t: 'shop_buy', kind, id });
  } else {
    send({ t: 'shop_use', kind, id });
  }

  haptic('light');
});

$('btnRefCopy').onclick = copyRefLink;
$('btnRefShare').onclick = shareRefLink;

/* ---------- ІСКЕ ҚОСУ ---------- */

applyStatic();
setSearching(false);

connect();

})();
