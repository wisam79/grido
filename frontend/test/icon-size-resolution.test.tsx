import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as React from 'react';
import {
  CaretDown,
  FileText,
  Sparkle,
  Image,
  snapToFluentGrid,
  requestedPxFromClassName,
  alignIconBox,
} from '@/components/ui/icons';
import { COLLAGE_TOOLS, STUDIO_TOOLS } from '@/lib/workspace-tools';

/**
 * حارس دقة الأيقونات: تضمن الطبقة أن كل أيقونة تُرسم بنسخة Fluent الأصلية
 * المطابقة لمقاس العرض (شبكة 12/16/20/24/28/32/48) بدل تصغير شبكة واحدة —
 * وهو سبب المظهر الرفيع/المبكسل سابقاً.
 */
describe('دقة الأيقونات (Fluent native grid resolution)', () => {
  it('تُقرّب المقاسات خارج شبكات Fluent إلى أقرب شبكة أصلية', () => {
    expect(snapToFluentGrid(16)).toBe(16);
    expect(snapToFluentGrid(20)).toBe(20);
    expect(snapToFluentGrid(13)).toBe(12);
    expect(snapToFluentGrid(14)).toBe(16);
    expect(snapToFluentGrid(10)).toBe(12);
    expect(snapToFluentGrid(18)).toBe(20);
    expect(snapToFluentGrid(36)).toBe(32);
    expect(snapToFluentGrid(40)).toBe(48);
  });

  it('تقرأ مقاس العرض من أصناف Tailwind (w-* / size-*) دون الالتباس بأصناف أخرى', () => {
    expect(requestedPxFromClassName('w-4 h-4 shrink-0')).toBe(16);
    expect(requestedPxFromClassName('w-3.5 h-3.5')).toBe(14);
    expect(requestedPxFromClassName('size-5')).toBe(20);
    expect(requestedPxFromClassName('w-[18px]')).toBe(18);
    expect(requestedPxFromClassName('min-w-[46px]')).toBeNull();
    expect(requestedPxFromClassName('text-muted-foreground')).toBeNull();
    expect(requestedPxFromClassName(undefined)).toBeNull();
  });

  it('تثبّت صندوق العرض على الشبكة المختارة ببقاء بقية الأصناف', () => {
    expect(alignIconBox('w-3.5 h-3.5 text-primary', 16)).toBe('size-4 text-primary');
    expect(alignIconBox('w-6 h-6', 24)).toBe('size-6');
    expect(alignIconBox(undefined, 20)).toBe('size-5');
    expect(alignIconBox('shrink-0', 12)).toBe('size-3 shrink-0');
    // الفئات المتغيّرة/الحالة تُحذف كاملة — لا تبقى بادئة مبتورة مثل "sm:"
    expect(alignIconBox('sm:w-6 group-hover:size-5 text-primary', 24)).toBe('size-6 text-primary');
    expect(alignIconBox('hover:!w-4', 12)).toBe('size-3');
  });

  it('ترسم نسخة Fluent المطابقة للشبكة المطلوبة (viewBox أصلي)', () => {
    const viewBoxOf = (node: React.ReactElement) => {
      const { container } = render(node);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      return { viewBox: svg?.getAttribute('viewBox'), className: svg?.getAttribute('class') ?? '' };
    };

    // 16px → شبكة 16 (كانت 20 سابقاً فتبدو رفيعة)
    const at16 = viewBoxOf(<FileText className="w-4 h-4" />);
    expect(at16.viewBox).toBe('0 0 16 16');
    expect(at16.className).toContain('size-4');

    // 14px خارج الشبكة → تقريب إلى 16
    const at14 = viewBoxOf(<Image className="w-3.5 h-3.5" />);
    expect(at14.viewBox).toBe('0 0 16 16');

    // أيقونة متعددة الشبكات: 12px → شبكة 12
    const at12 = viewBoxOf(<CaretDown className="w-3 h-3" />);
    expect(at12.viewBox).toBe('0 0 12 12');

    // خاصية size لها الأولوية على الأصناف
    const at24 = viewBoxOf(<Sparkle size={24} className="w-3.5 h-3.5" />);
    expect(at24.viewBox).toBe('0 0 24 24');

    // بلا أي تلميح: الافتراضي 16 (يطابق قاعدة Button)
    const fallback = viewBoxOf(<FileText />);
    expect(fallback.viewBox).toBe('0 0 16 16');
  });

  it('تحلّ أيقونات سجل أدوات الشريط على شبكة Fluent 20 الأصلية (حارس الانحدار)', () => {
    // انحدار سابق: الماسح لا يرى المراجع `icon: X` (ليست وسوم JSX) فتُولَّد
    // أيقونات الشريط بشبكة 16 فقط، وتنكمش قسراً من size-5 المطلوب إلى size-4.
    const tools = [...COLLAGE_TOOLS, ...STUDIO_TOOLS];
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      const { container, unmount } = render(<tool.icon className="size-5 relative z-10" />);
      const svg = container.querySelector('svg');
      const label = `${tool.label} (${tool.id})`;
      expect(svg?.getAttribute('viewBox'), label).toBe('0 0 20 20');
      expect(svg?.getAttribute('class') ?? '', label).toContain('size-5');
      unmount();
    }
  });
});
