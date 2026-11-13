#!/usr/bin/env node
/**
 * OFFLINE, SPEC-ONLY AUTHORING TOOL FOR IMMUTABLE GOLDEN FIXTURES.
 *
 * This file deliberately imports no Grido production module and no image library.
 * It expresses the fixture contract with literal sources and small reference math.
 *
 * DO NOT run --write in CI and DO NOT use production output to update these files.
 * A changed expected byte is a reviewed specification change, never an automatic
 * "blessing" of current behavior. CI may consume manifest.json and the .rgba files;
 * it must not regenerate expected data. --verify is read-only and checks only the
 * committed byte lengths and SHA-256 values.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FORMAT_REF = 'rgba8-straight-srgb-byte-domain-top-left-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function clampRoundByte(value) {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.floor(value + 0.5);
}

function image(width, height, bytes) {
  const data = Buffer.from(bytes);
  invariant(Number.isInteger(width) && width > 0, `invalid width ${width}`);
  invariant(Number.isInteger(height) && height > 0, `invalid height ${height}`);
  invariant(data.length === width * height * 4, `RGBA length ${data.length} != ${width}x${height}x4`);
  return { width, height, data };
}

function imageFromHexRows(rows) {
  invariant(rows.length > 0 && rows[0].length > 0, 'hex rows must not be empty');
  const height = rows.length;
  const width = rows[0].length;
  const bytes = [];
  for (const row of rows) {
    invariant(row.length === width, 'all rows must have the same width');
    for (const rgba of row) {
      invariant(/^[0-9a-fA-F]{8}$/.test(rgba), `invalid RRGGBBAA pixel ${rgba}`);
      for (let i = 0; i < 8; i += 2) bytes.push(Number.parseInt(rgba.slice(i, i + 2), 16));
    }
  }
  return image(width, height, bytes);
}

function transpose(src) {
  const out = Buffer.alloc(src.data.length);
  const outWidth = src.height;
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const source = (y * src.width + x) * 4;
      const target = (x * outWidth + y) * 4;
      src.data.copy(out, target, source, source + 4);
    }
  }
  return image(src.height, src.width, out);
}

function computeIntegralCoverCrop(src, targetWidth, targetHeight) {
  const sourceAspect = src.width / src.height;
  const targetAspect = targetWidth / targetHeight;
  let x = 0;
  let y = 0;
  let width = src.width;
  let height = src.height;
  if (sourceAspect > targetAspect) {
    width = src.height * targetAspect;
    x = (src.width - width) / 2;
  } else if (sourceAspect < targetAspect) {
    height = src.width / targetAspect;
    y = (src.height - height) / 2;
  }
  for (const [name, value] of Object.entries({ x, y, width, height })) {
    invariant(Number.isInteger(value), `cover fixture requires integral ${name}, got ${value}`);
  }
  invariant(width === targetWidth && height === targetHeight, 'Wave 0 cover vectors exclude resampling');
  return { x, y, width, height };
}

function coverCropAndFlip(src, targetWidth, targetHeight, flipX = false, flipY = false) {
  const crop = computeIntegralCoverCrop(src, targetWidth, targetHeight);
  const out = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = crop.x + (flipX ? targetWidth - 1 - x : x);
      const sourceY = crop.y + (flipY ? targetHeight - 1 - y : y);
      const source = (sourceY * src.width + sourceX) * 4;
      const target = (y * targetWidth + x) * 4;
      src.data.copy(out, target, source, source + 4);
    }
  }
  return { output: image(targetWidth, targetHeight, out), crop };
}

function mapRgb(src, transform) {
  const out = Buffer.alloc(src.data.length);
  for (let i = 0; i < src.data.length; i += 4) {
    const [r, g, b] = transform(src.data[i], src.data[i + 1], src.data[i + 2]);
    out[i] = clampRoundByte(r);
    out[i + 1] = clampRoundByte(g);
    out[i + 2] = clampRoundByte(b);
    out[i + 3] = src.data[i + 3];
  }
  return image(src.width, src.height, out);
}

function threshold(src, level) {
  const thresholdByte = level * 255;
  return mapRgb(src, (r, g, b) => {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const value = luma >= thresholdByte ? 255 : 0;
    return [value, value, value];
  });
}

function pixelateCenterNearest(src, blockSize) {
  const block = Math.max(1, Math.round(blockSize));
  if (block <= 1 || src.width <= block || src.height <= block) {
    return image(src.width, src.height, Buffer.from(src.data));
  }
  const smallWidth = Math.max(1, Math.floor(src.width / block));
  const smallHeight = Math.max(1, Math.floor(src.height / block));
  const small = Buffer.alloc(smallWidth * smallHeight * 4);
  const downX = src.width / smallWidth;
  const downY = src.height / smallHeight;
  for (let y = 0; y < smallHeight; y += 1) {
    const sourceY = Math.floor((y + 0.5) * downY);
    for (let x = 0; x < smallWidth; x += 1) {
      const sourceX = Math.floor((x + 0.5) * downX);
      const source = (sourceY * src.width + sourceX) * 4;
      const target = (y * smallWidth + x) * 4;
      src.data.copy(small, target, source, source + 4);
    }
  }
  const out = Buffer.alloc(src.data.length);
  const upX = smallWidth / src.width;
  const upY = smallHeight / src.height;
  for (let y = 0; y < src.height; y += 1) {
    const sourceY = Math.floor((y + 0.5) * upY);
    for (let x = 0; x < src.width; x += 1) {
      const sourceX = Math.floor((x + 0.5) * upX);
      const source = (sourceY * smallWidth + sourceX) * 4;
      const target = (y * src.width + x) * 4;
      small.copy(out, target, source, source + 4);
    }
  }
  return image(src.width, src.height, out);
}

function buildFilterSource() {
  const width = 21;
  const height = 21;
  const data = Buffer.alloc(width * height * 4);
  const bases = [
    [19, 67, 149],
    [211, 31, 83],
    [13, 193, 91],
    [229, 167, 17],
  ];
  const set = (x, y, rgba) => {
    const i = (y * width + x) * 4;
    for (let c = 0; c < 4; c += 1) data[i + c] = rgba[c];
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const quadrant = (y >= 10 ? 2 : 0) + (x >= 10 ? 1 : 0);
      const base = bases[quadrant];
      const r = (base[0] + 11 * x + 3 * y) % 256;
      const g = (base[1] + 5 * x + 13 * y) % 256;
      const b = (base[2] + 17 * x + 7 * y) % 256;
      let alpha = 255;
      if (y === 0) alpha = [255, 192, 128, 64, 0][x % 5];
      else if (x === width - 1) alpha = [128, 0, 64, 192, 255][y % 5];
      else if (y === height - 1) alpha = [0, 64, 128, 192, 255][x % 5];
      else if (x === 0) alpha = [64, 128, 192, 0, 255][y % 5];
      set(x, y, [r, g, b, alpha]);
    }
  }

  // Explicit alpha and threshold anchors. Transparent RGB is intentionally non-zero.
  set(0, 0, [9, 33, 201, 255]);
  set(20, 0, [231, 17, 149, 128]);
  set(0, 20, [17, 231, 89, 0]);
  set(20, 20, [201, 99, 7, 64]);
  set(8, 10, [128, 127, 128, 192]);
  set(9, 10, [127, 127, 127, 255]);
  set(10, 10, [128, 128, 128, 128]);
  set(11, 10, [127, 128, 127, 64]);
  return image(width, height, data);
}

const coverLandscape = imageFromHexRows([
  ['D01020FF', 'E06030E0', 'F0B020C0', '30C05080', '10A0D040', '2040D000', 'A020C0FF'],
  ['B02838F0', 'C07848D0', 'E0C838A0', '48B86860', '28B8C820', '3858C8FF', '9828B8D0'],
  ['903050D0', 'A08060B0', 'C0D05070', '60A08030', '40C0B0FF', '5060B0C0', '8030A090'],
  ['704068B0', '90807890', 'A0D06850', '78909810', '58C098E0', '687098A0', '68408870'],
  ['50508090', '70889070', '80D88030', '9080B8F0', '70C080B0', '80808070', '50507040'],
]);
const coverPortrait = transpose(coverLandscape);
const filterSource = buildFilterSource();

const fixtures = new Map();
const addFixture = (path, role, value) => {
  invariant(!fixtures.has(path), `duplicate fixture path ${path}`);
  fixtures.set(path, { path, role, ...value });
};

addFixture('cover/source-landscape-7x5.rgba', 'source', coverLandscape);
addFixture('cover/source-portrait-5x7.rgba', 'source', coverPortrait);

const coverCases = [];
function addCoverCase(id, sourcePath, source, targetWidth, targetHeight, flipX = false, flipY = false) {
  const expectedPath = `cover/expected-${id}.rgba`;
  const { output, crop } = coverCropAndFlip(source, targetWidth, targetHeight, flipX, flipY);
  addFixture(expectedPath, 'expected', output);
  coverCases.push({
    id,
    source: sourcePath,
    expected: expectedPath,
    operation: 'center-cover-crop',
    parameters: {
      targetWidth,
      targetHeight,
      crop,
      flipX,
      flipY,
      transformOrder: ['crop', 'flip-output-axes'],
      resampling: 'none-1:1-integral-crop',
    },
    comparisonPolicy: 'exact-rgba',
  });
}

addCoverCase('landscape-to-portrait-3x5', 'cover/source-landscape-7x5.rgba', coverLandscape, 3, 5);
addCoverCase('portrait-to-landscape-5x3', 'cover/source-portrait-5x7.rgba', coverPortrait, 5, 3);
addCoverCase('odd-center-square-5x5', 'cover/source-landscape-7x5.rgba', coverLandscape, 5, 5);
addCoverCase('exact-aspect-7x5', 'cover/source-landscape-7x5.rgba', coverLandscape, 7, 5);
addCoverCase('exact-aspect-flip-x-7x5', 'cover/source-landscape-7x5.rgba', coverLandscape, 7, 5, true, false);
addCoverCase('exact-aspect-flip-y-7x5', 'cover/source-landscape-7x5.rgba', coverLandscape, 7, 5, false, true);

addFixture('filters/source-21x21.rgba', 'source', filterSource);

const filterCases = [];
function addFilterCase(id, parameters, output, comparisonPolicy) {
  const expectedPath = `filters/expected-${id}.rgba`;
  addFixture(expectedPath, 'expected', output);
  filterCases.push({
    id,
    source: 'filters/source-21x21.rgba',
    expected: expectedPath,
    operation: id,
    parameters,
    comparisonPolicy,
  });
}

addFilterCase('identity', {}, image(filterSource.width, filterSource.height, Buffer.from(filterSource.data)), 'exact-rgba');
addFilterCase(
  'brightness',
  { factor: 1.2, formula: "C' = C * factor" },
  mapRgb(filterSource, (r, g, b) => [r * 1.2, g * 1.2, b * 1.2]),
  'rgb-one-lsb-alpha-exact',
);
addFilterCase(
  'contrast',
  { factor: 1.25, pivot: 127.5, formula: "C' = (C - 127.5) * factor + 127.5" },
  mapRgb(filterSource, (r, g, b) => [
    (r - 127.5) * 1.25 + 127.5,
    (g - 127.5) * 1.25 + 127.5,
    (b - 127.5) * 1.25 + 127.5,
  ]),
  'rgb-one-lsb-alpha-exact',
);
addFilterCase(
  'saturation',
  {
    factor: 1.4,
    lumaWeights: [0.2126, 0.7152, 0.0722],
    formula: "L = dot(RGB, weights); C' = L + (C - L) * factor",
  },
  mapRgb(filterSource, (r, g, b) => {
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [luma + (r - luma) * 1.4, luma + (g - luma) * 1.4, luma + (b - luma) * 1.4];
  }),
  'rgb-one-lsb-alpha-exact',
);
addFilterCase(
  'sepia',
  {
    amount: 1,
    matrix: [[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]],
  },
  mapRgb(filterSource, (r, g, b) => [
    0.393 * r + 0.769 * g + 0.189 * b,
    0.349 * r + 0.686 * g + 0.168 * b,
    0.272 * r + 0.534 * g + 0.131 * b,
  ]),
  'rgb-one-lsb-alpha-exact',
);
addFilterCase(
  'grayscale',
  { amount: 1, lumaWeights: [0.2126, 0.7152, 0.0722], formula: "Y = dot(RGB, weights); RGB' = [Y,Y,Y]" },
  mapRgb(filterSource, (r, g, b) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [y, y, y];
  }),
  'rgb-one-lsb-alpha-exact',
);
addFilterCase(
  'invert',
  { amount: 1, formula: "C' = 255 - C" },
  mapRgb(filterSource, (r, g, b) => [255 - r, 255 - g, 255 - b]),
  'exact-rgba',
);
addFilterCase(
  'threshold',
  {
    level: 0.5,
    thresholdByte: 127.5,
    lumaWeights: [0.299, 0.587, 0.114],
    comparison: 'white when luma >= 127.5, otherwise black',
    alpha: 'preserved',
    boundaryAnchors: [
      { x: 9, y: 10, rgba: [127, 127, 127, 255], expected: 'black' },
      { x: 10, y: 10, rgba: [128, 128, 128, 128], expected: 'white-alpha-128' },
    ],
  },
  threshold(filterSource, 0.5),
  'exact-rgba',
);
addFilterCase(
  'pixelate',
  {
    blockSize: 10,
    downsampleSize: { width: 2, height: 2 },
    sampling: 'two-pass-nearest-neighbor-pixel-center',
    sourceIndex: 'floor((destinationIndex + 0.5) * sourceLength / destinationLength)',
    alpha: 'sampled with RGB',
  },
  pixelateCenterNearest(filterSource, 10),
  'exact-rgba',
);

function fileRecord(entry) {
  return {
    path: entry.path,
    role: entry.role,
    format: FORMAT_REF,
    width: entry.width,
    height: entry.height,
    stride: entry.width * 4,
    byteLength: entry.data.length,
    sha256: sha256(entry.data),
  };
}

const manifest = {
  schemaVersion: 1,
  fixturePackageVersion: '1.0.0-wave0',
  authoredDate: '2026-11-13',
  status: 'immutable-golden-input',
  notice: 'Expected bytes are independent specification vectors. Never regenerate them from production output and never auto-bless them in CI.',
  generator: {
    path: 'generate-fixtures.mjs',
    mode: 'standalone-spec-only-no-production-imports',
    writePolicy: '--write only creates an empty package once; it refuses to overwrite manifest.json',
    ciPolicy: 'CI consumes committed manifest and RGBA files; CI must not invoke --write',
  },
  format: {
    id: FORMAT_REF,
    storage: 'raw-uncompressed',
    channels: ['R', 'G', 'B', 'A'],
    bitsPerChannel: 8,
    rowOrder: 'top-to-bottom',
    origin: 'top-left',
    pixelOrderWithinRow: 'left-to-right',
    strideRule: 'width * 4 bytes; no row padding',
    alpha: 'straight-unassociated',
    colorEncoding: 'sRGB-byte-domain',
    transferHandling: 'no linear-light conversion; formulas operate directly on stored 0..255 bytes',
    transparentPixelRule: 'RGB bytes are meaningful and retained even when alpha is zero',
    quantization: 'clamp to [0,255], then nearest integer; exact .5 rounds upward',
  },
  comparisonPolicies: {
    'exact-rgba': {
      dimensions: 'exact',
      stride: 'exact',
      maxAbsoluteErrorByChannel: { R: 0, G: 0, B: 0, A: 0 },
      maxMismatchedBytes: 0,
    },
    'rgb-one-lsb-alpha-exact': {
      dimensions: 'exact',
      stride: 'exact',
      maxAbsoluteErrorByChannel: { R: 1, G: 1, B: 1, A: 0 },
      rationale: 'Permits only cross-language last-bit floating-point quantization; expected bytes remain the canonical half-up result.',
    },
  },
  files: [...fixtures.values()].map(fileRecord),
  suites: {
    cover: {
      intent: 'Lock center-cover crop orientation, odd-dimension centering, exact aspect, transparency retention, and post-crop flips without interpolation ambiguity.',
      sourceDesign: '7x5 asymmetric literal color bands with unequal corners and alpha values 0/16..255; the 5x7 source is its coordinate transpose.',
      scope: 'Integral 1:1 crop vectors only. Resampler-kernel parity is intentionally deferred.',
      algorithm: {
        crop: 'If sourceAspect > targetAspect, cropWidth = sourceHeight * targetAspect and center X; otherwise cropHeight = sourceWidth / targetAspect and center Y.',
        transformOrder: ['center crop', 'horizontal/vertical flip in output space'],
      },
      cases: coverCases,
    },
    filters: {
      intent: 'Lock byte-domain color/filter semantics on opaque, semitransparent, and fully transparent pixels.',
      sourceDesign: '21x21 asymmetric four-region field with gradients, all edge alpha classes, meaningful RGB under alpha=0, weighted threshold anchors at 127/128, and four distinct pixelate samples.',
      commonRules: {
        arithmetic: 'IEEE-754 binary64 reference arithmetic',
        alpha: 'unchanged except pixelate, which samples the complete RGBA pixel',
        domain: 'unassociated sRGB bytes; no gamma decoding and no premultiplication',
      },
      cases: filterCases,
    },
  },
  deferred: {
    fullSheet: 'Wave 4 follow-up: composition rasterization depends on production border antialiasing, cut-line stroke placement, and resampling contracts not frozen by Wave 0.',
  },
};

function assertInsideRoot(path) {
  const full = resolve(ROOT, path);
  const prefix = `${resolve(ROOT)}${sep}`;
  invariant(full.startsWith(prefix), `path escapes fixture root: ${path}`);
  return full;
}

function writePackage() {
  const manifestPath = join(ROOT, 'manifest.json');
  invariant(!existsSync(manifestPath), 'manifest.json already exists; immutable fixtures will not be overwritten');
  for (const entry of fixtures.values()) {
    const full = assertInsideRoot(entry.path);
    invariant(!existsSync(full), `fixture already exists; refusing overwrite: ${entry.path}`);
  }
  for (const entry of fixtures.values()) {
    const full = assertInsideRoot(entry.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, entry.data, { flag: 'wx' });
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  console.log(`Wrote ${fixtures.size} immutable RGBA files and manifest.json`);
}

function verifyPackageReadOnly() {
  const manifestPath = join(ROOT, 'manifest.json');
  const committed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  invariant(committed.schemaVersion === 1, `unsupported schemaVersion ${committed.schemaVersion}`);
  invariant(Array.isArray(committed.files) && committed.files.length > 0, 'manifest files[] is empty');
  const seen = new Set();
  for (const record of committed.files) {
    invariant(!seen.has(record.path), `duplicate manifest path ${record.path}`);
    seen.add(record.path);
    const full = assertInsideRoot(record.path);
    const bytes = readFileSync(full);
    invariant(record.stride === record.width * 4, `${record.path}: invalid stride metadata`);
    invariant(record.byteLength === record.width * record.height * 4, `${record.path}: invalid byteLength metadata`);
    invariant(bytes.length === record.byteLength, `${record.path}: byte length ${bytes.length} != ${record.byteLength}`);
    invariant(sha256(bytes) === record.sha256, `${record.path}: SHA-256 mismatch`);
  }
  const referenced = [];
  for (const suite of Object.values(committed.suites)) {
    if (!suite || !Array.isArray(suite.cases)) continue;
    for (const testCase of suite.cases) referenced.push(testCase.source, testCase.expected);
  }
  for (const path of referenced) invariant(seen.has(path), `case references unmanifested file ${path}`);
  console.log(`Verified ${committed.files.length} files read-only: byte lengths, strides, references, and SHA-256 all match`);
}

const mode = process.argv[2];
if (mode === '--write') writePackage();
else if (mode === '--verify') verifyPackageReadOnly();
else {
  const rel = relative(process.cwd(), fileURLToPath(import.meta.url)) || 'generate-fixtures.mjs';
  console.error(`Usage: node ${rel} --write|--verify`);
  process.exitCode = 2;
}
