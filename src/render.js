// Output: simple view (default, holdings only) or full table (--full). English only.

function supportsColor() {
  return !process.env.NO_COLOR && process.stdout.isTTY && process.env.TERM !== 'dumb';
}
const ON = supportsColor();
const red = (s) => (ON ? `\x1b[31m${s}\x1b[0m` : s);
const green = (s) => (ON ? `\x1b[32m${s}\x1b[0m` : s);
const dim = (s) => (ON ? `\x1b[2m${s}\x1b[0m` : s);

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
function pad(s, len, align = 'left') {
  const gap = ' '.repeat(Math.max(0, len - stripAnsi(s).length));
  return align === 'right' ? gap + s : s + gap;
}
function bySign(n, text) {
  return n >= 0 ? red(text) : green(text);
}
function num6(code) {
  return code.replace(/^(sh|sz)/, '');
}
function pctStr(p) {
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

// SIGNAL cell (uncolored): shows the CURRENT price (not the trigger) so you act at the
// real price, plus the shares to sell on a SELL.
function signalText(sig, shares, cur) {
  if (!sig) return '-';
  const at = isFinite(cur) ? cur.toFixed(3) : sig.price.toFixed(3);
  const label = sig.side === 'sell' ? 'SELL' : 'BUY';
  const qty = sig.side === 'sell' && shares > 0 ? ` ${shares.toLocaleString('en-US')}` : '';
  return `${label}${qty} @${at}`;
}

// TARGET cell (uncolored): next grid levels -> B(uy) below / S(ell) above
function targetText(r) {
  const parts = [];
  if (r.nextBuy != null) parts.push('B ' + r.nextBuy.toFixed(3));
  if (r.nextSell != null) parts.push('S ' + r.nextSell.toFixed(3));
  return parts.length ? parts.join(' ') : '-';
}

function head(now, sources) {
  return dim(`${now}  src:${sources.join('/') || 'none'}`);
}

// ── simple view: only rows with a fired buy/sell signal, name + P/L% + signal ──
function renderSimple(rows, now, sources) {
  const hits = rows.filter((r) => r.signal);
  if (!hits.length) return ''; // no signals -> print nothing (not even the header)
  const out = [head(now, sources)];
  const nameW = Math.max(...hits.map((r) => r.name.length));
  hits.forEach((r) => {
    const pct = r.pnlPct == null ? '' : bySign(r.pnlPct, pctStr(r.pnlPct)); // blank for watch-only
    out.push(`${pad(r.name, nameW)}  ${pad(pct, 8, 'right')}  ${signalText(r.signal, r.shares, r.cur)}`);
  });
  return out.join('\n');
}

// ── full table ──
function renderRow(r, w) {
  const code = pad(num6(r.code), w.code);
  const name = pad(r.name, w.name);
  if (!isFinite(r.cur)) return `${code} ${name} ${pad(dim('N/A'), w.price, 'right')}`;
  const price = pad(r.cur.toFixed(3), w.price, 'right');
  const cost = pad(r.cost == null ? '' : r.cost.toFixed(3), w.cost, 'right');
  const amt = pad(r.pnlAmt == null ? '' : bySign(r.pnlAmt, (r.pnlAmt >= 0 ? '+' : '') + Math.round(r.pnlAmt).toLocaleString('en-US')), w.amt, 'right');
  const pct = pad(r.pnlPct == null ? '' : bySign(r.pnlPct, pctStr(r.pnlPct)), w.pct, 'right');
  const tgt = pad(targetText(r), w.tgt);
  return `${code} ${name} ${price} ${cost} ${amt} ${pct}  ${tgt}  ${signalText(r.signal, r.shares, r.cur)}`;
}

function renderTable(rows, now, sources) {
  const w = {
    code: 6,
    name: Math.max(4, ...rows.map((r) => r.name.length)),
    price: 8,
    cost: 8,
    amt: 11,
    pct: 9,
    tgt: 16,
  };
  const out = [head(now, sources)];
  out.push(dim(`${pad('CODE', w.code)} ${pad('NAME', w.name)} ${pad('PRICE', w.price, 'right')} ${pad('COST', w.cost, 'right')} ${pad('P/L', w.amt, 'right')} ${pad('P/L%', w.pct, 'right')}  ${pad('TARGET', w.tgt)}  SIGNAL`));
  rows.forEach((r) => out.push(renderRow(r, w)));
  return out.join('\n');
}

// JSON (always full data)
function buildJson(rows, now, sources) {
  return {
    time: now,
    sources,
    items: rows.map((r) => ({
      code: num6(r.code),
      name: r.name,
      cost: r.cost,
      price: r.cur,
      pnlAmount: r.pnlAmt == null ? null : Math.round(r.pnlAmt),
      pnlPct: r.pnlPct == null ? null : Number(r.pnlPct.toFixed(2)),
      nextBuy: r.nextBuy,
      nextSell: r.nextSell,
      signal: r.signal ? { side: r.signal.side, target: r.signal.price, shares: r.signal.side === 'sell' ? r.shares : null } : null,
    })),
  };
}

module.exports = { renderSimple, renderTable, buildJson };
