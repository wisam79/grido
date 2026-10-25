import { Quote, CheckCircle2, Building2 } from 'lucide-react';
import { TESTIMONIALS } from '../../data/landing-content';
import { SectionHeader } from './SectionHeader';

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <SectionHeader title="ماذا يقول أصحاب الاستوديوهات؟" description="شهادات حقيقية من استوديوهات ومراكز طباعة تعتمد على جريدو في عملها اليومي" />

        {/* 3 Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch reveal-stagger">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="ds-card p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-md relative group"
            >
              <div>
                {/* Metric Highlight */}
                <div className="flex items-center justify-end pb-3.5 border-b border-border-subtle mb-4">
                  <span className="text-[10px] font-bold text-status-success bg-inset px-2.5 py-0.5 rounded border border-border-subtle">
                    {item.highlightMetric}
                  </span>
                </div>

                {/* Quote Icon & Content */}
                <div className="relative mb-6">
                  <Quote className="w-6 h-6 text-brand-primary/30 mb-2 rotate-180" />
                  <p className="text-sm sm:text-base text-text-primary leading-relaxed font-normal">
                    "{item.quote}"
                  </p>
                </div>
              </div>

              {/* Author & Studio Info Footer */}
              <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar Initials Capsule */}
                  <div className="ds-icon-tile w-10 h-10 text-white font-mono font-bold text-xs group-hover:border-brand-primary/50 transition-colors">
                    {item.avatarSeed}
                  </div>

                  <div className="flex flex-col text-start">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-text-secondary font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-brand-light shrink-0" />
                      {item.studioName}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {item.location}
                    </span>
                  </div>
                </div>

                {/* Verified License Badge */}
                <div className="flex flex-col items-end shrink-0" title="ترخيص أصلي موثق">
                  <div className="flex items-center gap-1 text-status-success text-[10px] font-semibold bg-inset px-2 py-0.5 rounded border border-border-subtle">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="hidden sm:inline">مرخّص</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Bottom Social Proof Bar */}
        <div className="mt-8 sm:mt-10 p-4 rounded-xl bg-sidebar border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-status-success opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-status-success" />
            </span>
            <span className="text-white font-bold text-xs sm:text-sm">
              موثوق لدى استوديوهات التصوير ومراكز الطباعة الرقمية في العراق والمنطقة
            </span>
          </div>

          <span className="text-[10px] sm:text-xs font-bold text-status-success bg-inset px-3 py-1 rounded-full border border-border-subtle">
            تحديثات مستمرة ودعم فني دائم
          </span>
        </div>

      </div>
    </section>
  );
}
