import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { MobilePanelsSheet } from '../src/components/editor/workspace/mobile-panels-sheet';

/**
 * ورقة اللوحات المدمجة: كان فيها رأس مرئي «لوحات العمل» فوق شريط تبويبات
 * يسمّي اللوحة أصلاً، وتبويب باسم «القوالب» وهو يحتضن أدوات الوضع الحر
 * والكولاج معاً. الاختبار يثبّت إزالة الكروم المكرر والتسمية الصحيحة.
 */
describe('MobilePanelsSheet — كروم بلا تكرار', () => {
  afterEach(() => {
    cleanup();
  });

  it('يسمّي تبويب الأدوات ويستغني عن رأس «لوحات العمل»', async () => {
    render(
      <MobilePanelsSheet
        open
        onOpenChange={() => {}}
        activeTab="templates"
        onActiveTabChange={() => {}}
        templatesContent={<div>محتوى الأدوات</div>}
        propertiesContent={<div>محتوى الخصائص</div>}
      />,
    );

    expect(await screen.findByRole('tab', { name: 'الأدوات' })).toBeInTheDocument();
    expect(screen.queryByText('القوالب')).toBeNull();
    expect(document.querySelector('[data-slot="sheet-header"]')).toBeNull();
  });
});
