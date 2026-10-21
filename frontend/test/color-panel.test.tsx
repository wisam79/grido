import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ColorField } from '../src/components/editor/properties/color-panel';
import { TooltipProvider } from '../src/components/ui/tooltip';
import type { ReactElement } from 'react';

const renderField = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('components/color-panel', () => {
  it('لا يعرض أي عجلة قبل فتح المنتقي', () => {
    renderField(<ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />);

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(0);
  });

  it('يفتح منتقياً واحداً يحوي عجلة واحدة عند النقر على الرقعة', async () => {
    const user = userEvent.setup();
    renderField(<ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />);

    await user.click(screen.getByRole('button', { name: 'تعبئة' }));

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);
  });

  it('يبقي عجلة واحدة فقط مفتوحة عند التبديل بين حقول اللون', async () => {
    const user = userEvent.setup();
    renderField(
      <>
        <ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />
        <ColorField color="#00FF00" onChange={vi.fn()} ariaLabel="حد" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'تعبئة' }));
    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'حد' }));

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);
  });
});
