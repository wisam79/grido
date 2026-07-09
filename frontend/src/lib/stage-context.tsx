/**
 * stage-context.tsx
 * React Context لمشاركة مرجع Konva.Stage بين المكونات
 * بدلاً من تخزينه في Zustand (الذي يمنع Garbage Collection)
 */
import { createContext, useContext, useRef, type ReactNode } from "react";
import type Konva from "konva";

type StageContextType = {
  stageRef: React.MutableRefObject<Konva.Stage | null>;
};

const StageContext = createContext<StageContextType | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  const stageRef = useRef<Konva.Stage | null>(null);
  return (
    <StageContext.Provider value={{ stageRef }}>
      {children}
    </StageContext.Provider>
  );
}

/**
 * useStageRef — Hook للوصول لمرجع Konva.Stage من أي مكون
 * يجب استخدامه داخل <StageProvider>
 */
export function useStageRef() {
  const ctx = useContext(StageContext);
  if (!ctx) {
    throw new Error("useStageRef must be used within a <StageProvider>");
  }
  return ctx.stageRef;
}
