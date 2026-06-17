// Compute per-item P/L and buy/sell signal (target price hit).

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

// Resolve a target descriptor (see args.js) into its price, side and direction.
// Every target carries a prefix, so side + dir come straight from it (dir 'up' fires
// when cur >= price, 'down' when cur <= price). A percent level sits above cost for an
// upward trigger and below cost for a downward one. cost > 0 is guaranteed for percents.
function resolveTarget(t, cost) {
  if (t.kind === 'pct') {
    const offset = t.dir === 'up' ? t.mag : -t.mag;
    return { note: '', price: round3(cost * (1 + offset)), dir: t.dir, side: t.side };
  }
  return { note: '', price: t.price, dir: t.dir, side: t.side };
}

// Scan targets: first hit = signal; among the rest pick the nearest pending grid level
// in each direction. Only plain up-sells and down-buys feed the B/S grid columns;
// protective stop-losses (sell-down) and breakout buys (buy-up) are left out.
function targetsOf(item, cur) {
  let hit = null;
  let nextSell = null; // nearest sell price above
  let nextBuy = null; // nearest buy price below
  for (const t of item.targets || []) {
    const r = resolveTarget(t, item.cost);
    const isHit = r.dir === 'up' ? cur >= r.price : cur <= r.price;
    if (isHit) {
      if (!hit) hit = r;
    } else if (r.side === 'sell' && r.dir === 'up') {
      if (nextSell == null || r.price < nextSell) nextSell = r.price;
    } else if (r.side === 'buy' && r.dir === 'down') {
      if (nextBuy == null || r.price > nextBuy) nextBuy = r.price;
    }
  }
  return { hit, nextSell, nextBuy };
}

// Compute a single item
function evalItem(item, q) {
  const cur = q ? q.price : NaN;
  const prevClose = q ? q.prevClose : NaN;
  const held = item.shares > 0 && item.cost > 0 && isFinite(cur);
  const hasDay = isFinite(cur) && isFinite(prevClose) && prevClose > 0;
  const t = isFinite(cur) ? targetsOf(item, cur) : { hit: null, nextSell: null, nextBuy: null };
  return {
    code: item.code,
    name: item.name,
    starred: !!item.starred,
    cost: item.cost > 0 ? item.cost : null,
    shares: item.shares,
    cur,
    dayPct: hasDay ? (cur / prevClose - 1) * 100 : null, // today's change vs prev close
    pnlAmt: held ? item.shares * (cur - item.cost) : null,
    pnlPct: held ? (cur / item.cost - 1) * 100 : null,
    signal: t.hit,
    nextSell: t.nextSell,
    nextBuy: t.nextBuy,
  };
}

// Compute all items
function evalAll(items, prices) {
  return items.map((item) => evalItem(item, prices[item.code]));
}

module.exports = { resolveTarget, targetsOf, evalItem, evalAll };
