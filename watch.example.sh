#!/usr/bin/env bash
# Example launcher. Copy to watch.sh and fill in YOUR OWN holdings/targets.
#   cp watch.example.sh watch.sh   &&   edit watch.sh
#
# China A-share market only.
# --ticker=CODE,NAME,SHARES@COST[,TARGET...]
#   SHARES@COST = the holding in one field, e.g. 8600@4.715;  "0" -> watch only (no P/L)
#   Fields split on commas and/or spaces -> pad with spaces to align columns
#   (quote the whole --ticker= so the shell keeps the spaces).
#   TARGET (prefix required; level = % of cost or an absolute price):
#     s..  sell on a rise (take-profit)   b..  buy on a fall (buy the dip)
#     sl.. sell on a fall (stop-loss)     bu.. buy on a rise (breakout)
#   e.g. s5% / s3.640 / b2.700 / sl2.500 / bu5.067. Fired signal shows the CURRENT price.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# One --ticker per line, no trailing backslashes needed inside the array.
# Add/remove/comment lines freely. Quote elements that use spaces (for alignment).
TICKERS=(
  '--ticker=sh510300, ETF1, 1000@4.000,  s10%, sl5%, b3.600'
  '--ticker=sz159915, ETF2, 1000@3.000,  s5%, b2.700, sl2.500'
  '--ticker=sh601398, ICBC, 0,           b7, b6'
)

node "$SCRIPT_DIR/index.js" "${TICKERS[@]}" "$@"
