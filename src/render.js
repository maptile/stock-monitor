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

// SIGNAL cell: SELL red / BUY green, with target price
function signalText(sig) {
  if (!sig) return dim('-');
  const body = `${sig.side === 'sell' ? 'SELL' : 'BUY'} @${sig.price.toFixed(3)}`;
  return sig.side === 'sell' ? red(body) : green(body);
}

// TARGET cell: next grid levels -> B(uy) below / S(ell) above
function targetText(r) {
  const parts = [];
  if (r.nextBuy != null) parts.push(green('B ' + r.nextBuy.toFixed(3)));
  if (r.nextSell != null) parts.push(red('S ' + r.nextSell.toFixed(3)));
  return parts.length ? parts.join(' ') : dim('-');
}

function head(now, sources) {
  return dim(`${now}  src:${sources.join('/') || 'none'}`);
}

// ── simple view: holdings only, name + P/L% (+ signal if any) ──
function renderSimple(rows, now, sources) {
  const held = rows.filter((r) => r.pnlPct != null);
  const out = [head(now, sources)];
  if (!held.length) {
    out.push(dim('(no holdings)'));
    return out.join('\n');
  }
  const nameW = Math.max(...held.map((r) => r.name.length));
  held.forEach((r) => {
    const sig = r.signal ? '  ' + signalText(r.signal) : '';
    out.push(`${pad(r.name, nameW)}  ${pad(bySign(r.pnlPct, pctStr(r.pnlPct)), 8, 'right')}${sig}`);
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
  return `${code} ${name} ${price} ${cost} ${amt} ${pct}  ${tgt}  ${signalText(r.signal)}`;
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
      signal: r.signal ? { side: r.signal.side, target: r.signal.price, note: r.signal.note } : null,
    })),
  };
}

module.exports = { renderSimple, renderTable, buildJson };
