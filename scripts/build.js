#!/usr/bin/env node

/**
 * Safe CA - Build Script
 * Bundles the extension for production
 */

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DIST_DIR = join(ROOT_DIR, 'dist');

async function buildExtension() {
  console.log('🛡️ Building Safe CA Extension...\n');

  // Create dist directory
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  // Create subdirectories
  ['src/background', 'src/content', 'src/styles', 'popup', 'icons'].forEach(dir => {
    const fullPath = join(DIST_DIR, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  });

  try {
    // Bundle background service worker
    console.log('📦 Bundling background service worker...');
    await build({
      entryPoints: [join(ROOT_DIR, 'src/background/service-worker.js')],
      bundle: true,
      outfile: join(DIST_DIR, 'src/background/service-worker.js'),
      format: 'esm',
      platform: 'browser',
      target: ['chrome102', 'firefox109'],
      minify: true,
      sourcemap: false,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
      // Note: Keeping console statements for production debugging
      // They will be minimized but not removed
    });

    // Bundle content script
    console.log('📦 Bundling content script...');
    await build({
      entryPoints: [join(ROOT_DIR, 'src/content/content.js')],
      bundle: true,
      outfile: join(DIST_DIR, 'src/content/content.js'),
      format: 'iife',
      platform: 'browser',
      target: ['chrome102', 'firefox109'],
      minify: true,
      sourcemap: false,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
      // Note: Keeping console statements for production debugging
      // They will be minimized but not removed
    });

    // Bundle popup script
    console.log('📦 Bundling popup script...');
    await build({
      entryPoints: [join(ROOT_DIR, 'popup/popup.js')],
      bundle: true,
      outfile: join(DIST_DIR, 'popup/popup.js'),
      format: 'iife',
      platform: 'browser',
      target: ['chrome102', 'firefox109'],
      minify: true,
      sourcemap: false,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
      // Note: Keeping console statements for production debugging
      // They will be minimized but not removed
    });

    // Copy static files
    console.log('📄 Copying static files...');
    
    // Manifest
    copyFileSync(
      join(ROOT_DIR, 'manifest.json'),
      join(DIST_DIR, 'manifest.json')
    );

    // CSS files
    copyFileSync(
      join(ROOT_DIR, 'src/styles/content.css'),
      join(DIST_DIR, 'src/styles/content.css')
    );
    copyFileSync(
      join(ROOT_DIR, 'popup/popup.css'),
      join(DIST_DIR, 'popup/popup.css')
    );

    // HTML
    copyFileSync(
      join(ROOT_DIR, 'popup/popup.html'),
      join(DIST_DIR, 'popup/popup.html')
    );

    // Icons
    const iconsDir = join(ROOT_DIR, 'icons');
    const distIconsDir = join(DIST_DIR, 'icons');
    if (existsSync(iconsDir)) {
      cpSync(iconsDir, distIconsDir, { recursive: true });
    }

    // Update popup.html to use bundled script
    const popupHtml = readFileSync(join(DIST_DIR, 'popup/popup.html'), 'utf-8');
    const updatedPopupHtml = popupHtml.replace(
      'type="module"',
      '' // Remove module type for bundled IIFE
    );
    writeFileSync(join(DIST_DIR, 'popup/popup.html'), updatedPopupHtml);

    console.log('\n✅ Build complete!');
    console.log(`📁 Output: ${DIST_DIR}`);
    
    // Calculate bundle sizes
    const bgSize = getFileSize(join(DIST_DIR, 'src/background/service-worker.js'));
    const contentSize = getFileSize(join(DIST_DIR, 'src/content/content.js'));
    const popupSize = getFileSize(join(DIST_DIR, 'popup/popup.js'));
    
    console.log('\n📊 Bundle sizes:');
    console.log(`   Background: ${bgSize}`);
    console.log(`   Content:    ${contentSize}`);
    console.log(`   Popup:      ${popupSize}`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function getFileSize(filePath) {
  try {
    const stats = readFileSync(filePath);
    const bytes = stats.length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return 'N/A';
  }
}

buildExtension();
