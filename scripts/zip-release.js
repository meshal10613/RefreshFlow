import { createWriteStream, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const distDir = resolve(rootDir, 'dist');
const releaseDir = resolve(rootDir, 'release');

async function main() {
  if (!existsSync(distDir)) {
    console.error('❌ dist/ not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (!existsSync(releaseDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(releaseDir, { recursive: true });
  }

  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
  const outPath = resolve(releaseDir, `refreshflow-v${pkg.version}.zip`);

  const output = createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const sizeKb = (archive.pointer() / 1024).toFixed(1);
    console.log(`✓ Created ${outPath} (${sizeKb} KB)`);
    console.log('  This zip is ready to upload to the Chrome Web Store Developer Dashboard.');
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('⚠', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  // Zip the *contents* of dist/, not the dist folder itself —
  // manifest.json must sit at the root of the archive.
  archive.directory(distDir, false);
  await archive.finalize();
}

main().catch((err) => {
  console.error('❌ zip-release failed:', err);
  process.exit(1);
});
