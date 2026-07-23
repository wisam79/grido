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
    <section id="faq" className="relative py-24 border-t border-white/10 bg-ink-900/40">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400">الدعم</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black font-display">الأسئلة الشائعة</h2>
          <p className="mt-4 text-neutral-400">إليك الإجابات على أكثر الأسئلة شيوعاً حول برنامج Grido Studio</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl overflow-hidden border transition-colors ${
                  isOpen ? 'border-brand-500/30 bg-brand-500/[0.04]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-right font-semibold text-base flex items-center justify-between gap-4 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? 'text-white' : 'text-neutral-200'}>{faq.q}</span>
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-brand-500/20 rotate-180' : 'bg-white/5'}`}>
                    <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-brand-400' : 'text-neutral-400'}`} />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-neutral-400 text-sm leading-relaxed">{faq.a}</p>
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
