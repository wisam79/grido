#!/usr/bin/env node
/**
 * 🧭 حاجز مسبق لأصول نموذج ماسح المستندات (scanic / DocCornerNet)
 *
 * `frontend/public/models/` مُستثنى من Git، والملفات تأتي من حزمة npm
 * `scanic-ml/dist/` — لكن لا شيء كان ينسخها إلى `public/models/scanic/`
 * التي يتوقعها `core/ml-detector.ts`:
 *     `${origin}/models/scanic/doccornernet_lean.ort`
 *     `${origin}/models/scanic/ort-wasm-simd-threaded.{wasm,mjs}`
 *
 * النتيجة قبل هذا السكربت: على نسخة جديدة (أو cache بارد) يغيب النموذج،
 * و`warmupMlDetector`/`detectDocumentWithMl` يبتلعان الفشل ويعيدان null —
 * فيتراجع الكاشف للكلاسيكي بصمت والمستخدم لا يعلم أن الكشف العصبي معطّل.
 *
 * هذا السكربت يجعل الفشل صريحاً: ينسخ الأصول، ويفشل (exit 1) برسالة عملية
 * إن غابت الحزمة أو أحد الملفات. Idempotent: لا يعيد النسخ إن طابق الحجم.
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, "..");

const SRC_DIR = join(frontendDir, "node_modules", "scanic-ml", "dist");
const DEST_DIR = join(frontendDir, "public", "models", "scanic");

// يجب أن تطابق أسماء الملفات ما يطلبه `core/ml-detector.ts` (getScanicAssetBaseUrl).
const ASSETS = [
  "doccornernet_lean.ort",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
];

function fail(lines) {
  console.error("");
  for (const line of lines) console.error(line);
  console.error("");
  process.exit(1);
}

if (!existsSync(SRC_DIR)) {
  fail([
    "❌ حزمة أصول ماسح المستندات مفقودة: node_modules/scanic-ml/dist/",
    "",
    "   السبب: الاعتماديات لم تُثبَّت بعد (أو نُفِّذ التثبيت بـ --ignore-scripts).",
    "   الحل: نفّذ من مجلد frontend:",
    "",
    "     npm install",
    "",
  ]);
}

const missing = ASSETS.filter((name) => !existsSync(join(SRC_DIR, name)));
if (missing.length > 0) {
  fail([
    "❌ ملفات نموذج ماسح المستندات مفقودة داخل الحزمة:",
    ...missing.map((name) => `     - node_modules/scanic-ml/dist/${name}`),
    "",
    "   الحل: أعد تثبيت scanic-ml:",
    "",
    "     npm install scanic-ml@~0.2.0",
    "",
  ]);
}

mkdirSync(DEST_DIR, { recursive: true });

let copied = 0;
for (const name of ASSETS) {
  const src = join(SRC_DIR, name);
  const dst = join(DEST_DIR, name);
  const srcSize = statSync(src).size;

  if (existsSync(dst) && statSync(dst).size === srcSize) {
    continue; // مطابق — لا نعيد كتابة القرص بلا داعٍ
  }
  copyFileSync(src, dst);
  copied++;
}

if (copied > 0) {
  console.log(`✅ نموذج ماسح المستندات: نُسخ ${copied} ملفاً إلى public/models/scanic/`);
}
