const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MODEL_VERSION = '1.7.0';
const URL = `https://staticimgly.com/@imgly/background-removal-data/${MODEL_VERSION}/package.tgz`;
const PUBLIC_MODELS_DIR = path.join(__dirname, '../public/models');
const TAR_FILE = path.join(__dirname, 'package.tgz');

function isFullyExtracted() {
  return fs.existsSync(path.join(PUBLIC_MODELS_DIR, 'resources.json'));
}

process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted. Cleaning up incomplete downloads...');
  if (fs.existsSync(TAR_FILE)) fs.unlinkSync(TAR_FILE);
  if (fs.existsSync(PUBLIC_MODELS_DIR) && !isFullyExtracted()) {
    fs.rmSync(PUBLIC_MODELS_DIR, { recursive: true, force: true });
  }
  process.exit(1);
});

function copyOrtAssets() {
  try {
    const ortSourceDir = path.join(__dirname, '../node_modules/onnxruntime-web/dist');
    const destDirs = [
      path.join(__dirname, '../public/onnxruntime-web'),
      path.join(__dirname, '../public/onnxruntime-web-v2')
    ];

    if (fs.existsSync(ortSourceDir)) {
      console.log('⏳ Copying onnxruntime-web assets to public folders...');
      for (const ortDestDir of destDirs) {
        if (!fs.existsSync(ortDestDir)) {
          fs.mkdirSync(ortDestDir, { recursive: true });
        }

        const filesToCopy = [
          'ort-wasm-simd-threaded.wasm',
          'ort-wasm-simd-threaded.mjs',
          'ort-wasm-simd-threaded.jsep.wasm',
          'ort-wasm-simd-threaded.jsep.mjs',
          'ort-wasm.wasm',
          'ort-wasm.mjs'
        ];

        for (const file of filesToCopy) {
          const srcPath = path.join(ortSourceDir, file);
          const destPath = path.join(ortDestDir, file);
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
      console.log('✅ onnxruntime-web assets copied successfully.');
    }
  } catch (ortErr) {
    console.error('❌ Failed to copy onnxruntime-web assets:', ortErr);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(dest, () => {});
        reject(new Error(`Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function verifyAndDownloadMissingChunks() {
  const resourcesPath = path.join(PUBLIC_MODELS_DIR, 'resources.json');
  if (!fs.existsSync(resourcesPath)) return;

  try {
    const resources = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
    const missingChunks = [];

    for (const key in resources) {
      const entry = resources[key];
      if (entry.chunks) {
        for (const chunk of entry.chunks) {
          const chunkPath = path.join(PUBLIC_MODELS_DIR, chunk.name);
          if (!fs.existsSync(chunkPath)) {
            missingChunks.push(chunk.name);
          }
        }
      }
    }

    if (missingChunks.length > 0) {
      console.log(`⏳ Found ${missingChunks.length} missing chunk files (upstream NPM package bug). Downloading from CDN...`);
      for (const chunkName of missingChunks) {
        const cdnUrl = `https://staticimgly.com/@imgly/background-removal-data/${MODEL_VERSION}/dist/${chunkName}`;
        const destPath = path.join(PUBLIC_MODELS_DIR, chunkName);
        console.log(`  📥 Downloading ${chunkName}...`);
        await downloadFile(cdnUrl, destPath);
      }
      console.log('✅ All missing chunks downloaded successfully.');
    } else {
      console.log('✅ All model chunks verified and present.');
    }
  } catch (err) {
    console.error('❌ Failed to verify or download missing chunks:', err);
  }
}

if (fs.existsSync(PUBLIC_MODELS_DIR) && isFullyExtracted()) {
  console.log('✅ AI Models already exist and are complete. Skipping download.');
  copyOrtAssets();
  verifyAndDownloadMissingChunks().then(() => {
    process.exit(0);
  });
} else {
  // Clean up any incomplete previous download before starting
  if (fs.existsSync(PUBLIC_MODELS_DIR)) {
    fs.rmSync(PUBLIC_MODELS_DIR, { recursive: true, force: true });
  }

  console.log(`⏳ Downloading AI Models from ${URL}...`);

  const file = fs.createWriteStream(TAR_FILE);

  https.get(URL, (response) => {
    if (response.statusCode !== 200) {
      console.error(`❌ Failed to download models: Status Code ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('✅ Download complete. Extracting files...');

      try {
        // Use system tar command to extract
        execSync(`tar -xzf package.tgz`, { cwd: __dirname, stdio: 'inherit' });
        
        const distDir = path.join(__dirname, 'package/dist');
        if (!fs.existsSync(PUBLIC_MODELS_DIR)) {
          fs.mkdirSync(PUBLIC_MODELS_DIR, { recursive: true });
        }

        // Move files
        const files = fs.readdirSync(distDir);
        for (const f of files) {
          fs.renameSync(path.join(distDir, f), path.join(PUBLIC_MODELS_DIR, f));
        }

        console.log('✅ Models extracted to public/models successfully.');
      } catch (err) {
        console.error('❌ Failed to extract models:', err);
      } finally {
        // Cleanup
        if (fs.existsSync(TAR_FILE)) fs.unlinkSync(TAR_FILE);
        if (fs.existsSync(path.join(__dirname, 'package'))) {
          fs.rmSync(path.join(__dirname, 'package'), { recursive: true, force: true });
        }
      }

      copyOrtAssets();
      verifyAndDownloadMissingChunks().then(() => {
        // Done
      });
    });
  }).on('error', (err) => {
    fs.unlinkSync(TAR_FILE);
    console.error('❌ Download error:', err.message);
    process.exit(1);
  });
}
