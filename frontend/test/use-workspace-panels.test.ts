import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useWorkspacePanels } from '../src/hooks/use-workspace-panels';
import { useEditorStore } from '../src/lib/editor-store';

const STORAGE_KEY = 'grido_workspace_layout_v1';

beforeEach(() => act(() => useEditorStore.getState().selectElement(null)));
afterEach(() => act(() => useEditorStore.getState().selectElement(null)));

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

async function resizeTo(width: number): Promise<void> {
  await act(async () => {
    setWindowWidth(width);
    window.dispatchEvent(new Event('resize'));
    // rAF داخل الـ hook + دورة تأثير المزامنة
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

describe('useWorkspacePanels — استقرار الألواح عند تغيّر حجم النافذة', () => {
  beforeEach(() => {
    localStorage.clear();
    setWindowWidth(1280);
  });

  afterEach(() => {
    localStorage.clear();
    setWindowWidth(1280);
  });

  it('يحفظ حالة الدرج في localStorage مع كل تبديل', async () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());

    expect(result.current.breakpoint).toBe('wide');

    act(() => {
      result.current.setIsTemplatesDrawerOpen(false);
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).isTemplatesDrawerOpen).toBe(false);

    act(() => {
      result.current.setIsTemplatesDrawerOpen(true);
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).isTemplatesDrawerOpen).toBe(true);
  });

  it('يستعيد حالة الدرج المحفوظة عند الإقلاع', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isTemplatesDrawerOpen: false }));
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());

    expect(result.current.isTemplatesDrawerOpen).toBe(false);
  });

  it('تغيير حجم النافذة (1600px ↔ 1280px): الدرج الأيسر والخصائص يظلان مستقرين في مكانهما', async () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    expect(result.current.isInspectorPinned).toBe(true);

    await resizeTo(1280);

    // الدرج الأيسر واللوحة اليمنى يبقيان مفتوحين في مكانهما دون قفز
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    expect(result.current.isInspectorPinned).toBe(true);
  });

  it('الدرج مغلق صراحةً: لا يُفتح قسراً عند تغيير حجم النافذة', async () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());

    act(() => {
      result.current.setIsTemplatesDrawerOpen(false);
    });

    await resizeTo(1280);

    expect(result.current.isTemplatesDrawerOpen).toBe(false);
  });

  it('النقر أو النقر المزدوج المتكرر على التبويب النشط يُبقي الدرج مفتوحاً ولا يقلصه', () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());

    // الدرج مفتوح والتبويب الافتراضي هو custom
    expect(result.current.isTemplatesDrawerOpen).toBe(true);

    // نقرة أولى على نفس التبويب النشط
    act(() => {
      result.current.selectCollageTab('custom');
    });
    expect(result.current.isTemplatesDrawerOpen).toBe(true);

    // نقرة ثانية (نقر مزدوج سريع)
    act(() => {
      result.current.selectCollageTab('custom');
    });
    expect(result.current.isTemplatesDrawerOpen).toBe(true);

    // نفس السلوك في الاستوديو
    act(() => {
      result.current.selectStudioTab('stickers');
    });
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    act(() => {
      result.current.selectStudioTab('stickers');
    });
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
  });

  it('عقد 1024px (P1-01): يطوي درج القوالب افتراضياً تحت 1200px لضمان كانفاس >= 660px ويفتحه عند 1280px', async () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useWorkspacePanels());

    expect(result.current.breakpoint).toBe('standard');
    expect(result.current.isTemplatesDrawerOpen).toBe(false);
    expect(result.current.isInspectorPinned).toBe(true);

    // عند توسيع النافذة إلى 1280px يُفتح الدرج الأيسر تلقائياً
    await resizeTo(1280);
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    expect(result.current.isInspectorPinned).toBe(true);

    // وعند تصغيرها مجدداً إلى 1024px يُطوى الدرج الأيسر لمنع اختناق الكانفاس
    await resizeTo(1024);
    expect(result.current.isTemplatesDrawerOpen).toBe(false);
    expect(result.current.isInspectorPinned).toBe(true);
  });
});

describe('useWorkspacePanels — وضع التركيز (حفظ واستعادة الحالة السابقة)', () => {
  beforeEach(() => {
    localStorage.clear();
    setWindowWidth(1280);
  });

  afterEach(() => {
    localStorage.clear();
    setWindowWidth(1280);
  });

  it('keeps the inspector hidden in Zen mode while selection changes and restores it on exit', () => {
    act(() => useEditorStore.getState().selectElement('selected-before-zen'));
    const { result } = renderHook(() => useWorkspacePanels());
    expect(result.current.isInspectorOpen).toBe(true);

    act(() => result.current.toggleZenMode());
    expect(result.current.isZenMode).toBe(true);
    expect(result.current.isInspectorOpen).toBe(false);

    act(() => useEditorStore.getState().selectElement('selected-during-zen'));
    expect(result.current.isInspectorOpen).toBe(false);

    act(() => result.current.toggleZenMode());
    expect(result.current.isZenMode).toBe(false);
    expect(result.current.isInspectorOpen).toBe(true);
    expect(useEditorStore.getState().selectedId).toBe('selected-during-zen');
  });

  it('close-all suppresses selection-driven reopening until the inspector is explicitly opened', () => {
    const { result } = renderHook(() => useWorkspacePanels());
    act(() => result.current.closeActivePanel());
    act(() => useEditorStore.getState().selectElement('selected-after-close'));
    expect(result.current.isInspectorOpen).toBe(false);

    act(() => result.current.openPanel('properties'));
    expect(result.current.isInspectorOpen).toBe(true);
  });

  it('ordinary unpinned selection still reveals the inspector without entering Zen mode', () => {
    const { result } = renderHook(() => useWorkspacePanels());
    act(() => {
      result.current.setIsTemplatesDrawerOpen(false);
      result.current.setIsInspectorPinned(false);
    });
    expect(result.current.isInspectorOpen).toBe(false);

    act(() => useEditorStore.getState().selectElement('ordinary-selection'));
    expect(result.current.isInspectorOpen).toBe(true);

    act(() => result.current.toggleZenMode());
    expect(result.current.isInspectorOpen).toBe(false);
    act(() => result.current.toggleZenMode());
    expect(result.current.isInspectorPinned).toBe(false);
    expect(result.current.isTemplatesDrawerOpen).toBe(false);
    expect(result.current.isInspectorOpen).toBe(true);
  });

  it('يحفظ الدرج ولوحة الخصائص عند الدخول ويستعيدهما بدقة عند الخروج', () => {
    const { result } = renderHook(() => useWorkspacePanels());
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    expect(result.current.isInspectorPinned).toBe(true);
    expect(result.current.isZenMode).toBe(false);

    act(() => {
      result.current.toggleZenMode();
    });
    expect(result.current.isZenMode).toBe(true);
    expect(result.current.isTemplatesDrawerOpen).toBe(false);
    expect(result.current.isInspectorPinned).toBe(false);

    act(() => {
      result.current.toggleZenMode();
    });
    expect(result.current.isZenMode).toBe(false);
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
    expect(result.current.isInspectorPinned).toBe(true);
  });
});
