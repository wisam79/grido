import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(__dirname, '../src/assets/fonts');
const fontsCssPath = path.join(__dirname, '../src/offline-fonts.css');
const licenseRevision = '86aced91de05cd4f96a06838124cca45be337b2b';
const modernUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// A WOFF2-capable, pre-variable-font client asks Google for actual static instances.
// Keep the newly bundled Latin families at 400/700, not a silently truncated variable range.
const staticUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36';

const fonts = [
  { family: 'Readex Pro', weights: [400, 700] },
  { family: 'Cairo', weights: [400, 700] },
  { family: 'Tajawal', weights: [400, 700] },
  { family: 'IBM Plex Sans Arabic', weights: [400, 500, 600, 700], license: 'ibmplexsansarabic' },
  { family: 'Almarai', weights: [400, 700] },
  { family: 'Alexandria', weights: [400, 700] },
  { family: 'Changa', weights: [400, 700] },
  { family: 'El Messiri', weights: [400, 700] },
  { family: 'Amiri', weights: [400, 700] },
  { family: 'Lemonada', weights: [400, 700] },
  { family: 'Noto Naskh Arabic', weights: [400, 700] },
  { family: 'Reem Kufi', weights: [400, 700] },
  { family: 'Rubik', weights: [400, 700] },
  { family: 'Inter', weights: [400, 700], static: true, license: 'inter' },
  { family: 'Outfit', weights: [400, 700], static: true, license: 'outfit' },
  { family: 'Montserrat', weights: [400, 700], static: true, license: 'montserrat' },
  { family: 'Playfair Display', weights: [400, 700], static: true, license: 'playfairdisplay' },
];

function fetchUrl(url, headers = {}, redirects = 0) {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    target.username ||
    target.password ||
    target.port ||
    !['fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com'].includes(
      target.hostname,
    )
  ) {
    return Promise.reject(new Error(`Unexpected font download URL: ${url}`));
  }
  return new Promise((resolve, reject) => {
    const request = https.get(target, { headers }, (res) => {
      res.on('error', reject);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 5) return reject(new Error(`Too many redirects: ${url}`));
        fetchUrl(new URL(res.headers.location, target).href, headers, redirects + 1).then(
          resolve,
          reject,
        );
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) {
          res.destroy(new Error(`Font response exceeds 8 MiB: ${url}`));
        } else {
          chunks.push(chunk);
        }
      });
      res.on('end', () => {
        if (!res.complete) return reject(new Error(`Incomplete HTTP response: ${url}`));
        resolve(Buffer.concat(chunks));
      });
    });
    request.setTimeout(30_000, () => request.destroy(new Error(`Download timeout: ${url}`)));
    request.on('error', reject);
  });
}

async function downloadToScratch(scratchDir, url, headers) {
  // Every response is untrusted data in its own new directory, never next to scripts.
  const requestDir = fs.mkdtempSync(path.join(scratchDir, 'response-'));
  const data = await fetchUrl(url, headers);
  const file = path.join(requestDir, 'payload.download');
  fs.writeFileSync(file, data, { flag: 'wx' });
  return { file, data };
}

function assertWoff2(data, label) {
  if (
    data.length < 48 ||
    data.toString('ascii', 0, 4) !== 'wOF2' ||
    data.readUInt32BE(8) !== data.length ||
    data.readUInt16BE(12) === 0 ||
    data.readUInt16BE(14) !== 0 ||
    data.readUInt32BE(16) < 12 ||
    data.readUInt32BE(20) === 0 ||
    data.readUInt32BE(20) > data.length - 48
  ) {
    throw new Error(`Invalid or truncated WOFF2: ${label}`);
  }
}

function assertLicense(data, label) {
  const text = data.toString('utf8');
  if (!text.includes('SIL OPEN FONT LICENSE Version 1.1') || !text.includes('Copyright')) {
    throw new Error(`Invalid OFL license: ${label}`);
  }
}

function parseFontFaces(cssText, font) {
  const blocks = [
    ...cssText.matchAll(/\/\*\s*([a-zA-Z0-9_-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g),
  ];
  if (!blocks.length || blocks.length !== (cssText.match(/@font-face\b/g) || []).length) {
    throw new Error(`Missing or unrecognized font-face blocks for ${font.family}`);
  }
  const filenames = new Set();
  const faces = blocks.map(([, subset, block]) => {
    const family = block.match(/font-family:\s*['"]([^'"]+)['"]\s*;/)?.[1];
    const weight = block.match(/font-weight:\s*([^;]+);/)?.[1].trim();
    const style = block.match(/font-style:\s*([^;]+);/)?.[1].trim();
    const url = block.match(
      /src:\s*url\((https:\/\/fonts\.gstatic\.com\/s\/[^)\s]+\.woff2)\)/,
    )?.[1];
    const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1].trim();
    if (
      family !== font.family ||
      style !== 'normal' ||
      !/^\d+$/.test(weight || '') ||
      !font.weights.includes(Number(weight)) ||
      !url ||
      !/^U\+[0-9A-F]{1,6}(?:-[0-9A-F]{1,6})?(?:,\s*U\+[0-9A-F]{1,6}(?:-[0-9A-F]{1,6})?)*$/i.test(
        unicodeRange || '',
      )
    ) {
      throw new Error(`Unexpected font face for ${font.family}: ${style} / ${weight} / ${subset}`);
    }
    const filename = `${font.family.replaceAll(' ', '_')}_${weight}_${subset}.woff2`;
    if (filenames.has(filename)) throw new Error(`Duplicate font face: ${filename}`);
    filenames.add(filename);
    return { family, weight: Number(weight), style, url, unicodeRange, subset, filename };
  });
  const subsets = [...new Set(faces.map((face) => face.subset))];
  for (const weight of font.weights) {
    if (
      !faces.some((face) => face.weight === weight && face.subset === 'latin') ||
      subsets.some(
        (subset) => !faces.some((face) => face.weight === weight && face.subset === subset),
      )
    ) {
      throw new Error(`Incomplete stylesheet for ${font.family} weight ${weight}`);
    }
  }
  return faces;
}

