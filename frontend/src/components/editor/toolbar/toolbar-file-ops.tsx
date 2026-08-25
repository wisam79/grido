import { useState, useEffect, useRef, Suspense } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ImageAdd20Filled,
  FolderOpen20Filled,
  Broom20Filled,
} from "@fluentui/react-icons";
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

          if (localPaths.length === 1) {
            const targetSlotId = freshSelectedId || freshSlots[0]?.id;
            if (targetSlotId) {
              setSlotImage(targetSlotId, localPaths[0]);
              toast.success("تم إدراج الصورة في الخلية المحددة");
            }
          } else {
            let filled = 0;
            freshSlots.forEach((slot, index) => {
              if (index < localPaths.length) {
                setSlotImage(slot.id, localPaths[index]);
                filled++;
              }
            });
            toast.success(`تم إدراج ${filled} صورة في خلايا الكولاج`);
          }
        } else {
          for (const b64 of b64s) {
            let finalSrc = b64;
            if (isWailsDesktop && b64.startsWith("data:image/")) {
              try {
                const localPath = await SaveImageFromBase64(b64);
                if (localPath) finalSrc = localPath;
              } catch (e) {
                console.error("Failed to save image locally in single mode:", e);
              }
            }
            addImageElement(finalSrc);
          }
          toast.success(`تمت إضافة ${b64s.length} صورة إلى مساحة العمل`);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("فشل فتح ملف الصورة");
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
            <ImageAdd20Filled className="w-4 h-4 text-primary" />
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
              <FolderOpen20Filled className="w-4 h-4" />
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
          <Broom20Filled className="w-4 h-4" />
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
