import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Printer,
  Save,
} from "lucide-react";


import { ToolbarFileOps } from "./toolbar-file-ops";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

import { TooltipBtn, ToolbarAddTools, ToolbarSelectionTools, ToolbarHistoryTools, ToolbarViewTools, TemplateInfo } from "./toolbar-items";


export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  return (
    <div className="relative flex items-center gap-2 p-1 px-3 border-b border-border/70 bg-card/85 backdrop-blur-xl flex-nowrap overflow-x-auto select-none no-print h-12 shrink-0 scrollbar-none fluent-specular">
        
      {/* المجموعة 1: إدارة الملفات والمستندات */}
      <ToolbarFileOps />

      {/* المجموعة 3: إضافة عناصر */}
      <ToolbarAddTools />

      {/* المجموعة 4: تعديل وترتيب ومحاذاة العنصر المحدد */}
      <ToolbarSelectionTools />

      {/* المجموعة 5: التراجع والإعادة */}
      <ToolbarHistoryTools />

      {/* المجموعة 6: خيارات الرؤية والشبكة */}
      <ToolbarViewTools />

      <div className="flex-1" />

      {/* معلومات القالب */}
      <TemplateInfo />

      <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

      {/* المجموعة 6: الحفظ والتصدير والطباعة */}
      <div className="flex items-center gap-1.5">
        <TooltipBtn content="حفظ المشروع (Ctrl+S)">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onSave} 
            aria-label="حفظ المشروع"
            className="h-8 w-8 border-border/60 hover:bg-accent/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:text-foreground shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
        </TooltipBtn>
        <TooltipBtn content="تصدير صورة (Ctrl+E)">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onExport} 
            aria-label="تصدير صورة"
            className="h-8 w-8 border-border/60 hover:bg-accent/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:text-foreground shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </TooltipBtn>
        <TooltipBtn content="طباعة المستند (Ctrl+P)">
          <Button 
            variant="default" 
            size="sm" 
            onClick={onPrint} 
            aria-label="طباعة المستند"
            className="h-8 px-3.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md cursor-pointer transition-all shadow-xs flex items-center justify-center"
          >
            <Printer className="w-4 h-4 stroke-[2.2]" />
            <span>طباعة المستند</span>
          </Button>
        </TooltipBtn>
      </div>

    </div>
  );
}
