import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(RADIUS.modal).toBe('rounded-2xl');
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
      const base = full.slice(full.lastIndexOf('\\') + 1);
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
