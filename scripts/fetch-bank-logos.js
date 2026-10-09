import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import {
  DOMAIN_OVERRIDES,
  SKIP_LOGOS,
  indexInstitutions,
  logoPath,
  resolveBankDomain,
} from '../src/bank-logo.js';

const ROOT = new URL('..', import.meta.url).pathname;
const FDIC_URL = 'https://api.fdic.gov/banks/institutions?filters=ACTIVE:1&fields=NAME,WEBADDR&limit=10000&offset=0&sort_by=NAME&output=json';
const MIN_BYTES = 150;
const GENERIC_HASH_MIN = 5;

function loanBanks() {
  const counts = new Map();
  const dir = join(ROOT, 'data/loans');
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const row of data.loans || []) {
      const bank = data.banks[row[2]];
      if (!bank) continue;
      counts.set(bank, (counts.get(bank) || 0) + 1);
    }
  }
  return counts;
}

async function loadFdic() {
  const cached = '/tmp/fdic.json';
  try {
    const parsed = JSON.parse(readFileSync(cached, 'utf8'));
    if (Array.isArray(parsed?.data) && parsed.data.length > 1000) return parsed.data;
  } catch {
    // refetch below
  }
  const response = await fetch(FDIC_URL);
  if (!response.ok) throw new Error(`FDIC ${response.status}`);
  const parsed = await response.json();
  writeFileSync(cached, JSON.stringify(parsed));
  return parsed.data;
}

function isImage(buf) {
  if (buf.length < 16) return false;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49) return true;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return true;
  return false;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function downloadFavicon(host) {
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'vegas-sba-dashboard/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length < MIN_BYTES || !isImage(buf)) return null;
  return buf;
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dul = Math.abs(estimate - upLeft);
  if (dl <= du && dl <= dul) return left;
  if (du <= dul) return up;
  return upLeft;
}

function hasVisibleInk(buf) {
  if (buf.toString('ascii', 1, 4) !== 'PNG') return true;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let palette = null;
  let transparency = null;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IEND') {
      break;
    }
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || !channels) return true;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    const rowStart = y * stride;
    for (let i = 0; i < stride; i += 1) {
      const value = raw[src];
      src += 1;
      const left = i >= channels ? pixels[rowStart + i - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? pixels[rowStart - stride + i - channels] : 0;
      let next = value;
      if (filter === 1) next = (value + left) & 255;
      else if (filter === 2) next = (value + up) & 255;
      else if (filter === 3) next = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) next = (value + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) return true;
      pixels[rowStart + i] = next;
    }
  }
  for (let i = 0; i < width * height; i += 1) {
    const start = i * channels;
    let red = 255;
    let green = 255;
    let blue = 255;
    let alpha = 255;
    if (colorType === 3) {
      const index = pixels[start];
      red = palette[index * 3];
      green = palette[index * 3 + 1];
      blue = palette[index * 3 + 2];
      if (transparency && index < transparency.length) alpha = transparency[index];
    } else if (colorType === 0) {
      red = green = blue = pixels[start];
    } else if (colorType === 4) {
      red = green = blue = pixels[start];
      alpha = pixels[start + 1];
    } else if (colorType === 2) {
      red = pixels[start];
      green = pixels[start + 1];
      blue = pixels[start + 2];
    } else {
      red = pixels[start];
      green = pixels[start + 1];
      blue = pixels[start + 2];
      alpha = pixels[start + 3];
    }
    if (alpha > 40 && Math.min(red, green, blue) <= 210) return true;
  }
  return false;
}

const dryRun = process.argv.includes('--dry-run');
const counts = loanBanks();
const institutions = await loadFdic();
const byCore = indexInstitutions(institutions);
const resolved = [];
for (const [name, loans] of counts) {
  const host = resolveBankDomain(name, byCore);
  resolved.push({ name, loans, host });
}
const withHost = resolved.filter((row) => row.host);
const loans = [...counts.values()].reduce((sum, n) => sum + n, 0);
const covered = withHost.reduce((sum, row) => sum + row.loans, 0);
console.log(`lenders ${counts.size} loans ${loans}`);
console.log(`matched ${withHost.length} lenders covering ${covered} loans`);
console.log('top unmatched:');
for (const row of resolved.filter((row) => !row.host).sort((a, b) => b.loans - a.loans).slice(0, 25)) {
  console.log(`  ${String(row.loans).padStart(6)} ${row.name}`);
}
console.log('overrides used', Object.keys(DOMAIN_OVERRIDES).filter((name) => counts.has(name)).length, 'skip', SKIP_LOGOS.filter((name) => counts.has(name)).length);

if (dryRun) process.exit(0);

const hosts = [...new Set(withHost.map((row) => row.host))];
mkdirSync(join(ROOT, 'data/logos'), { recursive: true });
console.log(`downloading ${hosts.length} favicons`);
const files = new Map();
let done = 0;
await mapPool(hosts, 12, async (host) => {
  try {
    const buf = await downloadFavicon(host);
    if (buf && hasVisibleInk(buf)) files.set(host, buf);
  } catch {
    // leave unmatched
  }
  done += 1;
  if (done % 100 === 0) console.log(`  ${done}/${hosts.length}`);
});
console.log(`downloaded ${files.size}`);

const byHash = new Map();
for (const [host, buf] of files) {
  const hash = createHash('sha256').update(buf).digest('hex');
  if (!byHash.has(hash)) byHash.set(hash, []);
  byHash.get(hash).push(host);
}
const genericHosts = new Set();
for (const [hash, group] of byHash) {
  if (group.length >= GENERIC_HASH_MIN) {
    for (const host of group) genericHosts.add(host);
    console.log(`generic ${hash.slice(0, 12)} x${group.length}: ${group.slice(0, 6).join(', ')}`);
  }
}

const logos = {};
for (const row of withHost) {
  if (genericHosts.has(row.host) || !files.has(row.host)) continue;
  const path = logoPath(row.host);
  if (!path) continue;
  writeFileSync(join(ROOT, path), files.get(row.host));
  logos[row.name] = path;
}
const ordered = Object.fromEntries(Object.entries(logos).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(ROOT, 'data/bank-logos.json'), `${JSON.stringify(ordered, null, 2)}\n`);
console.log(`wrote ${Object.keys(ordered).length} lender logos`);
