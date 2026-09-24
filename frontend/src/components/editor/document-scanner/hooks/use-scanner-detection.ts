import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Point,
  DetectedDocument,
  DetectionMode,
  DocumentAspectType,
  detectDocumentAuto,
  defaultInsetCorners,
  getDocumentAspectLabel,
  inferSmartDocumentAspect,
  addManualDocumentQuad,
  splitQuadIntoIdCards,
  warmupMlDetector,
} from "../core";
import { formatSolvableError } from "@/lib/ui/ui-compliance";

export interface ScannerDetectionApi {
  detectedDocs: DetectedDocument[];
  setDetectedDocs: React.Dispatch<React.SetStateAction<DetectedDocument[]>>;
  selectedDocIds: string[];
  setSelectedDocIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeDocIndex: number;
  setActiveDocIndex: React.Dispatch<React.SetStateAction<number>>;
  detectionMode: DetectionMode;
  setDetectionMode: React.Dispatch<React.SetStateAction<DetectionMode>>;
  isDetecting: boolean;
  imgSize: { w: number; h: number };
  setImgSize: React.Dispatch<React.SetStateAction<{ w: number; h: number }>>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  activeReqIdRef: React.RefObject<number>;
  runDetection: (notify: boolean, mode: DetectionMode) => Promise<void>;
  selectDocument: (
    index: number,
    cornersSetter: (c: Point[]) => void,
    aspectSetter: (a: DocumentAspectType) => void,
    rotationSetter: (r: number) => void,
    previewResetter: () => void
  ) => void;
  toggleDocSelection: (id: string) => void;
  selectAllDocs: () => void;
  handleAddManualDocument: (
    cornersSetter: (c: Point[]) => void,
    aspectSetter: (a: DocumentAspectType) => void,
    previewResetter: () => void
  ) => void;
  handleDeleteDocument: (
    id: string,
    cornersSetter: (c: Point[]) => void,
    aspectSetter: (a: DocumentAspectType) => void,
    previewResetter: () => void
  ) => void;
  handleSplitIdCards: (
    corners: Point[],
    cornersSetter: (c: Point[]) => void,
    aspectSetter: (a: DocumentAspectType) => void,
    previewResetter: () => void
  ) => void;
  handleAutoDetect: (mode?: DetectionMode) => void;
  setDetectionCallbacks: (cbs: DetectionCallbacks) => void;
}

export interface DetectionCallbacks {
  onCorners: (corners: Point[]) => void;
  onAspect: (aspect: DocumentAspectType) => void;
}

/**
 * 🧭 عقل ماسح المستندات: تحميل الصورة، تشغيل الكشف (ML→OpenCV→JS)،
 * إدارة المستندات المكتشفة المتعددة وتحديدها.
 * 🛡️ حارس العدد التنازلي (reqId) يمنع استدعاءات الكشف المتقاطعة —
 * نتائج الكشف القديمة تُتجاهل. كانت هذه الكتلة مضمّنة في Dialog.
 */
