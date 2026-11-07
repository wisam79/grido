import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

describe('حارس توحيد ارتفاعات شريط الأدوات العلوي (Toolbar Height Uniformity Guard)', () => {
  const toolbarDir = join(__dirname, '../src/components/editor/toolbar');

  it('يجب أن تكون كافة أزرار شريط الأدوات العلوي موحدة بارتفاع h-8 القياسي (32px)', () => {
    const files = readdirSync(toolbarDir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(join(toolbarDir, file), 'utf-8');

      // البحث عن أي أزرار أو عناصر تحكم بارتفاع شاذ (h-9, h-10, h-7) داخل شريط الأدوات الرئيسي
      // باستثناء الأيقونات المصغرة w-7 h-7 داخل القوائم المنسدلة (DropdownMenuItem)
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // تخطي الحاوية الجذرية لشريط الأدوات نفسه (h-10 بارتفاع 40px لشريط الأدوات ككل)
        if (file === 'toolbar.tsx' && line.includes('bg-sidebar')) {
          return;
        }

        // فحص الأزرار
        if (line.includes('<Button') || line.includes('className=')) {
          if (/\bh-9\b/.test(line)) {
            violations.push(`${file}:${idx + 1} يحتوي على ارتفاع شاذ (h-9): ${line.trim()}`);
          }
          if (/\bh-10\b/.test(line)) {
            violations.push(`${file}:${idx + 1} يحتوي على ارتفاع شاذ (h-10): ${line.trim()}`);
          }
        }
      });
    }

    expect(
      violations,
      `عثر على أزرار غير موحدة الارتفاع في شريط الأدوات:\n${violations.join('\n')}`,
    ).toEqual([]);
  });

  it('يجب أن تستخدم مجموعة أدوات الذكاء الاصطناعي فئة fluent-command-group دون تداخل حاويات يضخم الارتفاع', () => {
    const aiToolsContent = readFileSync(join(toolbarDir, 'toolbar-ai-tools.tsx'), 'utf-8');
    expect(aiToolsContent).toContain('fluent-command-group');
    expect(aiToolsContent).not.toContain('h-9');
    expect(aiToolsContent).toContain('h-8');
  });

  it('يجب أن يخلو شريط أدوات التحديد من أدوات الذكاء الاصطناعي بعد نقلها للوح الخصائص', () => {
    const selectionToolsContent = readFileSync(
      join(toolbarDir, 'toolbar-selection-tools.tsx'),
      'utf-8',
    );

    // التأكد من خلو شريط أدوات التحديد من أزرار الذكاء الاصطناعي بعد نقلها للوح الجانبي
    expect(selectionToolsContent).not.toContain('<AiToolsToolbarGroup />');
    expect(selectionToolsContent).not.toContain('AiToolsToolbarGroup');
  });

  it('يجب أن يكون زرا الحفظ والتصدير أيقونيين (h-8 w-8) بينما يبرز زر الطباعة كإجراء إخراج أساسي بارتفاع h-8', () => {
    const toolbarContent = readFileSync(join(toolbarDir, 'toolbar.tsx'), 'utf-8');

    const saveMatch = toolbarContent.match(/data-testid="toolbar-save"[\s\S]*?className="([^"]+)"/);
    const printMatch = toolbarContent.match(
      /data-testid="toolbar-print"[\s\S]*?className="([^"]+)"/,
    );
    const exportMatch = toolbarContent.match(
      /data-testid="toolbar-export"[\s\S]*?className="([^"]+)"/,
    );

    expect(saveMatch).toBeTruthy();
    expect(printMatch).toBeTruthy();
    expect(exportMatch).toBeTruthy();

    const saveClass = saveMatch![1];
    const printClass = printMatch![1];
    const exportClass = exportMatch![1];

    // الحفظ والتصدير أيقونيان متطابقان 32×32px
    for (const [name, cls] of [
      ['حفظ', saveClass],
      ['تصدير', exportClass],
    ]) {
      expect(cls, `${name} يجب أن يكون بارتفاع h-8`).toContain('h-8');
      expect(cls, `${name} يجب أن يكون بعرض w-8`).toContain('w-8');
      expect(cls, `${name} يجب أن يكون بدون حشوة p-0`).toContain('p-0');
    }

    // الطباعة إجراء أساسي بارز بارتفاع h-8 موحد وبنفس تنسيق زر الإدراج
    expect(printClass).toContain('h-8');
    expect(printClass).toContain('bg-primary/10');
    expect(printClass).toContain('text-primary');
    expect(printClass).toContain('border-primary/35');
    const printBlock = toolbarContent.match(
      /<Button[\s\S]*?data-testid="toolbar-print"[\s\S]*?<\/Button>/,
    );
    expect(printBlock).toBeTruthy();
    expect(printBlock![0]).toContain('variant="outline"');
    expect(printBlock![0]).toContain('<span>طباعة</span>');
  });

  it('يجب أن يكون زر الإدراج بارزاً بتمييز لوني وتسمية واضحة وارتفاع h-8 موحد مطابق لزر الطباعة', () => {
    const fileOpsContent = readFileSync(join(toolbarDir, 'toolbar-file-ops.tsx'), 'utf-8');

    const insertBlock = fileOpsContent.match(
      /<Button[^>]*data-testid="toolbar-insert"[\s\S]*?<\/Button>/,
    );
    expect(insertBlock).toBeTruthy();
    expect(insertBlock![0]).toContain('h-8');
    expect(insertBlock![0]).toContain('bg-primary/10');
    expect(insertBlock![0]).toContain('text-primary');
    expect(insertBlock![0]).toContain('border-primary/35');
    expect(insertBlock![0]).toContain('<span>إدراج</span>');
  });
});
