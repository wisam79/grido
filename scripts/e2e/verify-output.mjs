import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { inflateSync } from 'node:zlib';

const exec = promisify(execFile);
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function bounded(bytes, offset, length) {
  assert(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= bytes.length, 'Truncated or out-of-range file structure');
  return bytes.subarray(offset, offset + length);
}
function crc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function dimensions(width, height) {
  assert(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width * height <= MAX_PIXELS, 'Invalid or oversized raster dimensions');
}
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Independent format reader. Supports the non-interlaced 8-bit RGB/RGBA PNGs generated
// by browsers and Go, validates every CRC and actually inflates/unfilters the raster.
export function inspectPng(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid PNG signature');
  let offset = 8, header, density, ended = false;
  const compressed = [];
  while (offset < bytes.length) {
    bounded(bytes, offset, 12);
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bounded(bytes, offset + 8, length);
    assert.equal(crc(bounded(bytes, offset + 4, length + 4)), bytes.readUInt32BE(offset + 8 + length), `PNG CRC mismatch: ${type}`);
    if (!header) assert.equal(type, 'IHDR', 'PNG must begin with IHDR');
    if (type === 'IHDR') { assert(!header && length === 13, 'Invalid duplicate PNG header'); header = data; }
    if (type === 'pHYs') { assert.equal(length, 9); density = data; }
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
    if (type === 'IEND') { assert.equal(length, 0); ended = true; break; }
  }
  assert(ended && offset === bytes.length && compressed.length, 'Incomplete PNG or trailing bytes');
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), colorType = header[9];
  dimensions(width, height);
  assert(header[8] === 8 && [2, 6].includes(colorType) && header[10] === 0 && header[11] === 0 && header[12] === 0, 'Unsupported PNG encoding (expected noninterlaced 8-bit RGB/RGBA)');
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: height * (stride + 1) });
  assert.equal(raw.length, height * (stride + 1), 'PNG scanline length mismatch');
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert(filter <= 4, 'Illegal PNG scanline filter');
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  let minAlpha = 255, maxAlpha = 255;
  if (channels === 4) {
    maxAlpha = 0;
    for (let i = 3; i < pixels.length; i += 4) { minAlpha = Math.min(minAlpha, pixels[i]); maxAlpha = Math.max(maxAlpha, pixels[i]); }
  }
  return { format: 'png', width, height, channels, alpha: { min: minAlpha, max: maxAlpha }, dpi: density?.[8] === 1 ? [density.readUInt32BE(0) * 0.0254, density.readUInt32BE(4) * 0.0254] : null, pixelSha256: hash(pixels), pixels };
}

export function inspectJpeg(bytes) {
  assert(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9, 'Invalid/incomplete JPEG');
  let offset = 2, width, height, channels, dpi = null, hasScan = false;
  while (offset < bytes.length - 2) {
    assert.equal(bytes[offset++], 0xff, 'Invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    bounded(bytes, offset, 2);
    const length = bytes.readUInt16BE(offset);
    assert(length >= 2, 'Invalid JPEG segment length');
    const data = bounded(bytes, offset + 2, length - 2);
    if (marker === 0xe0 && data.toString('ascii', 0, 5) === 'JFIF\0') {
      bounded(data, 0, 12);
      const scale = data[7] === 1 ? 1 : data[7] === 2 ? 2.54 : null;
      if (scale) dpi = [data.readUInt16BE(8) * scale, data.readUInt16BE(10) * scale];
    }
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      bounded(data, 0, 6); height = data.readUInt16BE(1); width = data.readUInt16BE(3); channels = data[5];
    }
    offset += length;
    if (marker === 0xda) { hasScan = bytes.length - offset > 8; break; }
  }
  dimensions(width, height);
  assert(hasScan && channels === 3, 'JPEG must contain an RGB image scan');
  return { format: 'jpeg', width, height, channels, dpi, alpha: { min: 255, max: 255 }, decode: 'header+scan; full decode independently exercised by browser in GUI helper' };
}

