import { lazy, useState, useEffect, useRef, Suspense } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Stack, Folders, DeviceMobileCamera, CaretDown } from '@/components/ui/icons';
import { AddPhotoIcon } from '@/components/ui/image-icons';
import { buildCollageInsertPlan } from '@/lib/canvas/collage-insert';
import {
  resolveImageAspectRatio,
  resolveBatchImageAspectRatios,
} from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import { openImageFileDialog } from '@/lib/io/file-dialog-utils';
import { createLogger } from '@/lib/logger';
import { usePhoneBridgeStore } from '@/lib/phone-bridge-store';
import { wailsIsDesktop } from '@/lib/wails-env';

import { ClearAutoSave, SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';

// حوارات ثقيلة تُحمَّل عند أول فتح فقط: كانت تُستورد استيراداً ثابتاً فتدخل
// الحزمة الرئيسية (projects يجرّ قاعدة المشاريع، phone-bridge يجرّ qrcode.react).
const ProjectsDialog = lazy(() =>
  import('../dialogs/projects-dialog').then((m) => ({ default: m.ProjectsDialog })),
);
const BatchInsertDialog = lazy(() =>
  import('../dialogs/batch-insert-dialog').then((m) => ({ default: m.BatchInsertDialog })),
);
const PhoneBridgeDialog = lazy(() =>
  import('../dialogs/phone-bridge-dialog').then((m) => ({ default: m.PhoneBridgeDialog })),
);

const logger = createLogger('toolbar-file-ops');

// معالجة متوازية مقيدة التزامن — تمنع تجميد الزر أثناء حفظ/قياس دفعات الصور
// (التسلسل الكامل كان يفك ترميز كل صورة واحدة تلو الأخرى)
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function ToolbarFileOps() {
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [projectsMounted, setProjectsMounted] = useState(false);
  const [projectsTab, setProjectsTab] = useState<'save' | 'list'>('save');
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isBatchInsertOpen, setIsBatchInsertOpen] = useState(false);
  const [batchMounted, setBatchMounted] = useState(false);
  const [isPhoneBridgeOpen, setIsPhoneBridgeOpen] = useState(false);
  const [phoneBridgeMounted, setPhoneBridgeMounted] = useState(false);
  const isPhoneBridgeRunning = usePhoneBridgeStore((s) => s.isRunning);
  const phoneBridgePairedDevice = usePhoneBridgeStore((s) => s.pairedDevice);
  const phoneBridgeReceivedCount = usePhoneBridgeStore((s) => s.receivedCount);

  useEffect(() => {
    const openProjects = (e?: Event) => {
      const customEvent = e as CustomEvent<{ tab?: 'save' | 'list' }> | undefined;
      const targetTab = customEvent?.detail?.tab || 'save';
      setProjectsTab(targetTab);
      setProjectsMounted(true);
      setIsProjectsOpen(true);
    };
    const openBatch = () => {
      setBatchMounted(true);
      setIsBatchInsertOpen(true);
    };
    const openPhoneBridge = () => {
      setPhoneBridgeMounted(true);
      setIsPhoneBridgeOpen(true);
    };
    // طلب المسح من قائمة «المزيد» في الشريط — نافذة التأكيد تبقى ملكاً لهذا المكوّن
    const clearCanvasRequest = () => setIsClearAlertOpen(true);
    window.addEventListener('grido:open-projects-dialog', openProjects);
    window.addEventListener('grido:open-batch-insert-dialog', openBatch);
    window.addEventListener('grido:open-phone-bridge', openPhoneBridge);
    window.addEventListener('grido:clear-canvas-request', clearCanvasRequest);
    return () => {
      window.removeEventListener('grido:open-projects-dialog', openProjects);
      window.removeEventListener('grido:open-batch-insert-dialog', openBatch);
      window.removeEventListener('grido:open-phone-bridge', openPhoneBridge);
      window.removeEventListener('grido:clear-canvas-request', clearCanvasRequest);
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

        if (freshMode === 'collage') {
          let localPaths: string[] = [];
          if (isWailsDesktop) {
            localPaths = await mapWithConcurrency(b64s, 4, async (b64) => {
              if (b64.startsWith('data:image/')) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) return localPath;
                } catch (e) {
                  logger.error('Failed to save image locally:', e);
                }
              }
              return b64;
            });
          } else {
            localPaths = b64s;
          }

          const targetSlotId =
            freshSelectedId && freshSlots.some((slot) => slot.id === freshSelectedId)
              ? freshSelectedId
              : null;
          const plan = buildCollageInsertPlan(freshSlots, localPaths, {
            targetSlotId,
            scope: targetSlotId ? 'target' : 'empty',
          });
          if (plan.assignments.length > 0) {
            await freshState.setSlotImagesBatch(
              plan.assignments,
              plan.assignments[plan.assignments.length - 1].src,
            );
          }
          if (plan.remaining.length > 0) {
            freshState.appendPendingCollageImages(plan.remaining);
            toast.info(`أُدرجت ${plan.assignments.length} · بقيت ${plan.remaining.length} صورة`);
          } else if (plan.assignments.length > 1) {
            toast.success(`أُدرجت ${plan.assignments.length} صورة في الخانات`);
          } else if (plan.assignments.length === 0) {
            toast.info('لا توجد خانات فارغة — بقيت الصور في قائمة التعبئة');
            freshState.appendPendingCollageImages(localPaths);
          }
        } else {
          // الوضع الحر: عند اختيار صورة واحدة تُدرج كالمعتاد، وعند اختيار أكثر من صورة تُدرج بتوزيع شبكي ذكي وخطوة تراجع واحدة
          if (b64s.length === 1) {
            let finalSrc = b64s[0];
            if (isWailsDesktop && finalSrc.startsWith('data:image/')) {
              try {
                const localPath = await SaveImageFromBase64(finalSrc);
                if (localPath) finalSrc = localPath;
              } catch (e) {
                logger.error('Failed to save image locally in single mode:', e);
              }
            }
            const aspect = await resolveImageAspectRatio(finalSrc);
            freshState.addImageElement(finalSrc, aspect);
          } else {
            // حفظ وتحويل المسارات إن كانت base64
            const finalSrcs = await mapWithConcurrency(b64s, 4, async (b64) => {
              let finalSrc = b64;
              if (isWailsDesktop && b64.startsWith('data:image/')) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) finalSrc = localPath;
                } catch (e) {
                  logger.error('Failed to save image locally in batch mode:', e);
                }
              }
              return finalSrc;
            });

            const aspectMap = await resolveBatchImageAspectRatios(finalSrcs);

            const items = finalSrcs.map((src) => ({
              src,
              aspectRatio: aspectMap.get(src) || 1,
            }));
            freshState.addImageElementsBatch(items);
          }
        }
      }
    } catch (e) {
      logger.error('Failed to open file in toolbar:', e);
      toast.error('فشل فتح الصورة');
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
    window.addEventListener('grido:open-file-dialog', openFile);
    return () => window.removeEventListener('grido:open-file-dialog', openFile);
  }, []);

  const confirmClearCanvas = () => {
    useEditorStore.getState().reset();
    ClearAutoSave().catch((err) => logger.error('Failed to clear autosave:', err));
  };

  return (
    <>
      {/* مجموعة الإدراج والمشاريع */}
      <div className="fluent-command-group shadow-2xs">
        {/* زر الإدراج المنقسم: فتح صورة فوري + قائمة منسدلة للدفعة والكاميرا */}
        <div className="flex items-center rounded-md overflow-hidden">
          <TooltipBtn content="إدراج صورة جديدة (Ctrl + O)">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFile}
              data-testid="toolbar-insert"
              aria-label="إدراج صورة جديدة"
              className="h-8 px-2.5 gap-1.5 text-foreground hover:text-primary font-bold rounded-s-md rounded-e-none hover:bg-background/80 transition-colors cursor-pointer text-xs flex items-center justify-center select-none group border-e border-border/40"
            >
              <AddPhotoIcon className="w-4 h-4 text-foreground" />
              <span>إدراج</span>
            </Button>
          </TooltipBtn>

          <DropdownMenu>
            <TooltipBtn content="خيارات الإدراج">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="خيارات الإدراج"
                  className="h-8 px-1.5 text-muted-foreground hover:text-foreground rounded-s-none rounded-e-md hover:bg-background/80 transition-colors cursor-pointer"
                >
                  <CaretDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipBtn>
            <DropdownMenuContent
              align="start"
              className="w-56 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5 space-y-1"
            >
              <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 select-none">
                خيارات الإدراج
              </div>
              <DropdownMenuItem
                onClick={() => {
                  setBatchMounted(true);
                  setIsBatchInsertOpen(true);
                }}
                className="flex items-center gap-2.5 p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <Stack className="w-4 h-4 shrink-0" />
                <span className="font-bold text-foreground flex-1">دفعة صور</span>
                <span className="text-micro font-mono text-muted-foreground/80">Ctrl+Shift+O</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setPhoneBridgeMounted(true);
                  setIsPhoneBridgeOpen(true);
                }}
                className="flex items-center gap-2.5 p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <DeviceMobileCamera className="w-4 h-4 shrink-0" />
                <span className="font-bold text-foreground flex-1">كاميرا الهاتف</span>
                {isPhoneBridgeRunning && (
                  <span className="flex items-center gap-1 text-micro text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>نشط</span>
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* مؤشر كاميرا الهاتف النشط مع اسم الجهاز وعدد الصور المستلمة */}
        {isPhoneBridgeRunning && (
          <TooltipBtn
            content={`كاميرا الهاتف متصلة (${phoneBridgePairedDevice || 'جاهز للاستلام'}) — انقر للإدارة أو الإيقاف`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhoneBridgeMounted(true);
                setIsPhoneBridgeOpen(true);
              }}
              className="h-8 px-2.5 gap-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer text-xs font-semibold rounded-md flex items-center justify-center select-none"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <DeviceMobileCamera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline font-bold">
                {phoneBridgePairedDevice ? phoneBridgePairedDevice : 'كاميرا الهاتف'}
              </span>
              {phoneBridgeReceivedCount > 0 && (
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono text-micro font-bold">
                  {phoneBridgeReceivedCount}
                </span>
              )}
            </Button>
          </TooltipBtn>
        )}

        {/* المكتبة المحلية */}
        <TooltipBtn content="مكتبة المشاريع">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setProjectsTab('list');
              setProjectsMounted(true);
              setIsProjectsOpen(true);
            }}
            data-testid="toolbar-projects"
            aria-label="مكتبة المشاريع"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors cursor-pointer group"
          >
            <Folders
              className="w-4 h-4 text-muted-foreground/90 group-hover:text-foreground transition-colors"
              weight="duotone"
            />
          </Button>
        </TooltipBtn>
        {projectsMounted && (
          <Suspense fallback={null}>
            <ProjectsDialog
              open={isProjectsOpen}
              onOpenChange={setIsProjectsOpen}
              defaultTab={projectsTab}
            />
          </Suspense>
        )}

        {/* نافذة الإدراج المتعدد الذكي */}
        {batchMounted && (
          <Suspense fallback={null}>
            <BatchInsertDialog open={isBatchInsertOpen} onOpenChange={setIsBatchInsertOpen} />
          </Suspense>
        )}

        {/* نافذة جسر كاميرا الهاتف اللاسلكي */}
        {phoneBridgeMounted && (
          <Suspense fallback={null}>
            <PhoneBridgeDialog open={isPhoneBridgeOpen} onOpenChange={setIsPhoneBridgeOpen} />
          </Suspense>
        )}
      </div>

      {/* مسح مساحة العمل — انتقل زره إلى قائمة «المزيد» (grido:clear-canvas-request)،
          وتبقى نافذة التأكيد هنا لأن هذا المكوّن مالك حالة المسح */}
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent
          dir="rtl"
          className="rounded-lg border border-border/80 dark:border-white/10 fluent-specular shadow-fluent-16 bg-card"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-start">مسح مساحة العمل</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-start">
              سيتم المسح نهائياً. متابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="font-cairo">
            <AlertDialogCancel className="font-cairo h-8 rounded-md">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearCanvas}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-cairo h-8 rounded-md"
            >
              مسح
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
