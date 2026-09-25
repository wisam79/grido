#!/usr/bin/env node
/**
 * quality-metrics.mjs — مقياس جودة الكود القابل لإعادة التشغيل (Grido Studio Quality Report)
 *
 * يُستخدم لتوليد كل رقم في تقارير الجودة (docs/reviews/*) — قاعدة «لا ادعاء بلا دليل»
 * في docs/DOCUMENTATION_MAP.md: كل رقم في التوثيق يجب أن يأتي من أمر قابل للتشغيل.
 *
 * الاستخدام:
 *   node scripts/quality-metrics.mjs              # تقرير عربي مختصر
 *   node scripts/quality-metrics.mjs --top=20     # عدد أكبر من الملفات الأضخم
 *   node scripts/quality-metrics.mjs --json       # مخرجات JSON (للاستهلاك الآلي)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const AS_JSON = ARGS.includes('--json');
const TOP = Number((ARGS.find((a) => a.startsWith('--top=')) || '--top=12').split('=')[1]) || 12;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'bindings',
  'wailsjs',
  'test-results',
  'playwright-report',
]);

function walk(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (entry.isFile() && predicate(entry.name, full)) out.push(full);
  }
  return out;
}

const rel = (file) => relative(ROOT, file).split(sep).join('/');
const countLines = (file) => readFileSync(file, 'utf8').split(/\r?\n/).length;

const AREAS = {
  'frontend/src': () => walk(join(ROOT, 'frontend', 'src'), (n) => /\.(ts|tsx)$/.test(n)),
  'frontend/test': () => walk(join(ROOT, 'frontend', 'test'), (n) => /\.(ts|tsx)$/.test(n)),
  'frontend/e2e': () => walk(join(ROOT, 'frontend', 'e2e'), (n) => /\.ts$/.test(n)),
  'internal (source)': () =>
    walk(join(ROOT, 'internal'), (n) => n.endsWith('.go') && !n.endsWith('_test.go')),
  'internal (tests)': () => walk(join(ROOT, 'internal'), (n) => n.endsWith('_test.go')),
  'admin-web/src': () => walk(join(ROOT, 'admin-web', 'src'), (n) => /\.(ts|tsx)$/.test(n)),
  scripts: () => walk(join(ROOT, 'scripts'), (n) => /\.(mjs|js)$/.test(n)),
};

const MARKERS = {
  ts: {
    'any (نوع صريح)': /:\s*any\b/g,
    'as any (تحويل قسري)': /\bas\s+any\b/g,
    'ts-ignore/ts-expect-error': /@ts-(ignore|expect-error)\b/g,
    'eslint-disable': /eslint-disable/g,
    'console.*': /console\.(log|warn|error|debug|info)\(/g,
    'TODO/FIXME/HACK': /\b(TODO|FIXME|HACK)\b/g,
    'test .only (خطر)': /\.only\(/g,
    'test .skip': /\.(skip|todo)\(/g,
  },
  go: {
    'interface{} (نوع فارغ)': /interface\{\}/g,
    'ignored result (_ =)': /^\s*_ = /gm,
    'panic(': /\bpanic\(/g,
    'log.Fatal': /\blog\.Fatal/g,
    't.Skip': /\bt\.Skip\(/g,
    'TODO/FIXME/HACK': /\b(TODO|FIXME|HACK)\b/g,
    '//nolint': /\/\/nolint/g,
    'json.Unmarshal مهمل': /_ = json\.Unmarshal/g,
  },
};

function countMarkers(files, patterns) {
  const result = {};
  const texts = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  for (const [label, regex] of Object.entries(patterns)) {
    let total = 0;
    const perFile = {};
    for (const { file, text } of texts) {
      const matches = text.match(regex);
      if (matches && matches.length) {
        total += matches.length;
        perFile[rel(file)] = matches.length;
      }
    }
    result[label] = {
      total,
      topFiles: Object.entries(perFile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    };
  }
  return result;
}

/** فحوص المصدر الواحد للحقيقة (AGENTS.md: حظر ازدواجية بلا مبرر). */
const SINGLE_SOURCE = [
  { label: 'clamp', regex: /export (function|const) clamp\b/ },
  { label: 'AtomicWriteFile', regex: /func AtomicWriteFile\(/ },
  { label: 'getSnapPositions', regex: /function getSnapPositions\w*\(|const getSnapPositions\w* =/ },
  { label: 'WORKSPACE_COMMANDS', regex: /WORKSPACE_COMMANDS\s*[:=]/ },
  { label: 'httpDoWithRetry', regex: /func httpDoWithRetry\(/ },
];

function collect() {
  const report = { areas: {}, markers: {}, hotspots: {}, singleSource: [] };
  const allFiles = {};

  for (const [name, list] of Object.entries(AREAS)) {
    const files = list();
    allFiles[name] = files;
    const lines = files.reduce((sum, file) => sum + countLines(file), 0);
    report.areas[name] = { files: files.length, lines };
  }

  report.markers['frontend/src'] = countMarkers(allFiles['frontend/src'], MARKERS.ts);
  report.markers['frontend/test + e2e'] = countMarkers(
    [...allFiles['frontend/test'], ...allFiles['frontend/e2e']],
    MARKERS.ts,
  );
  report.markers['internal'] = countMarkers(allFiles['internal (source)'], MARKERS.go);

  for (const [name, files] of Object.entries(allFiles)) {
    const sized = files
      .map((file) => ({ path: rel(file), lines: countLines(file) }))
      .sort((a, b) => b.lines - a.lines);
    report.hotspots[name] = {
      over500: sized.filter((f) => f.lines > 500).length,
      over800: sized.filter((f) => f.lines > 800).length,
      top: sized.slice(0, TOP),
    };
  }

  const sourceFiles = [...allFiles['frontend/src'], ...allFiles['internal (source)'], ...allFiles['scripts']];
  for (const { label, regex } of SINGLE_SOURCE) {
    const defining = sourceFiles.filter((file) => regex.test(readFileSync(file, 'utf8'))).map(rel);
    report.singleSource.push({ label, definitions: defining });
  }

  return report;
}

const data = collect();

if (AS_JSON) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.log('\n📊 مقاييس جودة Grido Studio — ' + new Date().toISOString().slice(0, 10));
console.log('\n■ الأحجام');
for (const [name, area] of Object.entries(data.areas)) {
  console.log(`  ${name.padEnd(20)} ملف=${String(area.files).padStart(4)}  أسطر=${area.lines}`);
}

const frontSrc = data.areas['frontend/src'].lines;
const frontTests = data.areas['frontend/test'].lines + data.areas['frontend/e2e'].lines;
const goSrc = data.areas['internal (source)'].lines;
const goTests = data.areas['internal (tests)'].lines;
console.log('\n■ نسبة الاختبارات إلى المصدر');
console.log(`  الواجهة:  ${(frontTests / frontSrc).toFixed(2)}  (اختبارات ${frontTests} / مصدر ${frontSrc})`);
console.log(`  الخلفية:  ${(goTests / goSrc).toFixed(2)}  (اختبارات ${goTests} / مصدر ${goSrc})`);

for (const [area, markers] of Object.entries(data.markers)) {
  console.log(`\n■ مؤشرات — ${area}`);
  for (const [label, info] of Object.entries(markers)) {
    if (!info.total) continue;
    const top = info.topFiles.map(([file, n]) => `${file}(${n})`).join(', ');
    console.log(`  ${label.padEnd(26)} ${String(info.total).padStart(4)}   ${top}`);
  }
}

console.log(`\n■ الملفات الأضخم (أعلى ${TOP})`);
for (const [area, info] of Object.entries(data.hotspots)) {
  if (!info.top.length) continue;
  console.log(`  ${area}: >500 سطر=${info.over500} · >800 سطر=${info.over800}`);
  for (const file of info.top) console.log(`    ${String(file.lines).padStart(5)}  ${file.path}`);
}

console.log('\n■ فحوص المصدر الواحد للحقيقة');
for (const item of data.singleSource) {
  const status = item.definitions.length <= 1 ? '✅' : '⚠️';
  console.log(
    `  ${status} ${item.label}: ${item.definitions.length} تعريف — ${item.definitions.join(' | ') || '—'}`,
  );
}
console.log('');
