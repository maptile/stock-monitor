// Tests for CLI parsing: holding field, field separators, target descriptors, validation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, parseTicker, parseTarget } = require('../src/args');

// Run fn with console.error captured; returns the warning lines it emitted.
function captureWarnings(fn) {
  const orig = console.error;
  const lines = [];
  console.error = (...a) => lines.push(a.join(' '));
  try {
    fn();
  } finally {
    console.error = orig;
  }
  return lines;
}

test('parseTarget: a prefix-less token has no side (rejected later)', () => {
  assert.deepEqual(parseTarget('5%'), { kind: 'pct', mag: 0.05, side: undefined, raw: '5%' });
  assert.deepEqual(parseTarget('3.640'), { kind: 'abs', price: 3.64, side: undefined, raw: '3.640' });
});

test('parseTarget: s/b set side + trigger direction, strip the letter', () => {
  assert.deepEqual(parseTarget('s5%'), { kind: 'pct', mag: 0.05, side: 'sell', raw: 's5%', dir: 'up' });
  assert.deepEqual(parseTarget('b5%'), { kind: 'pct', mag: 0.05, side: 'buy', raw: 'b5%', dir: 'down' });
  assert.deepEqual(parseTarget('s4.430'), { kind: 'abs', price: 4.43, side: 'sell', raw: 's4.430', dir: 'up' });
  assert.deepEqual(parseTarget('b7'), { kind: 'abs', price: 7, side: 'buy', raw: 'b7', dir: 'down' });
});

test('parseTarget: sl/bu carry side + trigger direction', () => {
  assert.deepEqual(parseTarget('sl2.700'), { kind: 'abs', price: 2.7, side: 'sell', raw: 'sl2.700', dir: 'down' });
  assert.deepEqual(parseTarget('sl5%'), { kind: 'pct', mag: 0.05, side: 'sell', raw: 'sl5%', dir: 'down' });
  assert.deepEqual(parseTarget('bu4.000'), { kind: 'abs', price: 4, side: 'buy', raw: 'bu4.000', dir: 'up' });
  assert.deepEqual(parseTarget('bu5%'), { kind: 'pct', mag: 0.05, side: 'buy', raw: 'bu5%', dir: 'up' });
});

test('parseTicker: SHARES@COST holding field', () => {
  const it = parseTicker('sh510300,H300,8600@4.715,s5.067');
  assert.equal(it.code, 'sh510300');
  assert.equal(it.name, 'H300');
  assert.equal(it.shares, 8600);
  assert.equal(it.cost, 4.715);
  assert.equal(it.targets.length, 1);
});

test('parseTicker: "0" and "0@0" mean watch-only', () => {
  for (const h of ['0', '0@0']) {
    const it = parseTicker(`sh601398,ICBC,${h}`);
    assert.equal(it.shares, 0);
    assert.equal(it.cost, 0);
  }
});

test('parseTicker: code-only ticker defaults name to code, watch-only', () => {
  const it = parseTicker('sh518880');
  assert.equal(it.name, 'sh518880');
  assert.equal(it.shares, 0);
  assert.equal(it.cost, 0);
});

test('parseTicker: fields split on commas, spaces, and runs of both', () => {
  const a = parseTicker('sh510300,H300,8600@4.715,s5.067,b5.376');
  const b = parseTicker('sh510300, H300,   8600@4.715,  s5.067   b5.376');
  assert.deepEqual(
    { c: b.code, n: b.name, s: b.shares, co: b.cost, t: b.targets.map((x) => x.raw) },
    { c: a.code, n: a.name, s: a.shares, co: a.cost, t: a.targets.map((x) => x.raw) }
  );
});

test('parseTicker: a prefix-less target is dropped with a warning', () => {
  let it;
  const warns = captureWarnings(() => {
    it = parseTicker('sh510300,H300,8600@4.715,5.067,s5.376');
  });
  assert.deepEqual(it.targets.map((t) => t.raw), ['s5.376']); // bare 5.067 dropped
  assert.equal(warns.length, 1);
  assert.match(warns[0], /5\.067.*prefix/);
});

test('parseTicker: a percent on a watch-only (no cost) ticker is dropped', () => {
  let it;
  const warns = captureWarnings(() => {
    it = parseTicker('sh601398,ICBC,0,b5%,b7');
  });
  assert.deepEqual(it.targets.map((t) => t.raw), ['b7']); // b5% needs a cost, b7 kept
  assert.equal(warns.length, 1);
  assert.match(warns[0], /b5%.*sh601398.*cost/);
});

test('parseTicker: absolute target works on a watch-only ticker (buy while waiting)', () => {
  const it = parseTicker('sh601398,ICBC,0,b7,b6');
  assert.deepEqual(it.targets.map((t) => t.raw), ['b7', 'b6']);
});

test('parseTicker: non-numeric target is dropped with a warning', () => {
  let it;
  const warns = captureWarnings(() => {
    it = parseTicker('sh510300,H300,8600@4.715,sabc,s5.067');
  });
  assert.deepEqual(it.targets.map((t) => t.raw), ['s5.067']);
  assert.equal(warns.length, 1);
});

test('parseArgs: collects tickers and option flags', () => {
  const { items, opts } = parseArgs([
    '--ticker=sh510300,H300,8600@4.715,s5.067',
    '--ticker=sh601398,ICBC,0,b7',
    '--full',
    '--source=sina,tencent',
  ]);
  assert.equal(items.length, 2);
  assert.equal(opts.full, true);
  assert.deepEqual(opts.source, ['sina', 'tencent']);
});
