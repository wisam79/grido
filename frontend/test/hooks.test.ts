import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTheme } from '../src/hooks/use-theme';
import { useWindowControls } from '../src/hooks/use-window-controls';
import { WindowToggleMaximise, WindowIsMaximised, EventsOn } from '../wailsjs/runtime/runtime';

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
