#!/usr/bin/env node

/**
 * Safe CA - Simple Icon Creator
 * Creates PNG icons without external dependencies
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const ICONS_DIR = join(ROOT_DIR, 'icons');

// Minimal valid PNG data (1x1 blue pixel) as base for each size
// In production, use proper icon generation with sharp or similar
const SIZES = [16, 32, 48, 128];

// Create a simple SVG that can be used directly
function createSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <path d="M64 8 L112 24 L112 56 C112 88 88 112 64 120 C40 112 16 88 16 56 L16 24 Z" 
        fill="url(#shieldGradient)" 
        stroke="#1e40af" 
        stroke-width="2"/>
  <path d="M64 16 L104 30 L104 56 C104 84 84 104 64 112 C44 104 24 84 24 56 L24 30 Z" 
        fill="none" 
        stroke="rgba(255,255,255,0.3)" 
        stroke-width="1"/>
  <path d="M42 64 L56 78 L86 48" 
        fill="none" 
        stroke="url(#checkGradient)" 
        stroke-width="8" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
</svg>`;
}

// Minimal PNG header + IHDR + IDAT + IEND for a colored square
// This creates a very basic valid PNG
function createMinimalPng(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type (RGB)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // Create raw image data (filter byte + RGB for each pixel)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter type none
    for (let x = 0; x < size; x++) {
      // Create a gradient effect
      const factor = 1 - (x + y) / (size * 2) * 0.3;
      rawData.push(Math.floor(r * factor));
      rawData.push(Math.floor(g * factor));
      rawData.push(Math.floor(b * factor));
    }
  }
  
  // Compress with zlib (deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = getCrcTable();
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return crc ^ 0xFFFFFFFF;
}

let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }
  return crcTable;
}

async function main() {
  console.log('🎨 Creating icons...\n');

  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Create SVG source
  const svgPath = join(ICONS_DIR, 'icon.svg');
  writeFileSync(svgPath, createSvgIcon(128));
  console.log('   ✓ icon.svg');

  // Create PNG icons
  // Using blue gradient colors (59, 130, 246) -> (139, 92, 246)
  for (const size of SIZES) {
    try {
      const png = createMinimalPng(size, 59, 130, 246);
      writeFileSync(join(ICONS_DIR, `icon${size}.png`), png);
      console.log(`   ✓ icon${size}.png`);
    } catch (e) {
      console.log(`   ⚠ icon${size}.png - ${e.message}`);
    }
  }

  console.log('\n✅ Icons created!');
  console.log('\n💡 Note: For production, use sharp or a design tool to create');
  console.log('   high-quality PNG icons from the SVG source.');
}

main();
