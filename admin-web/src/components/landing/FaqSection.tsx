import { useState } from 'react';
import { ChevronDown, MessageCircle, ArrowUpLeft } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { WHATSAPP_URL } from './WhatsAppButton';

const FAQ_ITEMS = [
  {
    q: 'هل يعمل البرنامج بدون اتصال بالإنترنت؟',
    a: 'نعم! جميع الوظائف الأساسية للطباعة — القص، التوسيط، توزيع الشبكات، الطباعة، وتصدير CMYK — تعمل محلياً 100% على جهازك وبسرعة فائقة. الإنترنت مطلوب فقط لترميم الوجوه بالذكاء الاصطناعي (CodeFormer) عبر وحدات معالجة GPU السحابية المتخصصة.',
  },
  {
    q: 'ما هي الطابعات المدعومة في Grido Studio؟',
    a: 'يدعم البرنامج كافة الطابعات المتصلة بنظام ويندوز دون استثناء: طابعات الحبر المكتبية، الحرارية، وطابعات المعامل الاحترافية (Epson SureLab, Canon PIXMA/PRO, DNP DS-Series, HP DesignJet, Noritsu QSS) — مع إعدادات جاهزة لجميع مقاسات الورق.',
  },
  {
    q: 'كيف يمكنني الحصول على مفتاح التفعيل الرسمي (Pro License)؟',
    a: 'تواصل مع فريق الدعم الفني المباشر أو الوكيل المعتمد عبر واتساب للحصول على تفعيل فوري لجهاز الاستوديو. التفعيل دائم ويشمل التحديثات التلقائية الموقعة رقمياً.',
  },
  {
    q: 'كيف تعمل فترة التجربة المجانية؟',
    a: 'تمنحك فترة التجربة المجانية (7 أيام) وصولاً كاملاً لجميع وظائف البرنامج والذكاء الاصطناعي لتقييمه واختباره فعلياً في مطبعتك أو استوديوهاتك قبل اتخاذ قرار التفعيل.',
  },
  {
    q: 'هل يدعم البرنامج نمط ألوان المطابع CMYK؟',
    a: 'نعم، يحوّل الألوان حقيقياً إلى CMYK ويصدّر بصيغ عالية الدقة (TIFF و High-JPEG بـ 300DPI) مع فرض الأسود الخالص (K=100%) على خطوط القص وعلامات التقصي لمنع تلطخ الحواف عند الطباعة.',
  },
  {
    q: 'هل تُرسل صور الزبائن إلى خوادم خارجية؟',
    a: 'إطلاقاً في الوظائف المحلية (التنسيق والطباعة). وعند استخدام ترميم AI الاختياري، تُرسل الصورة مشفرةً لمعالجتها لحظياً وتُحذف فور اكتمال الطلب — لا تُخزن أي صورة نهائياً، وخصوصية زبائنك مصانة 100%.',
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  return (
    <section id="faq" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="الأسئلة الشائعة"
          title="إجابات مباشرة لكل استفساراتك"
          subtitle="كل ما يسأل عنه أصحاب الاستوديوهات والمطابع قبل تحميل البرنامج."
          index="09"
        />

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-lg border border-[rgba(214,235,253,0.19)] bg-[#191b1e] overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-right font-normal text-sm sm:text-base flex items-center justify-between gap-4 transition-colors text-[#f0f0f0] cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${idx}`}
                  id={`faq-button-${idx}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#00a3ff] shrink-0" dir="ltr" aria-hidden>
                      0{idx + 1}
                    </span>
                    <span className={isOpen ? 'text-[#f0f0f0]' : 'text-[#a1a4a5]'}>{faq.q}</span>
                  </span>
                  <span className={`shrink-0 w-7 h-7 rounded flex items-center justify-center bg-[#000000] border border-[rgba(214,235,253,0.19)] transition-transform ${isOpen ? 'rotate-180 text-[#00a3ff]' : 'text-[#a1a4a5]'}`}>
                    <ChevronDown className="w-4 h-4" />
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
                    <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-[#a1a4a5] text-xs sm:text-sm leading-relaxed border-t border-[rgba(214,235,253,0.1)] pt-4 mx-4 sm:mx-5">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Support Card */}
        <div className="max-w-3xl mx-auto mt-8">
          <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right">
              <span className="flex items-center justify-center w-10 h-10 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] shrink-0 text-[#00a3ff]">
                <MessageCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-normal font-serif text-[#f0f0f0]">هل لديك سؤال محدد لمطبعتك؟</h3>
                <p className="text-xs text-[#a1a4a5] mt-0.5">فريق الدعم الفني متواجد عبر واتساب للإجابة الفورية والمساعدة.</p>
              </div>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary text-xs shrink-0 flex items-center gap-2"
            >
              <span>تحدث مع الدعم عبر واتساب</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

