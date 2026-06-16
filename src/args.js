// Command-line parsing.
// Per item:  --ticker=CODE,NAME,COST,SHARES[,TARGET...]
//   COST/SHARES = 0 -> watch only (no P/L).
// TARGET tokens (any number), shown in the SIGNAL column when hit;
// direction is auto (price >= cost = sell, price < cost = buy):
//   4.400        absolute price
//   +5%          percent of cost (+ = sell on rise, - = buy on dip)
//   +5%@3.000    percent of a given cost (per lot)
//   4.400s / 3.600b   trailing s/b forces sell/buy
// Options:  --json  --quiet  --source=tencent,sina

function parseTarget(tok) {
  let side;
  const last = tok.slice(-1).toLowerCase();
  if (last === 's' || last === 'b') {
    side = last === 's' ? 'sell' : 'buy';
    tok = tok.slice(0, -1);
  }
  let cost;
  const at = tok.split('@');
  if (at.length === 2) {
    tok = at[0];
    cost = parseFloat(at[1]);
  }
  const t = {};
  if (side) t.side = side;
  if (cost != null) t.cost = cost;
  if (tok.endsWith('%')) t.pct = parseFloat(tok) / 100;
  else t.price = parseFloat(tok);
  return t;
}

function parseTicker(value) {
  const p = value.split(',');
  return {
    code: p[0],
    name: p[1] || p[0],
    cost: parseFloat(p[2]) || 0,
    shares: parseInt(p[3], 10) || 0,
    targets: p.slice(4).filter((s) => s.trim()).map(parseTarget),
  };
}

function parseArgs(argv) {
  const items = [];
  const opts = { json: false, quiet: false, full: false, source: ['tencent', 'sina'] };
  for (const a of argv) {
    if (a.startsWith('--ticker=')) items.push(parseTicker(a.slice(9)));
    else if (a === '--json') opts.json = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--full') opts.full = true;
    else if (a.startsWith('--source=')) opts.source = a.slice(9).split(',');
  }
  return { items, opts };
}

module.exports = { parseArgs, parseTicker, parseTarget };
