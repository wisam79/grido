import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PanelShell } from '@/components/editor/panels/panel-shell';
import { PropertiesPanel } from '@/components/editor/panels/properties-panel';
import { ElementProperties } from '@/components/editor/properties/element-properties';
import { SlotProperties } from '@/components/editor/properties/slot-properties';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';

import type { CanvasSlot, ImageElement, ShapeElement } from '@/lib/editor-store';

vi.mock('@/components/editor/properties/collage-settings', () => ({
  CollageSettings: () => <span>إعدادات الكولاج الوهمية</span>,
}));
vi.mock('@/components/editor/properties/general-settings', () => ({
  GeneralSettings: () => <span>إعدادات الورقة الوهمية</span>,
}));

vi.mock('@/components/editor/properties/panels/image-properties', () => ({
  ImageStyleProperties: () => <span>تنسيق الصورة</span>,
  ImageAdjustProperties: () => <span>ضبط الصورة</span>,
  ImageEffectsProperties: () => <span>تأثير الصورة</span>,
}));
vi.mock('@/components/editor/properties/panels/shape-properties', () => ({
  ShapeStyleProperties: () => <span>تنسيق الشكل</span>,
  ShapeColorProperties: () => <span>تعبئة الشكل</span>,
}));
vi.mock('@/components/editor/properties/panels/text-properties', () => ({
  TextStyleProperties: () => <span>تنسيق النص</span>,
  TextColorProperties: () => <span>تعبئة النص</span>,
  TextEffectsProperties: () => <span>تأثير النص</span>,
}));
vi.mock('@/components/editor/properties/element/shared/shadow-glow-section', () => ({
  ShadowGlowSection: () => <span>الظل والوهج</span>,
}));
vi.mock('@/components/editor/properties/element/tabs/arrange-tab', () => ({
  ElementArrangeTab: () => <span>ترتيب العنصر</span>,
}));

