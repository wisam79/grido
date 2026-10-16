import { Camera, Printer, Palette, User, Check } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const AUDIENCES = [
  {
    title: 'استوديوهات التصوير',
    icon: Camera,
    features: ['سرعة 3 ثوانٍ', 'عزل نقي بدون هالات', 'ترميم تلقائي للبشرة'],
  },
  {
    title: 'مراكز الطباعة والنسخ',
    icon: Printer,
    features: ['توفير 35% ورق', 'ألوان CMYK', 'خطوط قص 0.5mm'],
  },
  {
    title: 'المصممون وصناع المحتوى',
    icon: Palette,
    features: ['تحكم بالطبقات', 'تصدير 300 DPI', 'قوالب غير محدودة'],
  },
  {
    title: 'الأفراد وأصحاب المعاملات',
    icon: User,
    features: ['معايير فيزا معتمدة', 'سهولة تامة', 'خصوصية محلية 100%'],
  },
];

export function AudienceSection() {
  return (
    <section id="audience" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <SectionHeader title="من يستفيد من استوديو جريدو؟" />

        {/* 4 Unified Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal-stagger">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            return (
              <div
                key={aud.title}
                className="ds-card p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-md"
              >
                <div>
                  <div className="ds-icon-tile w-10 h-10 text-[#3b82f6] mb-3.5">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base font-bold text-white mb-4">
                    {aud.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-[#2C2C2C] space-y-1.5">
                  {aud.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                      <div className="w-4 h-4 rounded-md bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
