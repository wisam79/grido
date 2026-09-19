import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 🦴 هيكل تحميل قياسي (Fluent 2 Wait UX — Skeleton with Shimmer)
 *
 * يُستخدم لهياكل المحتوى (شبكات، بطاقات، قوائم) أثناء التحميل غير المتزامن
 * بدل الدوّار (Spinner)، وفق إطار Wait UX المعتمد: الدوّار للعمليات (1-3 ثوانٍ)،
 * والـ Skeleton لهياكل المحتوى التي تُشكَّل تدريجياً.
 *
 * الحركة مبنية على @keyframes fluent-shimmer المعرفة في index.css،
 * وتُعطَّل تلقائياً مع prefers-reduced-motion (القاعدة العامة في index.css).
 */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md fluent-shimmer bg-muted/60",
        className
      )}
      {...props}
    />
  );
}

/** صف قائمة قياسي (صورة مصغرة + سطران) — لنوافذ المشاريع والقوائم */
export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60",
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/5" />
      </div>
      <Skeleton className="w-14 h-6 rounded-md shrink-0" />
    </div>
  );
}

/** بطاقة شبكة قياسية — لكتالوجات القوالب والملصقات */
export function SkeletonGridCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 p-2 space-y-2",
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="w-full aspect-square rounded-lg" />
      <Skeleton className="h-2.5 w-2/3 mx-auto" />
    </div>
  );
}

/**
 * هيكل جاهز لقائمة المشاريع — عدّاد صفوف اختياري حسب ارتفاع النافذة.
 * استبدال مباشر لحالة "جاري تحميل المشاريع ..." الدوّارة في projects-dialog.
 */
export function ProjectsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="جاري تحميل المشاريع ...">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
