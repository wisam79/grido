#!/usr/bin/env node
/**
 * sign-update.mjs — توقيع Ed25519 لبصمة المثبت لمحرك التحديث التلقائي.
 *
 * العقد الحاكم (مصدر الحقيقة: internal/service/updater.go):
 *   • الرسالة الموقّعة هي **بايتات بصمة SHA-256 الخام** (32 بايتاً بعد فك
 *     ترميز hex) — لا المثال التنفيذي كاملاً، ولا النص السادس عشري.
 *   • التوقيع يُرمَّز base64 قياسياً ويُنشر كأصل نصي `.sig` بجانب الإصدار،
 *     ويقرأه التطبيق من الحقل `signature` أو من أصل `.sig` (firstSignatureLine).
 *   • المفتاح: بذرة 32 بايتاً أو مفتاح خاص كامل 64 بايتاً، كلاهما base64.
 *
 * الاستخدام:
 *   UPDATER_SIGNING_KEY=<base64> node scripts/sign-update.mjs
 *   node scripts/sign-update.mjs --key-file ./updater.key --checksums bin/grido-checksums.txt
 *   node scripts/sign-update.mjs --key <base64> --out bin/grido-checksums.txt.sig --public-key <base64>
 *
 * ملاحظة أمنية (ثابت No Shared Secrets): المفتاح الخاص لا يُكتب في أي ملف
 * مستودَع ولا يُمرَّر عبر وسائط سطر الأوامر في CI — يقرأ من البيئة/الأسرار فقط.
 */
import { createHash, createPrivateKey, sign as edSign, verify as edVerify, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// بادئة PKCS#8 لمفتاح Ed25519 — تلفّ البذرة الخام (32 بايتاً) لتقبلها Node/OpenSSL
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const ED25519_SEED_LEN = 32;
const ED25519_PRIVATE_LEN = 64;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const CHECKSUMS = valueOf('--checksums', 'bin/grido-checksums.txt');
const OUT = valueOf('--out', `${CHECKSUMS}.sig`);
const BIN_DIR = valueOf('--bin-dir', 'bin');
const KEY_FILE = valueOf('--key-file', null);
const KEY_ARG = valueOf('--key', null);
const PUBLIC_KEY = valueOf('--public-key', null);
const SKIP_FILE_VERIFY = has('--no-verify-file');

const abs = (rel) => (rel.match(/^[a-zA-Z]:[\\/]/) || rel.startsWith('/') ? rel : join(ROOT, rel));

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

/**
 * يفكّ ترميز base64 مرناً: يتسامح مع غياب الحشو ووجود مسافات/أسطر داخل النص
 * (نمط decodeBase64Flexible في updater.go) — لأن المفاتيح تُنسخ من أدوات مختلفة.
 */
function decodeBase64Flexible(text) {
  const compact = text.replace(/\s+/g, '');
  if (!compact) return Buffer.alloc(0);
  return Buffer.from(compact, 'base64');
}

/**
 * يبني مفتاحاً خاصاً Ed25519 من بذرة خام (32) أو مفتاح خاص كامل (64 = seed||public).
 * يقبل أيضاً مفاتيح PEM/PKCS#8 جاهزة (تُمرَّر كما هي لـ createPrivateKey).
 */
function loadPrivateKey() {
  let material = null;
  let source = '';

  if (KEY_FILE) {
    if (!existsSync(abs(KEY_FILE))) fail(`key file not found: ${KEY_FILE}`);
    material = readFileSync(abs(KEY_FILE));
    source = `--key-file ${KEY_FILE}`;
  } else if (KEY_ARG) {
    material = Buffer.from(KEY_ARG, 'utf8');
    source = '--key';
  } else if (process.env.UPDATER_SIGNING_KEY) {
    material = Buffer.from(process.env.UPDATER_SIGNING_KEY, 'utf8');
    source = 'env UPDATER_SIGNING_KEY';
  } else {
    fail('لا يوجد مفتاح توقيع: مرّر UPDATER_SIGNING_KEY أو --key-file أو --key');
  }

  const text = material.toString('utf8');
  if (text.includes('-----BEGIN')) {
    try {
      return { key: createPrivateKey(text), source };
    } catch (err) {
      fail(`المفتاح PEM غير صالح (${source}): ${err.message}`);
    }
  }

  const raw = decodeBase64Flexible(text);
  if (raw.length !== ED25519_SEED_LEN && raw.length !== ED25519_PRIVATE_LEN) {
    fail(
      `مفتاح Ed25519 غير صالح (${source}): ${raw.length} بايت بعد فك base64 — ` +
        `المتوقع ${ED25519_SEED_LEN} (بذرة) أو ${ED25519_PRIVATE_LEN} (مفتاح خاص كامل)`,
    );
  }
  // المفتاح الكامل 64 بايتاً = بذرة (32) + مفتاح عام (32)؛ PKCS#8 يلفّ البذرة فقط
  const seed = raw.subarray(0, ED25519_SEED_LEN);
  try {
    return {
      key: createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' }),
      source,
    };
  } catch (err) {
    fail(`تعذّر بناء مفتاح Ed25519 (${source}): ${err.message}`);
  }
}

/**
 * يطابق منطق parseChecksumForInstaller في updater.go: يفضل السطر الذي يحمل
 * «installer» أو «setup»، ثم يرجع لأول `.exe` كخيار احتياطي.
 * @returns {{hash: string, name: string, line: string}}
 */
function pickInstallerChecksum(content) {
  let fallback = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const fields = trimmed.split(/\s+/).filter(Boolean);
    if (fields.length < 2) continue;
    const hash = fields[0].toLowerCase();
    const name = fields[fields.length - 1];
    const nameLower = name.toLowerCase();
    if (nameLower.includes('installer') || nameLower.includes('setup')) {
      return { hash, name, line: trimmed };
    }
    if (!fallback && nameLower.endsWith('.exe')) fallback = { hash, name, line: trimmed };
  }
  if (!fallback) fail(`لم يُعثر على أي سطر بصمة مثبت في ${CHECKSUMS}`);
  return fallback;
}

