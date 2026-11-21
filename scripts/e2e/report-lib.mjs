import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;
export const FIXTURE_KINDS = ['mocked-wails', 'actual-local-supabase', 'native-third-party-contract'];
export const BLOCKED_CAPABILITIES = [
  { id: 'pdf-gui-export', status: 'blocked', reason: 'Current application GUI does not expose a PDF export command; TIFF/JPEG/PNG evidence does not establish PDF acceptance.' },
  { id: 'physical-print-scan-camera', status: 'blocked', reason: 'Hosted runners cannot verify owner physical printer/scanner/phone hardware or physical output measurements.' },
  { id: 'live-oauth-email', status: 'blocked', reason: 'Disposable sandbox auth is not live Google OAuth consent, production email delivery or account recovery.' },
  { id: 'live-modal-inference', status: 'blocked', reason: 'No production Modal credentials or inference endpoint is invoked; deterministic third-party contract fixtures only.' },
  { id: 'native-cloud-auth', status: 'blocked', reason: 'Windows native lane uses loopback third-party auth contracts, not a remote actual Supabase service or public tunnel.' },
];

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function parseArgs(argv, repeated = []) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!/^--[a-z-]+$/.test(key) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`Invalid argument ${key}`);
    const name = key.slice(2);
    const value = argv[++i];
    if (repeated.includes(name)) (options[name] ||= []).push(value);
    else if (name in options) throw new Error(`Duplicate argument ${key}`);
    else options[name] = value;
  }
  return options;
}

export function required(options, name) {
  const value = options[name];
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

export function listFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  function visit(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw new Error('Symbolic links are not permitted in acceptance artifacts');
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) files.push(file);
    }
  }
  visit(root);
  return files.sort();
}

export function evidenceFiles(root) {
  return listFiles(root).filter((file) => path.basename(file) !== 'acceptance-manifest.json').map((file) => ({
    path: path.relative(root, file).replace(/\\/g, '/'),
    bytes: lstatSync(file).size,
    sha256: sha256(readFileSync(file)),
  }));
}

export function inventoryDigest(tests) {
  return sha256(JSON.stringify([...tests].sort((a, b) => a.id.localeCompare(b.id))));
}

export function validateSchema(value, schema, root = schema, location = '$') {
  const errors = [];
  if (schema.$ref) {
    const target = schema.$ref.slice(2).split('/').reduce((current, key) => current[key], root);
    return validateSchema(value, target, root, location);
  }
  if (schema.allOf) for (const item of schema.allOf) errors.push(...validateSchema(value, item, root, location));
  if (schema.oneOf && schema.oneOf.filter((item) => validateSchema(value, item, root, location).length === 0).length !== 1) errors.push(`${location}: schema oneOf mismatch`);
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(`${location}: const mismatch`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${location}: invalid enum`);
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type && (schema.type === 'integer' ? !Number.isInteger(value) : schema.type !== type)) return [...errors, `${location}: invalid type`];
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) errors.push(`${location}: short string`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${location}: invalid pattern`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) errors.push(`${location}: invalid timestamp`);
  }
  if (typeof value === 'number' && ((!Number.isFinite(value)) || (schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) errors.push(`${location}: invalid number`);
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${location}: empty array`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location}: duplicate array item`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, root, `${location}[${index}]`)));
  } else if (value && typeof value === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${location}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validateSchema(item, schema.properties[key], root, `${location}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${location}: unexpected ${key}`);
    }
  }
  return errors;
}

export function verifyExecution(expected, execution, root, requiredCases = [], requiredEvidence = ['trace', 'screenshot', 'video']) {
  const failures = [];
  if (!expected.length) failures.push('Selected lane/project has zero expected cases');
  const expectedIds = new Set(expected.map((test) => test.id));
  if (expectedIds.size !== expected.length) failures.push('Duplicate expected case IDs');
  const actualIds = new Set();
  for (const test of execution.tests || []) {
    if (actualIds.has(test.id)) failures.push(`Duplicate executed case: ${test.id}`);
    actualIds.add(test.id);
    if (!expectedIds.has(test.id)) failures.push(`Unexpected executed case: ${test.id}`);
    if (test.expectedStatus !== 'passed' || test.outcome !== 'expected') failures.push(`Non-passing outcome: ${test.id}`);
    if (test.attempts?.length !== 1) failures.push(`Case must run exactly once, without retries: ${test.id}`);
    const attempt = test.attempts?.[0];
    if (!attempt || attempt.status !== 'passed' || attempt.retry !== 0 || attempt.errorCount !== 0) failures.push(`Failed/skipped/flaky/retried case: ${test.id}`);
    for (const type of requiredEvidence) {
      const matches = (attempt?.attachments || []).filter((attachment) => attachment.name === type);
      if (!matches.length) failures.push(`Missing ${type} evidence: ${test.id}`);
      for (const item of matches) {
        const target = path.resolve(root, item.path);
        if (!item.path || !target.startsWith(path.resolve(root) + path.sep) || !existsSync(target) || lstatSync(target).isSymbolicLink() || lstatSync(target).size === 0) failures.push(`Invalid ${type} evidence: ${test.id}`);
      }
    }
  }
  for (const id of expectedIds) if (!actualIds.has(id)) failures.push(`Missing execution: ${id}`);
  for (const caseId of requiredCases) {
    if (!expected.some((test) => test.title.includes(caseId) || test.tags?.includes(caseId))) failures.push(`Required acceptance case not inventoried: ${caseId}`);
  }
  if (execution.status !== 'passed' || execution.globalErrorCount !== 0) failures.push('Playwright run did not finish passed with zero global errors');
  return failures;
}