function renderFontFace(face) {
  return `@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: url('./assets/fonts/${face.filename}') format('woff2');
  unicode-range: ${face.unicodeRange};
}`;
}

async function downloadFonts() {
  // Optional family arguments update only those families and never drop other CSS rules:
  // node frontend/scripts/download-fonts.js "Inter" "IBM Plex Sans Arabic"
  const requested = process.argv.slice(2);
  if (requested.some((family) => !fonts.some((font) => font.family === family))) {
    throw new Error(
      `Unknown font family. Available: ${fonts.map((font) => font.family).join(', ')}`,
    );
  }
  const selected = requested.length
    ? fonts.filter((font) => requested.includes(font.family))
    : fonts;
  const originalCss = fs.existsSync(fontsCssPath) ? fs.readFileSync(fontsCssPath, 'utf8') : '';
  const existingFaces = new Map();
  for (const [block] of originalCss.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    const filename = block.match(
      /url\(['"]?\.\/assets\/fonts\/([a-zA-Z0-9_-]+\.woff2)['"]?\)/,
    )?.[1];
    if (filename) existingFaces.set(filename, block);
  }
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grido-font-downloads-'));
  const pendingFiles = new Map();
  const addedRules = [];
  let cssTemp;
  try {
    for (const font of selected) {
      const formatted = font.family.replaceAll(' ', '+');
      const cssUrl = `https://fonts.googleapis.com/css2?family=${formatted}:wght@${font.weights.join(';')}&display=swap`;
      const response = await downloadToScratch(scratchDir, cssUrl, {
        'User-Agent': font.static ? staticUserAgent : modernUserAgent,
      });
      const faces = parseFontFaces(response.data.toString('utf8'), font);
      if (font.license) {
        const filename = `${font.family.replaceAll(' ', '_')}-OFL.txt`;
        const target = path.join(fontDir, filename);
        if (fs.existsSync(target)) {
          assertLicense(fs.readFileSync(target), filename);
        } else {
          const url = `https://raw.githubusercontent.com/google/fonts/${licenseRevision}/ofl/${font.license}/OFL.txt`;
          const license = await downloadToScratch(scratchDir, url);
          assertLicense(license.data, filename);
          pendingFiles.set(filename, license);
        }
      }
      for (const face of faces) {
        const target = path.join(fontDir, face.filename);
        if (fs.existsSync(target)) {
          assertWoff2(fs.readFileSync(target), face.filename);
        } else {
          const asset = await downloadToScratch(scratchDir, face.url);
          assertWoff2(asset.data, face.filename);
          pendingFiles.set(face.filename, asset);
        }
        const existing = existingFaces.get(face.filename);
        if (existing) {
          if (
            existing.match(/font-family:\s*['"]([^'"]+)['"]/)?.[1] !== face.family ||
            existing.match(/font-weight:\s*([^;]+);/)?.[1].trim() !== String(face.weight) ||
            existing.match(/font-style:\s*([^;]+);/)?.[1].trim() !== face.style
          ) {
            throw new Error(`Existing CSS disagrees with ${face.filename}; review it manually`);
          }
          // Keep existing bytes and their matching unicode ranges, even if upstream changes.
        } else {
          addedRules.push(renderFontFace(face));
        }
      }
      console.log(`Validated ${font.family}: ${faces.length} faces (CSS HTTP 200)`);
    }

    const currentCss = fs.existsSync(fontsCssPath) ? fs.readFileSync(fontsCssPath, 'utf8') : '';
    if (currentCss !== originalCss)
      throw new Error('offline-fonts.css changed during download; rerun');

    // No destination writes until EVERY HTTP response, face and asset has passed validation.
    fs.mkdirSync(fontDir, { recursive: true });
    for (const [filename, asset] of pendingFiles) {
      if (!fs.readFileSync(asset.file).equals(asset.data)) {
        throw new Error(`Staged download changed: ${filename}`);
      }
      fs.copyFileSync(asset.file, path.join(fontDir, filename), fs.constants.COPYFILE_EXCL);
    }
    if (addedRules.length) {
      const css = [originalCss.trimEnd(), ...addedRules].filter(Boolean).join('\n\n') + '\n';
      cssTemp = `${fontsCssPath}.${randomUUID()}.tmp`;
      fs.writeFileSync(cssTemp, css, { flag: 'wx' });
      fs.renameSync(cssTemp, fontsCssPath);
    }
    console.log(`Done: ${pendingFiles.size} new files; ${addedRules.length} new font-face rules.`);
  } finally {
    if (cssTemp) fs.rmSync(cssTemp, { force: true });
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

downloadFonts().catch((error) => {
  console.error(`Font download failed; offline-fonts.css was not replaced: ${error.message}`);
  process.exitCode = 1;
});
