
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
    "ratingTile": "Рейтинг",
    "ratingTileSub": "Үздік ойыншылар",
    "playersTile": "Ойыншылар",
    "playersTileSub": "Бот ойыншылары",
    "playersOnlineN": "● {n} онлайн",
    "playersTitle": "Ойыншылар",
    "playersOnline": "Онлайн",
    "playersOffline": "Офлайн",
    "playersEmpty": "Әзірге ойыншы жоқ",
    "playerOnlineLbl": "онлайн",
    "playerInGame": "ойында",
    "playerSeen": "соңғы кіру: {t}",
    "playerSeenUnknown": "баяғыда",
    "agoNow": "жаңа ғана",
    "agoMin": "{n} мин бұрын",
    "agoHour": "{n} сағ бұрын",
    "agoDay": "{n} күн бұрын",
    "pInvite": "Шақыру",
    "pInviteWait": "Күтуде… ✕",
    "pIncomingSub": "сені дойбы ойынына шақырды",
    "pAccept": "Қабылдау",
    "pDecline": "Қабылдамау",
    "pDeclined": "{name} шақыруды қабылдамады",
    "pExpired": "Шақыру уақыты бітті",
    "pOffline": "Ойыншы қазір офлайн",
    "pBusy": "Ойыншы қазір ойында",
    "micDenied": "Микрофонға рұқсат берілмеді",
    "payFail": "Төлем өтпеді",
    "adminTag": "АДМИН",
    "packsTitle": "Койн сатып алу",
    "coinsAdded": "+{n} койн қосылды!",
    "micBtn": "Микрофон",
    "sndBtn": "Дыбыс",
    "ratingTitle": "Рейтинг",
    "ratingWeek": "Осы апта",
    "ratingAll": "Барлық уақыт",
    "ratingWeekInfo": "7 күн сайын нөлден басталады · жаңаруға {t} қалды",
    "ratingAllInfo": "Кездейсоқ қарсыласпен толық ойнап жеңсеңіз +10 ұпай",
    "ratingEmpty": "Әзірге ешкім жоқ. Бірінші болыңыз!",
    "ratingLoading": "Жүктелуде…",
    "ratingPrizeTitle": "Апталық сыйлықтар",
    "ratingPrizeRest": "орын",
    "ratingPrizeNote": "Апта соңында койн автоматты түрде беріледі",
    "ratingYou": "Сіздің орныңыз",
    "ratingDH": "{d} күн {h} сағ",
    "ratingHM": "{h} сағ {m} мин",
    "ratingMin": "{m} мин",
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
    "item_b5": "Шие гүлі",
    "item_b6": "Терракота",
    "item_b7": "Түнгі орман",
    "item_b8": "Күлгін аспан",
    "item_b9": "Мұздық",
    "item_b10": "Лава",
    "item_b11": "Қара алтын",
    "item_b12": "Ғарыш",
    "item_p0": "Классикалық",
    "item_p1": "Қызыл және көк",
    "item_p2": "Алтын және күміс",
    "item_p3": "Неон",
    "item_p4": "Қарлы адам",
    "item_p5": "Жасыл және сары",
    "item_p6": "Қызғылт және көгілдір",
    "item_p7": "Қызғылт сары және күлгін",
    "item_p8": "Изумруд және топаз",
    "item_p9": "Мұз және от",
    "item_p10": "Қар ұшқыны",
    "item_p11": "Жаңа жылдық шырша",
    "item_p12": "Жаңа жылдық сыйлық",
    "watchBtn": "Ойынды қарау",
    "vipBtn": "VIP сатып алу",
    "vipOn": "VIP белсенді",
    "vipTitle": "Shashka VIP",
    "vipNew": "ЖАҢА",
    "vipSub": "1 ай бойы барлық мүмкіндік ашық",
    "vipP1": "Ойынды қарағанда чатқа жазу",
    "vipP2": "Барлық тақта түрлері",
    "vipP3": "Барлық тас түрлері",
    "vipP4": "Профильде VIP жазуы мен тәжі",
    "vipP5": "Мерзімі: 30 күн",
    "vipBuy": "{n} Stars / ай",
    "vipRenew": "Ұзарту: {n} Stars",
    "vipNote": "Төлем Telegram Stars арқылы жасалады",
    "vipLeft": "VIP белсенді: {n} күн қалды",
    "vipPaid": "VIP қосылды! Рахмет 👑",
    "watchBanner": "Сіз ойынды қарап отырсыз",
    "watchExit": "Қараудан шығу",
    "watchWhiteWin": "Ақ жеңді",
    "watchBlackWin": "Қара жеңді",
    "watchNoPieces": "Бір ойыншының барлық тастары алынды",
    "watchNoMoves": "Бір ойыншының жүретін жолы қалмады",
    "watchResign": "Ойыншы берілді",
    "watchLeft": "Ойыншы ойыннан шығып кетті",
    "watchTimeout": "Ойыншының уақыты аяқталды",
    "watchUnavailable": "Бұл ойын аяқталған немесе қарауға болмайды",
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
    "ratingTile": "Reyting",
    "ratingTileSub": "Eng yaxshi o‘yinchilar",
    "playersTile": "O‘yinchilar",
    "playersTileSub": "Bot o‘yinchilari",
    "playersOnlineN": "● {n} onlayn",
    "playersTitle": "O‘yinchilar",
    "playersOnline": "Onlayn",
    "playersOffline": "Oflayn",
    "playersEmpty": "Hozircha o‘yinchi yo‘q",
    "playerOnlineLbl": "onlayn",
    "playerInGame": "o‘yinda",
    "playerSeen": "oxirgi kirish: {t}",
    "playerSeenUnknown": "ancha oldin",
    "agoNow": "hozirgina",
    "agoMin": "{n} daq oldin",
    "agoHour": "{n} soat oldin",
    "agoDay": "{n} kun oldin",
    "pInvite": "Taklif qilish",
    "pInviteWait": "Kutilmoqda… ✕",
    "pIncomingSub": "sizni shashka o‘yiniga taklif qildi",
    "pAccept": "Qabul qilish",
    "pDecline": "Rad etish",
    "pDeclined": "{name} taklifni rad etdi",
    "pExpired": "Taklif muddati tugadi",
    "pOffline": "O‘yinchi hozir oflayn",
    "pBusy": "O‘yinchi hozir o‘yinda",
    "micDenied": "Mikrofonga ruxsat berilmadi",
    "payFail": "To‘lov o‘tmadi",
    "adminTag": "ADMIN",
    "packsTitle": "Koin sotib olish",
    "coinsAdded": "+{n} koin qo‘shildi!",
    "micBtn": "Mikrofon",
    "sndBtn": "Ovoz",
    "ratingTitle": "Reyting",
    "ratingWeek": "Shu hafta",
    "ratingAll": "Barcha vaqt",
    "ratingWeekInfo": "Har 7 kunda noldan boshlanadi · yangilanishiga {t} qoldi",
    "ratingAllInfo": "Tasodifiy raqib bilan to‘liq o‘ynab yutsangiz +10 ball",
    "ratingEmpty": "Hozircha hech kim yo‘q. Birinchi bo‘ling!",
    "ratingLoading": "Yuklanmoqda…",
    "ratingPrizeTitle": "Haftalik sovg‘alar",
    "ratingPrizeRest": "o‘rin",
    "ratingPrizeNote": "Hafta oxirida koinlar avtomatik beriladi",
    "ratingYou": "Sizning o‘rningiz",
    "ratingDH": "{d} kun {h} soat",
    "ratingHM": "{h} soat {m} daq",
    "ratingMin": "{m} daq",
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
    "item_b5": "Olcha guli",
    "item_b6": "Terrakota",
    "item_b7": "Tungi o‘rmon",
    "item_b8": "Binafsha osmon",
    "item_b9": "Muzlik",
    "item_b10": "Lava",
    "item_b11": "Qora oltin",
    "item_b12": "Koinot",
    "item_p0": "Klassik",
    "item_p1": "Qizil va ko‘k",
    "item_p2": "Oltin va kumush",
    "item_p3": "Neon",
    "item_p4": "Qorbobo",
    "item_p5": "Yashil va sariq",
    "item_p6": "Pushti va moviy",
    "item_p7": "To‘q sariq va binafsha",
    "item_p8": "Zumrad va topaz",
    "item_p9": "Muz va olov",
    "item_p10": "Qor parchasi",
    "item_p11": "Yangi yil archasi",
    "item_p12": "Yangi yil sovg‘asi",
    "watchBtn": "O‘yinni kuzatish",
    "vipBtn": "VIP sotib olish",
    "vipOn": "VIP faol",
    "vipTitle": "Shashka VIP",
    "vipNew": "YANGI",
    "vipSub": "1 oy davomida barcha imkoniyatlar ochiq",
    "vipP1": "O‘yinni kuzatayotganda chatga yozish",
    "vipP2": "Barcha taxta turlari",
    "vipP3": "Barcha tosh turlari",
    "vipP4": "Profilda VIP yozuvi va toj",
    "vipP5": "Muddati: 30 kun",
    "vipBuy": "{n} Stars / oy",
    "vipRenew": "Uzaytirish: {n} Stars",
    "vipNote": "To‘lov Telegram Stars orqali amalga oshiriladi",
    "vipLeft": "VIP faol: {n} kun qoldi",
    "vipPaid": "VIP yoqildi! Rahmat 👑",
    "watchBanner": "Siz o‘yinni kuzatyapsiz",
    "watchExit": "Kuzatishdan chiqish",
    "watchWhiteWin": "Oq yutdi",
    "watchBlackWin": "Qora yutdi",
    "watchNoPieces": "Bir o‘yinchining barcha toshlari olindi",
    "watchNoMoves": "Bir o‘yinchining yurish imkoni qolmadi",
    "watchResign": "O‘yinchi taslim bo‘ldi",
    "watchLeft": "O‘yinchi o‘yindan chiqib ketdi",
    "watchTimeout": "O‘yinchining vaqti tugadi",
    "watchUnavailable": "Bu o‘yin tugagan yoki kuzatib bo‘lmaydi",
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
    "ratingTile": "Рейтинг",
    "ratingTileSub": "Лучшие игроки",
    "playersTile": "Игроки",
    "playersTileSub": "Игроки бота",
    "playersOnlineN": "● {n} онлайн",
    "playersTitle": "Игроки",
    "playersOnline": "Онлайн",
    "playersOffline": "Офлайн",
    "playersEmpty": "Пока нет игроков",
    "playerOnlineLbl": "онлайн",
    "playerInGame": "в игре",
    "playerSeen": "был(а): {t}",
    "playerSeenUnknown": "давно",
    "agoNow": "только что",
    "agoMin": "{n} мин назад",
    "agoHour": "{n} ч назад",
    "agoDay": "{n} дн назад",
    "pInvite": "Позвать",
    "pInviteWait": "Ждём… ✕",
    "pIncomingSub": "приглашает вас сыграть в шашки",
    "pAccept": "Принять",
    "pDecline": "Отклонить",
    "pDeclined": "{name} отклонил(а) приглашение",
    "pExpired": "Время приглашения истекло",
    "pOffline": "Игрок сейчас офлайн",
    "pBusy": "Игрок сейчас в игре",
    "micDenied": "Нет доступа к микрофону",
    "payFail": "Оплата не прошла",
    "adminTag": "АДМИН",
    "packsTitle": "Купить коины",
    "coinsAdded": "+{n} коинов зачислено!",
    "micBtn": "Микрофон",
    "sndBtn": "Звук",
    "ratingTitle": "Рейтинг",
    "ratingWeek": "Эта неделя",
    "ratingAll": "За всё время",
    "ratingWeekInfo": "Обнуляется каждые 7 дней · до обновления {t}",
    "ratingAllInfo": "+10 очков за полную победу над случайным соперником",
    "ratingEmpty": "Пока никого нет. Будьте первым!",
    "ratingLoading": "Загрузка…",
    "ratingPrizeTitle": "Призы недели",
    "ratingPrizeRest": "места",
    "ratingPrizeNote": "Коины начисляются автоматически в конце недели",
    "ratingYou": "Ваше место",
    "ratingDH": "{d} д {h} ч",
    "ratingHM": "{h} ч {m} мин",
    "ratingMin": "{m} мин",
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
    "item_b5": "Сакура",
    "item_b6": "Терракота",
    "item_b7": "Ночной лес",
    "item_b8": "Лиловое небо",
    "item_b9": "Ледник",
    "item_b10": "Лава",
    "item_b11": "Чёрное золото",
    "item_b12": "Космос",
    "item_p0": "Классические",
    "item_p1": "Красные и синие",
    "item_p2": "Золото и серебро",
    "item_p3": "Неон",
    "item_p4": "Снеговик",
    "item_p5": "Зелёный и жёлтый",
    "item_p6": "Розовый и голубой",
    "item_p7": "Оранжевый и фиолетовый",
    "item_p8": "Изумруд и топаз",
    "item_p9": "Лёд и огонь",
    "item_p10": "Снежинка",
    "item_p11": "Новогодняя ёлка",
    "item_p12": "Новогодний подарок",
    "watchBtn": "Смотреть игру",
    "vipBtn": "Купить VIP",
    "vipOn": "VIP активен",
    "vipTitle": "Shashka VIP",
    "vipNew": "НОВОЕ",
    "vipSub": "Все возможности открыты на 1 месяц",
    "vipP1": "Писать в чат при просмотре игры",
    "vipP2": "Все виды досок",
    "vipP3": "Все виды шашек",
    "vipP4": "Надпись VIP и корона в профиле",
    "vipP5": "Срок: 30 дней",
    "vipBuy": "{n} Stars / мес",
    "vipRenew": "Продлить: {n} Stars",
    "vipNote": "Оплата через Telegram Stars",
    "vipLeft": "VIP активен: осталось {n} дн.",
    "vipPaid": "VIP подключён! Спасибо 👑",
    "watchBanner": "Вы наблюдаете за игрой",
    "watchExit": "Выйти из просмотра",
    "watchWhiteWin": "Белые победили",
    "watchBlackWin": "Чёрные победили",
    "watchNoPieces": "У одного из игроков не осталось шашек",
    "watchNoMoves": "У одного из игроков не осталось ходов",
    "watchResign": "Игрок сдался",
    "watchLeft": "Игрок покинул игру",
    "watchTimeout": "У игрока закончилось время",
    "watchUnavailable": "Эта игра уже закончилась или недоступна",
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
  if (S.shop) { renderShop(); renderRefs(); renderVip(); }
  if (S.rating) renderRating();
  if (S.players) { renderPlayers(); updatePlayersTile(); }
  if (S.shop) renderPacks();

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
  shopTab: 'boards',
  rating: null,
  ratingTab: 'week',
  players: null,
  sentTo: null,
  pinIn: null,
  playersPoll: null,
  pinTimer: null,
  ptTimer: null
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

  if (id !== 'players') stopPlayersPoll();
  if (id !== 'game') closeRtc();

  if (tg) {
    try {
      if (id === 'game') {
        tg.BackButton.show();
        tg.enableClosingConfirmation();
      } else {
        id === 'shop' || id === 'vip' || id === 'refs' || id === 'rating' || id === 'players' || id === 'coins'
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
      if ($('coins').classList.contains('active')) {
        show('shop');
        return;
      }

      if (
        $('shop').classList.contains('active') ||
        $('refs').classList.contains('active') ||
        $('rating').classList.contains('active') ||
        $('players').classList.contains('active')
      ) {
        show('menu');
        return;
      }

      if (S.g && S.g.spectator) {
        leaveWatch(true);
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
      if (S.g && S.g.spectator) leaveWatch(false);

      S.me = m.me;
      if (m.lang) setLang(m.lang);

      setAva($('meAva'), m.me);
      send({ t: 'players_get' });
      $('meName').textContent = m.me.name;
      addVipTag($('meName'), m.me);
      $('meAva').classList.toggle('vipf', Boolean(m.me.vip));

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

    case 'players':
      onPlayers(m);
      break;

    case 'invoice':
      openInvoice(m.url);
      break;

    case 'pay_error':
      ptoast(tr('payFail'));
      break;

    case 'rtc':
      onRtc(m.d);
      break;

    case 'pinvite_sent':
      S.sentTo = m.to;
      renderPlayers();
      break;

    case 'pinvite_in':
      showIncoming(m);
      break;

    case 'pinvite_end':
      onPInviteEnd(m);
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

    case 'rating':
      onRating(m);
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
      } else if (m.code === 'pinvite_offline') {
        S.sentTo = null;
        ptoast(tr('pOffline'));
        send({ t: 'players_get' });
      } else if (m.code === 'pinvite_busy') {
        S.sentTo = null;
        ptoast(tr('pBusy'));
        send({ t: 'players_get' });
      } else if (m.code === 'watch_unavailable') {
        ptoast(tr('watchUnavailable'));
        send({ t: 'players_get' });
      }
      break;
  }
}

/* ---------- ОЙЫН ---------- */

/* ---------- КӨРЕРМЕН РЕЖИМІ (ойынды тек қарау) ---------- */

function applySpectatorUi(on) {
  const chatBtn = $('btnChat');
  const resign = $('btnResign');

  if (on) {
    if (resign.dataset.specPrevTxt === undefined) {
      resign.dataset.specPrevTxt = resign.textContent;
      resign.dataset.specPrevKey = resign.dataset.i18n || '';
    }

    resign.dataset.i18n = 'watchExit';
    resign.textContent = tr('watchExit');

    chatBtn.style.display = isVip() ? '' : 'none';

    clearInterval(S.awayTimer);

    const away = $('away');

    // баннерді аватарлардың үстінен алып, «Классикалық тақта» тақырыбының үстіне қоямыз
    if (!away.dataset.specHome) {
      away.dataset.specHome = '1';
      away._home = { parent: away.parentNode, next: away.nextSibling };
    }

    const title = document.querySelector('[data-i18n="boardTitle"]');

    if (title) {
      title.insertAdjacentElement('beforebegin', away);
    } else {
      $('field').parentElement.insertAdjacentElement('afterend', away);
    }
    away.classList.add('spec-banner');

    away.textContent = tr('watchBanner');
    away.classList.remove('hidden');
  } else {
    restoreAwayBanner();
    if (resign.dataset.specPrevTxt !== undefined) {
      const key = resign.dataset.specPrevKey;

      if (key) resign.dataset.i18n = key;
      else delete resign.dataset.i18n;

      resign.textContent = key ? tr(key) : resign.dataset.specPrevTxt;

      delete resign.dataset.specPrevTxt;
      delete resign.dataset.specPrevKey;
    }

    chatBtn.style.display = '';
  }
}

function restoreAwayBanner() {
  const away = $('away');

  away.classList.remove('spec-banner');

  if (away._home && away._home.parent) {
    away._home.parent.insertBefore(away, away._home.next);
  }

  delete away.dataset.specHome;
  away._home = null;
}

(function specBannerCss() {
  const st = document.createElement('style');
  st.textContent =
    '#away.spec-banner{position:static!important;inset:auto!important;' +
    'transform:none!important;width:auto!important;margin:0 12px 10px!important;' +
    'text-align:center;z-index:auto!important}';
  document.head.append(st);
})();

function leaveWatch(notify) {
  if (notify) send({ t: 'watch_stop' });

  S.g = null;
  S.q = [];
  S.busy = false;

  ['sheetMenu', 'sheetChat', 'result', 'away'].forEach((i) => {
    $(i).classList.add('hidden');
  });

  applySpectatorUi(false);
  openPlayers();
}

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

  hideIncoming();
  S.sentTo = null;

  if (m.spectator) closeRtc();
  else openRtc(m);

  S.inviteMode = false;
  $('game').classList.remove('inviting');
  $('oppAva').classList.remove('wait');

  S.g = {
    id: m.id,
    you: m.you,
    spectator: Boolean(m.spectator),
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

  setGameName($('oppName'), opp);
  setGameName($('myName'), me);

  $('oppAva').classList.toggle('admf', Boolean(opp.admin));
  $('myAva').classList.toggle('admf', Boolean(me.admin));
  $('oppAva').classList.toggle('vipf', Boolean(opp.vip));
  $('myAva').classList.toggle('vipf', Boolean(me.vip));

  /*
    Админ/VIP тақта мен тасын қарсыласына көрсетеді.
    Екеуінде де бар болса, әрқайсысы өзінікін көреді.
    Көрермен VIP/админ ойыншының тақтасын көреді.
  */
  if (m.spectator) {
    const o = m.players.w.skin ? m.players.w : m.players.b;

    S.g.skin = o && o.skin ? o.skin : null;
  } else {
    S.g.skin = opp.skin && !me.skin ? opp.skin : null;
  }
  applySkin();

  $('oppDot').className = 'pdot ' + (m.you === 'w' ? 'b' : 'w');
  $('myDot').className = 'pdot ' + m.you;

  buildSquares();
  renderPieces();

  $('msgs').textContent = '';
  m.chat.forEach((c) => addChat(c, true));

  updateBadge();
  refresh();
  show('game');

  applySpectatorUi(Boolean(m.spectator));
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

/* ---------- ДЫБЫС ЭФФЕКТТЕРІ (жүріс / тас жеу): "Жұмсақ тоқ" ---------- */

const SFX = (() => {
  const NOTES = {
    move: [{ f: 420, f2: 260, d: 0.1, v: 0.55, at: 0 }],
    capture: [
      { f: 330, f2: 190, d: 0.13, v: 0.65, at: 0 },
      { f: 440, f2: 300, d: 0.09, v: 0.35, at: 0.08 }
    ]
  };

  let ctx = null;
  let bus = null;
  let silentDone = false;
  let primed = false;

  const clips = {};

  // iPhone-да "үнсіз" режим Web Audio-ны өшіріп тастайды; осы жол оны өшірмейді
  function setSession() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) {}
  }

  function init() {
    if (ctx) return ctx;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;

      setSession();

      ctx = new AC();

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5000;

      const comp = ctx.createDynamicsCompressor();

      lp.connect(comp);
      comp.connect(ctx.destination);

      bus = lp;
    } catch (e) {
      ctx = null;
    }

    return ctx;
  }

  // Қосалқы жол: Web Audio істемесе, дайын WAV файл ойнатылады
  function wavUri(notes) {
    const sr = 22050;
    let total = 0;

    notes.forEach((n) => { total = Math.max(total, n.at + n.d); });

    const len = Math.ceil((total + 0.05) * sr);
    const buf = new Float32Array(len);

    notes.forEach((n) => {
      const start = Math.floor(n.at * sr);
      const cnt = Math.floor(n.d * sr);
      const ratio = n.f2 / n.f;
      const lr = Math.log(ratio);

      for (let i = 0; i < cnt; i++) {
        const t = i / sr;
        const ph = 2 * Math.PI * n.f * n.d / lr * (Math.pow(ratio, t / n.d) - 1);
        const env = t < 0.004
          ? n.v * t / 0.004
          : n.v * Math.pow(0.0001 / n.v, (t - 0.004) / (n.d - 0.004));

        if (start + i < len) buf[start + i] += env * Math.sin(ph);
      }
    });

    const bytes = new Uint8Array(44 + len * 2);
    const dv = new DataView(bytes.buffer);
    const wr = (o, str) => {
      for (let i = 0; i < str.length; i++) bytes[o + i] = str.charCodeAt(i);
    };

    wr(0, 'RIFF');
    dv.setUint32(4, 36 + len * 2, true);
    wr(8, 'WAVE');
    wr(12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * 2, true);
    dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true);
    wr(36, 'data');
    dv.setUint32(40, len * 2, true);

    for (let i = 0; i < len; i++) {
      const x = Math.max(-1, Math.min(1, buf[i]));
      dv.setInt16(44 + i * 2, x * 32767, true);
    }

    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }

    return 'data:audio/wav;base64,' + btoa(bin);
  }

  try {
    Object.keys(NOTES).forEach((k) => {
      const a = new Audio(wavUri(NOTES[k]));
      a.preload = 'auto';
      clips[k] = a;
    });
  } catch (e) {}

  function prime() {
    if (primed) return;
    primed = true;

    Object.keys(clips).forEach((k) => {
      const a = clips[k];

      try {
        a.muted = true;

        const done = () => {
          try { a.pause(); a.currentTime = 0; a.muted = false; } catch (e) {}
        };

        const p = a.play();

        if (p && p.then) {
          p.then(done).catch(() => { a.muted = false; primed = false; });
        } else {
          done();
        }
      } catch (e) {
        a.muted = false;
      }
    });
  }

  // Экранды басқан сайын дыбыс жүйесін оятып тұрамыз
  function unlock() {
    setSession();

    const c = init();

    if (c) {
      if (c.state !== 'running') c.resume().catch(() => {});

      if (!silentDone) {
        try {
          const s = c.createBufferSource();
          s.buffer = c.createBuffer(1, 1, 22050);
          s.connect(c.destination);
          s.start(0);
          silentDone = true;
        } catch (e) {}
      }
    }

    prime();
  }

  ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, unlock, { passive: true })
  );

  function tone(o) {
    const t = ctx.currentTime + o.at;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.d);

    f.type = 'lowpass';
    f.frequency.value = 1400;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);

    osc.connect(f);
    f.connect(g);
    g.connect(bus);

    osc.start(t);
    osc.stop(t + o.d + 0.02);
  }

  function playClip(kind) {
    try {
      const a = clips[kind];
      if (!a) return;

      a.muted = false;
      a.currentTime = 0;

      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  function play(kind) {
    if (!NOTES[kind]) return;

    try {
      const c = init();

      if (c && c.state === 'running') {
        NOTES[kind].forEach(tone);
        return;
      }

      // Дыбыс жүйесі ұйықтап қалған болса: оятамыз да, қосалқы жолмен ойнатамыз
      if (c) c.resume().catch(() => {});
    } catch (e) {}

    playClip(kind);
  }

  return { play };
})();

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
  SFX.play(cap != null ? 'capture' : 'move');

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

  const spec = Boolean(g.spectator || m.spectator);
  const win = !spec && m.result === g.you;
  const draw = m.result === 'draw';

  $('resEmoji').textContent =
    draw ? '🤝' : spec ? '🏁' : win ? '🏆' : '😔';

  $('resTitle').textContent =
    draw
      ? tr('draw')
      : spec
        ? tr(m.result === 'w' ? 'watchWhiteWin' : 'watchBlackWin')
        : win ? tr('youWin') : tr('youLose');

  const R = {
    no_pieces: tr(win ? 'rNoPiecesWin' : 'rNoPiecesLose'),
    no_moves: tr(win ? 'rNoMovesWin' : 'rNoMovesLose'),
    resign: tr(win ? 'rResignWin' : 'rResignLose'),
    left: tr(win ? 'rLeftWin' : 'rLeftLose'),
    timeout: tr(win ? 'rTimeoutWin' : 'rTimeoutLose'),
    opponent_timeout: tr(win ? 'rOppTimeoutWin' : 'rOppTimeoutLose'),
    draw: tr('rDraw')
  };

  if (spec) {
    Object.assign(R, {
      no_pieces: tr('watchNoPieces'),
      no_moves: tr('watchNoMoves'),
      resign: tr('watchResign'),
      left: tr('watchLeft'),
      timeout: tr('watchTimeout'),
      opponent_timeout: tr('watchTimeout')
    });
  }

  $('resSub').textContent = R[m.reason] || '';
  $('btnAgain').style.display = spec ? 'none' : '';

  $('sheetMenu').classList.add('hidden');
  $('away').classList.add('hidden');
  $('result').classList.remove('hidden');

  haptic(win ? 'heavy' : 'light');

  try {
    tg && tg.HapticFeedback &&
    tg.HapticFeedback.notificationOccurred(
      draw || spec ? 'warning' : win ? 'success' : 'error'
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

  if (g.spectator && !waiting && !g.over) {
    ms.textContent = g.turn === g.you ? tr('thinking') : '';
    $('oppSub').textContent = g.turn !== g.you ? tr('thinking') : '';
  }

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
    g.spectator ||
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

  const mine = S.g.spectator
    ? Boolean(S.me && m.uid && m.uid === S.me.id)
    : m.from === S.g.you;
  const box = $('msgs');
  const d = document.createElement('div');

  d.className = 'm ' + (mine ? 'me' : 'opp');
  d.textContent = (m.from === 's' || S.g.spectator) && m.name
    ? m.name + ': ' + m.text
    : m.text;

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
    t: S.g && S.g.spectator ? 'watch_chat' : 'chat',
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
  if (S.g && S.g.spectator) {
    leaveWatch(true);
    return;
  }

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
  const wasSpec = Boolean(S.g && S.g.spectator);

  S.g = null;
  S.groupWaiting = false;
  S.groupWaitDeadline = null;
  S.groupJoinSent = false;

  $('result').classList.add('hidden');
  applySpectatorUi(false);

  if (wasSpec) openPlayers();
  else show('menu');
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
/* ---------- ЖАҢА ЖЫЛДЫҚ СУРЕТТЕР (қымбат тастарға) ---------- */

const svgPic = (body) =>
  "url('data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + body + '</svg>'
  ) +
  "')";

const PICS = {
  // p10: қар ұшқыны
  flake: (() => {
    const arm =
      '<path d="M32 32V9M32 20l-7-7M32 20l7-7M32 27l-5-5M32 27l5-5"/>';
    let g = '';
    for (let a = 0; a < 360; a += 60) {
      g += '<g transform="rotate(' + a + ' 32 32)">' + arm + '</g>';
    }
    return svgPic(
      '<g fill="none" stroke="#2a3f66" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' + g + '</g>' +
      '<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + g + '</g>'
    );
  })(),

  // p4: қарлы адам
  snowman: svgPic(
    '<g stroke="#2a3a55" stroke-width="2.5">' +
    '<circle cx="32" cy="44" r="14" fill="#fff"/>' +
    '<circle cx="32" cy="23" r="10" fill="#fff"/>' +
    '<path d="M22 32q10 6 20 0v4q-10 6-20 0z" fill="#e53935"/>' +
    '<path d="M24 14h16l-2-8H26z" fill="#222"/>' +
    '</g>' +
    '<circle cx="28.5" cy="21" r="1.6" fill="#222"/>' +
    '<circle cx="35.5" cy="21" r="1.6" fill="#222"/>' +
    '<path d="M32 24l7 2.5-7 1.5z" fill="#ff8a1f"/>' +
    '<circle cx="32" cy="44" r="1.8" fill="#222"/>' +
    '<circle cx="32" cy="51" r="1.8" fill="#222"/>'
  ),

  // p11: жаңа жылдық шырша
  tree: svgPic(
    '<g stroke="#0b3d1c" stroke-width="2" stroke-linejoin="round">' +
    '<rect x="28" y="53" width="8" height="7" fill="#7a4a21"/>' +
    '<path d="M32 12L44 28H20z" fill="#2fb050"/>' +
    '<path d="M32 21L48 41H16z" fill="#2fb050"/>' +
    '<path d="M32 32L52 55H12z" fill="#2fb050"/>' +
    '</g>' +
    '<path d="M32 2l2.6 5.4 5.9.8-4.3 4.1 1 5.8L32 15.300l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#ffd54a" stroke="#8a6406" stroke-width="1.2"/>' +
    '<circle cx="30" cy="30" r="2.4" fill="#ff5252"/>' +
    '<circle cx="37" cy="40" r="2.4" fill="#ffd54a"/>' +
    '<circle cx="24" cy="47" r="2.4" fill="#ffd54a"/>' +
    '<circle cx="40" cy="50" r="2.4" fill="#ff5252"/>'
  ),

  // p12: жаңа жылдық сыйлық
  gift: svgPic(
    '<g stroke="#5a1a1a" stroke-width="2.2" stroke-linejoin="round">' +
    '<rect x="12" y="30" width="40" height="26" rx="3" fill="#fff"/>' +
    '<rect x="9" y="21" width="46" height="11" rx="3" fill="#fff"/>' +
    '<rect x="28" y="21" width="8" height="35" fill="#ffc93c"/>' +
    '<path d="M32 21C20 4 8 16 32 21z" fill="#ffc93c"/>' +
    '<path d="M32 21C44 4 56 16 32 21z" fill="#ffc93c"/>' +
    '</g>'
  )
};

const SKINS = {
  boards: {
    b0: { a: '#d8cbb5', b: '#75583e' },
    b1: { a: '#eeeed2', b: '#6a9b4f' },
    b2: { a: '#dbe9f4', b: '#4b7fb5' },
    b3: { a: '#9a9a9a', b: '#2b2b2f' },
    b4: { a: '#fff0b8', b: '#c58a12' },
    b5: { a: '#fde8ee', b: '#d98aa6' },
    b6: { a: '#f1dccb', b: '#b8604a' },
    b7: { a: '#a9c7a0', b: '#1f3d2b' },
    b8: { a: '#e3d9f5', b: '#6a4aa8' },
    b9: { a: '#f0fbff', b: '#6fb7c9' },
    b10: { a: '#2d1b1b', b: '#d9441f' },
    b11: { a: '#3a3a3f', b: '#e0b13a' },
    b12: { a: '#3b2f7a', b: '#0e0b2b' }
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
      k: 'radial-gradient(circle at 35% 30%,#fff,#d3a6ff 60%,#8c4fd6)',
      img: PICS.snowman
    },
    p5: {
      w: 'radial-gradient(circle at 35% 30%,#c8f08f,#5aa21e)',
      k: 'radial-gradient(circle at 35% 30%,#fff2a0,#e0a800)'
    },
    p6: {
      w: 'radial-gradient(circle at 35% 30%,#ffc2dc,#e0508f)',
      k: 'radial-gradient(circle at 35% 30%,#bfe9ff,#3a9bd6)'
    },
    p7: {
      w: 'radial-gradient(circle at 35% 30%,#ffd09a,#f07a10)',
      k: 'radial-gradient(circle at 35% 30%,#d8b8ff,#7a3fd0)'
    },
    p8: {
      w: 'radial-gradient(circle at 35% 30%,#9bffd0,#0b8a55)',
      k: 'radial-gradient(circle at 35% 30%,#ffe08a,#d98a00)'
    },
    p9: {
      w: 'radial-gradient(circle at 35% 30%,#fff,#a8e4ff 55%,#2f9bd6)',
      k: 'radial-gradient(circle at 35% 30%,#fff2a0,#ff7a1a 55%,#c4220a)'
    },
    p10: {
      w: 'radial-gradient(circle at 35% 30%,#fff1a8,#d9a017 60%,#8a6406)',
      k: 'radial-gradient(circle at 35% 30%,#6a6a70,#1a1a1d 60%,#000)',
      img: PICS.flake
    },
    p11: {
      w: 'radial-gradient(circle at 35% 30%,#e8d0ff,#8a4fff 55%,#2a0f7a)',
      k: 'radial-gradient(circle at 35% 30%,#b8f6ff,#19b8ff 55%,#0a3d8a)',
      img: PICS.tree
    },
    p12: {
      w: 'radial-gradient(circle at 35% 30%,#ffb3c0,#d4143a 60%,#7a0020)',
      k: 'radial-gradient(circle at 35% 30%,#b3c9ff,#2457e0 60%,#0b1f7a)',
      img: PICS.gift
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

    const w = c.img ? `${c.img} center/64% no-repeat,${c.w}` : c.w;
    const k = c.img ? `${c.img} center/64% no-repeat,${c.k}` : c.k;

    css +=
      `#field[data-pieces="${id}"] .pc.w>i{background:${w}}` +
      `#field[data-pieces="${id}"] .pc.b>i{background:${k}}`;

    // дамада тәж сурет үстінде тұрмауы үшін сурет кішірейіп төмен түседі
    if (c.img) {
      css +=
        `#field[data-pieces="${id}"] .pc.king>i{background-size:40%,auto;background-position:50% 78%,center}`;
    }
  }

  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);
})();

