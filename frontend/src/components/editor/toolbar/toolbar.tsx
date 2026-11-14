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
  Keyboard,
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
import { ToolbarOverflow } from './toolbar-overflow';

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
      className="workspace-command-bar relative h-12 shrink-0 border-b border-border bg-sidebar select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-2.5 px-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* نفس الأوامر الأصلية، مع مؤشر وتمرير وصولي عند ضيق المساحة. */}
        <ToolbarOverflow>
          <CommandGroup>
            <ToolbarFileOps />
          </CommandGroup>

          <Separator
            orientation="vertical"
            className="mx-1.5 bg-border/80 data-[orientation=vertical]:h-4"
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
        </ToolbarOverflow>

        {/* 🧭 مبدّل وضع العمل في التدفق الطبيعي للأجهزة المتوسطة ومتمركز شبكياً في الشاشات الأوسع */}
        <div className="hidden md:flex items-center shrink-0 lg:justify-self-center pointer-events-auto">
          <ModeSwitcher />
        </div>

        {/* المجموعة النهائية: أزرار إخراج أيقونية موحدة بالكامل بنمط Fluent 2 Subtle */}
        <CommandGroup className="workspace-output-actions gap-1.5 lg:justify-self-end">
          {/* زر لوحة الأدوات والأوامر المباشر (Ctrl+K) */}
          <TooltipBtn content="لوحة الأدوات والأوامر (Ctrl + K)">
            <Button
              variant="ghost"
              size="icon"
              data-testid="toolbar-tool-launcher"
              aria-label="لوحة الأدوات والأوامر"
              onClick={() => window.dispatchEvent(new CustomEvent('grido:open-tool-launcher'))}
              className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent cursor-pointer"
            >
              <Faders className="w-4 h-4" aria-hidden="true" />
            </Button>
          </TooltipBtn>

          <Separator
            orientation="vertical"
            className="mx-1 bg-border/80 data-[orientation=vertical]:h-4"
          />

          {/* حفظ (Ctrl+S) — زر سطح ثانوي مؤطر وواضح */}
          <TooltipBtn content="حفظ المشروع (Ctrl + S)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              data-testid="toolbar-save"
              aria-label="حفظ المشروع"
              className="coarse-touch-target h-8 gap-1.5 px-2.5 text-control font-semibold bg-card hover:bg-accent border border-border/80 hover:border-control-border text-foreground/90 hover:text-foreground shadow-2xs cursor-pointer"
            >
              <FloppyDisk className="w-4 h-4" />
              <span className="hidden xl:inline">حفظ</span>
            </Button>
          </TooltipBtn>

          {/* تصدير (Ctrl+E) — زر سطح ثانوي مؤطر وواضح */}
          <TooltipBtn content="تصدير صورة (Ctrl + E)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              onMouseEnter={() => {
                void import('@/components/editor/dialogs/export-dialog');
              }}
              onFocus={() => {
                void import('@/components/editor/dialogs/export-dialog');
              }}
              data-testid="toolbar-export"
              aria-label="تصدير صورة"
              className="coarse-touch-target h-8 gap-1.5 px-2.5 text-control font-semibold bg-card hover:bg-accent border border-border/80 hover:border-control-border text-foreground/90 hover:text-foreground shadow-2xs cursor-pointer"
            >
              <Export className="w-4 h-4" />
              <span className="hidden xl:inline">تصدير</span>
            </Button>
          </TooltipBtn>

          {/* طباعة (Ctrl+P) — إجراء الإخراج الأساسي البارز */}
          <TooltipBtn content="طباعة المستند (Ctrl + P)">
            <Button
              variant="default"
              onClick={onPrint}
              onMouseEnter={() => {
                void import('@/components/editor/dialogs/print-dialog');
              }}
              onFocus={() => {
                void import('@/components/editor/dialogs/print-dialog');
              }}
              data-testid="toolbar-print"
              aria-label="طباعة المستند"
              className="coarse-touch-target h-8 px-3.5 gap-1.5 text-control font-semibold bg-primary-action text-primary-foreground hover:bg-primary-action-hover border border-white/10 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" weight="bold" />
              <span>طباعة</span>
            </Button>
          </TooltipBtn>

          <Separator
            orientation="vertical"
            className="mx-1 bg-border/80 data-[orientation=vertical]:h-4"
          />

          <DropdownMenu>
            <TooltipBtn content="المزيد من الخيارات">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="toolbar-more"
                  aria-label="المزيد من الخيارات"
                  className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent cursor-pointer data-[state=open]:bg-accent data-[state=open]:text-foreground"
                >
                  <DotsThreeVertical className="w-4 h-4" weight="bold" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipBtn>
            <DropdownMenuContent
              align="end"
              className="w-52 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5"
            >
              <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 select-none">
                خيارات المستند
              </div>
              <DropdownMenuItem
                onClick={() => window.dispatchEvent(new CustomEvent('grido:open-shortcuts'))}
                className="flex items-center justify-between p-2 text-xs rounded-md cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">اختصارات لوحة المفاتيح</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.dispatchEvent(new CustomEvent('grido:clear-canvas-request'))}
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
  );
});
