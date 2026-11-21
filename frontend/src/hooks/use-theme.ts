import { useSyncExternalStore, useCallback } from 'react';

import { invalidateCanvasColors } from '@/lib/canvas/canvas-colors';

export type ThemeMode = 'system' | 'dark' | 'light';
export type EffectiveTheme = 'dark' | 'light';

interface ThemeSnapshot {
  themeMode: ThemeMode;
  systemDark: boolean;
}

function readInitialThemeMode(): ThemeMode {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('grido-theme-mode') || localStorage.getItem('grido-theme');
      if (saved === 'system' || saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
  }
  return 'system'; // الوضع الافتراضي للتطبيق متوافق مع نظام Windows 11
}

function readSystemDark(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true; // احتياطي: الوضع الداكن
}

function resolveEffectiveTheme(mode: ThemeMode, systemDark: boolean): EffectiveTheme {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}

function syncThemeToDom(mode: ThemeMode, systemDark: boolean) {
  const effective = resolveEffectiveTheme(mode, systemDark);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }
  try {
    localStorage.setItem('grido-theme-mode', mode);
    localStorage.setItem('grido-theme', effective);
  } catch {
    // ignore storage errors
  }
  invalidateCanvasColors();
}

let sharedSnapshot: ThemeSnapshot = {
  themeMode: readInitialThemeMode(),
  systemDark: readSystemDark(),
};
const themeSubscribers = new Set<() => void>();
let removeSystemThemeListener: (() => void) | null = null;

function refreshSnapshot(themeMode: ThemeMode, systemDark: boolean) {
  if (sharedSnapshot.themeMode === themeMode && sharedSnapshot.systemDark === systemDark) return;
  sharedSnapshot = { themeMode, systemDark };
}

function getThemeSnapshot(): ThemeSnapshot {
  if (themeSubscribers.size === 0) {
    refreshSnapshot(readInitialThemeMode(), readSystemDark());
  }
  return sharedSnapshot;
}

function subscribeToTheme(listener: () => void) {
  themeSubscribers.add(listener);
  if (themeSubscribers.size === 1 && typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      refreshSnapshot(sharedSnapshot.themeMode, event.matches);
      syncThemeToDom(sharedSnapshot.themeMode, sharedSnapshot.systemDark);
      themeSubscribers.forEach((fn) => fn());
    };
    mediaQuery.addEventListener('change', handleChange);
    removeSystemThemeListener = () => mediaQuery.removeEventListener('change', handleChange);
    // Reconcile changes between render and subscribing; all consumers read one cached snapshot.
    refreshSnapshot(sharedSnapshot.themeMode, mediaQuery.matches);
  }
  syncThemeToDom(sharedSnapshot.themeMode, sharedSnapshot.systemDark);
  themeSubscribers.forEach((fn) => fn());
  return () => {
    themeSubscribers.delete(listener);
    if (themeSubscribers.size === 0) {
      removeSystemThemeListener?.();
      removeSystemThemeListener = null;
    }
  };
}

function updateSharedThemeMode(
  next: ThemeMode | ((prev: ThemeMode, effective: EffectiveTheme) => ThemeMode),
) {
  const { themeMode, systemDark } = sharedSnapshot;
  const effective = resolveEffectiveTheme(themeMode, systemDark);
  refreshSnapshot(typeof next === 'function' ? next(themeMode, effective) : next, systemDark);
  syncThemeToDom(sharedSnapshot.themeMode, sharedSnapshot.systemDark);
  themeSubscribers.forEach((fn) => fn());
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeSnapshot);
  const effectiveTheme = resolveEffectiveTheme(snapshot.themeMode, snapshot.systemDark);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    updateSharedThemeMode(mode);
  }, []);

  // التبديل السلس: عند التبديل من وضع النظام، الانتقال للوضع المقابل مباشرة
  const toggleTheme = useCallback(() => {
    updateSharedThemeMode((prev, effective) => {
      if (prev === 'system') return effective === 'dark' ? 'light' : 'dark';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  return {
    theme: effectiveTheme,
    themeMode: snapshot.themeMode,
    effectiveTheme,
    setThemeMode,
    toggleTheme,
  };
}
