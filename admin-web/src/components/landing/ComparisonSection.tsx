import { CheckCircle2, X, Zap, ShieldCheck, Cpu, Droplets, WifiOff } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const COMPARISON_ROWS = [
  {
    icon: Zap,
    feature: 'تجهيز ورقة الطباعة والتقطيع',
    grido: 'تلقائي بنقرة واحدة (أقل من ثانية)',
    traditional: 'يدوي محبط يستغرق 5 - 10 دقائق',
    gridoTime: '3 ثوانٍ',
    traditionalTime: '10 دقائق',
    badge: 'سرعة 20X',
  },
  {
    icon: ShieldCheck,
    feature: 'دقة المقاسات الرسمية (الهوية والفيزا)',
    grido: '100% مطابقة للمواصفات الحكومية',
    traditional: 'عرضة للأخطاء البشرية وإعادة الطباعة',
    gridoTime: 'دقة 100%',
    traditionalTime: 'أخطاء يدوية',
    badge: 'صفر أخطاء',
  },
  {
    icon: Cpu,
    feature: 'ترميم ملامح الوجه بالذكاء الاصطناعي',
    grido: 'محلي فوري بـ CodeFormer + Real-ESRGAN',
    traditional: 'يتطلب خبرة فوتوشوب معقدة أو اشتراكات مكلفة',
    gridoTime: 'ترميم فوري HD',
    traditionalTime: 'تعديل يدوي بطيء',
    badge: 'بشرة طبيعية',
  },
  {
    icon: Droplets,
    feature: 'هدر ورق الطباعة والحبر',
    grido: '0% هدر مع شبكات توزيع الخلايا الذكية',
    traditional: 'هدر متكرر للأوراق والحبر الثمين',
    gridoTime: 'صفر هدر',
    traditionalTime: 'هدر مستمر',
    badge: 'توفير التكاليف',
  },
  {
    icon: WifiOff,
    feature: 'العمل بدون إنترنت',
    grido: 'سرعة فائقة وخصوصية كاملة للصور داخل جهازك',
    traditional: 'بطء في التعامل والاعتماد على سيرفرات خارجية',
    gridoTime: 'أوفلاين 100%',
    traditionalTime: 'اعتماد على السحابة',
    badge: 'خصوصية وأمان',
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="مقارنة الأداء والإنتاجية"
          title="لماذا تتحول الاستوديوهات إلى Grido Studio؟"
          subtitle="وفّر 90% من وقت العمل اليومي بفضل الأتمتة المباشرة وتفادي أخطاء فوتوشوب اليدوية."
          index="04"
        />

        {/* Feature VS Cards Stack */}
        <div className="space-y-4 max-w-5xl mx-auto">
          {COMPARISON_ROWS.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div 
                key={idx}
                className="rounded-lg flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 p-4 bg-[#191b1e] border border-[rgba(214,235,253,0.19)]"
              >
                {/* 1. Feature Title Column */}
                <div className="lg:w-1/3 flex items-center gap-3.5 p-2 lg:p-4">
                  <div className="w-10 h-10 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center shrink-0 text-[#00a3ff]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="resend-badge font-mono text-[10px] inline-block mb-1">
                      {row.badge}
                    </span>
                    <h3 className="text-base font-normal font-serif text-[#f0f0f0] leading-tight">
                      {row.feature}
                    </h3>
                  </div>
                </div>

                {/* 2. VS Split Comparison Column */}
                <div className="lg:w-2/3 flex flex-col sm:flex-row rounded-md border border-[rgba(214,235,253,0.19)] bg-[#000000] overflow-hidden">
                  {/* Traditional (Old Way) */}
                  <div className="flex-1 p-4 flex items-center justify-start sm:justify-center text-right sm:text-center border-b sm:border-b-0 sm:border-e border-[rgba(214,235,253,0.1)] bg-[#000000]">
                    <div className="flex flex-col sm:items-center gap-1 w-full">
                      <span className="text-[10px] text-[#52595b]">الطريقة التقليدية</span>
                      <div className="text-2xl font-normal font-serif text-[#52595b] line-through">
                        {row.traditionalTime}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <X className="w-3.5 h-3.5 text-[#52595b] shrink-0" />
                        <p className="text-[#52595b] text-xs line-through">{row.traditional}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grido Studio (New Way) */}
                  <div className="flex-1 p-4 flex items-center justify-start sm:justify-center text-right sm:text-center bg-[#191b1e]">
                    <div className="flex flex-col sm:items-center gap-1 w-full">
                      <span className="text-[10px] text-[#00a3ff] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a3ff]" />
                        مع Grido Studio
                      </span>
                      <div className="text-2xl font-normal font-serif text-[#f0f0f0]">
                        {row.gridoTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a3ff] shrink-0" />
                        <p className="text-[#f0f0f0] text-xs font-medium">{row.grido}</p>
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

