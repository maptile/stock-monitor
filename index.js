#!/usr/bin/env node
// Entry: parse CLI -> fetch quotes (Tencent/Sina auto-failover) -> print table (default) or JSON (--json).
// China A-share market only.
//
// Usage:
//   node index.js --ticker=CODE,NAME,SHARES@COST[,TARGET...] [--ticker=...] [--json] [--source=sina,tencent]
// Example:
//   node index.js --ticker=sh510300,ETF1,1000@4.000,s10%,sl5%,b3.600 \
//                 --ticker=sz159915,ETF2,1000@3.000,s5%,b2.700 \
//                 --ticker=sh601398,ICBC,0,b7,b6

const { parseArgs } = require('./src/args');
const { fetchPrices } = require('./src/fetch');
const { evalAll } = require('./src/calc');
const { renderSimple, renderTable, buildJson } = require('./src/render');

function nowStr() {
  // ISO-like local time, locale-neutral, e.g. "2026-06-16 09:46:57"
  return new Date().toLocaleString('sv-SE', { hour12: false });
}

function usage() {
  console.log('Usage: node index.js --ticker=CODE,NAME,SHARES@COST[,TARGET...] [--ticker=...] [--full] [--json]');
  console.log('  China A-share market only.  SHARES@COST e.g. 8600@4.715;  "0" -> watch only (no P/L)');
  console.log('  Fields split on commas and/or spaces (pad with spaces to align).');
  console.log('  TARGET (prefix required; level = % of cost or abs price):');
  console.log('    s.. sell on rise | b.. buy on fall | sl.. stop-loss sell on fall | bu.. breakout buy on rise');
  console.log('  default: simple view (signals only);  --full: full table');
  console.log('Example: node index.js --ticker=sz159915,ETF,1000@3.000,s5%,b2.700,sl2.500');
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
    const out = view(rows, when, sources);
    if (out) process.stdout.write(out + '\n');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
