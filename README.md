# Stock Monitor

Watch holdings and grid buy/sell signals from the command line. Pulls live
quotes and prints a table: **code / name / price / cost / P&L / P&L% / target / signal**.

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
--ticker=CODE,NAME,COST,SHARES[,TARGET...]
```

- `CODE` carries a market prefix: Shanghai `sh` / Shenzhen `sz` (e.g. `sh510300`, `sz159915`).
- `COST,SHARES` set to `0,0` → watch only (no P&L).
- Targets (any number; shown in the SIGNAL column when hit; direction is auto: price ≥ cost = sell, price < cost = buy):

| Form                | Meaning                                            |
|---------------------|----------------------------------------------------|
| `4.400`             | absolute price                                     |
| `+5%`               | percent of cost (+ = sell on rise, - = buy on dip) |
| `+5%@3.000`         | percent of a given cost (per lot)                  |
| `4.400s` / `3.600b` | trailing s/b forces sell/buy                       |

Example (placeholder data — replace with your own):
```bash
node index.js \
  --ticker=sh510300,ETF1,4.000,1000,4.400,+10%,3.600 \
  --ticker=sz159915,ETF2,3.000,1000,+5%@3.000,2.700 \
  --ticker=sh518880,GOLD,0,0
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
