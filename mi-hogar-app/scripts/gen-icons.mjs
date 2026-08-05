import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const PRIMARY = [15, 118, 110]
const WHITE = [255, 255, 255]

function crc32(buf) {
  let c, table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x]
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function inRoundedRect(x, y, size) {
  const r = size * 0.22
  const m = size * 0.05
  const x0 = m, y0 = m, x1 = size - m, y1 = size - m
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.max(x0 + r, Math.min(x, x1 - r))
  const cy = Math.max(y0 + r, Math.min(y, y1 - r))
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function inTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const area = Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1))
  const a = Math.abs((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py))
  const b = Math.abs((x2 - px) * (y3 - py) - (x3 - px) * (y2 - py))
  const c = Math.abs((x3 - px) * (y1 - py) - (x1 - px) * (y3 - py))
  return Math.abs(a + b + c - area) < 1
}

function render(size) {
  const pixels = []
  const w = size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = [0, 0, 0, 0]
      if (inRoundedRect(x, y, size)) {
        color = [...PRIMARY, 255]
        const bx = x / size
        const by = y / size
        const inHouse =
          inTriangle(bx * w, by * w, 0.24 * w, 0.52 * w, 0.5 * w, 0.3 * w, 0.76 * w, 0.52 * w) ||
          (bx > 0.28 && bx < 0.72 && by > 0.5 && by < 0.82)
        if (inHouse) color = [...WHITE, 255]
        const inDoor = bx > 0.44 && bx < 0.56 && by > 0.64 && by < 0.82
        if (inDoor) color = [...PRIMARY, 255]
      }
      pixels.push(color)
    }
  }
  return encodePng(size, pixels)
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), render(size))
  console.log(`icon-${size}.png generado`)
}
