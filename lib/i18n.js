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

    groupWelcome: "♟️ <b>Сәлеметсіздер ме!</b>\n\nМен — Шашка ойынының ботымын! 🎮\nЕнді осы топта достарыңызбен шашка ойнай аласыздар.\n\n<b>Қалай ойнау керек:</b>\n1️⃣ <b>/game</b> деп жазыңыз\n2️⃣ Екінші ойыншы «Ойынға қосылу» батырмасын басады\n3️⃣ Екеуі де «Ойынға кіру» батырмасын басып, ойынды бастайды\n\n<b>Білу керек:</b>\n⏳ Қарсылас табуға 2 минут беріледі\n⏱ Әр жүріске 60 секунд беріледі\n🏆 Жеңімпаз топқа жарияланады\n\n🌐 Бот тілі: <b>/language</b>\nҚазақша, O‘zbekcha, Русский. Тілді тек топ админдері өзгерте алады.\n\nСәтті ойын! 🍀",

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

    startText: "♟️ <b>Шашка ойынына қош келдіңіз!</b>\n\nМен — шашканы Telegram ішінде ойнауға арналған ботпын. 🎮\n\n<b>Не істей аласыз:</b>\n🎲 Кездейсоқ қарсыласпен ойнау\n👫 Досыңызға сілтеме жіберіп, бірге ойнау\n👥 Топта достарыңызбен жарысу\n\n<b>Ережелер:</b>\n⏱ Әр жүріске 60 секунд беріледі\n🏆 Қарсыластың барлық тасын алсаңыз, жеңесіз\n💬 Ойын кезінде қарсыласпен чатта жаза аласыз\n\n🌐 Тілді өзгерту: /language\n(Қазақша, O‘zbekcha, Русский)\n\nОйынды бастау үшін төмендегі батырманы басыңыз 👇",
    btnStart: '🎮 ОЙЫНДЫ БАСТАУ',
    btnGroup: '👥 ГРУППАДА ОЙНАУ',
    btnAddGroup: "➕ БОТТЫ ТОПҚА ҚОСУ",
    addGroupHint: "👥 Ботты тобыңызға қосу үшін төмендегі батырманы басыңыз 👇",

    cmdGame: 'Шашка ойынын құру',
    cmdLanguage: 'Тілді таңдау',
    cmdStart: 'Ботты іске қосу',
    cmdAdmin: 'Админ панель',

    ratingTitle: "🏆 <b>ТОП-10 ОЙЫНШЫ</b>",
    ratingEmpty: "Бұл топта әлі ойын болған жоқ.\n/game деп жазып, алғашқы ойынды бастаңыз! ♟️",
    ratingFooter: "🎯 Жеңіс: +10 очко · Жеңіліс: 0 очко",
    resultPoints: "⭐ {name}: +{points} очко",
    resultZero: "▫️ {name}: 0 очко",
    rankUp: "🎖 {name} жаңа рангқа көтерілді: {rank}!",
    meGames: "🎮 Ойындар",
    meWins: "🏆 Жеңістер",
    mePoints: "⭐ Очколар",
    meRank: "🎖 Ранг",
    meNext: "📈 Келесі ранг: {rank}, {left} очко қалды",
    meMax: "🌟 Сіз ең жоғары рангқа жеттіңіз!",
    mePlace: "📍 Бұл топтағы орныңыз: #{place}",
    meNote: "ℹ️ Очколар топтағы ойындар үшін беріледі: жеңіс +10, жеңіліс 0.",
    rank_bronze: "Бронза",
    rank_silver: "Күміс",
    rank_gold: "Алтын",
    rank_platinum: "Платина",
    rank_diamond: "Алмаз",
    rank_master: "Мастер",
    cmdRating: "Топтың ТОП-10 рейтингі",
    cmdMe: "Менің статистикам"
  },

  uz: {
    chooseLang: '🌐 Tilni tanlang / Тілді таңдаңыз / Выберите язык',
    langSaved: '✅ Til: O‘zbekcha',
    langAdminOnly: 'Tilni faqat guruh adminlari o‘zgartira oladi',

    groupWelcome: "♟️ <b>Assalomu alaykum!</b>\n\nMen — Shashka o‘yini botiman! 🎮\nEndi shu guruhda do‘stlaringiz bilan shashka o‘ynashingiz mumkin.\n\n<b>Qanday o‘ynash kerak:</b>\n1️⃣ <b>/game</b> deb yozing\n2️⃣ Ikkinchi o‘yinchi «O‘yinga qo‘shilish» tugmasini bosadi\n3️⃣ Ikkalasi ham «O‘yinga kirish» tugmasini bosib, o‘yinni boshlaydi\n\n<b>Bilish kerak:</b>\n⏳ Raqib topish uchun 2 daqiqa beriladi\n⏱ Har bir yurishga 60 soniya beriladi\n🏆 G‘olib guruhga e’lon qilinadi\n\n🌐 Bot tili: <b>/language</b>\nҚазақша, O‘zbekcha, Русский. Tilni faqat guruh adminlari o‘zgartira oladi.\n\nOmad! 🍀",

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

    startText: "♟️ <b>Shashka o‘yiniga xush kelibsiz!</b>\n\nMen — Telegram ichida shashka o‘ynash uchun botman. 🎮\n\n<b>Nimalar qila olasiz:</b>\n🎲 Tasodifiy raqib bilan o‘ynash\n👫 Do‘stingizga havola yuborib, birga o‘ynash\n👥 Guruhda do‘stlaringiz bilan bellashish\n\n<b>Qoidalar:</b>\n⏱ Har bir yurishga 60 soniya beriladi\n🏆 Raqibning barcha toshlarini olsangiz, g‘alaba qozonasiz\n💬 O‘yin paytida raqib bilan chatda yozishishingiz mumkin\n\n🌐 Tilni o‘zgartirish: /language\n(Қазақша, O‘zbekcha, Русский)\n\nO‘yinni boshlash uchun quyidagi tugmani bosing 👇",
    btnStart: '🎮 O‘YINNI BOSHLASH',
    btnGroup: '👥 GURUHDA O‘YNASH',
    btnAddGroup: "➕ BOTNI GURUHGA QO‘SHISH",
    addGroupHint: "👥 Botni guruhingizga qo‘shish uchun quyidagi tugmani bosing 👇",

    cmdGame: 'Shashka o‘yinini yaratish',
    cmdLanguage: 'Tilni tanlash',
    cmdStart: 'Botni ishga tushirish',
    cmdAdmin: 'Admin panel',

    ratingTitle: "🏆 <b>TOP-10 O‘YINCHI</b>",
    ratingEmpty: "Bu guruhda hali o‘yin bo‘lmagan.\n/game deb yozib, birinchi o‘yinni boshlang! ♟️",
    ratingFooter: "🎯 G‘alaba: +10 ball · Mag‘lubiyat: 0 ball",
    resultPoints: "⭐ {name}: +{points} ball",
    resultZero: "▫️ {name}: 0 ball",
    rankUp: "🎖 {name} yangi darajaga ko‘tarildi: {rank}!",
    meGames: "🎮 O‘yinlar",
    meWins: "🏆 G‘alabalar",
    mePoints: "⭐ Ballar",
    meRank: "🎖 Daraja",
    meNext: "📈 Keyingi daraja: {rank}, {left} ball qoldi",
    meMax: "🌟 Siz eng yuqori darajaga yetdingiz!",
    mePlace: "📍 Bu guruhdagi o‘rningiz: #{place}",
    meNote: "ℹ️ Ballar guruhdagi o‘yinlar uchun beriladi: g‘alaba +10, mag‘lubiyat 0.",
    rank_bronze: "Bronza",
    rank_silver: "Kumush",
    rank_gold: "Oltin",
    rank_platinum: "Platina",
    rank_diamond: "Olmos",
    rank_master: "Master",
    cmdRating: "Guruhning TOP-10 reytingi",
    cmdMe: "Mening statistikam"
  },

  ru: {
    chooseLang: '🌐 Выберите язык / Tilni tanlang / Тілді таңдаңыз',
    langSaved: '✅ Язык: Русский',
    langAdminOnly: 'Язык могут менять только админы группы',

    groupWelcome: "♟️ <b>Всем привет!</b>\n\nЯ — бот для игры в шашки! 🎮\nТеперь в этой группе можно играть в шашки с друзьями.\n\n<b>Как играть:</b>\n1️⃣ Напишите <b>/game</b>\n2️⃣ Второй игрок нажимает «Присоединиться»\n3️⃣ Оба нажимают «Войти в игру» и начинают партию\n\n<b>Важно знать:</b>\n⏳ На поиск соперника даётся 2 минуты\n⏱ На каждый ход даётся 60 секунд\n🏆 Победитель объявляется в группе\n\n🌐 Язык бота: <b>/language</b>\nҚазақша, O‘zbekcha, Русский. Менять язык могут только админы группы.\n\nУдачной игры! 🍀",

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

    startText: "♟️ <b>Добро пожаловать в игру «Шашки»!</b>\n\nЯ — бот, в котором можно играть в шашки прямо в Telegram. 🎮\n\n<b>Что можно делать:</b>\n🎲 Играть со случайным соперником\n👫 Отправить другу ссылку и играть вместе\n👥 Соревноваться с друзьями в группе\n\n<b>Правила:</b>\n⏱ На каждый ход даётся 60 секунд\n🏆 Возьмите все шашки соперника — и вы победили\n💬 Во время игры можно писать сопернику в чате\n\n🌐 Сменить язык: /language\n(Қазақша, O‘zbekcha, Русский)\n\nЧтобы начать игру, нажмите кнопку ниже 👇",
    btnStart: '🎮 НАЧАТЬ ИГРУ',
    btnGroup: '👥 ИГРАТЬ В ГРУППЕ',
    btnAddGroup: "➕ ДОБАВИТЬ БОТА В ГРУППУ",
    addGroupHint: "👥 Чтобы добавить бота в свою группу, нажмите кнопку ниже 👇",

    cmdGame: 'Создать игру в шашки',
    cmdLanguage: 'Выбрать язык',
    cmdStart: 'Запустить бота',
    cmdAdmin: 'Админ-панель',

    ratingTitle: "🏆 <b>ТОП-10 ИГРОКОВ</b>",
    ratingEmpty: "В этой группе ещё не было игр.\nНапишите /game и начните первую партию! ♟️",
    ratingFooter: "🎯 Победа: +10 очков · Поражение: 0 очков",
    resultPoints: "⭐ {name}: +{points} очков",
    resultZero: "▫️ {name}: 0 очков",
    rankUp: "🎖 {name} получает новый ранг: {rank}!",
    meGames: "🎮 Игры",
    meWins: "🏆 Победы",
    mePoints: "⭐ Очки",
    meRank: "🎖 Ранг",
    meNext: "📈 Следующий ранг: {rank}, осталось {left} очков",
    meMax: "🌟 Вы достигли высшего ранга!",
    mePlace: "📍 Ваше место в этой группе: #{place}",
    meNote: "ℹ️ Очки начисляются за игры в группах: победа +10, поражение 0.",
    rank_bronze: "Бронза",
    rank_silver: "Серебро",
    rank_gold: "Золото",
    rank_platinum: "Платина",
    rank_diamond: "Алмаз",
    rank_master: "Мастер",
    cmdRating: "ТОП-10 рейтинг группы",
    cmdMe: "Моя статистика"
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
