import { readFileSync } from 'node:fs';
import { parseArgs, required, sha256 } from './report-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const name = required(args, 'name');
const lines = readFileSync(required(args, 'checksums'), 'utf8').split(/\r?\n/);
const line = lines.find((item) => item.trim().split(/\s+/)[1]?.replace(/^\*/, '') === name);
const digest = line?.trim().split(/\s+/)[0];
if (!/^[a-f0-9]{64}$/i.test(digest || '') || sha256(readFileSync(required(args, 'archive'))) !== digest.toLowerCase()) {
  throw new Error('Pinned Supabase CLI archive checksum mismatch');
}
console.log('Pinned Supabase CLI archive checksum verified');
