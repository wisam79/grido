#!/usr/bin/env node
/**
 * release.mjs — مصدر واحد لرفع الإصدار ومنع انحراف نسخه بين الملفات.
 *
 * المشكلة التي يحلّها (مثبتة 2026-09-26): الإصدار مبعثر في ستة ملفات
 * (`build/config.yml` · `build/windows/info.json` · `build/windows/installer/project.nsi`
 * · `build/windows/Taskfile.yml` · `frontend/package.json` · `frontend/package-lock.json`)
 * فكان الرفع اليدوي يعرّض أي ملف للتخلّف عن الوسم/البناء.
 *
 * معمارية Fragments (2026-10-14): الوكيل لا يعدل CHANGELOG.md يدوياً أبداً.
 * كل جلسة تُنشئ ملف fragment واحد في changelog/fragments/*.md، وعند الترفيع
 * يجمع release.mjs كل الـ fragments ويركّب قسم الإصدار الجديد تلقائياً.
 * المرجع: changelog/README.md
 *
 * الاستخدام:
 *   node scripts/release.mjs --check                 # يتحقق أن كل الملفات متوافقة مع build/config.yml
 *   node scripts/release.mjs patch                   # يرفع patch ويكتب الملفات + يجمع fragments
 *   node scripts/release.mjs minor --summary "…"     # ويُنشئ التزام ووسم إصدار (افتراضياً)
 *   node scripts/release.mjs 2.0.0 --no-git          # إصدار صريح بلا git
 *   node scripts/release.mjs patch --push            # يرفع ثم يدفع main والوسم إلى origin
 *   node scripts/release.mjs patch --dry-run         # يعرض ما سيحدث بلا كتابة
 *
 * ملاحظة CI: شغّل `--check` في البوابات (انظر .github/workflows/ci.yml).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = 'CHANGELOG.md';
const CHANGELOG_ARCHIVE = 'CHANGELOG_ARCHIVE.md';
const FRAG_DIR = join(ROOT, 'changelog', 'fragments');
const CONFIG_FILE = 'build/config.yml';
const KEEP_VERSIONS = 5;

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
    // القفل يحوي نسخ الحزم أيضاً؛ نقرأ الإصدارين الجذريين فقط.
    // ملاحظة: قد تتطابق نسخة حزمة ثالثة (مثل @exodus/bytes@1.15.1) صدفةً، لذا
    // لا نعتمد عدّ النص الخام — نحدّث JSON مباشرةً.
    get: (t) => {
      const lock = JSON.parse(t);
      const root = lock.version;
      const pkg = lock.packages?.['']?.version;
      return root === pkg ? root : `${root}|${pkg}`;
    },
    set: (t, v, current) => {
      const lock = JSON.parse(t);
      if (lock.version !== current) throw new Error(`frontend/package-lock.json: الجذر "${lock.version}" ≠ المتوقع "${current}"`);
      if (lock.packages?.['']?.version !== current) throw new Error(`frontend/package-lock.json: packages[""] "${lock.packages?.['']?.version}" ≠ المتوقع "${current}"`);
      lock.version = v;
      lock.packages[''].version = v;
      // الحفاظ على تنسيق npm القياسي (مسافتان + سطر نهائي)
      return JSON.stringify(lock, null, 2) + '\n';
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

// ── Fragment helpers ──────────────────────────────────────────────

const TYPE_SECTION = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Performance',
  refactor: 'Refactored',
  docs: 'Changed',
  security: 'Security',
  removed: 'Removed',
  changed: 'Changed',
};

const SECTION_ORDER = ['feat', 'fix', 'perf', 'security', 'refactor', 'removed', 'changed', 'docs'];

function parseFragmentFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { error: 'تنسيق frontmatter غير صحيح (توقع --- ... ---)' };
  const fm = m[1];
  const body = m[2].trim();
  const type = (fm.match(/^\s*type:\s*(\S+)/m) || [])[1] || '';
  const scope = (fm.match(/^\s*scope:\s*(\S+)/m) || [])[1] || '';
  const filesBlock = fm.match(/related_files:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
  const related = filesBlock
    ? filesBlock[1].split(/\r?\n/).map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
    : [];
  return { type, scope, related_files: related, body, raw };
}

function collectFragments() {
  if (!existsSync(FRAG_DIR)) return [];
  const files = readdirSync(FRAG_DIR).filter((f) => f.endsWith('.md') && f !== '_template.md' && f !== '.gitkeep');
  files.sort();
  const out = [];
  for (const f of files) {
    const full = join(FRAG_DIR, f);
    const parsed = parseFragmentFile(full);
    if (parsed.error) {
      errors.push(`fragment ${f}: ${parsed.error}`);
      continue;
    }
    out.push({ file: f, full, ...parsed });
  }
  return out;
}

function renderFragmentsSection(fragments) {
  if (!fragments.length) return '';
  // group by type
  const groups = new Map();
  for (const frag of fragments) {
    const t = frag.type || 'changed';
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(frag);
  }
  let out = '';
  for (const typeKey of SECTION_ORDER) {
    const list = groups.get(typeKey);
    if (!list || !list.length) continue;
    const section = TYPE_SECTION[typeKey] || 'Changed';
    out += `\n### ${section}\n`;
    for (const frag of list) {
      const body = frag.body.trim();
      if (!body) continue;
      // if body already starts with bullet/list, keep as is; otherwise prefix
      if (/^[-*]\s/.test(body) || /^\d+\.\s/.test(body)) {
        out += `${body}\n`;
      } else {
        // multi-line: first line as bullet, rest preserved
        const lines = body.split(/\r?\n/);
        out += `- ${lines[0]}\n`;
        for (let i = 1; i < lines.length; i++) {
          out += `${lines[i]}\n`;
        }
      }
    }
  }
  // any unrecognized types
  for (const [k, list] of groups) {
    if (SECTION_ORDER.includes(k)) continue;
    const section = TYPE_SECTION[k] || 'Changed';
    out += `\n### ${section}\n`;
    for (const frag of list) {
      const body = frag.body.trim();
      if (!body) continue;
      out += /^[-*]\s/.test(body) ? `${body}\n` : `- ${body}\n`;
    }
  }
  return out.trim();
}

/** يرقّي قسم [Unreleased] إلى قسم إصدار مؤرّخ، مع دمج fragments إن وجدت. */
function promoteChangelog(text, version, date, fragmentsSection) {
  const header = `## [v${version}] - ${date}`;
  if (text.includes(header)) throw new Error(`${CHANGELOG}: القسم "${header}" موجود مسبقاً`);
  const unreleased = '## [Unreleased]';
  const idx = text.indexOf(unreleased);
  if (idx === -1) throw new Error(`${CHANGELOG}: لا يوجد "${unreleased}"`);
  // find end of Unreleased section (next ## [v...])
  const afterUnreleased = idx + unreleased.length;
  const nextVersionRe = /\n## \[v[\d.]+]/g;
  nextVersionRe.lastIndex = afterUnreleased;
  const nextMatch = nextVersionRe.exec(text);
  const existingContent = nextMatch
    ? text.slice(afterUnreleased, nextMatch.index).trim()
    : text.slice(afterUnreleased).trim();

  let newSectionBody = '';
  if (existingContent) newSectionBody += existingContent;
  if (fragmentsSection) {
    if (newSectionBody) newSectionBody += '\n';
    newSectionBody += fragmentsSection;
  }
  // if neither has content, still create empty section (rare)
  if (!newSectionBody) newSectionBody = '';

  const insertion = newSectionBody ? `\n\n${header}\n\n${newSectionBody}` : `\n\n${header}`;
  // reconstruct: before Unreleased header + Unreleased header alone + new section + rest
  const before = text.slice(0, idx + unreleased.length);
  const rest = nextMatch ? text.slice(nextMatch.index) : '';
  // Unreleased stays clean (no content) — fragments/manual entries moved to versioned section
  return `${before}${insertion}${rest ? '\n' + rest.replace(/^\n/, '') : '\n'}`;
}

