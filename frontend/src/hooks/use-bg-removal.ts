import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';

import { RemoveBackground, WarmupBgRemoval } from '@bindings/grido/app';

import { commitAiImageResult } from '@/lib/ai/ai-result-commit';
import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { useEditorStore } from '@/lib/editor-store';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { sanitizeSvgMarkupCached } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import { preloadImageIntoCache } from './use-async-image';

import type { StickerElementSource } from '@/lib/store/types';

const logger = createLogger('bg-removal');

interface BgRemovalState {
  isRemovingBg: boolean;
  bgProgress: number;
  bgProgressText: string;
  setIsRemovingBg: (val: boolean) => void;
  setBgProgress: (val: number) => void;
  setBgProgressText: (val: string) => void;
}

export const useBgRemovalState = create<BgRemovalState>((set) => ({
  isRemovingBg: false,
  bgProgress: 0,
  bgProgressText: '',
  setIsRemovingBg: (val) => set({ isRemovingBg: val }),
  setBgProgress: (val) => set({ bgProgress: val }),
  setBgProgressText: (val) => set({ bgProgressText: val }),
}));

// قفل العملية المشتركة لمنع نقرات مزدوجة متزامنة
let isOperationBusy = false;

// 🛡️ جلسة العملية الجارية (opId تصاعدي) — تمييز نتائج المكالمات القديمة
// (ملغاة أو مُهجورة) عن العملية الحالية حتى لا تُطبَّق متأخراً فوق عملية أحدث
// (كان finally القديم يصفّر حالة عمليةٍ بدأتها نقرة لاحقة).
interface BgRemovalSession {
  id: number;
  /** معرف الخانة في operation-status عند بدء الجلسة */
  opId: string;
  targetId?: string;
  /** عُلِّمت عند طلب الإلغاء — المكالمة الأصلية تستمر حتى تستقر ثم تُسقط نتيجتها */
  cancelled: boolean;
  /** معرف خانة «إلغاء جارٍ» المسجلة عند الإلغاء (تُنهى في finally) */
  cancelOpId: string | null;
}

let bgSessionCounter = 0;
let currentBgSession: BgRemovalSession | null = null;

// ⚡ تحميل كسول لوحدات فرع الملصقات المتجهة: قوالب الملصقات ومولدات SVG
// (تضمين خطوط وتنقيط 300DPI) لا تلزم إلا عند عزل خلفية ملصق فعلياً، فلا تُسحب
// عند الإقلاع مع مسار عزل صور البورتريه. كاش وحدة للوعد (محاولة واحدة متزامنة)،
// وفشل التحميل لا يُخزَّن حتى تبقى إعادة المحاولة ممكنة، والخطأ يُصرَّف بوضوح.
type StickerBuildSvgModule = typeof import('@/features/stickers/lib/sticker-design/build-svg');
type StickerTextModule = typeof import('@/features/stickers/lib/sticker-text');
type SvgRasterizerModule = typeof import('@/features/stickers/lib/svg-rasterizer');
type StickerTemplatesModule = typeof import('@/features/stickers/templates');

interface StickerBgDeps {
  buildStickerSvg: StickerBuildSvgModule['buildStickerSvg'];
  stickerRasterSize: StickerTextModule['stickerRasterSize'];
  renderSvgToPngBlob: SvgRasterizerModule['renderSvgToPngBlob'];
  getStickerTemplateById: StickerTemplatesModule['getStickerTemplateById'];
}

let stickerBgDepsPromise: Promise<StickerBgDeps> | null = null;

