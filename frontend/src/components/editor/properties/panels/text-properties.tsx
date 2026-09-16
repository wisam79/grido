import { useState } from "react";
import { TextAa, Palette, Sparkle } from "@phosphor-icons/react";
import { FluentSegmentedControl } from "@/components/ui/blocks";

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
 * تبويب التأثيرات للنصوص (TextEffectsProperties):
 * الظلال والقوالب المجسمة، التقويس، وتنسيق أبعاد الشارة
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

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-200 w-full min-w-0">
      <FluentSegmentedControl<TextSubTab>
        layoutId="text-subtabs-pill"
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        options={[
          {
            id: "type",
            label: "الخط",
            icon: <TextAa className="w-3.5 h-3.5 shrink-0" weight={activeTab === "type" ? "bold" : "regular"} />,
            tooltip: "الخط والنمط والقياسات",
          },
          {
            id: "color",
            label: "الألوان",
            icon: <Palette className="w-3.5 h-3.5 shrink-0" weight={activeTab === "color" ? "bold" : "regular"} />,
            tooltip: "ألوان وتعبئة النص والشفافية",
          },
          {
            id: "effects",
            label: "التأثيرات",
            icon: <Sparkle className="w-3.5 h-3.5 shrink-0" weight={activeTab === "effects" ? "bold" : "regular"} />,
            tooltip: "الظلال، الحدود، الشارة، والتقويس",
            badge: (hasBadge || hasStroke || hasShadow || hasCurve) ? (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            ) : undefined,
          },
        ]}
      />

      {activeTab === "type" && <TextTypeTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
      {activeTab === "color" && <TextColorTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
      {activeTab === "effects" && <TextEffectsTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />}
    </div>
  );
}
