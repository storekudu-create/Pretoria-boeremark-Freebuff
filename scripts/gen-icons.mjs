// Generates PNG app icons (no native deps) + the SVG icon.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw: dark green background, cream market-awning stripes, rounded corners.
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = size * 0.18;
  const set = (x, y, R, G, B, A = 255) => {
    const i = (y * size + x) * 4;
    rgba[i] = R; rgba[i + 1] = G; rgba[i + 2] = B; rgba[i + 3] = A;
  };
  const inRounded = (x, y) => {
    const nx = Math.min(x, size - 1 - x);
    const ny = Math.min(y, size - 1 - y);
    if (nx >= r || ny >= r) return true;
    const dx = r - nx;
    const dy = r - ny;
    return dx * dx + dy * dy <= r * r;
  };
  const bg = [20, 54, 28];      // deep green
  const cream = [247, 244, 233];
  const green = [46, 125, 50];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) { set(x, y, 0, 0, 0, 0); continue; }
      set(x, y, bg[0], bg[1], bg[2]);
      // awning: top third, alternating stripes with scalloped bottom
      const top = size * 0.22;
      const bottom = size * 0.52;
      if (y >= top && y <= bottom + size * 0.06) {
        const stripe = Math.floor((x / size) * 6) % 2 === 0;
        const scallop = bottom + Math.sin((x / size) * Math.PI * 6) * size * 0.03;
        if (y <= scallop && stripe) set(x, y, cream[0], cream[1], cream[2]);
      }
      // stall counter block at the bottom
      const counterTop = size * 0.62;
      if (y >= counterTop && y <= size * 0.78 && x >= size * 0.2 && x <= size * 0.8) {
        set(x, y, green[0], green[1], green[2]);
      }
      if (y > counterTop && y <= counterTop + size * 0.03) set(x, y, cream[0], cream[1], cream[2]);
    }
  }
  return encodePng(size, rgba);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(outDir, name), drawIcon(size));
  console.log('wrote', name);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="92" fill="#14361c"/>
  <g>
    <path d="M112 112h288l-24 104H136z" fill="#f7f4e9"/>
    <path d="M112 112h48l-16 104h-32zM208 112h48l-4 104h-48zM304 112h48l8 104h-48zM400 112h0l40 0-24 104h-32z" fill="#2e7d32" opacity="0.25"/>
    <rect x="104" y="316" width="304" height="96" rx="14" fill="#2e7d32"/>
    <rect x="104" y="300" width="304" height="26" rx="13" fill="#f7f4e9"/>
  </g>
</svg>
`;
writeFileSync(join(outDir, 'icon.svg'), svg);
console.log('wrote icon.svg');
