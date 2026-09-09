import React from "react";
import { Sparkle, UserFocus, MagicWand } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/huge-icon";

/**
 * QuickBarAiActions — الثلاثي الموحد لأدوات الذكاء الاصطناعي (عزل → ضبط → ترميم)
 * 🧭 كان مكرراً حرفياً بين قسم الخلية وقسم العنصر الحر في canvas-quick-bar.
 * الترتيب موحّد مع شريط الأدوات: عزل → ضبط → ترميم.
 */
interface QuickBarAiActionsProps {
  isRemovingBg: boolean;
  bgProgress: number;
  isFraming: boolean;
  isEnhancing: boolean;
  remainingQuota: number;
  dailyLimit: number;
  licenseActive: boolean;
  onRemoveBg: () => void;
  onFrameFace: () => void;
  onCancelFrame: () => void;
  onEnhance: () => void;
  removeBgTooltip: string;
}

export const QuickBarAiActions = React.memo(function QuickBarAiActions({
  isRemovingBg,
  bgProgress,
  isFraming,
  isEnhancing,
  remainingQuota,
  dailyLimit,
  licenseActive,
  onRemoveBg,
  onFrameFace,
  onCancelFrame,
  onEnhance,
  removeBgTooltip,
}: QuickBarAiActionsProps) {
  return (
    <>
      {/* عزل الخلفية */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isRemovingBg}
            onClick={onRemoveBg}
            className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
          >
            {isRemovingBg ? <Spinner className="w-4.5 h-4.5" size={14} /> : <Sparkle className="w-4.5 h-4.5" weight="duotone" />}
            <span>{isRemovingBg ? (bgProgress > 0 ? `جاري العزل ... (${Math.round(bgProgress)}%)` : "جاري العزل ...") : "عزل الخلفية"}</span>
            {!licenseActive ? (
              <span className="text-[7.5px] bg-primary text-primary-foreground font-black px-1 py-0.5 rounded-sm tracking-wider uppercase">
                PRO
              </span>
            ) : (
              <span className="text-[8px] bg-primary/20 border border-primary/40 text-primary px-1 py-0.5 rounded-sm font-bold font-mono">
                AI
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{removeBgTooltip}</TooltipContent>
      </Tooltip>

      {/* ضبط الوجه تلقائياً وفق مقاييس الهوية */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isFraming}
            onClick={isFraming ? onCancelFrame : onFrameFace}
            className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
          >
            {isFraming ? <Spinner className="w-4.5 h-4.5" size={14} /> : <UserFocus className="w-4.5 h-4.5" weight="duotone" />}
            <span>{isFraming ? "جاري الضبط ..." : "ضبط الوجه"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">كشف الوجه وضبط مقاسه وموضعه تلقائياً وفق معايير الهوية</TooltipContent>
      </Tooltip>

      {/* ترميم الوجه بالذكاء الاصطناعي */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isEnhancing}
            onClick={onEnhance}
            className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
          >
            {isEnhancing ? <Spinner className="w-4.5 h-4.5" size={14} /> : <MagicWand className="w-4.5 h-4.5" weight="duotone" />}
            <span>{isEnhancing ? "جاري الترميم ..." : `ترميم الوجه (${remainingQuota}/${dailyLimit})`}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">تحسين الدقة وترميم ملامح الوجه بالذكاء الاصطناعي</TooltipContent>
      </Tooltip>
    </>
  );
});