/** يتحقق أن البصمة المعلنة تطابق الملف الفعلي (حماية من توقيع مدخل مقطوع). */
function verifyChecksumAgainstFile(entry) {
  if (SKIP_FILE_VERIFY) return;
  const candidate = join(abs(BIN_DIR), entry.name);
  if (!existsSync(candidate)) {
    console.log(`⚠️  ${entry.name} غير موجود في ${BIN_DIR} — تُخطّى مطابقة الملف (التوقيع يبقى على البصمة المعلنة).`);
    return;
  }
  const actual = createHash('sha256').update(readFileSync(candidate)).digest('hex');
  if (actual !== entry.hash) {
    fail(
      `البصمة المعلنة لـ ${entry.name} لا تطابق الملف الفعلي ` +
        `(أعلنت ${entry.hash.slice(0, 12)}… والملف ${actual.slice(0, 12)}…) — رفض التوقيع`,
    );
  }
  console.log(`✅ البصمة تطابق الملف: ${entry.name}`);
}

/** كتابة ذرّية: ملف مؤقت ثم إحلال — لا يُترك ملف `.sig` مقطوع عند الفشل. */
function atomicWrite(path, contents) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents);
  renameSync(tmp, path);
}

function main() {
  const checksumsPath = abs(CHECKSUMS);
  if (!existsSync(checksumsPath)) fail(`ملف البصمات غير موجود: ${CHECKSUMS}`);
  const content = readFileSync(checksumsPath, 'utf8');
  const entry = pickInstallerChecksum(content);

  console.log(`🔏 توقيع تحديث: ${entry.name}`);
  console.log(`   • البصمة: ${entry.hash}`);

  // الرسالة الموقّعة = بايتات البصمة الخام (16-hex → 32 بايت)، لا النص السادس عشري
  const digest = Buffer.from(entry.hash, 'hex');
  if (digest.length !== 32) fail(`طول البصمة غير صالح: ${entry.hash}`);

  const { key, source } = loadPrivateKey();

  const signature = edSign(null, digest, key);
  const signatureBase64 = signature.toString('base64');

  // شبكة أمان: لو مُرّر مفتاح عام نتحقق قبل النشر (يمنع توقيعاً بمفتاح خاطئ)
  if (PUBLIC_KEY) {
    const pubRaw = decodeBase64Flexible(PUBLIC_KEY);
    if (pubRaw.length !== 32) fail('--public-key يجب أن يكون 32 بايتاً بترميز base64');
    const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), pubRaw]);
    const ok = edVerify(null, digest, createPublicKey({ key: spki, format: 'der', type: 'spki' }), signature);
    if (!ok) fail('فشل التحقق الذاتي: التوقيع لا يطابق --public-key (مفتاح عام خاطئ؟)');
    console.log('✅ تحقق ذاتي ناجح مقابل المفتاح العام الممرَّر.');
  }

  verifyChecksumAgainstFile(entry);

  const payload = `${signatureBase64}\n`;
  const outPath = abs(OUT);
  atomicWrite(outPath, payload);

  console.log(`✅ كُتب التوقيع (${signature.length} بايت، base64) في ${OUT}`);
  console.log(`   • المصدر: ${source}`);
  console.log('ℹ️  يُرفع كأصل نصي .sig مع الإصدار؛ updater.go يقرأه عبر findSignatureAssetURL.');
}

main();
