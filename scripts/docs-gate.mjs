#!/usr/bin/env node
/**
 * docs-gate.mjs — بوابة التوثيق الإلزامية (Grido Studio Documentation Sync Gate)
 *
 * المرجع الحاكم: docs/DOCUMENTATION_MAP.md · القاعدة: .agents/AGENTS.md
 * المهارة: .agents/skills/grido-docs-sync-guard/SKILL.md
 *
 * الفحوص:
 *   1) انحراف الأرقام المرجعية (بلوك docs-metrics في الخريطة) مقابل الواقع الفعلي.
 *   2) تغطية الجرد: كل ملف في docs/*.md وكل مجلد فرعي تحت docs/ مُدرَج في الخريطة.
 *   3) كومت/دفعة تغيّر كوداً بلا أي تحديث توثيق مرافق.
 *   4) (تحذيري) سلامة مراجع المسارات في .agents/AGENTS.md والمهارات — صارم مع --strict-refs.
 *   5) تأكيدات التحقق على مستوى الكود (code-assertions) — بنود BUGS_REPORT.md التي
 *      وُسمت ✅ يجب أن تبقى مُثبتة بالأسطر، وإلا فشلت البوابة.
 *
 * الاستخدام:
 *   node scripts/docs-gate.mjs                 # قبل الكومت (يفحص الملفات المُجهَّزة)
 *   node scripts/docs-gate.mjs --push          # قبل الدفع (مدى الكومتات غير المدفوعة)
 *   node scripts/docs-gate.mjs --strict-refs   # فحص صارم لمراجع المسارات
 *   node scripts/docs-gate.mjs --ci            # داخل CI (لا يفشل عند غياب تاريخ git)
 *   GRIDO_DOCS_GATE=off                        # تخطٍّ طارئ مبرَّر (يُذكر السبب في رسالة الكومت)
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = join(ROOT, 'docs', 'DOCUMENTATION_MAP.md');
const ARGS = process.argv.slice(2);
const MODE_PUSH = ARGS.includes('--push');
const STRICT_REFS = ARGS.includes('--strict-refs');
const IN_CI = ARGS.includes('--ci') || String(process.env.CI || '') === 'true';
const DISABLED = String(process.env.GRIDO_DOCS_GATE || '').toLowerCase() === 'off';

const useColor = !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const colors = {
  red: (t) => paint('31', t),
  green: (t) => paint('32', t),
  yellow: (t) => paint('33', t),
  cyan: (t) => paint('36', t),
  dim: (t) => paint('2', t),
};

const errors = [];
const warnings = [];
const notes = [];

function walk(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (entry.isFile() && predicate(entry.name, full)) out.push(full);
  }
  return out;
}

/** الأرقام المرجعية القابلة للعدّ من نظام الملفات (سريعة وحتمية). */
function collectMetrics() {
  const isUnitTest = (name) => /\.(test|spec)\.(ts|tsx)$/.test(name);
  return {
    vitest_test_files:
      walk(join(ROOT, 'frontend', 'test'), isUnitTest).length +
      walk(join(ROOT, 'frontend', 'src'), isUnitTest).length,
    e2e_spec_files: walk(join(ROOT, 'frontend', 'e2e'), (name) => /\.spec\.ts$/.test(name)).length,
    go_test_files: walk(join(ROOT, 'internal'), (name) => /_test\.go$/.test(name)).length,
    docs_files: readdirSync(join(ROOT, 'docs'), { withFileTypes: true }).filter(
      (e) => e.isFile() && e.name.endsWith('.md'),
    ).length,
  };
}

function readMetricsBlock(mapText) {
  const match = mapText.match(/```docs-metrics\r?\n([\s\S]*?)```/);
  if (!match) return null;
  const metrics = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, value] = trimmed.split('=');
    if (key && value !== undefined) metrics[key.trim()] = Number(value.trim());
  }
  return metrics;
}

