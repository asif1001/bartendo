/**
 * generate-icons.mjs — zero-dependency PNG launcher-icon generator.
 *
 * Renders the ASIF RGB Controller ring logo into icon-192.png and
 * icon-512.png (PNG-24 with alpha) using pure Node + zlib.
 *
 * Usage: npm run icons
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const STOPS = [
  [244, 63, 94], // rose
  [245, 158, 11], // amber
  [34, 211, 238], // cyan
  [129, 140, 248], // indigo
];

// Blend a hue between colour stops: t in [0,1).
function ringColour(t) {
  const x = t * STOPS.length;
  const i = Math.floor(x) % STOPS.length;
  const next = (i + 1) % STOPS.length;
  const f = x - Math.floor(x);
  const sm = (a, b) => a + (b - a) * f;
  return [sm(STOPS[i][0], STOPS[next][0]), sm(STOPS[i][1], STOPS[next][1]), sm(STOPS[i][2], STOPS[next][2])];
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.44;
  const rInner = size * 0.26;
  const bg = [2, 6, 23]; // #020617

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.hypot(dx, dy);
      const idx = (y * size + x) * 4;

      let r = bg[0];
      let g = bg[1];
      let b = bg[2];

      if (dist >= rInner && dist <= rOuter) {
        // Angle in [0,1) starting top-going clockwise.
        let angle = Math.atan2(dx, -dy) / (2 * Math.PI);
        if (angle < 0) angle += 1;
        const [cr, cg, cb] = ringColour(angle);
        // Anti-aliased edges.
        const edge = Math.min(dist - rInner, rOuter - dist);
        const alpha = Math.max(0, Math.min(1, edge / 1.5));
        r = bg[0] + (cr - bg[0]) * alpha;
        g = bg[1] + (cg - bg[1]) * alpha;
        b = bg[2] + (cb - bg[2]) * alpha;
      }

      buf[idx] = Math.round(r);
      buf[idx + 1] = Math.round(g);
      buf[idx + 2] = Math.round(b);
      buf[idx + 3] = 255;
    }
  }

  // ---- assemble PNG ----
  const ihdr = Buffer.alloc(17);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw scanlines with filter byte 0.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    buf.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const file = resolve(outDir, `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`Wrote ${file}`);
}
