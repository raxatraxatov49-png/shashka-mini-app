'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createShop, REF_REWARD } = require('../lib/shop');

const seen = (obj) => ({ get: id => obj[id], has: id => id in obj });

test('дос расталғанда шақырушыға 50 койн беріледі', () => {
  const s = createShop({}, () => {});
  const r = s.claimReferral('2', 'Дос', '1', seen({ 1: 1, 2: Date.now() }));
  assert.equal(r.ok, true);
  assert.equal(s.get('1').coins, REF_REWARD);
  assert.equal(s.view('1').invitedCount, 1);
});

test('бір адам үшін екінші рет койн берілмейді', () => {
  const s = createShop({}, () => {});
  const f = seen({ 1: 1, 3: 1, 2: Date.now() });
  s.claimReferral('2', 'Дос', '1', f);
  assert.equal(s.claimReferral('2', 'Дос', '3', f).code, 'already');
  assert.equal(s.get('3').coins, 0);
});

test('өз сілтемесімен және ескі ойыншымен койн берілмейді', () => {
  const s = createShop({}, () => {});
  assert.equal(s.claimReferral('1', 'Мен', '1', seen({ 1: Date.now() })).code, 'self');
  const old = Date.now() - 3 * 3600 * 1000;
  assert.equal(s.claimReferral('2', 'Ескі', '1', seen({ 1: 1, 2: old })).code, 'not_new');
});

test('сатып алу: койн жетпесе болмайды, жетсе тас қолданылады', () => {
  const s = createShop({ 1: { coins: 1000 } }, () => {});
  assert.equal(s.buy('1', 'boards', 'b2').code, 'no_coins');
  assert.equal(s.buy('1', 'boards', 'b1').ok, true);
  assert.equal(s.get('1').coins, 0);
  assert.equal(s.get('1').use.boards, 'b1');
  assert.equal(s.buy('1', 'boards', 'b1').code, 'owned');
  assert.equal(s.buy('1', 'boards', 'zzz').code, 'bad_item');
});

test('иелік етпеген затты таңдауға болмайды', () => {
  const s = createShop({}, () => {});
  assert.equal(s.use('1', 'pieces', 'p4').code, 'not_owned');
});
