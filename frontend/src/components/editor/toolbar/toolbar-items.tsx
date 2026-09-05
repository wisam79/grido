import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/huge-icon";
import {
  TextT,
  CaretDown,
  TextHOne,
  TextHTwo,
  FileText,
  Sparkle,
  Circle,
  Square,
  Star,
  LineSegment,
  FadersHorizontal,
  PaintBrush,
  UserSquare,
  MagicWand,
  Copy,
  Link,
  LinkBreak,
  Trash,
  ArrowUUpLeft,
  ArrowUUpRight,
} from "@phosphor-icons/react";
import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
} from "@/components/ui/alignment-icons";
import { GeometricShapesIcon } from "@/components/ui/image-icons";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { IMAGE_FILTERS } from "@/lib/templates";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";

const RefineBgDialog = React.lazy(() => import("../dialogs/refine-bg-dialog").then((m) => ({ default: m.RefineBgDialog })));

interface TooltipBtnProps {
  content: string;
  children: React.ReactElement;
}

function TooltipBtn({ content, children }: TooltipBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

const ToolbarAddTools = React.memo(function ToolbarAddTools() {
  const addTextElement = useEditorStore((state) => state.addTextElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addShapeElement = useEditorStore((state) => state.addShapeElement);

  return (
    <div className="fluent-command-group shadow-2xs">
      {/* نص مع قوالب جاهزة */}
      <DropdownMenu>
        <TooltipBtn content="إضافة نص أو قالب خطوط">
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              aria-label="إضافة نص"
              className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
            >
              <TextT className="w-5 h-5" />
              <CaretDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-56 font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
          <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
            قوالب النصوص
          </div>

          <DropdownMenuItem
            onClick={() => addTextPreset("heading")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TextHOne className="w-4.5 h-4.5" weight="bold" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-bold text-foreground truncate">عنوان رئيسي</span>
                <span className="text-[10px] text-muted-foreground/80 truncate">نص عريض بارز</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              48px
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => addTextPreset("subheading")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary/80 flex items-center justify-center shrink-0">
                <TextHTwo className="w-4.5 h-4.5" weight="bold" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-semibold text-foreground truncate">عنوان فرعي</span>
                <span className="text-[10px] text-muted-foreground/80 truncate">نص متوسط</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              28px
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => addTextPreset("body")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-normal text-foreground truncate">نص عادي</span>
                <span className="text-[10px] text-muted-foreground/80 truncate">فقرة تفاصيل</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              18px
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* أشكال */}
      <DropdownMenu>
        <TooltipBtn content="إضافة شكل">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
              aria-label="إضافة شكل"
            >
              <GeometricShapesIcon className="w-5 h-5" />
              <CaretDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-44 font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
          <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
            الأشكال
          </div>
          <DropdownMenuItem
            onClick={() => addShapeElement("rect")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Square className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-foreground">مستطيل</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("ellipse")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-indigo-500/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
              <Circle className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-foreground">دائرة</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("star")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-amber-500/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-foreground">نجمة</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("line")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-rose-500/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <LineSegment className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-foreground">خط</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

const ImageFiltersPopover = React.memo(function ImageFiltersPopover() {
  const { imageSrc, filter, mode, selectedId } = useEditorStore(useShallow((state) => {
    const selectedEl = state.elements.find((e) => e.id === state.selectedId);
    if (selectedEl?.type === "image") {
      return { imageSrc: selectedEl.imageSrc, filter: selectedEl.filter, mode: state.mode, selectedId: state.selectedId };
    }
    const selectedSlot = state.slots?.find((s) => s.id === state.selectedId);
    if (state.mode === "collage" && selectedSlot) {
      return { imageSrc: selectedSlot.imageSrc, filter: selectedSlot.filter, mode: state.mode, selectedId: state.selectedId };
    }
    return { imageSrc: undefined, filter: undefined, mode: state.mode, selectedId: state.selectedId };
  }));

  const updateElement = useEditorStore((state) => state.updateElement);
  const updateSlot = useEditorStore((state) => state.updateSlot);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  if (!selectedId) return null;

  return (
    <Popover>
      <TooltipBtn content="المرشحات الجاهزة (الفلاتر)">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="المرشحات الجاهزة"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <FadersHorizontal className="w-4.5 h-4.5" />
          </Button>
        </PopoverTrigger>
      </TooltipBtn>
      <PopoverContent align="start" className="w-80 p-3 font-cairo bg-card/95 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-xl shadow-xl fluent-specular z-50">
        <div className="text-xs font-bold mb-2 text-foreground/80 text-right" dir="rtl">
          المرشحات الجاهزة
        </div>
        <div className="grid grid-cols-4 gap-1.5" dir="rtl">
          {IMAGE_FILTERS.map((f) => {
            const isActive = filter === f.id;

            return (
              <button
                key={f.id}
                onClick={() => {
                  if (mode !== "collage") {
                    updateElement(selectedId, { filter: f.id });
                  } else {
                    updateSlot(selectedId, { filter: f.id });
                  }
                  pushHistory();
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer",
                  isActive
                    ? "border-primary bg-primary/10 text-primary shadow-xs shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                    : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
                )}
              >
                <div className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-slate-100 relative">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" style={{ filter: f.css }} />
                  )}
                </div>
                <span className="text-[9px] tracking-tight leading-tight truncate max-w-full text-center mt-0.5">{f.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

const AiToolsToolbarGroup = React.memo(function AiToolsToolbarGroup() {
  const { selectedItem } = useEditorStore(useShallow((state) => {
    const el = state.elements.find((e) => e.id === state.selectedId);
    const slot = state.slots?.find((s) => s.id === state.selectedId);
    const target = state.mode === "collage" ? slot : (el?.type === "image" ? el : null);
    return { selectedItem: target };
  }));

  const onUpdate = React.useCallback((id: string, patch: Partial<Record<string, unknown>>) => {
    const store = useEditorStore.getState();
    if (store.mode === "collage") {
      store.updateSlot(id, patch);
    } else {
      store.updateElement(id, patch);
    }
  }, []);

  const { isRemovingBg, bgProgress, bgProgressText, handleCancelBgRemoval, handleRemoveBg } = useBgRemoval(onUpdate);
  const { isEnhancing, enhanceProgress, enhanceProgressText, handleEnhance } = useAiEnhance(onUpdate);
  const { isFraming, frameProgress, frameProgressText, handleCancelFrame, handleFrameFace } = useFaceFrame(onUpdate);

  const [refineOpen, setRefineOpen] = React.useState(false);

  if (!selectedItem || !selectedItem.imageSrc) return null;

  return (
    <div className="flex items-center gap-1 font-cairo">
      {/* عزل الخلفية بالذكاء الاصطناعي - Fluent Wait UX */}
      <TooltipBtn content={isRemovingBg ? bgProgressText || "إلغاء عزل الخلفية" : "عزل الخلفية بالذكاء الاصطناعي"}>
        <Button
          variant={isRemovingBg ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/60 dark:border-primary/60 bg-primary/5 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-all cursor-pointer shadow-2xs",
            isRemovingBg && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(selectedItem)}
        >
          {isRemovingBg ? (
            <>
              <Spinner className="w-4 h-4 shrink-0" size={16} />
              <span>{bgProgress > 0 ? `جاري العزل ... (${bgProgress}%)` : "جاري العزل ..."}</span>
            </>
          ) : (
            <>
              <Sparkle className="w-4.5 h-4.5 text-primary shrink-0" weight="duotone" />
              <span>عزل الخلفية</span>
            </>
          )}
        </Button>
      </TooltipBtn>

      {/* تعديل تفاصيل العزل يدويًا إذا كانت خلفيته معزولة */}
      {selectedItem.originalImageSrc && (
        <TooltipBtn content="تعديل تفاصيل العزل يدوياً">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 gap-1 text-xs font-semibold border border-primary/60 dark:border-primary/60 bg-transparent hover:bg-primary/10 hover:border-primary text-foreground rounded-md cursor-pointer shadow-2xs"
            onClick={() => setRefineOpen(true)}
          >
            <PaintBrush className="w-4.5 h-4.5 text-primary shrink-0" weight="duotone" />
            <span>تعديل العزل</span>
          </Button>
        </TooltipBtn>
      )}

      {/* ضبط وتأطير الوجه تلقائياً */}
      <TooltipBtn content={isFraming ? frameProgressText || "إلغاء التأطير" : "كشف وتأطير الوجه تلقائياً وفق معايير الهوية"}>
        <Button
          variant={isFraming ? "destructive" : "outline"}
          size="sm"
          disabled={isEnhancing || isRemovingBg}
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/60 dark:border-primary/60 bg-primary/5 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-all cursor-pointer shadow-2xs",
            (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed",
            isFraming && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedItem)}
        >
          {isFraming ? (
            <>
              <Spinner className="w-4 h-4 shrink-0" size={16} />
              <span>{frameProgress > 0 ? `جاري التأطير ... (${frameProgress}%)` : "جاري التأطير ..."}</span>
            </>
          ) : (
            <>
              <UserSquare className="w-4.5 h-4.5 text-primary shrink-0" weight="duotone" />
              <span>تأطير الوجه</span>
            </>
          )}
        </Button>
      </TooltipBtn>

      {/* تحسين الجودة وترميم الوجه */}
      <TooltipBtn content="ترميم الوجه ورفع دقة الصورة بالذكاء الاصطناعي">
        <Button
          variant="outline"
          size="sm"
          disabled={isEnhancing || isRemovingBg || isFraming}
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/60 dark:border-primary/60 bg-primary/5 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-all cursor-pointer shadow-2xs",
            (isEnhancing || isRemovingBg || isFraming) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleEnhance(selectedItem)}
        >
          {isEnhancing ? <Spinner className="w-4 h-4 text-primary shrink-0" size={16} /> : <MagicWand className="w-4.5 h-4.5 text-primary shrink-0" weight="duotone" />}
          <span>{isEnhancing ? (enhanceProgress > 0 ? `جاري الترميم ... (${enhanceProgress}%)` : "جاري الترميم ...") : "ترميم الوجه"}</span>
        </Button>
      </TooltipBtn>

      {selectedItem.originalImageSrc && refineOpen && (
        <React.Suspense fallback={null}>
          <RefineBgDialog
            open={refineOpen}
            onOpenChange={setRefineOpen}
            element={selectedItem}
            onSave={async (newImageSrc) => {
              onUpdate(selectedItem.id, { imageSrc: newImageSrc });
              useEditorStore.getState().pushHistory();
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
});

const ToolbarSelectionTools = React.memo(function ToolbarSelectionTools() {
  const {
    hasSelection,
    isImageSelected,
    canGroup,
    canUngroup
  } = useEditorStore(useShallow((state) => {
    const hasSel = !!state.selectedId;
    const selectedEl = state.elements.find((e) => e.id === state.selectedId);
    const selectedSlot = state.slots?.find((s) => s.id === state.selectedId);
    const isImg = (selectedEl && selectedEl.type === "image") ||
                  (state.mode === "collage" && selectedSlot && !!selectedSlot.imageSrc);

    const idsCount = state.selectedIds.length;
    const hasGroup = state.elements.some((el) => state.selectedIds.includes(el.id) && el.groupId);

    return {
      hasSelection: hasSel,
      isImageSelected: !!isImg,
      canGroup: idsCount >= 2,
      canUngroup: hasGroup
    };
  }));
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const duplicateElements = useEditorStore((state) => state.duplicateElements);
  const groupSelectedElements = useEditorStore((state) => state.groupSelectedElements);
  const ungroupSelectedElements = useEditorStore((state) => state.ungroupSelectedElements);
  const removeElement = useEditorStore((state) => state.removeElement);
  const removeElements = useEditorStore((state) => state.removeElements);

  const alignElement = useCallback((type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const { selectedId, selectedIds, elements, updateElement, updateElements, pushHistory } = useEditorStore.getState();
    if (!selectedId) return;

    const targetIds = selectedIds.length > 1 ? selectedIds : [selectedId];
    const targets = elements.filter((e) => targetIds.includes(e.id));
    if (targets.length === 0) return;

    if (targets.length === 1) {
      const el = targets[0];
      let patch = {};
      if (type === "left") patch = { x: 0 };
      else if (type === "center") patch = { x: 0.5 - el.width / 2 };
      else if (type === "right") patch = { x: 1 - el.width };
      else if (type === "top") patch = { y: 0 };
      else if (type === "middle") patch = { y: 0.5 - el.height / 2 };
      else if (type === "bottom") patch = { y: 1 - el.height };
      updateElement(selectedId, patch);
    } else {
      // تعدد التحديد: محاذاة نسبة لحدود التحديد كلها لتظل المجموعة متماسكة
      const minX = Math.min(...targets.map((e) => e.x));
      const minY = Math.min(...targets.map((e) => e.y));
      const maxX = Math.max(...targets.map((e) => e.x + e.width));
      const maxY = Math.max(...targets.map((e) => e.y + e.height));
      const width = maxX - minX;
      const height = maxY - minY;

      const patches = targets.map((el) => {
        let patch = {};
        if (type === "left") patch = { x: minX };
        else if (type === "center") patch = { x: minX + (width - el.width) / 2 };
        else if (type === "right") patch = { x: minX + width - el.width };
        else if (type === "top") patch = { y: minY };
        else if (type === "middle") patch = { y: minY + (height - el.height) / 2 };
        else if (type === "bottom") patch = { y: minY + height - el.height };
        return { id: el.id, patch };
      });
      updateElements(patches);
    }

    pushHistory();
  }, []);

  if (!hasSelection) return null;

  return (
    <div className="fluent-command-group shadow-2xs animate-in fade-in zoom-in-95 duration-150">
      <TooltipBtn content="تكرار العناصر المحددة">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const { selectedIds } = useEditorStore.getState();
            if (selectedIds.length > 0) {
              if (selectedIds.length === 1) {
                duplicateElement(selectedIds[0]);
              } else {
                duplicateElements(selectedIds);
              }
            }
          }}
          aria-label="تكرار"
          className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <Copy className="w-5 h-5" />
        </Button>
      </TooltipBtn>

      {isImageSelected && (
        <>
          <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />
          <AiToolsToolbarGroup />
          <ImageFiltersPopover />
        </>
      )}

      {canGroup && (
        <TooltipBtn content="تجميع العناصر المحددة (Group)">
          <Button
            variant="ghost"
            size="sm"
            onClick={groupSelectedElements}
            aria-label="تجميع"
            className="h-8.5 px-3 text-primary hover:text-primary hover:bg-primary/5 rounded-md transition-all cursor-pointer"
          >
            <Link className="w-5 h-5" />
          </Button>
        </TooltipBtn>
      )}

      {canUngroup && (
        <TooltipBtn content="فك تجميع العناصر (Ungroup)">
          <Button
            variant="ghost"
            size="sm"
            onClick={ungroupSelectedElements}
            aria-label="فك التجميع"
            className="h-8.5 px-3 text-warning hover:text-warning hover:bg-warning/5 rounded-md transition-all cursor-pointer"
          >
            <LinkBreak className="w-5 h-5" />
          </Button>
        </TooltipBtn>
      )}
      
      <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

      {/* محاذاة */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1" 
            aria-label="محاذاة"
          >
            <AlignCenterHorizontalIcon className="w-5 h-5" />
            <CaretDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 font-cairo rounded-xl backdrop-blur-xl fluent-specular p-1 space-y-0.5">
          <DropdownMenuItem onClick={() => alignElement("left")} className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground">
            <AlignLeftIcon className="w-4.5 h-4.5 text-primary" />
            <span className="font-semibold">محاذاة لليسار</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alignElement("center")} className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground">
            <AlignCenterHorizontalIcon className="w-4.5 h-4.5 text-primary" />
            <span className="font-semibold">توسيط أفقي</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alignElement("right")} className="gap-2.5 text-xs cursor-pointer rounded-lg p-2 text-foreground/90 hover:text-foreground">
            <AlignRightIcon className="w-4.5 h-4.5 text-primary" />
            <span className="font-semibold">محاذاة لليمين</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

      {/* حذف */}
      <TooltipBtn content="حذف (Delete)">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const { selectedIds } = useEditorStore.getState();
            if (selectedIds.length > 0) {
              if (selectedIds.length === 1) {
                removeElement(selectedIds[0]);
              } else {
                removeElements(selectedIds);
              }
            }
          }}
          aria-label="حذف"
          className="h-8.5 px-3 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
        >
          <Trash className="w-5 h-5" />
        </Button>
      </TooltipBtn>
    </div>
  );
});

const ToolbarHistoryTools = React.memo(function ToolbarHistoryTools() {
  const canUndo = useEditorStore((state) => state.historyIndex > 0);
  const canRedo = useEditorStore((state) => state.historyIndex < state.history.length - 1);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="fluent-command-group shadow-2xs">
      <TooltipBtn content="تراجع (Ctrl+Z)">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          aria-label="تراجع"
          className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpLeft className="w-5 h-5" />
        </Button>
      </TooltipBtn>
      <TooltipBtn content="إعادة (Ctrl+Y)">
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          aria-label="إعادة"
          className="h-8.5 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpRight className="w-5 h-5" />
        </Button>
      </TooltipBtn>
    </div>
  );
});

const TemplateInfo = React.memo(function TemplateInfo() {
  const { template, canvasWidth, canvasHeight } = useEditorStore(useShallow((state) => ({
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
  })));

  if (!template) return null;

  const Icon = template.icon;

  return (
    <div className="text-[11px] text-muted-foreground bg-muted/20 dark:bg-muted/10 border border-border/20 rounded-md px-2.5 py-1.5 hidden lg:flex items-center gap-2 font-medium fluent-specular">
      {Icon && typeof Icon === "function" && (
        <Icon size={16} className="text-primary" />
      )}
      <span className="font-bold">{template.name}</span>
      <span className="text-muted-foreground/60">·</span>
      <span className="font-mono text-muted-foreground/75">{canvasWidth}×{canvasHeight}px</span>
    </div>
  );
});

export { TooltipBtn, ToolbarAddTools, ImageFiltersPopover, ToolbarSelectionTools, ToolbarHistoryTools, TemplateInfo };
