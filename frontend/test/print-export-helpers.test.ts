import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  describeError,
  withTimeout,
  extractPrintImageSrc,
  generatePrintPageStyle,
} from '../src/components/editor/print/use-print-export';
import { resolveCutLineDash } from '../src/lib/export/export-canvas-collage';

// ─────────────────────────────────────────────────────────────────────────────
// print-export-helpers.test.ts — مساعدات الطباعة (RV-Print-20/25):
// رسائل أخطاء بلا "[object Object]"، مهلات بلا تعليق، وإيقاع شرطات موحّد.
// ─────────────────────────────────────────────────────────────────────────────

describe('describeError', () => {
  it('يمرر رسالة Error كما هي', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('يمرر النص كما هو', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('يستخرج message من كائنات أخطاء Go/Wails', () => {
    expect(describeError({ message: 'server says no' })).toBe('server says no');
  });

  it('يستخرج حقل error الاحتياطي', () => {
    expect(describeError({ error: 'native failed' })).toBe('native failed');
  });

  it('لا ينتج [object Object] أبداً للكائنات العادية', () => {
    const out = describeError({ code: 42, detail: 'x' });
    expect(out).not.toContain('[object Object]');
    expect(out).toContain('42');
  });

  it('يعيد افتراضياً للقيم الفارغة', () => {
    expect(describeError(null)).toBe('خطأ غير معروف');
    expect(describeError(undefined)).toBe('خطأ غير معروف');
  });

  it('يترجم سقوف وأخطاء الطباعة التقنية إلى رسائل عربية واضحة', () => {
    expect(describeError('total pixels exceed 144 megapixels')).toContain('أكثر من 144 ميجابكسل');
    expect(describeError('cmyk tiff too large')).toContain('ورقة CMYK TIFF كبيرة جداً');
    expect(describeError('unsupported feature: color model')).toContain(
      'CMYK بفصل الأحبار غير مدعوم',
    );
    expect(describeError('too many expanded print cells')).toContain('عدد النسخ كبير جداً');
    expect(describeError('too many items: 1000')).toContain('عدد العناصر كبير جداً');
    expect(describeError('invalid DPI')).toContain('قيمة DPI غير صالحة');
    expect(describeError('PrintDirect: انتهت المهلة (30 ث)')).toBe(
      'PrintDirect: انتهت المهلة (30 ث)',
    );
  });
});

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعيد قيمة الوعد السريع', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, 'fast')).resolves.toBe(7);
  });

  it('يرفض بتسمية واضحة عند انتهاء المهلة', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 1000, 'ExportPrintSheet');
    const assertion = expect(pending).rejects.toThrow('ExportPrintSheet');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('الوعد الفائز بالسباق لا يُلغى بالمهلة اللاحقة', async () => {
    vi.useFakeTimers();
    let settled = 'pending';
    const p = withTimeout(
      new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500)),
      5000,
      'race',
    ).then((v) => {
      settled = v;
      return v;
    });
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe('late');
    expect(settled).toBe('late');
  });
});

describe('resolveCutLineDash', () => {
  it('dashed الافتراضي [8,8]', () => {
    expect(resolveCutLineDash('dashed')).toEqual([8, 8]);
  });

  it('solid بلا شرطات', () => {
    expect(resolveCutLineDash('solid')).toEqual([]);
  });

  it('dotted نقاط قصيرة', () => {
    expect(resolveCutLineDash('dotted')).toEqual([2, 5]);
  });

  it('cropmarks بلا شرطات (زوايا منفصلة)', () => {
    expect(resolveCutLineDash('cropmarks')).toEqual([]);
  });

  it('القيم المجهولة تسقط على dashed', () => {
    expect(resolveCutLineDash(undefined)).toEqual([8, 8]);
    expect(resolveCutLineDash('wavy')).toEqual([8, 8]);
  });
});

describe('extractPrintImageSrc', () => {
  it('يستخرج رابط الصورة بنجاح من مستند HTML مكتمل', () => {
    const html = `<!DOCTYPE html><html><body><img src="/local-image/print_test.png" /></body></html>`;
    expect(extractPrintImageSrc(html)).toBe('/local-image/print_test.png');
  });

  it('يستخرج مسار الصورة عندما تكون هناك عناصر وتنسيقات متعددة', () => {
    const html = `
      <html>
        <head><style>body { margin: 0; }</style></head>
        <body>
          <div id="print-container">
            <img class="sheet" alt="Sheet" src="http://localhost:5173/api/image.tif" />
          </div>
        </body>
      </html>
    `;
    expect(extractPrintImageSrc(html)).toBe('http://localhost:5173/api/image.tif');
  });

  it('يعيد نص فارغ عند عدم وجود وسم img', () => {
    const html = `<html><body><div>بلا صورة</div></body></html>`;
    expect(extractPrintImageSrc(html)).toBe('');
  });

  it('يعيد نص فارغ عند تمرير قيمة فارغة أو نص تالف', () => {
    expect(extractPrintImageSrc('')).toBe('');
    expect(extractPrintImageSrc('   ')).toBe('');
  });
});

describe('generatePrintPageStyle', () => {
  it('ينتج قواعد @page بهوامش صفرية ومقاس محدد بالمليمتر', () => {
    const css = generatePrintPageStyle(210, 297);
    expect(css).toContain('@page { margin: 0 !important; size: 210mm 297mm; }');
    expect(css).toContain('@page :left { margin: 0 !important; }');
    expect(css).toContain('@page :right { margin: 0 !important; }');
    expect(css).toContain('@page :first { margin: 0 !important; }');
  });

  it('يطبق أبعاد الورقة المحددة في الوضع الأفقي على @page ويقيد المحتوى بنسبة 100% لمنع الصفحات الفارغة', () => {
    const css = generatePrintPageStyle(297, 210);
    expect(css).toContain('size: 297mm 210mm;');
    expect(css).toContain('width: 100% !important;');
    expect(css).toContain('height: 100% !important;');
    expect(css).toContain('page-break-after: avoid !important;');
    expect(css).toContain('break-after: avoid !important;');
  });

  it('يفرض إخفاء أي عنصر خارج حاوية الطباعة في المتصفح', () => {
    const css = generatePrintPageStyle(100, 150);
    expect(css).toContain('body > *:not(#print-container) { display: none !important; }');
    expect(css).toContain('-webkit-print-color-adjust: exact !important;');
    expect(css).toContain('print-color-adjust: exact !important;');
  });

  it('يمنع تجزئة وانقسام الصورة وتوليد صفحات فارغة إضافية', () => {
    const css = generatePrintPageStyle(100, 150);
    expect(css).toContain('page-break-inside: avoid !important;');
    expect(css).toContain('break-inside: avoid !important;');
    expect(css).toContain('page-break-after: avoid !important;');
    expect(css).toContain('break-after: avoid !important;');
    // ⚖️ contain: تحجيم موحّد يحفظ النسبة — fill كان يسحق الورقة عند اختلاف
    // نسبة أبعاد الورق المختار في حوار الطباعة الأصلي عن نسبة صورة التركيب.
    expect(css).toContain('object-fit: contain !important;');
    expect(css).not.toContain('object-fit: fill !important;');
  });

  it('يخفي حاوية الطباعة بالكامل على الشاشة منعاً للوميض أو إزاحة العناصر', () => {
    const css = generatePrintPageStyle(100, 150);
    expect(css).toContain('#print-container { display: none !important; }');
    expect(css).toContain('@media screen { #print-container { display: none !important; } }');
  });
});
