# Stock Monitor

Watch holdings and grid buy/sell signals from the command line. Pulls live
quotes and prints a table: **code / name / price / cost / P&L / P&L% / target / signal**.

> **China A-share market only.** Codes, quote sources and signals all target the
> mainland China stock/ETF market (Shanghai / Shenzhen). Other markets are not supported.

No config file — everything is passed as CLI arguments. Quote sources: Tencent +
Sina, with automatic failover if one is unavailable. No third-party dependencies.

## Run

```bash
cp watch.example.sh watch.sh  # first time: copy the example, fill in your own holdings
bash watch.sh                 # run your list (watch.sh is git-ignored, never published)
node index.js --ticker=...    # or pass tickers directly
node index.js ... --full      # full table (default is a simple P&L% view)
node index.js ... --json      # JSON output
node index.js ... --source=sina,tencent   # source priority
```

## Argument format

```
--ticker=CODE,NAME,SHARES@COST[,TARGET...]
```

- `CODE` carries a market prefix: Shanghai `sh` / Shenzhen `sz` (e.g. `sh510300`, `sz159915`).
- `SHARES@COST` is the holding as **one field**, e.g. `8600@4.715` (8600 shares bought at
  4.715) — kept together so it stays visually distinct from the target numbers. Use `0`
  (or `0@0`) for watch only (no P&L).
- Fields may be separated by commas and/or spaces (any run). Pad with spaces to align
  columns — quote the whole `--ticker=` so the shell keeps the spaces:
  `"sh510300, H300, 8600@4.715,  5.067, 5.376, +20%,  4.430, 3.940"`
- Same ticker may be declared multiple times — one `--ticker=` per buy lot, each with
  its own cost and targets. Percent targets are always relative to that lot's cost.
- **Every target must carry a prefix** (`s` / `b` / `sl` / `bu`), so each one states its
  intent explicitly — there are no bare "watch, no-action" levels. The level itself is a
  percent of cost or an absolute price.

The four prefixes are the four quadrants of "price crosses a level → act", where `up`
fires when price rises to/above the level and `down` when it falls to/below:

| Prefix | Signal | Triggers when… | Example (cost 3.326) |
|--------|--------|----------------|----------------------|
| `s…`   | SELL (take-profit) | price rises `≥` level | `s5%` → sell at `3.492`; `s3.640` → sell at `3.640` |
| `b…`   | BUY (buy the dip)  | price falls `≤` level | `b5%` → buy at `3.160`; `b3.050` → buy at `3.050` |
| `sl…`  | SELL (stop-loss)   | price falls `≤` level | `sl5%` → sell at `3.160`; `sl2.700` → sell at `2.700` |
| `bu…`  | BUY (breakout)     | price rises `≥` level | `bu5%` → buy at `3.492`; `bu4.000` → buy at `4.000` |

A percent sits above cost for an upward trigger (`s`/`bu`) and below cost for a downward
one (`b`/`sl`). When a signal fires, the displayed price is the **current market price**,
not the trigger, so you place the order at the real price. A percent target needs a cost
(`> 0`); an absolute target works even on a `0` watch-only ticker (e.g. `b7` while you
wait to buy in). A target without a prefix is ignored with a warning.

Example (placeholder data — replace with your own):
```bash
node index.js \
  --ticker=sh510300,ETF1,1000@4.000,s10%,sl5%,b3.600 \
  --ticker=sz159915,ETF2,1000@3.000,s5%,b2.700,sl2.500 \
  --ticker=sh601398,ICBC,0,b7,b6
```

## Scheduling

```
*/5 9-15 * * 1-5  cd /path/to/stock-monitor && bash watch.sh --json >> signal.log 2>&1
```

## Files

```
watch.example.sh ← launcher template (copy to watch.sh and add your holdings)
index.js         ← entry point
src/args.js      ← CLI parsing
src/fetch.js     ← Tencent / Sina dual source
src/calc.js      ← P&L + signal logic
src/render.js    ← table / JSON output
```

## Credit

Written by [Claude Code](https://claude.com/claude-code) and [Codex](https://openai.com/codex).
