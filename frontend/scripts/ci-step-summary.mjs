#!/usr/bin/env node
/**
 * ملخّص خطوة CI صادق.
 *
 * السبب: كانت ملخّصات ci.yml جداول مكتوبة يدوياً تطبع "✅" وأرقاماً ثابتة
 * (مثل "67 Files / 469 Tests Passed") مع `if: always()` — فتبدو المهمة ناجحة
 * في لوحة الملخّص حتى وهي فاشلة. هذا السكربت يطبع النتيجة الفعلية لكل خطوة
 * من `steps.<id>.outcome`، وأرقام التغطية الحقيقية من coverage-summary.json.
 *
 * الاستخدام:
 *   node scripts/ci-step-summary.mjs \
 *     --title "Frontend Quality & Tests" \
 *     --note "..." \
 *     --row "TypeScript Typecheck=${{ steps.typecheck.outcome }}" \
 *     --coverage coverage/coverage-summary.json
 */
import { appendFileSync, readFileSync } from 'node:fs';

const BADGE = {
  success: '✅ Passed',
  failure: '❌ Failed',
  skipped: '⏭️ Skipped',
  cancelled: '🚫 Cancelled',
};

function readArgs(argv) {
  const args = { title: 'CI Summary', note: null, coverage: null, rows: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--title') {
      args.title = value;
      i += 1;
    } else if (flag === '--note') {
      args.note = value;
      i += 1;
    } else if (flag === '--coverage') {
      args.coverage = value;
      i += 1;
    } else if (flag === '--row') {
      args.rows.push(value);
      i += 1;
    }
  }
  return args;
}

/** "الوسم=success" → "✅ Passed" — وأي قيمة غير متوقّعة تُعرض كما هي بلا تزويق */
function badge(outcome) {
  return BADGE[outcome] ?? `❔ ${outcome || 'unknown'}`;
}

const args = readArgs(process.argv.slice(2));
const target = process.env.GITHUB_STEP_SUMMARY;

if (!target) {
  console.log('[ci-step-summary] GITHUB_STEP_SUMMARY غير متاح — لا شيء ليُكتب');
  process.exit(0);
}

const lines = [`## ${args.title}`, ''];
if (args.note) lines.push(args.note, '');

lines.push('| Check | Status |', '| :--- | :--- |');
for (const row of args.rows) {
  const separator = row.indexOf('=');
  const label = separator === -1 ? row : row.slice(0, separator);
  const outcome = separator === -1 ? '' : row.slice(separator + 1);
  lines.push(`| **${label.trim()}** | ${badge(outcome.trim())} |`);
}

if (args.coverage) {
  try {
    const { total } = JSON.parse(readFileSync(args.coverage, 'utf8'));
    const pct = (key) => `${total[key].pct}%`;
    lines.push(
      '',
      `**التغطية الفعلية:** statements ${pct('statements')} · branches ${pct('branches')} · functions ${pct('functions')} · lines ${pct('lines')}`
    );
  } catch {
    lines.push('', '_لم يتوفّر ملف التغطية (فشلت الاختبارات قبل توليده)._');
  }
}

lines.push('');
appendFileSync(target, `${lines.join('\n')}\n`);
