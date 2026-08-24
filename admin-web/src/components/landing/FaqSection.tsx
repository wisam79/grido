import { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { WHATSAPP_URL } from './WhatsAppButton';

const FAQS = [
  {
    q: 'هل يعمل البرنامج دون إنترنت (Offline)؟',
    a: 'نعم 100%. يعمل Grido Studio بالكامل محلياً على جهازك دون الحاجة لأي اتصال بالإنترنت، مما يضمن أقصى سرعة استجابة وخصوصية تامة لصور عملائك وسرية بيانات الاستوديو.',
  },
  {
    q: 'ما هي الطابعات ومقاسات الورق المدعومة؟',
    a: 'يدعم كافة طابعات الاستوديوهات الحرارية والليزرية (DNP، Epson، Canon، Citizen) ومقاسات الورق (A4، 4×6 إنش، 10×15 سم) مع خطوط قص دقيقة 0.5mm وإدارة ألوان متوافقة مع الطباعة.',
  },
  {
    q: 'كيف يتم تفعيل الرخصة؟ وماذا لو غيرت الحاسوب؟',
    a: 'عند الشراء، ستحصل فوراً على مفتاح ترخيص رقمي دائم. الرخصة ملك لك مدى الحياة ويمكنك نقل التفعيل بسهولة إلى حاسوب جديد في حال قمت بترقية جهازك داخل الاستوديو.',
  },
  {
    q: 'هل مقاسات الجوازات والفيزا معتمدة دولياً؟',
    a: 'نعم، يتضمن البرنامج قوالب معايير ICAO العالمية (35×45mm للجوازات، 50×50mm للفيزا الأمريكية، و 4×6cm) مع خطوط إرشادية تلقائية تضمن قبول الصور لدى السفارات والدوائر الرسمية.',
  },
  {
    q: 'هل يحتاج البرنامج إلى خبرة سابقة في التصميم؟',
    a: 'إطلاقاً. تم تصميم الواجهة لتكون بديهية وسريعة جداً بحيث يستطيع أي موظف داخل الاستوديو إتقان كافة أدوات القص وتجهيز أطقم الطباعة خلال دقائق معدودة دون لمس برامج التصميم المعقدة.',
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Right Column: Section Header & Contact Card (col-span-12 lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col items-start text-start">
            <div className="ai-badge mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>إجابات مباشرة</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-white mb-3 tracking-tight leading-[1.2]">
              الأسئلة الشائعة
            </h2>
            
            <p className="text-sm sm:text-base text-[#9E9E9E] mb-6 leading-relaxed">
              كل ما تحتاج لمعرفته حول ترخيص وتشغيل استوديو جريدو على أجهزة الطباعة والاستوديو.
            </p>

            {/* Quick WhatsApp Support Box */}
            <div className="w-full p-5 rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] space-y-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>لديك استفسار خاص؟</span>
              </div>
              <p className="text-xs text-[#9E9E9E] leading-relaxed">
                فريق الدعم الفني جاهز للإجابة عن أي أسئلة ومساعدتك في تجربة البرنامج داخل الاستوديو.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs transition-all shadow-sm"
              >
                <span>تحدث معنا عبر واتساب</span>
              </a>
            </div>
          </div>

          {/* Left Column: Full-Width Harmonized Accordion (col-span-12 lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-3 w-full">
            {FAQS.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={faq.q}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-[#1E1E1E] border-[#3b82f6]/40 shadow-md'
                      : 'bg-[#1E1E1E] border-[#2C2C2C] hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-white cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <span className="leading-snug">{faq.q}</span>
                    <div
                      className={`w-6 h-6 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#9E9E9E] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#60a5fa] border-[#3b82f6]/40' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[#D4D4D4] leading-relaxed border-t border-[#2C2C2C] pt-3.5 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
