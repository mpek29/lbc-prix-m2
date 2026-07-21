/**
 * Renders the extension icon at every size a store or browser asks for.
 *
 * The mark is drawn from primitives rather than exported from a design tool, so
 * the icon set has a single source of truth that reviews as a diff, and the
 * repository needs no image toolchain to rebuild it. `node:zlib` is the only
 * dependency, which is to say there is none.
 *
 *   npm run icons
 *
 * The generated PNGs are committed: a fresh clone should be able to build a
 * shippable extension without running this first.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

/** Sizes Chrome, Firefox and both stores between them ask for. */
const SIZES = [16, 32, 48, 96, 128];

/** Supersampling factor. Four is enough to hide the stairs at 16 px. */
const SAMPLES = 4;

const BRAND = [0xff, 0x6e, 0x14];
const INK = [0xff, 0xff, 0xff];

/** Geometry, as fractions of the canvas — the mark scales, the numbers do not. */
const SHAPE = {
  cornerRadius: 0.22,
  square: { from: 0.2, to: 0.64, stroke: 0.085 },
  exponent: { from: 0.68, to: 0.84, top: 0.18 },
};

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'public', 'icon');

// ── The mark ─────────────────────────────────────────────────────────────────

/** A square with rounded corners: clamp to the inner rect, then measure. */
function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

const inside = (v, from, to) => v >= from && v <= to;

/**
 * Returns the colour of one sample, or `null` for transparent.
 *
 * The mark is an open square — the "carré" of "mètre carré" — with a small
 * solid square set above its shoulder where an exponent would sit.
 */
function sample(u, v) {
  if (!insideRoundedSquare(u, v, 1, SHAPE.cornerRadius)) return null;

  const { from, to, stroke } = SHAPE.square;
  const onOuter = inside(u, from, to) && inside(v, from, to);
  const onInner = inside(u, from + stroke, to - stroke) && inside(v, from + stroke, to - stroke);
  if (onOuter && !onInner) return INK;

  const e = SHAPE.exponent;
  if (inside(u, e.from, e.to) && inside(v, e.top, e.top + (e.to - e.from))) return INK;

  return BRAND;
}

/** Renders one size, averaging `SAMPLES²` samples per pixel. */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / (size * SAMPLES);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const colour = sample((x * SAMPLES + sx + 0.5) * step, (y * SAMPLES + sy + 0.5) * step);
          // Transparent samples still carry the brand colour so that antialiased
          // edges fade to orange rather than to a grey halo.
          const [cr, cg, cb] = colour ?? BRAND;
          r += cr;
          g += cg;
          b += cb;
          a += colour === null ? 0 : 255;
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(r / total);
      pixels[offset + 1] = Math.round(g / total);
      pixels[offset + 2] = Math.round(b / total);
      pixels[offset + 3] = Math.round(a / total);
    }
  }

  return pixels;
}

// ── PNG container ────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Encodes 8-bit RGBA pixels as a PNG. Filter type 0 on every scanline. */
function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: truecolour with alpha

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Entry point ──────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `${size}.png`);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`wrote ${file}`);
}
