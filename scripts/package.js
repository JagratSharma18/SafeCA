#!/usr/bin/env node

/**
 * Safe CA - Package Script
 * Creates ZIP files for Chrome Web Store and Firefox Add-ons submission
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const BUILD_DIR = join(ROOT_DIR, 'build');

async function packageExtension() {
  console.log('📦 Packaging Safe CA Extension...\n');

  // Ensure dist exists
  if (!existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Run build first.');
    process.exit(1);
  }

  // Create build directory
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }

  const manifest = JSON.parse(readFileSync(join(DIST_DIR, 'manifest.json'), 'utf-8'));
  const version = manifest.version;

  try {
    // Package for Chrome
    console.log('🌐 Creating Chrome package...');
    await createZip(
      DIST_DIR,
      join(BUILD_DIR, `safe-ca-chrome-v${version}.zip`),
      'chrome'
    );

    // Package for Firefox (modify manifest)
    console.log('🦊 Creating Firefox package...');
    await createFirefoxPackage(version);

    console.log('\n✅ Packaging complete!');
    console.log(`📁 Output: ${BUILD_DIR}`);
    console.log(`\nFiles created:`);
    console.log(`   - safe-ca-chrome-v${version}.zip`);
    console.log(`   - safe-ca-firefox-v${version}.zip`);

    // Print submission checklist
    console.log('\n📋 Chrome Web Store Submission Checklist:');
    console.log('   1. Create developer account at https://chrome.google.com/webstore/devconsole');
    console.log('   2. Pay one-time $5 registration fee');
    console.log('   3. Upload safe-ca-chrome-v' + version + '.zip');
    console.log('   4. Fill in store listing (description, screenshots, icons)');
    console.log('   5. Submit for review');

    console.log('\n📋 Firefox Add-ons Submission Checklist:');
    console.log('   1. Create developer account at https://addons.mozilla.org/developers/');
    console.log('   2. Upload safe-ca-firefox-v' + version + '.zip');
    console.log('   3. Fill in listing details');
    console.log('   4. Submit for review');

  } catch (error) {
    console.error('❌ Packaging failed:', error);
    process.exit(1);
  }
}

function createZip(sourceDir, outputPath, browser) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = (archive.pointer() / 1024).toFixed(2);
      console.log(`   ✓ ${browser}: ${size} KB`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add all files from dist
    addDirectoryToArchive(archive, sourceDir, '');

    archive.finalize();
  });
}

function addDirectoryToArchive(archive, dir, prefix) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const archivePath = prefix ? `${prefix}/${item}` : item;
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      addDirectoryToArchive(archive, fullPath, archivePath);
    } else {
      archive.file(fullPath, { name: archivePath });
    }
  }
}

async function createFirefoxPackage(version) {
  // Read Chrome manifest
  const manifest = JSON.parse(readFileSync(join(DIST_DIR, 'manifest.json'), 'utf-8'));
  
  // Modify for Firefox compatibility
  const firefoxManifest = { ...manifest };
  
  // Firefox uses browser_specific_settings instead of minimum_chrome_version
  delete firefoxManifest.minimum_chrome_version;
  
  // Ensure browser_specific_settings is present
  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: 'safeca@safeca.app',
      strict_min_version: '109.0'
    }
  };

  // Write Firefox manifest temporarily
  const firefoxDistDir = join(ROOT_DIR, 'dist-firefox');
  if (!existsSync(firefoxDistDir)) {
    mkdirSync(firefoxDistDir, { recursive: true });
  }

  // Copy all files
  copyDirectory(DIST_DIR, firefoxDistDir);

  // Write modified manifest
  writeFileSync(
    join(firefoxDistDir, 'manifest.json'),
    JSON.stringify(firefoxManifest, null, 2)
  );

  // Create Firefox zip
  await createZip(
    firefoxDistDir,
    join(BUILD_DIR, `safe-ca-firefox-v${version}.zip`),
    'firefox'
  );

  // Clean up
  rmDirectory(firefoxDistDir);
}

function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const items = readdirSync(src);
  for (const item of items) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      const content = readFileSync(srcPath);
      writeFileSync(destPath, content);
    }
  }
}

function rmDirectory(dir) {
  if (!existsSync(dir)) return;

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      rmDirectory(fullPath);
    } else {
      unlinkSync(fullPath);
    }
  }

  rmdirSync(dir);
}

packageExtension();