/** يقصّ CHANGELOG ليبقي آخر KEEP_VERSIONS إصدارات، وينقل الباقي للأرشيف. */
function pruneChangelog(changelogText) {
  if (!existsSync(abs(CHANGELOG_ARCHIVE))) return changelogText;
  const versionHeaders = [...changelogText.matchAll(/^## \[v[\d.]+]/gm)];
  if (versionHeaders.length <= KEEP_VERSIONS) return changelogText;
  const excess = versionHeaders.length - KEEP_VERSIONS;
  // find cut point: start of (KEEP_VERSIONS+1)-th version header
  const cutHeader = versionHeaders[KEEP_VERSIONS];
  const cutIdx = cutHeader.index;
  const toArchive = changelogText.slice(cutIdx).trimEnd();
  const pruned = changelogText.slice(0, cutIdx).trimEnd() + '\n';
  return { pruned, toArchive };
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

  // Collect fragments before promotion
  const fragments = collectFragments();
  const fragmentsSection = renderFragmentsSection(fragments);

  let changelogAfter;
  try {
    changelogAfter = promoteChangelog(read(CHANGELOG), next, date, fragmentsSection);
  } catch (err) {
    errors.push(err.message);
  }

  console.log(`🔧 الإصدار: ${current} → ${next}  (الوسم ${tag})`);
  for (const c of changes) console.log(`   • ${c.file}`);
  console.log(`   • ${CHANGELOG}`);
  if (fragments.length) {
    console.log(`   • ${fragments.length} fragment(s): ${fragments.map((f) => f.file).join(', ')}`);
  } else {
    console.log('   • لا fragments — يُرقّى محتوى [Unreleased] فقط إن وجد.');
  }

  if (errors.length) {
    console.error('\n❌ أخطاء:');
    for (const e of errors) console.error(`   - ${e}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n🧪 --dry-run: لم يُكتب أي ملف.');
    if (fragmentsSection) {
      console.log('\n--- fragments section preview ---');
      console.log(fragmentsSection.slice(0, 2000));
    }
    return;
  }

  for (const c of changes) writeFileSync(abs(c.file), c.after);

  // Prune old versions to archive if needed
  let finalChangelog = changelogAfter;
  const pruneResult = pruneChangelog(changelogAfter);
  if (pruneResult && typeof pruneResult === 'object' && pruneResult.toArchive) {
    finalChangelog = pruneResult.pruned;
    appendFileSync(abs(CHANGELOG_ARCHIVE), '\n\n' + pruneResult.toArchive + '\n');
    console.log(`   • نُقلت الإصدارات القديمة إلى ${CHANGELOG_ARCHIVE} (حُفظ آخر ${KEEP_VERSIONS})`);
  }

  writeFileSync(abs(CHANGELOG), finalChangelog);
  console.log(`\n✅ كُتبت ${changes.length + 1} ملفات.`);

  // Delete consumed fragments
  if (fragments.length) {
    for (const f of fragments) {
      try { unlinkSync(f.full); } catch {}
    }
    console.log(`🗑️  حُذفت ${fragments.length} fragment(s) بعد الجمع.`);
  }

  if (NO_GIT) {
    console.log('ℹ️  --no-git: تخطّي الالتزام والوسم. راجع التغييرات ثم: git commit && git tag -a %s', tag);
    return;
  }

  const message = SUMMARY ? `release: ${tag} - ${SUMMARY}` : `release: ${tag}`;
  // Collect files that actually changed (including archive if pruned)
  const filesToAdd = [...changes.map((c) => c.file), CHANGELOG];
  if (pruneResult && pruneResult.toArchive) filesToAdd.push(CHANGELOG_ARCHIVE);
  // Remove fragments from git (they were just deleted)
  if (fragments.length) {
    try { execFileSync('git', ['rm', '-f', ...fragments.map((f) => `changelog/fragments/${f.file}`)], { cwd: ROOT, stdio: 'ignore' }); } catch {}
  }
  git('add', ...filesToAdd);
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
