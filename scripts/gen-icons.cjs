/**
 * Generates pastel PNG icons for haku-app.
 * Uses only Node.js built-in modules (zlib) — no npm dependencies.
 *
 * Design: pastel lavender→blush gradient rounded-square + indigo snowflake.
 * Run: node scripts/gen-icons.cjs
 */

const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── CRC32 ────────────────────────────────────────────────────────────────────

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── PNG builder ───────────────────────────────────────────────────────────────

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

/**
 * @param {number} size - square icon size in pixels
 * @param {(nx:number, ny:number) => [number,number,number,number]} drawFn
 *        nx,ny in [0,1], returns [r,g,b,a] each 0-255
 */
function buildPNG(size, drawFn) {
  const stride  = size * 4
  const raw     = Buffer.alloc((1 + stride) * size)

  for (let y = 0; y < size; y++) {
    raw[y * (1 + stride)] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawFn((x + 0.5) / size, (y + 0.5) / size)
      const off = y * (1 + stride) + 1 + x * 4
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 })

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8   // bit depth
  ihdrData[9] = 6   // color type: RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Icon draw function ────────────────────────────────────────────────────────

/**
 * nx, ny in [0,1] (image fraction).
 * Returns RGBA [0-255].
 */
function drawIcon(nx, ny) {
  // Centered coordinates [-0.5, +0.5]
  const fx = nx - 0.5
  const fy = ny - 0.5

  // ── Rounded-rect mask (corner radius ≈ 22%) ──
  const CR  = 0.22          // corner radius as fraction of half-side
  const HS  = 0.5           // half-side
  const flat = HS - CR * HS // straight zone boundary

  const ax = Math.abs(fx)
  const ay = Math.abs(fy)

  let alpha = 255
  if (ax > HS || ay > HS) return [0, 0, 0, 0]

  if (ax > flat && ay > flat) {
    const dx   = ax - flat
    const dy   = ay - flat
    const dist = Math.sqrt(dx * dx + dy * dy)
    const rad  = CR * HS
    if (dist > rad) return [0, 0, 0, 0]
    // 1-px anti-alias
    alpha = dist > rad - 0.004 ? Math.round(255 * (1 - (dist - (rad - 0.004)) / 0.004)) : 255
    alpha = Math.max(0, Math.min(255, alpha))
  }

  // ── Background gradient: lavender (top-left) → blush (bottom-right) ──
  // #EDE4FF → #FFE4EE
  const t  = (nx + ny) * 0.5        // 0 at top-left, 1 at bottom-right
  const bgR = Math.round(237 + (255 - 237) * t)   // 237 → 255
  const bgG = Math.round(228 + (228 - 228) * t)   // 228 (same)
  const bgB = Math.round(255 + (238 - 255) * t)   // 255 → 238

  // ── 6-arm snowflake in indigo #5B5CE6 ──
  const r = Math.sqrt(fx * fx + fy * fy)

  const outerR  = 0.30   // arm tip
  const innerR  = 0.055  // center dot radius
  const armHW   = 0.038  // arm half-width
  const crossR1 = 0.135  // 1st cross position along arm
  const crossR2 = 0.220  // 2nd cross position along arm
  const crossHW = 0.030  // cross line half-width
  const crossHL = 0.068  // cross line half-length

  let isSnow = r < innerR  // center dot

  for (let i = 0; i < 6 && !isSnow; i++) {
    const θ   = (i * Math.PI) / 3
    const cos = Math.cos(θ)
    const sin = Math.sin(θ)

    // Project (fx,fy) onto arm axis
    const along = fx * cos + fy * sin
    const perp  = Math.abs(-fx * sin + fy * cos)

    // Main arm shaft (both directions from center)
    if (Math.abs(along) >= innerR && Math.abs(along) <= outerR && perp < armHW) {
      isSnow = true; break
    }

    // Cross pieces (on both ± sides of arm)
    for (const cp of [crossR1, crossR2]) {
      if ((Math.abs(along - cp) < crossHW || Math.abs(along + cp) < crossHW) && perp < crossHL) {
        isSnow = true; break
      }
    }
  }

  if (isSnow) return [91, 92, 230, alpha]    // indigo #5B5CE6
  return [bgR, bgG, bgB, alpha]
}

// ── Generate files ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'icons')

const targets = [
  { file: 'icon-512.png',          size: 512 },
  { file: 'icon-192.png',          size: 192 },
  { file: 'apple-touch-icon.png',  size: 180 },
]

for (const { file, size } of targets) {
  const png = buildPNG(size, drawIcon)
  fs.writeFileSync(path.join(outDir, file), png)
  console.log(`✓ public/icons/${file}  (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`)
}