export function inspectTiff(bytes) {
  const little = bytes.toString('ascii', 0, 2) === 'II';
  assert(little || bytes.toString('ascii', 0, 2) === 'MM', 'Invalid TIFF byte order');
  const u16 = (p) => { bounded(bytes, p, 2); return little ? bytes.readUInt16LE(p) : bytes.readUInt16BE(p); };
  const u32 = (p) => { bounded(bytes, p, 4); return little ? bytes.readUInt32LE(p) : bytes.readUInt32BE(p); };
  assert.equal(u16(2), 42, 'Unsupported TIFF magic');
  const ifd = u32(4), count = u16(ifd);
  assert(count <= 128, 'Oversized TIFF IFD');
  bounded(bytes, ifd + 2, count * 12 + 4);
  const tags = {};
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12, tag = u16(entry), type = u16(entry + 2), n = u32(entry + 4);
    const size = { 1: 1, 3: 2, 4: 4, 5: 8 }[type];
    if (!size) continue;
    assert(n > 0 && n <= MAX_PIXELS, 'Invalid TIFF tag count');
    const start = n * size <= 4 ? entry + 8 : u32(entry + 8);
    bounded(bytes, start, n * size);
    tags[tag] = Array.from({ length: n }, (_, j) => type === 1 ? bytes[start + j] : type === 3 ? u16(start + j * 2) : type === 4 ? u32(start + j * 4) : u32(start + j * 8) / u32(start + j * 8 + 4));
  }
  const first = (tag) => tags[tag]?.[0];
  const width = first(256), height = first(257);
  dimensions(width, height);
  assert([1, 8].includes(first(259)), 'Expected lossless uncompressed/Deflate CMYK TIFF');
  assert.equal(first(262), 5, 'TIFF is not Separated/CMYK');
  assert.equal(first(277), 4, 'TIFF must contain four ink channels');
  assert.deepEqual(tags[258], [8, 8, 8, 8], 'TIFF must be 8 bits per ink');
  assert.equal(first(284) ?? 1, 1, 'Expected chunky CMYK');
  assert.equal(first(332) ?? 1, 1, 'InkSet must be CMYK');
  assert(!tags[338], 'CMYK export must be flattened, not alpha');
  assert.equal(u32(ifd + 2 + count * 12), 0, 'Expected single-image TIFF');
  assert(tags[273]?.length && tags[273].length === tags[279]?.length, 'Missing TIFF strips');
  assert.equal(first(317) ?? 1, 1, 'Unsupported TIFF predictor');
  const pixels = Buffer.concat(tags[273].map((start, i) => {
    const strip = bounded(bytes, start, tags[279][i]);
    return first(259) === 8 ? inflateSync(strip, { maxOutputLength: width * height * 4 }) : strip;
  }));
  assert.equal(pixels.length, width * height * 4, 'TIFF strip payload does not match image dimensions');
  const unit = first(296), factor = unit === 2 ? 1 : unit === 3 ? 2.54 : null;
  return { format: 'tiff', width, height, channels: 4, photometric: first(262), inkSet: first(332) ?? 1, compression: first(259), bitsPerSample: tags[258], dpi: factor && first(282) && first(283) ? [first(282) * factor, first(283) * factor] : null, pixelSha256: hash(pixels), pixels };
}

// Structural PDF verification is deliberately separate from a claimed GUI route.
// Current application has no GUI PDF export; these checks are unit-covered for a future route.
export function inspectPdf(bytes) {
  const text = bytes.toString('latin1');
  assert(text.startsWith('%PDF-') && /%%EOF\s*$/.test(text), 'Invalid or incomplete PDF');
  const pages = [...text.matchAll(/\/Type\s*\/Page\b/g)].length;
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g)].map((m) => ({ widthPt: Number(m[3]) - Number(m[1]), heightPt: Number(m[4]) - Number(m[2]) }));
  assert(pages > 0 && boxes.length > 0 && boxes.every((b) => b.widthPt > 0 && b.heightPt > 0), 'PDF page structure or MediaBox missing');
  assert(/\bstartxref\s+\d+/.test(text), 'PDF cross-reference missing');
  return { format: 'pdf', pages, boxes };
}

