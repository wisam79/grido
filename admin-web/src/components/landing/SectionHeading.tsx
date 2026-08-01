import type { LucideIcon } from 'lucide-react';

/**
 * رأس قسم موحّد (Eyebrow + Title + Subtitle)
 * يُستخدم في كل أقسام صفحة الهبوط لمنع تكرار نفس البنية في كل ملف (DRY).
 * النمط: SpaceX Monochromatic — شريط eyebrow بخط monospace، عنوان display ثقيل.
 */
interface SectionHeadingProps {
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  /** رقم القسم التسلسلي على طريقة SpaceX (مثال: "01") — اختياري */
  index?: string;
}

export function SectionHeading({ icon: Icon, eyebrow, title, subtitle, index }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16 relative z-20">
      {index && (
        <span className="block text-[11px] font-mono font-bold text-tertiary tracking-[3px] uppercase mb-3" dir="ltr" aria-hidden>
          {index} —
        </span>
      )}
      <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-bold text-secondary mb-4">
        <Icon className="w-3.5 h-3.5 text-white" aria-hidden />
        <span>{eyebrow}</span>
      </span>
      <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
