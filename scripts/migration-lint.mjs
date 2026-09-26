#!/usr/bin/env node
/**
 * migration-lint.mjs — بوابة فحص ملفات هجرات Supabase قبل التطبيق
 *
 * الدافع (مُثبت بالواقع 2026-09-26): ثلاث هجرات مُسجَّلة في تاريخ الإنتاج كانت **غير قابلة للتطبيق**
 * من الأساس، فبقيت ثغرات مفتوحة لأشهر دون أن يكتشفها أي CI:
 *   1) `20260713000002` و`20260725000001` تستخدمان `OLD.` داخل `WITH CHECK` في سياسة RLS
 *      ⇒ `ERROR: 42P01: missing FROM-clause entry for table "old"` (OLD/NEW غير متاحين في سياسات RLS).
 *   2) `20260907000000` تمنح `EXECUTE` على توقيع دالة لا ينشئه أي ملف ⇒ `ERROR: 42883`.
 *   3) أسماء سياسات عربية أطول من 63 بايتاً ⇒ PostgreSQL يقصّها بصمت وينشأ انحراف في الأسماء.
 *
 * كشف 4 (ثبات الهجرات المطبَّقة): يمنع تعديل ملف هجرة موجود بعد تطبيقه، لأن ذلك
 * ينشئ انحرافاً بين الملف وتاريخ الإنتاج؛ الإصلاح يكون بهجرة جديدة لا بتعديل القديمة.
 *   يعتمد على بصمات SHA-256 محفوظة في supabase/migrations.manifest.json.
 *
 * الاستخدام:
 *   node scripts/migration-lint.mjs                  # فحص supabase/migrations
 *   node scripts/migration-lint.mjs --self-test       # تحقق ذاتي من كاشفات الأخطاء (يفشل إن لم تكتشف)
 *   node scripts/migration-lint.mjs --update-manifest # تحديث بصمات الهجرات (بعد إضافة هجرة جديدة)
 *
 * البوابة تكشف الأخطاء فقط (ERROR) — لا تعدّل شيئاً عدا عنصر التحكم الصريح --update-manifest.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const MANIFEST_PATH = join(ROOT, 'supabase', 'migrations.manifest.json');
const MAX_IDENTIFIER_BYTES = 63;

const errors = [];
const warnings = [];

/** كشف 1: OLD./NEW. داخل عبارة CREATE POLICY (غير صالح في سياسات RLS). */
export function findOldNewInPolicies(sql) {
  const hits = [];
  const policyRe = /CREATE\s+POLICY[\s\S]*?;/gi;
  for (const match of sql.matchAll(policyRe)) {
    const stmt = match[0];
    if (/\b(OLD|NEW)\s*\./.test(stmt)) {
      const name = stmt.match(/CREATE\s+POLICY\s+"?([^"\s]+)"?/i)?.[1] ?? '(بلا اسم)';
      hits.push(name);
    }
  }
  return hits;
}

/** كشف 2: أسماء معرفات أطول من 63 بايتاً (تُقصّ في PostgreSQL بصمت). */
export function findOverlongPolicyNames(sql) {
  const hits = [];
  for (const match of sql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"/gi)) {
    const name = match[1];
    if (Buffer.byteLength(name, 'utf8') > MAX_IDENTIFIER_BYTES) hits.push(name);
  }
  return hits;
}

const TYPE_ALIASES = new Map(
  Object.entries({
    int: 'integer',
    int4: 'integer',
    int8: 'bigint',
    varchar: 'character varying',
    timestamptz: 'timestamp with time zone',
    bool: 'boolean',
  }),
);

