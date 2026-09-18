#!/usr/bin/env node
/**
 * 🧱 حاجز مسبق لربطات Wails v3
 *
 * مجلد `frontend/bindings/` مُستثنى من Git (.gitignore) ويُولَّد محلياً بالأمر:
 *     wails3 generate bindings -ts -clean=true
 * بينما ملفات `frontend/wailsjs/*` هي **جسور يدوية** تعيد التصدير منه
 * (مثال: wailsjs/go/main/App.ts → export * from "../../../bindings/grido/app").
 *
 * بدون توليد الربطات يفشل `tsc`/`vite build` برسالة غامضة
 * (Cannot find module '../../../bindings/grido/app'). هذا السكربت يعطي
 * رسالة عملية صريحة ويفشل مبكراً بدل الفشل الغامض.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, "..", "bindings", "grido", "app.ts");

if (existsSync(probe)) {
  process.exit(0);
}

console.error("");
console.error("❌ ربطات Wails v3 مفقودة: frontend/bindings/grido/app.ts");
console.error("");
console.error("   السبب: مجلد frontend/bindings/ مُستثنى من Git ويُولَّد محلياً لكل نسخة.");
console.error("   الحل: نفّذ من جذر المشروع ثم أعد المحاولة:");
console.error("");
console.error("     wails3 generate bindings -ts -clean=true");
console.error("");
console.error("   أو نفّذ البناء الكامل (يولّد الربطات تلقائياً):");
console.error("");
console.error("     wails3 task build");
console.error("");
process.exit(1);
