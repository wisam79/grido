import { Star, Quote, CheckCircle2, Award, Building2 } from 'lucide-react';
import { TESTIMONIALS } from '../../data/landing-content';

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="ai-badge mb-3">
            <Award className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>تجارب حقيقية موثقة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2.5 tracking-tight">
            ماذا يقول أصحاب الاستوديوهات؟
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            قصص نجاح من استوديوهات تصوير ومراكز طباعة ضاعفت سرعتها ووفرت تكاليف الورق يومياً.
          </p>
        </div>

        {/* 3 Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-md relative group"
            >
              <div>
                {/* Top Row: Stars + Metric Highlight */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#2C2C2C] mb-4">
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>

                  <span className="text-[10px] font-bold text-[#10b981] bg-[#141414] px-2.5 py-0.5 rounded border border-[#2C2C2C]">
                    {item.highlightMetric}
                  </span>
                </div>

                {/* Quote Icon & Content */}
                <div className="relative mb-6">
                  <Quote className="w-6 h-6 text-[#3b82f6]/30 mb-2 rotate-180" />
                  <p className="text-xs sm:text-sm text-[#F5F5F5] leading-relaxed font-normal">
                    "{item.quote}"
                  </p>
                </div>
              </div>

              {/* Author & Studio Info Footer */}
              <div className="pt-4 border-t border-[#2C2C2C] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar Initials Capsule */}
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-white font-mono font-bold text-xs shrink-0 group-hover:border-[#3b82f6]/50 transition-colors">
                    {item.avatarSeed}
                  </div>

                  <div className="flex flex-col text-start">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[#9E9E9E] font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#60a5fa] shrink-0" />
                      {item.studioName}
                    </span>
                    <span className="text-[10px] text-[#666666]">
                      {item.location}
                    </span>
                  </div>
                </div>

                {/* Verified License Badge */}
                <div className="flex flex-col items-end shrink-0" title="ترخيص أصلي موثق">
                  <div className="flex items-center gap-1 text-[#10b981] text-[10px] font-semibold bg-[#141414] px-2 py-0.5 rounded border border-[#2C2C2C]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="hidden sm:inline">مرخّص</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Bottom Social Proof Bar */}
        <div className="mt-8 sm:mt-10 p-4 rounded-xl bg-[#171717] border border-[#2C2C2C] flex flex-wrap items-center justify-between gap-3 text-xs text-[#9E9E9E]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="text-white font-bold text-xs sm:text-sm">
              أكثر من 140 استوديو تصوير ومركز طباعة
            </span>
            <span className="text-[11px] text-[#9E9E9E] hidden sm:inline">
              يعتمدون على سير عمل Grido Studio يومياً
            </span>
          </div>

          <span className="text-[10px] sm:text-xs font-mono font-bold text-[#60a5fa] bg-[#141414] px-3 py-1 rounded-full border border-[#2C2C2C]">
            تقييم الرضا: 99.4%
          </span>
        </div>

      </div>
    </section>
  );
}
