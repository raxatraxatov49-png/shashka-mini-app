'use strict';

/*
  Дүкен: койн, тақта/тас сатып алу, дос шақыру.
  Баға мен марапат тек осы жерде (сервер шешеді, клиентке сенбейміз).
*/

const REF_REWARD = 50;
const REF_WINDOW_MS = 30 * 60 * 1000; // жаңа ойыншы деп санау уақыты

const STAR_PRICE = 15; // Telegram Stars

/*
  Бұрынғы тастардың койнмен сатылған бағасы. Тек бір реттік көшіру (migration) үшін:
  бұрын сатып алынған тастар үшін койн қайтарылады, тастар классикаға ауысады.
*/
const OLD_PIECE_PRICES = {
  p1: 1000, p2: 2500, p3: 4000, p4: 8000, p5: 1200, p6: 1500,
  p7: 2000, p8: 3000, p9: 4000, p10: 6000, p11: 9000, p12: 12000
};

const CATALOG = {
  boards: [
    { id: 'b0', price: 0 },
    { id: 'b1', price: 1000 },
    { id: 'b5', price: 1200 },
    { id: 'b6', price: 1300 },
    { id: 'b2', price: 1500 },
    { id: 'b7', price: 2000 },
    { id: 'b8', price: 2500 },
    { id: 'b3', price: 3000 },
    { id: 'b9', price: 3500 },
    { id: 'b10', price: 4000 },
    { id: 'b4', price: 6000 },
    { id: 'b11', price: 7000 },
    { id: 'b12', price: 10000 }
  ],
  pieces: [
    { id: 'p0', price: 0 },
    { id: 'p1', price: 1500 },
    { id: 'p5', price: 1500 },
    { id: 'p6', price: 1500 },
    // Қыздарға арналған (тек Telegram Stars)
    { id: 'p13', price: 0, stars: STAR_PRICE },
    { id: 'p14', price: 0, stars: STAR_PRICE },
    { id: 'p15', price: 0, stars: STAR_PRICE },
    { id: 'p16', price: 0, stars: STAR_PRICE },
    // Жігіттерге арналған (тек Telegram Stars)
    { id: 'p17', price: 0, stars: STAR_PRICE },
    { id: 'p18', price: 0, stars: STAR_PRICE },
    { id: 'p19', price: 0, stars: STAR_PRICE },
    { id: 'p20', price: 0, stars: STAR_PRICE }
  ]
};

const KINDS = Object.keys(CATALOG);

const VIP_DAY_MS = 24 * 60 * 60 * 1000;

function findItem(kind, id) {
  return (CATALOG[kind] || []).find(x => x.id === id) || null;
}

function freshProfile() {
  return {
    coins: 0,
    own: { boards: ['b0'], pieces: ['p0'] },
    use: { boards: 'b0', pieces: 'p0' },
    invitedBy: null,
    invited: [],
    vipUntil: 0,
    dnd: false,
    pieceMig: 1
  };
}

// Бір реттік көшіру: сатып алынған тастарға койн қайтарылады, таңдау классикаға ауысады.
// normalize-ға дейін, шикі дерекке қолданылады (өшірілген id-лер әлі көрінеді).
function migrateRaw(p) {
  if (!p || typeof p !== 'object' || p.pieceMig) return false;

  const own = Array.isArray(p.own && p.own.pieces) ? p.own.pieces : [];
  let refund = 0;

  for (const id of new Set(own)) {
    if (Object.prototype.hasOwnProperty.call(OLD_PIECE_PRICES, id)) {
      refund += OLD_PIECE_PRICES[id];
    }
  }

  p.coins = Math.max(0, Math.floor(Number(p.coins) || 0)) + refund;
  p.own = Object.assign({}, p.own, { pieces: ['p0'] });
  p.use = Object.assign({}, p.use, { pieces: 'p0' });
  p.pieceMig = 1;

  return true;
}

