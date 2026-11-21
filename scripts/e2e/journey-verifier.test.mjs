import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { crc32, encodeFixturePng, generateJourneyFixtures, verifyJourneyFixtures } from './journey-fixtures.mjs';
import { inspectJpeg, inspectOutput, inspectPdf, inspectPng, inspectTiff, verifyOutput } from './verify-output.mjs';

function independentTinyTiff(compression = 1, photometric = 5) {
  const raster = Buffer.from([0, 255, 255, 0, 255, 0, 255, 0]);
  const strip = compression === 8 ? deflateSync(raster) : raster;
  const entries = [
    [256, 4, 1, 2], [257, 4, 1, 1], [258, 3, 4, 0], [259, 3, 1, compression],
    [262, 3, 1, photometric], [273, 4, 1, 0], [277, 3, 1, 4], [278, 4, 1, 1],
    [279, 4, 1, strip.length], [282, 5, 1, 0], [283, 5, 1, 0], [284, 3, 1, 1],
    [296, 3, 1, 2], [332, 3, 1, 1],
  ];
  const extra = 8 + 2 + entries.length * 12 + 4;
  entries[2][3] = extra; entries[5][3] = extra + 24; entries[9][3] = extra + 8; entries[10][3] = extra + 16;
  const result = Buffer.alloc(extra + 24 + strip.length);
  result.write('II'); result.writeUInt16LE(42, 2); result.writeUInt32LE(8, 4); result.writeUInt16LE(entries.length, 8);
  entries.forEach(([tag, type, n, value], i) => {
    const p = 10 + i * 12;
    result.writeUInt16LE(tag, p); result.writeUInt16LE(type, p + 2); result.writeUInt32LE(n, p + 4); result.writeUInt32LE(value, p + 8);
  });
  for (let i = 0; i < 4; i++) result.writeUInt16LE(8, extra + i * 2);
  result.writeUInt32LE(300, extra + 8); result.writeUInt32LE(1, extra + 12);
  result.writeUInt32LE(300, extra + 16); result.writeUInt32LE(1, extra + 20); strip.copy(result, extra + 24);
  return result;
}

test('PNG decoder reads actual pixels, alpha, DPI, dimensions, hash', () => {
  const png = encodeFixturePng(3, 2, (x, y) => [x * 40, y * 50, 120, x === 0 ? 0 : 255]);
  const output = inspectOutput(png);
  assert.equal(output.format, 'png'); assert.equal(output.width, 3); assert.equal(output.height, 2);
  assert.deepEqual([...output.pixels.subarray(0, 4)], [0, 0, 120, 0]);
  assert.deepEqual(output.alpha, { min: 0, max: 255 });
  assert(Math.abs(output.dpi[0] - 300) < 0.02); assert.match(output.sha256, /^[a-f0-9]{64}$/);
});

test('PNG rejects corrupt CRC, truncated structure, invalid signature and oversized IHDR', () => {
  const png = encodeFixturePng(2, 2, () => [1, 2, 3, 255]);
  const corrupt = Buffer.from(png); corrupt[45] ^= 1;
  assert.throws(() => inspectPng(corrupt), /CRC/);
  assert.throws(() => inspectPng(png.subarray(0, png.length - 5)), /Truncated/);
  assert.throws(() => inspectPng(Buffer.alloc(20)), /signature/);
  const giant = Buffer.from(png); giant.writeUInt32BE(50_000, 16); giant.writeUInt32BE(50_000, 20); giant.writeUInt32BE(crc32(giant.subarray(12, 29)), 29);
  assert.throws(() => inspectPng(giant), /oversized/);
});

test('TIFF decodes both uncompressed and zlib strips, checks separated inks and resolution', () => {
  for (const compression of [1, 8]) {
    const tiff = inspectTiff(independentTinyTiff(compression));
    assert.equal(tiff.width, 2); assert.equal(tiff.height, 1); assert.equal(tiff.photometric, 5);
    assert.deepEqual(tiff.dpi, [300, 300]); assert.deepEqual([...tiff.pixels], [0, 255, 255, 0, 255, 0, 255, 0]);
  }
  assert.throws(() => inspectTiff(independentTinyTiff(1, 2)), /CMYK/);
  assert.throws(() => inspectTiff(independentTinyTiff(5)), /lossless/);
  const invalid = independentTinyTiff(); invalid.writeUInt32LE(0xfffffff0, 10 + 5 * 12 + 8);
  assert.throws(() => inspectTiff(invalid), /out-of-range/);
});

test('JPEG checks RGB frame, complete scan and JFIF DPI without claiming full decode', () => {
  const jpeg = Buffer.from('ffd8ffe000104a46494600010101012c012c0000ffc00011080002000303011100021100031100ffda000c03010002110311003f00112233445566778899aaffd9', 'hex');
  const output = inspectJpeg(jpeg);
  assert.deepEqual(output.dpi, [300, 300]); assert.equal(output.width, 3); assert.equal(output.height, 2);
  assert.throws(() => inspectJpeg(jpeg.subarray(0, jpeg.length - 2)), /incomplete/);
});

test('PDF validates MediaBox in points and refuses incomplete file', () => {
  const bytes = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page /MediaBox [0 0 595.276 841.89] >> endobj\nstartxref\n12\n%%EOF\n');
  assert.equal(inspectPdf(bytes).pages, 1);
  assert(Math.abs(inspectPdf(bytes).boxes[0].widthPt * 25.4 / 72 - 210) < 0.01);
  assert.throws(() => inspectPdf(bytes.subarray(0, 30)), /incomplete/);
});

test('fixture generation is deterministic and verifier refuses wrong dimensions/DPI/pixels', async () => {
  const root = await mkdtemp(join(tmpdir(), 'grido-journey-unit-'));
  try {
    const fixture = await generateJourneyFixtures(root);
    const first = await readFile(fixture.landscape);
    await generateJourneyFixtures(root);
    assert.deepEqual(await readFile(fixture.landscape), first);
    await verifyJourneyFixtures(root);
    const result = await verifyOutput(fixture.landscape, { format: 'png', width: 1200, height: 800, dpi: 300, alpha: 'opaque', nonUniform: true, samples: [{ x: 0.25, y: 0.25, rgba: [231, 40, 46, 255] }] });
    assert(!Object.hasOwn(result, 'pixels')); assert.match(result.pixelSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(verifyOutput(fixture.landscape, { format: 'png', width: 999 }), /width/);
    await assert.rejects(verifyOutput(fixture.landscape, { format: 'png', dpi: 72 }), /DPI/);
    await assert.rejects(verifyOutput(fixture.landscape, { format: 'png', samples: [{ x: 0.25, y: 0.25, rgba: [0, 0, 0, 0] }] }), /sample/);
    await verifyOutput(fixture.alpha, { format: 'png', width: 600, height: 600, alpha: 'transparent' });
  } finally { await rm(root, { recursive: true, force: true }); }
});