export function useScannerDetection(
  open: boolean,
  imageSrc: string
): ScannerDetectionApi {
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("single");
  const [detectedDocs, setDetectedDocs] = useState<DetectedDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const activeReqIdRef = useRef<number>(0);

  // مرجع دائم للـ callbacks الحالية — يسمح لـ runDetection بتحديث حالة المكوّن
  // دون إعادة إنشاء الدالة (هوية مستقرة) ودون أحداث DOM مخصصة
  const cbsRef = useRef<DetectionCallbacks>({ onCorners: () => {}, onAspect: () => {} });
  const setDetectionCallbacks = useCallback((cbs: DetectionCallbacks) => {
    cbsRef.current = cbs;
  }, []);

  const runDetection = useCallback(
    async (notify: boolean, mode: DetectionMode) => {
      const img = imgRef.current;
      if (!img) return;
      const reqId = ++activeReqIdRef.current;
      setIsDetecting(true);
      try {
        const result = await detectDocumentAuto(img, img.naturalWidth, img.naturalHeight, mode);
        if (reqId !== activeReqIdRef.current) return;
        if (result.documents && result.documents.length > 0) {
          setDetectedDocs(result.documents);
          setSelectedDocIds(result.documents.map((d) => d.id));
          setActiveDocIndex(0);
          const first = result.documents[0];
          cbsRef.current.onCorners(first.corners);
          if (first.aspectType !== "free") {
            cbsRef.current.onAspect(first.aspectType);
          }

          if (notify) {
            if (result.documents.length > 1) {
              toast.success(`تم اكتشاف ${result.documents.length} مستندات في الصورة بنجاح!`);
            } else if (result.method === "scanic") {
              toast.success(`كشف فائق بالذكاء الاصطناعي (${Math.round(result.confidence * 100)}%)`);
            } else if (result.method === "opencv") {
              toast.success(`كشف تلقائي دقيق (${Math.round(result.confidence * 100)}%)`);
            } else if (result.method === "js") {
              toast.success("كشف ذكي للمستند/البطاقة");
            } else {
              toast.warning("لم يُكتشف المستند بدقة — اضبط الأركان يدوياً");
            }
          }
        } else if (result.corners) {
          cbsRef.current.onCorners(result.corners);
          const inferred = inferSmartDocumentAspect(result.corners);
          if (inferred !== "free") {
            cbsRef.current.onAspect(inferred);
          }
          if (notify) toast.success("تم كشف المستند");
        } else {
          if (notify) toast.warning("لم يُنتج الكشف أي أركان — استخدم التعديل اليدوي");
        }
      } catch {
        if (reqId === activeReqIdRef.current && notify) {
          toast.error(
            formatSolvableError({
              reason: "تعذر إتمام الكشف التلقائي",
              fix: "تأكد من وضوح الصورة ثم اضغط كشف تلقائي مجدداً أو اضبط الأركان يدوياً",
              code: "SCN-DETECT-01",
            })
          );
        }
      } finally {
        if (reqId === activeReqIdRef.current) {
          setIsDetecting(false);
        }
      }
    },
    []
  );

  const selectDocument = useCallback(
    (
      index: number,
      cornersSetter: (c: Point[]) => void,
      aspectSetter: (a: DocumentAspectType) => void,
      rotationSetter: (r: number) => void,
      previewResetter: () => void
    ) => {
      if (index < 0 || index >= detectedDocs.length) return;
      setActiveDocIndex(index);
      const doc = detectedDocs[index];
      cornersSetter(doc.corners);
      aspectSetter(doc.aspectType || "free");
      rotationSetter(doc.rotation || 0);
      previewResetter();
    },
    [detectedDocs]
  );

  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((d) => d !== id) : [...prev, id]) : [...prev, id]
    );
  }, []);

  const selectAllDocs = useCallback(() => {
    if (selectedDocIds.length === detectedDocs.length) {
      if (detectedDocs[activeDocIndex]) {
        setSelectedDocIds([detectedDocs[activeDocIndex].id]);
      }
    } else {
      setSelectedDocIds(detectedDocs.map((d) => d.id));
    }
  }, [detectedDocs, selectedDocIds, activeDocIndex]);

  const handleAddManualDocument = useCallback(
    (
      cornersSetter: (c: Point[]) => void,
      aspectSetter: (a: DocumentAspectType) => void,
      previewResetter: () => void
    ) => {
      if (!imgSize.w || !imgSize.h) return;
      setDetectionMode("multi");
      const newDoc = addManualDocumentQuad(detectedDocs, imgSize.w, imgSize.h);
      const nextDocs = [...detectedDocs, newDoc];
      setDetectedDocs(nextDocs);
      setSelectedDocIds((prev) => [...prev, newDoc.id]);
      setActiveDocIndex(nextDocs.length - 1);
      cornersSetter(newDoc.corners);
      aspectSetter(newDoc.aspectType);
      previewResetter();
      toast.success(`تمت إضافة ${newDoc.label} — اضبط حدوده بالسحب أو الأسهم`);
    },
    [detectedDocs, imgSize]
  );

  const handleDeleteDocument = useCallback(
    (
      id: string,
      cornersSetter: (c: Point[]) => void,
      aspectSetter: (a: DocumentAspectType) => void,
      previewResetter: () => void
    ) => {
      if (detectedDocs.length <= 1) {
        toast.warning("يجب الإبقاء على مستند واحد على الأقل");
        return;
      }
      const deletedIdx = detectedDocs.findIndex((d) => d.id === id);
      if (deletedIdx === -1) return;

      // المعرفات مستقرة (UUID) — لا إعادة ترقيم بعد الحذف: التسمية للعرض فقط
      // تُشتق من الترتيب الحالي دون المساس بالـ id (كان `doc-${idx+1}` يُعاد
      // توليده فيكسر key وselectedIds بمنطق O(n²) هش).
      const survivingDocs = detectedDocs.filter((d) => d.id !== id);
      const nextDocs: DetectedDocument[] = survivingDocs.map((doc, idx) => ({
        ...doc,
        label: getDocumentAspectLabel(doc.aspectType, idx + 1),
      }));

      // المحددات الباقية تنتقل كما هي (ids مستقرة) — لا مطابقة أسماء.
      const prevSelectedSet = new Set(selectedDocIds);
      const keptSelected = nextDocs.filter((d) => prevSelectedSet.has(d.id)).map((d) => d.id);
      const finalSelected = keptSelected.length > 0 ? keptSelected : [nextDocs[0].id];

      setDetectedDocs(nextDocs);
      setSelectedDocIds(finalSelected);

      const newActiveIdx = Math.max(
        0,
        Math.min(
          nextDocs.length - 1,
          deletedIdx === activeDocIndex
            ? 0
            : deletedIdx < activeDocIndex
            ? activeDocIndex - 1
            : activeDocIndex
        )
      );
      setActiveDocIndex(newActiveIdx);
      cornersSetter(nextDocs[newActiveIdx].corners);
      aspectSetter(nextDocs[newActiveIdx].aspectType || "free");
      previewResetter();
      toast.info("تم حذف المستند");
    },
    [detectedDocs, selectedDocIds, activeDocIndex]
  );

  const handleSplitIdCards = useCallback(
    (
      corners: Point[],
      cornersSetter: (c: Point[]) => void,
      aspectSetter: (a: DocumentAspectType) => void,
      previewResetter: () => void
    ) => {
      if (corners.length !== 4) {
        toast.warning(
          formatSolvableError({
            reason: "تعذر التقسيم — الأركان غير مكتملة",
            fix: "اضبط النقاط الأربع على المستند أولاً ثم أعد التقسيم",
            code: "SCN-SPLIT-01",
          })
        );
        return;
      }
      setDetectionMode("multi");
      const cards = splitQuadIntoIdCards(corners, "vertical");
      if (cards.length === 2) {
        // دمج البطاقتين في القائمة الموجودة بدل استبدال المستندات كلها،
        // والنشط ينتقل لأول بطاقة جديدة (index = طول البقية).
        const others = detectedDocs.filter((d) => !cards.some((c) => c.id === d.id));
        setDetectedDocs([...others, ...cards]);
        setSelectedDocIds(cards.map((c) => c.id));
        setActiveDocIndex(others.length);
        cornersSetter(cards[0].corners);
        aspectSetter("id_card");
        previewResetter();
        toast.success("تم تقسيم المستند إلى بطاقتي هوية (وجه أمامي وخلفي)");
      }
    },
    [detectedDocs]
  );

  const handleAutoDetect = useCallback(
    (mode?: DetectionMode) => {
      const targetMode = mode || detectionMode;
      if (mode && mode !== detectionMode) {
        setDetectionMode(mode);
      }
      runDetection(true, targetMode);
    },
    [detectionMode, runDetection]
  );

  // 🔒 تنظيف الحالات عند الإغلاق وإلغاء أي كشف جارٍ (Fluent 2 Wait UX Invariant)
  useEffect(() => {
    if (!open) {
      activeReqIdRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset detection state on close
      setIsDetecting(false);
      setDetectedDocs([]);
      setSelectedDocIds([]);
      setActiveDocIndex(0);
      setDetectionMode("single");
      imgRef.current = null;
    }
  }, [open]);

  // 🔒 تحميل الصورة عند الفتح + تسخين نموذج الذكاء الاصطناعي
  useEffect(() => {
    if (!open || !imageSrc) return;

    // تسخين نموذج الذكاء الاصطناعي في الخلفية عند الخمول — لا ينافس الكشف
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (typeof ric === "function") ric.call(window, () => void warmupMlDetector());
    else setTimeout(() => void warmupMlDetector(), 500);

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

      cbsRef.current.onCorners(defaultInsetCorners(img.naturalWidth, img.naturalHeight));
      setDetectionMode("single");
      runDetection(false, "single");
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast.error(
          formatSolvableError({
            reason: "فشل تحميل صورة المستند للمسح",
            fix: "أعد إدراج الصورة بصيغة مدعومة (PNG/JPG) ثم أعد فتح الماسح",
            code: "SCN-LOAD-01",
          })
        );
      }
    };

    img.src = imageSrc;

    const reqIdAtMount = activeReqIdRef.current;
    return () => {
      isCancelled = true;
      activeReqIdRef.current = reqIdAtMount + 1;
      img.onload = null;
      img.onerror = null;
      // تحرير الصورة المفكوكة من الذاكرة دون revoke (الـ blob URL ملك المنادي
      // وقد يُعاد استخدامه — التفريغ عبر src="" يكفي لتحرير البتماب).
      try {
        img.src = "";
      } catch {
        // ignore
      }
      if (imgRef.current === img) imgRef.current = null;
    };
  }, [open, imageSrc, runDetection]);

  return {
    detectedDocs,
    setDetectedDocs,
    selectedDocIds,
    setSelectedDocIds,
    activeDocIndex,
    setActiveDocIndex,
    detectionMode,
    setDetectionMode,
    isDetecting,
    imgSize,
    setImgSize,
    imgRef,
    activeReqIdRef,
    runDetection,
    selectDocument,
    toggleDocSelection,
    selectAllDocs,
    handleAddManualDocument,
    handleDeleteDocument,
    handleSplitIdCards,
    handleAutoDetect,
    setDetectionCallbacks,
  };
}
