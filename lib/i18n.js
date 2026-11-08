'use strict';

/*
  Бот хабарламаларының тілдері: uz / kk / ru
  Қолдану:  tx(lang, 'key')  немесе  tx(lang, 'key', { name: 'x' })
*/

const LANGS = ['uz', 'kk', 'ru'];
const DEFAULT_LANG = 'kk';

function normLang(l) {
  return LANGS.includes(l) ? l : DEFAULT_LANG;
}

// Telegram language_code (мысалы "ru", "uz", "kk-KZ") -> 'ru' | 'uz' | 'kk' | null
function detectLang(code) {
  const c = String(code || '').toLowerCase().slice(0, 2);
  return LANGS.includes(c) ? c : null;
}

const T = {
  kk: {
    chooseLang: '🌐 Тілді таңдаңыз / Tilni tanlang / Выберите язык',
    langSaved: '✅ Тіл: Қазақша',
    langAdminOnly: 'Тілді тек топ админдері өзгерте алады',

    groupWelcome:
      '♟️ <b>Сәлеметсіздер ме!</b>\n\n' +
      'Мен — Шашка ойынының ботымын! 🎮\n\n' +
      'Енді осы топта достарыңызбен шашка ойнай аласыздар.\n\n' +
      '🎯 Ойынды бастау үшін:\n' +
      '<b>/game</b> командасын жазыңыз.\n\n' +
      '👥 Екі ойыншы қосылып, ойын басталады!\n\n' +
      'Жеңіске жеткен ойыншыны анықтаймыз. Сәтті ойын! 🏆\n\n' +
      '🌐 Тілді өзгерту: <b>/language</b>',

    roomTitle: '♟️ <b>ШАШКА ОЙЫНЫ</b>',
    roomSearching:
      '\n🔎 Қарсылас ізделуде...\n' +
      '♟️ Ойынға қосылу үшін төмендегі батырманы басыңыз.\n' +
      '⏳ Қарсылас табуға 2 минут беріледі.',
    roomFound:
      '\n✅ Екі ойыншы табылды!\n' +
      '👇 Ойынға кіру үшін төмендегі батырманы басыңыз.\n' +
      '⏳ Бірінші кірген ойыншыға 1 минут 30 секунд беріледі.',
    roomStarted: '\n\n🎮 <b>Ойын басталды!</b>\nСәттілік!',
    btnJoin: '♟️ ОЙЫНҒА ҚОСЫЛУ',
    btnEnter: '🎮 ОЙЫНҒА КІРУ',

    roomExpired: 'Бұл ойынның уақыты аяқталған.',
    groupBlocked: '🚫 Бұл топта бот бұғатталған.',
    alreadyJoined: 'Сіз ойынға қосылып қойғансыз.',
    roomFull: 'Ойыншылар саны толды.',
    otherRoom: 'Сіз басқа топтық ойынға қосылғансыз.',
    joined: 'Сіз ойынға қосылдыңыз!',

    gameOver: '♟️ <b>ШАШКА ОЙЫНЫ АЯҚТАЛДЫ!</b>',
    winner: '🏆 <b>ЖЕҢІМПАЗ:</b>',
    rTimeout: '⏰ Қарсыласының жүріс уақыты аяқталды.',
    rOppTimeout: '⏰ Қарсыласы 1 минут 30 секунд ішінде ойынға кірмеді.',
    rResign: '🏁 Қарсыласы ойынды аяқтады.',
    rLeft: '📴 Қарсыласының байланысы үзілді.',
    drawText: '🤝 Ойын тең аяқталды!',

    alreadyPlaying:
      'Сіз қазір шашка ойнап жатырсыз!\n' +
      'Жаңа ойын ашу үшін алдымен қазіргі ойынды аяқтаңыз. ♟️',

    startText:
      '♟️ Қош келдіңіз!\n\n' +
      'Шашка ойынын бастаңыз және қарсыластарыңызды жеңіңіз! 🎮\n\n' +
      '🌐 Тіл: /language',
    btnStart: '🎮 ОЙЫНДЫ БАСТАУ',
    btnGroup: '👥 ГРУППАДА ОЙНАУ',

    cmdGame: 'Шашка ойынын құру',
    cmdLanguage: 'Тілді таңдау',
    cmdStart: 'Ботты іске қосу',
    cmdAdmin: 'Админ панель'
  },

  uz: {
    chooseLang: '🌐 Tilni tanlang / Тілді таңдаңыз / Выберите язык',
    langSaved: '✅ Til: O‘zbekcha',
    langAdminOnly: 'Tilni faqat guruh adminlari o‘zgartira oladi',

    groupWelcome:
      '♟️ <b>Assalomu alaykum!</b>\n\n' +
      'Men — Shashka o‘yini botiman! 🎮\n\n' +
      'Endi shu guruhda do‘stlaringiz bilan shashka o‘ynashingiz mumkin.\n\n' +
      '🎯 O‘yinni boshlash uchun:\n' +
      '<b>/game</b> buyrug‘ini yozing.\n\n' +
      '👥 Ikki o‘yinchi qo‘shilgach, o‘yin boshlanadi!\n\n' +
      'G‘olibni aniqlaymiz. Omad! 🏆\n\n' +
      '🌐 Tilni o‘zgartirish: <b>/language</b>',

    roomTitle: '♟️ <b>SHASHKA O‘YINI</b>',
    roomSearching:
      '\n🔎 Raqib izlanmoqda...\n' +
      '♟️ O‘yinga qo‘shilish uchun quyidagi tugmani bosing.\n' +
      '⏳ Raqib topish uchun 2 daqiqa beriladi.',
    roomFound:
      '\n✅ Ikki o‘yinchi topildi!\n' +
      '👇 O‘yinga kirish uchun quyidagi tugmani bosing.\n' +
      '⏳ Birinchi kirgan o‘yinchiga 1 daqiqa 30 soniya beriladi.',
    roomStarted: '\n\n🎮 <b>O‘yin boshlandi!</b>\nOmad!',
    btnJoin: '♟️ O‘YINGA QO‘SHILISH',
    btnEnter: '🎮 O‘YINGA KIRISH',

    roomExpired: 'Bu o‘yinning vaqti tugagan.',
    groupBlocked: '🚫 Bu guruhda bot bloklangan.',
    alreadyJoined: 'Siz allaqachon o‘yinga qo‘shilgansiz.',
    roomFull: 'O‘yinchilar soni to‘ldi.',
    otherRoom: 'Siz boshqa guruh o‘yiniga qo‘shilgansiz.',
    joined: 'Siz o‘yinga qo‘shildingiz!',

    gameOver: '♟️ <b>SHASHKA O‘YINI TUGADI!</b>',
    winner: '🏆 <b>G‘OLIB:</b>',
    rTimeout: '⏰ Raqibning yurish vaqti tugadi.',
    rOppTimeout: '⏰ Raqib 1 daqiqa 30 soniya ichida o‘yinga kirmadi.',
    rResign: '🏁 Raqib o‘yinni tugatdi.',
    rLeft: '📴 Raqibning aloqasi uzildi.',
    drawText: '🤝 O‘yin durang bilan tugadi!',

    alreadyPlaying:
      'Siz hozir shashka o‘ynayapsiz!\n' +
      'Yangi o‘yin ochish uchun avval hozirgi o‘yinni tugating. ♟️',

    startText:
      '♟️ Xush kelibsiz!\n\n' +
      'Shashka o‘yinini boshlang va raqiblaringizni yengib o‘ting! 🎮\n\n' +
      '🌐 Til: /language',
    btnStart: '🎮 O‘YINNI BOSHLASH',
    btnGroup: '👥 GURUHDA O‘YNASH',

    cmdGame: 'Shashka o‘yinini yaratish',
    cmdLanguage: 'Tilni tanlash',
    cmdStart: 'Botni ishga tushirish',
    cmdAdmin: 'Admin panel'
  },

  ru: {
    chooseLang: '🌐 Выберите язык / Tilni tanlang / Тілді таңдаңыз',
    langSaved: '✅ Язык: Русский',
    langAdminOnly: 'Язык могут менять только админы группы',

    groupWelcome:
      '♟️ <b>Всем привет!</b>\n\n' +
      'Я — бот для игры в шашки! 🎮\n\n' +
      'Теперь в этой группе можно играть в шашки с друзьями.\n\n' +
      '🎯 Чтобы начать игру:\n' +
      'напишите команду <b>/game</b>.\n\n' +
      '👥 Когда присоединятся двое игроков, игра начнётся!\n\n' +
      'Определим победителя. Удачной игры! 🏆\n\n' +
      '🌐 Сменить язык: <b>/language</b>',

    roomTitle: '♟️ <b>ИГРА В ШАШКИ</b>',
    roomSearching:
      '\n🔎 Идёт поиск соперника...\n' +
      '♟️ Чтобы присоединиться к игре, нажмите кнопку ниже.\n' +
      '⏳ На поиск соперника даётся 2 минуты.',
    roomFound:
      '\n✅ Два игрока найдены!\n' +
      '👇 Чтобы войти в игру, нажмите кнопку ниже.\n' +
      '⏳ Первому вошедшему игроку даётся 1 минута 30 секунд.',
    roomStarted: '\n\n🎮 <b>Игра началась!</b>\nУдачи!',
    btnJoin: '♟️ ПРИСОЕДИНИТЬСЯ',
    btnEnter: '🎮 ВОЙТИ В ИГРУ',

    roomExpired: 'Время этой игры истекло.',
    groupBlocked: '🚫 В этой группе бот заблокирован.',
    alreadyJoined: 'Вы уже присоединились к игре.',
    roomFull: 'Все места заняты.',
    otherRoom: 'Вы уже участвуете в другой групповой игре.',
    joined: 'Вы присоединились к игре!',

    gameOver: '♟️ <b>ИГРА В ШАШКИ ОКОНЧЕНА!</b>',
    winner: '🏆 <b>ПОБЕДИТЕЛЬ:</b>',
    rTimeout: '⏰ У соперника закончилось время хода.',
    rOppTimeout: '⏰ Соперник не вошёл в игру за 1 минуту 30 секунд.',
    rResign: '🏁 Соперник сдался.',
    rLeft: '📴 У соперника оборвалась связь.',
    drawText: '🤝 Игра закончилась вничью!',

    alreadyPlaying:
      'Вы сейчас играете в шашки!\n' +
      'Чтобы начать новую игру, сначала завершите текущую. ♟️',

    startText:
      '♟️ Добро пожаловать!\n\n' +
      'Начните игру в шашки и побеждайте соперников! 🎮\n\n' +
      '🌐 Язык: /language',
    btnStart: '🎮 НАЧАТЬ ИГРУ',
    btnGroup: '👥 ИГРАТЬ В ГРУППЕ',

    cmdGame: 'Создать игру в шашки',
    cmdLanguage: 'Выбрать язык',
    cmdStart: 'Запустить бота',
    cmdAdmin: 'Админ-панель'
  }
};

function t(lang, key, vars) {
  const dict = T[normLang(lang)] || T[DEFAULT_LANG];
  let s = dict[key];

  if (s === undefined) s = T[DEFAULT_LANG][key];
  if (s === undefined) return key;

  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) =>
      vars[k] !== undefined ? String(vars[k]) : m
    );
  }

  return s;
}

module.exports = { LANGS, DEFAULT_LANG, normLang, detectLang, t, T };
