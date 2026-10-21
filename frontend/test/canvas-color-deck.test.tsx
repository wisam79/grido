import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { StudioCanvasColorDeck } from '../src/components/editor/properties/shared-controls';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

/**
 * أداة خلفية الورقة الوحيدة تعيش في لوحة الخصائص:
 *  - محرر اللونين والزاوية (StudioCanvasColorDeck) بلا مبدّل نوع تعبئة
 *    وبلا معرض تدرجات مدمج، فلا تتكرر الأداة في أكثر من لوحة.
 */

const store = () => useEditorStore.getState();

const renderWithProvider = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

beforeEach(() => {
  store().reset();
});

describe('أداة الورقة الوحيدة — بلا عناصر تحكم مكررة', () => {
  it('لا تعرض مبدّل نوع التعبئة ولا معرض التدرجات المدمج', () => {
    store().setBackgroundColor('#FFFFFF');
    store().setBackgroundGradientColor2('#1E40AF');

    renderWithProvider(
      <StudioCanvasColorDeck
        color="#FFFFFF"
        onChange={() => {}}
        gradientColor2="#1E40AF"
        onChangeGradientColor2={() => {}}
        gradientAngle={135}
        onChangeGradientAngle={() => {}}
      />,
    );

    // محرر اللونين والزاوية يبقى (خطي دائماً)…
    expect(screen.getByText('البداية')).toBeInTheDocument();
    expect(screen.getByText('النهاية')).toBeInTheDocument();
    expect(screen.getByText('زاوية التدرج')).toBeInTheDocument();
    // …ومبدّل النوع ومعرض التدرجات لا يُعرضان في التطبيق
    expect(screen.queryByText('مصمت')).toBeNull();
    expect(screen.queryByText('دائري')).toBeNull();
    expect(screen.queryByText('تدرجات جاهزة')).toBeNull();
  });
});
