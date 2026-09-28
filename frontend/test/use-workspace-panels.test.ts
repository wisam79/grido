import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

describe('useWorkspacePanels — مزامنة القوالب عند عبور الـ breakpoint', () => {
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

  it('wide → standard والدرج مفتوح: القوالب تظهر يميناً', async () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());
    expect(result.current.breakpoint).toBe('wide');

    // الدرج مفتوح افتراضياً — نضمن اللوحة اليمنى على الخصائص أولاً
    act(() => {
      result.current.setActivePanel('properties');
    });
    expect(result.current.activePanel).toBe('properties');

    await resizeTo(1280);

    expect(result.current.breakpoint).toBe('standard');
    expect(result.current.activePanel).toBe('templates');
  });

  it('wide → standard والدرج مغلق صراحةً: لا تُفتح القوالب قسراً', async () => {
    setWindowWidth(1600);
    const { result } = renderHook(() => useWorkspacePanels());

    act(() => {
      result.current.setIsTemplatesDrawerOpen(false);
      result.current.setActivePanel('properties');
    });

    await resizeTo(1280);

    expect(result.current.breakpoint).toBe('standard');
    expect(result.current.activePanel).toBe('properties');
  });

  it('standard → wide واليمنى على القوالب: الدرج يُفتح', async () => {
    const { result } = renderHook(() => useWorkspacePanels());
    expect(result.current.breakpoint).toBe('standard');
    expect(result.current.activePanel).toBe('templates');

    await resizeTo(1600);

    expect(result.current.breakpoint).toBe('wide');
    expect(result.current.isTemplatesDrawerOpen).toBe(true);
  });

  it('standard → wide واليمنى على الخصائص: الدرج يبقى مغلقاً', async () => {
    const { result } = renderHook(() => useWorkspacePanels());

    act(() => {
      result.current.setActivePanel('properties');
      result.current.setIsTemplatesDrawerOpen(false);
    });

    await resizeTo(1600);

    expect(result.current.breakpoint).toBe('wide');
    expect(result.current.isTemplatesDrawerOpen).toBe(false);
  });
});
