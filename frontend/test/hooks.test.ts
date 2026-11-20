import { renderHook, act, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useTheme } from '../src/hooks/use-theme';
import { useWindowControls } from '../src/hooks/use-window-controls';
import { WindowToggleMaximise, WindowIsMaximised, EventsOn } from '../wailsjs/runtime/runtime';

vi.mock('@bindings/grido/app', () => ({
  RequestGracefulQuit: vi.fn(() => Promise.resolve(1)),
  RespondGracefulQuit: vi.fn(() => Promise.resolve(true)),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
}));

vi.mock('../wailsjs/runtime/runtime', () => ({
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
  Quit: vi.fn(),
  WindowIsMaximised: vi.fn(() => Promise.resolve(false)),
  EventsOn: vi.fn(() => () => {}),
}));

describe('Hooks Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.clearAllMocks();
  });

  it('initializes theme to dark by default and applies class', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles theme between light and dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('grido-theme')).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('grido-theme')).toBe('dark');
  });
});

describe('useTheme — shared snapshot ownership', () => {
  let dark = true;
  let listeners: Set<(event: MediaQueryListEvent) => void>;
  let media: MediaQueryList;

  beforeEach(() => {
    dark = true;
    listeners = new Set();
    media = {
      get matches() {
        return dark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((_type, callback) => listeners.add(callback)),
      removeEventListener: vi.fn((_type, callback) => listeners.delete(callback)),
    } as unknown as MediaQueryList;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shares a cached snapshot across consumers with one removable media listener', () => {
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());
    expect(listeners.size).toBe(1);
    act(() => first.result.current.setThemeMode('light'));
    expect(second.result.current.themeMode).toBe('light');
    expect(second.result.current.theme).toBe('light');
    first.unmount();
    expect(listeners.size).toBe(1);
    second.unmount();
    expect(listeners.size).toBe(0);
  });

  it('reconciles a system change between rendering and subscribing', () => {
    let reads = 0;
    Object.defineProperty(media, 'matches', {
      get: () => ++reads <= 2,
    });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('survives StrictMode replay and follows system changes after remount', () => {
    const first = renderHook(() => useTheme(), { wrapper: StrictMode });
    expect(listeners.size).toBe(1);
    act(() => {
      dark = false;
      listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    });
    expect(first.result.current.theme).toBe('light');
    first.unmount();
    expect(listeners.size).toBe(0);
    dark = true;
    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe('dark');
    expect(listeners.size).toBe(1);
  });
});

describe('useWindowControls — حالة التكبير ومزامنتها', () => {
  const eventsOn = EventsOn as unknown as ReturnType<typeof vi.fn>;
  const isMaximised = WindowIsMaximised as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يبدأ غير مُكبَّر ويشترك بأحداث Wails الأربعة عند التركيب', () => {
    const { result } = renderHook(() => useWindowControls());

    expect(result.current.isMaximized).toBe(false);
    expect(eventsOn).toHaveBeenCalledTimes(4);
    expect((eventsOn.mock.calls as string[][]).map((call) => call[0])).toEqual([
      'windows:WindowMaximise',
      'windows:WindowUnMaximise',
      'windows:WindowRestore',
      'window-maximized-changed',
    ]);
  });

  it('التكبير: نداء Wails مرة واحدة مع تبديل تفاؤلي ثم تأكيد بالحالة الفعلية', async () => {
    const { result } = renderHook(() => useWindowControls());

    // استقرار المزامنة الأولية من التركيب (المحاكاة: غير مُكبَّر)
    await act(async () => {});
    expect(result.current.isMaximized).toBe(false);

    // النقرة: تبديل تفاؤلي فوري قبل وصول التأكيد
    act(() => {
      result.current.handleMaximize();
    });
    expect(WindowToggleMaximise).toHaveBeenCalledTimes(1);
    expect(result.current.isMaximized).toBe(true);

    // التأكيد بعد 60ms يعيد الحالة للقيمة الفعلية (المحاكاة: false)
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });
    });
    expect(result.current.isMaximized).toBe(false);

    // حدث resize مؤخَّر يستدعي WindowIsMaximised بعد استقرار الحجم
    isMaximised.mockClear();
    window.dispatchEvent(new Event('resize'));
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 160);
      });
    });
    expect(isMaximised).toHaveBeenCalled();
  });

  it('يُطهَّر مستمع resize ويكذّب المؤقّتات عند إلغاء التركيب بلا خطأ', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    try {
      const { unmount } = renderHook(() => useWindowControls());
      removeSpy.mockClear();
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      removeSpy.mockRestore();
    }
  });
});
