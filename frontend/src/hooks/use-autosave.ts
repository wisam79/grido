import { useEffect } from "react";
import { useEditorStore, EditorState } from "@/lib/editor-store";

type EditorStoreSnapshot = EditorState;
import { debounce } from "@/lib/utils";
import { deserializeProjectFile, serializeEditorState } from "@/lib/io/project-serializer";
import { LoadAutoSave, SaveAutoSave, ClearAutoSave } from "../../wailsjs/go/main/App";
import { toast } from "sonner";

/**
 * هل مساحة العمل ما زالت كما وُلدت (لا عناصر، لا صور خانات، لا مشروع محمّل،
 * لا خطوة تراجع)؟ يُستخدم لمنع مسودة قديمة من طمس عمل بدأه المستخدم.
 */
function isPristineWorkspace(): boolean {
  const s = useEditorStore.getState();
  return (
    s.projectId === null &&
    s.elements.length === 0 &&
    (s.slots?.every((slot) => !slot.imageSrc) ?? true) &&
    s.historyIndex === 0 &&
    s.history.length <= 1
  );
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
            // 
            // 🛡️ حارس قِدم: التحميل غير متزامن — إن كان المستخدم قد بدأ التحرير
            // أو فتح مشروعاً/أعاد الضبط قبل وصول المسودة، فلا يحق لنا استبدال
            // حالته الحالية (كانت المسودة تطمس العمل الجديد بصمت).
            if (!isPristineWorkspace()) {
              toast.info("تم تجاهل مسودة سابقة لأن العمل بدأ بالفعل", {
                action: { label: "حذف المسودة", onClick: () => { ClearAutoSave(); } },
              });
              return;
            }
            useEditorStore.getState().loadProject(parsed);
            toast.info("تم استعادة مسودة العمل السابقة تلقائياً", {
              action: {
                label: "بدء من جديد",
                onClick: () => {
                  useEditorStore.getState().reset();
                  ClearAutoSave();
                }
              }
            });
          } catch (e) {
            console.error("Failed to parse autosave data, clearing corrupt draft:", e);
            try {
              await ClearAutoSave();
            } catch {
              // ignore
            }
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
    let disposed = false;

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
        // السلسلة تفرّغ آخر مسودة معلّقة حتى بعد إلغاء التنشيط (كتابة نهائية
        // بأحدث حالة) — الحارس ضد القِدم هو فحص disposed في runSave فقط
        if (pendingSaveState !== null) {
          const nextState = pendingSaveState;
          pendingSaveState = null;
          saveDraft(nextState);
        }
      }
    };

    const handleStateChange = (state: EditorStoreSnapshot) => {
      const runSave = () => {
        if (disposed) return; // منع كتابة مسودة قديمة بعد إلغاء التنشيط
        const projectData = serializeEditorState(state);
        const isEmptyCanvas =
          projectData.elements.length === 0 &&
          (!projectData.slots || projectData.slots.every((s) => !s.imageSrc));

        if (isEmptyCanvas) {
          // مساحة العمل فارغة تماماً (تم مسح الكانفس أو الإعادة للوضع الافتراضي) — لا نحفظ مسودة فارغة
          return;
        }

        const currentString = JSON.stringify(projectData);
        if (currentString === lastSavedString) {
          return; // تخطي إذا لم تتغير مساحة العمل فعلياً
        }
        saveDraft(currentString);
      };

      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => runSave(), { timeout: 1000 });
      } else {
        // debounce سبق أن انتظر توقف التفاعل؛ لا نضيف مهمة صفّية إضافية.
        runSave();
      }
    };

    // تأخير فحص وحفظ البيانات بالكامل لثانيتين بعد توقف حركة السحب/التعديل
    const debouncedSave = debounce(handleStateChange, 2000);

    const getDeps = (state: EditorStoreSnapshot) => [
      state.elements, state.slots, state.mode, state.canvasWidth, state.canvasHeight, state.backgroundColor,
      // 🎨 التدرج يُسلسل مع المشروع — بدون مراقبته لا تُحفظ تغييرات التدرج وحده
      state.backgroundGradientColor2, state.backgroundGradientAngle,
      state.template, state.collageTemplate, state.printSettings,
      state.showGrid, state.gridSize, state.gridColor, state.gridOpacity, state.gridSubdivisions,
      state.gridType, state.snapToGrid, // كانتا غير مراقبتين رغم أنهما تُسلسلان مع المشروع
      state.showColumns, state.columnsCount, state.columnsColor, state.columnsMargin, state.columnsGutter,
      state.collageGap, state.collageMargin, state.collageRadius, state.collageStrokeWidth, state.collageStrokeColor,
      // كانتا غير مراقبتين رغم أنهما تُسلسلان مع المشروع (نفس صنف إصلاح gridType/snapToGrid)
      state.collageShowCutLines, state.collageShowEndCutLine
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
      disposed = true;
      unsubscribe();
      debouncedSave.cancel();
      // حفظ فوري للحالة الحالية قبل إلغاء التنشيط لمنع فقدان أي تعديلات
      const currentState = useEditorStore.getState();
      const projectData = serializeEditorState(currentState);
      const isEmptyCanvas =
        projectData.elements.length === 0 &&
        (!projectData.slots || projectData.slots.every((s) => !s.imageSrc));

      if (!isEmptyCanvas) {
        const currentString = JSON.stringify(projectData);
        if (currentString !== lastSavedString) {
          if (isSaving) {
            pendingSaveState = currentString;
          } else {
            saveDraft(currentString);
          }
        }
      }
    };
  }, []);
}
