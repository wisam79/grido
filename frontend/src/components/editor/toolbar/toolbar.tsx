import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Broom,
  FloppyDisk,
  Printer,
  Export,
  DotsThreeVertical,
  Folders,
} from '@/components/ui/icons';
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
 * مجموعة أوامر — أزرار متجاورة يفصلها خط شعري رقيق. بلا عنوان مرئي:
 * الأزرار التي تحتاج اسماً تحمله (مثل «إدراج»)، والبقية تُشرح بـTooltip
 * عند التحويم — عناوين المجموعات كانت تكراراً بصرياً بلا معلومة إضافية.
 */
function CommandGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'h-full shrink-0 flex items-center justify-center gap-0.5 px-1.5 border-e border-border/50 last:border-e-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * شريط الأدوات العلوي — توزيع احترافي بمنطق «ثابت → سياقي → أوامر»:
 *
 *   [ملف] | [تراجع/إعادة] | [نقل للكولاج]  ← يمين (RTL)
 *   [أدوات التحديد السياقية — تظهر عند التحديد]
 *                                        [حفظ | طباعة | تصدير] [⋯] ← يسار
 *
 * - الترتيب من اليمين يتبع تدفق عمل المستخدم: إدخال → تعديل → إخراج.
 * - مجموعات مفصولة بخطوط رقيقة ومساحة تنفس، وشريط حالة في المنتصف — لغة
 *   أوامر سطح مكتب لا صفحة ويب.
 * - لا شريط بحث في الشريط: لوحة الأدوات (Ctrl+K) هي المرجع الوحيد للبحث
 *   عن أمر، فلا تتكرر القدرة ولا يظهر الحقل الفارغ وسط الأوامر
 *   (قاعدة «لوحة واحدة» في AGENTS.md).
 * - زر «مسح مساحة العمل» الأحمر انتقل إلى قائمة «المزيد» (⋯) — الإجراءات
 *   المدمِّرة لا تُثبَّت في الشريط الرئيسي (مبدأ Fluent: تقليل الخطورة الدائمة).
 */
// 🚀 memo: الترويسة تستقبل دوال معالجات ثابتة من App — بلا memo كانت أي إعادة
// رسم في App (فتح حوار، toast، حالة تشغيل) تجرف الشريط كاملاً وأدواته الفرعية.
export const Toolbar = React.memo(function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  // مجموعة «نقل إلى الكولاج» ترجع null خارج وضع التعديل الحر، فإبقاء عنوانها
  // كان يترك تسمية معلّقة فوق فراغ.
  const isSingleMode = useEditorStore((s) => s.mode === 'single');

  return (
    <div
      data-testid="workspace-toolbar"
      dir="rtl"
      className="relative h-12 shrink-0 border-b border-border bg-sidebar select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-1 px-1.5">
        {/* المجموعات الرئيسية (ملف، تحرير، كولاج، تحديد)
            ⚠️ عند ضيق النافذة تُمرَّر هذه المجموعة أفقياً بلا شريط ظهور
            بدل أن يُقطع الطرف الآخر (الحفظ/الطباعة/التصدير). */}
        <div className="flex items-stretch h-full min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <CommandGroup>
            <ToolbarFileOps />
          </CommandGroup>

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

        {/* المجموعة النهائية: الحفظ والطباعة والتصدير في مجموعة أوامر موحدة */}
        <div className="flex items-stretch h-full shrink-0">
          <CommandGroup className="border-e-0">
            <div className="fluent-command-group">
              {/* حفظ (Ctrl+S) — زر أيقوني قياسي موحّد */}
              <TooltipBtn content="حفظ المشروع (Ctrl + S)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSave}
                  data-testid="toolbar-save"
                  aria-label="حفظ المشروع"
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <FloppyDisk className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground transition-colors" />
                </Button>
              </TooltipBtn>

              {/* طباعة (Ctrl+P) — زر أيقوني قياسي موحّد */}
              <TooltipBtn content="طباعة المستند (Ctrl + P)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrint}
                  data-testid="toolbar-print"
                  aria-label="طباعة المستند"
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <Printer className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground transition-colors" />
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
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-colors duration-150 group"
                >
                  <Export className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground transition-colors" />
                </Button>
              </TooltipBtn>
            </div>

            {/* قائمة المزيد: الخيارات الإضافية للمستند والمشاريع */}
            <DropdownMenu>
              <TooltipBtn content="المزيد من الخيارات">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="toolbar-more"
                    aria-label="المزيد من الخيارات"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
                  >
                    <DotsThreeVertical className="w-4 h-4" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipBtn>
              <DropdownMenuContent
                align="end"
                className="w-52 font-cairo [direction:rtl] rounded-lg bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5 space-y-1"
              >
                <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 select-none">
                  خيارات المستند
                </div>

                <DropdownMenuItem
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('grido:open-projects-dialog', { detail: { tab: 'list' } }),
                    );
                  }}
                  className="flex items-center justify-between p-2 text-xs rounded-md cursor-pointer hover:bg-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folders className="w-4 h-4 text-muted-foreground" weight="duotone" />
                    <span className="font-semibold">مكتبة المشاريع</span>
                  </div>
                </DropdownMenuItem>

                {/* مسح مساحة العمل — إجراء مدمِّر معزول في قائمة التأكيد */}
                <DropdownMenuSeparator className="my-1 border-border/50" />
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