export function inspectOutput(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_BYTES, 'Output is empty or oversized');
  const signature = bytes.toString('ascii', 0, 4);
  const result = bytes[0] === 137 ? inspectPng(bytes) : bytes[0] === 255 ? inspectJpeg(bytes) : signature === '%PDF' ? inspectPdf(bytes) : inspectTiff(bytes);
  return { ...result, bytes: bytes.length, sha256: hash(bytes) };
}

export async function verifyOutput(file, expected) {
  const result = inspectOutput(await readFile(file));
  assert.equal(result.format, expected.format, 'Export format differs from requested GUI format');
  if (expected.width !== undefined) assert.equal(result.width, expected.width, 'Export width mismatch');
  if (expected.height !== undefined) assert.equal(result.height, expected.height, 'Export height mismatch');
  if (expected.dpi !== undefined) {
    assert(result.dpi, 'Export DPI metadata missing');
    for (const dpi of result.dpi) assert(Math.abs(dpi - expected.dpi) <= 1, `Export DPI ${dpi} does not match ${expected.dpi}`);
  }
  if (expected.alpha === 'transparent') assert(result.alpha?.min < 255 && result.alpha?.max > 0, 'No transparency/content in PNG');
  if (expected.alpha === 'opaque') assert.deepEqual(result.alpha, { min: 255, max: 255 }, 'Output not opaque');
  if (expected.nonUniform && result.pixels) {
    const step = result.channels;
    let differs = false;
    for (let i = step; i < result.pixels.length; i += step) {
      if (!result.pixels.subarray(i, i + step).equals(result.pixels.subarray(0, step))) { differs = true; break; }
    }
    assert(differs, 'Export raster is blank/uniform');
  }
  for (const sample of expected.samples ?? []) {
    assert(result.pixels, 'Pixel samples require PNG/TIFF');
    const x = Math.floor(sample.x * (result.width - 1)), y = Math.floor(sample.y * (result.height - 1));
    assert(x >= 0 && x < result.width && y >= 0 && y < result.height, 'Pixel sample outside raster');
    const actual = result.pixels.subarray((y * result.width + x) * result.channels, (y * result.width + x) * result.channels + sample.rgba.length);
    sample.rgba.forEach((value, i) => assert(Math.abs(actual[i] - value) <= (sample.tolerance ?? 8), `Pixel sample ${x},${y} channel ${i}: ${actual[i]} != ${value}`));
  }
  if (expected.pages !== undefined) assert.equal(result.pages, expected.pages);
  if (expected.pageMm) for (const box of result.boxes) {
    assert(Math.abs(box.widthPt * 25.4 / 72 - expected.pageMm[0]) < 0.2, 'PDF page width mismatch');
    assert(Math.abs(box.heightPt * 25.4 / 72 - expected.pageMm[1]) < 0.2, 'PDF page height mismatch');
  }
  if (expected.qrText) {
    const decoder = process.env.GRIDO_QR_DECODER;
    if (decoder) {
      const { stdout } = await exec(decoder, ['--quiet', '--raw', resolve(file)], { timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true });
      assert(stdout.trim().split(/\r?\n/).includes(expected.qrText), 'QR decoder did not recover expected user-entered value');
      result.qr = { status: 'passed', decoder: 'zbarimg-compatible external decoder', text: expected.qrText };
    } else {
      assert(!expected.requireQr, 'Required QR decoder GRIDO_QR_DECODER missing');
      result.qr = { status: 'blocked', reason: 'independent decoder unavailable; preview/data-field assertions are not QR decoding' };
    }
  }
  const { pixels: _pixels, ...report } = result;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [file, expectationFile] = process.argv.slice(2);
  if (!file || !expectationFile) throw new Error('Usage: node verify-output.mjs <output-file> <expectation-json>');
  process.stdout.write(`${JSON.stringify(await verifyOutput(file, JSON.parse(await readFile(expectationFile, 'utf8'))), null, 2)}\n`);
}
