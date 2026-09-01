import { useState, useCallback, useRef, useEffect } from "react";
import { Point, DetectedDocument, detectDocumentAuto, DetectionMode } from "../core";

export function useDocumentDetection(
  imgRef: React.RefObject<HTMLImageElement | null>
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedDocs, setDetectedDocs] = useState<DetectedDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>("doc-1");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(["doc-1"]);
  const [confidence, setConfidence] = useState<number>(0.99);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runDetection = useCallback(async (mode: DetectionMode = "auto"): Promise<Point[] | null> => {
    const img = imgRef.current;
    if (!img) return null;

    setIsDetecting(true);
    try {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      const res = await detectDocumentAuto(img, origW, origH, mode);
      if (!mountedRef.current) return null;

      if (res.documents && res.documents.length > 0) {
        setDetectedDocs(res.documents);
        setActiveDocId(res.documents[0].id);
        setSelectedDocIds(res.documents.map((d) => d.id));
        setConfidence(res.confidence);
        return res.documents[0].corners;
      }
    } catch (err) {
      console.warn("Detection error in hook:", err);
    } finally {
      if (mountedRef.current) {
        setIsDetecting(false);
      }
    }
    return null;
  }, [imgRef]);

  const toggleSelectDoc = useCallback((id: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((d) => d !== id) : prev;
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const selectAllDocs = useCallback(() => {
    if (selectedDocIds.length === detectedDocs.length) {
      setSelectedDocIds([activeDocId]);
    } else {
      setSelectedDocIds(detectedDocs.map((d) => d.id));
    }
  }, [detectedDocs, selectedDocIds, activeDocId]);

  return {
    isDetecting,
    detectedDocs,
    setDetectedDocs,
    activeDocId,
    setActiveDocId,
    selectedDocIds,
    setSelectedDocIds,
    confidence,
    setConfidence,
    runDetection,
    toggleSelectDoc,
    selectAllDocs,
  };
}
