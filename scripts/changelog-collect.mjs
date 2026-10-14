#!/usr/bin/env node
/**
 * changelog-collect.mjs — يلخص التغييرات غير المُصدرة من changelog/fragments/
 *
 * يقرأه الوكيل عند بدء الجلسة (20 سطراً بدل 361KB).
 * الاستخدام:
 *   node scripts/changelog-collect.mjs              # نص عربي موجز
 *   node scripts/changelog-collect.mjs --json        # JSON للاستهلاك الآلي
 *   node scripts/changelog-collect.mjs --since v1.15.1  # (محجوز للمستقبل)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FRAG_DIR = join(ROOT, 'changelog', 'fragments');
const asJson = process.argv.includes('--json');

function parseFragment(file) {
  const raw = readFileSync(join(FRAG_DIR, file), 'utf8');
  // frontmatter بين --- و ---
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { file, error: 'تنسيق frontmatter غير صحيح (توقع --- ... ---)' };
  const fm = m[1];
  const body = m[2].trim();
  const type = (fm.match(/^\s*type:\s*(\S+)/m) || [])[1] || '';
  const scope = (fm.match(/^\s*scope:\s*(\S+)/m) || [])[1] || '';
  const filesBlock = fm.match(/related_files:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
  const related = filesBlock
    ? filesBlock[1]
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean)
    : [];
  return { file, type, scope, related_files: related, body, raw };
}

function main() {
  if (!existsSync(FRAG_DIR)) {
    if (asJson) console.log(JSON.stringify({ fragments: [], count: 0 }));
    else console.log('لا توجد مجلد fragments — لا تغييرات غير مُصدرة.');
    return;
  }
  const files = readdirSync(FRAG_DIR).filter((f) => f.endsWith('.md') && f !== '_template.md' && f !== '.gitkeep');
  if (!files.length) {
    if (asJson) console.log(JSON.stringify({ fragments: [], count: 0 }));
    else console.log('لا توجد fragments — لا تغييرات غير مُصدرة.');
    return;
  }
  files.sort();
  const parsed = files.map(parseFragment);
  if (asJson) {
    console.log(JSON.stringify({ count: parsed.length, fragments: parsed }, null, 2));
    return;
  }
  console.log(`\n📦 التغييرات غير المُصدرة: ${parsed.length} fragment(s)\n`);
  for (const p of parsed) {
    if (p.error) {
      console.log(`  ⛔ ${p.file}: ${p.error}`);
      continue;
    }
    const firstLine = p.body.split(/\r?\n/)[0]?.slice(0, 100) || '(فارغ)';
    console.log(`  • [${p.type}/${p.scope}] ${p.file}`);
    console.log(`    ${firstLine}`);
    if (p.related_files.length) console.log(`    ↳ ${p.related_files.join(', ')}`);
  }
  console.log('');
}

main();
