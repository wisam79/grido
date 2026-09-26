#!/usr/bin/env node
/**
 * release.mjs — مصدر واحد لرفع الإصدار ومنع انحراف نسخه بين الملفات.
 *
 * المشكلة التي يحلّها (مثبتة 2026-09-26): الإصدار مبعثر في ستة ملفات
 * (`build/config.yml` · `build/windows/info.json` · `build/windows/installer/project.nsi`
 * · `build/windows/Taskfile.yml` · `frontend/package.json` · `frontend/package-lock.json`)
 * فكان الرفع اليدوي يعرّض أي ملف للتخلّف عن الوسم/البناء.
 *
 * الاستخدام:
 *   node scripts/release.mjs --check                 # يتحقق أن كل الملفات متوافقة مع build/config.yml
 *   node scripts/release.mjs patch                   # يرفع patch ويكتب الملفات + يرقّي CHANGELOG
 *   node scripts/release.mjs minor --summary "…"     # ويُنشئ التزام ووسم إصدار (افتراضياً)
 *   node scripts/release.mjs 2.0.0 --no-git          # إصدار صريح بلا git
 *   node scripts/release.mjs patch --push            # يرفع ثم يدفع main والوسم إلى origin
 *   node scripts/release.mjs patch --dry-run         # يعرض ما سيحدث بلا كتابة
 *
 * ملاحظة CI: شغّل `--check` في البوابات (انظر .github/workflows/ci.yml).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = 'CHANGELOG.md';
const CONFIG_FILE = 'build/config.yml';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const positional = args.find((a) => !a.startsWith('--') && (['major', 'minor', 'patch'].includes(a) || /^\d+\.\d+\.\d+$/.test(a)));

const DRY_RUN = has('--dry-run');
const NO_GIT = has('--no-git');
const PUSH = has('--push');
const CHECK = has('--check');
const SUMMARY = valueOf('--summary', '');

const abs = (rel) => join(ROOT, rel);
const read = (rel) => readFileSync(abs(rel), 'utf8');
const errors = [];

/** كل مصادر الحقيقة للإصدار: قراءة (get) وكتابة (set) لكل ملف. */
const TARGETS = [
  {
    file: CONFIG_FILE,
    get: (t) => t.match(/version:\s*"([\d.]+)"/)?.[1],
    set: (t, v) => t.replace(/(\n\s*version:\s*)"[\d.]+"/, `$1"${v}"`),
  },
  {
    file: 'build/windows/info.json',
    get: (t) => t.match(/"file_version":\s*"([\d.]+)"/)?.[1],
    set: (t, v) => t.replace(/("(?:file_version|product_version|FileVersion|ProductVersion)":\s*)"[\d.]+"/g, `$1"${v}"`),
    countPattern: /"(?:file_version|product_version|FileVersion|ProductVersion)":\s*"[\d.]+"/g,
    expectReplacements: 4,
  },
  {
    file: 'build/windows/installer/project.nsi',
    get: (t) => t.match(/INFO_PRODUCTVERSION\s+"([\d.]+)"/)?.[1],
    set: (t, v) => t.replace(/(INFO_PRODUCTVERSION\s+)"[\d.]+"/, `$1"${v}"`),
  },
  {
    file: 'build/windows/Taskfile.yml',
    get: (t) => t.match(/default\s+"v([\d.]+)"/)?.[1],
    set: (t, v) => t.replace(/(default\s+")v[\d.]+(")/, `$1v${v}$2`),
  },
  {
    // القيمة الاحتياطية في build.ps1 تُستخدم فقط عند غياب أي وسم git؛ نُبقيها متزامنة.
    file: 'build.ps1',
    get: (t) => t.match(/appVersion\s*=\s*"v([\d.]+)"/)?.[1],
    set: (t, v) => t.replace(/(appVersion\s*=\s*")v[\d.]+(")/, `$1v${v}$2`),
  },
  {
    file: 'frontend/package.json',
    get: (t) => t.match(/^\s*"version":\s*"([\d.]+)"/m)?.[1],
    set: (t, v) => t.replace(/^(\s*"version":\s*)"[\d.]+"/m, `$1"${v}"`),
  },
  {
    file: 'frontend/package-lock.json',
    // القفل يحوي نسخ الحزم أيضاً؛ نقرأ الإصدارين الجذريين فقط ونكتبهما بعدّ دقيق.
    get: (t) => {
      const lock = JSON.parse(t);
      const root = lock.version;
      const pkg = lock.packages?.['']?.version;
      return root === pkg ? root : `${root}|${pkg}`;
    },
    set: (t, v, current) => {
      const needle = `"version": "${current}"`;
      const count = t.split(needle).length - 1;
      if (count !== 2) {
        throw new Error(`frontend/package-lock.json: توقّعت تكرار "${needle}" مرتين (الجذر + packages[""]) فوجدت ${count}. أعد توليد القفل بـnpm install --package-lock-only.`);
      }
      return t.replaceAll(needle, `"version": "${v}"`);
    },
  },
];