function normalize(p) {
  const f = freshProfile();
  if (!p || typeof p !== 'object') return f;

  f.coins = Math.max(0, Math.floor(Number(p.coins) || 0));
  f.vipUntil = Math.max(0, Math.floor(Number(p.vipUntil) || 0));
  f.dnd = Boolean(p.dnd);
  f.pieceMig = p.pieceMig ? 1 : 0;

  const vipNow = f.vipUntil > Date.now();

  for (const k of KINDS) {
    const own = Array.isArray(p.own && p.own[k]) ? p.own[k] : [];
    const set = new Set(['' + CATALOG[k][0].id]);
    for (const id of own) if (findItem(k, id)) set.add(id);
    f.own[k] = [...set];

    const use = p.use && p.use[k];
    f.use[k] = (set.has(use) || (vipNow && findItem(k, use)))
      ? use
      : CATALOG[k][0].id;
  }

  f.invitedBy = p.invitedBy ? String(p.invitedBy) : null;
  f.invited = Array.isArray(p.invited)
    ? p.invited
        .filter(x => x && x.id)
        .map(x => ({
          id: String(x.id),
          name: String(x.name || '').slice(0, 40),
          ts: Number(x.ts) || 0
        }))
    : [];

  return f;
}

function createShop(data, onChange) {
  const profiles = new Map();

  let migrated = false;

  for (const [id, p] of Object.entries(data || {})) {
    if (migrateRaw(p)) migrated = true;
    profiles.set(String(id), normalize(p));
  }

  const changed = () => onChange && onChange(toJSON());

  function toJSON() {
    return Object.fromEntries(profiles);
  }

  const vipActive = p => p.vipUntil > Date.now();

  function get(id) {
    id = String(id);
    let p = profiles.get(id);
    if (!p) {
      p = freshProfile();
      profiles.set(id, p);
    }

    // VIP мерзімі бітсе, сатып алынбаған тақта/тас таңдауы әдепкіге қайтады
    if (!vipActive(p)) {
      for (const k of KINDS) {
        if (!p.own[k].includes(p.use[k])) p.use[k] = CATALOG[k][0].id;
      }
    }

    return p;
  }

  const allIds = Object.fromEntries(
    KINDS.map(k => [k, CATALOG[k].map(x => x.id)])
  );

  const prices = Object.fromEntries(
    KINDS.map(k => [k, Object.fromEntries(CATALOG[k].map(x => [x.id, x.price]))])
  );

  // Telegram Stars-пен сатылатын заттар: { pieces: { p13: 15, ... } }
  const stars = Object.fromEntries(
    KINDS.map(k => [k, Object.fromEntries(CATALOG[k].filter(x => x.stars).map(x => [x.id, x.stars]))])
  );

  // Клиентке жіберілетін көрініс
  function view(id) {
    const p = get(id);
    return {
      ref: String(id),
      prices,
      stars,
      coins: p.coins,
      vip: vipActive(p),
      vipUntil: p.vipUntil,
      dnd: Boolean(p.dnd),
      own: vipActive(p) ? allIds : p.own,
      use: p.use,
      reward: REF_REWARD,
      invited: p.invited.slice(-50).reverse(),
      invitedCount: p.invited.length
    };
  }

  function buy(id, kind, itemId) {
    const item = findItem(kind, itemId);
    if (!item) return { ok: false, code: 'bad_item' };

    const p = get(id);

    if (item.stars) return { ok: false, code: 'stars_only' };

    if (p.own[kind].includes(itemId) || vipActive(p)) {
      return { ok: false, code: 'owned' };
    }
    if (p.coins < item.price) {
      return { ok: false, code: 'no_coins' };
    }

    p.coins -= item.price;
    p.own[kind].push(itemId);
    p.use[kind] = itemId; // сатып алғанда бірден қолданылады
    changed();

    return { ok: true };
  }

  // Telegram Stars төлемі өткеннен кейін затты береді (серверден ғана шақырылады)
  function grant(id, kind, itemId) {
    const item = findItem(kind, itemId);
    if (!item || !item.stars) return { ok: false, code: 'bad_item' };

    const p = get(id);

    if (!p.own[kind].includes(itemId)) p.own[kind].push(itemId);
    p.use[kind] = itemId;
    changed();

    return { ok: true };
  }

  function starPrice(kind, itemId) {
    const item = findItem(kind, itemId);
    return item && item.stars ? item.stars : 0;
  }

  function owns(id, kind, itemId) {
    const p = get(id);
    return vipActive(p) || p.own[kind].includes(itemId);
  }

  function use(id, kind, itemId) {
    if (!findItem(kind, itemId)) return { ok: false, code: 'bad_item' };

    const p = get(id);

    if (!p.own[kind].includes(itemId) && !vipActive(p)) {
      return { ok: false, code: 'not_owned' };
    }

    p.use[kind] = itemId;
    changed();

    return { ok: true };
  }

  /*
    Реферал. Тек мына жағдайда койн беріледі:
    - шақырушы бар және өзі емес
    - шақырылған адам алғаш рет қосылғанына 30 минут өтпеген (firstSeen)
    - бұл адамды бұрын ешкім шақырмаған
  */
  function claimReferral(inviteeId, inviteeName, inviterId, firstSeen, now = Date.now()) {
    inviteeId = String(inviteeId);
    inviterId = String(inviterId);

    if (inviteeId === inviterId) return { ok: false, code: 'self' };
    if (!profiles.has(inviterId) && !firstSeen.has(inviterId)) {
      return { ok: false, code: 'unknown_inviter' };
    }

    const seen = Number(firstSeen.get(inviteeId));
    if (!seen || now - seen > REF_WINDOW_MS) {
      return { ok: false, code: 'not_new' };
    }

    const invitee = get(inviteeId);
    if (invitee.invitedBy) return { ok: false, code: 'already' };

    const inviter = get(inviterId);

    invitee.invitedBy = inviterId;
    inviter.coins += REF_REWARD;
    inviter.invited.push({
      id: inviteeId,
      name: String(inviteeName || '').slice(0, 40),
      ts: now
    });
    changed();

    return { ok: true, reward: REF_REWARD };
  }

  // Админ койн береді (немесе азайтады). Нәтиже 0-ден төмен болмайды.
  function addCoins(id, amount) {
    amount = Math.trunc(Number(amount));

    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1e9) {
      return { ok: false, code: 'bad_amount' };
    }

    const p = get(id);

    p.coins = Math.max(0, p.coins + amount);
    changed();

    return { ok: true, coins: p.coins };
  }

  // «Мазаламаңыз» режимі
  function isDnd(id) {
    return Boolean(get(id).dnd);
  }

  function setDnd(id, on) {
    const p = get(id);

    p.dnd = Boolean(on);
    changed();

    return p.dnd;
  }

  // VIP: белсенді ме
  function isVip(id) {
    return vipActive(get(id));
  }

  // VIP мерзімін қосады (белсенді болса, қалған мерзімнің үстіне)
  function addVip(id, days) {
    days = Math.trunc(Number(days));

    if (!Number.isFinite(days) || days <= 0 || days > 3650) {
      return { ok: false, code: 'bad_days' };
    }

    const p = get(id);
    const base = Math.max(Date.now(), p.vipUntil);

    p.vipUntil = base + days * VIP_DAY_MS;
    changed();

    return { ok: true, vipUntil: p.vipUntil };
  }

  if (migrated) changed();

  return { get, view, buy, use, grant, starPrice, owns, claimReferral, addCoins, isVip, addVip, isDnd, setDnd, toJSON };
}

module.exports = { createShop, CATALOG, REF_REWARD, REF_WINDOW_MS, STAR_PRICE, OLD_PIECE_PRICES };
