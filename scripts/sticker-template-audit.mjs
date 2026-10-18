#!/usr/bin/env node
/**
 * sticker-template-audit.mjs — تدقيق ثابت لقوالب الملصقات.
 *
 * يقرأ ملفات القوالب (بلا تشغيل React أو DOM) ويطبع:
 *  - عدد القوالب لكل ملف.
 *  - القوالب التي تملك defaultMm صريحاً.
 *  - تغطية data-field-id و data-color-role (مؤشرات الربط التفاعلي).
 *
 * الاستخدام: node scripts/sticker-template-audit.mjs [--json]
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = join(root, 'frontend/src/features/stickers/templates');
const files = readdirSync(templatesDir)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'svg-elements.ts')
  .sort();

const TEMPLATE_ID = /^\s{4}id:\s*["']([^"']+)["'],\s*$/gm;

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

function extractBlocks(text) {
  const matches = [...text.matchAll(TEMPLATE_ID)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    return { id: match[1], block: text.slice(start, end) };
  });
}

const rows = [];
const missingMm = [];

for (const file of files) {
  const text = readFileSync(join(templatesDir, file), 'utf8');
  const blocks = extractBlocks(text);
  const withoutMm = blocks.filter((b) => !/^\s{4}defaultMm:\s*\{/m.test(b.block)).map((b) => b.id);
  missingMm.push(...withoutMm.map((id) => ({ file, id })));
  rows.push({
    file,
    templates: blocks.length,
    withMm: blocks.length - withoutMm.length,
    withoutMm: withoutMm.length,
    fieldAnchors: countMatches(text, /data-field-id=/g),
    colorAnchors: countMatches(text, /data-color-role=/g),
    generateSvg: countMatches(text, /generateSvg\s*:/g),
  });
}

const totals = rows.reduce(
  (acc, row) => ({
    templates: acc.templates + row.templates,
    withMm: acc.withMm + row.withMm,
    withoutMm: acc.withoutMm + row.withoutMm,
    fieldAnchors: acc.fieldAnchors + row.fieldAnchors,
    colorAnchors: acc.colorAnchors + row.colorAnchors,
    generateSvg: acc.generateSvg + row.generateSvg,
  }),
  { templates: 0, withMm: 0, withoutMm: 0, fieldAnchors: 0, colorAnchors: 0, generateSvg: 0 },
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ totals, rows, missingMm }, null, 2));
  process.exit(0);
}

const lines = [
  '# تدقيق قوالب الملصقات — تقرير آلي',
  '',
  '> مُولَّد بـ `node scripts/sticker-template-audit.mjs`. لا يُعدَّل يدوياً.',
  '',
  '## الإجمالي',
  '',
  `- القوالب: **${totals.templates}**`,
  `- لديها \`defaultMm\` صريح: **${totals.withMm}**`,
  `- بلا مقاس فيزيائي صريح: **${totals.withoutMm}**`,
  `- مراسي \`data-field-id\`: **${totals.fieldAnchors}**`,
  `- مراسي \`data-color-role\`: **${totals.colorAnchors}**`,
  `- نداءات \`generateSvg\`: **${totals.generateSvg}**`,
  '',
  '## التوزيع حسب الملف',
  '',
  '| الملف | القوالب | defaultMm | بلا مقاس | field-id | color-role |',
  '|---|---:|---:|---:|---:|---:|',
  ...rows.map(
    (r) =>
      `| \`${r.file}\` | ${r.templates} | ${r.withMm} | ${r.withoutMm} | ${r.fieldAnchors} | ${r.colorAnchors} |`,
  ),
  '',
  '## قوالب بلا مقاس فيزيائي صريح',
  '',
];

if (missingMm.length === 0) {
  lines.push('لا يوجد — كل القوالب تملك `defaultMm`.');
} else {
  lines.push('| الملف | المعرّف |', '|---|---|');
  for (const item of missingMm) lines.push(`| \`${item.file}\` | \`${item.id}\` |`);
}

console.log(lines.join('\n'));
