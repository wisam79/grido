import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FloppyDisk,
  Export,
} from "@phosphor-icons/react";
import { PrintIcon } from "@/components/ui/print-icon";
import { ToolbarFileOps } from "./toolbar-file-ops";
import {
  TooltipBtn,
  ToolbarAddTools,
  ToolbarHistoryTools,
} from "./toolbar-items";
import { useEditorStore } from "@/lib/editor-store";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  // في مسار الإنتاج السريع: إخفاء أدوات الإضافة (نص/أشكال) لتبسيط الواجهة.
  // التبسيط يخصّ مسار الكولاج المبسّط فقط — في وضع التعديل الحر تبقى الأدوات
  // ظاهرة لأن الكانفاس فعلاً يقبل عناصر حرة
  const workflowMode = useEditorStore((state) => state.workflowMode);
  const mode = useEditorStore((state) => state.mode);
  const isQuickMode = workflowMode === "quick" && mode === "collage";

  return (
    <div
      data-testid="workspace-toolbar"
      dir="rtl"
      className="relative h-10 shrink-0 border-b border-border bg-sidebar/95 backdrop-blur-xl select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-1.5 px-2">
        {/* المجموعات الرئيسية (ملف، أدوات، تحرير)
            ⚠️ عند ضيق النافذة تُمرَّر هذه المجموعة أفقياً بلا شريط ظهور
            بدل أن يُقطع الطرف الآخر (الحفظ/الطباعة/التصدير). */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {/* المجموعة 1: إدارة الملفات والمستندات */}
          <ToolbarFileOps />

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

          {/* المجموعة 2: إضافة عناصر — تُخفى في مسار الإنتاج السريع */}
          {!isQuickMode && (
            <>
              <ToolbarAddTools />
              <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />
            </>
          )}

          {/* المجموعة 3: التراجع والإعادة */}
          <ToolbarHistoryTools />
        </div>

        {/* المجموعة النهائية: الحفظ والطباعة والتصدير في مجموعة أوامر موحدة */}
        <div className="flex items-center gap-1 shrink-0 ms-auto">
          <div className="fluent-command-group shadow-2xs">
            {/* حفظ (Ctrl+S) */}
            <TooltipBtn content="حفظ المشروع (Ctrl + S)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                data-testid="toolbar-save"
                aria-label="حفظ المشروع"
                className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] group"
              >
                <FloppyDisk className="w-5 h-5 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" weight="duotone" />
                <span className="hidden xl:inline">حفظ</span>
              </Button>
            </TooltipBtn>

            {/* طباعة (Ctrl+P) */}
            <TooltipBtn content="طباعة المستند (Ctrl + P)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                data-testid="toolbar-print"
                aria-label="طباعة المستند"
                className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] group"
              >
                <PrintIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
                <span className="hidden xl:inline">طباعة</span>
              </Button>
            </TooltipBtn>

            {/* تصدير (Ctrl+E) — الإجراء الأساسي الوحيد بصلب ملوّن لتمييزه
                عن الثانوية (حفظ/طباعة الشبحية) وتوجيه العين فوراً */}
            <TooltipBtn content="تصدير صورة (Ctrl + E)">
              <Button
                variant="default"
                size="sm"
                onClick={onExport}
                data-testid="toolbar-export"
                aria-label="تصدير صورة"
                className="h-8 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md cursor-pointer transition-all duration-150 font-bold text-xs active:scale-[0.98] group shadow-xs shadow-primary/25"
              >
                <Export className="w-5 h-5 group-hover:scale-105 transition-transform" weight="bold" />
                <span>تصدير</span>
              </Button>
            </TooltipBtn>
          </div>

        </div>
      </div>
    </div>
  );
}
