'use strict';
process.env.DEV = '1';
process.env.GRACE_SECONDS = '1';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const WebSocket = require('ws');
const { server } = require('../server');
const { verifyInitData } = require('../lib/telegram');

let port;
test.before(() => new Promise((r) => server.listen(0, () => { port = server.address().port; r(); })));
test.after(() => { server.closeAllConnections?.(); server.close(); });

function client(id, name) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const box = { ws, msgs: [], waiters: [] };
  ws.on('message', (d) => {
    const m = JSON.parse(d); box.msgs.push(m);
    box.waiters = box.waiters.filter((w) => !(w.t === m.t && (w.resolve(m), true)));
  });
  box.send = (m) => ws.send(JSON.stringify(m));
  box.next = (t, ms = 3000) => {
    const i = box.msgs.findIndex((m) => m.t === t);
    if (i >= 0) return Promise.resolve(box.msgs.splice(i, 1)[0]);
    return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout ' + t)), ms); box.waiters.push({ t, resolve: (m) => { clearTimeout(to); box.msgs.splice(box.msgs.indexOf(m), 1); res(m); } }); });
  };
  return new Promise((r) => ws.on('open', () => { box.send({ t: 'auth', dev: { id, name } }); r(box); }));
}

test('initData tekshiruvi: to‘g‘ri imzo qabul, noto‘g‘ri rad', () => {
  const token = '123:ABC';
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 42, first_name: 'Nodira', last_name: 'K', photo_url: 'https://t.me/i/userpic/320/x.jpg' }) });
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dcs).digest('hex'));
  const u = verifyInitData(params.toString(), token);
  assert.deepEqual(u, { id: '42', name: 'Nodira K', avatar: 'https://t.me/i/userpic/320/x.jpg' });
  assert.equal(verifyInitData(params.toString(), 'other:token'), null);
  assert.equal(verifyInitData(params.toString().replace('Nodira', 'Hacker'), token), null);
  assert.equal(verifyInitData(params.toString(), token, 86400, Date.now() + 3 * 86400000), null);
});

test('matchmaking, o‘yin, urish, chat, taslim', async () => {
  const a = await client('1', 'Ali'), b = await client('2', 'Vali');
  await a.next('hello'); await b.next('hello');
  a.send({ t: 'find' });
  assert.equal((await a.next('searching')).t, 'searching');
  b.send({ t: 'find' });
  const ga = await a.next('game'), gb = await b.next('game');
  assert.notEqual(ga.you, gb.you);
  assert.equal(ga.players.w.name === 'Ali' || ga.players.b.name === 'Ali', true);
  assert.equal(ga.players[gb.you].name, 'Vali');
  const [w, bl] = ga.you === 'w' ? [a, b] : [b, a];
  const gw = ga.you === 'w' ? ga : gb, gbk = ga.you === 'w' ? gb : ga;
  assert.ok(gw.legal.length > 0); assert.equal(gbk.legal.length, 0);

  // Qora navbat bo'lmaganda yurolmaydi
  bl.send({ t: 'move', from: 16, to: 25 });
  await bl.next('game'); // resync

  // Oq yuradi -> ikkalasi ko'radi
  const m1 = gw.legal[0];
  w.send({ t: 'move', from: m1.from, to: m1.to });
  const mw = await w.next('move'), mb = await bl.next('move');
  assert.deepEqual(mw.step, mb.step); assert.equal(mb.turn, 'b');
  assert.equal(mw.legal.length, 0); assert.ok(mb.legal.length > 0);
  // Noqonuniy yurish
  w.send({ t: 'move', from: 0, to: 63 });
  // Chat
  bl.send({ t: 'chat', text: 'Salom!' });
  const ca = await w.next('chat'), cb = await bl.next('chat');
  assert.equal(ca.text, 'Salom!'); assert.equal(cb.from, 'b');
  // Taslim
  bl.send({ t: 'resign' });
  const oa = await w.next('over'), ob = await bl.next('over');
  assert.equal(oa.result, 'w'); assert.equal(oa.reason, 'resign'); assert.equal(ob.result, 'w');
  a.ws.close(); b.ws.close();
});

test('qidiruvni bekor qilish va o‘ziga o‘zi ulanmaslik', async () => {
  const a = await client('10', 'A'); await a.next('hello');
  a.send({ t: 'find' }); await a.next('searching');
  a.send({ t: 'cancel' }); await a.next('idle');
  const b = await client('11', 'B'); await b.next('hello');
  b.send({ t: 'find' }); await b.next('searching'); // A bekor qilgan — B kutadi
  await assert.rejects(b.next('game', 300));
  a.ws.close(); b.ws.close();
});

test('raqib uzilsa: xabar, qaytsa davom, qaytmasa g‘alaba', async () => {
  const a = await client('20', 'A'), b = await client('21', 'B');
  await a.next('hello'); await b.next('hello');
  a.send({ t: 'find' }); await a.next('searching'); b.send({ t: 'find' });
  await a.next('game'); await b.next('game');
  // A uziladi -> B xabar oladi
  a.ws.close();
  const away = await b.next('away'); assert.equal(away.left, true);
  // A qaytadi
  const a2 = await client('20', 'A');
  await a2.next('hello'); const g = await a2.next('game'); assert.ok(g.board);
  assert.equal((await b.next('away')).left, false);
  // Endi B uziladi va qaytmaydi
  b.ws.close();
  assert.equal((await a2.next('away')).left, true);
  const over = await a2.next('over', 3000);
  assert.equal(over.reason, 'left'); assert.equal(over.result, g.you);
  a2.ws.close();
});

test('autentifikatsiyasiz ulanish yopiladi (DEV bo‘lmagan initData)', async () => {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  await new Promise((r) => ws.on('open', r));
  ws.send(JSON.stringify({ t: 'auth', initData: 'user=%7B%22id%22%3A1%7D&hash=00' }));
  const closed = await new Promise((r) => ws.on('close', r));
  assert.ok(closed !== undefined);
});
