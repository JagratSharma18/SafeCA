#!/usr/bin/env node

/**
 * Safe CA - Icon Generator
 * Generates PNG icons from SVG for the extension
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const ICONS_DIR = join(ROOT_DIR, 'icons');

const SIZES = [16, 32, 48, 128];

async function generateIcons() {
  console.log('🎨 Generating icons...\n');

  // Ensure icons directory exists
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Check if SVG exists
  const svgPath = join(ICONS_DIR, 'icon.svg');
  if (!existsSync(svgPath)) {
    console.log('📝 Creating default SVG icon...');
    createDefaultSvg(svgPath);
  }

  const svgBuffer = readFileSync(svgPath);

  try {
    for (const size of SIZES) {
      const outputPath = join(ICONS_DIR, `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`   ✓ icon${size}.png`);
    }

    console.log('\n✅ Icons generated successfully!');
  } catch (error) {
    console.error('❌ Icon generation failed:', error.message);
    console.log('\n💡 Creating placeholder PNG icons instead...');
    
    // Create simple placeholder PNGs
    for (const size of SIZES) {
      await createPlaceholderPng(size);
    }
  }
}

function createDefaultSvg(path) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
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
  
  <!-- Shield background -->
  <path d="M64 8 L112 24 L112 56 C112 88 88 112 64 120 C40 112 16 88 16 56 L16 24 Z" 
        fill="url(#shieldGradient)" 
        stroke="#1e40af" 
        stroke-width="2"/>
  
  <!-- Inner shield highlight -->
  <path d="M64 16 L104 30 L104 56 C104 84 84 104 64 112 C44 104 24 84 24 56 L24 30 Z" 
        fill="none" 
        stroke="rgba(255,255,255,0.3)" 
        stroke-width="1"/>
  
  <!-- Checkmark -->
  <path d="M42 64 L56 78 L86 48" 
        fill="none" 
        stroke="url(#checkGradient)" 
        stroke-width="8" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
</svg>`;

  writeFileSync(path, svg);
}

async function createPlaceholderPng(size) {
  const outputPath = join(ICONS_DIR, `icon${size}.png`);
  
  // Create a simple colored square as placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
          fill="white" font-family="Arial" font-weight="bold" font-size="${size * 0.4}">CA</text>
  </svg>`;

  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    console.log(`   ✓ icon${size}.png (placeholder)`);
  } catch (e) {
    // If sharp fails, create a minimal valid PNG
    console.log(`   ⚠ icon${size}.png (minimal placeholder)`);
    // Write a minimal 1x1 transparent PNG and resize concept
    // For now, just note it needs manual creation
  }
}

generateIcons();
