import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";

interface CanvasBleedGuidesProps {
  displayW: number;
  displayH: number;
}

export const CanvasBleedGuides = React.memo(function CanvasBleedGuides({
  displayW,
  displayH,
}: CanvasBleedGuidesProps) {
  const {
    showBleedGuides,
    bleedMarginMM,
    safeMarginMM,
    cutShapeType,
    canvasWidth,
    printSettings,
  } = useEditorStore(
    useShallow((state) => ({
      showBleedGuides: state.showBleedGuides,
      bleedMarginMM: state.bleedMarginMM,
      safeMarginMM: state.safeMarginMM,
      cutShapeType: state.cutShapeType,
      canvasWidth: state.canvasWidth,
      printSettings: state.printSettings,
    }))
  );

  if (!showBleedGuides || displayW <= 0 || displayH <= 0 || canvasWidth <= 0) {
    return null;
  }

  const dpi = printSettings?.dpi || 300;
  // النسبة الدقيقة بين بكسل العرض الفعلي displayW والمليمترات
  const mmToDisplayPx = (dpi / 25.4) * (displayW / canvasWidth);

  const bleedPx = Math.max(0, bleedMarginMM * mmToDisplayPx);
  const safePx = Math.max(1, safeMarginMM * mmToDisplayPx);

  // نصف قطر الاستدارة المطبعي القياسي للبطاقات (3.18 مم للبطاقات القياسية وشارات CR80)
  const cornerRadiusPx = Math.max(2, 3.18 * mmToDisplayPx);

  const cx = displayW / 2;
  const cy = displayH / 2;
  const rxCut = displayW / 2;
  const ryCut = displayH / 2;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 select-none"
      style={{ overflow: "visible" }}
      dir="rtl"
    >
      <svg
        width={displayW}
        height={displayH}
        className="w-full h-full"
        style={{ overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {cutShapeType === "circle" ? (
          <>
            {/* خط النزيف الخارجي الدائري/البيضاوي (أحمر متقطع) */}
            {bleedPx > 0 && (
              <ellipse
                cx={cx}
                cy={cy}
                rx={rxCut + bleedPx}
                ry={ryCut + bleedPx}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}
            {/* خط القص الدائري/البيضاوي الفعلي (أزرق) */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={rxCut}
              ry={ryCut}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* خط منطقة الأمان الداخلي (أخضر متقطع) */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={Math.max(2, rxCut - safePx)}
              ry={Math.max(2, ryCut - safePx)}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          </>
        ) : (
          <>
            {/* خط النزيف الخارجي (أحمر متقطع) */}
            {bleedPx > 0 && (
              <rect
                x={-bleedPx}
                y={-bleedPx}
                width={displayW + bleedPx * 2}
                height={displayH + bleedPx * 2}
                rx={cutShapeType === "rounded-rect" ? cornerRadiusPx + bleedPx : 0}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}
            {/* خط القص الفعلي (أزرق) */}
            <rect
              x="0"
              y="0"
              width={displayW}
              height={displayH}
              rx={cutShapeType === "rounded-rect" ? cornerRadiusPx : 0}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* خط منطقة الأمان الداخلي (أخضر متقطع) */}
            <rect
              x={safePx}
              y={safePx}
              width={Math.max(4, displayW - safePx * 2)}
              height={Math.max(4, displayH - safePx * 2)}
              rx={cutShapeType === "rounded-rect" ? Math.max(0, cornerRadiusPx - safePx) : 0}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          </>
        )}
      </svg>

      {/* شارة إيضاحية دقيقة لخطوط المطابع — متموضعة بذكاء أسفل الكانفس لمنع حجب التصاميم الصغيرة */}
      <div className="absolute -bottom-7 start-0 flex items-center gap-1.5 bg-card/95 backdrop-blur-md px-2 py-0.5 rounded-md border border-border/80 text-micro font-bold shadow-2xs font-cairo whitespace-nowrap">
        <span className="flex items-center gap-1 text-sky-500">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <span>قص</span>
        </span>
        <span className="text-muted-foreground/60">•</span>
        <span className="flex items-center gap-1 text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>أمان ({safeMarginMM}مم)</span>
        </span>
        <span className="text-muted-foreground/60">•</span>
        <span className="flex items-center gap-1 text-destructive">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>نزيف ({bleedMarginMM}مم)</span>
        </span>
      </div>
    </div>
  );
});

CanvasBleedGuides.displayName = "CanvasBleedGuides";
