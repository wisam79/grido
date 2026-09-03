import { useState } from "react";
import { TextElement } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { TextAa, Palette, Sparkle } from "@phosphor-icons/react";

// Sub-components
import { TextTypeTab } from "./text/text-type-tab";
import { TextColorTab } from "./text/text-color-tab";
import { TextEffectsTab } from "./text/text-effects-tab";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

type TextSubTab = "type" | "color" | "effects";

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TextSubTab>("type");

  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";
  const hasCurve = typeof element.curve === "number" && element.curve !== 0;

  const tabButtonClassName = (active: boolean) =>
    cn(
      "h-8 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
      active
        ? "bg-background text-primary shadow-xs font-extrabold border border-border/80 ring-1 ring-primary/20"
        : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
    );

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-200 w-full min-w-0">

      {/* ───────────────────────────────────────────────────────────── */}
      {/* شريط التبويبات الثلاثي (Fluent 2 Segmented Tabs) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-lg border border-border/40 font-cairo shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("type")}
          className={tabButtonClassName(activeTab === "type")}
        >
          <TextAa className="w-3.5 h-3.5" weight={activeTab === "type" ? "bold" : "regular"} />
          <span>الخط والنمط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={tabButtonClassName(activeTab === "color")}
        >
          <Palette className="w-3.5 h-3.5" weight={activeTab === "color" ? "bold" : "regular"} />
          <span>الألوان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={cn(tabButtonClassName(activeTab === "effects"), "relative")}
        >
          <Sparkle className="w-3.5 h-3.5" weight={activeTab === "effects" ? "bold" : "regular"} />
          {/* تمييز الاسم عن تبويب "التأثيرات والظلال" الخارجي لتفادي الالتباس */}
          <span>الظلال والتقويس</span>
          {(hasBadge || hasStroke || hasShadow || hasCurve) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1.5 left-2" />
          )}
        </button>
      </div>

      {activeTab === "type" && <TextTypeTab element={element} onUpdate={onUpdate} />}
      {activeTab === "color" && <TextColorTab element={element} onUpdate={onUpdate} />}
      {activeTab === "effects" && <TextEffectsTab element={element} onUpdate={onUpdate} />}
    </div>
  );
}
