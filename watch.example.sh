#!/usr/bin/env bash
# Example launcher. Copy to watch.sh and fill in YOUR OWN holdings/targets.
#   cp watch.example.sh watch.sh   &&   edit watch.sh
#
# --ticker=CODE,NAME,COST,SHARES[,TARGET...]
#   COST,SHARES = 0,0 -> watch only (no P/L)
#   TARGET: 4.400 (abs) | +10% (pct of cost) | +5%@3.000 (pct of given cost) | suffix s/b = force sell/buy
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node "$SCRIPT_DIR/index.js" \
  --ticker=sh510300,ETF1,4.000,1000,4.400,+10%,3.600 \
  --ticker=sz159915,ETF2,3.000,1000,+5%@3.000,2.700 \
  --ticker=sh518880,GOLD,0,0 \
  "$@"