function normalizeType(raw) {
  return raw
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, (m) => m.replace(/\s+/g, ''))
    .replace(/\b(int|int4|int8|varchar|timestamptz|bool)\b/g, (t) => TYPE_ALIASES.get(t) ?? t)
    .replace(/\s+/g, ' ');
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** يستخرج التوقيعات المُنشأة فعلاً: "name(type1,type2)". */
export function collectDeclaredFunctions(sql) {
  const declared = new Set();
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_][a-z_0-9]*)\s*\(([\s\S]*?)\)\s*(?:RETURNS|LANGUAGE|AS)/gi;
  for (const match of sql.matchAll(re)) {
    const name = match[1].toLowerCase();
    const params = splitTopLevel(match[2]);
    const types = params
      .map((p) => {
        const cleaned = p.replace(/--.*$/gm, '').replace(/DEFAULT[\s\S]*$/i, '').trim();
        if (!cleaned) return null;
        // "p_user_id uuid" ⇒ uuid | "p_custom_key text" ⇒ text | "text" ⇒ text
        const withoutName = cleaned.replace(/^[a-z_][a-z_0-9]*\s+/i, '');
        return normalizeType(withoutName || cleaned);
      })
      .filter(Boolean);
    declared.add(`${name}(${types.join(',')})`);
  }
  return declared;
}

/** كشف 3: GRANT EXECUTE على توقيع غير موجود في أي CREATE FUNCTION. */
export function findGrantsWithoutFunction(sql, declared = collectDeclaredFunctions(sql)) {
  const missing = [];
  const re = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z_][a-z_0-9]*)\s*\(([\s\S]*?)\)\s*TO/gi;
  for (const match of sql.matchAll(re)) {
    const name = match[1].toLowerCase();
    const args = splitTopLevel(match[2]).map((a) => normalizeType(a)).filter(Boolean);
    if (!declared.has(`${name}(${args.join(',')})`)) missing.push(`${name}(${args.join(', ')})`);
  }
  return missing;
}

/** يسرد ملفات الهجرات مرتّبة. */
function listMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * كشف 4: ثبات الهجرات المطبَّقة. لكل ملف مُسجَّل في التبصيم، يجب أن تطابق بصمته
 * الحالية المسجّلة؛ الاختلاف يعني تعديل هجرة بعد تطبيقها ⇒ انحراف عن الإنتاج.
 * الملفات الجديدة غير المسجّلة تُقبل (تُضاف عند تشغيل --update-manifest).
 */
export function checkImmutability(files) {
  if (!existsSync(MANIFEST_PATH)) return;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    errors.push('supabase/migrations.manifest.json غير قابل للقراءة — أعِد توليده بـ--update-manifest.');
    return;
  }
  for (const name of files) {
    const recorded = manifest[name];
    if (!recorded) continue;
    const actual = hashFile(join(MIGRATIONS_DIR, name));
    if (actual !== recorded) {
      errors.push(
        `${name} — تم تعديل هجرة مطبَّقة بعد تسجيلها (انحراف عن تاريخ الإنتاج). أنشئ هجرة جديدة بدل تعديل القديمة.`,
      );
    }
  }
}

/** يولّد/يحدّث بصمات كل الهجرات الحالية. */
function writeManifest(files) {
  const manifest = {};
  for (const name of files) manifest[name] = hashFile(join(MIGRATIONS_DIR, name));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`🔒 حُدِّثت بصمات ${files.length} هجرة في supabase/migrations.manifest.json`);
}

function lintFile(filePath) {
  const sql = readFileSync(filePath, 'utf8');
  const rel = filePath.replace(`${ROOT}`, '.').replace(/\\/g, '/');
  for (const policy of findOldNewInPolicies(sql)) {
    errors.push(`${rel} — سياسة "${policy}" تستخدم OLD./NEW. داخل CREATE POLICY (غير صالح في RLS: 42P01).`);
  }
  for (const name of findOverlongPolicyNames(sql)) {
    warnings.push(
      `${rel} — اسم السياسة "${name}" يتجاوز 63 بايتاً (${Buffer.byteLength(name, 'utf8')}) وسيُقصّ في PostgreSQL.`,
    );
  }
  for (const sig of findGrantsWithoutFunction(sql)) {
    errors.push(`${rel} — GRANT EXECUTE على توقيع غير مُنشأ في أي هجرة: ${sig} (سيفشل بـ42883).`);
  }
}

