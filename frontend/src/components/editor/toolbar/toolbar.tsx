import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Broom,
  FloppyDisk,
  Printer,
  Export,
  DotsThreeVertical,
  Faders,
} from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ModeSwitcher } from './mode-switcher';
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
      <div className="h-full flex items-center justify-between gap-2 ps-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* المجموعات الرئيسية (ملف، تحرير، كولاج، تحديد)
            ⚠️ عند ضيق النافذة تُمرَّر هذه المجموعة أفقياً بلا شريط ظهور
            بدل أن يُقطع الطرف الآخر (الحفظ/الطباعة/التصدير). */}
        <div className="flex items-center h-full min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <CommandGroup>
            <ToolbarFileOps />
          </CommandGroup>

          <Separator
            orientation="vertical"
            className="mx-2 bg-border/60 data-[orientation=vertical]:h-4"
          />

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

        {/* 🧭 مبدّل وضع العمل في التدفق الطبيعي للأجهزة المتوسطة ومتمركز شبكياً في الشاشات الأوسع */}
        <div className="hidden md:flex items-center shrink-0 lg:justify-self-center pointer-events-auto">
          <ModeSwitcher />
        </div>

        {/* المجموعة النهائية: أزرار إخراج أيقونية موحدة بالكامل بنمط Fluent 2 Subtle */}
        <CommandGroup className="gap-1.5 lg:justify-self-end">
          {/* حفظ (Ctrl+S) — زر أيقوني قياسي موحّد */}
          <TooltipBtn content="حفظ المشروع (Ctrl + S)">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSave}
              data-testid="toolbar-save"
              aria-label="حفظ المشروع"
              className="h-8 w-8 p-0 text-foreground/80 cursor-pointer"
            >
              <FloppyDisk className="w-4 h-4" />
            </Button>
          </TooltipBtn>

          {/* زر لوحة الأدوات والأوامر المباشر (Ctrl+K) */}
          <TooltipBtn content="لوحة الأدوات والأوامر (Ctrl + K)">
            <Button
              variant="ghost"
              size="icon"
              data-testid="toolbar-tool-launcher"
              aria-label="لوحة الأدوات والأوامر"
              onClick={() => window.dispatchEvent(new CustomEvent('grido:open-tool-launcher'))}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <Faders className="w-4 h-4" />
            </Button>
          </TooltipBtn>

          {/* تصدير (Ctrl+E) — زر أيقوني قياسي موحّد */}
          <TooltipBtn content="تصدير صورة (Ctrl + E)">
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              onMouseEnter={() => {
                void import('@/components/editor/dialogs/export-dialog');
              }}
              onFocus={() => {
                void import('@/components/editor/dialogs/export-dialog');
              }}
              data-testid="toolbar-export"
              aria-label="تصدير صورة"
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <Export className="w-4 h-4" />
            </Button>
          </TooltipBtn>

          {/* طباعة (Ctrl+P) — إجراء الإخراج الأساسي البارز بنفس تنسيق زر الإدراج */}
          <TooltipBtn content="طباعة المستند (Ctrl + P)">
            <Button
              variant="outline"
              onClick={onPrint}
              onMouseEnter={() => {
                void import('@/components/editor/dialogs/print-dialog');
              }}
              onFocus={() => {
                void import('@/components/editor/dialogs/print-dialog');
              }}
              data-testid="toolbar-print"
              aria-label="طباعة المستند"
              className="h-8 px-2.5 gap-1.5 text-xs font-semibold border-primary/35 bg-primary/10 text-primary hover:bg-primary/18 hover:text-primary cursor-pointer shadow-none"
            >
              <Printer className="w-4 h-4 shrink-0" weight="bold" />
              <span>طباعة</span>
            </Button>
          </TooltipBtn>

          {/* خانة المزيد تطابق عرض شريط الألواح (w-11) وحدّه العمودي */}
          <div className="h-full w-11 shrink-0 flex items-center justify-center border-s border-border/80">
            <DropdownMenu>
              <TooltipBtn content="المزيد من الخيارات">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="toolbar-more"
                    aria-label="المزيد من الخيارات"
                    className="cursor-pointer data-[state=open]:bg-accent data-[state=open]:text-foreground"
                  >
                    <DotsThreeVertical className="w-4 h-4" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipBtn>
              <DropdownMenuContent
                align="end"
                className="w-48 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5"
              >
                <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 select-none">
                  خيارات المستند
                </div>
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
          </div>
        </CommandGroup>
      </div>
    </div>
  );
});
