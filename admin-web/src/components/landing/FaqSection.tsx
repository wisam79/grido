import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <section id="faq" className="relative py-12 sm:py-24 border-t border-white/10 bg-gradient-to-b from-[#181818] via-[#1a2130] to-[#181818] overflow-hidden">
      {/* Studio Blue Left Ambient Accent Glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-sky-500/15 rounded-full blur-[120px] sm:blur-[160px] pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-bold shadow-md">
            الدعم الفني والأسئلة
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white drop-shadow-md">الأسئلة الشائعة</h2>
          <p className="mt-2.5 text-slate-300 text-xs sm:text-base font-medium">إليك الإجابات على أكثر الأسئلة شيوعاً حول برنامج Grido Studio</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-300 ${
                  isOpen 
                    ? 'border-sky-400/60 bg-gradient-to-b from-[#252f44] to-[#1d2638] shadow-[0_0_20px_rgba(56,189,248,0.2)]' 
                    : 'border-sky-400/20 bg-gradient-to-b from-[#242936] to-[#1c2230] hover:border-sky-400/40 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-4 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? 'text-white drop-shadow-xs' : 'text-slate-200'}>{faq.q}</span>
                  <span className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-sky-500/20 rotate-180 border border-sky-400/40' : 'bg-white/5 border border-white/10'}`}>
                    <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-sky-300' : 'text-slate-400'}`} />
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
