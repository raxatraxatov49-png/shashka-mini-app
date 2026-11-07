'use strict';
/*
 * Rus shashkasi qoidalari (O'zbekistonda keng tarqalgan):
 *  - 8x8 doska, har tomonda 12 ta shashka, faqat to'q kataklarda
 *  - oq birinchi yuradi
 *  - urish majburiy; oddiy shashka oldinga ham, orqaga ham uradi
 *  - dama (uchuvchi): diagonal bo'ylab istalgan masofaga yuradi va uradi
 *  - zanjirli urish: bir yurishda davom etishi shart; oxirgi qatorga yetgan
 *    shashka urish paytida damaga aylanib, davom etadi
 *  - urilgan shashkalar yurish tugaguncha doskada turadi (bir shashkani 2 marta urib bo'lmaydi)
 *  - raqibda shashka yoki yurish qolmasa, u yutqazadi
 *  - 15 ta ketma-ket faqat dama yurishi (urishsiz) = durang
 *
 * Doska: 64 katak, index = row*8 + col. row 0 tepada (qora), row 7 pastda (oq).
 * To'q katak: (row+col) toq. Qiymatlar: null | 'w' | 'W' | 'b' | 'B' (katta harf = dama)
 */
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const sideOf = (p) => (p ? p.toLowerCase() : null);
const isKing = (p) => !!p && p === p.toUpperCase();
const other = (s) => (s === 'w' ? 'b' : 'w');
const QUIET_LIMIT = 30; // plies (15 yurish har tomondan)

function newGame() {
  const board = Array(64).fill(null);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r * 8 + c] = 'b';
        else if (r > 4) board[r * 8 + c] = 'w';
      }
    }
  }
  return { board, turn: 'w', chain: null, quiet: 0, score: { w: 0, b: 0 }, over: null };
}

// Bitta shashkadan barcha mumkin bo'lgan "sakrash"lar (urishlar)
function jumps(board, from, captured) {
  const p = board[from];
  const me = sideOf(p);
  const king = isKing(p);
  const r0 = from >> 3, c0 = from & 7;
  const out = [];
  for (const [dr, dc] of DIRS) {
    let r = r0 + dr, c = c0 + dc;
    if (king) while (inB(r, c) && !board[r * 8 + c]) { r += dr; c += dc; }
    if (!inB(r, c)) continue;
    const ci = r * 8 + c;
    const t = board[ci];
    if (!t || sideOf(t) === me || captured.includes(ci)) continue;
    r += dr; c += dc;
    while (inB(r, c) && !board[r * 8 + c]) {
      out.push({ from, to: r * 8 + c, cap: ci });
      if (!king) break;
      r += dr; c += dc;
    }
  }
  return out;
}

// Yurishdan keyingi doska va shashka (oxirgi qatorda damaga aylanadi)
function landed(board, m) {
  const b = board.slice();
  const p = b[m.from];
  b[m.from] = null;
  const lastRow = sideOf(p) === 'w' ? 0 : 7;
  const np = (m.to >> 3) === lastRow ? p.toUpperCase() : p;
  b[m.to] = np;
  return { b, np, p };
}

function continues(board, m, captured) {
  const { b } = landed(board, m);
  return jumps(b, m.to, [...captured, m.cap]).length > 0;
}

// Dama bir nechta joyga qo'nishi mumkin bo'lsa va ba'zilaridan urish davom etsa — faqat shular ruxsat
function refine(board, caps, captured) {
  const groups = {};
  for (const m of caps) (groups[m.from + '-' + m.cap] ||= []).push(m);
  const res = [];
  for (const g of Object.values(groups)) {
    const cont = g.filter((m) => continues(board, m, captured));
    res.push(...(cont.length ? cont : g));
  }
  return res;
}

function simpleMoves(board, i) {
  const p = board[i];
  const r0 = i >> 3, c0 = i & 7;
  const out = [];
  if (isKing(p)) {
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc;
      while (inB(r, c) && !board[r * 8 + c]) { out.push({ from: i, to: r * 8 + c, cap: null }); r += dr; c += dc; }
    }
  } else {
    const dr = sideOf(p) === 'w' ? -1 : 1;
    for (const dc of [-1, 1]) {
      const r = r0 + dr, c = c0 + dc;
      if (inB(r, c) && !board[r * 8 + c]) out.push({ from: i, to: r * 8 + c, cap: null });
    }
  }
  return out;
}

function legalMoves(st) {
  if (st.over) return [];
  const { board, turn, chain } = st;
  let caps = [];
  if (chain) caps = jumps(board, chain.pos, chain.captured);
  else for (let i = 0; i < 64; i++) if (board[i] && sideOf(board[i]) === turn) caps.push(...jumps(board, i, []));
  if (caps.length) return refine(board, caps, chain ? chain.captured : []);
  if (chain) return [];
  const res = [];
  for (let i = 0; i < 64; i++) if (board[i] && sideOf(board[i]) === turn) res.push(...simpleMoves(board, i));
  return res;
}

function finishTurn(st) {
  st.turn = other(st.turn);
  const mine = st.board.filter((p) => sideOf(p) === st.turn).length;
  if (!mine) st.over = { winner: other(st.turn), reason: 'no_pieces' };
  else if (!legalMoves(st).length) st.over = { winner: other(st.turn), reason: 'no_moves' };
  else if (st.quiet >= QUIET_LIMIT) st.over = { winner: null, reason: 'draw' };
}

// Bitta qadam (bitta yurish yoki zanjirdagi bitta sakrash). Noqonuniy bo'lsa null.
function applyMove(st, from, to) {
  const m = legalMoves(st).find((x) => x.from === from && x.to === to);
  if (!m) return null;
  const mover = st.turn;
  const { b, np, p } = landed(st.board, m);
  st.board = b;
  const step = { from, to, cap: m.cap, king: np !== p, more: false };
  if (m.cap != null) {
    const ch = st.chain || { pos: from, captured: [] };
    ch.captured = [...ch.captured, m.cap];
    ch.pos = to;
    st.score[mover]++;
    st.quiet = 0;
    if (jumps(st.board, to, ch.captured).length) {
      st.chain = ch;
      step.more = true;
    } else {
      for (const i of ch.captured) st.board[i] = null;
      st.chain = null;
      finishTurn(st);
    }
  } else {
    st.quiet = isKing(p) ? st.quiet + 1 : 0;
    finishTurn(st);
  }
  return step;
}

// Mijozga ko'rsatiladigan doska (zanjir paytida urilganlar olib tashlangan)
function view(st) {
  const cap = st.chain ? st.chain.captured : [];
  return st.board.map((p, i) => (cap.includes(i) ? null : p));
}

module.exports = { newGame, legalMoves, applyMove, view, other, sideOf, isKing };
