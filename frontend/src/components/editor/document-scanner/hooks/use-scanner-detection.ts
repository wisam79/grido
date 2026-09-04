import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Point,
  DetectedDocument,
  DetectionMode,
  DocumentAspectType,
  detectDocumentAuto,
  inferSmartDocumentAspect,
  addManualDocumentQuad,
  splitQuadIntoIdCards,
  warmupMlDetector,
} from "../core";

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
              toast.success(`تم اكتشاف ${result.documents.length} مستندات في الصورة بنجاح! 🎯`);
            } else if (result.method === "scanic") {
              toast.success(`كشف فائق بالذكاء الاصطناعي (${Math.round(result.confidence * 100)}%) 🎯`);
            } else if (result.method === "opencv") {
              toast.success(`كشف تلقائي دقيق (${Math.round(result.confidence * 100)}%) 🎯`);
            } else if (result.method === "js") {
              toast.success("كشف ذكي للمستند/البطاقة 🎯");
            } else {
              toast.warning("لم يُكتشف المستند بدقة — اضبط الأركان يدوياً ⚠️");
            }
          }
        } else if (result.corners) {
          cbsRef.current.onCorners(result.corners);
          const inferred = inferSmartDocumentAspect(result.corners);
          if (inferred !== "free") {
            cbsRef.current.onAspect(inferred);
          }
          if (notify) toast.success("تم كشف المستند 🎯");
        } else {
          if (notify) toast.warning("لم يُنتج الكشف أي أركان — استخدم التعديل اليدوي ⚠️");
        }
      } catch {
        if (reqId === activeReqIdRef.current && notify) {
          toast.error("حدث خطأ أثناء الكشف — جرب مرة أخرى");
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
      toast.success(`تمت إضافة ${newDoc.label} — اضبط حدوده بالسحب أو الأسهم 🎯`);
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

      const prevSelectedSet = new Set(selectedDocIds);
      const survivingDocs = detectedDocs.filter((d) => d.id !== id);

      // إعادة التسمية مع الحفاظ على كائنات جديدة نقية (Immutability)
      const nextDocs: DetectedDocument[] = survivingDocs.map((doc, idx) => {
        let aspectLabel = "مستند";
        if (doc.aspectType === "id_card") aspectLabel = "بطاقة هوية";
        else if (doc.aspectType === "a4_p" || doc.aspectType === "a4_l") aspectLabel = "ورقة A4";
        else if (doc.aspectType === "square") aspectLabel = "مستند مربع";

        return {
          ...doc,
          id: `doc-${idx + 1}`,
          label: `مستند ${idx + 1} (${aspectLabel})`,
        };
      });

      // مزامنة دقيقة للمستندات المحددة استناداً للمستندات المتبقية التي كانت محددة بالفعل
      const nextSelected: string[] = [];
      survivingDocs.forEach((oldDoc, idx) => {
        if (prevSelectedSet.has(oldDoc.id)) {
          nextSelected.push(nextDocs[idx].id);
        }
      });
      const finalSelected = nextSelected.length > 0 ? nextSelected : [nextDocs[0].id];

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
      if (corners.length !== 4) return;
      setDetectionMode("multi");
      const cards = splitQuadIntoIdCards(corners, "vertical");
      if (cards.length === 2) {
        setDetectedDocs(cards);
        setSelectedDocIds(cards.map((c) => c.id));
        setActiveDocIndex(0);
        cornersSetter(cards[0].corners);
        aspectSetter("id_card");
        previewResetter();
        toast.success("تم تقسيم المستند إلى بطاقتي هوية (وجه أمامي وخلفي) 🎯");
      }
    },
    []
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

  // 🔒 تنظيف الحالات عند الإغلاق
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset detection state on close
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

    // تسخين نموذج الذكاء الاصطناعي مسبقاً في الخلفية
    warmupMlDetector();

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

      const padX = Math.round(img.naturalWidth * 0.05);
      const padY = Math.round(img.naturalHeight * 0.05);
      cbsRef.current.onCorners([
        { x: padX, y: padY },
        { x: img.naturalWidth - padX, y: padY },
        { x: img.naturalWidth - padX, y: img.naturalHeight - padY },
        { x: padX, y: img.naturalHeight - padY },
      ]);
      setDetectionMode("single");
      runDetection(false, "single");
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast.error("فشل تحميل صورة المستند للمسح");
      }
    };

    img.src = imageSrc;

    const reqIdAtMount = activeReqIdRef.current;
    return () => {
      isCancelled = true;
      activeReqIdRef.current = reqIdAtMount + 1;
      img.onload = null;
      img.onerror = null;
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
