import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'هل يعمل البرنامج بدون اتصال بالإنترنت؟',
    a: 'نعم! معظم الوظائف الأساسية مثل القص والتنسيق والطباعة تعمل محلياً 100% بدون إنترنت.',
  },
  {
    q: 'ما هي الطابعات المدعومة؟',
    a: 'يدعم البرنامج كافة الطابعات الحرارية وطابعات الحبر (Epson, Canon, HP) المتصلة بنظام الويندوز.',
  },
  {
    q: 'كيف يمكنني الحصول على مفتاح التفعيل (Pro License)؟',
    a: 'يمكنك التواصل مع فريق الدعم الفني أو الوكيل المعتمد للحصول على تفعيل رسمي لجهازك.',
  },
  {
    q: 'هل يدعم البرنامج الخطوط العربية بشكل كامل؟',
    a: 'نعم، البرنامج مصمم بالكامل ليدعم اللغة العربية وجميع الخطوط العربية الرسمية والمعتمدة.',
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  return (
    <section id="faq" className="relative py-16 sm:py-24 lg:py-28 border-t border-[#383842] bg-[#121214] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-[#383842] bg-[#1a1a1e] text-xs font-mono font-bold text-[#f0f0fa] tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>الدعم الفني والأسئلة</span>
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight uppercase leading-tight">الأسئلة الشائعة</h2>
          <p className="mt-4 text-[#f0f0fa] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">إجابات سريعة ومباشرة.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-none border transition-all duration-300 ${
                  isOpen 
                    ? 'border-white bg-[#24242c]' 
                    : 'border-[#383842] bg-[#1a1a1e] hover:border-white/40'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-4 transition-colors text-white"
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? 'text-white font-extrabold' : 'text-[#f0f0fa]'}>{faq.q}</span>
                  <span className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-none flex items-center justify-center transition-all bg-[#121214] border border-[#383842] ${isOpen ? 'rotate-180 border-white' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-white" />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-slate-300 text-xs sm:text-sm leading-relaxed font-sans font-medium">{faq.a}</p>
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
