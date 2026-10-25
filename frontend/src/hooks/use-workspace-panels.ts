import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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

function getBreakpoint(width: number): WorkspaceBreakpoint {
  if (width < 1024) return 'compact';
  if (width < 1200) return 'standard';
  return 'wide';
}

export function useWorkspacePanels() {
  const workflow = useEditorStore((state) => state.workflow);
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

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
    return saved !== undefined ? saved : true;
  });

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
  // ملاحظة React: الحفظ أثر جانبي — الكتابة المباشرة داخل مُحدِّث setState
  // تُنفَّذ مرتين في StrictMode (يُستدعى المُحدِّث مرتين للتحقق من النقاء) لكن
  // saveStoredPreferences مدمجة (setItem بنفس القيمة) فلا ضرر فعلي.
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpenState] = useState(() => {
    const saved = getStoredPreferences().isTemplatesDrawerOpen;
    return saved !== undefined ? saved : true;
  });

  // مغلّف موحّد: يقبل قيمة أو دالة تحديث، ويحفظ الناتج دائماً.
  const setIsTemplatesDrawerOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsTemplatesDrawerOpenState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveStoredPreferences({ isTemplatesDrawerOpen: next });
      return next;
    });
  }, []);

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

  // مزامنة القوالب عند عبور عتبة الـ breakpoint: الدرج الأيسر (wide) واللوحة
  // اليمنى (standard) حالتان مستقلتان، فعبور 1440px كان يُفكّ الدرج ويترك
  // activePanel على 'properties' — فيبدو أن القوالب اختفت. هنا يتبع المحتوى
  // المستخدم: درج مفتوح → templates يميناً عند التضييق، وtemplates يميناً →
  // درج مفتوح عند التوسيع. التفاعل الصريح (إغلاق مقصود) يُحترم: لا نفتح ما
  // أغلقه المستخدم، فقط ننقل الحالة الظاهرة.
  // نمط adjust-state-during-render: عند تغيّر الـ breakpoint نحسب الهدف لمرة
  // واحدة أثناء التصيير (موثّق في React docs كبديل آمن للمزامنة في effect).
  const [prevBreakpoint, setPrevBreakpoint] = useState<WorkspaceBreakpoint>(breakpoint);
  if (prevBreakpoint !== breakpoint) {
    setPrevBreakpoint(breakpoint);
    if (prevBreakpoint === 'wide' && breakpoint === 'standard') {
      // كان الدرج الأيسر مفتوحاً (نلتقط القيمة الظاهرة قبل العبور من أول
      // تصيير بالـ breakpoint الجديد — ما زالت الحالة القديمة حاضرة لأن
      // setState لم يُطبَّق بعد على isTemplatesDrawerOpen/activePanel).
      // القراءة هنا للـ state الحالي هي القيمة السابقة للعبور بحكم الترتيب.
      if (isTemplatesDrawerOpen) {
        setActivePanelState('templates');
        saveStoredPreferences({ lastActivePanel: 'templates' });
      }
    } else if (prevBreakpoint === 'standard' && breakpoint === 'wide') {
      if (activePanel === 'templates') {
        setIsTemplatesDrawerOpenState(true);
        saveStoredPreferences({ isTemplatesDrawerOpen: true });
      }
      // في الوضع العريض أصبح `isInspectorPinned` هو مصدر الحقيقة الوحيد لظهور
      // لوحة الخصائص (workspace-layout). لو عبّر المستخدم من Standard واللوحة
      // مفتوحة (activePanel === 'properties') بينما الدبس مخزّن كـ false من
      // جلسة سابقة، لاختفت اللوحة المفتوحة أمام المستخدم عند التوسيع. نُزامن
      // الدبس مع الحالة الظاهرة لحفظ ثابت: «في Wide: properties ظاهرة ⇔ pinned».
      if (activePanel === 'properties' && !isInspectorPinned) {
        setIsInspectorPinnedState(true);
        saveStoredPreferences({ isInspectorPinned: true });
      }
    }
    // compact: الورقة تُفتح صراحةً فقط — لا تغيير تلقائي هنا.
  }

  const setActivePanel = useCallback((panel: WorkspacePanel) => {
    setActivePanelState(panel);
    saveStoredPreferences({ lastActivePanel: panel });
  }, []);

  const setIsInspectorPinned = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
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
    // isTemplatesDrawerOpen تُقرأ هنا للتبديل المشروط — تبعية حقيقية تُبقي
    // الـ callback متزامناً مع الدرج وتمنع إغلاق/فتح معكوساً بعد عبور breakpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakpoint, isTemplatesDrawerOpen, activeStudioTab, activePanel],
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
    // نفس مبرر selectStudioTab: القراءة المشروطة للدرج تبعية حقيقية.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakpoint, isTemplatesDrawerOpen, activeCollageTab, activePanel],
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
          // Properties in wide: الدبس وحده مصدر الحقيقة للظهور
          // (workspace-layout) — قلب activePanel هنا كان يلوّث اللوحة
          // الظاهرة عند التضييق إلى standard بلا داعٍ.
          setIsInspectorPinned((prev) => !prev);
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
    // setIsTemplatesDrawerOpen مستقرة (useCallback بـ []) — تُستدعى هنا لكن
    // إضافتها للتبعيات تعيد إنشاء togglePanel بلا داعٍ؛ القراءة الوحيدة
    // المتغيرة هي breakpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakpoint, setIsInspectorPinned],
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
          setIsInspectorPinned(true);
          setActivePanel('properties');
        }
        return;
      }

      setActivePanel(panel);
    },
    // setIsTemplatesDrawerOpen/setActivePanel مستقرتان — التبعية المتغيرة breakpoint فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakpoint, setActivePanel, setIsInspectorPinned],
  );

  const closeActivePanel = useCallback(() => {
    if (breakpoint === 'wide') {
      setIsTemplatesDrawerOpen(false);
      setIsInspectorPinned(false);
      setActivePanel(null);
    } else {
      setActivePanel(null);
    }
    // نفس المبرر: دوال مستقرة، والمتغيرة breakpoint فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint, setActivePanel, setIsInspectorPinned]);

  // Zen Mode toggle: collapse all panels or restore default
  const isZenMode = useMemo(() => {
    // في compact لا توجد ألواح مثبّتة تُطوى، وإرجاع true كان يمنع تركيب
    // CompactToolLauncher فيصبح Ctrl+K ميتاً. الـ zen يخصّ standard/wide فقط.
    if (breakpoint === 'compact') return false;
    if (breakpoint === 'wide') {
      return !isTemplatesDrawerOpen && !isInspectorPinned;
    }
    return activePanel === null;
  }, [breakpoint, isTemplatesDrawerOpen, isInspectorPinned, activePanel]);

  const savedZenStateRef = useRef<{
    wasDrawerOpen: boolean;
    wasInspectorPinned: boolean;
    lastActivePanel: WorkspacePanel;
  }>({
    wasDrawerOpen: true,
    wasInspectorPinned: true,
    lastActivePanel: null,
  });

  const toggleZenMode = useCallback(() => {
    if (isZenMode) {
      // استعادة الحالة السابقة للألواح بدقة
      if (breakpoint === 'wide') {
        setIsTemplatesDrawerOpen(savedZenStateRef.current.wasDrawerOpen);
        setIsInspectorPinned(savedZenStateRef.current.wasInspectorPinned);
        if (savedZenStateRef.current.lastActivePanel) {
          setActivePanel(savedZenStateRef.current.lastActivePanel);
        }
      } else {
        setActivePanel(savedZenStateRef.current.lastActivePanel || 'templates');
      }
    } else {
      // حفظ الحالة الحالية قبل طي جميع الألواح
      savedZenStateRef.current = {
        wasDrawerOpen: isTemplatesDrawerOpen,
        wasInspectorPinned: isInspectorPinned,
        lastActivePanel: activePanel,
      };
      closeActivePanel();
    }
  }, [
    isZenMode,
    breakpoint,
    isTemplatesDrawerOpen,
    isInspectorPinned,
    activePanel,
    setIsTemplatesDrawerOpen,
    setIsInspectorPinned,
    setActivePanel,
    closeActivePanel,
  ]);

  return {
    breakpoint,
    activePanel,
    isInspectorPinned,
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
