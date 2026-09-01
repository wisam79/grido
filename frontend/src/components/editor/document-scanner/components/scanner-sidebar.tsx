import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Sparkle,
  ArrowsCounterClockwise,
  ArrowClockwise,
  ArrowCounterClockwise,
  IdentificationCard,
  Crop,
  Plus,
  Copy,
  Scan,
  Lightning,
  MagicWand,
  Drop,
  CheckSquareOffset,
  Circle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DetectedDocument, DocumentAspectType, ScannerFilterMode, DetectionMode } from "../core";
import { DocumentListItem } from "./document-list-item";

export interface ScannerSidebarProps {
  detectedDocs: DetectedDocument[];
  activeDocIndex: number;
  selectedDocIds: string[];
  onSelectDoc: (index: number) => void;
  onToggleCheckDoc: (id: string) => void;
  onSelectAllDocs: () => void;
  onAddDocument?: () => void;
  onDeleteDoc?: (id: string) => void;
  onSplitIdCards?: () => void;
  isDetecting: boolean;
  onAutoDetect: (mode?: DetectionMode) => void;
  onReset: () => void;
  filterMode: ScannerFilterMode;
  onFilterChange: (mode: ScannerFilterMode) => void;
  aspectType: DocumentAspectType;
  onAspectChange: (aspect: DocumentAspectType) => void;
  rotation?: number;
  onRotateClockwise?: () => void;
  onRotateCounterClockwise?: () => void;
}

