import { existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const iconSizes = [16, 32, 48, 64, 96, 128, 256, 512];

async function generateIcons() {
  const iconsDir = resolve(rootDir, 'public/icons');
  const svgPath = resolve(iconsDir, 'icon.svg');

  if (!existsSync(svgPath)) {
    console.error(`❌ Source SVG not found at ${svgPath}`);
    process.exit(1);
  }

  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = readFileSync(svgPath);

  for (const size of iconSizes) {
    const filename = `icon-${size}.png`;
    const filepath = resolve(iconsDir, filename);
    await sharp(svgBuffer, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(filepath);
    console.log(`✓ Generated ${filename} (${size}x${size})`);
  }

  console.log('\n✓ All icons generated from public/icons/icon.svg');
}

generateIcons().catch((err) => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
