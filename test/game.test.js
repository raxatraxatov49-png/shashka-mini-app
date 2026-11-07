'use strict';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../lib/game');

const sq = (r, c) => r * 8 + c;
function pos(pieces, turn = 'w') {
  const board = Array(64).fill(null);
  for (const [r, c, p] of pieces) board[sq(r, c)] = p;
  return { board, turn, chain: null, quiet: 0, score: { w: 0, b: 0 }, over: null };
}
const ft = (moves) => moves.map((m) => [m.from, m.to]);

test('boshlang‘ich holat: 12 + 12, faqat to‘q kataklarda, oq birinchi', () => {
  const st = G.newGame();
  assert.equal(st.board.filter((p) => p === 'w').length, 12);
  assert.equal(st.board.filter((p) => p === 'b').length, 12);
  st.board.forEach((p, i) => { if (p) assert.equal(((i >> 3) + (i & 7)) % 2, 1); });
  assert.equal(st.turn, 'w');
  assert.equal(G.legalMoves(st).length, 7);
});

test('oddiy yurish navbatni almashtiradi; orqaga yurib bo‘lmaydi', () => {
  const st = G.newGame();
  assert.ok(G.applyMove(st, sq(5, 0), sq(4, 1)));
  assert.equal(st.turn, 'b');
  assert.equal(G.applyMove(st, sq(2, 1), sq(1, 0)), null);
});

test('urish majburiy', () => {
  const st = pos([[5, 2, 'w'], [4, 3, 'b'], [7, 0, 'w']]);
  assert.ok(G.legalMoves(st).every((m) => m.cap !== null));
  assert.equal(G.applyMove(st, sq(7, 0), sq(6, 1)), null);
  const step = G.applyMove(st, sq(5, 2), sq(3, 4));
  assert.equal(step.cap, sq(4, 3));
  assert.equal(st.board[sq(4, 3)], null);
});

test('oddiy shashka orqaga ham uradi', () => {
  const st = pos([[3, 2, 'w'], [4, 3, 'b'], [0, 7, 'b']]);
  assert.deepEqual(ft(G.legalMoves(st)), [[sq(3, 2), sq(5, 4)]]);
});

test('zanjirli urish: davom etish majburiy, navbat oxirida almashadi', () => {
  const st = pos([[5, 0, 'w'], [4, 1, 'b'], [2, 3, 'b'], [0, 7, 'b']]);
  let s = G.applyMove(st, sq(5, 0), sq(3, 2));
  assert.equal(s.more, true);
  assert.equal(st.turn, 'w');
  assert.deepEqual(ft(G.legalMoves(st)), [[sq(3, 2), sq(1, 4)]]);
  s = G.applyMove(st, sq(3, 2), sq(1, 4));
  assert.equal(s.more, false);
  assert.equal(st.turn, 'b');
  assert.equal(st.score.w, 2);
  assert.equal(st.board[sq(4, 1)], null);
  assert.equal(st.board[sq(2, 3)], null);
});

test('oxirgi qatorda dama bo‘ladi', () => {
  const st = pos([[1, 2, 'w'], [7, 6, 'b']]);
  const s = G.applyMove(st, sq(1, 2), sq(0, 1));
  assert.equal(s.king, true);
  assert.equal(st.board[sq(0, 1)], 'W');
});

test('urish paytida dama bo‘lgan shashka dama kabi davom etadi', () => {
  const st = pos([[2, 1, 'w'], [1, 2, 'b'], [3, 6, 'b'], [7, 0, 'b']]);
  const s = G.applyMove(st, sq(2, 1), sq(0, 3));
  assert.equal(s.king, true);
  assert.equal(s.more, true);
  assert.ok(G.legalMoves(st).some((m) => m.cap === sq(3, 6)));
});

test('dama uchib o‘tadi va uradi', () => {
  const st = pos([[7, 0, 'W'], [3, 4, 'b'], [0, 7, 'b']]);
  const m = G.legalMoves(st);
  assert.ok(m.length >= 1 && m.every((x) => x.cap === sq(3, 4)));
  assert.ok(m.some((x) => x.to === sq(2, 5)));
});

test('urilgan shashka yurish tugaguncha doskada turadi, qayta urib bo‘lmaydi', () => {
  const st = pos([[7, 0, 'W'], [4, 3, 'b'], [2, 5, 'b'], [3, 2, 'b']]);
  assert.ok(G.applyMove(st, sq(7, 0), sq(3, 4)) || G.applyMove(st, sq(7, 0), sq(2, 5)) === null);
  assert.equal(G.view(st)[sq(4, 3)], null);
  assert.ok(!G.legalMoves(st).some((m) => m.cap === sq(4, 3)));
});

test('g‘alaba: raqibda shashka qolmasa', () => {
  const st = pos([[5, 2, 'w'], [4, 3, 'b']]);
  G.applyMove(st, sq(5, 2), sq(3, 4));
  assert.deepEqual(st.over, { winner: 'w', reason: 'no_pieces' });
  assert.deepEqual(G.legalMoves(st), []);
});

test('g‘alaba: raqibda yurish imkoni qolmasa', () => {
  const st = pos([[0, 1, 'b'], [1, 0, 'w'], [1, 2, 'w'], [3, 4, 'w']]);
  assert.ok(G.applyMove(st, sq(3, 4), sq(2, 3)));
  assert.deepEqual(st.over, { winner: 'w', reason: 'no_moves' });
});

test('durang: 15 ta dama yurishi urishsiz', () => {
  const st = pos([[0, 1, 'W'], [7, 6, 'B']]);
  let a = sq(0, 1), b = sq(7, 6);
  for (let i = 0; i < 30 && !st.over; i++) {
    if (st.turn === 'w') { const to = a === sq(0, 1) ? sq(1, 0) : sq(0, 1); assert.ok(G.applyMove(st, a, to)); a = to; }
    else { const to = b === sq(7, 6) ? sq(6, 7) : sq(7, 6); assert.ok(G.applyMove(st, b, to)); b = to; }
  }
  assert.deepEqual(st.over, { winner: null, reason: 'draw' });
});

test('tasodifiy o‘yinlar: qoidalar buzilmaydi va o‘yin tugaydi', () => {
  let finished = 0;
  for (let g = 0; g < 300; g++) {
    const st = G.newGame();
    for (let i = 0; i < 600 && !st.over; i++) {
      const mv = G.legalMoves(st);
      assert.ok(mv.length > 0);
      const m = mv[Math.floor(Math.random() * mv.length)];
      assert.ok(G.applyMove(st, m.from, m.to));
      assert.ok(st.board.filter(Boolean).length <= 24);
    }
    if (st.over) finished++;
  }
  assert.ok(finished > 250, 'finished=' + finished);
});
