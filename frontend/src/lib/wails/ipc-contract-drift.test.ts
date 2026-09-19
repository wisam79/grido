/**
 * 🛡️ حارس انحراف عقود Wails v3 IPC (IPC Contract Drift Guard)
 *
 * يضمن مطابقة 100% بين كافة معرّفات الدوال الرقمية ($Call.ByID) المولدة في
 * frontend/bindings/grido/** ومعالجات المحاكاة المسجلة في جسر الاختبارات
 * frontend/e2e/helpers/wails-v3-bridge.ts (WAILS_V3_METHOD_HANDLERS).
 *
 * الغرض: منع فشل E2E صامت برسالة `Unhandled methodID` عند إضافة دالة جديدة
 * في App أو الخدمات دون تسجيل معالج Mock لها.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WAILS_V3_METHOD_HANDLERS } from "../../../e2e/helpers/wails-v3-bridge";

const here = dirname(fileURLToPath(import.meta.url));

interface BindingFunction {
  name: string;
  id: number;
  file: string;
}

/**
 * مسح تكراري لكل ملفات .ts داخل مجلد الربطات واستخراج أزواج (الاسم، المعرف).
 * لا نعتمد على ملفات index.ts لأن نمط إعادة التصدير يختلف بين المجلدات
 * (`export * from` مقابل `import * as`)، والدوال ذات `$Call.ByID` تعيش
 * حصراً في ملفات الوحدات نفسها.
 */
function collectBindingFunctions(dir: string, rel: string, out: BindingFunction[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      collectBindingFunctions(join(dir, entry.name), `${rel}/${entry.name}`, out);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;

    let content: string;
    try {
      content = readFileSync(join(dir, entry.name), "utf-8");
    } catch {
      continue;
    }

    // نبحث عن كل دالة مصدرة ثم أول $Call.ByID(<رقم>) قبل الدالة المصدرة التالية —
    // (لا نعتمد على regex بسيط لأن أنواع الإرجاع قد تحتوي أقواساً معقوفة)
    const funcRe = /export\s+function\s+(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = funcRe.exec(content)) !== null) {
      const nextExport = content.indexOf("export function", m.index + m[0].length);
      const bodyEnd = nextExport === -1 ? content.length : nextExport;
      const body = content.slice(m.index + m[0].length, bodyEnd);
      const idMatch = body.match(/\$Call\.ByID\((\d+)/);
      if (idMatch) {
        out.push({ name: m[1], id: Number(idMatch[1]), file: `${rel}/${entry.name}` });
      }
    }
  }
}

describe("IPC Contract Drift Guard (Wails v3)", () => {
  const bindingsDir = resolve(here, "../../../bindings/grido");

  // معالجات دفاعية مسجلة عمداً في الجسر بلا تواقيع مولّدة (تُستدعى عند الحالات
  // الحدية من الرنتايم): ServiceStartup و ServiceShutdown في app.go لا تُصدّر
  // في الربطات لأن تواقيعهما (ctx, ServiceOptions) لا تدعم التسلسل.
  const INTENTIONAL_FALLBACK_HANDLERS = new Set<number>([2987688963, 2154875234]);

  const bindingFunctions: BindingFunction[] = [];

  try {
    collectBindingFunctions(bindingsDir, ".", bindingFunctions);
  } catch {
    // الربطات مولدة محلياً ومستثناة من Git — إن غابت فسبق لحاجز
    // ensure-bindings.mjs أن يفشل مبكراً برسالة واضحة، ونكتفي هنا بقائمة فارغة.
    console.warn("[ipc-contract-drift] bindings missing — run `wails3 generate bindings -ts -clean=true`");
  }

  it("يجب أن تكون الربطات مولدة ومقروءة (bindings present)", () => {
    expect(bindingFunctions.length, "لا توجد ربطات Wails v3 مولدة؛ نفّذ: wails3 generate bindings -ts -clean=true").toBeGreaterThan(0);
  });

  it("يجب ألا يوجد تكرار في المعرفات الرقمية داخل الربطات نفسها", () => {
    const ids = bindingFunctions.map((f) => f.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates, `معرفات مكررة في الربطات: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("لكل دالة في الربطات يجب وجود معالج Mock مسجل في wails-v3-bridge.ts", () => {
    const missing = bindingFunctions.filter((f) => !(f.id in WAILS_V3_METHOD_HANDLERS));
    const details = missing.map((f) => `  ${f.name} (${f.id}) ← ${f.file}`).join("\n");
    expect(
      missing,
      `معالجات Mock مفقودة في WAILS_V3_METHOD_HANDLERS لـ ${missing.length} دالة:\n${details}\n\nالحل: سجّل معالجاً برقم المعرف في frontend/e2e/helpers/wails-v3-bridge.ts`
    ).toEqual([]);
  });

  it("يجب ألا يوجد معالجات Mock يتيمة بلا دالة مقابلة في الربطات", () => {
    const bindingIds = new Set(bindingFunctions.map((f) => f.id));
    const orphans = Object.keys(WAILS_V3_METHOD_HANDLERS)
      .map(Number)
      .filter((id) => !bindingIds.has(id));
    // المعالجات اليتيمة غير قاتلة (تنشأ عادة بعد -clean=true) لكنها تشوش الصيانة
    const unexpectedOrphans = orphans.filter((id) => !INTENTIONAL_FALLBACK_HANDLERS.has(id));
    expect(
      unexpectedOrphans,
      `معالجات يتيمة (لا دالة لها في الربطات الحالية): ${unexpectedOrphans.join(", ")} — احذفها أو حدّث الربطات`
    ).toEqual([]);
  });
});
