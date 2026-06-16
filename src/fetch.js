// Quotes: Tencent + Sina dual source, tried in the given order; if one fails to
// return a code, the next source fills it in.
// Plain Node http/https (no proxy). Returns keyed by prefixed code: { 'sh510300': {price, prevClose} }
const https = require('https');
const http = require('http');

// Generic fetch: decode GBK as latin1 (we only read numeric fields, unaffected).
function getRaw(url, headers) {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('request timeout')));
  });
}

// Tencent: v_sh510300="1~name~510300~price~prevClose~..."
async function fromTencent(codes) {
  const body = await getRaw(`https://qt.gtimg.cn/q=${codes.join(',')}`, { Referer: 'https://finance.qq.com' });
  const out = {};
  const re = /v_(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const f = m[2].split('~');
    if (f.length < 5) continue;
    out[m[1]] = { price: parseFloat(f[3]), prevClose: parseFloat(f[4]) };
  }
  return out;
}

// Sina: var hq_str_sh510300="name,open,prevClose,price,high,low,..."
async function fromSina(codes) {
  const body = await getRaw(`http://hq.sinajs.cn?rn=${Date.now()}&list=${codes.join(',')}`, {
    Referer: 'https://finance.sina.com.cn/',
  });
  const out = {};
  const re = /hq_str_(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const f = m[2].split(',');
    if (f.length < 4) continue;
    out[m[1]] = { price: parseFloat(f[3]), prevClose: parseFloat(f[2]) };
  }
  return out;
}

const PROVIDERS = { tencent: fromTencent, sina: fromSina };

// Fetch by priority; any missing code is filled by the next source. Returns { prices, sources }
async function fetchPrices(codes, order = ['tencent', 'sina']) {
  const prices = {};
  const sources = [];
  for (const name of order) {
    const missing = codes.filter((c) => !prices[c] || !isFinite(prices[c].price));
    if (!missing.length) break;
    const fn = PROVIDERS[name];
    if (!fn) continue;
    try {
      const got = await fn(missing);
      let n = 0;
      for (const c of missing) {
        if (got[c] && isFinite(got[c].price) && got[c].price > 0) {
          prices[c] = got[c];
          n++;
        }
      }
      if (n) sources.push(name);
    } catch (e) {
      // fall through to the next source
    }
  }
  return { prices, sources };
}

module.exports = { fetchPrices, fromTencent, fromSina };
