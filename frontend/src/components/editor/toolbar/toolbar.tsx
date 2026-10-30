import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Broom, FloppyDisk, Printer, Export, DotsThreeVertical } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ToolbarFileOps } from './toolbar-file-ops';
import {
  TooltipBtn,
  ToolbarHistoryTools,
  ToolbarSelectionTools,
  ToolbarTransferToCollage,
} from './toolbar-items';

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

/**
 * مجموعة أوامر — أزرار متجاورة على سطح شريط الأدوات الموحد (Fluent 2 CommandBar).
 * بلا صناديق متداخلة حول كل مجموعة: الفواصل الشعرية الرقيقة (Separator) تفصل
 * بين المجموعات المنطقية بهدوء بصري واستقرار كامل.
 */
function CommandGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('h-full shrink-0 flex items-center justify-center gap-0.5', className)}>
      {children}
    </div>
  );
}

/**
 * شريط الأدوات العلوي — توزيع احترافي بمنطق «ثابت → سياقي → أوامر»:
 *
 *   [إدراج | المشاريع] | [تراجع/إعادة] | [نقل للكولاج]  ← يمين (RTL)
 *   [أدوات التحديد السياقية — تظهر عند التحديد]
 *                                        [حفظ | تصدير | طباعة] | [⋮] ← يسار
 */
export const Toolbar = React.memo(function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const isSingleMode = useEditorStore((s) => s.mode === 'single');

  return (
    <div
      data-testid="workspace-toolbar"
      dir="rtl"
      className="relative h-10 shrink-0 border-b border-border bg-sidebar select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-1.5 px-2.5">
        {/* المجموعات الرئيسية (ملف، تحرير، كولاج، تحديد)
            ⚠️ عند ضيق النافذة تُمرَّر هذه المجموعة أفقياً بلا شريط ظهور
            بدل أن يُقطع الطرف الآخر (الحفظ/الطباعة/التصدير). */}
        <div className="flex items-center h-full min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <CommandGroup>
            <ToolbarFileOps />
          </CommandGroup>

          <Separator orientation="vertical" className="h-4 mx-1.5 bg-border/60 shrink-0" />

          <CommandGroup>
            <ToolbarHistoryTools />
          </CommandGroup>

          {isSingleMode && (
            <CommandGroup>
              <ToolbarTransferToCollage />
            </CommandGroup>
          )}

          <CommandGroup>
            <ToolbarSelectionTools />
          </CommandGroup>
        </div>

        {/* المجموعة النهائية: الحفظ والتصدير والطباعة في مجموعة أوامر متناسقة */}
        <div className="flex items-center h-full shrink-0 gap-1">
          <CommandGroup>
            <div className="fluent-command-group">
              {/* حفظ (Ctrl+S) — زر أيقوني قياسي موحّد */}
              <TooltipBtn content="حفظ المشروع (Ctrl + S)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSave}
                  data-testid="toolbar-save"
                  aria-label="حفظ المشروع"
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <FloppyDisk className="w-4 h-4 text-muted-foreground/90 group-hover:text-foreground transition-colors" />
                </Button>
              </TooltipBtn>

              {/* تصدير (Ctrl+E) — زر أيقوني قياسي موحّد */}
              <TooltipBtn content="تصدير صورة (Ctrl + E)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  data-testid="toolbar-export"
                  aria-label="تصدير صورة"
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <Export className="w-4 h-4 text-muted-foreground/90 group-hover:text-foreground transition-colors" />
                </Button>
              </TooltipBtn>

              {/* طباعة (Ctrl+P) — إجراء الإخراج الأساسي بأبعاد موحدة 32×32 */}
              <TooltipBtn content="طباعة المستند (Ctrl + P)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrint}
                  data-testid="toolbar-print"
                  aria-label="طباعة المستند"
                  className="h-8 w-8 p-0 flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary border border-primary/25 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <Printer className="w-4 h-4 text-primary transition-colors" weight="duotone" />
                </Button>
              </TooltipBtn>
            </div>

            <Separator orientation="vertical" className="h-4 mx-1 bg-border/60 shrink-0" />

            {/* قائمة المزيد: مسح مساحة العمل معزول في قائمة التأكيد (دون تكرار زر المشاريع الموجود يميناً) */}
            <DropdownMenu>
              <TooltipBtn content="المزيد من الخيارات">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="toolbar-more"
                    aria-label="المزيد من الخيارات"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer"
                  >
                    <DotsThreeVertical className="w-4 h-4" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipBtn>
              <DropdownMenuContent
                align="end"
                className="w-48 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5"
              >
                <DropdownMenuItem
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('grido:clear-canvas-request'))
                  }
                  className="flex items-center justify-between p-2 text-xs rounded-md cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Broom className="w-4 h-4" weight="duotone" />
                    <span className="font-semibold">مسح مساحة العمل…</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CommandGroup>
        </div>
      </div>
    </div>
  );
});
