'use strict';

/*
  Дүкен: койн, тақта/тас сатып алу, дос шақыру.
  Баға мен марапат тек осы жерде (сервер шешеді, клиентке сенбейміз).
*/

const REF_REWARD = 50;
const REF_WINDOW_MS = 30 * 60 * 1000; // жаңа ойыншы деп санау уақыты

const CATALOG = {
  boards: [
    { id: 'b0', price: 0 },
    { id: 'b1', price: 1000 },
    { id: 'b2', price: 1500 },
    { id: 'b3', price: 3000 },
    { id: 'b4', price: 6000 }
  ],
  pieces: [
    { id: 'p0', price: 0 },
    { id: 'p1', price: 1000 },
    { id: 'p2', price: 2500 },
    { id: 'p3', price: 4000 },
    { id: 'p4', price: 8000 }
  ]
};

const KINDS = Object.keys(CATALOG);

function findItem(kind, id) {
  return (CATALOG[kind] || []).find(x => x.id === id) || null;
}

function freshProfile() {
  return {
    coins: 0,
    own: { boards: ['b0'], pieces: ['p0'] },
    use: { boards: 'b0', pieces: 'p0' },
    invitedBy: null,
    invited: []
  };
}

function normalize(p) {
  const f = freshProfile();
  if (!p || typeof p !== 'object') return f;

  f.coins = Math.max(0, Math.floor(Number(p.coins) || 0));

  for (const k of KINDS) {
    const own = Array.isArray(p.own && p.own[k]) ? p.own[k] : [];
    const set = new Set(['' + CATALOG[k][0].id]);
    for (const id of own) if (findItem(k, id)) set.add(id);
    f.own[k] = [...set];

    const use = p.use && p.use[k];
    f.use[k] = set.has(use) ? use : CATALOG[k][0].id;
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

  for (const [id, p] of Object.entries(data || {})) {
    profiles.set(String(id), normalize(p));
  }

  const changed = () => onChange && onChange(toJSON());

  function toJSON() {
    return Object.fromEntries(profiles);
  }

  function get(id) {
    id = String(id);
    let p = profiles.get(id);
    if (!p) {
      p = freshProfile();
      profiles.set(id, p);
    }
    return p;
  }

  const prices = Object.fromEntries(
    KINDS.map(k => [k, Object.fromEntries(CATALOG[k].map(x => [x.id, x.price]))])
  );

  // Клиентке жіберілетін көрініс
  function view(id) {
    const p = get(id);
    return {
      ref: String(id),
      prices,
      coins: p.coins,
      own: p.own,
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

    if (p.own[kind].includes(itemId)) {
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

  function use(id, kind, itemId) {
    if (!findItem(kind, itemId)) return { ok: false, code: 'bad_item' };

    const p = get(id);

    if (!p.own[kind].includes(itemId)) {
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

  return { get, view, buy, use, claimReferral, toJSON };
}

module.exports = { createShop, CATALOG, REF_REWARD, REF_WINDOW_MS };
