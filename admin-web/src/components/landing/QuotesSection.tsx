import { Quote, MessageSquareHeart } from 'lucide-react';

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
    metric: { value: '7+ MIN', label: 'توفير لكل زبون' },
  },
  {
    quote: 'أكبر هاجس كان هدر الورق والحبر بسبب التوزيع اليدوي. الشبكات الذكية وعلامات القص أنهت الموضوع تماماً.',
    author: 'مدير مطبعة تجارية',
    role: 'البصرة — طباعة CMYK',
    metric: { value: '0% WASTE', label: 'هدر الورق' },
  },
  {
    quote: 'صور الزبائن القديمة والمبهتة صارت تُقبل رسمياً بعد الترميم. الملامح تبقى طبيعية بدون وجه شمعي.',
    author: 'مصمم صور وثائق',
    role: 'أربيل — ترميم AI',
    metric: { value: 'HD FACE', label: 'استعادة الملامح' },
  },
];

export function QuotesSection() {
  return (
    <section id="testimonials" className="relative py-16 sm:py-24 lg:py-28 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-mono font-bold text-secondary tracking-[2px] uppercase mb-4">
            <MessageSquareHeart className="w-3.5 h-3.5 text-white" />
            <span>من أرض المعمل</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">
            كلام أصحاب <span className="text-secondary">الاستوديوهات والمطابع</span>
          </h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            نتائج يومية ملموسة: وقت أقل، هدر صفر، وطلبات تُسلَّم قبل أن يجلس الزبون.
          </p>
        </div>

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
                <div className="text-left shrink-0" dir="ltr">
                  <div className="text-white font-black font-mono text-sm">{t.metric.value}</div>
                  <div className="text-tertiary text-[9px] font-mono uppercase tracking-[1px]">{t.metric.label}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
