import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertiesPanel } from '../src/components/editor/panels/properties-panel';
import {
  PaperBackgroundSummary,
  StudioCanvasColorDeck,
} from '../src/components/editor/properties/shared-controls';
import { useEditorStore } from '../src/lib/editor-store';
import {
  PAPER_BACKGROUND_EVENTS,
  openPaperBackgroundTool,
} from '../src/lib/ui/paper-background';
import { TooltipProvider } from '../src/components/ui/tooltip';

/**
 * خلفية الورقة أداة واحدة في التطبيق:
 *  - أداة التعديل (StudioCanvasColorDeck) بلا مبدّل نوع تعبئة وبلا معرض تدرجات
 *    مدمج — المعرض الوحيد يعيش في تبويب الخلفيات.
 *  - اللوحات الأخرى تعرض بطاقة حالة + زر ينقل إلى لوحة الخصائص ويفتح قسم الورقة
 *    ويحوّل تبويب الإعدادات العامة إليه.
 */

const store = () => useEditorStore.getState();

const renderWithProvider = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

beforeEach(() => {
  store().reset();
});

describe('openPaperBackgroundTool — انتقال موحّد إلى أداة الورقة', () => {
  it('يلغي التحديد ويُطلق حدثي فتح اللوحة وتوجيهها إلى قسم الورقة', () => {
    store().selectAllElements();
    store().addTextElement('عنصر محدد');
    expect(store().selectedIds.length).toBeGreaterThan(0);

    const openPanel = vi.fn();
    const focusSection = vi.fn();
    window.addEventListener(PAPER_BACKGROUND_EVENTS.openPanel, openPanel);
    window.addEventListener(PAPER_BACKGROUND_EVENTS.focus, focusSection);

    act(() => openPaperBackgroundTool());

    expect(store().selectedIds).toHaveLength(0);
    expect(store().selectedId).toBeNull();
    expect(openPanel).toHaveBeenCalledTimes(1);
    expect(focusSection).toHaveBeenCalledTimes(1);

    window.removeEventListener(PAPER_BACKGROUND_EVENTS.openPanel, openPanel);
    window.removeEventListener(PAPER_BACKGROUND_EVENTS.focus, focusSection);
  });
});

describe('PaperBackgroundSummary — بطاقة حالة بلا أدوات تعديل', () => {
  it('تعرض اللون الحالي وزر الانتقال إلى الأداة', () => {
    store().setBackgroundColor('#F8FAFC');
    renderWithProvider(<PaperBackgroundSummary />);

    expect(screen.getByText('خلفية الورقة')).toBeInTheDocument();
    expect(screen.getByText('#F8FAFC')).toBeInTheDocument();
    expect(screen.getByText('لون مصمت')).toBeInTheDocument();
    expect(screen.getByLabelText('تعديل خلفية الورقة')).toBeInTheDocument();
    // لا أدوات ألوان داخل البطاقة — الأداة في لوحة الخصائص وحدها
    expect(screen.queryByText('لون مخصص')).toBeNull();
  });

  it('تُظهر حالة التدرج مع الزاوية وزر إزالته', () => {
    store().setBackgroundColor('#FFFFFF');
    store().setBackgroundGradientColor2('#1E40AF');
    store().setBackgroundGradientAngle(90);

    renderWithProvider(<PaperBackgroundSummary />);

    expect(screen.getByText('تدرج مطبَّق')).toBeInTheDocument();
    expect(screen.getByText('#FFFFFF → #1E40AF · 90°')).toBeInTheDocument();
    expect(screen.getByLabelText('إزالة تدرج الورقة')).toBeInTheDocument();
  });
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
      />
    );

    // محرر اللونين والزاوية يبقى (خطي دائماً)…
    expect(screen.getByText('البداية')).toBeInTheDocument();
    expect(screen.getByText('النهاية')).toBeInTheDocument();
    expect(screen.getByText('زاوية التدرج')).toBeInTheDocument();
    // …ومبدّل النوع ومعرض التدرجات لا يُعرضان مرتين في التطبيق
    expect(screen.queryByText('مصمت')).toBeNull();
    expect(screen.queryByText('دائري')).toBeNull();
    expect(screen.queryByText('تدرجات جاهزة')).toBeNull();
  });
});

describe('PropertiesPanel — توجيه حدث الورقة إلى تبويب «الورقة»', () => {
  it('يفتح قسم خلفية الورقة بعد الحدث حتى لو كان تبويب الكولاج هو النشط', () => {
    renderWithProvider(<PropertiesPanel />);

    expect(screen.getByText('المسافات والاستدارة')).toBeInTheDocument();
    expect(screen.queryByText('خلفية الورقة')).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent(PAPER_BACKGROUND_EVENTS.focus));
    });

    expect(screen.getByText('خلفية الورقة')).toBeInTheDocument();
    expect(screen.queryByText('المسافات والاستدارة')).toBeNull();
  });
});
