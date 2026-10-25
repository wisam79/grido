import { Check, X } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const OLD_WAY = [
  {
    title: '5 إلى 8 دقائق للزبون',
    desc: 'قص وتعديل يدوي مجهد في برامج التصميم.',
  },
  {
    title: 'هالات بيضاء وحواف غير دقيقة',
    desc: 'تحديد يدوي قد ترفضه السفارات والجهات الرسمية.',
  },
  {
    title: 'هدر مستمر في ورق الطباعة',
    desc: 'ترتيب يدوي غير محسوب بدون خطوط للمقص.',
  },
  {
    title: 'مخاطر الخصوصية السحابية',
    desc: 'رفع صور عملائك إلى خوادم خارجية غير آمنة.',
  },
  {
    title: 'اشتراكات شهرية متكررة',
    desc: 'فواتير باهظة تستنزف أرباح الاستوديو شهرياً.',
  },
];

const GRIDO_WAY = [
  {
    title: '3 ثوانٍ فقط للزبون',
    desc: 'عزل فوري وتجهيز مصفوفة الطباعة بضغطة زر.',
    highlight: 'أسرع 90%',
  },
  {
    title: 'عزل نقي ومطابقة دولية (ICAO)',
    desc: 'تصفير كامل للهالات البيضاء بمقاسات معتمدة للسفارات والجوازات.',
    highlight: 'مطابق لـ ICAO',
  },
  {
    title: 'توفير 35% من الورق',
    desc: 'توزيع شبكي آلي مع خطوط قص دقيقة 0.5mm.',
    highlight: 'توفير 35%',
  },
  {
    title: 'خصوصية وأمان محلي دون إنترنت',
    desc: 'معالجة وتخزين محلي بالكامل على جهازك دون إجبار على الاتصال.',
    highlight: 'أمان تام',
  },
  {
    title: 'رخصة أصلية لمدى الحياة',
    desc: 'دفع لمرة واحدة مع كافة التحديثات مجاناً للأبد.',
    highlight: 'بدون اشتراك',
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <SectionHeader title="لماذا يختار المحترفون استوديو جريدو؟" description="مقارنة مباشرة بين سير العمل التقليدي وما يوفره استوديو جريدو في كل صورة تُطبع" />

        {/* 2-Column Versus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Column 1: The Old Way */}
          <div className="ds-card bg-sidebar p-5 sm:p-7 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle mb-5">
                <h3 className="text-sm sm:text-base font-bold text-white">البرامج والطرق التقليدية</h3>
                        <span className="text-[10px] font-bold text-status-error bg-inset px-2 py-0.5 rounded border border-border-subtle">
                  هدر في الوقت
                </span>
              </div>

              <div className="space-y-3">
                {OLD_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-xl bg-inset/70 border border-border-subtle flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-card border border-border-subtle flex items-center justify-center text-status-error shrink-0 mt-0.5">
                      <X className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border-subtle text-center text-xs text-text-muted">
              استنزاف يومي للوقت والمجهود
            </div>
          </div>

          {/* Column 2: Grido Studio */}
          <div className="ds-card border-brand-primary/40 p-5 sm:p-7 flex flex-col justify-between shadow-xl relative">

            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle mb-5 pt-1">
                <h3 className="text-sm sm:text-base font-bold text-white">استوديو جريدو</h3>
                <span className="text-[10px] font-bold text-status-success bg-inset px-2 py-0.5 rounded border border-border-subtle">
                  إنتاجية قصوى
                </span>
              </div>

              <div className="space-y-3">
                {GRIDO_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-xl bg-inset border border-border-subtle hover:border-white/20 transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-card border border-border-subtle flex items-center justify-center text-status-success shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-bold text-brand-light bg-card px-2 py-0.5 rounded border border-border-subtle shrink-0">
                          {item.highlight}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
              <span className="text-white font-medium">توفير ساعتين يومياً</span>
              <span className="text-status-success font-bold">جاهز للعمل</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
