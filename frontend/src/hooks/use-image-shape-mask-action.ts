import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getImageShapePair } from '@/lib/canvas/image-shape-fill';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';

let maskingInFlight = false;

export function useImageShapeMaskAction(onSuccess?: () => void) {
  const stageRef = useStageRef();
  const [isMasking, setIsMasking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerMaskImageWithShape = useCallback(async () => {
    if (maskingInFlight) return;
    const live = useEditorStore.getState();
    if (live.mode !== 'single' || !getImageShapePair(live.elements, live.selectedIds)) return;
    const session = getDocumentSession();
    maskingInFlight = true;
    if (mountedRef.current) setIsMasking(true);
    try {
      const result = await live.maskSelectedImageWithShape(stageRef.current);
      if (getDocumentSession() !== session) return;
      if (result === 'ok') {
        toast.success('تم تقنيع الصورة بالشكل');
        if (mountedRef.current) onSuccess?.();
      } else if (result !== 'stale') {
        toast.error(
          result === 'too-large'
            ? 'مساحة الصورة أكبر من حد الالتقاط الآمن'
            : 'تعذّر تقنيع الصورة؛ تحقق من جاهزية الصورة والتحديد',
        );
      }
    } finally {
      maskingInFlight = false;
      if (mountedRef.current) setIsMasking(false);
    }
  }, [stageRef, onSuccess]);

  return { isMasking, triggerMaskImageWithShape };
}