export const ScannerSidebar: React.FC<ScannerSidebarProps> = ({
  detectedDocs,
  activeDocIndex,
  selectedDocIds,
  onSelectDoc,
  onToggleCheckDoc,
  onSelectAllDocs,
  onAddDocument,
  onDeleteDoc,
  onSplitIdCards,
  isDetecting,
  onAutoDetect,
  onReset,
  filterMode,
  onFilterChange,
  aspectType,
  onAspectChange,
  rotation = 0,
  onRotateClockwise,
  onRotateCounterClockwise,
}) => {
  const isAllSelected = detectedDocs.length > 0 && selectedDocIds.length === detectedDocs.length;

  return (
    <div className="w-full md:w-68 flex flex-col gap-3 shrink-0 bg-card/50 dark:bg-card/30 p-3 rounded-xl border border-border/40 overflow-y-auto h-full min-h-0 fluent-specular select-none">
      {/* 0. قائمة المستندات المتعددة والتحكم بها */}
      <div className="space-y-2 bg-emerald-950/20 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 animate-in fade-in-50 duration-200">
        <div className="flex items-center justify-between">
          <Label className="text-[11.5px] font-bold text-emerald-400 flex items-center gap-1.5">
            <FileText size={15} weight="duotone" className="shrink-0" />
            <span>المستندات المكتشفة ({detectedDocs.length})</span>
          </Label>
          <div className="flex items-center gap-1">
            {detectedDocs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                onClick={onSelectAllDocs}
              >
                {isAllSelected ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
            )}
            {onAddDocument && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer flex items-center gap-0.5"
                    onClick={onAddDocument}
                  >
                    <Plus size={12} weight="bold" />
                    <span>إضافة</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">إضافة مستند أو بطاقة إضافية يدوياً</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {detectedDocs.length > 0 && (
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5">
            {detectedDocs.map((doc, idx) => (
              <DocumentListItem
                key={doc.id}
                doc={doc}
                index={idx}
                isActive={activeDocIndex === idx}
                isSelected={selectedDocIds.includes(doc.id)}
                canDelete={detectedDocs.length > 1}
                onSelect={onSelectDoc}
                onToggleCheck={onToggleCheckDoc}
                onDelete={onDeleteDoc}
              />
            ))}
          </div>
        )}
      </div>

      {/* 1. كشف الأركان والمسح المتعدد */}
      <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
        <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
          <Sparkle size={15} weight="duotone" className="text-primary shrink-0" />
          <span>كشف الأركان الذكي</span>
        </Label>
        
        {/* أزرار الكشف المتعدد والمفرد */}
        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-md font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-primary hover:bg-primary/90"
                onClick={() => onAutoDetect("multi")}
                disabled={isDetecting}
              >
                {isDetecting ? (
                  <ArrowClockwise size={14} weight="bold" className="shrink-0 animate-spin" />
                ) : (
                  <Scan size={15} weight="bold" className="shrink-0" />
                )}
                <span>{isDetecting ? "جاري الكشف ..." : "كشف متعدد"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">كشف كافة المستندات والبطاقات الموجودة بالصورة تلقائياً</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/60 hover:bg-accent text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={() => onAutoDetect("single")}
                disabled={isDetecting}
              >
                <Sparkle size={14} weight="bold" className="text-primary shrink-0" />
                <span>كشف مفرد</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">التركيز على المستند الرئيسي الأكبر في الصورة</TooltipContent>
          </Tooltip>
        </div>

        {/* أدوات التقسيم وإعادة الضبط السريع */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {onSplitIdCards && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  onClick={onSplitIdCards}
                  disabled={isDetecting}
                >
                  <Copy size={14} weight="bold" className="shrink-0" />
                  <span>تقسيم لبطاقتين</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">تقسيم الصورة إلى وجهين (أمامي وخلفي) لبطاقة الهوية</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/60 hover:bg-accent text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={onReset}
                disabled={isDetecting}
              >
                <ArrowsCounterClockwise size={14} weight="bold" className="text-muted-foreground shrink-0" />
                <span>إعادة ضبط</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">إعادة توزيع الأركان على كامل الصورة</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. تدوير المستند */}
      {(onRotateClockwise || onRotateCounterClockwise) && (
        <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
          <div className="flex items-center justify-between">
            <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
              <ArrowClockwise size={15} weight="duotone" className="text-primary shrink-0" />
              <span>تدوير المستند</span>
            </Label>
            {(((rotation % 360) + 360) % 360) !== 0 && (
              <span className="text-[10px] font-mono text-primary font-bold px-1.5 py-0.5 rounded bg-primary/10">
                {((rotation % 360) + 360) % 360}°
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRotateCounterClockwise}
                  className="h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-border/60"
                >
                  <ArrowCounterClockwise size={14} weight="bold" className="shrink-0 text-muted-foreground" />
                  <span>يساراً 90°</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">تدوير المستند 90 درجة عكس عقارب الساعة</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRotateClockwise}
                  className="h-8 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-border/60"
                >
                  <ArrowClockwise size={14} weight="bold" className="shrink-0 text-muted-foreground" />
                  <span>يميناً 90°</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">تدوير المستند 90 درجة مع عقارب الساعة</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* 3. معالجة وتصفية الورقة */}
      <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
        <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
          <MagicWand size={15} weight="duotone" className="text-primary shrink-0" />
          <span>معالجة وتصفية الورقة</span>
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "original" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "original"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("original")}
              >
                <FileText size={14} weight={filterMode === "original" ? "fill" : "regular"} className="shrink-0" />
                <span>أصلي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">الاحتفاظ بألوان وإضاءة الصورة الأصلية</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "magic" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-bold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "magic"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("magic")}
              >
                <Sparkle size={14} weight={filterMode === "magic" ? "fill" : "duotone"} className="shrink-0 text-amber-400" />
                <span>تلقائي ذكي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تبييض الورقة وإزالة الظلال وتحسين وضوح النص والألوان</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "grayscale" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "grayscale"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("grayscale")}
              >
                <Circle size={14} weight={filterMode === "grayscale" ? "fill" : "regular"} className="shrink-0 text-muted-foreground" />
                <span>تدرج رمادي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تدرج رمادي ناعم بدقة 8-bit لطباعة الليزر بدون تقطيع</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "bw" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "bw"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("bw")}
              >
                <CheckSquareOffset size={14} weight={filterMode === "bw" ? "fill" : "regular"} className="shrink-0" />
                <span>أبيض وأسود</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">عزل ثنائي عالي التباين للنصوص والمستندات الرسمية</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "sharpen" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "sharpen"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("sharpen")}
              >
                <Lightning size={14} weight={filterMode === "sharpen" ? "fill" : "duotone"} className="shrink-0 text-cyan-500" />
                <span>شحذ النصوص</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">شحذ فائق للحروف العربية الدقيقة والأختام والباركود</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "deyellow" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-md text-[11px] font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/40",
                  filterMode === "deyellow"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80"
                )}
                onClick={() => onFilterChange("deyellow")}
              >
                <Drop size={14} weight={filterMode === "deyellow" ? "fill" : "duotone"} className="shrink-0 text-orange-500" />
                <span>إزالة الاصفرار</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">إزالة التقادم واصفرار الورق القديم والكتب التاريخية</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 4. قياس ونسبة المستند */}
      <div className="space-y-2 bg-background/40 dark:bg-background/20 p-2.5 rounded-xl border border-border/30">
        <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
          <Crop size={15} weight="duotone" className="text-primary shrink-0" />
          <span>قياس ونسبة المستند</span>
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={aspectType === "free" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-md text-[11px] font-bold cursor-pointer transition-all border-border/40",
              aspectType === "free"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80"
            )}
            onClick={() => onAspectChange("free")}
          >
            حر
          </Button>

          <Button
            variant={aspectType === "a4_p" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-md text-[11px] font-semibold cursor-pointer transition-all border-border/40",
              aspectType === "a4_p"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80"
            )}
            onClick={() => onAspectChange("a4_p")}
          >
            A4 طولي
          </Button>

          <Button
            variant={aspectType === "a4_l" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-md text-[11px] font-semibold cursor-pointer transition-all border-border/40",
              aspectType === "a4_l"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80"
            )}
            onClick={() => onAspectChange("a4_l")}
          >
            A4 عرضي
          </Button>

          <Button
            variant={aspectType === "id_card" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-md text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all border-border/40",
              aspectType === "id_card"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80"
            )}
            onClick={() => onAspectChange("id_card")}
          >
            <IdentificationCard size={14} weight={aspectType === "id_card" ? "fill" : "regular"} className="shrink-0" />
            <span>بطاقة هوية</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
