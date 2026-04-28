const zlib = require('node:zlib')
const fs = require('node:fs')

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? (0xedb88320 ^ (n >>> 1)) : (n >>> 1)
  return n >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  return Buffer.concat([u32(d.length), t, d, u32(crc32(Buffer.concat([t, d])))])
}

function makePNG(size, pixels) {
  // pixels: Uint8Array of size*size*4 (RGBA)
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = 1 + x * 4
      row[dst] = pixels[src]
      row[dst + 1] = pixels[src + 1]
      row[dst + 2] = pixels[src + 2]
      row[dst + 3] = pixels[src + 3]
    }
    rows.push(row)
  }
  const raw = Buffer.concat(rows)
  const idat = zlib.deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4

      if (dist > r) {
        // Transparent outside circle
        pixels[i + 3] = 0
        continue
      }

      // Background gradient: #0D0D1A (dark) + subtle violet glow in center
      const t = 1 - dist / r
      const bgR = Math.round(13 + t * 30)
      const bgG = Math.round(13 + t * 10)
      const bgB = Math.round(26 + t * 50)

      pixels[i] = bgR
      pixels[i + 1] = bgG
      pixels[i + 2] = bgB
      pixels[i + 3] = 255

      // Draw "N" letter in the center (roughly)
      const lx = dx / r  // -1 to 1
      const ly = dy / r  // -1 to 1
      const thick = 0.12
      const margin = 0.55

      // Left vertical bar of N
      if (lx > -margin && lx < -margin + thick && ly > -margin && ly < margin) {
        pixels[i] = 236; pixels[i + 1] = 72; pixels[i + 2] = 153
        continue
      }
      // Right vertical bar of N
      if (lx > margin - thick && lx < margin && ly > -margin && ly < margin) {
        pixels[i] = 236; pixels[i + 1] = 72; pixels[i + 2] = 153
        continue
      }
      // Diagonal of N
      const diagT = (ly - (-margin)) / (margin - (-margin))  // 0 to 1
      const diagX = -margin + diagT * (margin * 2 - thick)
      if (lx > diagX && lx < diagX + thick * 1.5 && ly > -margin && ly < margin) {
        pixels[i] = 124; pixels[i + 1] = 58; pixels[i + 2] = 237
        continue
      }
    }
  }

  return pixels
}

const sizes = [
  { size: 180, file: 'public/apple-touch-icon.png' },
  { size: 192, file: 'public/pwa-192.png' },
  { size: 512, file: 'public/pwa-512.png' },
]

for (const { size, file } of sizes) {
  const pixels = drawIcon(size)
  const png = makePNG(size, pixels)
  fs.writeFileSync(file, png)
  console.log(`✓ ${file} (${size}x${size})`)
}

console.log('Icons generated!')
