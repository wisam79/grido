import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Spinner, HugeIcon } from "@/components/ui/huge-icon";
import {
  SparklesIcon,
  MagicWand01Icon,
  UserSquareIcon,
  PaintBrush01Icon,
  UndoIcon,
  RedoIcon,
  Delete02Icon,
  Copy01Icon,
  TextIcon,
  Shapes01Icon,
  ArrowDown01Icon,
  Heading01Icon,
  Heading02Icon,
  File01Icon,
  Sun01Icon,
  CircleIcon,
  Layers01Icon,
  Shield01Icon,
  Camera01Icon,
  Tag01Icon,
  Calendar01Icon,
  SquareIcon,
  StarIcon,
  MinusSignIcon,
  Link01Icon,
  LinkOffIcon,
  AlignLeftIcon,
  AlignHorizontalCenterIcon,
  AlignRightIcon,
} from "@hugeicons/core-free-icons";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
  const mode = useEditorStore((state) => state.mode);
  const addTextElement = useEditorStore((state) => state.addTextElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addShapeElement = useEditorStore((state) => state.addShapeElement);

  return (
    <div className="fluent-command-group shadow-2xs">
      {/* نص مع قوالب جاهزة */}
      <DropdownMenu>
        <TooltipBtn content={mode === "collage" ? "غير متاح في وضع الكولاج" : "إضافة نص أو قالب خطوط"}>
          <div className={mode === "collage" ? "cursor-not-allowed" : ""}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={mode === "collage"}
                aria-label="إضافة نص"
                className="h-8.5 px-3 text-muted-foreground enabled:hover:text-foreground enabled:hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
              >
                <HugeIcon icon={TextIcon} size={18} />
                <HugeIcon icon={ArrowDown01Icon} size={12} className="opacity-60" />
              </Button>
            </DropdownMenuTrigger>
          </div>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-60 font-cairo max-h-96 overflow-y-auto custom-scrollbar rounded-xl backdrop-blur-xl fluent-specular">
          <div className="px-2.5 py-1 text-xs font-bold text-muted-foreground select-none">قوالب العناوين والفقرات</div>
          <DropdownMenuItem onClick={() => addTextPreset("heading")} className="gap-2.5 text-xs font-bold cursor-pointer rounded-md">
            <HugeIcon icon={Heading01Icon} size={18} className="text-primary" />
            <span>عنوان رئيسي (48px)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("subheading")} className="gap-2.5 text-xs font-semibold cursor-pointer rounded-md">
            <HugeIcon icon={Heading02Icon} size={18} className="text-primary/80" />
            <span>عنوان فرعي (28px)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("body")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={File01Icon} size={18} className="text-muted-foreground" />
            <span>نص وصفي / ملاحظة (18px)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <div className="px-2.5 py-1 text-xs font-bold text-muted-foreground select-none">قوالب استوديو فاخرة</div>
          <DropdownMenuItem onClick={() => addTextPreset("gold-luxury")} className="gap-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer rounded-md">
            <HugeIcon icon={SparklesIcon} size={18} className="text-amber-500" />
            <span>عنوان ذهبي ملكي فاخر</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("neon-glow")} className="gap-2.5 text-xs font-bold text-sky-600 dark:text-sky-400 cursor-pointer rounded-md">
            <HugeIcon icon={Sun01Icon} size={18} className="text-sky-500" />
            <span>توهج نيون مضيء ★</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("stamp-circle")} className="gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer rounded-md">
            <HugeIcon icon={CircleIcon} size={18} className="text-rose-500" />
            <span>ختم دائري رسمي ◯</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("3d-title")} className="gap-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer rounded-md">
            <HugeIcon icon={Layers01Icon} size={18} className="text-indigo-500" />
            <span>عنوان بارز ثلاثي الأبعاد 3D</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("badge")} className="gap-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer rounded-md">
            <HugeIcon icon={Shield01Icon} size={18} className="text-blue-500" />
            <span>شارة هوية رقمية / شريط</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("photographer-tag")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={Camera01Icon} size={18} className="text-purple-500" />
            <span>توقيع وتوثيق المصور 📷</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("caption-card")} className="gap-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer rounded-md">
            <HugeIcon icon={Tag01Icon} size={18} className="text-emerald-500" />
            <span>بطاقة تعريفية مع إطار 🏷️</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addTextPreset("studio-date")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={Calendar01Icon} size={18} className="text-amber-500" />
            <span>توثيق التاريخ واليوم 📅</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* أشكال */}
      <DropdownMenu>
        <TooltipBtn content={mode === "collage" ? "غير متاح في وضع الكولاج" : "إضافة شكل"}>
          <div className={mode === "collage" ? "cursor-not-allowed" : ""}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={mode === "collage"}
                className="h-8.5 px-3 text-muted-foreground enabled:hover:text-foreground enabled:hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
                aria-label="إضافة شكل"
              >
                <HugeIcon icon={Shapes01Icon} size={18} />
                <HugeIcon icon={ArrowDown01Icon} size={12} className="opacity-60" />
              </Button>
            </DropdownMenuTrigger>
          </div>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-40 font-cairo rounded-xl backdrop-blur-xl fluent-specular">
          <DropdownMenuItem onClick={() => addShapeElement("rect")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={SquareIcon} size={16} className="text-primary" />
            <span>مستطيل</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addShapeElement("ellipse")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={CircleIcon} size={16} className="text-indigo-500" />
            <span>دائرة</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addShapeElement("star")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={StarIcon} size={16} className="text-amber-500" />
            <span>نجمة</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addShapeElement("line")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={MinusSignIcon} size={16} className="text-rose-500" />
            <span>خط</span>
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
            <HugeIcon icon={PaintBrush01Icon} size={16} />
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

  const onUpdate = React.useCallback((id: string, patch: any) => {
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
              <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
              <span>{bgProgress > 0 ? `جاري العزل ... (${bgProgress}%)` : "جاري العزل ..."}</span>
            </>
          ) : (
            <>
              <HugeIcon icon={SparklesIcon} size={14} className="text-primary shrink-0" />
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
            <HugeIcon icon={PaintBrush01Icon} size={14} className="text-primary shrink-0" />
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
              <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
              <span>{frameProgress > 0 ? `جاري التأطير ... (${frameProgress}%)` : "جاري التأطير ..."}</span>
            </>
          ) : (
            <>
              <HugeIcon icon={UserSquareIcon} size={14} className="text-primary shrink-0" />
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
          {isEnhancing ? <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} /> : <HugeIcon icon={MagicWand01Icon} size={14} className="text-primary shrink-0" />}
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
          <HugeIcon icon={Copy01Icon} size={18} />
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
            <HugeIcon icon={Link01Icon} size={18} />
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
            <HugeIcon icon={LinkOffIcon} size={18} />
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
            <HugeIcon icon={AlignHorizontalCenterIcon} size={18} />
            <HugeIcon icon={ArrowDown01Icon} size={12} className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 font-cairo rounded-xl backdrop-blur-xl fluent-specular">
          <DropdownMenuItem onClick={() => alignElement("left")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={AlignLeftIcon} size={16} className="text-primary" />
            <span>محاذاة لليسار</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alignElement("center")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={AlignHorizontalCenterIcon} size={16} className="text-indigo-500" />
            <span>توسيط أفقي</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => alignElement("right")} className="gap-2.5 text-xs cursor-pointer rounded-md">
            <HugeIcon icon={AlignRightIcon} size={16} className="text-amber-500" />
            <span>محاذاة لليمين</span>
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
          <HugeIcon icon={Delete02Icon} size={18} />
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
          <HugeIcon icon={UndoIcon} size={18} />
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
          <HugeIcon icon={RedoIcon} size={18} />
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
      {Icon && <HugeIcon icon={Icon} size={16} className="text-primary" />}
      <span className="font-bold">{template.name}</span>
      <span className="text-muted-foreground/60">·</span>
      <span className="font-mono text-muted-foreground/75">{canvasWidth}×{canvasHeight}px</span>
    </div>
  );
});

export { TooltipBtn, ToolbarAddTools, ImageFiltersPopover, ToolbarSelectionTools, ToolbarHistoryTools, TemplateInfo };
