// Tests for signal logic: target resolution, direction (sell-high / buy-low), P/L.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTarget, targetsOf, evalItem, evalAll } = require('../src/calc');
const { parseTarget } = require('../src/args');

const r = (tok, cost) => resolveTarget(parseTarget(tok), cost);
const COST = 3.326;

test('percent: s5% sells at cost*1.05, b5% buys at cost*0.95', () => {
  assert.deepEqual(r('s5%', COST), { note: '', price: 3.492, dir: 'up', side: 'sell' });
  assert.deepEqual(r('b5%', COST), { note: '', price: 3.16, dir: 'down', side: 'buy' });
});

test('absolute s/b force direction regardless of cost (sell-high / buy-low)', () => {
  // s below cost still sells on a RISE to the level (not a stop-loss-on-fall)
  assert.deepEqual(r('s3.050', COST), { note: '', price: 3.05, dir: 'up', side: 'sell' });
  // b above cost still buys on a FALL to the level
  assert.deepEqual(r('b5.067', COST), { note: '', price: 5.067, dir: 'down', side: 'buy' });
});

test('stop-loss sl: SELL that triggers on a FALL (dir down), percent goes below cost', () => {
  assert.deepEqual(r('sl5%', COST), { note: '', price: 3.16, dir: 'down', side: 'sell' });
  assert.deepEqual(r('sl2.700', COST), { note: '', price: 2.7, dir: 'down', side: 'sell' });
});

test('stop-loss vs take-profit at the same price differ only in direction', () => {
  assert.equal(r('s3.000', COST).dir, 'up'); // take-profit: sell on rise to 3.000
  assert.equal(r('sl3.000', COST).dir, 'down'); // stop-loss: sell on fall to 3.000
  assert.equal(r('s3.000', COST).side, r('sl3.000', COST).side); // both 'sell'
});

test('breakout bu: BUY that triggers on a RISE (dir up), percent above cost', () => {
  assert.deepEqual(r('bu5%', COST), { note: '', price: 3.492, dir: 'up', side: 'buy' });
  assert.deepEqual(r('bu4.000', COST), { note: '', price: 4, dir: 'up', side: 'buy' });
});

test('the four prefixes are the four quadrants at one price', () => {
  assert.deepEqual([r('s3', COST).side, r('s3', COST).dir], ['sell', 'up']); // sell on rise
  assert.deepEqual([r('b3', COST).side, r('b3', COST).dir], ['buy', 'down']); // buy on fall
  assert.deepEqual([r('sl3', COST).side, r('sl3', COST).dir], ['sell', 'down']); // sell on fall
  assert.deepEqual([r('bu3', COST).side, r('bu3', COST).dir], ['buy', 'up']); // buy on rise
});

test('stop-loss is excluded from the next-grid columns', () => {
  const item = { cost: COST, targets: ['s4.000', 'sl2.700'].map(parseTarget) };
  const t = targetsOf(item, 3.3);
  assert.equal(t.nextSell, 4.0); // plain sell-above shows
  assert.equal(t.nextBuy, null); // stop-loss sell-below is not a grid level
});

test('watch-only ticker (no cost): absolute b/s still resolve by prefix alone', () => {
  assert.deepEqual(r('b7', 0), { note: '', price: 7, dir: 'down', side: 'buy' });
  assert.deepEqual(r('s7', 0), { note: '', price: 7, dir: 'up', side: 'sell' });
});

test('targetsOf: hit detection and next pending grid levels', () => {
  const item = { cost: COST, targets: ['s3.492', 'b3.160', 's4.000'].map(parseTarget) };
  const t = targetsOf(item, 3.5); // 3.5 >= 3.492 hits the first sell
  assert.equal(t.hit.side, 'sell');
  assert.equal(t.hit.price, 3.492);
  assert.equal(t.nextSell, 4.0); // 4.000 still pending above
  assert.equal(t.nextBuy, 3.16); // 3.160 still pending below
});

test('targetsOf: first hit in declared order wins', () => {
  const item = { cost: COST, targets: ['s3.400', 's3.300'].map(parseTarget) }; // both hit at 4.0
  const t = targetsOf(item, 4.0);
  assert.equal(t.hit.price, 3.4); // the first one declared
});

test('targetsOf: no hit -> null', () => {
  const item = { cost: COST, targets: ['s9.999', 'b0.001'].map(parseTarget) };
  assert.equal(targetsOf(item, 3.5).hit, null);
});

test('evalItem: P/L for a held lot, with shares passthrough', () => {
  const item = { code: 'sz159915', name: 'GEM', cost: 4.0, shares: 1000, targets: [] };
  const row = evalItem(item, { price: 4.5 });
  assert.equal(row.shares, 1000);
  assert.equal(row.cost, 4.0);
  assert.equal(row.pnlAmt, 500); // 1000 * (4.5 - 4.0)
  assert.equal(Math.round(row.pnlPct * 100) / 100, 12.5);
});

test('evalItem: watch-only lot has no P/L', () => {
  const item = { code: 'sh601398', name: 'ICBC', cost: 0, shares: 0, targets: [] };
  const row = evalItem(item, { price: 7.4 });
  assert.equal(row.cost, null);
  assert.equal(row.pnlAmt, null);
  assert.equal(row.pnlPct, null);
});

test('evalItem: no quote -> NaN price, no signal', () => {
  const item = { code: 'x', name: 'x', cost: 4, shares: 100, targets: ['s5'].map(parseTarget) };
  const row = evalItem(item, undefined);
  assert.ok(Number.isNaN(row.cur));
  assert.equal(row.signal, null);
});

test('evalAll: maps each item against its quote by code', () => {
  const items = [
    { code: 'a', name: 'a', cost: 1, shares: 1, targets: [] },
    { code: 'b', name: 'b', cost: 2, shares: 1, targets: [] },
  ];
  const rows = evalAll(items, { a: { price: 2 }, b: { price: 1 } });
  assert.equal(rows[0].pnlAmt, 1); // a: 2-1
  assert.equal(rows[1].pnlAmt, -1); // b: 1-2
});
