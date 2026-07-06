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
    <div className="flex items-center gap-1 p-1 px-3 border-b bg-card/50 backdrop-blur flex-nowrap overflow-x-auto select-none no-print h-10.5 shrink-0 scrollbar-none">
      {/* رفع صورة عبر Wails */}
      <Button
        variant="default"
        size="sm"
        onClick={handleOpenFile}
        title="رفع صورة جديدة"
        className="px-2.5"
      >
        <ImagePlus className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* إدارة المشروع والمستندات */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearCanvas}
        title="جديد (مسح مساحة العمل)"
        className="text-destructive/80 hover:text-destructive hover:bg-destructive/5 px-2.5"
      >
        <Eraser className="w-4 h-4" />
      </Button>

      {/* مكتبة المشاريع المحلية (قاعدة البيانات SQLite) */}
      <ProjectsDialog
        trigger={
          <Button
            variant="ghost"
            size="sm"
            title="مكتبة المشاريع المحلية"
            className="px-2.5 text-muted-foreground hover:text-primary"
          >
            <Database className="w-4 h-4" />
          </Button>
        }
      />

      {/* استيراد ملف مشروع */}
      <label className="cursor-pointer" title="فتح مشروع (.json)">
        <input
          type="file"
          accept=".json"
          onChange={handleLoadProject}
          className="hidden"
        />
        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-2.5 text-[11px] text-muted-foreground hover:text-primary">
          <FolderOpen className="w-4 h-4" />
        </div>
      </label>

      {/* تصدير ملف مشروع */}
      {/* تصدير ملف مشروع */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSaveProject}
        title="تصدير ملف مشروع (.json)"
        className="px-2.5 text-muted-foreground hover:text-primary"
      >
        <FileJson className="w-4 h-4" />
      </Button>


      {/* زر التبديل بين وضع الكولاج والتعديل الحر */}
      <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 border border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("collage")}
          title="وضع الكولاج"
          className={`h-7 px-2 rounded-md transition-all ${
            mode === "collage"
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("single")}
          title="وضع التعديل الحر"
          className={`h-7 px-2 rounded-md transition-all ${
            mode === "single"
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Images className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* إضافة عناصر والتعديل عليها */}
      <>
          {/* نص */}
          <Button variant="ghost" size="sm" onClick={() => addTextElement()} title="إضافة نص" className="px-2.5 text-muted-foreground hover:text-foreground">
            <Type className="w-4 h-4" />
          </Button>


          {/* أشكال */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground" title="إضافة شكل">
                <Square className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem onClick={() => addShapeElement("rect")} className="gap-2 text-[11px]">
                <Square className="w-4 h-4 text-muted-foreground" />
                <span>مستطيل</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("ellipse")} className="gap-2 text-[11px]">
                <Circle className="w-4 h-4 text-muted-foreground" />
                <span>دائرة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("star")} className="gap-2 text-[11px]">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span>نجمة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("line")} className="gap-2 text-[11px]">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span>خط مستقيم</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* ترتيب العناصر */}
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelection}
            onClick={() => selectedId && bringToFront(selectedId)}
            title="إحضار للأمام"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelection}
            onClick={() => selectedId && sendToBack(selectedId)}
            title="إرسال للخلف"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelection}
            onClick={() => selectedId && duplicateElement(selectedId)}
            title="تكرار"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasSelection}
            onClick={() => {
              if (selectedId) {
                removeElement(selectedId);
                toast.success("تم حذف العنصر");
              }
            }}
            title="حذف"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* محاذاة العناصر */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!hasSelection}>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={!hasSelection}
                className="px-2 text-muted-foreground hover:text-foreground" 
                title="محاذاة العنصر المحدد"
              >
                <AlignLeft className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => alignElement("left")} className="gap-2 text-[11px]">
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                <span>محاذاة لليسار</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignElement("center")} className="gap-2 text-[11px]">
                <AlignCenter className="w-4 h-4 text-muted-foreground" />
                <span>محاذاة للوسط أفقياً</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignElement("right")} className="gap-2 text-[11px]">
                <AlignRight className="w-4 h-4 text-muted-foreground" />
                <span>محاذاة لليمين</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => alignElement("top")} className="gap-2 text-[11px]">
                <AlignLeft className="w-4 h-4 text-muted-foreground rotate-90" />
                <span>محاذاة للأعلى</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignElement("middle")} className="gap-2 text-[11px]">
                <AlignCenter className="w-4 h-4 text-muted-foreground rotate-90" />
                <span>محاذاة للوسط عمودياً</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignElement("bottom")} className="gap-2 text-[11px]">
                <AlignRight className="w-4 h-4 text-muted-foreground rotate-90" />
                <span>محاذاة للأسفل</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-0.5" />
        </>

      {/* تراجع/إعادة */}
      <Button
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={historyIndex <= 0}
        title="تراجع"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={historyIndex >= history.length - 1}
        title="إعادة"
      >
        <Redo2 className="w-4 h-4" />
      </Button>

      <div className="flex-1" />

      {/* معلومات القالب */}
      {template && (
        <div className="text-xs text-muted-foreground px-2 hidden lg:flex items-center gap-2">
          {(() => {
            const Icon = template.icon;
            return <Icon className="w-3.5 h-3.5 text-primary" />;
          })()}
          <span>{template.name}</span>
          <span className="text-muted-foreground/70">
            · {canvasWidth}×{canvasHeight}px
          </span>
        </div>
      )}

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      <Button variant="outline" size="sm" onClick={onSave} title="حفظ المشروع محلياً" className="px-2.5">
        <Save className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onExport} title="تصدير كصورة" className="px-2.5">
        <Download className="w-4 h-4" />
      </Button>
      <Button variant="default" size="sm" onClick={onPrint} title="طباعة" className="px-2.5">
        <Printer className="w-4 h-4" />
      </Button>
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
