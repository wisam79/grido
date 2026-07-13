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
        setTimeout(runSave, 0);
      }
    };

    // تأخير فحص وحفظ البيانات بالكامل لثانيتين بعد توقف حركة السحب/التعديل
    const debouncedSave = debounce(handleStateChange, 2000);

    // الاحتفاظ بآخر حالة هيكلية لتقليل فحص التعديلات غير الهيكلية (كالاختيار النشط والمساطر ومقابض التحكم)
    let lastStructuralState = {
      elements: useEditorStore.getState().elements,
      slots: useEditorStore.getState().slots,
      mode: useEditorStore.getState().mode,
      canvasWidth: useEditorStore.getState().canvasWidth,
      canvasHeight: useEditorStore.getState().canvasHeight,
      backgroundColor: useEditorStore.getState().backgroundColor,
      collageGap: useEditorStore.getState().collageGap,
      collageMargin: useEditorStore.getState().collageMargin,
      collageRadius: useEditorStore.getState().collageRadius,
      collageStrokeWidth: useEditorStore.getState().collageStrokeWidth,
      collageStrokeColor: useEditorStore.getState().collageStrokeColor,
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      // تحقق هل تغير شيء هيكلي فعلياً؟
      if (
        state.elements === lastStructuralState.elements &&
        state.slots === lastStructuralState.slots &&
        state.mode === lastStructuralState.mode &&
        state.canvasWidth === lastStructuralState.canvasWidth &&
        state.canvasHeight === lastStructuralState.canvasHeight &&
        state.backgroundColor === lastStructuralState.backgroundColor &&
        state.collageGap === lastStructuralState.collageGap &&
        state.collageMargin === lastStructuralState.collageMargin &&
        state.collageRadius === lastStructuralState.collageRadius &&
        state.collageStrokeWidth === lastStructuralState.collageStrokeWidth &&
        state.collageStrokeColor === lastStructuralState.collageStrokeColor
      ) {
        return; // لم يتغير شيء هيكلي (تغير فقط الاختيار selectedId أو غيره)
      }

      // تحديث الحالة المرجعية
      lastStructuralState = {
        elements: state.elements,
        slots: state.slots,
        mode: state.mode,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        backgroundColor: state.backgroundColor,
        collageGap: state.collageGap,
        collageMargin: state.collageMargin,
        collageRadius: state.collageRadius,
        collageStrokeWidth: state.collageStrokeWidth,
        collageStrokeColor: state.collageStrokeColor,
      };

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