// DOM contracts only: jsdom does not verify rendered dimensions, clipping or visual quality.
describe('PanelShell desktop surface contracts', () => {
  it('keeps the RTL title and long context readable alongside independent header actions', () => {
    const onCollapse = vi.fn();
    const onAction = vi.fn();
    const title = 'خصائص العنصر المحدد';
    const subtitle = 'صورة الهوية — تفاصيل المقاس والحد الأقصى للطباعة مع سياق طويل كامل';
    const { container } = render(
      <TooltipProvider>
        <div dir="rtl">
          <PanelShell
            title={title}
            subtitle={subtitle}
            onCollapse={onCollapse}
            collapseTitle="إخفاء الخصائص"
            headerExtra={
              <button type="button" onClick={onAction}>
                إظهار العنصر
              </button>
            }
          >
            <span>الخصائص</span>
          </PanelShell>
        </div>
      </TooltipProvider>,
    );
    const header = container.querySelector('[data-slot="ux-panel-header"]');
    expect(header).toHaveClass('min-h-12', 'bg-card/55', 'border-b', 'border-border/70');
    expect(header?.className).not.toMatch(/rounded|shadow/);
    expect(screen.getByText(title)).toHaveClass('text-sm', 'font-semibold');
    expect(screen.getByText(title)).not.toHaveClass('truncate');
    expect(screen.getByText(subtitle)).toHaveClass('[overflow-wrap:anywhere]');
    expect(screen.getByText(subtitle)).not.toHaveClass('truncate');
    expect(screen.getByText(title).parentElement).toHaveClass('min-w-0', 'flex-1', 'text-start');
    const collapse = screen.getByRole('button', { name: 'إخفاء الخصائص' });
    expect(collapse).toHaveClass('min-h-7', 'min-w-7', 'coarse-touch-target');
    expect(collapse.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'إظهار العنصر' }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onCollapse).not.toHaveBeenCalled();
    fireEvent.click(collapse);
    expect(onCollapse).toHaveBeenCalledOnce();
    expect(screen.getByText('الخصائص')).toBeInTheDocument();
  });

  it('provides body rhythm, footer separation and existing style overrides without cards', () => {
    render(
      <PanelShell
        title="القوالب"
        className="custom-shell"
        bodyClassName="custom-body"
        footer={<span>التذييل</span>}
      >
        <span>المحتوى</span>
        <span>قسم آخر</span>
      </PanelShell>,
    );
    const body = screen.getByText('المحتوى').parentElement;
    expect(body).toHaveClass('px-3', 'py-3', 'space-y-4', 'custom-body');
    expect(body?.className).not.toMatch(/rounded|shadow/);
    expect(screen.getByText('المحتوى').closest('.custom-shell')).toBeInTheDocument();
    expect(screen.getByText('التذييل').parentElement).toHaveClass('shrink-0', 'p-3');
    expect(screen.getByText('التذييل').parentElement?.previousElementSibling).toHaveClass(
      'bg-border/50',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not add context or collapse controls when their props are absent', () => {
    const { container } = render(
      <PanelShell title="القوالب">
        <span>المحتوى</span>
      </PanelShell>,
    );
    const header = container.querySelector('[data-slot="ux-panel-header"]');
    expect(header?.textContent).toBe('القوالب');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('omits the entire optional header while keeping body and footer mounted', () => {
    const { container, rerender } = render(
      <TooltipProvider>
        <PanelShell
          title="الخصائص"
          subtitle="الصورة"
          onCollapse={vi.fn()}
          headerExtra={<button type="button">الإجراء</button>}
          footer={<span>التذييل</span>}
        >
          <input aria-label="قيمة العنصر" defaultValue="10" />
        </PanelShell>
      </TooltipProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'قيمة العنصر' });
    fireEvent.change(input, { target: { value: '12' } });
    rerender(
      <TooltipProvider>
        <PanelShell
          showHeader={false}
          title="الخصائص"
          subtitle="الصورة"
          onCollapse={vi.fn()}
          headerExtra={<button type="button">الإجراء</button>}
          footer={<span>التذييل</span>}
        >
          <input aria-label="قيمة العنصر" defaultValue="10" />
        </PanelShell>
      </TooltipProvider>,
    );
    expect(container.querySelector('[data-slot="ux-panel-header"]')).toBeNull();
    expect(screen.queryByText('الصورة')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'قيمة العنصر' })).toBe(input);
    expect(input).toHaveValue('12');
    expect(screen.getByText('التذييل')).toBeInTheDocument();
  });
});

const image: ImageElement = {
  id: 'visual-image',
  type: 'image',
  imageSrc: 'test.png',
  x: 0,
  y: 0,
  width: 0.2,
  height: 0.2,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
};

const shape: ShapeElement = {
  id: 'visual-shape',
  type: 'shape',
  shape: 'rect',
  fill: '#000000',
  x: 0,
  y: 0,
  width: 0.2,
  height: 0.2,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
};

