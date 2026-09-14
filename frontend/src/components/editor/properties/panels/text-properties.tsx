import { useState } from "react";
import { TextElement } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { TextAa, Palette, Sparkle } from "@phosphor-icons/react";

// Sub-components
import { TextTypeTab } from "./text/text-type-tab";
import { TextColorTab } from "./text/text-color-tab";
import { TextEffectsTab } from "./text/text-effects-tab";
import { TextTabProps } from "./text/text-tab-types";

export interface TextPropertiesProps extends TextTabProps {
  standalone?: boolean;
}

type TextSubTab = "type" | "color" | "effects";

/**
 * تبويب التنسيق للنصوص (TextStyleProperties):
 * يركز حصراً على الخط والنمط والقياسات والمحاذاة
 */
export function TextStyleProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextTypeTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}

/**
 * تبويب الألوان للنصوص (TextColorProperties):
 * استوديو متكامل لتعبئة النصوص (تدرجات كاملة/مصمت)، ألوان الحدود، ألوان الشارة، والشفافية
 */
export function TextColorProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextColorTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}

/**
 * تبويب المؤثرات للنصوص (TextEffectsProperties):
 * الظلال والقوالب 3D، التقويس، وتنسيق أبعاد الشارة
 */
export function TextEffectsProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextEffectsTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}

/**
 * المكون العام للنصوص:
 * يُستخدم عند الحاجة إلى شريط التبويبات الثلاثي المستقل أو للتوافق السابق
 */
export function TextProperties({ element, onUpdate, onNavigateTab, standalone = false }: TextPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TextSubTab>("type");

  if (!standalone) {
    return <TextStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
  }

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
      <div className="grid grid-cols-3 gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-lg border border-border/40 font-cairo shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("type")}
          className={tabButtonClassName(activeTab === "type")}
          title="الخط والنمط والقياسات"
        >
          <TextAa className="w-3.5 h-3.5 shrink-0" weight={activeTab === "type" ? "bold" : "regular"} />
          <span className="truncate">الخط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={tabButtonClassName(activeTab === "color")}
          title="ألوان وتعبئة النص والشفافية"
        >
          <Palette className="w-3.5 h-3.5 shrink-0" weight={activeTab === "color" ? "bold" : "regular"} />
          <span className="truncate">الألوان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={cn(tabButtonClassName(activeTab === "effects"), "relative")}
          title="الظلال، الحدود، الشارة، والتقويس"
        >
          <Sparkle className="w-3.5 h-3.5 shrink-0" weight={activeTab === "effects" ? "bold" : "regular"} />
          <span className="truncate">المؤثرات</span>
          {(hasBadge || hasStroke || hasShadow || hasCurve) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1.5 left-2" />
          )}
        </button>
      </div>

      {activeTab === "type" && <TextTypeTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
      {activeTab === "color" && <TextColorTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
      {activeTab === "effects" && <TextEffectsTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
    </div>
  );
}
