import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Helper to copy folder recursively
function copyDirRecursiveSync(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(src);
  for (const file of files) {
    const srcPath = resolve(src, file);
    const destPath = resolve(dest, file);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursiveSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

async function runBuild() {
  console.log('🚀 Starting RefreshFlow build process...');

  const distPath = resolve(rootDir, 'dist');
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  // 1. Compile programmatic manifest
  console.log('\n📝 Generating manifest.json...');
  try {
    const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
    const manifestConfigTs = readFileSync(resolve(rootDir, 'src/manifest/manifest.config.ts'), 'utf-8');
    
    // Transpile manifest.config.ts on the fly
    const { code } = esbuild.transformSync(manifestConfigTs, {
      loader: 'ts',
      format: 'cjs',
    });
    
    // Execute transpiled code in a module context
    const exportsObj = {};
    const moduleObj = { exports: exportsObj };
    const runConfig = new Function('module', 'exports', code);
    runConfig(moduleObj, exportsObj);
    
    const getManifest = moduleObj.exports.getManifest || exportsObj.getManifest;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (typeof getManifest !== 'function') {
      throw new Error('getManifest is not defined or is not a function in manifest.config.ts');
    }
    
    const manifest = getManifest(packageJson.version, packageJson.description, isDev);
    writeFileSync(resolve(distPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('✓ manifest.json created in dist');
  } catch (err) {
    console.error('❌ Failed to generate manifest:', err);
    process.exit(1);
  }

  // 2. Build UI pages (popup, dashboard, options, offscreen)
  console.log('\n📦 Building UI pages...');
  await build({
    configFile: resolve(rootDir, 'vite.config.ts'),
    build: {
      emptyOutDir: false,
    }
  });

  // 3. Build Background Service Worker
  console.log('\n📦 Building Background Service Worker...');
  await build({
    configFile: false,
    resolve: {
      alias: {
        '@': resolve(rootDir, 'src'),
      },
    },
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/background/index.ts'),
        name: 'background',
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      outDir: 'dist',
    },
  });

  // 4. Build Content Script
  console.log('\n📦 Building Content Script...');
  await build({
    configFile: false,
    resolve: {
      alias: {
        '@': resolve(rootDir, 'src'),
      },
    },
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/content/index.ts'),
        name: 'content',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          extend: true,
        },
      },
      outDir: 'dist',
    },
  });

  // 5. Copy public files (icons, sounds, etc.)
  console.log('\n📂 Copying public assets...');
  const publicDir = resolve(rootDir, 'public');
  if (existsSync(publicDir)) {
    copyDirRecursiveSync(publicDir, distPath);
    console.log('✓ Public assets copied to dist');
  }

  console.log('\n✓ RefreshFlow Build Completed Successfully!');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
