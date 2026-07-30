import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'هل يعمل البرنامج بدون اتصال بالإنترنت؟',
    a: 'نعم! معظم الوظائف الأساسية مثل القص والتنسيق والطباعة وتوزيع صور الهوية تعمل محلياً 100% بدون أي اتصال بالإنترنت.',
  },
  {
    q: 'ما هي الطابعات المدعومة في Grido Studio؟',
    a: 'يدعم البرنامج كافة الطابعات الحرارية وطابعات الحبر المعملية والتجارية (Epson, Canon, DNP, HP, Noritsu) المتصلة بنظام الويندوز.',
  },
  {
    q: 'كيف يمكنني الحصول على مفتاح التفعيل الرسمي (Pro License)؟',
    a: 'يمكنك التواصل مع فريق الدعم الفني المباشر أو الوكيل المعتمد للحصول على تفعيل رسمي ودائم لجهاز الاستوديو الخاص بك.',
  },
  {
    q: 'هل يدعم البرنامج نمط ألوان المطابع CMYK؟',
    a: 'نعم، يدعم تحويل الألوان الحقيقي والتصدير بصيغ عالية الدقة (TIFF & High-JPEG 300DPI) مع فرض الأسود الخالص (K=100%) لخطوط القص.',
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
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">الأسئلة الشائعة</h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">إجابات سريعة ومباشرة لأصحاب الاستوديوهات.</p>
        </div>

        <div className="stagger-4 max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all duration-300 ${
                  isOpen 
                    ? 'border-white bg-elevated shadow-lg' 
                    : 'border-subtle bg-elevated/60 hover:border-white/30'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-right font-bold text-sm sm:text-base flex items-center justify-between gap-4 transition-colors text-white cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? 'text-white font-extrabold' : 'text-secondary'}>{faq.q}</span>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 bg-primary border border-subtle ${isOpen ? 'rotate-180 border-white' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-white" />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-secondary text-xs sm:text-sm leading-relaxed font-sans font-medium">{faq.a}</p>
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