(function plactCss() {
  const st = document.createElement('style');
  st.textContent = '.plact{white-space:nowrap}';
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
  const f = $('field');
  const sk = S.g && S.g.skin;

  // Админмен ойнағанда екеуі де админнің тақтасы мен тастарын көреді
  if (
    sk &&
    SKINS.boards[sk.boards] &&
    SKINS.pieces[sk.pieces]
  ) {
    f.dataset.board = sk.boards;
    f.dataset.pieces = sk.pieces;
    return;
  }

  if (!S.shop) return;

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

  const bw = c.img ? `${c.img} center/70% no-repeat,${c.w}` : c.w;
  const bk = c.img ? `${c.img} center/70% no-repeat,${c.k}` : c.k;

  return (
    '<div class="tp">' +
    `<b style="background:${bw}"></b>` +
    `<b style="background:${bk}"></b>` +
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
    ? `https://t.me/shashkaoyinibot?start=ref_${S.shop.ref}`
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


  if (m.ev && m.ev.type === 'coins' && m.ev.ok) {
    ptoast(tr('coinsAdded', { n: fmt(m.ev.n) }));
    haptic('heavy');
  }

  renderPacks();

  document.querySelectorAll('.cnum').forEach((e) => {
    e.textContent = fmt(m.coins);
  });

  $('tileReward').textContent = tr('friendsTileSub', { n: m.reward });

  applySkin();
  renderShop();
  renderRefs();
  renderVip();

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
  } else if (ev.type === 'vip') {
    if (ev.ok) {
      toast(tr('vipPaid'));
      haptic('heavy');
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

/* ---------- РЕЙТИНГ ---------- */

const RMEDAL = ['🥇', '🥈', '🥉'];

function openRating() {
  send({ t: 'rating_get' });
  renderRating();
  show('rating');
}

function onRating(m) {
  m.at = Date.now();
  S.rating = m;
  renderRating();
}

function ratingLeft(ms) {
  const mins = Math.floor(Math.max(0, ms) / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);

  if (d > 0) return tr('ratingDH', { d, h });
  if (h > 0) return tr('ratingHM', { h, m: mins % 60 });

  return tr('ratingMin', { m: Math.max(1, mins) });
}

function ratingRow(p, own) {
  const clickable = !own && p.username;
  const row = document.createElement(clickable ? 'button' : 'div');

  row.className = 'rrow' + (p.rank === 1 ? ' first' : '') + (own ? ' mine' : '');

  if (clickable) {
    row.type = 'button';
    row.dataset.u = p.username;
  }

  const place = document.createElement('div');
  place.className = 'rpl';
  place.textContent = p.rank ? (RMEDAL[p.rank - 1] || p.rank) : '—';

  const ava = document.createElement('div');
  ava.className = 'ava';
  setAva(ava, { name: String(p.name || '?'), avatar: p.avatar || null });

  const nm = document.createElement('div');
  nm.className = 'rnm';

  const b = document.createElement('b');
  b.textContent = p.name || '?';
  nm.append(b);

  const sub = own ? tr('ratingYou') : (p.username ? '@' + p.username : '');

  if (sub) {
    const small = document.createElement('small');
    small.textContent = sub;
    nm.append(small);
  }

  const pt = document.createElement('div');
  pt.className = 'rpt';
  pt.textContent = (p.points || 0) + ' ⭐';

  row.append(place, ava, nm, pt);

  return row;
}

function renderPrizes(m) {
  const box = $('ratingPrize');

  box.textContent = '';

  if (S.ratingTab !== 'week') {
    box.classList.add('hidden');
    return;
  }

  const pz = (m && m.prizes) || { p1: 1000, p2: 500, p3: 250, rest: 100, top: 10 };

  const title = document.createElement('div');
  title.className = 'rp-title';
  title.textContent = '🏆 ' + tr('ratingPrizeTitle');

  const row = document.createElement('div');
  row.className = 'rp-row';

  [
    ['🥇', pz.p1],
    ['🥈', pz.p2],
    ['🥉', pz.p3],
    ['4–' + pz.top, pz.rest]
  ].forEach(([lab, val]) => {
    const chip = document.createElement('div');
    chip.className = 'rp-chip';

    const l = document.createElement('span');
    l.className = 'lab';
    l.textContent = lab;

    const b = document.createElement('b');
    const coin = document.createElement('i');
    coin.className = 'coin';
    b.append(coin, document.createTextNode(String(val)));

    chip.append(l, b);
    row.append(chip);
  });

  const note = document.createElement('div');
  note.className = 'rp-note';
  note.textContent = tr('ratingPrizeNote');

  box.append(title, row, note);
  box.classList.remove('hidden');
}

function renderRating() {
  $('tabWeek').classList.toggle('on', S.ratingTab === 'week');
  $('tabAll').classList.toggle('on', S.ratingTab === 'all');

  const list = $('ratingList');
  const info = $('ratingInfo');
  const me = $('ratingMe');
  const m = S.rating;

  renderPrizes(m);

  list.textContent = '';
  me.textContent = '';

  if (!m) {
    info.textContent = '';
    me.classList.add('hidden');

    const wait = document.createElement('div');
    wait.className = 'rempty';
    wait.textContent = tr('ratingLoading');
    list.append(wait);

    return;
  }

  const d = m[S.ratingTab] || { list: [], me: {} };

  info.textContent = S.ratingTab === 'week'
    ? tr('ratingWeekInfo', { t: ratingLeft(m.left - (Date.now() - m.at)) })
    : tr('ratingAllInfo');

  if (!d.list.length) {
    const empty = document.createElement('div');
    empty.className = 'rempty';
    empty.textContent = tr('ratingEmpty');
    list.append(empty);
  } else {
    d.list.forEach((p) => list.append(ratingRow(p, false)));
  }

  const mp = d.me || {};

  me.append(ratingRow({
    rank: mp.rank,
    name: (S.me && S.me.name) || '?',
    avatar: S.me && S.me.avatar,
    points: mp.points || 0
  }, true));

  me.classList.remove('hidden');
}

$('btnRating').onclick = openRating;
$('tabWeek').onclick = () => { S.ratingTab = 'week'; renderRating(); };
$('tabAll').onclick = () => { S.ratingTab = 'all'; renderRating(); };

$('ratingList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-u]');
  if (!b) return;

  const url = 'https://t.me/' + encodeURIComponent(b.dataset.u);

  try {
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
  } catch (err) {
    window.open(url, '_blank');
  }
});

/* ---------- ОЙЫНШЫЛАР ---------- */

function ptoast(text) {
  const el = $('ptoast');

  el.textContent = text;
  el.classList.remove('hidden');

  clearTimeout(S.ptTimer);
  S.ptTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

function stopPlayersPoll() {
  if (S.playersPoll) {
    clearInterval(S.playersPoll);
    S.playersPoll = null;
  }
}

function openPlayers() {
  send({ t: 'players_get' });
  renderPlayers();
  show('players');

  stopPlayersPoll();
  S.playersPoll = setInterval(() => send({ t: 'players_get' }), 8000);
}

function onPlayers(m) {
  S.players = m;

  const sent = m.list.find((p) => p.sent);
  S.sentTo = sent ? sent.id : null;

  updatePlayersTile();
  renderPlayers();
}

function updatePlayersTile() {
  if (!S.players) return;

  $('tilePlayersSub').textContent =
    tr('playersOnlineN', { n: S.players.onlineCount });
}

function agoText(ts) {
  if (!ts) return tr('playerSeenUnknown');

  const min = Math.floor((Date.now() - ts) / 60000);

  if (min < 2) return tr('agoNow');
  if (min < 60) return tr('agoMin', { n: min });

  const h = Math.floor(min / 60);

  if (h < 24) return tr('agoHour', { n: h });

  return tr('agoDay', { n: Math.floor(h / 24) });
}

function playerRow(p) {
  const row = document.createElement('div');
  row.className = 'plrow' + (p.status === 'offline' ? ' off' : '');

  const wrap = document.createElement('div');
  wrap.className = 'pwrap';

  const ava = document.createElement('div');
  ava.className = 'ava';
  setAva(ava, p);
  wrap.append(ava);

  if (p.status !== 'offline') {
    const dot = document.createElement('i');
    dot.className = 'pdot2' + (p.status === 'game' ? ' game' : '');
    wrap.append(dot);
  }

  const nm = document.createElement('div');
  nm.className = 'rnm';

  const b = document.createElement('b');
  b.textContent = p.name;
  addVipTag(b, p);

  const small = document.createElement('small');

  if (p.status === 'online') {
    small.className = 'on';
    small.textContent =
      tr('playerOnlineLbl') + (p.username ? ' · @' + p.username : '');
  } else if (p.status === 'game') {
    small.className = 'game';
    small.textContent = tr('playerInGame');
  } else {
    small.textContent = tr('playerSeen', { t: agoText(p.seen) });
  }

  nm.append(b, small);

  const btn = document.createElement('button');
  btn.type = 'button';

  if (p.status === 'online' && S.sentTo === p.id) {
    btn.className = 'plact wait';
    btn.textContent = tr('pInviteWait');
    btn.onclick = () => {
      S.sentTo = null;
      send({ t: 'pinvite_cancel', to: p.id });
      renderPlayers();
    };
  } else if (p.status === 'online') {
    btn.className = 'plact';
    btn.textContent = tr('pInvite');
    btn.onclick = () => {
      S.sentTo = p.id;
      send({ t: 'pinvite_send', to: p.id });
      renderPlayers();
      haptic('light');
    };
  } else if (p.status === 'game' && p.watch) {
    btn.className = 'plact';
    btn.textContent = tr('watchBtn');
    btn.onclick = () => {
      haptic('light');
      send({ t: 'watch_start', player: p.id });
    };
  } else {
    btn.className = 'plact dis';
    btn.disabled = true;
    btn.textContent =
      p.status === 'game' ? tr('playerInGame') : tr('playersOffline');
  }

  row.append(wrap, nm, btn);

  return row;
}

function renderPlayers() {
  const box = $('plList');

  box.textContent = '';

  const list = (S.players && S.players.list) || [];

  if (!list.length) {
    const e = document.createElement('div');
    e.className = 'plempty';
    e.textContent = tr(S.players ? 'playersEmpty' : 'ratingLoading');
    box.append(e);
    return;
  }

  const on = list.filter((p) => p.status !== 'offline');
  const off = list.filter((p) => p.status === 'offline');

  const head = (key, n) => {
    const h = document.createElement('div');
    h.className = 'plhead';
    h.textContent = tr(key) + ' · ' + n;
    box.append(h);
  };

  if (on.length) {
    head('playersOnline', on.length);
    on.forEach((p) => box.append(playerRow(p)));
  }

  if (off.length) {
    head('playersOffline', off.length);
    off.forEach((p) => box.append(playerRow(p)));
  }
}

function showIncoming(m) {
  S.pinIn = m.from;

  $('pinName').textContent = m.from.name;
  setAva($('pinAva'), m.from);
  $('sheetPIn').classList.remove('hidden');

  haptic('heavy');

  clearTimeout(S.pinTimer);
  S.pinTimer = setTimeout(hideIncoming, (m.ttl || 30) * 1000);
}

function hideIncoming() {
  clearTimeout(S.pinTimer);
  S.pinIn = null;
  $('sheetPIn').classList.add('hidden');
}

function onPInviteEnd(m) {
  if (m.from) {
    if (S.pinIn && S.pinIn.id === m.from) hideIncoming();
    return;
  }

  if (!m.to) return;

  if (S.sentTo === m.to) S.sentTo = null;

  const p = S.players && S.players.list.find((x) => x.id === m.to);

  if (m.reason === 'declined') {
    ptoast(tr('pDeclined', { name: p ? p.name : '' }));
  } else if (m.reason === 'expired') {
    ptoast(tr('pExpired'));
  } else if (m.reason === 'unavailable') {
    ptoast(tr('pOffline'));
  }

  renderPlayers();
  send({ t: 'players_get' });
}

$('btnPlayers').onclick = openPlayers;

$('btnPinYes').onclick = () => {
  if (S.pinIn) send({ t: 'pinvite_answer', from: S.pinIn.id, accept: true });
  hideIncoming();
};

$('btnPinNo').onclick = () => {
  if (S.pinIn) send({ t: 'pinvite_answer', from: S.pinIn.id, accept: false });
  hideIncoming();
};

/* ---------- ДАУЫСТЫҚ БАЙЛАНЫС (WebRTC) ---------- */

const RTC_CFG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

S.rtc = null;
S.rtcIn = [];

function rtcSend(d) {
  if (S.rtc) send({ t: 'rtc', d: Object.assign({ gid: S.rtc.gid }, d) });
}

function updateRtcUi() {
  const r = S.rtc;

  $('btnMic').classList.toggle('hidden', !r);
  $('btnSnd').classList.toggle('hidden', !r);
  $('btnMic').classList.toggle('on', Boolean(r && r.micOn));
  $('btnSnd').classList.toggle('off', Boolean(r && !r.sndOn));
}

function openRtc(m) {
  if (!window.RTCPeerConnection) return;
  if (S.rtc && S.rtc.gid === m.id) return;

  closeRtc();

  const pc = new RTCPeerConnection(RTC_CFG);
  const audio = new Audio();

  audio.autoplay = true;
  audio.setAttribute('playsinline', '');
  audio.style.display = 'none';
  document.body.append(audio);

  const r = S.rtc = {
    gid: m.id,
    pc,
    audio,
    tr: null,
    local: null,
    micOn: false,
    sndOn: true,
    ice: [],
    caller: m.you === 'w'
  };

  pc.ontrack = (e) => {
    audio.srcObject = (e.streams && e.streams[0]) || new MediaStream([e.track]);
    audio.muted = !r.sndOn;
    audio.play().catch(() => {});
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) rtcSend({ c: e.candidate.toJSON() });
  };

  pc.onconnectionstatechange = () => {
    if (S.rtc === r && r.caller && pc.connectionState === 'failed') {
      pc.createOffer({ iceRestart: true })
        .then((o) => pc.setLocalDescription(o))
        .then(() => rtcSend({ sdp: pc.localDescription }))
        .catch(() => {});
    }
  };

  updateRtcUi();

  // Микрофон өшірулі күйде басталады: трек кейін replaceTrack арқылы қосылады
  if (r.caller) {
    r.tr = pc.addTransceiver('audio', { direction: 'sendrecv' });

    pc.createOffer()
      .then((o) => pc.setLocalDescription(o))
      .then(() => rtcSend({ sdp: pc.localDescription }))
      .catch(() => {});
  }

  const pending = S.rtcIn.filter((d) => d.gid === r.gid);
  S.rtcIn = [];
  pending.forEach(onRtcData);
}

function closeRtc() {
  const r = S.rtc;

  S.rtcIn = [];

  if (!r) return;

  S.rtc = null;

  try { if (r.local) r.local.getTracks().forEach((t) => t.stop()); } catch (e) {}
  try { r.pc.close(); } catch (e) {}
  try { r.audio.pause(); r.audio.srcObject = null; r.audio.remove(); } catch (e) {}

  updateRtcUi();
}

function onRtc(d) {
  if (!d || typeof d !== 'object') return;

  if (!S.rtc || d.gid !== S.rtc.gid) {
    if (d.gid && S.rtcIn.length < 50) S.rtcIn.push(d);
    return;
  }

  onRtcData(d);
}

async function onRtcData(d) {
  const r = S.rtc;

  if (!r || d.gid !== r.gid) return;

  try {
    if (d.sdp) {
      await r.pc.setRemoteDescription(d.sdp);

      for (const c of r.ice.splice(0)) {
        await r.pc.addIceCandidate(c).catch(() => {});
      }

      if (d.sdp.type === 'offer') {
        if (!r.tr) {
          r.tr = r.pc.getTransceivers()[0] || null;
          if (r.tr) r.tr.direction = 'sendrecv';
        }

        const ans = await r.pc.createAnswer();
        await r.pc.setLocalDescription(ans);
        rtcSend({ sdp: r.pc.localDescription });

        applyMic();
      }
    } else if (d.c) {
      if (r.pc.remoteDescription) await r.pc.addIceCandidate(d.c).catch(() => {});
      else r.ice.push(d.c);
    }
  } catch (e) {}
}

function applyMic() {
  const r = S.rtc;

  if (!r || !r.tr) return;

  const track = r.local ? r.local.getAudioTracks()[0] : null;

  r.tr.sender.replaceTrack(track || null).catch(() => {});
}

async function setMic(on) {
  const r = S.rtc;

  if (!r) return;

  if (on) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error('no mediaDevices');
        err.name = 'NoMediaDevices';
        throw err;
      }

      let st;

      try {
        st = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (e1) {
        // iPhone-да кейбір параметрлерді қабылдамауы мүмкін: қарапайым түрде қайталаймыз
        if (e1 && e1.name === 'NotAllowedError') throw e1;

        st = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (S.rtc !== r) {
        st.getTracks().forEach((t) => t.stop());
        return;
      }

      r.local = st;
      r.micOn = true;
    } catch (e) {
      // Қатенің атын да көрсетеміз, себебін анықтау үшін
      ptoast(tr('micDenied') + (e && e.name ? ' (' + e.name + ')' : ''));
      return;
    }
  } else {
    r.micOn = false;

    if (r.local) {
      r.local.getTracks().forEach((t) => t.stop());
      r.local = null;
    }
  }

  applyMic();
  updateRtcUi();
}

$('btnMic').onclick = () => {
  if (!S.rtc) return;

  haptic('light');
  setMic(!S.rtc.micOn);
  S.rtc.audio.play().catch(() => {});
};

$('btnSnd').onclick = () => {
  const r = S.rtc;

  if (!r) return;

  r.sndOn = !r.sndOn;
  r.audio.muted = !r.sndOn;
  r.audio.play().catch(() => {});

  haptic('light');
  updateRtcUi();
};

/* ---------- АДМИН БЕЛГІСІ ---------- */

function addVipTag(el, p) {
  if (!p || !p.vip) return;

  const tag = document.createElement('span');

  tag.className = 'viptag';
  tag.textContent = 'VIP';

  el.append(tag);
}

function setGameName(el, p) {
  el.textContent = p.name;
  addVipTag(el, p);

  if (p.admin) {
    const tag = document.createElement('span');

    tag.className = 'admtag';
    tag.textContent = tr('adminTag');

    el.append(tag);
  }
}

/* ---------- ТӨЛЕМ ---------- */

function openInvoice(url) {
  try {
    if (tg && tg.openInvoice) {
      tg.openInvoice(url, (status) => {
        if (status === 'failed') ptoast(tr('payFail'));
        if (status === 'paid') send({ t: 'shop_get' });
      });
      return;
    }
  } catch (e) {}

  try {
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
  } catch (e) {
    window.open(url, '_blank');
  }
}

/* ---------- КОЙН ПАКЕТТЕРІ ---------- */

function renderPacks() {
  const box = $('packGrid');
  const list = (S.shop && S.shop.packs) || [];

  box.textContent = '';

  list.forEach((p, i) => {
    const b = document.createElement('button');
    const c = document.createElement('div');
    const s = document.createElement('div');
    const coin = document.createElement('span');

    b.type = 'button';
    b.className = 'pack' + (i === list.length - 1 ? ' best' : '');

    c.className = 'pkc';
    coin.className = 'cdot';
    c.append(coin, fmt(p.coins));

    s.className = 'pks';
    s.textContent = p.stars + ' ⭐';

    b.append(c, s);
    b.onclick = () => {
      haptic('light');
      send({ t: 'coin_buy', pack: i });
    };

    box.append(b);
  });
}

$('btnCoinsBuy').onclick = () => {
  send({ t: 'shop_get' });
  renderPacks();
  show('coins');
};

$('btnCoinsBack').onclick = () => show('shop');

/* ---------- VIP ---------- */

function isVip() {
  return Boolean(S.shop && S.shop.vip);
}

function vipDaysLeft() {
  if (!S.shop || !S.shop.vipUntil) return 0;

  return Math.max(0, Math.ceil((S.shop.vipUntil - Date.now()) / 86400000));
}

function renderVip() {
  const m = S.shop;

  if (!m) return;

  const on = Boolean(m.vip);
  const n = m.vipStars || 100;

  $('vipBtnTxt').textContent = tr(on ? 'vipOn' : 'vipBtn');
  $('btnVip').classList.toggle('on', on);

  $('vipStatus').textContent = on
    ? tr('vipLeft', { n: vipDaysLeft() })
    : tr('vipSub');

  $('vipPrice').textContent = on
    ? tr('vipRenew', { n })
    : tr('vipBuy', { n });

  // Басты экрандағы өз профилі
  if (S.me) {
    S.me.vip = on;

    const name = $('meName');

    name.textContent = S.me.name;
    addVipTag(name, S.me);
    $('meAva').classList.toggle('vipf', on);
  }
}

function openVip() {
  send({ t: 'shop_get' });
  renderVip();
  show('vip');
}

$('btnVip').onclick = openVip;

$('btnVipBuy').onclick = () => {
  haptic('light');
  send({ t: 'vip_buy' });
};

/* ---------- ІСКЕ ҚОСУ ---------- */

applyStatic();
setSearching(false);

connect();

})();
