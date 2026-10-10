import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Broom,
  FloppyDisk,
  Printer,
  Export,
  DotsThreeVertical,
  Folders,
} from '@/components/ui/icons';
import { ToolbarFileOps } from './toolbar-file-ops';
import {
  TooltipBtn,
  ToolbarAddTools,
  ToolbarHistoryTools,
  ToolbarSelectionTools,
  ToolbarTransferToCollage,
} from './toolbar-items';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

/**
 * شريط الأدوات العلوي — توزيع احترافي بمنطق «ثابت → سياقي → أوامر»:
 *
 *   [ملف] | [تراجع/إعادة] | [إضافة عناصر] | [نقل للكولاج]  ← يسار (RTL)
 *   [أدوات التحديد السياقية — تظهر عند التحديد]
 *                                        [حفظ | طباعة | تصدير] [⋯] ← يمين
 *
 * - الترتيب من اليسار يتبع تدفق عمل المستخدم: إدخال → تعديل (تراجع/إضافة) →
 *   إخراج (نقل/تحديد)، والأوامر النهائية مثبتة يميناً بلا إزاحة مهما تغيّر الوسط.
 * - زر «مسح مساحة العمل» الأحمر انتقل إلى قائمة «المزيد» (⋯) — الإجراءات
 *   المدمِّرة لا تُثبَّت في الشريط الرئيسي (مبدأ Fluent: تقليل الخطورة الدائمة).
 */
// 🚀 memo: الترويسة تستقبل دوال معالجات ثابتة من App — بلا memo كانت أي إعادة
// رسم في App (فتح حوار، toast، حالة تشغيل) تجرف الشريط كاملاً وأدواته الفرعية.
export const Toolbar = React.memo(function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  return (
    <div
      data-testid="workspace-toolbar"
      dir="rtl"
      className="relative h-12 shrink-0 border-b border-border bg-sidebar/95 backdrop-blur-xl select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-2 px-3">
        {/* المجموعات الرئيسية (ملف، أدوات، تحرير)
            ⚠️ عند ضيق النافذة تُمرَّر هذه المجموعة أفقياً بلا شريط ظهور
            بدل أن يُقطع الطرف الآخر (الحفظ/الطباعة/التصدير). */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {/* المجموعة 1: إدخال المحتوى — إدراج صور/مشاريع */}
          <ToolbarFileOps />

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

          {/* المجموعة 2: التحرير — تراجع/إعادة (مثبتة بشكل دائم لمنع أي إزاحة تخطيطية Layout Shift) */}
          <ToolbarHistoryTools />

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

          {/* المجموعة 3: إضافة عناصر (نص / أشكال / ملصقات) متاحة دائماً */}
          <ToolbarAddTools />

          {/* المجموعة 4: إخراج التصميم — نقل وتكراره في شبكة الكولاج (وضع التصميم الحر) */}
          <ToolbarTransferToCollage />

          {/* المجموعة 5: أدوات التحديد والسياق — تظهر بسلاسة عند تحديد عنصر */}
          <ToolbarSelectionTools />
        </div>

        {/* المجموعة النهائية: الحفظ والطباعة والتصدير في مجموعة أوامر موحدة */}
        <div className="flex items-center gap-1 shrink-0 ms-auto">
          <div className="fluent-command-group shadow-2xs">
            {/* حفظ (Ctrl+S) — زر أيقوني قياسي موحّد */}
            <TooltipBtn content="حفظ المشروع (Ctrl + S)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                data-testid="toolbar-save"
                aria-label="حفظ المشروع"
                className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 active:scale-[0.98] group"
              >
                <FloppyDisk className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" />
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
                className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 active:scale-[0.98] group"
              >
                <Printer className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" />
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
                className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 active:scale-[0.98] group"
              >
                <Export className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" />
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
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-all cursor-pointer"
                >
                  <DotsThreeVertical className="w-4 h-4" weight="bold" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipBtn>
            <DropdownMenuContent
              align="end"
              className="w-52 font-cairo [direction:rtl] rounded-xl bg-popover text-popover-foreground border border-border shadow-fluent-16 fluent-specular p-1.5 space-y-1"
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
                className="flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Folders className="w-4 h-4 text-muted-foreground" weight="duotone" />
                  <span className="font-semibold">مكتبة المشاريع</span>
                </div>
              </DropdownMenuItem>

              {/* مسح مساحة العمل — إجراء مدمِّر معزول في قائمة التأكيد */}
              <DropdownMenuSeparator className="my-1 border-border/50" />
              <DropdownMenuItem
                onClick={() => window.dispatchEvent(new CustomEvent('grido:clear-canvas-request'))}
                className="flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Broom className="w-4 h-4" weight="duotone" />
                  <span className="font-semibold">مسح مساحة العمل…</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
