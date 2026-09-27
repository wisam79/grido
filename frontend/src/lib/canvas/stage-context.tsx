/**
 * stage-context.tsx
 * React Context لمشاركة مرجع Konva.Stage بين المكونات
 * بدلاً من تخزينه في Zustand (الذي يمنع Garbage Collection)
 */
import { createContext, useContext, useRef, type ReactNode } from 'react';
import type Konva from 'konva';

type StageContextType = {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
};

const StageContext = createContext<StageContextType | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  const stageRef = useRef<Konva.Stage | null>(null);
  return <StageContext.Provider value={{ stageRef }}>{children}</StageContext.Provider>;
}

const FALLBACK_STAGE_REF: React.MutableRefObject<Konva.Stage | null> = { current: null };

/**
 * useStageRef — Hook للوصول لمرجع Konva.Stage من أي مكون
 * في حال استخدامه خارج <StageProvider> (مثل الاختبارات الأحادية) يرجع مرجعاً احتياطياً آمناً
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useStageRef(): React.MutableRefObject<Konva.Stage | null> {
  const ctx = useContext(StageContext);
  return ctx ? ctx.stageRef : FALLBACK_STAGE_REF;
}