function loadStickerBgDeps(): Promise<StickerBgDeps> {
  if (!stickerBgDepsPromise) {
    stickerBgDepsPromise = Promise.all([
      import('@/features/stickers/lib/sticker-design/build-svg'),
      import('@/features/stickers/lib/sticker-text'),
      import('@/features/stickers/lib/svg-rasterizer'),
      import('@/features/stickers/templates'),
    ])
      .then(([buildSvg, stickerText, rasterizer, templates]): StickerBgDeps => ({
        buildStickerSvg: buildSvg.buildStickerSvg,
        stickerRasterSize: stickerText.stickerRasterSize,
        renderSvgToPngBlob: rasterizer.renderSvgToPngBlob,
        getStickerTemplateById: templates.getStickerTemplateById,
      }))
      .catch((err) => {
        stickerBgDepsPromise = null;
        logger.error('Failed to load vector sticker modules:', err);
        throw new Error(
          `تعذر تحميل وحدات قوالب الملصقات لعزل الخلفية: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }
  return stickerBgDepsPromise;
}

// كاش الذاكرة اللحظي لنتائج العزل لنفس الصورة لمنع تكرار الاستدلال
const bgResultCache = new Map<string, string>();
// 🛡️ سقف LRU (20): الخريطة كانت تنمو بلا حد مع كل صورة جديدة —
// image-cache المقابل مسقوف بـ MAX_IMAGE_CACHE=100 بنفس الأسلوب.
const BG_RESULT_CACHE_MAX = 20;
function cacheBgResult(key: string, value: string): void {
  if (bgResultCache.has(key)) bgResultCache.delete(key);
  bgResultCache.set(key, value);
  while (bgResultCache.size > BG_RESULT_CACHE_MAX) {
    const oldest = bgResultCache.keys().next();
    if (oldest.done) break;
    bgResultCache.delete(oldest.value);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => bgResultCache.clear());
}

interface BgRemovalElement {
  id: string;
  imageSrc?: string;
  originalImageSrc?: string;
  stickerSource?: StickerElementSource;
}

type BgRemovalPatch = Partial<BgRemovalElement>;

/**
 * ⚡ استدعاء مسبق للنموذج في الخلفية (Go Native) أثناء خمول التطبيق لتصفير زمن أول نقرة
 */
export function warmupBgRemovalWorker() {
  WarmupBgRemoval().catch((err) => {
    logger.debug('Warmup skipped:', err);
  });
}

/**
 * 🛡️ إلغاء صادق لعزل الخلفية — يعمل من أي مسار استدعاء:
 * - عبر `cancelActiveOperation` (الذي يصفّر `activeOperation` قبل `onCancel`
 *   منذ إصلاح الجلسة 1.42 لمنع الحلقة اللانهائية — ولا نستدعيه هنا إطلاقاً).
 * - استدعاءً مباشراً من زر الإلغاء (toolbar/لوحة الخصائص) والخانة ما زالت مسجلة.
 * لا نصفر الانشغال فوراً: استدعاء `RemoveBackground` ما زال جارياً فعلياً،
 * ونتيجته تُسقط عند الاستقرار وتتولى `finally` تصفير الحالة ذاتها.
 */
function handleCancelBgRemoval(): void {
  const session = currentBgSession;
  const bgState = useBgRemovalState.getState();
  if (!session) {
    // دفاعي: لا جلسة معروفة — السلوك القديم الآمن (تصفير فوري)
    isOperationBusy = false;
    bgState.setIsRemovingBg(false);
    bgState.setBgProgress(0);
    bgState.setBgProgressText('');
    const activeOp = useOperationStatusStore.getState().activeOperation;
    if (activeOp?.type === 'bg_removal') {
      useOperationStatusStore.getState().finishOperation(activeOp.id);
    }
    toast.info('تم إلغاء العملية.');
    return;
  }

  session.cancelled = true;
  const activeOp = useOperationStatusStore.getState().activeOperation;
  if (activeOp && activeOp.id === session.opId) {
    // المسار المباشر: الخانة الأصلية ما زالت مسجلة — تُنهى قبل تسجيل خانة الإلغاء
    useOperationStatusStore.getState().finishOperation(activeOp.id);
  }
  // حالة «إلغاء جارٍ» عبر operation-status: خانة غير قابلة للإلغاء ثانيةً،
  // تُنهى في finally عند استقرار المكالمة الأصلية (finishOperation يتجاهل
  // المعرّفات غير المطابقة فلا يُمسّ أي عملية أحدث).
  session.cancelOpId = useOperationStatusStore.getState().startOperation({
    type: 'bg_removal',
    title: 'جاري إلغاء العملية ...',
    targetId: session.targetId,
    canCancel: false,
  });
  bgState.setBgProgressText('جاري إلغاء العملية ...');
  toast.info('جاري إلغاء العملية ...');
}

export function useBgRemoval(onUpdate: (id: string, patch: BgRemovalPatch) => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const isRemovingBg = useBgRemovalState((s) => s.isRemovingBg);
  const bgProgress = useBgRemovalState((s) => s.bgProgress);
  const bgProgressText = useBgRemovalState((s) => s.bgProgressText);
  const setIsRemovingBg = useBgRemovalState((s) => s.setIsRemovingBg);
  const setBgProgress = useBgRemovalState((s) => s.setBgProgress);
  const setBgProgressText = useBgRemovalState((s) => s.setBgProgressText);

  const handleRemoveBg = async (element: BgRemovalElement) => {
    if (!element.imageSrc) return;

    // 🎨 مسار الملصقات المتجهة (Vector Stickers): تفريغ فوري أصلي (isTransparent: true)
    // بدلاً من إرسال الملصق لنموذج الذكاء الاصطناعي للوجوه البشرية (MODNet ONNX).
    if (element.stickerSource) {
      // ⚡ الوحدات تُجلب هنا فقط عند أول حاجة (كاش وحدة داخل loadStickerBgDeps)
      const { buildStickerSvg, stickerRasterSize, renderSvgToPngBlob, getStickerTemplateById } =
        await loadStickerBgDeps();
      const template = getStickerTemplateById(element.stickerSource.templateId);
      if (template) {
        if (element.stickerSource.params?.isTransparent) {
          toast.info('خلفية الملصق شفافة بالفعل.');
          return;
        }
        try {
          const nextParams = {
            ...element.stickerSource.params,
            isTransparent: true,
          };
          const svg = buildStickerSvg(template, nextParams, {
            namespace: `transparent-${template.id}`,
          });
          const { width, height } = stickerRasterSize(template.aspectRatio, template.defaultMm);
          const pngBlob = await renderSvgToPngBlob(
            svg,
            width,
            height,
            [nextParams.fontFamily || 'Cairo'],
            { dpi: 300 },
          );
          let finalSrc: string;
          if (wailsIsDesktop()) {
            try {
              const uploaded = await uploadMediaBlob(pngBlob, `${template.id}-transparent.png`);
              finalSrc = uploaded.imageSrc;
            } catch {
              finalSrc = await blobToDataUrl(pngBlob);
            }
          } else {
            finalSrc = await blobToDataUrl(pngBlob);
          }

          await preloadImageIntoCache(finalSrc);
          const exportableSvg = sanitizeSvgMarkupCached(svg);
          const commit = commitAiImageResult(element, finalSrc, (id, patch) => {
            onUpdateRef.current(id, {
              ...patch,
              stickerSource: {
                templateId: template.id,
                params: nextParams,
                ...(exportableSvg ? { svg: exportableSvg } : {}),
              },
            });
          });
          if (commit === 'ok') {
            toast.success('تم تفريغ خلفية الملصق المتجه فوراً ⚡');
          }
          return;
        } catch (err) {
          logger.error('Failed to make vector sticker transparent:', err);
          toast.error(toErrorMessage(err, 'تعذّر تفريغ خلفية الملصق.'));
          return;
        }
      }
    }

    // التحقق من صلاحية الترخيص
    const isLicenseActive = useEditorStore.getState().isLicenseActive;
    if (!isLicenseActive()) {
      toast.error('ميزة عزل الخلفية متوفرة فقط في الخطة الاحترافية (Pro).', {
        action: {
          label: 'تفعيل الآن',
          onClick: () => {
            useEditorStore.getState().setAccountModalOpen(true);
          },
        },
      });
      return;
    }

    // ⚡ فحص الكاش الفوري: إذا عُزلت هذه الصورة مسبقاً، طبّق النتيجة في 0ms بلا استدلال
    if (element.imageSrc && bgResultCache.has(element.imageSrc)) {
      const cachedPath = bgResultCache.get(element.imageSrc)!;
      await preloadImageIntoCache(cachedPath);
      const commit = commitAiImageResult(element, cachedPath, onUpdateRef.current);
      if (commit === 'ok') {
        toast.success('تم تطبيق عزل الخلفية من الكاش فوراً ⚡');
        return;
      }
    }

    // القفل على مستوى الوحدة — أي مثيل Hook آخر يرى العملية الجارية
    if (isOperationBusy) {
      toast.warning('جاري العزل ...');
      return;
    }

    // 🛡️ خانة العمليات واحدة: ترميم/تأطير جارٍ يمنع بدء عزل متزامن
    // (وإلا كتبت النتيجتان فوق بعضهما — last-write-wins صامت).
    const busyOpBg = useOperationStatusStore.getState().activeOperation;
    if (busyOpBg) {
      toast.warning(busyOpBg.title);
      return;
    }

    const opId = useOperationStatusStore.getState().startOperation({
      type: 'bg_removal',
      title: 'جاري عزل الخلفية ...',
      targetId: element.id,
      canCancel: true,
      onCancel: handleCancelBgRemoval,
    });

    isOperationBusy = true;
    setIsRemovingBg(true);
    setBgProgress(25);
    setBgProgressText('جاري عزل الخلفية بالذكاء الاصطناعي (Go Native) ...');

    // 🛡️ جلسة هذه العملية (opId تصاعدي) — المرجع لكل قرارات ما بعد الاستدلال
    const session: BgRemovalSession = {
      id: ++bgSessionCounter,
      opId,
      targetId: element.id,
      cancelled: false,
      cancelOpId: null,
    };
    currentBgSession = session;

    const startedAt = performance.now();

    try {
      setBgProgress(60);
      const localPath = await RemoveBackground(element.imageSrc);

      // 🛡️ إلغاء صادق: جلسة ملغاة أو مُهجورة (ليست الأحدث) → إسقاط النتيجة
      // بلا تحميل مسبق ولا commit ولا كاش ولا إشعارات — finally يتولى التنظيف.
      if (session.cancelled || currentBgSession?.id !== session.id) {
        logger.debug('BG removal result discarded (cancelled/superseded session)');
        return;
      }

      if (!localPath) {
        throw new Error('لم يتم استرجاع مسار الصورة المعزولة.');
      }

      setBgProgress(90);
      setBgProgressText('جاري تطبيق النتيجة ...');
      await preloadImageIntoCache(localPath);

      // 🛡️ حارس الطزاثة الموحّد: commitAiImageResult مع معيار نشاط الجلسة —
      // رفض نهائي داخل الcommit نفسه إن أُلغيت الجلسة بعد الفحص أعلاه.
      const commit = commitAiImageResult(
        element,
        localPath,
        onUpdateRef.current,
        undefined,
        () => !session.cancelled && currentBgSession?.id === session.id,
      );
      if (commit === 'not-found') {
        toast.info('تم إلغاء عزل الخلفية: العنصر لم يعد موجوداً.');
        return;
      }
      if (commit === 'changed') {
        toast.info('تم إلغاء عزل الخلفية: تغيّرت الصورة أثناء المعالجة.');
        return;
      }

      if (element.imageSrc) {
        cacheBgResult(element.imageSrc, localPath);
      }
      toast.success('تم عزل خلفية الصورة بنجاح');

      const totalSec = Math.round((performance.now() - startedAt) / 100) / 10;
      const user = useEditorStore.getState().user;
      useEditorStore.getState().logAiUsage({
        email: user?.email || 'unknown',
        serviceName: 'عزل الخلفية الذكي (AI Background Removal - Go Native)',
        source: 'Grido Studio Desktop (Windows)',
        durationSec: totalSec,
        costUsd: 0,
        status: 'success',
      });
    } catch (err) {
      logger.error('Failed to remove background:', err);
      // جلسة ملغاة/مُهجورة: لا إشعارات — الخطأ يعود لمكالمة لم يعد أحد ينتظرها
      if (!session.cancelled && currentBgSession?.id === session.id) {
        toast.error(toErrorMessage(err, 'فشل عزل الخلفية بالذكاء الاصطناعي.'));
      }
    } finally {
      // 🧹 إنهاء الخانة المرئية: الأصلية إن لم يُلغَ، أو خانة «إلغاء جارٍ» إن أُلغِيَ.
      // finishOperation يتجاهل المعرّفات غير المطابقة فلا يصفّر حالة عملية أحدث.
      useOperationStatusStore.getState().finishOperation(session.cancelOpId ?? opId);
      if (currentBgSession?.id === session.id) {
        currentBgSession = null;
        isOperationBusy = false;
        setIsRemovingBg(false);
        setBgProgressText('');
        setBgProgress(0);
        if (session.cancelled) {
          toast.info('تم إلغاء العملية.');
        }
      }
      triggerMemoryTrim();
    }
  };

  return {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  };
}
