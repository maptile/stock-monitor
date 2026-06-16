// Compute per-item P/L and buy/sell signal (target price hit).

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

// Resolve a target into its price, direction (up=sell / down=buy) and side.
function resolveTarget(t, cost) {
  const base = t.cost != null ? t.cost : cost;
  const price = t.price != null ? t.price : round3(base * (1 + t.pct));
  const dir = t.dir || (t.pct != null ? (t.pct >= 0 ? 'up' : 'down') : price >= base ? 'up' : 'down');
  const side = t.side || (dir === 'up' ? 'sell' : 'buy'); // rose to target = sell, fell to target = buy
  return { note: t.note || '', price, dir, side };
}

// Scan targets: first hit = signal; among the rest pick the nearest pending
// buy/sell price (the next grid level in each direction).
function targetsOf(item, cur) {
  let hit = null;
  let nextSell = null; // nearest sell price above
  let nextBuy = null; // nearest buy price below
  for (const t of item.targets || []) {
    const r = resolveTarget(t, item.cost);
    const isHit = r.dir === 'up' ? cur >= r.price : cur <= r.price;
    if (isHit) {
      if (!hit) hit = r;
    } else if (r.side === 'sell') {
      if (nextSell == null || r.price < nextSell) nextSell = r.price;
    } else if (r.side === 'buy') {
      if (nextBuy == null || r.price > nextBuy) nextBuy = r.price;
    }
  }
  return { hit, nextSell, nextBuy };
}

// Compute a single item
function evalItem(item, q) {
  const cur = q ? q.price : NaN;
  const held = item.shares > 0 && item.cost > 0 && isFinite(cur);
  const t = isFinite(cur) ? targetsOf(item, cur) : { hit: null, nextSell: null, nextBuy: null };
  return {
    code: item.code,
    name: item.name,
    cost: item.cost > 0 ? item.cost : null,
    cur,
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
