import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "./WhatsAppButton";
import { SectionHeader } from "./SectionHeader";

const FAQS = [
  {
    q: "هل أستطيع تجربة البرنامج مجاناً قبل الشراء؟",
    a: "نعم. جرّب أدوات القص والتأطير والكولاج والطباعة على جهازك قبل طلب الترخيص الدائم لمدى الحياة.",
  },
  {
    q: "هل يعمل البرنامج دون إنترنت؟",
    a: "القص وضبط المقاسات والكولاج والطباعة تعمل محلياً. تحتاج أدوات الذكاء الاصطناعي السحابية الاختيارية إلى اتصال عند استخدامها.",
  },
  {
    q: "ما هي الطابعات ومقاسات الورق المدعومة؟",
    a: "يمكن اختيار الطابعات المثبتة في ويندوز وضبط مقاس الورق والهوامش. يعتمد توفر المقاسات والنتيجة على تعريف الطابعة؛ جرّب طابعتك قبل الشراء.",
  },
  {
    q: "كيف يتم تفعيل الرخصة؟ وماذا لو غيرت الحاسوب؟",
    a: "تحصل على مفتاح رقمي لرخصة دائمة. يمكن نقل التفعيل عند تغيير الجهاز، ويمكن للدعم مساعدتك في الإعداد.",
  },
  {
    q: "هل تضمن القوالب قبول صور الجوازات والفيزا؟",
    a: "تتوفر قوالب لمقاسات شائعة، لكنها لا تضمن قبول الصورة. راجع تعليمات الجهة المستلمة ومقاسها وإضاءة الصورة قبل الطباعة.",
  },
  {
    q: "هل يحتاج البرنامج إلى خبرة في التصميم؟",
    a: "تساعد القوالب وأدوات الترتيب على بدء العمل دون تجهيز كل ورقة من الصفر. جرّب الأدوات للتأكد من ملاءمتها لطريقة عملك.",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const accordionId = useId();
  const questionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleHeaderKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let targetIndex: number;
    switch (event.key) {
      case "ArrowDown":
        targetIndex = (index + 1) % FAQS.length;
        break;
      case "ArrowUp":
        targetIndex = (index - 1 + FAQS.length) % FAQS.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = FAQS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    questionRefs.current[targetIndex]?.focus();
  };

  return (
    <section id="faq" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 text-start">
            <SectionHeader
              title="الأسئلة الشائعة"
              description="عن التجربة المجانية والعمل المحلي والطباعة والتفعيل."
              align="start"
              size="lg"
              gap="none"
            />

            <div className="mt-6 pt-6 border-t border-border-subtle">
              <p className="mb-3 text-sm text-text-secondary leading-relaxed">
                هل تحتاج مساعدة في الإعداد؟
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary min-h-11 gap-2 text-sm"
              >
                <MessageCircle
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                />
                <span>تواصل عبر واتساب</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 landing-card divide-y divide-border-subtle min-w-0">
            {FAQS.map((faq, index) => {
              const isOpen = openIdx === index;
              const questionId = `${accordionId}-question-${index}`;
              const answerId = `${accordionId}-answer-${index}`;

              return (
                <div key={faq.q}>
                  <h3>
                    <button
                      id={questionId}
                      ref={(element) => {
                        questionRefs.current[index] = element;
                      }}
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : index)}
                      onKeyDown={(event) => handleHeaderKeyDown(event, index)}
                      className="w-full min-h-14 px-5 py-4 rounded-lg text-start flex items-center justify-between gap-4 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-hover transition-colors duration-150 motion-reduce:transition-none"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                    >
                      <span className="leading-7">{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-text-secondary shrink-0 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={answerId}
                    role="region"
                    aria-labelledby={questionId}
                    hidden={!isOpen}
                    className="px-5 pb-5 text-sm text-text-secondary leading-7"
                  >
                    {faq.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
