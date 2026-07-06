import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { ProjectSchema } from "@/lib/schema";
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
            const rawProject = JSON.parse(saved);
            const parsed = ProjectSchema.safeParse(rawProject);
            if (parsed.success) {
              const project = parsed.data;
              
              useEditorStore.getState().loadProject(project);
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

  // 2. المراقبة والحفظ التلقائي في الخلفية بعد ثانيتين من توقف التعديل (مع خنق الفحص لمنع البطء أثناء السحب والتعديل)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastSavedString = "";

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
      };
      
      const currentString = JSON.stringify(projectData);
      if (currentString === lastSavedString) {
        return; // تخطي إذا لم يحدث تغيير حقيقي في مساحة العمل
      }

      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await SaveAutoSave(currentString);
          lastSavedString = currentString;
        } catch (err) {
          console.error("Failed to save draft:", err);
        }
      }, 2000); // حفظ تلقائي بعد ثانيتين من توقف التعديل تماماً
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      // خنق عملية المقارنة والتحويل لـ JSON لتشغيلها على الأكثر مرة كل 300 مللي ثانية أثناء السحب
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        handleStateChange(useEditorStore.getState());
      }, 300);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);
}
