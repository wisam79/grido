import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { deserializeProjectFile, serializeEditorState } from "@/lib/project-serializer";
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

export function useAutoSave() {
  // 1. استرجاع مسودة المشروع التلقائية عند تشغيل التطبيق
  useEffect(() => {
    const initAutoSave = async () => {
      try {
        const saved = await LoadAutoSave();
        if (saved) {
          try {
            const parsed = deserializeProjectFile(JSON.parse(saved));
            useEditorStore.getState().loadProject(parsed);
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
          } catch (e) {
            console.error("Failed to parse autosave data:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load autosave:", err);
      }
    };
    initAutoSave();
  }, []);

  // 2. المراقبة والحفظ التلقائي المنظم في الخلفية (بعد ثانيتين من توقف أي تفاعل)
  useEffect(() => {
    let lastSavedString = "";
    let isSaving = false;
    let pendingSaveState: string | null = null;

    // دالة الحفظ الفعلي للمسودة بشكل متسلسل لحماية الملفات من التلف
    const saveDraft = async (stateString: string) => {
      if (isSaving) {
        pendingSaveState = stateString;
        return;
      }

      isSaving = true;
      try {
        await SaveAutoSave(stateString);
        lastSavedString = stateString;
      } catch (err) {
        console.error("Failed to save draft:", err);
      } finally {
        isSaving = false;
        if (pendingSaveState !== null) {
          const nextState = pendingSaveState;
          pendingSaveState = null;
          saveDraft(nextState);
        }
      }
    };

    const handleStateChange = (state: any) => {
      const projectData = serializeEditorState(state);

      const currentString = JSON.stringify(projectData);
      if (currentString === lastSavedString) {
        return; // تخطي إذا لم تتغير مساحة العمل فعلياً
      }

      saveDraft(currentString);
    };

    // تأخير فحص وحفظ البيانات بالكامل لثانيتين بعد توقف حركة السحب/التعديل
    const debouncedSave = debounce(handleStateChange, 2000);

    const unsubscribe = useEditorStore.subscribe((state) => {
      debouncedSave(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
