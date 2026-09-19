import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WorkflowMode } from "@/lib/store";

// ─── تعريف بطاقة المسار ───────────────────────────────────────────────────

export interface WorkflowCardProps {
  id: WorkflowMode;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "primary" | "amber" | "emerald";
  features: readonly string[];
  isSelected: boolean;
  onSelect: (id: WorkflowMode) => void;
  delay?: number;
}

export function WorkflowCard({
  id,
  title,
  subtitle,
  description,
  icon,
  badge,
  badgeVariant = "primary",
  features,
  isSelected,
  onSelect,
  delay = 0,
}: WorkflowCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.1, 0.9, 0.2, 1] }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(id)}
      className={cn(
        "relative w-full text-right flex flex-col gap-3 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected
          ? "border-primary bg-primary/5 shadow-fluent-16 shadow-primary/10"
          : "border-border/60 bg-card/60 hover:border-border hover:bg-card/80 hover:shadow-fluent-8"
      )}
    >
      {/* مؤشر الاختيار */}
      {isSelected && (
        <motion.div
          layoutId="workflow-selected-ring"
          className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* رأس البطاقة */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">{title}</h3>
            {badge && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-micro font-bold tracking-wide",
                  badgeVariant === "primary" && "bg-primary/15 text-primary",
                  badgeVariant === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  badgeVariant === "emerald" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">{subtitle}</p>
        </div>
        {/* أيقونة المسار */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
            isSelected
              ? "bg-primary/15 text-primary shadow-xs"
              : "bg-muted/60 text-muted-foreground"
          )}
        >
          {icon}
        </div>
      </div>

      {/* الوصف */}
      <p className="text-xs text-muted-foreground/90 leading-relaxed">{description}</p>

      {/* قائمة المزايا */}
      <ul className="flex flex-col gap-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs text-foreground/70">
            <span
              className={cn(
                "w-1 h-1 rounded-full shrink-0",
                isSelected ? "bg-primary" : "bg-muted-foreground/50"
              )}
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* مؤشر التحديد السفلي */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300",
          isSelected ? "w-1/2 bg-primary" : "w-0 bg-transparent"
        )}
      />
    </motion.button>
  );
}
