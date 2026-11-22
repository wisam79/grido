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
    <section
      id="faq"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 text-start lg:sticky lg:top-28">
            <SectionHeader
              eyebrow="استفسارات متكررة"
              title="الأسئلة الشائعة"
              description="إجابات واضحة حول التجربة المجانية، العمل المحلي، الطابعات المدعومة، والتفعيل."
              align="start"
              size="lg"
              gap="none"
            />

            <div className="landing-card mt-7 p-5">
              <p className="text-sm font-semibold text-text-primary leading-relaxed">
                هل لديك استفسار عن طابعتك أو التفعيل؟
              </p>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                تواصل معنا مباشرة وسنساعدك في الإعداد والتجربة.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-4 w-full sm:w-auto min-h-11 gap-2 text-sm"
              >
                <MessageCircle
                  className="w-4 h-4 shrink-0 text-[#25D366]"
                  aria-hidden="true"
                />
                <span>تواصل عبر واتساب</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 landing-card divide-y divide-white/[0.07] min-w-0 overflow-hidden">
            {FAQS.map((faq, index) => {
              const isOpen = openIdx === index;
              const questionId = `${accordionId}-question-${index}`;
              const answerId = `${accordionId}-answer-${index}`;

              return (
                <div
                  key={faq.q}
                  className={isOpen ? "bg-white/[0.02]" : undefined}
                >
                  <h3>
                    <button
                      id={questionId}
                      ref={(element) => {
                        questionRefs.current[index] = element;
                      }}
                      type="button"
                      onClick={() => setOpenIdx(isOpen ? null : index)}
                      onKeyDown={(event) => handleHeaderKeyDown(event, index)}
                      className="w-full min-h-15 px-5 sm:px-6 py-4 text-start flex items-center justify-between gap-4 text-sm font-semibold text-text-primary cursor-pointer hover:bg-white/[0.03] transition-colors duration-150 motion-reduce:transition-none"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                    >
                      <span className="leading-7">{faq.q}</span>
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 motion-reduce:transition-none ${
                          isOpen
                            ? "border-brand-primary/40 bg-brand-primary/15 text-brand-light"
                            : "border-white/10 bg-inset text-text-secondary"
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={answerId}
                    role="region"
                    aria-labelledby={questionId}
                    hidden={!isOpen}
                    className="px-5 sm:px-6 pb-5 text-sm text-text-secondary leading-7"
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
