import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CollageTab, FreeformTab } from '@/lib/workspace-tools';
import { isCollageTab, isStudioTab } from '@/lib/workspace-tools';

export type WorkspacePanel = 'templates' | 'properties' | null;
export type WorkspaceBreakpoint = 'compact' | 'standard' | 'wide';
// الأنواع ومصدرها سجل الأدوات الموحّد (كانت مكرّرة هنا وفي freeform-panel-constants)
export type { CollageTab, FreeformTab };

const STORAGE_KEY = 'grido_workspace_layout_v1';

interface StoredPreferences {
  lastActivePanel?: WorkspacePanel;
  lastActiveStudioTab?: FreeformTab;
  lastActiveCollageTab?: CollageTab;
  isInspectorPinned?: boolean;
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

function getBreakpoint(width: number): WorkspaceBreakpoint {
  if (width < 1024) return 'compact';
  if (width < 1440) return 'standard';
  return 'wide';
}

export function useWorkspacePanels() {
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  const breakpoint = useMemo(() => getBreakpoint(windowWidth), [windowWidth]);

  // Load initial preferences
  const [activePanel, setActivePanelState] = useState<WorkspacePanel>(() => {
    const saved = getStoredPreferences().lastActivePanel;
    // الجزء الأيمن يظل متاحاً دائماً كلوحة خصائص أساسية (Properties Inspector)
    return saved !== undefined ? saved : 'properties';
  });

  const [isInspectorPinned, setIsInspectorPinnedState] = useState<boolean>(() => {
    const saved = getStoredPreferences().isInspectorPinned;
    return saved !== undefined ? saved : true;
  });

  // Active studio tab (layers, elements, presets)
  const [activeStudioTab, setActiveStudioTabState] = useState<FreeformTab>(() => {
    const saved = getStoredPreferences().lastActiveStudioTab;
    // التخزين المحلي قد يحمل تبويباً حُذف من السجل — نسقط على الافتراضي بدل
    // تبويب غير موجود لا يمكن الوصول إليه من الشريط
    return isStudioTab(saved) ? saved : 'layers';
  });

  // Active collage tab (custom grid, presets, freeform)
  const [activeCollageTab, setActiveCollageTabState] = useState<CollageTab>(() => {
    const saved = getStoredPreferences().lastActiveCollageTab;
    return isCollageTab(saved) ? saved : 'custom';
  });

  // Mobile Sheet states
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'templates' | 'properties'>('templates');

  // Wide drawer for templates
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpen] = useState(false);

