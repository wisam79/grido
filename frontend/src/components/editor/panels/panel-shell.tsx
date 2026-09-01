import React from "react";
import { SidebarSimple } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * PanelShell - غلاف موحد للألواح الجانبية (عمود القوالب / عمود الخصائص)
 * وفق نظام Fluent 2 وأفضل ممارسات محررات التصميم الحديثة:
 *
 * 1. رأس لاصق بارتفاع h-12 (معيار Command/App Bars) يثبت هوية اللوح
 *    اثناء التمرير ويحافظ على سياق المستخدم.
 * 2. شارة ايقونة داخل حاوية primary/10 (Icon-Driven UI).
 * 3. زر طي داخلي لقابلية الاكتشاف مع Tooltip و aria-label.
 * 4. جسم قابل للتمرير بحشو من سلم 4px.
 * 5. فصل بصري واضح بين الراس والجسم عبر فاصل شبه شفاف.
 */
export interface PanelShellProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** يخفي الزر عند غيابه (مثل عرض اللوح داخل Sheet الجوال) */
  onCollapse?: () => void;
  collapseTitle?: string;
  collapseIcon?: React.ReactNode;
  children: React.ReactNode;
  /** محتوى ثابت اسفل الجسم (اختياري) */
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const PanelShell = React.memo(function PanelShell({
  icon,
  title,
  subtitle,
  onCollapse,
  collapseTitle = "إخفاء اللوحة",
  collapseIcon,
  children,
  footer,
  headerExtra,
  className,
  bodyClassName,
}: PanelShellProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* الرأس */}
      <div className="shrink-0 flex items-center gap-2.5 px-3.5 h-12 select-none">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 flex items-center justify-center shadow-2xs fluent-specular">
          {icon}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-bold text-foreground truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {headerExtra && <div className="shrink-0">{headerExtra}</div>}

        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title={collapseTitle}
            aria-label={collapseTitle}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none group"
          >
            {collapseIcon || <SidebarSimple className="w-4.5 h-4.5" weight="regular" />}
          </button>
        )}
      </div>

      <Separator className="bg-border/50 shrink-0" />

      {/* الجسم القابل للتمرير مع تلاشي علوي خفيف يدل على قابلية التمرير */}
      <div className="flex-1 min-h-0 relative panel-scroll-host">
        <div className="absolute inset-x-0 top-0 h-2 pointer-events-none z-10 bg-gradient-to-b from-background/70 to-transparent panel-scroll-hint" />
        <ScrollArea className="h-full">
          <div className={cn("p-3 pb-8 font-cairo", bodyClassName)}>
            {children}
          </div>
        </ScrollArea>
      </div>

      {footer && (
        <>
          <Separator className="bg-border/50 shrink-0" />
          <div className="shrink-0 p-3">{footer}</div>
        </>
      )}
    </div>
  );
});

PanelShell.displayName = "PanelShell";
