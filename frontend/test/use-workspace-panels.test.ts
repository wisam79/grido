import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useWorkspacePanels } from '../src/hooks/use-workspace-panels';

const STORAGE_KEY = 'grido_workspace_layout_v1';

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
