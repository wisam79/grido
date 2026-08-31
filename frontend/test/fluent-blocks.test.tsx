import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentSegmentedControl,
  FluentEmptyState,
  FluentIconButton,
} from '../src/components/ui/blocks';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { Settings20Regular, Sparkle20Regular, Folder20Regular } from '@fluentui/react-icons';

describe('Fluent 2 UI Blocks Component Suite', () => {
  describe('FluentSection', () => {
    it('renders section title, subtitle, icon, action, and children', () => {
      render(
        <FluentSection
          icon={<Settings20Regular data-testid="section-icon" className="size-4 shrink-0" />}
          title="إعدادات الكانفاس"
          subtitle="تعديل الأبعاد والهوامش"
          action={<button>إعادة ضبط</button>}
        >
          <div data-testid="section-content">محتوى تجريبي</div>
        </FluentSection>
      );

      expect(screen.getByText('إعدادات الكانفاس')).toBeInTheDocument();
      expect(screen.getByText('تعديل الأبعاد والهوامش')).toBeInTheDocument();
      expect(screen.getByTestId('section-icon')).toBeInTheDocument();
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
        </TooltipProvider>
      );

      expect(screen.getByText('علامات القص')).toBeInTheDocument();
      expect(screen.getByText('إظهار خطوط القص التلقائية')).toBeInTheDocument();
      expect(screen.getByTestId('cut-switch')).toBeInTheDocument();
    });

    it('renders vertical setting row properly', () => {
      render(
        <FluentSettingRow
          layout="vertical"
          label="الاسم"
          description="اسم القالب"
        >
          <input data-testid="name-input" />
        </FluentSettingRow>
      );

      expect(screen.getByText('الاسم')).toBeInTheDocument();
      expect(screen.getByText('اسم القالب')).toBeInTheDocument();
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
    });
  });

  describe('FluentSliderField', () => {
    it('renders slider field with current value and unit', () => {
      const handleChange = vi.fn();
      render(
        <FluentSliderField
          label="الهامش"
          value={15}
          min={0}
          max={50}
          unit="mm"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('الهامش')).toBeInTheDocument();
      expect(screen.getByText('15 mm')).toBeInTheDocument();
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
        />
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
          icon={<Folder20Regular data-testid="empty-icon" className="size-8 shrink-0" />}
          title="لا توجد مشاريع"
          description="أنشئ مشروعاً جديداً للبدء"
          actionLabel="مشروع جديد"
          onAction={handleAction}
        />
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
            icon={<Sparkle20Regular data-testid="btn-icon" className="size-3.5 shrink-0" />}
            tooltip="تطبيق التأثير"
            onClick={handleClick}
          >
            تنفيذ
          </FluentIconButton>
        </TooltipProvider>
      );

      expect(screen.getByTestId('btn-icon')).toBeInTheDocument();
      expect(screen.getByText('تنفيذ')).toBeInTheDocument();

      fireEvent.click(screen.getByText('تنفيذ'));
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
