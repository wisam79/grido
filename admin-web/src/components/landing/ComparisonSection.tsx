import { CheckCircle2, X, Sparkles, Zap, ShieldCheck, Cpu, Droplets, WifiOff } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const COMPARISON_ROWS = [
  {
    icon: Zap,
    feature: 'تجهيز ورقة الطباعة والتقطيع',
    grido: 'تلقائي بنقرة واحدة (أقل من ثانية)',
    traditional: 'يدوي محبط يستغرق 5 - 10 دقائق',
    gridoTime: '3 ثوانٍ',
    traditionalTime: '10 دقائق',
  },
  {
    icon: ShieldCheck,
    feature: 'دقة المقاسات الرسمية (الهوية والفيزا)',
    grido: '100% مطابقة للمواصفات الحكومية',
    traditional: 'عرضة للأخطاء البشرية وإعادة الطباعة',
    gridoTime: 'دقة 100%',
    traditionalTime: 'أخطاء يدوية',
  },
  {
    icon: Cpu,
    feature: 'ترميم ملامح الوجه بالذكاء الاصطناعي',
    grido: 'محلي فوري بـ CodeFormer + HD',
    traditional: 'يتطلب خبرة فوتوشوب معقدة أو اشتراكات',
    gridoTime: 'ترميم فوري HD',
    traditionalTime: 'تعديل يدوي',
  },
  {
    icon: Droplets,
    feature: 'هدر ورق الطباعة',
    grido: '0% هدر مع شبكات توزيع الخلايا الذكية',
    traditional: 'هدر متكرر للأوراق والحبر الثمين',
    gridoTime: 'صفر هدر',
    traditionalTime: 'هدر كبير',
  },
  {
    icon: WifiOff,
    feature: 'العمل بدون إنترنت',
    grido: 'سرعة فائقة وخصوصية كاملة للصور',
    traditional: 'بطء في التعامل والاعتماد على سيرفرات خارجية',
    gridoTime: 'بدون إنترنت',
    traditionalTime: 'اعتماد على سحابة',
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Sparkles}
          eyebrow="مقارنة الأداء والمقاييس"
          title={<>لماذا يتحول الجميع إلى <span className="text-secondary">GRIDO STUDIO</span>؟</>}
          subtitle="وفر 90% من وقت العمل اليومي بفضل الأتمتة المباشرة."
          index="03"
        />

        {/* Feature VS Cards Stack */}
        <div className="stagger-4 space-y-4">
          {COMPARISON_ROWS.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div 
                key={idx}
                className="spotlight-card rounded-2xl group relative flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 p-4 transition-all duration-300 cursor-default bg-secondary border border-subtle hover:border-white/30"
              >
                {/* 1. Feature Title Column */}
                <div className="relative z-10 lg:w-1/3 flex items-center gap-4 p-3 lg:p-4 bg-transparent">
                  <div className="w-10 h-10 rounded-xl bg-elevated border border-subtle flex items-center justify-center shrink-0 text-white font-mono font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg font-bold text-white font-display leading-tight">
                      {row.feature}
                    </h3>
                  </div>
                </div>

                {/* 2. VS Split Comparison Column */}
                <div className="relative z-10 lg:w-2/3 flex flex-col sm:flex-row rounded-xl border border-subtle bg-primary overflow-hidden">
                  {/* Traditional (Old Way) */}
                  <div className="flex-1 p-4 sm:p-5 flex items-center justify-start sm:justify-center text-right sm:text-center relative overflow-hidden border-b sm:border-b-0 sm:border-e border-subtle bg-secondary/40">
                    <div className="relative z-10 flex flex-col sm:items-center gap-2 w-full">
                      <span className="text-[10px] font-extrabold text-tertiary">الطريقة التقليدية</span>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-tertiary/70 line-through decoration-tertiary/60 decoration-2 tracking-tight whitespace-nowrap">
                        {row.traditionalTime}
                      </div>
                      <div className="flex items-start sm:items-center gap-2 opacity-60">
                        <X className="w-4 h-4 text-tertiary shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-tertiary text-xs sm:text-sm font-medium line-through">{row.traditional}</p>
                      </div>
                    </div>
                  </div>

                  {/* VS Divider Badge */}
                  <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-elevated border border-subtle items-center justify-center z-20 shadow-md">
                    <span className="text-[10px] font-mono font-extrabold text-white">VS</span>
                  </div>

                  {/* Grido Studio (New Way) */}
                  <div className="flex-1 p-4 sm:p-5 flex items-center justify-start sm:justify-center text-right sm:text-center bg-elevated relative overflow-hidden border-t sm:border-t-0 border-white/20">
                    <div className="relative z-10 flex flex-col sm:items-center gap-2 w-full">
                      <span className="text-[10px] font-extrabold text-white">مع GRIDO STUDIO</span>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight whitespace-nowrap">
                        {row.gridoTime}
                      </div>
                      <div className="flex items-start sm:items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-white text-xs sm:text-sm font-extrabold">{row.grido}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
