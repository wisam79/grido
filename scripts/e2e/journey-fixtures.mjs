import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

// Test inputs only. No production renderer, filter, scanner, or export algorithm is imported.
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

export function encodeFixturePng(width, height, pixel, dpi = 300) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 4_000_000) {
    throw new Error('Fixture dimensions must be positive and bounded');
  }
  const rows = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgba = pixel(x, y);
      for (let c = 0; c < 4; c++) rows[y * (1 + width * 4) + 1 + x * 4 + c] = rgba[c];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const density = Buffer.alloc(9);
  density.writeUInt32BE(Math.round(dpi / 0.0254), 0);
  density.writeUInt32BE(Math.round(dpi / 0.0254), 4);
  density[8] = 1;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('pHYs', density), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function generateJourneyFixtures(directory) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true });
  const files = {
    'journey-landscape.png': encodeFixturePng(1200, 800, (x, y) => {
      if (x < 30 || y < 30 || x >= 1170 || y >= 770) return [12, 18, 35, 255];
      if (x < 600 && y < 400) return [231, 40, 46, 255];
      if (x >= 600 && y < 400) return [25, 180, 87, 255];
      if (x < 600) return [30, 85, 220, 255];
      return [250, 210, 32, 255];
    }),
    'journey-portrait.png': encodeFixturePng(800, 1200, (x, y) => {
      if ((x - 400) ** 2 / 220 ** 2 + (y - 420) ** 2 / 280 ** 2 < 1) return [235, 188, 139, 255];
      if (y > 720 && x > 100 && x < 700) return [37, 62, 118, 255];
      return [245 - Math.floor(x / 80), 235 - Math.floor(y / 120), 220, 255];
    }),
    'journey-alpha.png': encodeFixturePng(600, 600, (x, y) => {
      const distance = Math.hypot(x - 300, y - 300);
      return distance < 175 ? [148, 45, 195, 255] : distance < 210 ? [148, 45, 195, 128] : [0, 0, 0, 0];
    }),
    // A real raster with a simple bright rectangular document on a dark desk.
    // Scanner assertions use user-selected corners/aspect, not a golden from the scanner.
    'journey-document.png': encodeFixturePng(1200, 900, (x, y) => {
      if (x < 160 || x > 1040 || y < 100 || y > 800) return [38, 45, 52, 255];
      if (x < 176 || x > 1024 || y < 116 || y > 784) return [225, 224, 214, 255];
      if (x > 240 && x < 940 && y > 220 && y < 690 && y % 60 < 8) return [18, 25, 32, 255];
      if (x > 240 && x < 480 && y > 145 && y < 195) return [27, 73, 147, 255];
      return [253, 251, 240, 255];
    }),
    'journey-vdp.csv': Buffer.from('\ufeffTitle,URL,Footer\r\nJourney One,https://example.invalid/acceptance/one,ROW-001\r\nJourney Two,https://example.invalid/acceptance/two,ROW-002\r\n', 'utf8'),
  };
  const manifest = { schemaVersion: 1, synthetic: true, expectedAlgorithm: 'independent hand-specified inputs; no production golden', files: [] };
  for (const [name, bytes] of Object.entries(files)) {
    await writeFile(join(root, name), bytes, { flag: 'w' });
    manifest.files.push({ name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(join(root, 'journey-fixtures.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { root, landscape: join(root, 'journey-landscape.png'), portrait: join(root, 'journey-portrait.png'), alpha: join(root, 'journey-alpha.png'), document: join(root, 'journey-document.png'), vdp: join(root, 'journey-vdp.csv'), manifest };
}

export async function verifyJourneyFixtures(directory) {
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(join(root, 'journey-fixtures.json'), 'utf8'));
  for (const file of manifest.files) {
    if (!/^journey-[a-z-]+\.(png|csv)$/.test(file.name)) throw new Error('Invalid fixture filename');
    const bytes = await readFile(join(root, file.name));
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Fixture hash mismatch: ${file.name}`);
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [directory, flag] = process.argv.slice(2);
  if (!directory) throw new Error('Usage: node journey-fixtures.mjs <absolute-directory> [--verify]');
  const result = flag === '--verify' ? await verifyJourneyFixtures(directory) : await generateJourneyFixtures(directory);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
