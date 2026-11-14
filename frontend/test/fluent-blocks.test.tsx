import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('keeps the section flat and forwards ref, DOM props and styling overrides', () => {
      const ref = React.createRef<HTMLDivElement>();
      const subtitle = 'الحد الأقصى 6×5 صور (30) مع الاحتفاظ بجميع تفاصيل الإعدادات';
      const { container } = render(
        <FluentSection
          ref={ref}
          title="إعدادات الكولاج"
          subtitle={subtitle}
          dir="rtl"
          id="section-contract"
          data-testid="section-root"
          className="custom-section"
          headerClassName="custom-header"
          contentClassName="custom-content"
        >
          <span>الحقل</span>
        </FluentSection>,
      );

      expect(ref.current).toBe(screen.getByTestId('section-root'));
      expect(ref.current).toHaveAttribute('id', 'section-contract');
      expect(ref.current).toHaveAttribute('dir', 'rtl');
      expect(ref.current).toHaveClass('border-b', 'py-3', 'custom-section');
      expect(ref.current?.className).not.toMatch(/rounded|shadow/);
      const header = container.querySelector('[data-slot="ux-section-header"]');
      expect(header).toHaveClass('gap-3', 'mb-3', 'custom-header');
      expect(screen.getByText('إعدادات الكولاج')).toHaveClass('text-control', 'font-semibold');
      expect(screen.getByText(subtitle)).not.toHaveClass('truncate');
      expect(screen.getByText('الحقل').parentElement).toHaveClass('space-y-3', 'custom-content');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('uses native keyboard activation and preserves the title, subtitle and badge name', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <FluentSection
          title="الظل"
          subtitle="ضبط الحواف"
          badge={<span>2</span>}
          collapsible
          defaultOpen={false}
          onOpenChange={onOpenChange}
        >
          <span>محتوى القسم</span>
        </FluentSection>,
      );
      const toggle = screen.getByRole('button', { name: 'الظل 2 ضبط الحواف' });
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).toHaveAttribute('type', 'button');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveClass('min-h-7', 'coarse-touch-target');
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.queryByText('محتوى القسم')).not.toBeInTheDocument();

      await user.tab();
      expect(toggle).toHaveFocus();
      await act(async () => {
        await user.keyboard('{Enter}');
      });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('محتوى القسم')).toBeInTheDocument();
      await act(async () => {
        await user.keyboard(' ');
      });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('محتوى القسم')).not.toBeInTheDocument();
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it('retains a zero badge in the accessible toggle name', () => {
      render(
        <FluentSection title="التحديد" badge={0} collapsible>
          <span>المحتوى</span>
        </FluentSection>,
      );
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'التحديد 0' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('keeps action controls outside the toggle and does not collapse on their activation', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const onAction = vi.fn();
      const { container } = render(
        <FluentSection
          title="الضبط"
          collapsible
          onOpenChange={onOpenChange}
          action={
            <>
              <button type="button" onClick={onAction}>
                إعادة ضبط
              </button>
              <input aria-label="اسم الضبط" />
            </>
          }
        >
          <span>المحتوى</span>
        </FluentSection>,
      );
      const toggle = screen.getByRole('button', { name: 'الضبط' });
      const action = screen.getByRole('button', { name: 'إعادة ضبط' });
      expect(
        container.querySelector('button button, button input, [role="button"] button'),
      ).toBeNull();
      expect(toggle.parentElement).toBe(action.parentElement?.parentElement);
      expect(toggle).not.toContainElement(action);

      await user.tab();
      await user.tab();
      expect(action).toHaveFocus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      await user.click(action);
      await user.type(screen.getByRole('textbox', { name: 'اسم الضبط' }), 'test');
      expect(onAction).toHaveBeenCalledTimes(3);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('المحتوى')).toBeInTheDocument();
    });

    it('leaves controlled state to its owner and keeps actions available while closed', () => {
      const onOpenChange = vi.fn();
      const section = (open: boolean) => (
        <FluentSection
          title="التأثير"
          collapsible
          open={open}
          onOpenChange={onOpenChange}
          action={<button type="button">إعادة ضبط</button>}
        >
          <span>قيمة التأثير</span>
        </FluentSection>
      );
      const { rerender } = render(section(true));
      const toggle = screen.getByRole('button', { name: 'التأثير' });
      fireEvent.click(toggle);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('قيمة التأثير')).toBeInTheDocument();

      rerender(section(false));
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('قيمة التأثير')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'إعادة ضبط' })).toBeInTheDocument();
      expect(toggle.parentElement).toHaveClass('mb-0');
      fireEvent.click(toggle);
      expect(onOpenChange.mock.calls).toEqual([[false], [true]]);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
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

    it.each([
      {
        stacked: true,
        dir: 'rtl' as const,
        forward: 'ArrowDown',
        backward: 'ArrowUp',
        ignored: 'ArrowLeft',
      },
      {
        stacked: true,
        dir: 'ltr' as const,
        forward: 'ArrowDown',
        backward: 'ArrowUp',
        ignored: 'ArrowRight',
      },
      {
        stacked: false,
        dir: 'rtl' as const,
        forward: 'ArrowLeft',
        backward: 'ArrowRight',
        ignored: 'ArrowDown',
      },
      {
        stacked: false,
        dir: 'ltr' as const,
        forward: 'ArrowRight',
        backward: 'ArrowLeft',
        ignored: 'ArrowUp',
      },
    ])(
      'uses the declared axis, wraps, skips disabled and focuses ($stacked / $dir)',
      ({ stacked, dir, forward, backward, ignored }) => {
        const onChange = vi.fn();
        function Control() {
          const [value, setValue] = React.useState('a');
          return (
            <FluentSegmentedControl
              value={value}
              stacked={stacked}
              dir={dir}
              onChange={(next) => {
                onChange(next);
                setValue(next);
              }}
              options={[
                { id: 'a', label: 'First' },
                { id: 'b', label: 'Disabled', disabled: true },
                { id: 'c', label: 'Last' },
              ]}
            />
          );
        }
        render(<Control />);
        const first = screen.getByRole('tab', { name: 'First' });
        const last = screen.getByRole('tab', { name: 'Last' });
        act(() => first.focus());
        expect(screen.getByRole('tablist')).toHaveAttribute(
          'aria-orientation',
          stacked ? 'vertical' : 'horizontal',
        );
        expect(fireEvent.keyDown(first, { key: ignored })).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
        expect(fireEvent.keyDown(first, { key: forward })).toBe(false);
        expect(last).toHaveFocus();
        expect(last).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(last, { key: forward });
        expect(first).toHaveFocus();
        fireEvent.keyDown(first, { key: backward });
        expect(last).toHaveFocus();
        fireEvent.keyDown(last, { key: 'Home' });
        expect(first).toHaveFocus();
        fireEvent.keyDown(first, { key: 'End' });
        expect(last).toHaveFocus();
        expect(screen.getByRole('tab', { name: 'Disabled' })).toHaveAttribute('tabindex', '-1');
      },
    );

    it('keeps an enabled tab stop for disabled or missing selection and handles a single enabled tab', () => {
      const onChange = vi.fn();
      const options = [
        { id: 'a', label: 'Disabled', disabled: true },
        { id: 'b', label: 'Enabled' },
      ];
      const { rerender } = render(
        <FluentSegmentedControl value="a" onChange={onChange} options={options} />,
      );
      const enabled = screen.getByRole('tab', { name: 'Enabled' });
      expect(enabled).toHaveAttribute('tabindex', '0');
      expect(fireEvent.keyDown(enabled, { key: 'End' })).toBe(false);
      expect(enabled).toHaveFocus();
      expect(onChange).toHaveBeenCalledWith('b');
      rerender(<FluentSegmentedControl value="missing" onChange={onChange} options={options} />);
      expect(enabled).toHaveAttribute('tabindex', '0');
      rerender(
        <FluentSegmentedControl
          value="a"
          onChange={onChange}
          options={options.map((option) => ({ ...option, disabled: true }))}
        />,
      );
      expect(screen.getAllByRole('tab').every((tab) => tab.tabIndex === -1)).toBe(true);
    });

    it('does not consume prevented or modified keys', () => {
      const onChange = vi.fn();
      render(
        <div
          onKeyDownCapture={(event) => {
            if (event.key === 'End') event.preventDefault();
          }}
        >
          <FluentSegmentedControl
            value="a"
            onChange={onChange}
            options={[{ id: 'a' }, { id: 'b' }]}
          />
        </div>,
      );
      fireEvent.keyDown(screen.getByRole('tab', { name: 'a' }), { key: 'End' });
      fireEvent.keyDown(screen.getByRole('tab', { name: 'a' }), {
        key: 'ArrowLeft',
        ctrlKey: true,
      });
      expect(onChange).not.toHaveBeenCalled();
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