function runGit(command) {
  try {
    return execSync(command, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function firstNonEmpty(lists) {
  for (const list of lists) {
    if (list && list.length) return list;
  }
  return [];
}

function changedFiles() {
  if (!MODE_PUSH) return runGit('git diff --cached --name-only') || [];

  if (IN_CI) {
    // في CI لا يوجد upstream — نجرّب مدى فرع main ثم آخر كومت.
    const lists = ['git diff --name-only origin/main...HEAD', 'git diff --name-only HEAD~1..HEAD']
      .map(runGit)
      .filter((list) => list !== null);
    return firstNonEmpty(lists);
  }

  // محلياً: upstream هو المصدر الحاكم (فارغ = لا شيء للدفع ⇒ لا فحص).
  const upstream = runGit('git diff --name-only @{u}..HEAD');
  if (upstream !== null) return upstream;

  const fallback = ['git diff --name-only origin/main...HEAD', 'git diff --name-only HEAD~1..HEAD']
    .map(runGit)
    .filter((list) => list !== null);
  return firstNonEmpty(fallback);
}

function checkMetrics(mapText) {
  const documented = readMetricsBlock(mapText);
  if (!documented) {
    errors.push('لا يوجد بلوك ```docs-metrics``` في docs/DOCUMENTATION_MAP.md — أضفه ووثّق الأرقام المرجعية.');
    return;
  }
  const actual = collectMetrics();
  for (const [key, expected] of Object.entries(documented)) {
    const real = actual[key];
    if (real === undefined) {
      warnings.push(`مِفتاح أرقام غير معروف في الخريطة: ${key} (لا يقابله عدّ فعلي).`);
      continue;
    }
    if (real !== expected) {
      errors.push(
        `انحراف رقم مرجعي: ${key} موثَّق=${expected} والواقع=${real} — حدّث بلوك docs-metrics في docs/DOCUMENTATION_MAP.md.`,
      );
    }
  }
}

function checkInventory(mapText) {
  const docsDir = join(ROOT, 'docs');
  const required = [
    'README.md',
    'CHANGELOG.md',
    'SECURITY_NOTICE.md',
    'BUGS_REPORT.md',
    '.agents/AGENTS.md',
    '.agents/skills/',
  ];
  for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) required.push(`docs/${entry.name}/`);
    else if (entry.name.endsWith('.md')) required.push(`docs/${entry.name}`);
  }
  const missing = required.filter((item) => !mapText.includes(item));
  if (missing.length) {
    errors.push(`مستندات/مجلدات غير مُسجَّلة في جرد docs/DOCUMENTATION_MAP.md:\n    - ${missing.join('\n    - ')}`);
  } else {
    notes.push(`الجرد مكتمل (${required.length} مدخلاً).`);
  }
}

const SOURCE_PATTERNS = [
  'internal/',
  'frontend/src/',
  'frontend/scripts/',
  'frontend/e2e/',
  'admin-web/src/',
  'modal_ai/',
  'supabase/',
  'build/',
  'scripts/',
  '.github/workflows/',
  'main.go',
  'app.go',
  'Taskfile.yml',
  'build.ps1',
  'window_state.go',
];

const DOC_PATTERNS = ['CHANGELOG.md', 'README.md', 'docs/', '.agents/', 'SECURITY_NOTICE.md', 'BUGS_REPORT.md'];

function checkDocumentedCommit() {
  const files = changedFiles();
  if (!files.length) {
    notes.push(
      MODE_PUSH
        ? 'لا كومتات غير مدفوعة تحتاج فحصاً — اقتُصر الفحص على الأرقام والجرد.'
        : 'لا ملفات مُجهَّزة للكومت — اقتُصر الفحص على الأرقام والجرد.',
    );
    return;
  }
  const sourceTouched = files.filter((file) => SOURCE_PATTERNS.some((p) => file === p || file.startsWith(p)));
  const docsTouched = files.filter((file) => DOC_PATTERNS.some((p) => file === p || file.startsWith(p)));
  if (sourceTouched.length && !docsTouched.length) {
    errors.push(
      `هذه التغييرات تمسّ الكود بلا أي تحديث توثيق مرافق (${sourceTouched.length} ملفاً):\n` +
        `    - ${sourceTouched.slice(0, 8).join('\n    - ')}${sourceTouched.length > 8 ? '\n    - …' : ''}\n` +
        '    المطلوب: حدّث CHANGELOG.md تحت [Unreleased] + المستند المعني وفق مصفوفة المزامنة في docs/DOCUMENTATION_MAP.md.',
    );
  } else if (sourceTouched.length) {
    notes.push(`كومت موثَّق: ${sourceTouched.length} ملف كود + ${docsTouched.length} ملف توثيق.`);
  }
}

const REF_ROOTS = [
  '.agents/',
  'frontend/',
  'internal/',
  'docs/',
  'scripts/',
  'supabase/',
  'modal_ai/',
  'build/',
  'admin-web/',
  'bin/',
  '.github/',
];

function checkSkillReferences(mapText) {
  const ignoreMatch = mapText.match(/<!--\s*docs-gate:ignore-refs([\s\S]*?)-->/);
  const ignoreList = (ignoreMatch ? ignoreMatch[1].replace(/\([^)]*\)/g, '') : '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const targets = [join(ROOT, '.agents', 'AGENTS.md')];
  const skillsDir = join(ROOT, '.agents', 'skills');
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = join(skillsDir, entry.name, 'SKILL.md');
      if (existsSync(skillFile)) targets.push(skillFile);
    }
  }

  const missing = new Set();
  for (const file of targets) {
    const text = readFileSync(file, 'utf8');
    for (const raw of text.matchAll(/`([^`\n]+)`/g)) {
      let token = raw[1].trim().replace(/^["'(]+|["'),.;]+$/g, '');
      token = token.replace(/:\d+(-\d+)?$/, '');
      if (!token.includes('/')) continue;
      if (!REF_ROOTS.some((root) => token.startsWith(root))) continue;
      if (/[*{}<>|$=\s]/.test(token) || token.includes('...')) continue;
      if (ignoreList.some((ignored) => token === ignored || token.startsWith(ignored))) continue;
      if (!existsSync(join(ROOT, token))) missing.add(`${token}  ←  ${file.replace(ROOT, '.')}`);
    }
  }

  if (missing.size) {
    const list = [...missing].sort();
    const message =
      `مراجع مسارات غير موجودة في .agents/ (${list.length}):\n    - ${list.slice(0, 12).join('\n    - ')}` +
      `${list.length > 12 ? '\n    - …' : ''}`;
    if (STRICT_REFS) errors.push(message);
    else warnings.push(`${message}\n    (تحذير فقط — شغّل --strict-refs لجعلها مُعِقة.)`);
  } else {
    notes.push('كل مراجع المسارات في AGENTS.md والمهارات موجودة فعلياً.');
  }
}

/**
 * تأكيدات التحقق على مستوى الكود (code-assertions).
 *
 * كل بند وُسم ✅ في BUGS_REPORT.md أو ثوابت معمارية في AGENTS.md يجب أن يبقى
 * مُثبتاً بالأسطر الفعلية. هنا نُثبّت الأدلة الحاسمة كي لا يعود الانحراف صامتاً:
 * إرجاع عيب «مُصلح» إلى التسريب يجب أن يُفشل البناء، لا أن يمر كادعاء قديم.
 *
 * form: { file, mustContain: string[], mustNotContain: string[] }
 */
const CODE_ASSERTIONS = [
  {
    label: 'BUG-CRIT-01 — لا خصم مزدوج لحصة AI (تسجيل واحد في Modal فقط)',
    file: 'internal/service/ai_service.go',
    mustContain: ['callAIUsageRPC(token, userID, inputImageBytes, true)'],
    mustNotContain: ['callAIUsageRPC(token, userID, inputImageBytes, false)'],
  },
  {
    label: 'BUG-HIGH-04 — فساد autosave.json يُرجَع خطأً فيوقف التنظيف',
    file: 'internal/repository/db.go',
    mustContain: ['corrupt autosave.json encountered'],
  },
  {
    label: 'BUG-CRIT-02 — SignPath: تعريف SIGNPATH_* في env على مستوى الـ job مرة واحدة فقط',
    file: '.github/workflows/release.yml',
    mustContain: ['SIGNPATH_API_TOKEN: ${{ secrets.SIGNPATH_API_TOKEN }}'],
    // لا يجوز أن يُعاد تعريف التوكن داخل خطوة — عندئود يفشل `env.` في `if:`
    // أو يفشل التوقيع بصمت. مرة واحدة فقط = مستوى الـ job (`:16-18`).
    count: [{ needle: 'SIGNPATH_API_TOKEN: ${{ secrets.SIGNPATH_API_TOKEN }}', equals: 1 }],
  },
  {
    label: 'BUG-MED-07 — تجريد الرموز -w -s في مسار الإنتاج',
    file: 'build/windows/Taskfile.yml',
    mustContain: ['-ldflags="-w -s -H windowsgui'],
  },
  {
    label: 'BUG-MED-01 — كتابة ذرية في تصدير الطباعة وحفظ حالة النافذة',
    file: 'internal/service/print_export.go',
    mustContain: ['exportsCleanup.CompareAndSwap(false, true)', 'utils.CreateAtomic('],
  },
  {
    label: 'BUG-LOW-08 / BUG-MED-01 — كتابة ذرية لحفظ window.json',
    file: 'window_state.go',
    mustContain: ['utils.AtomicWriteFile('],
  },
  {
    label: 'BUG-MED-02 — معاينات print_* تُوجَّه إلى Exports/ في GetImageDimensions',
    file: 'internal/service/media_service.go',
    mustContain: ['strings.HasPrefix(filename, "print_")', 'utils.CreateAtomic('],
  },
  {
    label: 'BUG-CRIT-03 — فحص data:image/ قبل SaveImageFromBase64',
    file: 'frontend/src/components/editor/properties/panels/image-properties.tsx',
    mustContain: ['b64.startsWith("data:image/")'],
  },
  {
    label: 'BUG-MED-03 — تجميع أوامر Canvas 2D لخطوط القص بدل stroke لكل خط',
    file: 'frontend/src/lib/export/export-canvas-collage.ts',
    mustContain: ['const strokeBatch = (lines: typeof cutLines', 'strokeBatch(regularLines'],
  },
  {
    label: 'BUG-LOW-01/02/03 — مكونات وصولية موحّدة في نافذة عزل الخلفية',
    file: 'frontend/src/components/editor/dialogs/refine-bg-dialog.tsx',
    mustContain: ['DialogCloseButton', 'FluentSliderField'],
    mustNotContain: ['<input type="range"'],
  },
  {
    label: 'BUG-LOW-06 — وسم NSIS الصريح بدل القفز الصفري',
    file: 'build/windows/installer/project.nsi',
    mustContain: ['IfSilent is_silent done'],
  },
  {
    label: 'F-01 — حدّ الحصة اليومية موحّد على المصدر الخادمي (يوم UTC + مزامنة المرآة + حقن القيم)',
    file: 'internal/service/ai_service.go',
    mustContain: [
      'func aiUsageDayKey(t time.Time) string',
      'return t.UTC().Format("2006-01-02")',
      'GlobalAIRateLimiter.Sync(tokenHash, snapshot.UsedToday)',
      'injectServerQuota(body, serverUsedToday, serverLimit)',
      'entry.Count > entry.Baseline',
    ],
    // اليوم المحلي في المُقيِّد كان سبب التناقض المرئي (03:00 vs 00:00 بتوقيت UTC+3)
    mustNotContain: ['time.Now().Format("2006-01-02")'],
  },
  {
    label: 'F-01 (واجهة) — يوم الحصة UTC ومنطق حسم واحد بلا اشتقاق محلي موازٍ',
    file: 'frontend/src/lib/ai/quota.ts',
    mustContain: [
      'export function aiUtcDayKey',
      'return now.toISOString().slice(0, 10)',
      'export function resolveAiQuota',
      'export function parseQuotaSnapshotFromResponse',
    ],
  },
  {
    label: 'F-02 — تحصين تفكيك VDP: سقف صفوف للتفكيك نفسه + سقف حجم + منع أسماء أعمدة خطرة',
    file: 'frontend/src/features/stickers/lib/vdp-parser.ts',
    mustContain: [
      'export const VDP_MAX_FILE_BYTES',
      'export const VDP_PARSE_ROW_LIMIT = VDP_MAX_ROWS + 1',
      'sheetRows: VDP_PARSE_ROW_LIMIT',
      'preview: VDP_PARSE_ROW_LIMIT',
      "const DANGEROUS_COLUMN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])",
    ],
  },
  {
    label: 'F-04 — قراءة .env من مجلد العمل مقصورة على وضع التطوير (لا اعتماد على CWD في الإنتاج)',
    file: 'internal/service/license_service.go',
    mustContain: [
      'func loadEnvConfigFile(appDir string, allowCwdFallback bool) map[string]string',
      'if !allowCwdFallback {',
      'loadEnvConfigFile(utils.GetAppDir(), serviceDevBuild || utils.IsDevEnvironment())',
    ],
  },
  {
    label: 'BUG-MED-10 — حد أدنى لأهداف اللمس h-7 w-7',
    file: 'frontend/src/components/editor/dialogs/print-dialog.tsx',
    mustContain: ['h-7 w-7'],
    mustNotContain: ['h-5 w-5', 'h-6 w-6'],
  },
];

function checkCodeAssertions() {
  const missingFiles = [];
  for (const assertion of CODE_ASSERTIONS) {
    const full = join(ROOT, ...assertion.file.split('/'));
    if (!existsSync(full)) {
      missingFiles.push(`${assertion.file}  ←  ${assertion.label}`);
      continue;
    }
    const text = readFileSync(full, 'utf8');
    const lines = text.split(/\r?\n/);
    const hits = (needle) => lines.findIndex((line) => line.includes(needle)) + 1;

    for (const needle of assertion.mustContain ?? []) {
      if (hits(needle) === 0) {
        errors.push(
          `انحراف تأكيد كود (${assertion.label}):\n` +
            `    العبارة المفترضة غير موجودة: ${needle}\n` +
            `    في الملف: ${assertion.file}`,
        );
      }
    }
    for (const needle of assertion.mustNotContain ?? []) {
      const line = hits(needle);
      if (line > 0) {
        errors.push(
          `انحراف تأكيد كود (${assertion.label}):\n` +
            `    عبارة ممنوعة عادت للملف ${assertion.file}:${line} ⇒ ${needle}\n` +
            '    إن كان العيب قد عاد فعلاً فحدّث BUGS_REPORT.md بتصحيح مؤرَّخ؛ لا تُسقط التأكيد.',
        );
      }
    }
    for (const rule of assertion.count ?? []) {
      const found = lines.filter((line) => line.includes(rule.needle)).length;
      if (found !== rule.equals) {
        errors.push(
          `انحراف تأكيد كود (${assertion.label}):\n` +
            `    تكرار غير متوقع لعبارة في ${assertion.file}: المتوقع ${rule.equals} والواقع ${found}\n` +
            `    ⇒ ${rule.needle}`,
        );
      }
    }
  }

  if (missingFiles.length) {
    errors.push(
      `ملفات مفترضة لتأكيدات التحقق غير موجودة (${missingFiles.length}):\n    - ${missingFiles.join('\n    - ')}`,
    );
  } else {
    notes.push(`تأكيدات التحقق على الكود سليمة (${CODE_ASSERTIONS.length} تأكيداً).`);
  }
}

function main() {
  console.log(colors.cyan(`\n📚 بوابة التوثيق (docs-gate) — الوضع: ${MODE_PUSH ? 'قبل الدفع' : 'قبل الكومت'}`));

  if (DISABLED) {
    console.log(colors.yellow('  ⚠️  GRIDO_DOCS_GATE=off — تم تخطّي البوابة (يجب تبريره في رسالة الكومت).\n'));
    process.exit(0);
  }

  if (!existsSync(MAP_PATH)) {
    console.log(colors.red('  ⛔ docs/DOCUMENTATION_MAP.md غير موجود — لا يمكن التحقق من التوثيق.\n'));
    process.exit(1);
  }

  const mapText = readFileSync(MAP_PATH, 'utf8');
  checkMetrics(mapText);
  checkInventory(mapText);
  checkDocumentedCommit();
  checkSkillReferences(mapText);
  checkCodeAssertions();

  for (const note of notes) console.log(colors.dim(`  · ${note}`));
  for (const warning of warnings) console.log(colors.yellow(`  ⚠️  ${warning}`));
  for (const error of errors) console.log(colors.red(`  ⛔ ${error}`));

  if (errors.length) {
    console.log(
      colors.red(
        `\n  ❌ فشلت بوابة التوثيق (${errors.length} خطأ). راجع docs/DOCUMENTATION_MAP.md — القسم 2 (المصفوفة) والقسم 3 (البوابات).\n`,
      ),
    );
    process.exit(1);
  }

  console.log(colors.green('\n  ✅ التوثيق متزامن مع الكود — البوابة ناجحة.\n'));
}

main();
