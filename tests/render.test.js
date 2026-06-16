// Tests for output rendering. NO_COLOR keeps output plain so we can assert on text.
process.env.NO_COLOR = '1';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderSimple, renderTable, buildJson } = require('../src/render');

function row(over) {
  return {
    code: 'sz159915',
    name: 'GEM',
    cost: 3.326,
    shares: 4100,
    cur: 4.116,
    pnlAmt: 3239,
    pnlPct: 23.75,
    signal: null,
    nextSell: null,
    nextBuy: null,
    ...over,
  };
}

test('simple view: only rows with a signal are shown', () => {
  const rows = [
    row({ name: 'NOSIG', signal: null }),
    row({ name: 'SELLER', signal: { side: 'sell', price: 3.99 } }),
  ];
  const out = renderSimple(rows, 'now', ['tencent']);
  assert.ok(!out.includes('NOSIG'));
  assert.ok(out.includes('SELLER'));
});

test('simple view: no signals -> "(no signals)"', () => {
  const out = renderSimple([row({ signal: null })], 'now', ['tencent']);
  assert.ok(out.includes('(no signals)'));
});

test('SELL shows shares and the CURRENT price (not the trigger)', () => {
  const out = renderSimple([row({ signal: { side: 'sell', price: 3.99 } })], 'now', ['tencent']);
  assert.ok(out.includes('SELL 4,100 @4.116')); // shares + current price 4.116, not 3.99
});

test('BUY shows no shares', () => {
  const buy = renderSimple([row({ shares: 0, cost: null, pnlPct: null, signal: { side: 'buy', price: 7 } })], 'now', ['t']);
  assert.ok(buy.includes('BUY @4.116'));
  assert.ok(!/BUY \d/.test(buy)); // no share count on a buy
});

test('full table: header + a data row with TARGET grid levels', () => {
  const out = renderTable([row({ nextBuy: 3.16, signal: null })], 'now', ['tencent']);
  assert.ok(out.includes('CODE') && out.includes('SIGNAL'));
  assert.ok(out.includes('159915')); // sh/sz prefix stripped
  assert.ok(out.includes('B 3.160'));
});

test('JSON: sell signal carries shares; buy/watch do not', () => {
  const j = buildJson(
    [
      row({ signal: { side: 'sell', price: 3.99 } }),
      row({ shares: 0, cost: null, pnlAmt: null, pnlPct: null, signal: { side: 'buy', price: 7 } }),
    ],
    'now',
    ['tencent']
  );
  assert.deepEqual(j.items[0].signal, { side: 'sell', target: 3.99, shares: 4100 });
  assert.deepEqual(j.items[1].signal, { side: 'buy', target: 7, shares: null });
  assert.equal(j.items[0].code, '159915');
});
