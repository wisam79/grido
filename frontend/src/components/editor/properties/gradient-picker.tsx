import { cn } from "@/lib/utils";
import { PopoverColorPicker, SliderControl } from "./shared-controls";

interface GradientPickerProps {
  fillType: "solid" | "linear" | "radial";
  color: string;
  colorStops: Array<number | string>;
  onChangeType: (type: "solid" | "linear" | "radial") => void;
  onChangeSolidColor: (color: string) => void;
  onChangeColorStops: (stops: Array<number | string>) => void;
  /** زاوية التدرج الخطي الحالية (0-360) — تُحسب من نقطتي البداية/النهاية */
  angle?: number;
  onChangeAngle?: (deg: number) => void;
  onCommitAngle?: (deg: number) => void;
}

// حساب زاوية التدرج الخطي من نقطتي البداية/النهاية (0° = يسار→يمين، وتدور مع عقارب الساعة نزولاً)
export function gradientAngleFromPoints(
  start?: { x: number; y: number },
  end?: { x: number; y: number }
): number {
  const s = start || { x: 0, y: 0 };
  const e = end || { x: 1, y: 1 };
  const deg = (Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI;
  return Math.round(((deg + 360) % 360) * 10) / 10;
}

// توليد نقطتي البداية/النهاية حول مركز العنصر من زاوية معطاة (إحداثيات نسبية 0-1 كما في Konva)
export function gradientPointsFromAngle(deg: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad) * 0.5;
  const dy = Math.sin(rad) * 0.5;
  return {
    start: { x: 0.5 - dx, y: 0.5 - dy },
    end: { x: 0.5 + dx, y: 0.5 + dy },
  };
}

export const GradientPicker = ({
  fillType,
  color,
  colorStops,
  onChangeType,
  onChangeSolidColor,
  onChangeColorStops,
  angle,
  onChangeAngle,
  onCommitAngle,
}: GradientPickerProps) => {
  const stop1 = (colorStops[1] as string) || "#3b82f6";
  const stop2 = (colorStops[3] as string) || "#8b5cf6";

  const handleStop1Change = (newColor: string) => {
    onChangeColorStops([0, newColor, 1, stop2]);
  };

  const handleStop2Change = (newColor: string) => {
    onChangeColorStops([0, stop1, 1, newColor]);
  };

  const presets = [
    { name: "شروق 🌅", stops: [0, "#f59e0b", 1, "#ef4444"] },
    { name: "سماء 🌌", stops: [0, "#3b82f6", 1, "#8b5cf6"] },
    { name: "زمرد 🌲", stops: [0, "#10b981", 1, "#059669"] },
    { name: "بركان 🌋", stops: [0, "#f43f5e", 1, "#fb7185"] },
    { name: "غروب 🌇", stops: [0, "#ea580c", 1, "#e11d48"] },
    { name: "محيط 🌊", stops: [0, "#06b6d4", 1, "#3b82f6"] }
  ];

  return (
    <div className="space-y-2 border border-border/60 p-2.5 rounded-xl bg-card shadow-xs fluent-specular">
      <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40 gap-0.5">
        {(["solid", "linear", "radial"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChangeType(t)}
            className={cn(
              "flex-1 h-7 rounded-md transition-all cursor-pointer flex items-center justify-center text-[10.5px] font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              fillType === t 
                ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "solid" ? "مصمت" : t === "linear" ? "خطي ⇄" : "دائري ⊙"}
          </button>
        ))}
      </div>

      {fillType === "solid" ? (
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[10px] text-muted-foreground font-semibold">اللون:</span>
          <PopoverColorPicker color={color} onChange={onChangeSolidColor} className="w-28 h-8 rounded-md" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground font-semibold">اللون الأول:</span>
              <PopoverColorPicker color={stop1} onChange={handleStop1Change} className="w-full h-8 rounded-md" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground font-semibold">اللون الثاني:</span>
              <PopoverColorPicker color={stop2} onChange={handleStop2Change} className="w-full h-8 rounded-md" />
            </div>
          </div>

          {fillType === "linear" && onChangeAngle && (
            <SliderControl
              label="زاوية التدرج"
              value={angle ?? 135}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={onChangeAngle}
              onCommit={onCommitAngle}
            />
          )}

          <div className="space-y-1 pt-1.5 border-t border-border/10">
            <span className="text-[9px] text-muted-foreground font-semibold block mb-1">تدرجات جاهزة:</span>
            <div className="grid grid-cols-3 gap-1">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onChangeColorStops(p.stops)}
                  className="h-7 px-1.5 text-[9.5px] rounded-md border border-border/40 hover:border-primary/40 bg-background/60 hover:bg-background transition-all cursor-pointer text-center font-bold flex items-center justify-center gap-1 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 shadow-2xs" 
                    style={{ background: `linear-gradient(135deg, ${p.stops[1]}, ${p.stops[3]})` }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
