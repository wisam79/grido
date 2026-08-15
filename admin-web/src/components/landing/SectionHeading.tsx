import type { LucideIcon } from 'lucide-react';

interface SectionHeadingProps {
  icon?: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  index?: string;
}

export function SectionHeading({ icon: Icon, eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#191b1e] light:bg-[#ffffff] border border-[rgba(214,235,253,0.19)] light:border-black/10 text-xs font-mono text-[#a1a4a5] light:text-[#4b5563] shadow-sm mb-4">
        {Icon ? (
          <Icon className="w-3 h-3 text-[#00a3ff]" aria-hidden />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-[#00a3ff]" />
        )}
        <span>{eyebrow}</span>
      </div>

      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-normal font-serif text-[#f0f0f0] light:text-[#111827] leading-[1.18] tracking-tight">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-4 text-[#a1a4a5] light:text-[#4b5563] text-sm sm:text-base leading-relaxed font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
}



