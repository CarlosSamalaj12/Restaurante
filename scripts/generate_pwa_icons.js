// scripts/generate_pwa_icons.js
// Generador autónomo de iconos PNG PWA (192x192, 512x512, 180x180) usando zlib estándar de Node.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Función simple para calcular CRC32 requerido por PNG chunks
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Dibujamos un icono moderno de POS/restaurante profesional (cubo/hexágono en gradiente cyan/azul con cubiertos/disco)
function drawPosIcon(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  // Fondo con esquinas redondeadas
  const cornerR = size * 0.22;
  const left = size * 0.04;
  const right = size * 0.96;
  const top = size * 0.04;
  const bottom = size * 0.96;

  // Distancia del borde redondeado
  let inBackground = false;
  if (x >= left && x <= right && y >= top && y <= bottom) {
    const dx = x < left + cornerR ? (left + cornerR - x) : (x > right - cornerR ? (x - (right - cornerR)) : 0);
    const dy = y < top + cornerR ? (top + cornerR - y) : (y > bottom - cornerR ? (y - (bottom - cornerR)) : 0);
    if (dx * dx + dy * dy <= cornerR * cornerR) {
      inBackground = true;
    }
  }

  if (!inBackground) {
    return [0, 0, 0, 0]; // Transparente exterior
  }

  // Gradiente vibrante de fondo: Sky-500 (#0ea5e9) a Indigo-600 (#4f46e5)
  const normY = y / size;
  const bgR = Math.round(14 * (1 - normY) + 79 * normY);
  const bgG = Math.round(165 * (1 - normY) + 70 * normY);
  const bgB = Math.round(233 * (1 - normY) + 229 * normY);

  // Distancia al centro
  const distCenter = Math.hypot(x - cx, y - cy);

  // Dibujar emblema central hexagonal / símbolo geométrico
  const relX = (x - cx) / radius;
  const relY = (y - cy) / radius;

  // Hexágono blanco central
  const absRelX = Math.abs(relX);
  const inHex = (absRelX <= 0.75) && (Math.abs(relY) + absRelX * 0.5 <= 0.75);

  if (inHex) {
    // Si está en el círculo interior central, volvemos a poner el gradiente
    if (distCenter <= size * 0.12) {
      return [bgR, bgG, bgB, 255];
    }
    // Pequeño borde estilizado
    return [255, 255, 255, 255];
  }

  // Sutil borde blanco perimetral
  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, '..', 'react-app', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 }
];

for (const s of sizes) {
  const pngBuf = createPng(s.size, s.size, (x, y) => drawPosIcon(x, y, s.size));
  const outPath = path.join(iconsDir, s.name);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`[OK] Generado: ${outPath} (${pngBuf.length} bytes)`);
}

// También copiar apple-touch-icon.png a la raíz de public para compatibilidad estándar
fs.copyFileSync(
  path.join(iconsDir, 'apple-touch-icon.png'),
  path.join(__dirname, '..', 'react-app', 'public', 'apple-touch-icon.png')
);
console.log('[OK] Iconos PWA listos');
