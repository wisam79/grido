import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { ProjectSchema } from "@/lib/schema";
import { LoadAutoSave, SaveAutoSave, ClearAutoSave } from "../../wailsjs/go/main/App";
import { toast } from "sonner";

// دالة تأخير قياسية مغلقة لتفادي تسريب الوقت (Timer leaks)
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
}

// دالة خنق القياسات لحماية المعالجة أثناء السحب المستمر
function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function useAutoSave() {
  // 1. استرجاع مسودة المشروع التلقائية عند تشغيل التطبيق
  useEffect(() => {
    const initAutoSave = async () => {
      try {
        const saved = await LoadAutoSave();
        if (saved) {
          try {
            const rawProject = JSON.parse(saved);
            const parsed = ProjectSchema.safeParse(rawProject);
            if (parsed.success) {
              const project = parsed.data;
              useEditorStore.getState().loadProject(project as any);
              toast.info("تم استعادة مسودة العمل السابقة تلقائياً", {
                action: {
                  label: "بدء من جديد",
                  onClick: () => {
                    useEditorStore.setState({ elements: [], slots: [], selectedId: null });
                    ClearAutoSave();
                    toast.success("تم بدء مشروع جديد");
                  }
                }
              });
            } else {
              console.error("Invalid autosave data", parsed.error);
            }
          } catch (e) {
            console.error("Failed to parse autosave JSON:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load autosave:", err);
      }
    };
    initAutoSave();
  }, []);

  // 2. المراقبة والحفظ التلقائي المنظم في الخلفية (مرة كل ثانيتين بعد التوقف)
  useEffect(() => {
    let lastSavedString = "";

    // دالة الحفظ الفعلي للمسودة
    const saveDraft = async (stateString: string) => {
      try {
        await SaveAutoSave(stateString);
        lastSavedString = stateString;
      } catch (err) {
        console.error("Failed to save draft:", err);
      }
    };

    // خنق عملية الحفظ الكلية وتأخيرها لثانيتين بعد توقف الحركة بالكامل
    const debouncedSave = debounce(saveDraft, 2000);

    const handleStateChange = (state: any) => {
      const projectData = {
        mode: state.mode,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        backgroundColor: state.backgroundColor,
        elements: state.elements,
        slots: state.slots,
        template: state.template,
        collageTemplate: state.collageTemplate,
        printSettings: state.printSettings,
        // إعدادات الشبكة المدمجة حديثاً
        showGrid: state.showGrid,
        gridSize: state.gridSize,
        gridColor: state.gridColor,
        gridType: state.gridType,
        snapToGrid: state.snapToGrid,
      };

      const currentString = JSON.stringify(projectData);
      if (currentString === lastSavedString) {
        return; // تخطي إذا لم تتغير مساحة العمل فعلياً
      }

      debouncedSave(currentString);
    };

    // خنق عملية الفحص الكلية كل 300 مللي ثانية أثناء السحب المستمر
    const throttledStateChange = throttle(handleStateChange, 300);

    const unsubscribe = useEditorStore.subscribe((state) => {
      throttledStateChange(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
