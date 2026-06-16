#!/usr/bin/env node
// Entry: parse CLI -> fetch quotes (Tencent/Sina auto-failover) -> print table (default) or JSON (--json).
//
// Usage:
//   node index.js --ticker=CODE,NAME,COST,SHARES[,TARGET...] [--ticker=...] [--json] [--source=sina,tencent]
// Example:
//   node index.js --ticker=sh510300,ETF1,4.000,1000,4.400,+10%,3.600 \
//                 --ticker=sz159915,ETF2,3.000,1000,+5%@3.000,2.700 \
//                 --ticker=sh518880,GOLD,0,0

const { parseArgs } = require('./src/args');
const { fetchPrices } = require('./src/fetch');
const { evalAll } = require('./src/calc');
const { renderSimple, renderTable, buildJson } = require('./src/render');

function nowStr() {
  // ISO-like local time, locale-neutral, e.g. "2026-06-16 09:46:57"
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

function usage() {
  console.log('Usage: node index.js --ticker=CODE,NAME,COST,SHARES[,TARGET...] [--ticker=...] [--full] [--json]');
  console.log('  COST,SHARES = 0,0  -> watch only (no P/L)');
  console.log('  TARGET: 4.400 (abs) | +5% (pct of cost) | +5%@3.000 (pct of given cost) | suffix s/b = force sell/buy');
  console.log('  default: simple view (holdings P/L%);  --full: full table');
  console.log('Example: node index.js --ticker=sz159915,ETF,3.000,1000,+5%@3.000,2.700');
}

async function main() {
  const { items, opts } = parseArgs(process.argv.slice(2));
  if (!items.length) {
    usage();
    process.exit(1);
  }
  const codes = [...new Set(items.map((i) => i.code))]; // dedupe: same code may appear in multiple lots
  const { prices, sources } = await fetchPrices(codes, opts.source);
  const rows = evalAll(items, prices);
  const when = nowStr();

  if (opts.json) process.stdout.write(JSON.stringify(buildJson(rows, when, sources), null, 2) + '\n');
  else if (!opts.quiet) {
    const view = opts.full ? renderTable : renderSimple;
    process.stdout.write(view(rows, when, sources) + '\n');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