  // Resize listener using window resize
  useEffect(() => {
    let rAFId: number | null = null;
    const handleResize = () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        setWindowWidth(window.innerWidth);
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rAFId !== null) cancelAnimationFrame(rAFId);
    };
  }, []);

  const setActivePanel = useCallback((panel: WorkspacePanel) => {
    setActivePanelState(panel);
    saveStoredPreferences({ lastActivePanel: panel });
  }, []);

  const setIsInspectorPinned = useCallback((pinned: boolean) => {
    setIsInspectorPinnedState(pinned);
    saveStoredPreferences({ isInspectorPinned: pinned });
  }, []);

  const setActiveStudioTab = useCallback((tab: FreeformTab) => {
    setActiveStudioTabState(tab);
    saveStoredPreferences({ lastActiveStudioTab: tab });
  }, []);

  const selectStudioTab = useCallback(
    (tab: FreeformTab) => {
      setActiveStudioTabState(tab);
      saveStoredPreferences({ lastActiveStudioTab: tab });

      if (breakpoint === 'compact') {
        setMobileActiveTab('templates');
        setIsMobileSheetOpen(true);
        return;
      }

      if (breakpoint === 'wide') {
        // If drawer is open on the exact same tab, clicking again toggles it closed
        if (isTemplatesDrawerOpen && activeStudioTab === tab) {
          setIsTemplatesDrawerOpen(false);
        } else {
          setIsTemplatesDrawerOpen(true);
        }
        return;
      }

      // Standard (1024 - 1439px): single active panel rule
      if (activePanel === 'templates' && activeStudioTab === tab) {
        setActivePanelState(null);
        saveStoredPreferences({ lastActivePanel: null });
      } else {
        setActivePanelState('templates');
        saveStoredPreferences({ lastActivePanel: 'templates' });
      }
    },
    [breakpoint, isTemplatesDrawerOpen, activeStudioTab, activePanel]
  );

  const setActiveCollageTab = useCallback((tab: CollageTab) => {
    setActiveCollageTabState(tab);
    saveStoredPreferences({ lastActiveCollageTab: tab });
  }, []);

  const selectCollageTab = useCallback(
    (tab: CollageTab) => {
      setActiveCollageTabState(tab);
      saveStoredPreferences({ lastActiveCollageTab: tab });

      if (breakpoint === 'compact') {
        setMobileActiveTab('templates');
        setIsMobileSheetOpen(true);
        return;
      }

      if (breakpoint === 'wide') {
        // If drawer is open on the exact same tab, clicking again toggles it closed
        if (isTemplatesDrawerOpen && activeCollageTab === tab) {
          setIsTemplatesDrawerOpen(false);
        } else {
          setIsTemplatesDrawerOpen(true);
        }
        return;
      }

      // Standard (1024 - 1439px): single active panel rule
      if (activePanel === 'templates' && activeCollageTab === tab) {
        setActivePanelState(null);
        saveStoredPreferences({ lastActivePanel: null });
      } else {
        setActivePanelState('templates');
        saveStoredPreferences({ lastActivePanel: 'templates' });
      }
    },
    [breakpoint, isTemplatesDrawerOpen, activeCollageTab, activePanel]
  );

  // Toggle or switch panel
  const togglePanel = useCallback(
    (panel: 'templates' | 'properties') => {
      if (breakpoint === 'compact') {
        setMobileActiveTab(panel);
        setIsMobileSheetOpen(true);
        return;
      }

      if (breakpoint === 'wide') {
        if (panel === 'templates') {
          setIsTemplatesDrawerOpen((prev) => !prev);
        } else {
          // Properties in wide
          setActivePanelState((prev) => (prev === 'properties' ? null : 'properties'));
        }
        return;
      }

      // Standard (1024 - 1439px): single panel rule
      setActivePanelState((prev) => {
        const next = prev === panel ? null : panel;
        saveStoredPreferences({ lastActivePanel: next });
        return next;
      });
    },
    [breakpoint]
  );

  const openPanel = useCallback(
    (panel: 'templates' | 'properties') => {
      if (breakpoint === 'compact') {
        setMobileActiveTab(panel);
        setIsMobileSheetOpen(true);
        return;
      }

      if (breakpoint === 'wide') {
        if (panel === 'templates') {
          setIsTemplatesDrawerOpen(true);
        } else {
          setActivePanel('properties');
        }
        return;
      }

      setActivePanel(panel);
    },
    [breakpoint, setActivePanel]
  );

  const closeActivePanel = useCallback(() => {
    if (breakpoint === 'wide') {
      setIsTemplatesDrawerOpen(false);
      setActivePanel(null);
    } else {
      setActivePanel(null);
    }
  }, [breakpoint, setActivePanel]);

  // Zen Mode toggle: collapse all panels or restore default
  const isZenMode = useMemo(() => {
    if (breakpoint === 'compact') return true;
    if (breakpoint === 'wide') {
      return !isTemplatesDrawerOpen && activePanel !== 'properties';
    }
    return activePanel === null;
  }, [breakpoint, isTemplatesDrawerOpen, activePanel]);

  const toggleZenMode = useCallback(() => {
    if (isZenMode) {
      // Restore
      setActivePanel('properties');
    } else {
      // Collapse all
      closeActivePanel();
    }
  }, [isZenMode, setActivePanel, closeActivePanel]);

  return {
    breakpoint,
    activePanel,
    isInspectorPinned,
    isTemplatesDrawerOpen,
    isMobileSheetOpen,
    mobileActiveTab,
    activeStudioTab,
    activeCollageTab,
    isZenMode,
    setActivePanel,
    setIsInspectorPinned,
    setIsTemplatesDrawerOpen,
    setIsMobileSheetOpen,
    setMobileActiveTab,
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
