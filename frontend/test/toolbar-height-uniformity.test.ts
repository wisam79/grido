import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("حارس توحيد ارتفاعات شريط الأدوات العلوي (Toolbar Height Uniformity Guard)", () => {
  const toolbarDir = join(__dirname, "../src/components/editor/toolbar");

  it("يجب أن تكون كافة أزرار شريط الأدوات العلوي موحدة بارتفاع h-8 القياسي (32px)", () => {
    const files = readdirSync(toolbarDir).filter((f) => f.endsWith(".tsx"));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(join(toolbarDir, file), "utf-8");

      // البحث عن أي أزرار أو عناصر تحكم بارتفاع شاذ (h-9, h-10, h-7) داخل شريط الأدوات الرئيسي
      // باستثناء الأيقونات المصغرة w-7 h-7 داخل القوائم المنسدلة (DropdownMenuItem)
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // فحص الأزرار
        if (line.includes("<Button") || line.includes("className=")) {
          if (/\bh-9\b/.test(line)) {
            violations.push(`${file}:${idx + 1} يحتوي على ارتفاع شاذ (h-9): ${line.trim()}`);
          }
          if (/\bh-10\b/.test(line)) {
            violations.push(`${file}:${idx + 1} يحتوي على ارتفاع شاذ (h-10): ${line.trim()}`);
          }
        }
      });
    }

    expect(violations, `عثر على أزرار غير موحدة الارتفاع في شريط الأدوات:\n${violations.join("\n")}`).toEqual([]);
  });

  it("يجب أن تستخدم مجموعة أدوات الذكاء الاصطناعي فئة fluent-command-group دون تداخل حاويات يضخم الارتفاع", () => {
    const aiToolsContent = readFileSync(join(toolbarDir, "toolbar-ai-tools.tsx"), "utf-8");
    expect(aiToolsContent).toContain("fluent-command-group");
    expect(aiToolsContent).not.toContain("h-9");
    expect(aiToolsContent).toContain("h-8");
  });

  it("يجب ألا يتم تضمين مجموعة أدوات الذكاء الاصطناعي كحاوية متداخلة داخل fluent-command-group أخرى", () => {
    const selectionToolsContent = readFileSync(join(toolbarDir, "toolbar-selection-tools.tsx"), "utf-8");
    
    // التأكد من أن AiToolsToolbarGroup منفصلة وليست محشورة داخل div.fluent-command-group
    const aiIndex = selectionToolsContent.indexOf("<AiToolsToolbarGroup />");
    const groupDivIndex = selectionToolsContent.indexOf('<div className="fluent-command-group');
    
    expect(aiIndex).toBeGreaterThan(-1);
    expect(groupDivIndex).toBeGreaterThan(-1);
    // يجب أن تظهر AiToolsToolbarGroup قبل حاوية التحديد العامة ككتلة مستقلة
    expect(aiIndex).toBeLessThan(groupDivIndex);
  });
});
