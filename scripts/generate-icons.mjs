/**
 * Generates PWA icon PNGs using only Node.js built-ins (zlib).
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

// ── PNG builder ──────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf  = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePNG(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6   // 8-bit RGBA

  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4)  // filter=0(None) + RGBA
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height)
      row[1 + x*4]     = r
      row[1 + x*4 + 1] = g
      row[1 + x*4 + 2] = b
      row[1 + x*4 + 3] = a
    }
    rows.push(row)
  }
  const compressed = deflateSync(Buffer.concat(rows), { level: 9 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Draw logic ───────────────────────────────────────────────────────────────
function clamp(v, lo = 0, hi = 255) { return Math.round(Math.min(hi, Math.max(lo, v))) }
function lerp(a, b, t) { return clamp(a + (b - a) * Math.min(1, Math.max(0, t))) }

function inRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r)
  const cy = Math.min(Math.max(y, r), h - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function drawHakuIcon(x, y, w, h) {
  const ox = w / 2, oy = h / 2
  const s  = Math.min(w, h)
  const rOuter = s * 0.40
  const rInner = s * 0.22
  const rCorner = s * 0.18

  if (!inRoundedRect(x, y, w, h, rCorner)) return [0, 0, 0, 0]

  const dist = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2)

  if (dist < rInner) {
    // Center: powder-blue → bright white at centre
    const t = dist / rInner
    return [
      lerp(0xFF, 0xA8, t),
      lerp(0xFF, 0xC8, t),
      lerp(0xFF, 0xE8, t),
      255,
    ]
  }

  if (dist < rOuter) {
    // Ring: indigo
    const t = (dist - rInner) / (rOuter - rInner)
    return [
      lerp(0x5B, 0x28, t),
      lerp(0x5C, 0x20, t),
      lerp(0xE6, 0x50, t),
      255,
    ]
  }

  // Background glow falloff
  const gMax = s * 0.09
  const g = dist - rOuter
  if (g < gMax) {
    const t = 1 - g / gMax
    return [
      lerp(0x1C, 0x5B, t * 0.28),
      lerp(0x1A, 0x5C, t * 0.28),
      lerp(0x2E, 0xE6, t * 0.28),
      255,
    ]
  }

  // Base background
  return [0x1C, 0x1A, 0x2E, 255]
}

// ── Generate ─────────────────────────────────────────────────────────────────
mkdirSync('public/icons', { recursive: true })

for (const [name, w, h] of [
  ['apple-touch-icon.png', 180, 180],
  ['icon-192.png',         192, 192],
  ['icon-512.png',         512, 512],
]) {
  const buf = makePNG(w, h, drawHakuIcon)
  writeFileSync(`public/icons/${name}`, buf)
  console.log(`✓ public/icons/${name}  (${w}×${h}, ${(buf.length/1024).toFixed(1)} KB)`)
}
