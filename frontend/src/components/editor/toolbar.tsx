"use client";

import { useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
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
} from "lucide-react";
import { toast } from "sonner";

import { OpenFile } from "../../../wailsjs/go/main/App";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const {
    mode,
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
  } = useEditorStore();

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

  const handleSave = () => {
    onSave();
  };

  const hasSelection = !!selectedId;

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-card/50 backdrop-blur flex-wrap no-print">
      {/* رفع صورة عبر Wails */}
      <Button
        variant="default"
        size="sm"
        onClick={handleOpenFile}
        className="gap-1.5"
      >
        <ImagePlus className="w-4 h-4" />
        <span className="hidden sm:inline">رفع صورة</span>
      </Button>

      <Separator orientation="vertical" className="h-7 mx-1" />

      {/* إضافة عناصر - فقط في وضع الصورة الواحدة */}
      {mode === "single" && (
        <>
          <Button variant="ghost" size="sm" onClick={() => addTextElement()} title="نص" className="gap-1.5">
            <Type className="w-4 h-4" />
            <span className="hidden md:inline">نص</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addShapeElement("rect")} title="مستطيل">
            <Square className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addShapeElement("ellipse")} title="دائرة">
            <Circle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addShapeElement("star")} title="نجمة">
            <Star className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addShapeElement("line")} title="خط">
            <Minus className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-7 mx-1" />

          {/* ترتيب */}
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

          <Separator orientation="vertical" className="h-7 mx-1" />
        </>
      )}

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

      <Separator orientation="vertical" className="h-7 mx-1" />

      <Button variant="outline" size="sm" onClick={onSave} className="gap-1.5">
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">حفظ</span>
      </Button>
      <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">تصدير</span>
      </Button>
      <Button variant="default" size="sm" onClick={onPrint} className="gap-1.5">
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">طباعة</span>
      </Button>
    </div>
  );
}
