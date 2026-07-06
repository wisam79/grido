import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { ProjectSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ImagePlus,
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
  FolderOpen,
  FileJson,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Database,
  Images,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { OpenFile, ClearAutoSave } from "../../../wailsjs/go/main/App";
import { ProjectsDialog } from "./projects-dialog";
import { toast } from "sonner";

import { useShallow } from "zustand/react/shallow";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const {
    mode,
    setMode,
    elements,
    updateElement,
    pushHistory,
    addImageElement,
    addTextElement,
    addShapeElement,
    selectedId,
    removeElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    undo,
    redo,
    history,
    historyIndex,
    template,
    canvasWidth,
    canvasHeight,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    setMode: state.setMode,
    elements: state.elements,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    addImageElement: state.addImageElement,
    addTextElement: state.addTextElement,
    addShapeElement: state.addShapeElement,
    selectedId: state.selectedId,
    removeElement: state.removeElement,
    duplicateElement: state.duplicateElement,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    undo: state.undo,
    redo: state.redo,
    history: state.history,
    historyIndex: state.historyIndex,
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
  })));

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        addImageElement(b64);
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الصورة");
    }
  };



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

  const handleSaveProject = () => {
    try {
      const state = useEditorStore.getState();
      const projectData = {
        mode: state.mode,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        backgroundColor: state.backgroundColor,
        elements: state.elements,
        slots: state.slots,
        template: state.template,
        collageTemplate: state.collageTemplate,
        printSettings: state.printSettings,
      };
      
      const blob = new Blob([JSON.stringify(projectData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grido-project-${template?.name || "custom"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير المشروع كملف JSON بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تصدير ملف المشروع");
    }
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawProject = JSON.parse(event.target?.result as string);
        const parsed = ProjectSchema.safeParse(rawProject);
        if (parsed.success) {
          const project = parsed.data;
          
          useEditorStore.getState().loadProject(project);
          toast.success("تم تحميل ملف المشروع بنجاح");
        } else {
          toast.error("ملف المشروع غير صالح أو معطوب");
          console.error("Zod Validation Error:", parsed.error);
        }
      } catch {
        toast.error("ملف المشروع غير صالح أو معطوب");
      }
    };
    reader.readAsText(file);
  };

  const handleClearCanvas = () => {
    setIsClearAlertOpen(true);
  };

  const confirmClearCanvas = () => {
    useEditorStore.setState({
      elements: [],
      slots: [],
      selectedId: null,
    });
    ClearAutoSave().catch((err) => console.error("Failed to clear autosave:", err));
    toast.success("تم مسح مساحة العمل بالكامل");
  };

  const hasSelection = !!selectedId;

  return (
    <div className="flex items-center gap-2 p-1 px-3 border-b bg-card/65 backdrop-blur-md flex-nowrap overflow-x-auto select-none no-print h-12.5 shrink-0 scrollbar-none shadow-xs">
      
      {/* المجموعة 1: إدارة الملفات والمستندات */}
      <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
        {/* رفع صورة */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenFile}
          title="رفع صورة جديدة"
          className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ImagePlus className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

        {/* مسح الكانفاس */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearCanvas}
          title="جديد (مسح مساحة العمل)"
          className="h-7 px-2 text-destructive/80 hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
        </Button>

        {/* المكتبة المحلية */}
        <ProjectsDialog
          trigger={
            <Button
              variant="ghost"
              size="sm"
              title="مكتبة المشاريع المحلية"
              className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
            </Button>
          }
        />

        {/* استيراد JSON */}
        <label className="cursor-pointer" title="فتح مشروع (.json)">
          <input
            type="file"
            accept=".json"
            onChange={handleLoadProject}
            className="hidden"
          />
          <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-background/80 h-7 px-2 text-muted-foreground hover:text-primary cursor-pointer">
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
        </label>

        {/* تصدير JSON */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveProject}
          title="تصدير ملف مشروع (.json)"
          className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <FileJson className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* المجموعة 2: وضع العمل */}
      <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("collage")}
          title="وضع الكولاج"
          className={`h-7 px-2.5 rounded-md transition-all cursor-pointer ${
            mode === "collage"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/80"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("single")}
          title="وضع التعديل الحر"
          className={`h-7 px-2.5 rounded-md transition-all cursor-pointer ${
            mode === "single"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/80"
          }`}
        >
          <Images className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* المجموعة 3: إضافة عناصر */}
      <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
        {/* نص */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => addTextElement()} 
          title="إضافة نص" 
          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <Type className="w-3.5 h-3.5" />
        </Button>

        {/* أشكال */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5" 
              title="إضافة شكل"
            >
              <Square className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* المجموعة 4: تعديل وترتيب ومحاذاة العنصر المحدد */}
      {hasSelection && (
        <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedId && bringToFront(selectedId)}
            title="إحضار للأمام"
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedId && sendToBack(selectedId)}
            title="إرسال للخلف"
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedId && duplicateElement(selectedId)}
            title="تكرار"
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          
          <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

          {/* محاذاة */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5" 
                title="محاذاة العنصر المحدد"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedId) {
                removeElement(selectedId);
                toast.success("تم حذف العنصر");
              }
            }}
            title="حذف"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* المجموعة 5: التراجع والإعادة */}
      <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="تراجع"
          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="إعادة"
          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </Button>
      </div>

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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSave} 
          title="حفظ المشروع محلياً" 
          className="h-8 px-3 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all gap-1.5 text-xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="font-bold hidden md:inline">حفظ</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExport} 
          title="تصدير كصورة" 
          className="h-8 px-3 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all gap-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="font-bold hidden md:inline">تصدير</span>
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={onPrint} 
          title="طباعة" 
          className="h-8 px-3 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/10 text-white rounded-lg cursor-pointer transition-all gap-1.5 text-xs shadow-xs border-0"
        >
          <Printer className="w-3.5 h-3.5 text-white" />
          <span className="font-bold">طباعة</span>
        </Button>
      </div>

      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo text-right">مسح مساحة العمل</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo text-right">
              هل أنت متأكد من مسح جميع العناصر والبدء من جديد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearCanvas} className="bg-destructive hover:bg-destructive/90 text-white font-cairo">
              مسح بالكامل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