describe('ElementProperties desktop surface contracts', () => {
  it('uses the framed flat panel variant with contextual text tabs and linked content', () => {
    const onUpdate = vi.fn();
    render(<ElementProperties element={image} onUpdate={onUpdate} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('dir', 'rtl');
    expect(tablist).toHaveClass('rounded-lg', 'border', 'border-border/70', 'bg-muted', 'p-1');
    expect(tablist.parentElement).toHaveAttribute('data-slot', 'tabs');
    expect(tablist.parentElement).toHaveClass('gap-3');
    expect(tablist.querySelector('svg')).toBeNull();
    expect(
      within(tablist)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['تنسيق', 'ضبط', 'تأثير', 'ترتيب']);
    expect(tablist.closest('[class*="sticky"], [class*="-mx-"], [class*="backdrop"]')).toBeNull();
    const style = screen.getByRole('tab', { name: 'التنسيق والقياسات' });
    expect(style).toHaveAttribute('aria-selected', 'true');
    expect(style.querySelector('.bg-card')).toBeInTheDocument();
    expect(style.querySelector('[class*="border-primary"]')).toBeNull();
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', style.getAttribute('aria-controls'));
    expect(panel).toHaveAttribute('aria-labelledby', style.id);
    expect(panel).toHaveClass('mt-0', 'space-y-3', 'motion-safe:duration-100');

    act(() => style.focus());
    fireEvent.keyDown(style, { key: 'ArrowLeft' });
    const adjust = screen.getByRole('tab', { name: 'الألوان والضبط' });
    expect(adjust).toHaveFocus();
    expect(adjust).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('ضبط الصورة');
    fireEvent.click(screen.getByRole('tab', { name: 'التأثيرات' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('تأثير الصورة');
    fireEvent.click(screen.getByRole('tab', { name: 'الترتيب' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('ترتيب العنصر');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('retains contextual fill labeling and resets selection for the next element', () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<ElementProperties element={image} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('tab', { name: 'التأثيرات' }));
    rerender(<ElementProperties element={shape} onUpdate={onUpdate} />);
    expect(screen.getByRole('tab', { name: 'الألوان والتعبئة' })).toHaveTextContent('تعبئة');
    expect(screen.getByRole('tab', { name: 'التنسيق والقياسات' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('تنسيق الشكل');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('preserves the disabled and inert fieldset when the element is locked', () => {
    render(<ElementProperties element={{ ...image, locked: true }} onUpdate={vi.fn()} />);
    const fieldset = screen.getByRole('group', { name: 'خصائص العنصر القابلة للتعديل' });
    expect(fieldset).toBeDisabled();
    expect(fieldset).toHaveAttribute('inert');
    expect(fieldset).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'إلغاء القفل' }).closest('fieldset')).toBeNull();
  });

  it('unifies inspector panel tabs across PropertiesPanel (collage) and SlotProperties', () => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ mode: 'collage', selectedId: null });
    const { unmount } = render(
      <TooltipProvider>
        <PropertiesPanel />
      </TooltipProvider>,
    );
    const generalTablist = screen.getByRole('tablist', { name: 'خصائص الكولاج والورقة' });
    expect(generalTablist).toHaveAttribute('dir', 'rtl');
    expect(generalTablist).toHaveClass(
      'rounded-lg',
      'border',
      'border-border/70',
      'bg-muted',
      'p-1',
    );
    expect(generalTablist.parentElement).toHaveClass('gap-3');
    expect(
      generalTablist.closest('[class*="sticky"], [class*="-mx-"], [class*="backdrop"]'),
    ).toBeNull();
    unmount();

    const slot: CanvasSlot = {
      id: 'visual-slot',
      cellIndex: 0,
      x: 0,
      y: 0,
      w: 0.5,
      h: 0.5,
    };
    useEditorStore.setState({ mode: 'collage', slots: [slot], selectedId: slot.id });
    render(
      <TooltipProvider>
        <SlotProperties slot={slot} onUpdate={vi.fn()} />
      </TooltipProvider>,
    );
    const slotTablist = screen.getByRole('tablist', { name: 'خصائص الخلية' });
    expect(slotTablist).toHaveAttribute('dir', 'rtl');
    expect(slotTablist).toHaveClass('rounded-lg', 'border', 'border-border/70', 'bg-muted', 'p-1');
    expect(slotTablist.parentElement).toHaveClass('gap-3');
    expect(
      slotTablist.closest('[class*="sticky"], [class*="-mx-"], [class*="backdrop"]'),
    ).toBeNull();
    const activeSlotTab = screen.getByRole('tab', { name: 'التنسيق والقياسات والتحويلات' });
    const slotPanel = screen.getByRole('tabpanel');
    expect(slotPanel).toHaveAttribute('id', activeSlotTab.getAttribute('aria-controls'));
    expect(slotPanel).toHaveAttribute('aria-labelledby', activeSlotTab.id);
  });
});
