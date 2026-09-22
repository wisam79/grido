import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { FreeformBackdropsTab } from '../src/components/editor/panels/freeform/freeform-backdrops-tab';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { GRADIENT_PRESETS } from '../src/components/editor/properties/gradient-utils';

/**
 * تبويب الخلفيات في التعديل الحر — الانحدارات التي تثبت هذا الاختبار:
 *  - بطاقة التدرج على هدف «خلفية كاملة» تُنشئ مستطيلاً واحداً يغطي الورقة
 *    خلف كل العناصر، والبطاقة التالية تُحدّثه بدل تكديس مستطيلات.
 *  - الخلفية الكاملة تأتي دائماً أسفل العناصر (zIndex سالب).
 *  - هدف «العنصر المحدد» يكتب تعبئة تدرج خطي على التحديد فقط.
 *  - إجراءات التنظيف (حذف الخلفيات/إزالة تدرج الورقة) تعمل وتُسجَّل في السجل.
 */

const store = () => useEditorStore.getState();

const renderTab = () =>
  render(
    <TooltipProvider>
      <FreeformBackdropsTab />
    </TooltipProvider>
  );

beforeEach(() => {
  store().reset();
});

describe('addBackdropRect — طبقة خلفية واحدة بلقطة سجل واحدة', () => {
  it('يضيف مستطيلاً كامل الورقة أسفل العناصر ويحدّده', () => {
    const historyBefore = store().history.length;

    const id = store().addBackdropRect({
      fillType: 'linear',
      fillLinearGradientColorStops: [0, '#D4AF37', 1, '#AA771C'],
    });
    const after = store();

    expect(after.elements).toHaveLength(1);
    expect(after.selectedIds).toEqual([id]);
    expect(after.history.length).toBe(historyBefore + 1);

    const backdrop = after.elements[0];
    expect(backdrop.type).toBe('shape');
    expect(backdrop.x).toBe(0);
    expect(backdrop.y).toBe(0);
    expect(backdrop.width).toBe(1);
    expect(backdrop.height).toBe(1);
    expect(backdrop.zIndex).toBeLessThan(0);
  });
});

describe('FreeformBackdropsTab — هدف «خلفية كاملة»', () => {
  it('ينشئ خلفية كاملة بالتدرج المطلوب بدل العنصر الافتراضي', () => {
    renderTab();

    const gold = GRADIENT_PRESETS.find((preset) => preset.id === 'gold')!;
    fireEvent.click(screen.getByLabelText(`خلفية كاملة بتدرج ${gold.name}`));

    const backdrops = store().elements.filter((el) => el.width === 1 && el.height === 1);
    expect(backdrops).toHaveLength(1);
    expect(backdrops[0].fillLinearGradientColorStops).toEqual(gold.stops);
    expect(backdrops[0].zIndex).toBeLessThan(0);
  });

  it('يحدّث الخلفية الكاملة عند اختيار تدرج آخر ولا يكدّس مستطيلات', () => {
    renderTab();

    const gold = GRADIENT_PRESETS.find((preset) => preset.id === 'gold')!;
    const navy = GRADIENT_PRESETS.find((preset) => preset.id === 'navy')!;

    fireEvent.click(screen.getByLabelText(`خلفية كاملة بتدرج ${gold.name}`));
    fireEvent.click(screen.getByLabelText(`خلفية كاملة بتدرج ${navy.name}`));

    const backdrops = store().elements.filter((el) => el.width === 1 && el.height === 1);
    expect(backdrops).toHaveLength(1);
    expect(backdrops[0].fillLinearGradientColorStops).toEqual(navy.stops);
  });

  it('يحذف الخلفيات الكاملة من إجراء التنظيف مع إمكانية التراجع', () => {
    renderTab();

    const gold = GRADIENT_PRESETS.find((preset) => preset.id === 'gold')!;
    fireEvent.click(screen.getByLabelText(`خلفية كاملة بتدرج ${gold.name}`));
    expect(store().elements).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('حذف الخلفيات الكاملة'));
    expect(store().elements).toHaveLength(0);

    // التراجع إجراء متجر مباشر بينما المكوّن مركّب — يُلفّ بـ act لتحديث الواجهة
    act(() => store().undo());
    expect(store().elements).toHaveLength(1);
  });
});

describe('FreeformBackdropsTab — هدف «العنصر المحدد»', () => {
  it('يطبّق التدرج على العنصر المحدد فقط', () => {
    store().addShapeElement('ellipse');
    renderTab();

    fireEvent.click(screen.getByRole('tab', { name: 'العنصر المحدد' }));

    const gold = GRADIENT_PRESETS.find((preset) => preset.id === 'gold')!;
    const card = screen.getByLabelText(`تطبيق تدرج ${gold.name} على العنصر المحدد`);
    fireEvent.click(card);

    const element = store().elements[0];
    expect(element.fillType).toBe('linear');
    expect(element.fillLinearGradientColorStops).toEqual(gold.stops);
    expect(element.width).not.toBe(1);
  });

  it('يحدّد كل العناصر من زر «تحديد الكل» حين لا يوجد تحديد', () => {
    store().addShapeElement('rect');
    const created = store().elements[0].id;
    store().setSelectedIds([]);
    expect(store().selectedIds).toHaveLength(0);

    renderTab();
    fireEvent.click(screen.getByRole('tab', { name: 'العنصر المحدد' }));
    fireEvent.click(screen.getByText('تحديد الكل'));

    expect(store().selectedIds).toEqual([created]);
  });
});

describe('FreeformBackdropsTab — خلفية الورقة', () => {
  it('لا يُكرّر أداة الورقة: بطاقة حالة وانتقال فقط', () => {
    renderTab();

    expect(screen.getByLabelText('تعديل خلفية الورقة')).toBeInTheDocument();
    // أدوات تعديل الورقة (المنتقي ومفتاح التعبئة المتدرجة) ليست في التبويب
    expect(screen.queryByText('لون مخصص')).toBeNull();
    expect(screen.queryByText('تعبئة متدرجة')).toBeNull();
  });

  it('يزيل تدرج الورقة من الملخص الحيّ', () => {
    store().setBackgroundColor('#FFFFFF');
    store().setBackgroundGradientColor2('#1E40AF');
    renderTab();

    expect(store().backgroundGradientColor2).toBe('#1E40AF');
    fireEvent.click(screen.getByLabelText('إزالة تدرج الورقة'));
    expect(store().backgroundGradientColor2).toBeNull();
  });
});
