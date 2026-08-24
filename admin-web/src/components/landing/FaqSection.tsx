import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'هل يعمل البرنامج دون إنترنت (Offline)؟',
    a: 'نعم 100%. يعمل Grido Studio بالكامل محلياً على جهازك دون الحاجة لأي اتصال بالإنترنت، مما يضمن أقصى سرعة وخصوصية تامة لصور عملائك.',
  },
  {
    q: 'ما هي الطابعات ومقاسات الورق المدعومة؟',
    a: 'يدعم كافة طابعات الاستوديوهات الحرارية والليزرية (DNP، Epson، Canon، Citizen) ومقاسات الورق (A4، 4×6 إنش، 10×15 سم) مع إدارة ألوان CMYK.',
  },
  {
    q: 'كيف يتم تفعيل الرخصة؟',
    a: 'عند الشراء، ستحصل على مفتاح رقمي لتفعيل رخصة أصلية لمدى الحياة على جهازك، مع إمكانية نقل الرخصة عند تغيير الحاسوب.',
  },
  {
    q: 'هل مقاسات الجوازات والفيزا معتمدة دولياً؟',
    a: 'نعم، يتضمن البرنامج قوالب معايير ICAO العالمية (35×45mm للجوازات، 50×50mm للفيزا الأمريكية، و 4×6cm) مع خطوط إرشادية دقيقة.',
  },
  {
    q: 'هل أحتاج إلى خبرة في برامج التصميم؟',
    a: 'لا، تم تصميم الواجهة لتكون بديهية وسريعة جداً بحيث يمكن إتقان كافة أدواتها خلال دقائق معدودة.',
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="ai-badge mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>إجابات مباشرة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            الأسئلة الشائعة
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            إجابات واضحة ومختصرة حول ترخيص وتشغيل Grido Studio.
          </p>
        </div>

        {/* Accordion List */}
        <div className="max-w-2xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-[#2C2C2C] bg-[#1E1E1E] overflow-hidden transition-colors hover:border-white/20 shadow-xs"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-white cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <div
                    className={`w-5 h-5 rounded-full bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#9E9E9E] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#60a5fa] border-[#3b82f6]/40' : ''
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-[#9E9E9E] leading-relaxed border-t border-[#2C2C2C] pt-3.5 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
