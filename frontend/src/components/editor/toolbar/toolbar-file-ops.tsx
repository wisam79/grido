import { useState, useEffect, useRef, Suspense } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Stack,
  Folders,
  Broom,
  DeviceMobileCamera,
  CaretDown,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AddPhotoIcon } from "@/components/ui/image-icons";
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
import { BatchInsertDialog } from "../dialogs/batch-insert-dialog";
import { PhoneBridgeDialog } from "../dialogs/phone-bridge-dialog";
import { ClearAutoSave, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { wailsIsDesktop } from "@/lib/wails-env";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";

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
        className="font-cairo text-xs py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
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
  const [isBatchInsertOpen, setIsBatchInsertOpen] = useState(false);
  const [isPhoneBridgeOpen, setIsPhoneBridgeOpen] = useState(false);

  const {
    mode,
    slots,
    setSlotImage,
    addImageElement,
    addImageElementsBatch,
    selectedId,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      slots: state.slots,
      setSlotImage: state.setSlotImage,
      addImageElement: state.addImageElement,
      addImageElementsBatch: state.addImageElementsBatch,
      template: state.template,
      selectedId: state.selectedId,
    }))
  );

  useEffect(() => {
    const openProjects = () => setIsProjectsOpen(true);
    const openBatch = () => setIsBatchInsertOpen(true);
    const openPhoneBridge = () => setIsPhoneBridgeOpen(true);
    window.addEventListener("grido:open-projects-dialog", openProjects);
    window.addEventListener("grido:open-batch-insert-dialog", openBatch);
    window.addEventListener("grido:open-phone-bridge", openPhoneBridge);
    return () => {
      window.removeEventListener("grido:open-projects-dialog", openProjects);
      window.removeEventListener("grido:open-batch-insert-dialog", openBatch);
      window.removeEventListener("grido:open-phone-bridge", openPhoneBridge);
    };
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
              freshState.setSlotImage(targetSlotId, localPaths[0]);
              toast.success("تم إدراج الصورة في الخلية المحددة");
            }
          } else {
            // إدراج مجمّع بلقطة تراجع واحدة — الاستدعاء الفردي داخل الحلقة
            // كان يولد لقطة تاريخ لكل صورة (حتى 24) ويطفح سجل التراجع (30)
            const assignments = freshSlots
              .slice(0, localPaths.length)
              .map((slot, index) => ({ slotId: slot.id, src: localPaths[index] }));
            freshState.setSlotImagesBatch(assignments, localPaths[localPaths.length - 1]);
            toast.success(`تم إدراج ${assignments.length} صورة في خلايا الكولاج`);
          }
        } else {
          // الوضع الحر: عند اختيار صورة واحدة تُدرج كالمعتاد، وعند اختيار أكثر من صورة تُدرج بتوزيع شبكي ذكي وخطوة تراجع واحدة
          if (b64s.length === 1) {
            let finalSrc = b64s[0];
            if (isWailsDesktop && finalSrc.startsWith("data:image/")) {
              try {
                const localPath = await SaveImageFromBase64(finalSrc);
                if (localPath) finalSrc = localPath;
              } catch (e) {
                console.error("Failed to save image locally in single mode:", e);
              }
            }
            const aspect = await resolveImageAspectRatio(finalSrc);
            freshState.addImageElement(finalSrc, aspect);
            toast.success("تمت إضافة الصورة إلى مساحة العمل");
          } else {
            const items: { src: string; aspectRatio: number }[] = [];
            for (const b64 of b64s) {
              let finalSrc = b64;
              if (isWailsDesktop && b64.startsWith("data:image/")) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) finalSrc = localPath;
                } catch (e) {
                  console.error("Failed to save image locally in batch mode:", e);
                }
              }
              const aspect = await resolveImageAspectRatio(finalSrc);
              items.push({ src: finalSrc, aspectRatio: aspect });
            }
            freshState.addImageElementsBatch(items);
            toast.success(`تم إدراج وتوزيع ${items.length} صورة بنجاح`);
          }
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
      <div className="flex items-center gap-1 bg-muted/50 dark:bg-background/90 border border-border/60 dark:border-border p-0.5 rounded-lg shadow-2xs">
        {/* زر الإدراج المنقسم: فتح صورة فوري + قائمة منسدلة للدفعة والكاميرا والمشاريع */}
        <div className="flex items-center rounded-md bg-background/60 dark:bg-muted/40 shadow-2xs border border-border/40">
          <TooltipBtn content="إدراج صورة جديدة (Ctrl + O)">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFile}
              aria-label="إضافة صورة جديدة"
              className="h-8 px-2.5 gap-1.5 text-foreground hover:text-primary font-bold rounded-s-md rounded-e-none hover:bg-background/90 active:scale-95 transition-all cursor-pointer text-xs flex items-center justify-center select-none group"
            >
              <AddPhotoIcon className="w-4.5 h-4.5 text-primary group-hover:scale-105 transition-transform" />
              <span>إدراج</span>
            </Button>
          </TooltipBtn>

          <DropdownMenu>
            <TooltipBtn content="المزيد من خيارات الإدراج">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="خيارات الإدراج الإضافية"
                  className="h-8 px-1 text-muted-foreground hover:text-foreground rounded-s-none rounded-e-md border-s border-border/40 hover:bg-background/90 active:scale-95 transition-all cursor-pointer"
                >
                  <CaretDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipBtn>
            <DropdownMenuContent align="start" className="w-56 font-cairo rounded-xl backdrop-blur-2xl bg-popover/95 border border-border shadow-fluent-16 p-1.5 space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground/70 select-none">
                خيارات الإدراج
              </div>
              <DropdownMenuItem
                onClick={() => setIsBatchInsertOpen(true)}
                className="flex items-center gap-2.5 p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Stack className="w-4 h-4" weight="duotone" />
                </div>
                <div className="flex flex-col min-w-0 text-start flex-1">
                  <span className="font-bold text-foreground">دفعة صور</span>
                  <span className="text-[10px] text-muted-foreground">إدراج لمعاملات متعددة</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/80">Ctrl+Shift+O</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsPhoneBridgeOpen(true)}
                className="flex items-center gap-2.5 p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <DeviceMobileCamera className="w-4 h-4" weight="duotone" />
                </div>
                <div className="flex flex-col min-w-0 text-start flex-1">
                  <span className="font-bold text-foreground">كاميرا الهاتف</span>
                  <span className="text-[10px] text-muted-foreground">التقاط عبر QR اللاسلكي</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsProjectsOpen(true)}
                className="flex items-center gap-2.5 p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Folders className="w-4 h-4" weight="duotone" />
                </div>
                <div className="flex flex-col min-w-0 text-start flex-1">
                  <span className="font-bold text-foreground">مكتبة المشاريع</span>
                  <span className="text-[10px] text-muted-foreground">استعراض المشاريع</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/80">Ctrl+S</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* المكتبة المحلية */}
        <Suspense fallback={null}>
          <TooltipBtn content="مكتبة المشاريع المحفوظة (Ctrl + S)">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProjectsOpen(true)}
              aria-label="مكتبة المشاريع المحلية"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/90 rounded-md transition-all cursor-pointer group"
            >
              <Folders className="w-4.5 h-4.5 text-muted-foreground/90 group-hover:text-primary group-hover:scale-105 transition-all" weight="duotone" />
            </Button>
          </TooltipBtn>
          <ProjectsDialog open={isProjectsOpen} onOpenChange={setIsProjectsOpen} defaultTab="list" />
        </Suspense>

        {/* نافذة الإدراج المتعدد الذكي */}
        <BatchInsertDialog open={isBatchInsertOpen} onOpenChange={setIsBatchInsertOpen} />

        {/* نافذة جسر كاميرا الهاتف اللاسلكي */}
        <PhoneBridgeDialog open={isPhoneBridgeOpen} onOpenChange={setIsPhoneBridgeOpen} />
      </div>

      {/* جديد / مسح مساحة العمل */}
      <TooltipBtn content="مسح مساحة العمل والبدء من جديد">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearCanvas}
          aria-label="جديد (مسح مساحة العمل)"
          className="h-8 w-8.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all cursor-pointer group"
        >
          <Broom className="w-5 h-5 text-muted-foreground/90 group-hover:text-destructive group-hover:scale-105 transition-all" weight="duotone" />
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
