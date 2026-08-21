import { Sparkles, Columns, Move, Square, Maximize2, Scissors } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { FluentSection, FluentSettingRow, FluentSliderField } from "@/components/ui/blocks";

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageShowEndCutLine,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(useShallow((state) => ({
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageShowEndCutLine: state.collageShowEndCutLine,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    setCollageGap: state.setCollageGap,
    setCollageMargin: state.setCollageMargin,
    setCollageRadius: state.setCollageRadius,
    setCollageShowCutLines: state.setCollageShowCutLines,
    setCollageShowEndCutLine: state.setCollageShowEndCutLine,
    setCollageStrokeWidth: state.setCollageStrokeWidth,
    setCollageStrokeColor: state.setCollageStrokeColor,
  })));

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <FluentSection
        icon={<Columns className="w-3.5 h-3.5" />}
        title="المسافات والاستدارة"
      >
        <div className="flex flex-col gap-2.5">
          <FluentSliderField
            label="المسافات بين الصور"
            icon={<Columns className="w-3.5 h-3.5" />}
            value={collageGap}
            min={0}
            max={60}
            step={2}
            unit="px"
            onChange={setCollageGap}
          />
          <FluentSliderField
            label="الهامش الخارجي"
            icon={<Move className="w-3.5 h-3.5" />}
            value={collageMargin}
            min={0}
            max={100}
            step={2}
            unit="px"
            onChange={setCollageMargin}
          />
          <FluentSliderField
            label="استدارة الزوايا"
            icon={<Square className="w-3.5 h-3.5" />}
            value={collageRadius}
            min={0}
            max={50}
            step={2}
            unit="px"
            onChange={setCollageRadius}
          />
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 2: إطار وحدود الخلايا */}
      <FluentSection
        icon={<Maximize2 className="w-3.5 h-3.5" />}
        title="إطار وحدود الصور"
      >
        <div className="space-y-2.5">
          <FluentSliderField
            label="سُمك الإطار"
            icon={<Maximize2 className="w-3.5 h-3.5" />}
            value={collageStrokeWidth}
            min={0}
            max={15}
            step={1}
            unit="px"
            onChange={setCollageStrokeWidth}
          />

          {/* Frame Color Row — shown only when stroke is active */}
          {collageStrokeWidth > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1">
                {[
                  { hex: "#e10e0e", label: "أحمر" },
                  { hex: "#000000", label: "أسود" },
                  { hex: "#9ca3af", label: "رمادي" },
                  { hex: "#2563eb", label: "أزرق" },
                  { hex: "#ffffff", label: "أبيض" },
                ].map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCollageStrokeColor(hex)}
                    title={label}
                    className={cn(
                      "w-4 h-4 rounded-full border border-black/15 dark:border-white/20 transition-transform cursor-pointer hover:scale-125 shadow-2xs",
                      collageStrokeColor.toLowerCase() === hex.toLowerCase() && "ring-2 ring-primary ring-offset-1 scale-110"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/60 hover:border-primary/45 rounded-md px-2 w-28 h-7.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
                <input
                  type="text"
                  value={collageStrokeColor}
                  onChange={(e) => setCollageStrokeColor(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-[11px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-bold"
                />
                <input
                  type="color"
                  value={collageStrokeColor}
                  onChange={(e) => setCollageStrokeColor(e.target.value)}
                  className="w-3.5 h-3.5 rounded-full border border-border/25 cursor-pointer p-0 bg-transparent shrink-0"
                />
              </div>
            </div>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط وعلامات القص */}
      <FluentSection
        icon={<Scissors className="w-3.5 h-3.5" />}
        title="خطوط القص والمحاذاة"
      >
        <div className="space-y-2">
          <FluentSettingRow
            label="خطوط القص التلقائية"
            description="إظهار خطوط القص بين صور الكولاج"
            control={
              <Switch
                checked={collageShowCutLines}
                onCheckedChange={setCollageShowCutLines}
              />
            }
          />

          {collageShowCutLines && (
            <div className="pt-2 border-t border-border/20 animate-in fade-in-50 duration-150 pr-2">
              <FluentSettingRow
                label={
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30 shrink-0 shadow-xs" />
                    <span>خط نهاية الطباعة (الأزرق)</span>
                  </div>
                }
                description="تحديد نهاية الطباعة على الورقة"
                control={
                  <Switch
                    checked={collageShowEndCutLine}
                    onCheckedChange={setCollageShowEndCutLine}
                    className="scale-90"
                  />
                }
              />
            </div>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 4: ترميم الكولاج بالذكاء الاصطناعي */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular">
        <BatchAiEnhanceButton />
      </div>
    </div>
  );
}

function BatchAiEnhanceButton() {
  const { slots, user, updateSlot } = useEditorStore(useShallow((state) => ({
    slots: state.slots,
    user: state.user,
    updateSlot: state.updateSlot,
  })));
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPro = user?.plan === "pro" || user?.plan === "enterprise";
  
  const handleBatchEnhance = async () => {
    if (!isPro) {
      toast.warning("هذه الميزة متاحة للمشتركين في باقة PRO فقط");
      return;
    }

    const validSlots = slots.filter(s => s.imageSrc);
    if (validSlots.length === 0) {
      toast.info("لا توجد صور في الكولاج لتحسينها");
      return;
    }

    const { SaveImageFromBase64, EnhanceImageWithAI } = await import("../../../../wailsjs/go/main/App");
    const { getUserDailyLimit, getTodayUsageCount, prepareImageForAiUpload } = await import("@/hooks/use-ai-enhance");

    const dailyLimit = getUserDailyLimit();
    const dailyCount = getTodayUsageCount();
    const remainingQuota = Math.max(0, dailyLimit - dailyCount);

    if (remainingQuota < validSlots.length) {
      toast.warning(`رصيدك المتبقي (${remainingQuota}) لا يكفي لتحسين ${validSlots.length} صور دفعة واحدة.`);
      return;
    }

    setIsEnhancing(true);
    setProgress(0);

    let successCount = 0;
    try {
      for (let i = 0; i < validSlots.length; i++) {
        const slot = validSlots[i];
        try {
          useRenderQuality.getState().setEnhancingElementId(slot.id);
          const base64Image = await prepareImageForAiUpload(slot.imageSrc!, 2048, 0.92);

          const token = user?.token || "";
          const resultStr = await EnhanceImageWithAI(base64Image, token, dailyLimit);
          
          if (resultStr && resultStr.startsWith("data:image/")) {
            const localPath = await SaveImageFromBase64(resultStr);
            updateSlot(slot.id, { 
              imageSrc: localPath, 
              originalImageSrc: slot.originalImageSrc || slot.imageSrc 
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to enhance slot ${slot.id}:`, err);
        } finally {
          useRenderQuality.getState().setEnhancingElementId(null);
        }
        setProgress(((i + 1) / validSlots.length) * 100);
      }
    } finally {
      setIsEnhancing(false);
    }

    if (successCount > 0) {
      useEditorStore.getState().pushHistory();
      toast.success(`تم تحسين ${successCount} صورة بنجاح`);
    } else {
      toast.error("فشل تحسين الصور");
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleBatchEnhance}
        disabled={isEnhancing}
        className="w-full flex items-center justify-between px-3.5 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shrink-0" />
          <span>ترميم وتحسين الكولاج بالكامل</span>
        </div>
        {!isPro ? (
          <span className="text-[8.5px] bg-primary text-primary-foreground font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase">
            PRO
          </span>
        ) : (
          <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
            AI Batch
          </span>
        )}
      </button>

      {isEnhancing && (
        <div className="p-2.5 rounded-xl bg-violet-500/[0.05] border border-violet-500/20 space-y-1.5 fluent-specular">
          <div className="flex justify-between items-center text-[9px] font-bold text-violet-600">
            <span className="animate-pulse">جاري التحسين الذكي للصور ...</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-violet-600 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
