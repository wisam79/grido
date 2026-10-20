import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  FOCUS_RING,
  SPACING_RAMP,
  TOUCH_TARGET_MIN,
  RADIUS,
  MOTION,
  Z,
} from '@/lib/ui/ui-compliance';

/**
 * 🛡️ بوابة التوافق (UI Compliance Guard) — التنفيذ الحيّ لـ lib/ui/ui-compliance.ts.
 *
 * كان الملف حشواً موثّقاً بلا مستورد؛ هذه الاختبارات تحوّله إلى طبقة تنفيذ:
 * تتأكد أن الحلقة البؤرية موحّدة على عناصر التحكم الأساسية، وأن طبقات z-index
 * تستعمل التوكنز (لا قيماً عشوائية خارج التراخيص)، وأن كل توكن z-(--z-*) مُشار
 * إليه معرَّف فعلاً في index.css — ب guards قليلة عالية القيمة لا نسخة هشّة.
 */

const SRC = join(__dirname, '../src');

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf-8');
}

/** كل ملفات مصدر .ts/.tsx تحت src (مسار كامل) — لفحص النص مباشرةً عبر fs. */
function walkSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkSource(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** عناصر التحكم الأساسية + نوافذ الرسم — يجب أن تحمل حلقة التركيز البؤرية. */
const FOCUS_RING_FILES = [
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/switch.tsx',
  'components/ui/tabs.tsx',
  'components/editor/system/window-controls.tsx',
  // ستة مكوّنات blocks/* تستعمل الحلقة البؤرية المزدوجة
  'components/ui/blocks/fluent-icon-button.tsx',
  'components/ui/blocks/fluent-segmented-control.tsx',
  'components/ui/blocks/fluent-capsule-button.tsx',
  'components/ui/blocks/fluent-section.tsx',
  'components/ui/blocks/fluent-setting-row.tsx',
  'components/ui/blocks/fluent-filter-chips.tsx',
];

describe('UI Compliance Guard — ثوابت الحارس الداخلية', () => {
  it('سلم المسافات يبدأ من الصفر ويتدرّج تصاعدياً بخطوات زوجية موجبة', () => {
    expect(SPACING_RAMP[0]).toBe(0);
    for (let i = 1; i < SPACING_RAMP.length; i++) {
      const step = SPACING_RAMP[i] - SPACING_RAMP[i - 1];
      expect(step).toBeGreaterThan(0);
      expect(step % 2).toBe(0);
    }
  });

  it('الحد الأدنى لهدف اللمس 44px وسلاسل التوكنز معرّفة', () => {
    expect(TOUCH_TARGET_MIN).toBe(44);
    expect(RADIUS.control).toBe('rounded-md');
    expect(RADIUS.modal).toBe('rounded-xl');
    expect(typeof MOTION.normal).toBe('number');
    // هرم z رقمي تصاعدي: القمة أعلى من كل الطبقات
    const values = Object.values(Z);
    expect(Math.max(...values)).toBe(Z.toast);
  });

  it('سلسلة الحلقة البؤرية القانونية تحمل التوكنز الأساسية', () => {
    for (const token of ['focus-visible:ring-2', 'focus-visible:ring-primary']) {
      expect(FOCUS_RING).toContain(token);
    }
  });
});

describe('UI Compliance Guard — هرمية نصف القطر (طابع سطح المكتب الأصلي)', () => {
  it('أساس النظام 6px فتكون القيم 4/6/10px كما هو موثّق', () => {
    const css = read('index.css');
    // الأساس: --radius: 0.375rem (6px) — منه تُشتق rounded-md=4 و lg=6 و xl=10
    expect(css).toMatch(/--radius:\s*0\.375rem/);
    expect(css).toContain('--radius-md: calc(var(--radius) - 2px)');
    expect(css).toContain('--radius-lg: var(--radius)');
    expect(css).toContain('--radius-xl: calc(var(--radius) + 4px)');
  });

  it('توكنز RADIUS تعكس الهرمية المعتمدة', () => {
    expect(RADIUS.control).toBe('rounded-md');
    expect(RADIUS.inset).toBe('rounded-md');
    expect(RADIUS.overlay).toBe('rounded-lg');
    expect(RADIUS.modal).toBe('rounded-xl');
    expect(RADIUS.panel).toBe('rounded-none');
    expect(RADIUS.pill).toBe('rounded-full');
  });

  it('لا استدارة كبيرة (ويب/جوال) في أي مصدر — 16px+ ممنوعة', () => {
    // rounded-2xl/3xl كانت تُستخدم في الحوارات قبل 21 أكتوبر 2026؛
    // حصرها يمنع عودة البطاقات المستديرة العائمة إلى محرر سطح المكتب.
    const offenders: string[] = [];
    for (const full of walkSource(SRC)) {
      const lines = readFileSync(full, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (/(?:^|\s)rounded-(2xl|3xl)(?=\s|$)/.test(line)) {
          offenders.push(`${basename(full)}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(offenders, `استدارة كبيرة ممنوعة:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('UI Compliance Guard — طبقات الارتفاع (Shadow Fluent)', () => {
  it('كل صنف ظل مستعمل في المصدر معرّف فعلاً في index.css', () => {
    // يمنع تكرار علة shadow-fluent-24: صنف غير معرّف لا يُولَّد إطلاقاً
    // فيرسم العنصر بلا ظل دون أي خطأ ظاهر.
    const css = read('index.css');
    const defined = new Set<string>();
    for (const m of css.matchAll(/--fluent-shadow-(\d+)\s*:/g)) defined.add(m[1]);

    const used = new Map<string, string[]>();
    for (const full of walkSource(SRC)) {
      const text = readFileSync(full, 'utf-8');
      for (const m of text.matchAll(/shadow-fluent-(\d+)/g)) {
        const list = used.get(m[1]) ?? [];
        list.push(basename(full));
        used.set(m[1], list);
      }
    }

    const missing = [...used.keys()].filter((token) => !defined.has(token));
    expect(
      missing,
      `أصناف ظل مستعملة وغير معرّفة في index.css: ${missing
        .map((t) => `shadow-fluent-${t} (${used.get(t)?.slice(0, 3).join(', ')})`)
        .join(' | ')}`,
    ).toEqual([]);
  });

  it('لا ظل ثقيل (28) على الأسطح العائمة — الدرجة المعتمدة 16', () => {
    const offenders: string[] = [];
    for (const full of walkSource(SRC)) {
      const lines = readFileSync(full, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (/(?:^|\s)shadow-fluent-28(?=\s|$)/.test(line)) {
          offenders.push(`${basename(full)}:${i + 1}`);
        }
      });
    }
    expect(offenders, `ظلال 28px باقية:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('UI Compliance Guard — سطوح الألواح المسطّحة', () => {
  it('FluentSection صف مسطّح بخط فاصل — بلا بطاقة عائمة', () => {
    const source = read('components/ui/blocks/fluent-section.tsx');
    expect(source).toContain('border-b');
    expect(source).not.toMatch(/(?:^|\s)rounded-(xl|2xl|full)(?=\s|$)/);
    expect(source).not.toMatch(/(?:^|\s)shadow-(xs|2xs|sm|md|lg|xl)(?=\s|$)/);
  });

  it('FluentSegmentedControl الأفقي بخط سفلي نشط — بلا كبسولة عائمة', () => {
    const source = read('components/ui/blocks/fluent-segmented-control.tsx');
    expect(source).toContain('bottom-0');
    expect(source).toContain('h-0.5');
  });

  it('ألواح الخصائص: رأس مضغوط 36px بدل 48px', () => {
    const source = read('components/editor/panels/panel-shell.tsx');
    expect(source).toContain('h-9');
    expect(source).not.toContain('min-h-12');
  });
});

describe('UI Compliance Guard — حلقة التركيز البؤرية (R24/R36)', () => {
  it.each(FOCUS_RING_FILES)('%s يستعمل الحلقة البؤرية الأساسية', (rel) => {
    // الحد الأدنى الذهبي في كل عنصر تحكّم/كتلة: ring-2 + ring-primary متجاورتان
    expect(
      read(rel),
      `${rel} ينبغي أن يحمل focus-visible:ring-2 focus-visible:ring-primary`,
    ).toContain('focus-visible:ring-2 focus-visible:ring-primary');
  });

  it('عناصر التحكم النصية تحمل الحلقة المزدوجة (ring-offset-background)', () => {
    for (const rel of [
      'components/ui/button.tsx',
      'components/ui/input.tsx',
      'components/ui/switch.tsx',
      'components/ui/tabs.tsx',
      'components/editor/system/window-controls.tsx',
    ]) {
      expect(read(rel), `${rel} ينبغي أن يحمل focus-visible:ring-offset-background`).toContain(
        'focus-visible:ring-offset-background',
      );
    }
  });

  it('زر الأساس يعتمد كل توكنز سلسلة FOCUS_RING', () => {
    const button = read('components/ui/button.tsx');
    for (const token of FOCUS_RING.split(' ')) {
      expect(button, `button.tsx مفقود فيه ${token}`).toContain(token);
    }
  });
});

describe('UI Compliance Guard — طبقات z-index', () => {
  // الترخيص الوحيد لـ z-50 الخام: أوامر Radix overlay هذه (قيم التراكب الصحيحة).
  // أي استخدام خارجها يجب أن يمرّ عبر توكن z-(--z-*).
  const OVERLAY_PRIMITIVES = new Set([
    'dialog.tsx',
    'alert-dialog.tsx',
    'popover.tsx',
    'select.tsx',
    'sheet.tsx',
    'tooltip.tsx',
    'dropdown-menu.tsx',
  ]);

  it('مقابض النافذة تستعمل توكن z ولا قيمة z خامة (عشوائية)', () => {
    const source = read('components/editor/system/window-controls.tsx');
    expect(source).not.toMatch(/(?:^|\s)z-(20|30|50)(?=\s|$)/);
    expect(source).toMatch(/z-\(--z-[a-z-]+\)/);
  });

  it('لا z خام (20/30/50) في مكوّنات ui خارج أوامر overlay المرخّصة', () => {
    const uiDir = join(SRC, 'components/ui');
    const violations: string[] = [];
    for (const full of walkSource(uiDir)) {
      const base = basename(full);
      if (OVERLAY_PRIMITIVES.has(base)) continue;
      const lines = readFileSync(full, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (/(?:^|\s)z-(20|30|50)(?=\s|$)/.test(line)) {
          violations.push(`${base}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(violations, `z خام خارج التراخيص:\n${violations.join('\n')}`).toEqual([]);
  });

  it('أوامر overlay المرخّصة تحتفظ فعلاً بقيمة z-50 الصحيحة', () => {
    // هذه هي الطبقات التي يُسمح فيها بالـ z-50 — وثّق الاستثناء صراحةً
    expect(read('components/ui/dialog.tsx')).toContain('z-50');
    expect(read('components/ui/popover.tsx')).toContain('z-50');
  });

  it('كل توكن z-(--z-*) مُشار إليه معرَّف فعلاً في index.css', () => {
    const css = read('index.css');
    const defined = new Set<string>();
    for (const m of css.matchAll(/--z-([a-z-]+)\s*:/g)) defined.add(m[1]);

    const referenced = new Set<string>();
    for (const full of walkSource(SRC)) {
      const text = readFileSync(full, 'utf-8');
      for (const m of text.matchAll(/z-\(--z-([a-z-]+)\)/g)) referenced.add(m[1]);
    }

    const missing = [...referenced].filter((token) => !defined.has(token));
    expect(missing, `توكنز z مستعملة لكن غير معرّفة في index.css: ${missing.join(', ')}`).toEqual(
      [],
    );
  });
});

describe('UI Compliance Guard — ارتفاعات خارج السلم (R4)', () => {
  it('لا ارتفاعات بخطوات فوضوية (كسر متعدّد للنقطة) في المصدر', () => {
    // الكود يستعمل ارتفاعات كسرية مقصودة على سلم التصميم (أيقونات h-3.5، صفوف
    // h-8.5 ...)؛ الحارس يستهدف الفئة غير الصالحة بوضوح: خطوة h-X.Y.Z مشوّهة.
    const offenders: string[] = [];
    for (const full of walkSource(SRC)) {
      const text = readFileSync(full, 'utf-8');
      for (const m of text.matchAll(/\bh-\d+\.\d+\.\d+/g)) {
        offenders.push(m[0]);
      }
    }
    expect(offenders, `ارتفاعات خارج السلم: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('UI Compliance Guard — التسجيل الموحد (H9)', () => {
  const norm = (p: string) => p.replace(/\\/g, '/');
  it('لا console خام في كود الإنتاج — فقط createLogger أو asserts التطوير', () => {
    // الاستثناءات المشروعة: مكتبة السجل نفسها، asserts حارس الامتثال
    // (dev-only بطبيعتها)، ملفات الاختبارات. الـconsole.debug التشخيصي
    // مسموح عمداً (يُحجب في الإنتاج داخل lib/logger).
    const offenders: string[] = [];
    for (const full of walkSource(SRC)) {
      const n = norm(full);
      if (n.endsWith('lib/logger.ts')) continue;
      if (n.endsWith('lib/ui/ui-compliance.ts')) continue;
      if (/\.test\.|\.spec\./.test(n)) continue;
      const lines = readFileSync(full, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (/\bconsole\.(error|warn)\(/.test(line)) {
          offenders.push(`${basename(full)}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(offenders, `console خام خارج المسارات المشروعة:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('كل ملف إنتاج يسجّل error/warn يستورد createLogger فعلياً', () => {
    const offenders: string[] = [];
    for (const full of walkSource(SRC)) {
      const n = norm(full);
      // asserts حارس الامتثال dev-only بطبيعتها — مستثناة
      if (n.endsWith('lib/ui/ui-compliance.ts')) continue;
      if (/\.test\.|\.spec\./.test(n)) continue;
      const text = readFileSync(full, 'utf-8');
      if (/\bconsole\.(error|warn)\(/.test(text) && !/createLogger/.test(text)) {
        offenders.push(basename(full));
      }
    }
    expect(offenders, `ملفات بلا createLogger:\n${offenders.join('\n')}`).toEqual([]);
  });
});
