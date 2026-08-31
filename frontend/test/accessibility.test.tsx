import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
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

/**
 * اختبارات الوصول (a11y) — تفعيل بنية jest-axe الموجودة مسبقاً في setup.ts.
 * تفحص مكونات Fluent الأساسية ضد قواعد axe الشائعة (تباين، أسماء، أدوار ARIA).
 */
describe('Accessibility (jest-axe)', () => {
  it('FluentSection has no accessibility violations', async () => {
    const { container } = render(
      <FluentSection
        icon={<Settings20Regular className="size-4 shrink-0" />}
        title="إعدادات الكانفاس"
        subtitle="تعديل الأبعاد والهوامش"
        action={<button>إعادة ضبط</button>}
      >
        <div>محتوى تجريبي</div>
      </FluentSection>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FluentSettingRow + checkbox has no violations', async () => {
    const { container } = render(
      <TooltipProvider>
        <FluentSettingRow
          label="علامات القص"
          description="إظهار خطوط القص التلقائية"
          control={<input type="checkbox" aria-label="علامات القص" />}
        />
      </TooltipProvider>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FluentSegmentedControl has no violations', async () => {
    const { container } = render(
      <FluentSegmentedControl
        value="a"
        onChange={() => {}}
        options={[
          { id: 'a', label: 'الخيار الأول' },
          { id: 'b', label: 'الخيار الثاني' },
        ]}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FluentEmptyState has no violations', async () => {
    const { container } = render(
      <FluentEmptyState
        icon={<Folder20Regular className="size-8 shrink-0" />}
        title="لا توجد مشاريع"
        description="أنشئ مشروعاً جديداً للبدء"
        actionLabel="مشروع جديد"
        onAction={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FluentIconButton has no violations', async () => {
    const { container } = render(
      <TooltipProvider>
        <FluentIconButton icon={<Sparkle20Regular className="size-3.5 shrink-0" />} tooltip="تطبيق التأثير" onClick={() => {}}>
          تنفيذ
        </FluentIconButton>
      </TooltipProvider>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FluentSliderField has no violations', async () => {
    const { container } = render(
      <FluentSliderField label="الهامش" value={15} min={0} max={50} unit="mm" onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
