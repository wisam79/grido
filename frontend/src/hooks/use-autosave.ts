import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { debounce } from "@/lib/utils";
import { deserializeProjectFile, serializeEditorState } from "@/lib/project-serializer";
import { LoadAutoSave, SaveAutoSave, ClearAutoSave } from "../../wailsjs/go/main/App";
import { toast } from "sonner";

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
                  useEditorStore.getState().reset();
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
      const runSave = () => {
        const projectData = serializeEditorState(state);
        const currentString = JSON.stringify(projectData);
        if (currentString === lastSavedString) {
          return; // تخطي إذا لم تتغير مساحة العمل فعلياً
        }
        saveDraft(currentString);
      };

      if (typeof window !== "undefined" && (window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(() => runSave(), { timeout: 1000 });
      } else {
        // debounce سبق أن انتظر توقف التفاعل؛ لا نضيف مهمة صفّية إضافية.
        runSave();
      }
    };

    // تأخير فحص وحفظ البيانات بالكامل لثانيتين بعد توقف حركة السحب/التعديل
    const debouncedSave = debounce(handleStateChange, 2000);

    const getDeps = (state: any) => [
      state.elements, state.slots, state.mode, state.canvasWidth, state.canvasHeight, state.backgroundColor,
      state.template, state.collageTemplate, state.printSettings,
      state.showGrid, state.gridSize, state.gridColor, state.gridOpacity, state.gridSubdivisions,
      state.gridType, state.snapToGrid, // كانتا غير مراقبتين رغم أنهما تُسلسلان مع المشروع
      state.showColumns, state.columnsCount, state.columnsColor, state.columnsMargin, state.columnsGutter,
      state.collageGap, state.collageMargin, state.collageRadius, state.collageStrokeWidth, state.collageStrokeColor,
      state.collageShowCutLines
      // ملاحظة: showRuler تفضيل واجهة وليست بيانات مشروع (لا تُسلسل) — لذا استُبعدت من المراقبة
    ];

    let lastDeps = getDeps(useEditorStore.getState());

    const unsubscribe = useEditorStore.subscribe((state) => {
      const currentDeps = getDeps(state);
      
      let changed = false;
      for (let i = 0; i < currentDeps.length; i++) {
        if (currentDeps[i] !== lastDeps[i]) {
          changed = true;
          break;
        }
      }

      if (!changed) return;

      lastDeps = currentDeps;
      debouncedSave(state);
    });

    return () => {
      unsubscribe();
      debouncedSave.cancel();
      // حفظ فوري للحالة الحالية قبل إلغاء التنشيط لمنع فقدان أي تعديلات
      const currentState = useEditorStore.getState();
      const projectData = serializeEditorState(currentState);
      const currentString = JSON.stringify(projectData);
      if (currentString !== lastSavedString) {
        SaveAutoSave(currentString).catch((err) => {
          console.error("Failed to run final save on unmount:", err);
        });
      }
    };
  }, []);
}
