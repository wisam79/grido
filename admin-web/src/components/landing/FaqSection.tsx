import { useState } from 'react';
import { ChevronDown, Sparkles, MessageCircle, ArrowUpLeft } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const FAQ_ITEMS = [
  {
    q: 'هل يعمل البرنامج بدون اتصال بالإنترنت؟',
    a: 'نعم! جميع الوظائف الأساسية للطباعة — القص، التوسيط، توزيع الشبكات، الطباعة، وتصدير CMYK — تعمل محلياً 100% على جهازك. الإنترنت مطلوب فقط لميزات الترميم بالذكاء الاصطناعي (CodeFormer) لأنها تعمل على خوادم معالجة GPU متخصصة تضمن أعلى دقة ممكنة.',
  },
  {
    q: 'ما هي الطابعات المدعومة في Grido Studio؟',
    a: 'يدعم البرنامج كافة الطابعات المتصلة بنظام ويندوز دون استثناء: طابعات الحبر المكتبية، الحرارية، وطابعات المعامل الاحترافية (Epson SureLab, Canon PIXMA/PRO, DNP DS-Series, HP DesignJet, Noritsu QSS) — مع إعدادات جاهزة لكل نوع ورق.',
  },
  {
    q: 'كيف يمكنني الحصول على مفتاح التفعيل الرسمي (Pro License)؟',
    a: 'تواصل مع فريق الدعم الفني المباشر أو الوكيل المعتمد في منطقتك للحصول على تفعيل رسمي فوري لجهاز الاستوديو. التفعيل يُربط بالجهاز ويشمل تحديثات تلقائية موقّعة وموثوقة.',
  },
  {
    q: 'كيف تعمل فترة التجربة المجانية؟',
    a: 'تمنحك فترة التجربة المجانية (7 أيام) وصولاً كاملاً وغير محدود لجميع وظائف البرنامج والذكاء الاصطناعي لتقييمه واختباره فعلياً في مطبعتك أو استوديوهاتك قبل التفعيل النهائي.',
  },
  {
    q: 'هل يدعم البرنامج نمط ألوان المطابع CMYK؟',
    a: 'نعم، يحوّل الألوان حقيقياً إلى CMYK ويصدّر بصيغ عالية الدقة (TIFF و High-JPEG بـ 300DPI) مع فرض الأسود الخالص (K=100%) على خطوط القص وعلامات التقصي لمنع تلطخ الحواف عند الطباعة التجارية.',
  },
  {
    q: 'هل تُرسل صور الزبائن إلى خوادم خارجية؟',
    a: 'إطلاقاً في الوظائف المحلية (التنسيق والطباعة). وعند استخدام ترميم AI الاختياري، تُرسل الصورة مشفّرةً إلى خادم المعالجة لحظياً وتُحذف فور اكتمال الطلب — لا تُخزَّن أي صورة نهائياً، وخصوصية زبائنك مضمونة بالكامل.',
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  return (
    <section id="faq" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Sparkles}
          eyebrow="الدعم الفني والأسئلة"
          title={<>إجابات مباشرة <span className="text-secondary">بدون لفّ ودوران</span></>}
          subtitle="كل ما يسأل عنه أصحاب الاستوديوهات قبل أول تحميل."
          index="08"
        />

        <div className="stagger-4 max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-white bg-elevated shadow-lg'
                    : 'border-subtle bg-elevated/60 hover:border-white/30'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-4 transition-colors text-white cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${idx}`}
                  id={`faq-button-${idx}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[9px] font-mono font-bold text-tertiary tracking-[2px] shrink-0" dir="ltr" aria-hidden>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={isOpen ? 'text-white font-extrabold' : 'text-secondary'}>{faq.q}</span>
                  </span>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 bg-primary border ${isOpen ? 'rotate-180 border-white' : 'border-subtle'}`}>
                    <ChevronDown className="w-4 h-4 text-white" />
                  </span>
                </button>
                <div
                  id={`faq-panel-${idx}`}
                  role="region"
                  aria-labelledby={`faq-button-${idx}`}
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-secondary text-xs sm:text-sm leading-relaxed font-sans font-medium border-t border-subtle/60 pt-4 mx-4 sm:mx-5">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* بطاقة التواصل — سؤالك غير موجود؟ */}
        <div className="stagger-5 max-w-3xl mx-auto mt-8">
          <div className="spotlight-card rounded-2xl bg-secondary border border-subtle p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-right">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-elevated border border-subtle shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </span>
              <div>
                <h3 className="text-base font-black font-display text-white">سؤالك غير موجود هنا؟</h3>
                <p className="text-xs text-tertiary font-sans font-medium mt-0.5">فريق الدعم يجيبك مباشرة خلال ساعات الدوام.</p>
              </div>
            </div>
            <a
              href="mailto:support@grido.cloud-ip.cc"
              className="magnetic-pill shrink-0 flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-extrabold text-xs transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <span>تواصل معنا</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