const canonicalVersion = () => {
  const v = TARGETS[0].get(read(CONFIG_FILE));
  if (!v) throw new Error(`${CONFIG_FILE}: تعذّر قراءة info.version`);
  return v;
};

function bump(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  throw new Error(`نوع رفع غير معروف: "${kind}" (استخدم major|minor|patch أو إصداراً صريحاً x.y.z)`);
}

/** يتحقق أن كل الملفات تطابق الإصدار المرجعي، وأن CHANGELOG يحوي قسمه. */
function checkConsistency(expected) {
  const problems = [];
  for (const target of TARGETS) {
    const found = target.get(read(target.file));
    if (found !== expected) {
      problems.push(`${target.file}: الإصدار "${found}" ≠ المرجع "${expected}"`);
    }
  }
  const changelog = read(CHANGELOG);
  if (!changelog.includes(`## [v${expected}]`)) {
    problems.push(`${CHANGELOG}: لا يوجد قسم "## [v${expected}]"`);
  }
  return problems;
}

/** يرقّي قسم [Unreleased] إلى قسم إصدار مؤرّخ (نمط Keep a Changelog) بلا تكرار. */
function promoteChangelog(text, version, date) {
  const header = `## [v${version}] - ${date}`;
  if (text.includes(header)) throw new Error(`${CHANGELOG}: القسم "${header}" موجود مسبقاً`);
  const unreleased = '## [Unreleased]';
  const idx = text.indexOf(unreleased);
  if (idx === -1) throw new Error(`${CHANGELOG}: لا يوجد "${unreleased}"`);
  const at = idx + unreleased.length;
  return `${text.slice(0, at)}\n\n${header}${text.slice(at)}`;
}

function git(...cmd) {
  return execFileSync('git', cmd, { cwd: ROOT, stdio: 'inherit' });
}

function main() {
  const current = canonicalVersion();

  if (CHECK) {
    const problems = checkConsistency(current);
    if (problems.length) {
      console.error(`❌ انحراف إصدار (المرجع ${current}):`);
      for (const p of problems) console.error(`   - ${p}`);
      process.exit(1);
    }
    console.log(`✅ الإصدار ${current} متوافق في كل الملفات و${CHANGELOG}.`);
    return;
  }

  if (!positional) {
    console.error('❌ حدّد نوع الرفع: major | minor | patch أو إصداراً صريحاً x.y.z (أو استخدم --check).');
    process.exit(1);
  }

  const next = bump(current, positional);
  const date = new Date().toISOString().slice(0, 10);
  const tag = `v${next}`;
  const changes = [];

  for (const target of TARGETS) {
    const before = read(target.file);
    const after = target.set(before, next, current);
    if (after === before) {
      errors.push(`${target.file}: لم يتغيّر الإصدار — راجع النمط`);
      continue;
    }
    if (target.countPattern) {
      const found = (before.match(target.countPattern) || []).length;
      if (found !== target.expectReplacements) {
        errors.push(`${target.file}: وجدت ${found} حقل نسخة، المتوقع ${target.expectReplacements}`);
      }
    }
    if (target.get(after) !== next) {
      errors.push(`${target.file}: فشل التحقق بعد الكتابة (الناتج "${target.get(after)}")`);
    }
    changes.push({ file: target.file, after });
  }

  let changelogAfter;
  try {
    changelogAfter = promoteChangelog(read(CHANGELOG), next, date);
  } catch (err) {
    errors.push(err.message);
  }

  console.log(`🔧 الإصدار: ${current} → ${next}  (الوسم ${tag})`);
  for (const c of changes) console.log(`   • ${c.file}`);
  console.log(`   • ${CHANGELOG}`);

  if (errors.length) {
    console.error('\n❌ أخطاء:');
    for (const e of errors) console.error(`   - ${e}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n🧪 --dry-run: لم يُكتب أي ملف.');
    return;
  }

  for (const c of changes) writeFileSync(abs(c.file), c.after);
  writeFileSync(abs(CHANGELOG), changelogAfter);
  console.log(`\n✅ كُتبت ${changes.length + 1} ملفات.`);

  if (NO_GIT) {
    console.log('ℹ️  --no-git: تخطّي الالتزام والوسم. راجع التغييرات ثم: git commit && git tag -a %s', tag);
    return;
  }

  const message = SUMMARY ? `release: ${tag} - ${SUMMARY}` : `release: ${tag}`;
  const files = [...changes.map((c) => c.file), CHANGELOG];
  git('add', ...files);
  git('commit', '-m', message);
  git('tag', '-a', tag, '-m', `Grido Studio ${tag}${SUMMARY ? ` — ${SUMMARY}` : ''}`);
  console.log(`✅ التزام + وسم ${tag}.`);

  if (PUSH) {
    git('push', 'origin', 'main');
    git('push', 'origin', tag);
    console.log(`🚀 دُفع main و${tag} إلى origin.`);
  } else {
    console.log(`ℹ️  للدفع: git push origin main && git push origin ${tag}`);
  }
}

main();
