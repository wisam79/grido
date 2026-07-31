import { useState } from 'react';
import { ChevronDown, Sparkles, MessageCircle, ArrowUpLeft } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'هل يعمل البرنامج بدون اتصال بالإنترنت؟',
    a: 'نعم! كل الوظائف — القص، التوسيط، توزيع الشبكات، الطباعة، تصدير CMYK، وحتى ترميم الوجوه بالذكاء الاصطناعي (CodeFormer + Real-ESRGAN) — تعمل محلياً 100% على جهازك دون أي اتصال بالإنترنت. النماذج تعمل على معالج/كرت شاشة الاستوديو مباشرة.',
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
    q: 'هل النسخة المجانية محدودة بالوقت؟',
    a: 'لا، النسخة المجانية دائمة بلا تاريخ انتهاء. تشمل قص وتنسيق صور الهوية ومصمم الكولاج الكامل مع 5 ترميمات ذكاء اصطناعي يومياً — تكفي لتقييم البرنامج بشكل حقيقي في بيئة عملك اليومية.',
  },
  {
    q: 'هل يدعم البرنامج نمط ألوان المطابع CMYK؟',
    a: 'نعم، يحوّل الألوان حقيقياً إلى CMYK ويصدّر بصيغ عالية الدقة (TIFF و High-JPEG بـ 300DPI) مع فرض الأسود الخالص (K=100%) على خطوط القص وعلامات التقصي لمنع تلطخ الحواف عند الطباعة التجارية.',
  },
  {
    q: 'هل تُرسل صور الزبائن إلى خوادم خارجية؟',
    a: 'إطلاقاً. كل المعالجة — بما فيها ترميم الوجوه بالذكاء الاصطناعي — تتم على جهازك مباشرة دون إرسال أي صورة لأي خادم خارجي. خصوصية زبائنك مضمونة بالكامل والعمل يستمر حتى مع انقطاع الإنترنت كلياً.',
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  return (
    <section id="faq" className="relative py-16 sm:py-24 lg:py-28 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-mono font-bold text-secondary tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>الدعم الفني والأسئلة</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">
            إجابات مباشرة <span className="text-secondary">بدون لفّ ودوران</span>
          </h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            كل ما يسأل عنه أصحاب الاستوديوهات قبل أول تحميل.
          </p>
        </div>

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
              className="magnetic-pill shrink-0 flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-mono font-extrabold text-xs uppercase tracking-[1px] transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
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
