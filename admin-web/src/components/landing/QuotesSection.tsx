import { Quote, MessageSquareHeart } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  metric: { value: string; label: string };
}

// شهادات ميدانية من بيئة العمل الفعلية للاستوديوهات والمطابع
const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'كنت أضيع ربع ساعة على كل ورقة هويات. اليوم أُسلّم الطلب والزبون واقف مكانه — 3 ثوانٍ حرفياً.',
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
    <section id="testimonials" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={MessageSquareHeart}
          eyebrow="من أرض المعمل"
          title={<>كلام أصحاب <span className="text-secondary">الاستوديوهات والمطابع</span></>}
          subtitle="نتائج يومية ملموسة: وقت أقل، هدر صفر، وطلبات تُسلَّم قبل أن يجلس الزبون."
          index="06"
        />

        <div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.role}
              className="spotlight-card rounded-2xl p-6 sm:p-7 flex flex-col gap-5 text-right bg-secondary border border-subtle relative overflow-hidden"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <Quote className="w-7 h-7 text-white/70 shrink-0" aria-hidden />
              <blockquote className="relative z-10 text-sm sm:text-base text-secondary leading-relaxed font-sans font-medium flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="relative z-10 flex items-end justify-between gap-3 pt-4 border-t border-subtle">
                <div>
                  <div className="text-white font-extrabold text-sm font-display">{t.author}</div>
                  <div className="text-tertiary text-[11px] font-mono mt-0.5">{t.role}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-2xl font-black font-mono text-white tracking-tight whitespace-nowrap">{t.metric.value}</div>
                  <div className="text-tertiary text-[10px] font-extrabold">{t.metric.label}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
