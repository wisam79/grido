import { useState, Suspense } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { deserializeProjectFile } from "@/lib/project-serializer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ImagePlus,
  Eraser,
  Database,
  FolderOpen,
  FileJson,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectsDialog } from "./projects-dialog";
import { OpenFile, ClearAutoSave } from "../../../wailsjs/go/main/App";
import { saveProjectAsJSON } from "./export-utils";

interface TooltipBtnProps {
  content: string;
  children: React.ReactElement;
}

function TooltipBtn({ content, children }: TooltipBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="font-cairo text-[11px] py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function ToolbarFileOps() {
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const {
    mode,
    slots,
    setSlotImage,
    addImageElement,

    selectedId,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      slots: state.slots,
      setSlotImage: state.setSlotImage,
      addImageElement: state.addImageElement,
      template: state.template,
      selectedId: state.selectedId,
    }))
  );

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        // قراءة أحدث نسخة من الـ state بعد انتهاء await لتجنب stale closure
        const freshState = useEditorStore.getState();
        const freshMode = freshState.mode;
        const freshSlots = freshState.slots;
        const freshSelectedId = freshState.selectedId;

        if (freshMode === "collage") {
          const isPhysical = freshState.collageTemplate?.physicalLayout;
          if (isPhysical) {
            freshState.fillAllSlots(b64);
            toast.success("تم إدراج الصورة في جميع الخانات");
          } else if (freshSelectedId && freshSlots.some((s) => s.id === freshSelectedId)) {
            freshState.setSlotImage(freshSelectedId, b64);
            toast.success("تم إدراج الصورة في الخانة المحددة");
          } else {
            const emptySlot = freshSlots.find((s) => !s.imageSrc);
            if (emptySlot) {
              freshState.setSlotImage(emptySlot.id, b64);
              toast.success("تم إدراج الصورة في خانة فارغة");
            } else if (freshSlots[0]) {
              freshState.setSlotImage(freshSlots[0].id, b64);
              toast.success("تم تحديث صورة الخانة الأولى");
            } else {
              toast.warning("يرجى اختيار تخطيط كولاج أولاً");
            }
          }
        } else {
          const img = new Image();
          img.onload = () => {
            const aspect = img.width / img.height;
            addImageElement(b64, aspect);
          };
          img.onerror = () => {
            console.warn("Failed to load image for aspect ratio, using default 1:1");
            addImageElement(b64, 1);
          };
          img.src = b64;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الصورة");
    }
  };

  const handleSaveProject = () => {
    saveProjectAsJSON();
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawProject = JSON.parse(event.target?.result as string);
        const parsed = deserializeProjectFile(rawProject);
        useEditorStore.getState().loadProject(parsed);
        toast.success("تم تحميل ملف المشروع بنجاح");
      } catch (err) {
        toast.error("ملف المشروع غير صالح أو معطوب");
        console.error("Project Load Error:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearCanvas = () => {
    setIsClearAlertOpen(true);
  };

  const confirmClearCanvas = () => {
    useEditorStore.getState().reset();
    ClearAutoSave().catch((err) => console.error("Failed to clear autosave:", err));
    toast.success("تم مسح مساحة العمل بالكامل");
  };

  return (
    <>
      <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
        {/* رفع صورة */}
        <TooltipBtn content="إدراج صورة جديدة (سحب وإفلات أو نقر)">
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenFile}
            aria-label="رفع صورة جديدة"
            className="h-7 w-7 p-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-md shadow-xs hover:shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all cursor-pointer border-0 flex items-center justify-center"
          >
            <ImagePlus className="w-3.5 h-3.5 text-white" />
          </Button>
        </TooltipBtn>

        <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

        {/* مسح الكانفاس */}
        <TooltipBtn content="جديد (مسح مساحة العمل بالكامل)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCanvas}
            aria-label="جديد (مسح مساحة العمل)"
            className="h-7 px-2 text-destructive/80 hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </Button>
        </TooltipBtn>

        {/* المكتبة المحلية */}
        <Suspense fallback={null}>
          <TooltipBtn content="مكتبة المشاريع المحفوظة">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProjectsOpen(true)}
              aria-label="مكتبة المشاريع المحلية"
              className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <ProjectsDialog open={isProjectsOpen} onOpenChange={setIsProjectsOpen} />
        </Suspense>

        {/* استيراد JSON */}
        <TooltipBtn content="فتح مشروع (.json)">
          <label className="cursor-pointer" aria-label="فتح مشروع (.json)">
            <input
              type="file"
              accept=".json"
              onChange={handleLoadProject}
              className="hidden"
            />
            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-background/80 h-7 px-2 text-muted-foreground hover:text-primary cursor-pointer">
              <FolderOpen className="w-3.5 h-3.5" />
            </div>
          </label>
        </TooltipBtn>

        {/* تصدير JSON */}
        <TooltipBtn content="تصدير ملف مشروع (.json)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveProject}
            aria-label="تصدير ملف مشروع (.json)"
            className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
          </Button>
        </TooltipBtn>
      </div>

      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-right">مسح مساحة العمل</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-right">
              هل أنت متأكد من مسح جميع العناصر والبدء من جديد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearCanvas}
              className="bg-destructive hover:bg-destructive/90 text-white font-cairo"
            >
              مسح بالكامل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