function lintAll() {
  if (!existsSync(MIGRATIONS_DIR)) {
    errors.push('مجلد supabase/migrations غير موجود.');
    return;
  }
  const files = listMigrationFiles();
  // التوقيعات المُعلنة تُجمع من كل الملفات لأن GRANT قد يأتي في هجرة لاحقة.
  const allSql = files.map((name) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8')).join('\n');
  const declared = collectDeclaredFunctions(allSql);
  for (const name of files) {
    const filePath = join(MIGRATIONS_DIR, name);
    const sql = readFileSync(filePath, 'utf8');
    const rel = `supabase/migrations/${name}`;
    for (const policy of findOldNewInPolicies(sql)) {
      errors.push(`${rel} — سياسة "${policy}" تستخدم OLD./NEW. داخل CREATE POLICY (غير صالح في RLS: 42P01).`);
    }
    for (const overlong of findOverlongPolicyNames(sql)) {
      warnings.push(
        `${rel} — اسم السياسة "${overlong}" يتجاوز 63 بايتاً (${Buffer.byteLength(overlong, 'utf8')}) وسيُقصّ في PostgreSQL.`,
      );
    }
    for (const sig of findGrantsWithoutFunction(sql, declared)) {
      errors.push(`${rel} — GRANT EXECUTE على توقيع غير مُنشأ في أي هجرة: ${sig} (سيفشل بـ42883).`);
    }
  }
  checkImmutability(files);
  console.log(`🔍 فُحص ${files.length} ملف هجرة في supabase/migrations.`);
}

const SELF_TEST_FIXTURES = {
  brokenPolicy: `CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND plan = OLD.plan);`,
  brokenGrant: `GRANT EXECUTE ON FUNCTION public.foo(uuid, integer, text) TO authenticated;`,
  declaredOnly: `CREATE OR REPLACE FUNCTION public.foo(p_user_id uuid, p_days integer)
RETURNS json LANGUAGE plpgsql AS $$ BEGIN RETURN '{}'::json; END; $$;
GRANT EXECUTE ON FUNCTION public.foo(uuid, integer) TO authenticated;`,
  longName: `CREATE POLICY "${'ا'.repeat(40)}" ON public.profiles FOR SELECT USING (true);`,
};

function selfTest() {
  const failures = [];
  if (findOldNewInPolicies(SELF_TEST_FIXTURES.brokenPolicy).length !== 1) {
    failures.push('كاشف OLD/NEW لم يكتشف الحالة المعطوبة.');
  }
  if (findOldNewInPolicies(SELF_TEST_FIXTURES.declaredOnly).length !== 0) {
    failures.push('كاشف OLD/NEW يعطي إيجابية كاذبة على SQL سليم.');
  }
  const declared = collectDeclaredFunctions(SELF_TEST_FIXTURES.declaredOnly);
  if (!declared.has('foo(uuid,integer)')) failures.push('استخراج التوقيعات المُنشأة فشل.');
  if (findGrantsWithoutFunction(SELF_TEST_FIXTURES.brokenGrant).length !== 1) {
    failures.push('كاشف GRANT لم يكتشف التوقيع غير الموجود.');
  }
  if (findGrantsWithoutFunction(SELF_TEST_FIXTURES.declaredOnly).length !== 0) {
    failures.push('كاشف GRANT يعطي إيجابية كاذبة على توقيع موجود.');
  }
  if (findOverlongPolicyNames(SELF_TEST_FIXTURES.longName).length !== 1) {
    failures.push('كاشف طول الأسماء لم يكتشف الاسم الطويل.');
  }
  if (failures.length) {
    console.error('❌ فشل التحقق الذاتي:');
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log('✅ التحقق الذاتي ناجح: كل الكاشفات تعمل بلا إيجابيات كاذبة.');
}

if (process.argv.includes('--update-manifest')) {
  writeManifest(listMigrationFiles());
} else if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  lintAll();
  for (const warning of warnings) console.warn(`⚠️  ${warning}`);
  if (errors.length) {
    console.error('\n❌ أخطاء هجرات (ستفشل عند التطبيق):');
    for (const error of errors) console.error(`   - ${error}`);
    process.exit(1);
  }
  console.log(`✅ هجرات سليمة (${warnings.length} تحذيراً).`);
}
