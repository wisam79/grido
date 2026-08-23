import { useState, useEffect, useRef, Suspense } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ImagePlus,
  Eraser,
  Library,
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
import { ProjectsDialog } from "../dialogs/projects-dialog";
import { ClearAutoSave, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { wailsIsDesktop } from "@/lib/wails-env";

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
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

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

  useEffect(() => {
    const openProjects = () => setIsProjectsOpen(true);
    window.addEventListener("grido:open-projects-dialog", openProjects);
    return () => window.removeEventListener("grido:open-projects-dialog", openProjects);
  }, []);

  const handleOpenFile = async () => {
    if (isFileDialogOpen) return;
    setIsFileDialogOpen(true);
    try {
      const b64s = await openImageFileDialog(true);

      if (b64s && b64s.length > 0) {
        const freshState = useEditorStore.getState();
        const freshMode = freshState.mode;
        const freshSlots = freshState.slots;
        const freshSelectedId = freshState.selectedId;

        const isWailsDesktop = wailsIsDesktop();

        if (freshMode === "collage") {
          let localPaths: string[] = [];
          if (isWailsDesktop) {
            for (const b64 of b64s) {
              if (b64.startsWith("data:image/")) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) localPaths.push(localPath);
                } catch (e) {
                  console.error("Failed to save image locally:", e);
                  localPaths.push(b64);
                }
              } else {
                localPaths.push(b64);
              }
            }
          } else {
            localPaths = b64s;
          }

          const isPhysical = freshState.collageTemplate?.physicalLayout;
          if ((isPhysical || freshSlots.length > 1) && localPaths.length === 1 && localPaths[0]) {
            freshState.fillAllSlots(localPaths[0]);
          } else {
            let srcIdx = 0;
            if (freshSelectedId && freshSlots.some((s) => s.id === freshSelectedId) && localPaths[0]) {
              freshState.setSlotImage(freshSelectedId, localPaths[0]);
              srcIdx = 1;
            }
            for (const s of freshSlots) {
              if (s.id !== freshSelectedId && !s.imageSrc && srcIdx < localPaths.length) {
                freshState.setSlotImage(s.id, localPaths[srcIdx++]);
              }
            }
            if (srcIdx === 0 && freshSlots[0] && localPaths[0]) {
              freshState.setSlotImage(freshSlots[0].id, localPaths[0]);
            }
          }
        } else {
          for (const b64 of b64s) {
            let srcToUse = b64;
            if (isWailsDesktop && b64.startsWith("data:image/")) {
              try {
                const localPath = await SaveImageFromBase64(b64);
                if (localPath) srcToUse = localPath;
              } catch (e) {
                console.error("Failed to save image locally:", e);
              }
            }
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                const aspect = img.width / img.height;
                img.onload = null;
                img.onerror = null;
                img.src = "";
                addImageElement(srcToUse, aspect);
                resolve();
              };
              img.onerror = () => {
                img.onload = null;
                img.onerror = null;
                img.src = "";
                addImageElement(srcToUse, 1);
                resolve();
              };
              img.src = b64;
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الصور");
    } finally {
      setIsFileDialogOpen(false);
    }
  };

  // اختصار Ctrl+O — فتح حوار إدراج الصور عبر حدث عام (إصلاح Bug#7)
  const openFileRef = useRef(handleOpenFile);
  useEffect(() => {
    openFileRef.current = handleOpenFile;
  });
  useEffect(() => {
    const openFile = () => openFileRef.current();
    window.addEventListener("grido:open-file-dialog", openFile);
    return () => window.removeEventListener("grido:open-file-dialog", openFile);
  }, []);

  const handleClearCanvas = () => {
    setIsClearAlertOpen(true);
  };

  const confirmClearCanvas = () => {
    useEditorStore.getState().reset();
    ClearAutoSave().catch((err) => console.error("Failed to clear autosave:", err));
  };

  return (
    <>
      <div className="flex items-center gap-0.5 bg-muted/50 border border-border/60 p-0.5 rounded-lg shadow-2xs">
        {/* إضافة صورة */}
        <TooltipBtn content="إدراج صورة جديدة (Ctrl + O)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenFile}
            aria-label="إضافة صورة جديدة"
            title="إضافة صورة جديدة"
            className="h-8 px-2.5 gap-1.5 text-foreground hover:bg-background/90 hover:text-primary font-bold rounded-md shadow-2xs active:scale-95 transition-all cursor-pointer text-xs flex items-center justify-center select-none"
          >
            <ImagePlus className="w-4 h-4 text-primary" />
            <span>إضافة صورة</span>
          </Button>
        </TooltipBtn>

        {/* المكتبة المحلية */}
        <Suspense fallback={null}>
          <TooltipBtn content="مكتبة المشاريع المحفوظة">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProjectsOpen(true)}
              aria-label="مكتبة المشاريع المحلية"
              title="مكتبة المشاريع المحلية"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/90 rounded-md transition-all cursor-pointer"
            >
              <Library className="w-4 h-4" />
            </Button>
          </TooltipBtn>
          <ProjectsDialog open={isProjectsOpen} onOpenChange={setIsProjectsOpen} />
        </Suspense>
      </div>

      {/* جديد / مسح مساحة العمل */}
      <TooltipBtn content="مسح مساحة العمل والبدء من جديد">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearCanvas}
          aria-label="جديد (مسح مساحة العمل)"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all cursor-pointer"
        >
          <Eraser className="w-4 h-4" />
        </Button>
      </TooltipBtn>

      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent dir="rtl" className="rounded-2xl border border-border/80 dark:border-white/10 fluent-specular shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-right">مسح مساحة العمل</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-right">
              هل أنت متأكد من مسح جميع العناصر والبدء من جديد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="font-cairo">
            <AlertDialogCancel className="font-cairo h-8 rounded-md">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearCanvas}
              className="bg-destructive hover:bg-destructive/90 text-white font-cairo h-8 rounded-md"
            >
              مسح بالكامل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
