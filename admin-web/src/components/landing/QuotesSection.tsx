import { Quote } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  metric: { value: string; label: string };
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'كنت أضيع ربع ساعة على كل ورقة هويات في فوتوشوب. اليوم أُسلّم الطلب والزبون واقف مكانه — 3 ثوانٍ حرفياً.',
    author: 'صاحب استوديو تصوير',
    role: 'بغداد — معاملات يومية',
    metric: { value: '7+ دقائق', label: 'توفير لكل زبون' },
  },
  {
    quote: 'أكبر هاجس كان هدر الورق والحبر بسبب التوزيع اليدوي. الشبكات الذكية وعلامات القص أنهت الموضوع تماماً.',
    author: 'مدير مطبعة تجارية',
    role: 'البصرة — طباعة CMYK',
    metric: { value: 'صفر هدر', label: 'هدر الورق' },
  },
  {
    quote: 'صور الزبائن القديمة والمبهتة صارت تُقبل رسمياً بعد الترميم. الملامح تبقى طبيعية بدون وجه شمعي.',
    author: 'مصمم صور وثائق',
    role: 'أربيل — ترميم AI',
    metric: { value: 'وجه HD', label: 'استعادة الملامح' },
  },
];

export function QuotesSection() {
  return (
    <section id="testimonials" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="آراء الاستوديوهات"
          title="كلام أصحاب الاستوديوهات والمطابع"
          subtitle="نتائج يومية ملموسة: وقت أقل، هدر صفر، وطلبات تُسلَّم قبل أن يجلس الزبون."
          index="08"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.role}
              className="rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6 text-right bg-[#191b1e] border border-[rgba(214,235,253,0.19)]"
            >
              <Quote className="w-6 h-6 text-[#00a3ff] shrink-0" aria-hidden />
              <blockquote className="text-sm sm:text-base text-[#f0f0f0] leading-relaxed flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-end justify-between gap-3 pt-4 border-t border-[rgba(214,235,253,0.19)]">
                <div>
                  <div className="text-[#f0f0f0] text-sm font-serif">{t.author}</div>
                  <div className="text-[#a1a4a5] text-[11px] font-mono mt-0.5">{t.role}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xl font-normal font-serif text-[#00a3ff]">{t.metric.value}</div>
                  <div className="text-[#a1a4a5] text-[10px] font-mono">{t.metric.label}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

