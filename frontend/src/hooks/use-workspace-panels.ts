import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useUiZoom } from '@/hooks/use-ui-zoom';
import { useEditorStore } from '@/lib/editor-store';
import {
  getDefaultStudioTab,
  isCollageTab,
  isStudioTab,
  migrateLegacyStudioTab,
} from '@/lib/workspace-tools';

import type { CollageTab, FreeformTab } from '@/lib/workspace-tools';

export type WorkspacePanel = 'templates' | 'properties' | null;
export type WorkspaceBreakpoint = 'compact' | 'standard' | 'wide';
// الأنواع ومصدرها سجل الأدوات الموحّد
export type { CollageTab, FreeformTab };

const STORAGE_KEY = 'grido_workspace_layout_v1';

interface StoredPreferences {
  lastActivePanel?: WorkspacePanel;
  lastActiveStudioTab?: FreeformTab;
  lastActiveCollageTab?: CollageTab;
  isInspectorPinned?: boolean;
  isTemplatesDrawerOpen?: boolean;
}

function getStoredPreferences(): StoredPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredPreferences(prefs: StoredPreferences) {
  try {
    const current = getStoredPreferences();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

// عتبة العرض الأدنى لفتح اللوحين الجانبيين (القوالب + الخصائص) معاً افتراضياً:
// عند 1024..1199px يلتهم اللوحان (288+288+44=620px) أكثر من نصف النافذة فينكمش
// الكانفاس إلى 404px (تقرير التدقيق البصري 21، البند P1-01). تحت 1200px يبدأ درج
// القوالب مطوياً افتراضياً ليبقى الكانفاس >= 660px مع إتاحة فتحه بنقرة من الشريط.
export const DUAL_PANEL_MIN_WIDTH = 1200;

function getBreakpoint(width: number): WorkspaceBreakpoint {
  if (width < 1024) return 'compact';
  if (width < 1440) return 'standard';
  return 'wide';
}

export function useWorkspacePanels() {
  const workflow = useEditorStore((state) => state.workflow);
  const { zoomScale } = useUiZoom();
  const getEffectiveWidth = useCallback(
    (scale: number) =>
      typeof window !== 'undefined' ? Math.round(window.innerWidth / (scale || 1)) : 1280,
    [],
  );

  const [windowWidth, setWindowWidth] = useState<number>(() => getEffectiveWidth(zoomScale));

  const breakpoint = useMemo(() => getBreakpoint(windowWidth), [windowWidth]);

  // Load initial preferences
  const [activePanel, setActivePanelState] = useState<WorkspacePanel>(() => {
    const saved = getStoredPreferences().lastActivePanel;
    // 🪟 الافتراضي عند الإقلاع: لوحة التبويب الأول مفتوحة — «الطبقات» في الوضع
    // الحر و«الشبكة» في الكولاج (التبويب الافتراضي لوجهة كل وضع في workspace-tools).
    // لا نبدأ بلا لوحة نشطة: قيمة `null` المحفوظة (إغلاق/وضع التركيز في جلسة
    // سابقة) لا تُعطّل الافتراضي، بينما الاختيار الصريح للوح محدد يُحترم.
    return saved === 'templates' || saved === 'properties' ? saved : 'templates';
  });

  const [isInspectorPinned, setIsInspectorPinnedState] = useState<boolean>(() => {
    const saved = getStoredPreferences().isInspectorPinned;
    // 🧭 وضع الخصائص الافتراضي مثبت (true) كاستوديو تصميم مكتبي،
    // وعند إلغاء تثبيته يدوياً يعمل بنمط الكشف التفاعلي عند التحديد.
    return saved !== undefined ? saved : true;
  });

  // Explicit close-all/Zen takes precedence over selection-driven auto-reveal.
  // Ordinary unpinning still follows selection, even with the templates drawer closed.
  const [isInspectorSuppressed, setIsInspectorSuppressed] = useState(false);
  const [isZenActive, setIsZenActive] = useState(false);
  const hasSelection = useEditorStore((s) => !!s.selectedId || s.selectedIds.length > 0);
  const isInspectorOpen = !isInspectorSuppressed && (isInspectorPinned || hasSelection);

  // Active studio tool — «الطبقات» افتراضياً لمعاينة وتنظيم عناصر الكانفاس
  const [activeStudioTab, setActiveStudioTabState] = useState<FreeformTab>(() => {
    const saved = getStoredPreferences().lastActiveStudioTab;
    // ترحيل التبويبات الموحّدة (elements/presets → stickers) ثم السقوط
    // على الافتراضي إن كان المخزن يحمل قيمة غير صالحة
    const migrated = migrateLegacyStudioTab(saved) ?? saved;
    return isStudioTab(migrated) ? migrated : getDefaultStudioTab(workflow);
  });

  // Active collage tab (custom grid, presets, freeform)
  const [activeCollageTab, setActiveCollageTabState] = useState<CollageTab>(() => {
    const saved = getStoredPreferences().lastActiveCollageTab;
    return isCollageTab(saved) ? saved : 'custom';
  });

  // Mobile Sheet states
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'templates' | 'properties'>('templates');

  // 🛡️ لوحة الأدوات (Ctrl+K) بحالة مشتركة مرفوعة: مستمع الحدث كان داخل
  // WorkspacePanelRail فلا يُركَّب في compact ويموت Ctrl+K هناك. الحالة هنا
  // (الخطاف يعيش في App دائماً) والمشغّلان (الشريط/زر الجوال) يتشاركانها.
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  useEffect(() => {
    const openLauncher = () => setIsLauncherOpen(true);
    window.addEventListener('grido:open-tool-launcher', openLauncher);
    return () => window.removeEventListener('grido:open-tool-launcher', openLauncher);
  }, []);

  // Wide drawer for templates (لوحة التبويب الأول في الشاشات الواسعة) —
  // مفتوحة افتراضياً عند الإقلاع بطلب المالك: التبويب الأول ظاهر بمحتواه بدل
  // أن يبدأ الشريط بلا لوحة (كانت مغلقة دائماً لأن حالتها غير محفوظة أصلاً).
  // تُحفظ الآن في localStorage مثل باقي التفضيلات حتى لا تُفقد عند الإقلاع.
  // The saved preference survives responsive folding and temporary Zen mode.
  const [isTemplatesDrawerOpen, setTemplatesDrawerOpenState] = useState(() => {
    const initialWidth = getEffectiveWidth(zoomScale);
    if (initialWidth < DUAL_PANEL_MIN_WIDTH) {
      return false;
    }
    const saved = getStoredPreferences().isTemplatesDrawerOpen;
    return saved !== undefined ? saved : true;
  });

  const drawerOpenRef = useRef(isTemplatesDrawerOpen);
  const setIsTemplatesDrawerOpenState = useCallback((next: boolean) => {
    drawerOpenRef.current = next;
    setTemplatesDrawerOpenState(next);
  }, []);

  // Resolve functional updates once, outside React's replayed state updaters.
  const setIsTemplatesDrawerOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(drawerOpenRef.current) : value;
      setIsTemplatesDrawerOpenState(next);
      saveStoredPreferences({ isTemplatesDrawerOpen: next });
      if (next) {
        setIsZenActive(false);
        setIsInspectorSuppressed(false);
      }
    },
    [setIsTemplatesDrawerOpenState],
  );

  const prevWidthRef = useRef<number>(windowWidth);

  // Resize listener + UI zoom recalculation (خارج محدّث setState لضمان نقاء التحديث)
  useEffect(() => {
    const syncWidth = () => {
      const nextWidth = getEffectiveWidth(zoomScale);
      const prevWidth = prevWidthRef.current;
      if (prevWidth === nextWidth) return;
      prevWidthRef.current = nextWidth;
      setWindowWidth(nextWidth);

      if (prevWidth < 1024 && nextWidth >= 1024) {
        setIsMobileSheetOpen(false);
      }
      if (prevWidth >= DUAL_PANEL_MIN_WIDTH && nextWidth < DUAL_PANEL_MIN_WIDTH) {
        setIsTemplatesDrawerOpenState(false);
      } else if (
        prevWidth < DUAL_PANEL_MIN_WIDTH &&
        nextWidth >= DUAL_PANEL_MIN_WIDTH &&
        !isZenActive
      ) {
        const saved = getStoredPreferences().isTemplatesDrawerOpen;
        setIsTemplatesDrawerOpenState(saved !== undefined ? saved : true);
      }
    };

    syncWidth();

    let rAFId: number | null = null;
    const handleResize = () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(syncWidth);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rAFId !== null) cancelAnimationFrame(rAFId);
    };
  }, [zoomScale, getEffectiveWidth, isZenActive, setIsTemplatesDrawerOpenState]);

  const setActivePanel = useCallback((panel: WorkspacePanel) => {
    setActivePanelState(panel);
    saveStoredPreferences({ lastActivePanel: panel });
  }, []);

  const setIsInspectorPinned = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsInspectorSuppressed(false);
    setIsZenActive(false);
    setIsInspectorPinnedState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveStoredPreferences({ isInspectorPinned: next });
      return next;
    });
  }, []);

  const setActiveStudioTab = useCallback((tab: FreeformTab) => {
    setActiveStudioTabState(tab);
    saveStoredPreferences({ lastActiveStudioTab: tab });
  }, []);

  const setActiveCollageTab = useCallback((tab: CollageTab) => {
    setActiveCollageTabState(tab);
    saveStoredPreferences({ lastActiveCollageTab: tab });
  }, []);

  const ensureTemplatesDrawerOpen = useCallback(() => {
    setIsZenActive(false);
    setIsInspectorSuppressed(false);
    if (breakpoint === 'compact') {
      setMobileActiveTab('templates');
      setIsMobileSheetOpen(true);
      return;
    }
    // في شاشات سطح المكتب: نضمن دائماً فتح اللوح الأيسر وبقاءه مستقراً
    setIsTemplatesDrawerOpen(true);
  }, [breakpoint, setIsTemplatesDrawerOpen]);

  const selectStudioTab = useCallback(
    (tab: FreeformTab) => {
      setActiveStudioTab(tab);
      ensureTemplatesDrawerOpen();
    },
    [setActiveStudioTab, ensureTemplatesDrawerOpen],
  );

  const selectCollageTab = useCallback(
    (tab: CollageTab) => {
      setActiveCollageTab(tab);
      ensureTemplatesDrawerOpen();
    },
    [setActiveCollageTab, ensureTemplatesDrawerOpen],
  );

  // Toggle or switch panel
  const togglePanel = useCallback(
    (panel: 'templates' | 'properties') => {
      if (breakpoint === 'compact') {
        setMobileActiveTab(panel);
        setIsMobileSheetOpen(true);
        return;
      }

      if (panel === 'templates') {
        if (isTemplatesDrawerOpen) {
          setIsTemplatesDrawerOpen(false);
        } else {
          setIsZenActive(false);
          setIsInspectorSuppressed(false);
          setIsTemplatesDrawerOpen(true);
        }
      } else if (isInspectorOpen) {
        setIsInspectorPinnedState(false);
        saveStoredPreferences({ isInspectorPinned: false });
        setIsInspectorSuppressed(true);
      } else {
        setIsZenActive(false);
        setIsInspectorPinned(true);
      }
    },
    [
      breakpoint,
      isInspectorOpen,
      isTemplatesDrawerOpen,
      setIsInspectorPinned,
      setIsTemplatesDrawerOpen,
    ],
  );

  const openPanel = useCallback(
    (panel: 'templates' | 'properties') => {
      setIsZenActive(false);
      setIsInspectorSuppressed(false);
      if (breakpoint === 'compact') {
        setMobileActiveTab(panel);
        setIsMobileSheetOpen(true);
        return;
      }

      if (panel === 'templates') {
        setIsTemplatesDrawerOpen(true);
      } else {
        setIsInspectorPinned(true);
        setActivePanel('properties');
      }
    },
    [breakpoint, setActivePanel, setIsInspectorPinned, setIsTemplatesDrawerOpen],
  );

  const closeActivePanel = useCallback(() => {
    setIsTemplatesDrawerOpen(false);
    setIsInspectorPinned(false);
    setIsInspectorSuppressed(true);
    setActivePanel(null);
  }, [setActivePanel, setIsInspectorPinned, setIsTemplatesDrawerOpen]);

  // Zen mode is an explicit toggle on non-compact screens (never mutates localStorage prefs).
  const isZenMode = breakpoint !== 'compact' && isZenActive;

  const savedZenStateRef = useRef<{
    wasDrawerOpen: boolean;
    wasInspectorPinned: boolean;
    wasInspectorSuppressed: boolean;
    lastActivePanel: WorkspacePanel;
  }>({
    wasDrawerOpen: true,
    wasInspectorPinned: true,
    wasInspectorSuppressed: false,
    lastActivePanel: null,
  });

  const toggleZenMode = useCallback(() => {
    if (breakpoint === 'compact' && !isZenActive) {
      setIsMobileSheetOpen(false);
      return;
    }

    if (isZenActive) {
      // استعادة الحالة السابقة للألواح بدقة دون الكتابة فوق التفضيلات
      setIsZenActive(false);
      setIsInspectorSuppressed(savedZenStateRef.current.wasInspectorSuppressed);
      setIsTemplatesDrawerOpenState(
        windowWidth >= DUAL_PANEL_MIN_WIDTH && savedZenStateRef.current.wasDrawerOpen,
      );
      setIsInspectorPinnedState(savedZenStateRef.current.wasInspectorPinned);
      setActivePanelState(savedZenStateRef.current.lastActivePanel);
      setIsMobileSheetOpen(false);
    } else {
      // حفظ الحالة الحالية قبل طي جميع الألواح مؤقتاً
      savedZenStateRef.current = {
        wasDrawerOpen: isTemplatesDrawerOpen,
        wasInspectorPinned: isInspectorPinned,
        wasInspectorSuppressed: isInspectorSuppressed,
        lastActivePanel: activePanel,
      };
      setIsZenActive(true);
      setIsTemplatesDrawerOpenState(false);
      setIsInspectorPinnedState(false);
      setIsInspectorSuppressed(true);
      setActivePanelState(null);
      setIsMobileSheetOpen(false);
    }
  }, [
    breakpoint,
    isZenActive,
    windowWidth,
    setIsTemplatesDrawerOpenState,
    isTemplatesDrawerOpen,
    isInspectorPinned,
    isInspectorSuppressed,
    activePanel,
  ]);

  return {
    breakpoint,
    activePanel,
    isInspectorPinned,
    isInspectorOpen,
    isTemplatesDrawerOpen,
    isMobileSheetOpen,
    mobileActiveTab,
    isLauncherOpen,
    activeStudioTab,
    activeCollageTab,
    isZenMode,
    setActivePanel,
    setIsInspectorPinned,
    setIsTemplatesDrawerOpen,
    setIsMobileSheetOpen,
    setMobileActiveTab,
    setIsLauncherOpen,
    setActiveStudioTab,
    selectStudioTab,
    setActiveCollageTab,
    selectCollageTab,
    togglePanel,
    openPanel,
    closeActivePanel,
    toggleZenMode,
  };
}
