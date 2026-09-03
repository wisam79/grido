/**
 * أنماط عناصر قائمة السياق الموحدة — مشتركة بين كل الأقسام
 * (element/slot/canvas) لتوحيد المظهر مع قاعدة Fluent 2.
 */

/** زر قياسي */
export const menuItemClassName =
  "group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold";

/** زر تدميري (حذف/تفريغ) */
export const menuItemDangerClassName =
  "group w-full text-right px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold";

/** زر مع حالة انتظار (AI) */
export const menuItemSpinnerClassName =
  "group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-semibold disabled:opacity-40";

/** عنوان قسم */
export const menuSectionLabelClassName =
  "px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider";

/** فاصل أقسام */
export const menuSeparatorClassName = "h-px bg-border/40 my-1";
