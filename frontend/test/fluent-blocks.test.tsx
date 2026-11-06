import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { Sparkle, Folder } from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';

import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentSegmentedControl,
  FluentEmptyState,
  FluentIconButton,
} from '../src/components/ui/blocks';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('Fluent 2 UI Blocks Component Suite', () => {
  describe('FluentSection', () => {
    it('renders section title, subtitle, action, and children', () => {
      render(
        <FluentSection
          title="إعدادات الكانفاس"
          subtitle="تعديل الأبعاد والهوامش"
          action={<button>إعادة ضبط</button>}
        >
          <div data-testid="section-content">محتوى تجريبي</div>
        </FluentSection>,
      );

      expect(screen.getByText('إعدادات الكانفاس')).toBeInTheDocument();
      expect(screen.getByText('تعديل الأبعاد والهوامش')).toBeInTheDocument();
      expect(screen.getByText('إعادة ضبط')).toBeInTheDocument();
      expect(screen.getByTestId('section-content')).toBeInTheDocument();
    });
  });

  describe('FluentSettingRow', () => {
    it('renders horizontal setting row with label, description, and control', () => {
      render(
        <TooltipProvider>
          <FluentSettingRow
            label="علامات القص"
            description="إظهار خطوط القص التلقائية"
            tooltip="مساعدة إضافية"
            control={<input type="checkbox" data-testid="cut-switch" />}
          />
        </TooltipProvider>,
      );

      expect(screen.getByText('علامات القص')).toBeInTheDocument();
      expect(screen.getByText('إظهار خطوط القص التلقائية')).toBeInTheDocument();
      expect(screen.getByTestId('cut-switch')).toBeInTheDocument();
    });

    it('renders vertical setting row properly', () => {
      render(
        <FluentSettingRow layout="vertical" label="الاسم" description="اسم القالب">
          <input data-testid="name-input" />
        </FluentSettingRow>,
      );

      expect(screen.getByText('الاسم')).toBeInTheDocument();
      expect(screen.getByText('اسم القالب')).toBeInTheDocument();
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
    });
  });

  describe.each(['stacked', 'inline'] as const)('FluentSliderField (%s)', (layout) => {
    it('renders slider field with editable numeric value and unit', () => {
      const handleChange = vi.fn();
      render(
        <FluentSliderField
          layout={layout}
          label="الهامش"
          value={15}
          min={0}
          max={50}
          unit="mm"
          onChange={handleChange}
        />,
      );

      expect(screen.getByText('الهامش')).toBeInTheDocument();
      expect(screen.getByText('mm')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'قيمة الهامش' })).toHaveValue('15');
    });

    it('commits typed value on Enter only and clamps it to the range', () => {
      const handleChange = vi.fn();
      const handleCommit = vi.fn();
      render(
        <FluentSliderField
          layout={layout}
          label="الهامش"
          value={15}
          min={0}
          max={50}
          unit="mm"
          onChange={handleChange}
          onCommit={handleCommit}
        />,
      );

      const input = screen.getByRole('textbox', { name: 'قيمة الهامش' });
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '75' } });
      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledWith(50);
      expect(handleCommit).toHaveBeenCalledWith(50);
    });

    it('accepts Arabic-Indic digits and Arabic decimal separator', () => {
      const handleChange = vi.fn();
      render(
        <FluentSliderField
          layout={layout}
          label="الهامش"
          value={15}
          min={0}
          max={50}
          unit="mm"
          onChange={handleChange}
        />,
      );

      const input = screen.getByRole('textbox', { name: 'قيمة الهامش' });
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '٢٫٥' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith(2.5);
    });

    it('shows a reset action only when the value differs from defaultValue', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <FluentSliderField
          layout={layout}
          label="التباعد"
          value={10}
          min={0}
          max={30}
          defaultValue={0}
          onChange={handleChange}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'إعادة تعيين إلى القيمة الافتراضية' }));
      expect(handleChange).toHaveBeenCalledWith(0);

      rerender(
        <FluentSliderField
          layout={layout}
          label="التباعد"
          value={0}
          min={0}
          max={30}
          defaultValue={0}
          onChange={handleChange}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'إعادة تعيين إلى القيمة الافتراضية' }),
      ).not.toBeInTheDocument();
    });

    it('repeated arrow keydowns update onChange only and commit once on keyup', () => {
      const handleChange = vi.fn();
      const handleCommit = vi.fn();
      render(
        <FluentSliderField
          layout={layout}
          label="الهامش"
          value={15}
          min={0}
          max={50}
          step={1}
          unit="mm"
          onChange={handleChange}
          onCommit={handleCommit}
        />,
      );

      const input = screen.getByRole('textbox', { name: 'قيمة الهامش' });
      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // النبضة: onChange لكل ضغطة، وبلا أي التقاط أثناء التكرار
      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenLastCalledWith(12);
      expect(handleCommit).not.toHaveBeenCalled();

      // نهاية النبضة (keyup): التقاط واحد بالقيمة النهائية
      fireEvent.keyUp(input, { key: 'ArrowDown' });
      expect(handleCommit).toHaveBeenCalledTimes(1);
      expect(handleCommit).toHaveBeenCalledWith(12);

      // نبضة ثانية منفصلة تُسجل خطوة التقاط مستقلة (لا دمج ولا تضخيم)
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyUp(input, { key: 'ArrowUp' });
      expect(handleCommit).toHaveBeenCalledTimes(2);
      expect(handleCommit).toHaveBeenLastCalledWith(13);
    });

    it.each([0, 20])(
      'commits a thumb keyboard pulse before immediate undo and preserves it for redo (%i ms before keyup)',
      (beforeKeyupMs) => {
        vi.useFakeTimers();
        useEditorStore.getState().reset();
        const initialRadius = useEditorStore.getState().collageRadius;
        useEditorStore.getState().setCollageRadius(initialRadius + 10);
        useEditorStore.getState().pushHistory();
        const startingIndex = useEditorStore.getState().historyIndex;

        function HistoryField() {
          const radius = useEditorStore((state) => state.collageRadius);
          return (
            <>
              <FluentSliderField
                layout={layout}
                label="الزوايا"
                value={radius}
                min={0}
                max={200}
                onChange={(next) => useEditorStore.getState().setCollageRadius(next)}
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
              <button onClick={() => useEditorStore.getState().undo()}>Undo</button>
              <button onClick={() => useEditorStore.getState().redo()}>Redo</button>
            </>
          );
        }

        const { unmount } = render(<HistoryField />);
        try {
          const thumb = screen.getByRole('slider', { name: 'الزوايا' });
          act(() => thumb.focus());
          fireEvent.keyDown(thumb, { key: 'ArrowUp', code: 'ArrowUp' });
          act(() => vi.advanceTimersByTime(beforeKeyupMs));
          fireEvent.keyUp(thumb, { key: 'ArrowUp', code: 'ArrowUp' });
          expect(useEditorStore.getState().collageRadius).toBe(initialRadius + 11);
          expect(useEditorStore.getState().historyIndex).toBe(startingIndex + 1);

          const undo = screen.getByRole('button', { name: 'Undo' });
          act(() => undo.focus());
          fireEvent.click(undo);
          expect(useEditorStore.getState().collageRadius).toBe(initialRadius + 10);
          expect(useEditorStore.getState().historyIndex).toBe(startingIndex);

          fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
          expect(useEditorStore.getState().collageRadius).toBe(initialRadius + 11);
          expect(useEditorStore.getState().historyIndex).toBe(startingIndex + 1);
          act(() => vi.advanceTimersByTime(500));
          expect(useEditorStore.getState().historyIndex).toBe(startingIndex + 1);
        } finally {
          unmount();
          useEditorStore.getState().reset();
          vi.useRealTimers();
        }
      },
    );

    it('commits the arrow pulse exactly once on blur without re-applying the draft', () => {
      const handleChange = vi.fn();
      const handleCommit = vi.fn();
      render(
        <FluentSliderField
          layout={layout}
          label="الهامش"
          value={15}
          min={0}
          max={50}
          step={1}
          unit="mm"
          onChange={handleChange}
          onCommit={handleCommit}
        />,
      );

      const input = screen.getByRole('textbox', { name: 'قيمة الهامش' });
      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(16);
      expect(handleCommit).not.toHaveBeenCalled();

      // blur يلتقط النبضة مرة واحدة — ودفع المسودة بعد القيمة المرتدة no-op
      fireEvent.blur(input);
      expect(handleCommit).toHaveBeenCalledTimes(1);
      expect(handleCommit).toHaveBeenCalledWith(16);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('FluentSegmentedControl', () => {
    it('renders options and fires onChange when clicked', () => {
      const handleChange = vi.fn();
      render(
        <FluentSegmentedControl
          value="a"
          onChange={handleChange}
          options={[
            { id: 'a', label: 'الخيار الأول' },
            { id: 'b', label: 'الخيار الثاني' },
          ]}
        />,
      );

      expect(screen.getByText('الخيار الأول')).toBeInTheDocument();
      expect(screen.getByText('الخيار الثاني')).toBeInTheDocument();

      fireEvent.click(screen.getByText('الخيار الثاني'));
      expect(handleChange).toHaveBeenCalledWith('b');
    });
  });

  describe('FluentEmptyState', () => {
    it('renders empty state with title, description, and action button', () => {
      const handleAction = vi.fn();
      render(
        <FluentEmptyState
          icon={<Folder data-testid="empty-icon" className="size-8 shrink-0" />}
          title="لا توجد مشاريع"
          description="أنشئ مشروعاً جديداً للبدء"
          actionLabel="مشروع جديد"
          onAction={handleAction}
        />,
      );

      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
      expect(screen.getByText('لا توجد مشاريع')).toBeInTheDocument();
      expect(screen.getByText('أنشئ مشروعاً جديداً للبدء')).toBeInTheDocument();

      const btn = screen.getByText('مشروع جديد');
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalled();
    });
  });

  describe('FluentIconButton', () => {
    it('renders button with icon, tooltip, and handles click', () => {
      const handleClick = vi.fn();
      render(
        <TooltipProvider>
          <FluentIconButton
            icon={<Sparkle data-testid="btn-icon" className="size-3.5 shrink-0" />}
            tooltip="تطبيق التأثير"
            onClick={handleClick}
          >
            تنفيذ
          </FluentIconButton>
        </TooltipProvider>,
      );

      expect(screen.getByTestId('btn-icon')).toBeInTheDocument();
      expect(screen.getByText('تنفيذ')).toBeInTheDocument();

      fireEvent.click(screen.getByText('تنفيذ'));
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
