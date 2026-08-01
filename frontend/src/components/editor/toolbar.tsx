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
    <div className="relative flex items-center gap-2 p-1 px-3 border-b border-border/80 bg-card flex-nowrap overflow-x-auto select-none no-print h-12.5 shrink-0 scrollbar-none">
        
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
        <TooltipBtn content="بدء إعدادات وطباعة المستند (Ctrl + P)">
          <Button 
            variant="default" 
            size="sm" 
            onClick={onPrint} 
            aria-label="طباعة المستند"
            className="h-8 px-3.5 gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11.5px] rounded-lg cursor-pointer transition-all shadow-xs border-0 hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center"
          >
            <Printer className="w-4 h-4 text-white stroke-[2.2]" />
            <span>طباعة المستند</span>
          </Button>
        </TooltipBtn>
      </div>

    </div>
  );
}
