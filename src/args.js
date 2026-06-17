// Command-line parsing. (China A-share market only.)
// Per item:  --ticker=[*]CODE,NAME,SHARES@COST[,TARGET...]
//   A leading * on the code (e.g. *sh510300) flags the row: when any ticker is starred,
//   the table gains a leading * column marking the flagged row(s).
//   SHARES@COST is the holding as one field, e.g. 8600@4.715 (8600 shares bought at
//   4.715) — kept together so it doesn't blur into the target numbers.
//   "0" (or "0@0", or empty) -> watch only (no P/L).
//   Fields may be separated by commas and/or spaces (any run), so you can pad with
//   spaces to align columns (quote the whole arg so the shell keeps the spaces), e.g.
//     "sh510300, H300, 8600@4.715,  5.067, 5.376, +20%,  4.430, 3.940"
// TARGET tokens (any number), shown in the SIGNAL column when current price hits.
// Every target MUST carry one of four prefixes; each fixes a (side, trigger-direction),
// where up = fires on cur >= level, down = fires on cur <= level:
//   s..   SELL on a rise  (take-profit)        b..   BUY on a fall  (buy the dip)
//   sl..  SELL on a fall  (stop-loss)          bu..  BUY on a rise   (breakout)
// The level is a percent of THIS lot's cost (s/bu above cost, b/sl below) or an absolute
// price: s4.430, b3.940, sl2.700, bu5.067, s5%, b5%, sl5%, bu5%.
// A fired SELL/BUY shows the CURRENT price (not the trigger), to avoid mis-orders.
// Options:  --json  --quiet  --full (-f)  --source=tencent,sina

const PREFIX = { sl: ['sell', 'down'], bu: ['buy', 'up'], s: ['sell', 'up'], b: ['buy', 'down'] };

// Parse one target token into a descriptor; resolved against cost later (see calc.js).
function parseTarget(tok) {
  const raw = tok.trim();
  let body = raw;
  let side, dir; // set together when a prefix fixes the side and trigger direction
  const lower = body.toLowerCase();
  const key = PREFIX[lower.slice(0, 2)] ? lower.slice(0, 2) : PREFIX[lower[0]] ? lower[0] : null;
  if (key) {
    [side, dir] = PREFIX[key];
    body = body.slice(key.length);
  }
  const t = body.endsWith('%')
    ? { kind: 'pct', mag: Math.abs(parseFloat(body)) / 100, side, raw }
    : { kind: 'abs', price: parseFloat(body), side, raw };
  if (dir) t.dir = dir;
  return t;
}

// Drop targets that can't be resolved, warning once on stderr.
function keepTarget(t, code, cost) {
  if (!t.side) {
    console.error(`warn: target "${t.raw}" on ${code} ignored (needs a prefix: s/b/sl/bu)`);
    return false;
  }
  if (t.kind === 'pct') {
    if (!isFinite(t.mag) || !(cost > 0)) {
      console.error(`warn: percent target "${t.raw}" on ${code} ignored (needs a cost > 0)`);
      return false;
    }
    return true;
  }
  if (!isFinite(t.price)) {
    console.error(`warn: target "${t.raw}" on ${code} ignored (not a number)`);
    return false;
  }
  return true;
}

// Holding field "SHARES@COST" (e.g. 8600@4.715); "0" / "0@0" / "" -> watch only.
function parseHolding(field) {
  const [sh, co] = String(field || '').split('@');
  return { shares: parseInt(sh, 10) || 0, cost: parseFloat(co) || 0 };
}

function parseTicker(value) {
  const p = value.split(/[\s,]+/).filter(Boolean); // , and spaces group fields
  const starred = p[0].startsWith('*'); // leading * on the code = watch closely (highlight)
  const code = starred ? p[0].slice(1) : p[0];
  const { shares, cost } = parseHolding(p[2]);
  return {
    code,
    name: p[1] || code,
    cost,
    shares,
    starred,
    targets: p.slice(3).map(parseTarget).filter((t) => keepTarget(t, code, cost)),
  };
}

function parseArgs(argv) {
  const items = [];
  const opts = { json: false, quiet: false, full: false, source: ['tencent', 'sina'] };
  for (const a of argv) {
    if (a.startsWith('--ticker=')) items.push(parseTicker(a.slice(9)));
    else if (a === '--json') opts.json = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--full' || a === '-f') opts.full = true;
    else if (a.startsWith('--source=')) opts.source = a.slice(9).split(',');
  }
  return { items, opts };
}

module.exports = { parseArgs, parseTicker, parseTarget };
