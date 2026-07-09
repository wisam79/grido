import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Type,
  Square,
  Circle,
  Star,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  Printer,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Grid3x3,
  Magnet,
  Columns,
  Link,
  Unlink,
  Ruler,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ToolbarFileOps } from "./toolbar-file-ops";
import { VECTOR_SHAPES } from "@/lib/svg-paths";

import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

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
      <TooltipContent 
        side="bottom" 
        className="font-cairo text-[11px] py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const {
    mode,
    elements,
    updateElement,
    pushHistory,
    addTextElement,
    addShapeElement,
    selectedId,
    selectedIds,
    groupSelectedElements,
    ungroupSelectedElements,
    removeElement,
    removeElements,
    duplicateElement,
    duplicateElements,
    bringToFront,
    sendToBack,
    undo,
    redo,
    history,
    historyIndex,
    template,
    canvasWidth,
    canvasHeight,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showColumns,
    setShowColumns,
    showRuler,
    setShowRuler,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    addTextElement: state.addTextElement,
    addShapeElement: state.addShapeElement,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    groupSelectedElements: state.groupSelectedElements,
    ungroupSelectedElements: state.ungroupSelectedElements,
    removeElement: state.removeElement,
    removeElements: state.removeElements,
    duplicateElement: state.duplicateElement,
    duplicateElements: state.duplicateElements,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    undo: state.undo,
    redo: state.redo,
    history: state.history,
    historyIndex: state.historyIndex,
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    showGrid: state.showGrid,
    setShowGrid: state.setShowGrid,
    snapToGrid: state.snapToGrid,
    setSnapToGrid: state.setSnapToGrid,
    showColumns: state.showColumns,
    setShowColumns: state.setShowColumns,
    showRuler: state.showRuler,
    setShowRuler: state.setShowRuler,
  })));

  const alignElement = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    
    let patch = {};
    if (type === "left") patch = { x: 0 };
    else if (type === "center") patch = { x: 0.5 - el.width / 2 };
    else if (type === "right") patch = { x: 1 - el.width };
    else if (type === "top") patch = { y: 0 };
    else if (type === "middle") patch = { y: 0.5 - el.height / 2 };
    else if (type === "bottom") patch = { y: 1 - el.height };
    
    updateElement(selectedId, patch);
    pushHistory();
    toast.success("تمت محاذاة العنصر");
  };

  const hasSelection = !!selectedId;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex items-center gap-2 p-1 px-3 border-b bg-card/65 backdrop-blur-md flex-nowrap overflow-x-auto select-none no-print h-12.5 shrink-0 scrollbar-none shadow-xs">
        
        {/* المجموعة 1: إدارة الملفات والمستندات */}
        <ToolbarFileOps />


        {/* المجموعة 3: إضافة عناصر */}
        <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
          {/* نص */}
          <TooltipBtn content={mode === "collage" ? "غير متاح في وضع الكولاج" : "إضافة نص جديد"}>
            <div className={mode === "collage" ? "cursor-not-allowed" : ""}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => addTextElement()} 
                disabled={mode === "collage"}
                aria-label="إضافة نص"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-40"
              >
                <Type className="w-3.5 h-3.5" />
              </Button>
            </div>
          </TooltipBtn>

          {/* أشكال */}
          <DropdownMenu>
            <TooltipBtn content={mode === "collage" ? "غير متاح في وضع الكولاج" : "إضافة شكل"}>
              <div className={mode === "collage" ? "cursor-not-allowed" : ""}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={mode === "collage"}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5 disabled:pointer-events-none disabled:opacity-40" 
                    aria-label="إضافة شكل"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
            </TooltipBtn>
            <DropdownMenuContent align="start" className="w-40 font-cairo">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground select-none">أشكال أساسية</div>
              <DropdownMenuItem onClick={() => addShapeElement("rect")} className="gap-2 text-[11px] cursor-pointer">
                <Square className="w-4 h-4 text-muted-foreground" />
                <span>مستطيل</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("ellipse")} className="gap-2 text-[11px] cursor-pointer">
                <Circle className="w-4 h-4 text-muted-foreground" />
                <span>دائرة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("star")} className="gap-2 text-[11px] cursor-pointer">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span>نجمة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("line")} className="gap-2 text-[11px] cursor-pointer">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span>خط مستقيم</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground select-none">رموز وأشكال متجهة</div>
              
              {VECTOR_SHAPES.map((shape) => (
                <DropdownMenuItem
                  key={shape.id}
                  onClick={() => addShapeElement("path", shape.path)}
                  className="gap-2 text-[11px] cursor-pointer"
                >
                  <span className="text-xs shrink-0 select-none">{shape.emoji}</span>
                  <span>{shape.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* المجموعة 4: تعديل وترتيب ومحاذاة العنصر المحدد */}
        {hasSelection && (
          <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs animate-in fade-in zoom-in-95 duration-200">
            <TooltipBtn content="ترتيب: إحضار للأمام">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && bringToFront(selectedId)}
                aria-label="إحضار للأمام"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
            <TooltipBtn content="ترتيب: إرسال للخلف">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && sendToBack(selectedId)}
                aria-label="إرسال للخلف"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
             <TooltipBtn content="تكرار العناصر المحددة">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   if (selectedIds.length > 0) {
                     if (selectedIds.length === 1) {
                       duplicateElement(selectedIds[0]);
                     } else {
                       duplicateElements(selectedIds);
                     }
                   }
                 }}
                 aria-label="تكرار"
                 className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
               >
                 <Copy className="w-3.5 h-3.5" />
               </Button>
             </TooltipBtn>

            {selectedIds.length >= 2 && (
              <TooltipBtn content="تجميع العناصر المحددة (Group)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={groupSelectedElements}
                  aria-label="تجميع"
                  className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/5 rounded-md transition-all cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>
            )}

            {elements.some((el) => selectedIds.includes(el.id) && el.groupId) && (
              <TooltipBtn content="فك تجميع العناصر (Ungroup)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ungroupSelectedElements}
                  aria-label="فك التجميع"
                  className="h-7 px-2 text-warning hover:text-warning hover:bg-warning/5 rounded-md transition-all cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
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
                  className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5" 
                  aria-label="محاذاة العنصر المحدد"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 font-cairo">
                <DropdownMenuItem onClick={() => alignElement("left")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                  <span>محاذاة ليسار الكانفس</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("center")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignCenter className="w-4 h-4 text-muted-foreground" />
                  <span>توسيط أفقي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("right")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignRight className="w-4 h-4 text-muted-foreground" />
                  <span>محاذاة ليمين الكانفس</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => alignElement("top")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignLeft className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>محاذاة لأعلى الكانفس</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("middle")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignCenter className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>توسيط عمودي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("bottom")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignRight className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>محاذاة لأسفل الكانفس</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

            {/* حذف */}
             <TooltipBtn content="حذف العناصر المحددة">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   if (selectedIds.length > 0) {
                     if (selectedIds.length === 1) {
                       removeElement(selectedIds[0]);
                     } else {
                       removeElements(selectedIds);
                     }
                     toast.success(selectedIds.length > 1 ? "تم حذف العناصر" : "تم حذف العنصر");
                   }
                 }}
                 aria-label="حذف"
                 className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
               >
                 <Trash2 className="w-3.5 h-3.5" />
               </Button>
             </TooltipBtn>
          </div>
        )}

        {/* المجموعة 5: التراجع والإعادة */}
        <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
          <TooltipBtn content="تراجع (Ctrl+Z)">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              aria-label="تراجع"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="إعادة (Ctrl+Y)">
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              aria-label="إعادة"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
        </div>

        {/* المجموعة 6: خيارات الرؤية والشبكة (Grid & Snapping - تظهر في وضع التعديل الحر فقط) */}
        {mode === "single" && (
          <>
            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />
            <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
              <TooltipBtn content={showGrid ? "إخفاء الشبكة الإرشادية" : "إظهار الشبكة الإرشادية"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  aria-label="إظهار/إخفاء الشبكة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showGrid
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={showColumns ? "إخفاء أعمدة التخطيط" : "إظهار أعمدة التخطيط"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowColumns(!showColumns)}
                  aria-label="إظهار/إخفاء الأعمدة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showColumns
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={showRuler ? "إخفاء المسطرة القياسية" : "إظهار المسطرة القياسية"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRuler(!showRuler)}
                  aria-label="إظهار/إخفاء المسطرة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showRuler
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Ruler className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={snapToGrid ? "إيقاف المحاذاة المغناطيسية للشبكة" : "تفعيل المحاذاة المغناطيسية للشبكة"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  aria-label="محاذاة مغناطيسية"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    snapToGrid
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Magnet className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* معلومات القالب */}
        {template && (
          <div className="text-[11px] text-muted-foreground bg-muted/20 dark:bg-muted/10 border border-border/10 rounded-lg px-2.5 py-1.5 hidden lg:flex items-center gap-2 font-medium">
            {(() => {
              const Icon = template.icon;
              return <Icon className="w-3.5 h-3.5 text-primary" />;
            })()}
            <span className="font-bold">{template.name}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-muted-foreground/75">{canvasWidth}×{canvasHeight}px</span>
          </div>
        )}

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* المجموعة 6: الحفظ والتصدير والطباعة */}
        <div className="flex items-center gap-1.5">
          <TooltipBtn content="حفظ المشروع محلياً">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onSave} 
              aria-label="حفظ المشروع محلياً"
              className="h-8 w-8 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all text-muted-foreground hover:text-foreground"
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="تصدير كصورة عالية الجودة">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onExport} 
              aria-label="تصدير كصورة"
              className="h-8 w-8 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="بدء عملية الطباعة">
            <Button 
              variant="default" 
              size="icon" 
              onClick={onPrint} 
              aria-label="طباعة"
              className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg cursor-pointer transition-all shadow-xs border-0 hover:shadow-md hover:shadow-indigo-500/10 active:scale-95 flex items-center justify-center"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
            </Button>
          </TooltipBtn>
        </div>

      </div>
    </TooltipProvider>
  );
}
