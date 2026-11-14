import React, { useEffect, useRef, useState } from 'react';

import { SidebarSimple } from '@/components/ui/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { PanelFooterPortalContext } from './panel-footer-portal';

/**
 * PanelShell - غلاف موحد للألواح الجانبية (عمود القوالب / عمود الخصائص)
 * وفق نظام Fluent 2 وأفضل ممارسات محررات التصميم الحديثة:
 *
 * 1. رأس ثابت بحد أدنى 48px يثبت هوية اللوح، ويتمدد للسياق الطويل
 *    اثناء التمرير ويحافظ على المعلومات (عنوان نصي نظيف — صفر حشو).
 * 2. زر طي داخلي لقابلية الاكتشاف مع Tooltip و aria-label.
 * 3. جسم قابل للتمرير بحشو من سلم 4px.
 * 4. فصل بصري واضح بين الراس والجسم عبر فاصل شبه شفاف.
 */
export interface PanelShellProps {
  title: React.ReactNode;
  /** سطر سياقي مختصر أسفل العنوان (نوع العنصر، الأبعاد، عدد التحديد) */
  subtitle?: React.ReactNode;
  /** يخفي الزر عند غيابه (مثل عرض اللوح داخل Sheet الجوال) */
  onCollapse?: () => void;
  collapseTitle?: string;
  collapseIcon?: React.ReactNode;
  children: React.ReactNode;
  /** محتوى ثابت اسفل الجسم (اختياري) */
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  /**
   * إخفاء الرأس كاملاً — يُستخدم داخل ورقة الجوال حيث تعرض التبويبات
   * الداخلية اسم الأداة نفسها، فرأس ثانٍ بالاسم ذاته حشو مكرر.
   */
  showHeader?: boolean;
  className?: string;
  bodyClassName?: string;
}

export const PanelShell = React.memo(function PanelShell({
  title,
  subtitle,
  onCollapse,
  collapseTitle = 'إخفاء اللوحة',
  collapseIcon,
  children,
  footer,
  headerExtra,
  showHeader = true,
  className,
  bodyClassName,
}: PanelShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [footerPortalHost, setFooterPortalHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const hostEl = bodyRef.current;
    if (!hostEl) return;
    const viewportEl = hostEl.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const targetEl = viewportEl || hostEl;
    // غلاف المحتوى الداخلي لـ Radix (الابن الأول للـ viewport) يتبع ارتفاع
    // المحتوى الفعلي — مراقبته ضرورية لأن ارتفاع الـ viewport نفسه ثابت بالتخطيط،
    // فنمو المحتوى (مثل اختيار طبقة بخصائص أكثر) لا يُطلق ResizeObserver عليه
    // ولا حدث scroll، وسيبقى التلاشي العلوى عالقاً بحالة التركيب الأولى.
    const contentEl = viewportEl?.firstElementChild as HTMLElement | null;

    const update = () => setCanScroll(targetEl.scrollHeight > targetEl.clientHeight + 4);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(targetEl);
    if (contentEl) ro.observe(contentEl);
    if (viewportEl && viewportEl !== hostEl) {
      viewportEl.addEventListener('scroll', update, { passive: true });
    }
    return () => {
      ro.disconnect();
      if (viewportEl && viewportEl !== hostEl) {
        viewportEl.removeEventListener('scroll', update);
      }
    };
  }, []);

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      {/* رأس بحد أدنى 48px؛ يتمدد عند التفاف السياق دون بتر المعلومات. */}
      {showHeader && (
        <div
          data-slot="ux-panel-header"
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 min-h-12 bg-card/55 border-b border-border/70 select-none"
        >
          <div className="min-w-0 flex-1 text-start">
            <div className="block text-sm font-semibold text-foreground leading-5 tracking-tight break-words [overflow-wrap:anywhere]">
              {title}
            </div>
            {subtitle && (
              <div className="mt-0.5 block text-mini font-medium text-muted-foreground/85 tabular-nums leading-4 break-words [overflow-wrap:anywhere]">
                {subtitle}
              </div>
            )}
          </div>

          {headerExtra && <div className="shrink-0 flex items-center gap-1">{headerExtra}</div>}

          {headerExtra && onCollapse && (
            <div className="h-3.5 w-px bg-border/60 shrink-0" aria-hidden="true" />
          )}

          {onCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onCollapse}
                  aria-label={collapseTitle}
                  className="shrink-0 h-7 w-7 min-h-7 min-w-7 coarse-touch-target flex items-center justify-center rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:border-border/60 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none group"
                >
                  {collapseIcon || (
                    <SidebarSimple className="w-4 h-4" weight="regular" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold">
                {collapseTitle}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* الجسم القابل للتمرير مع تلاشي علوي خفيف يدل على قابلية التمرير */}
      <PanelFooterPortalContext.Provider value={footer ? null : footerPortalHost}>
        <div ref={bodyRef} className="flex-1 min-h-0 relative panel-scroll-host">
          {canScroll && (
            <div className="absolute inset-x-0 top-0 h-2 pointer-events-none z-10 bg-gradient-to-b from-background/70 to-transparent panel-scroll-hint" />
          )}
          <ScrollArea className="h-full">
            <div className={cn('px-3 py-3 space-y-4 font-cairo', bodyClassName)}>{children}</div>
          </ScrollArea>
        </div>
      </PanelFooterPortalContext.Provider>

      {footer ? (
        <>
          <Separator className="bg-border/50 shrink-0" />
          <div className="shrink-0 p-3">{footer}</div>
        </>
      ) : (
        <div
          ref={setFooterPortalHost}
          data-slot="ux-panel-footer-portal"
          className="empty:hidden shrink-0 border-t border-border/50 bg-sidebar/40 px-3 py-2.5 font-cairo"
        />
      )}
    </div>
  );
});

PanelShell.displayName = 'PanelShell';
