import { Star, Quote, Building2, CheckCircle } from 'lucide-react';

const REVIEWS = [
  {
    quote: "برنامج Grido Studio وفر علينا وقت هائل في الاستوديو. كنا نقضي 10 دقائق في تجهيز كولاج الهويات لكل زبون، الآن تتم العملية بنقرة واحدة فقط!",
    author: "أحمد الفضلي",
    role: "مالك استوديو بابل للتصوير",
    location: "بغداد",
    rating: 5,
  },
  {
    quote: "خوارزمية ترميم الوجوه بالذكاء الاصطناعي (CodeFormer) مذهلة بمعنى الكلمة! الصور القديمة الباهتة تخرج بدقة عالية جداً وبدون تغيير في الملامح.",
    author: "عمر السامرائي",
    role: "مدير استوديو النجوم",
    location: "أربيل",
    rating: 5,
  },
  {
    quote: "التوافق مع طابعات Epson والدعم المباشر لأبعاد A4 والفيزا قضى تماماً على مشكلة هدر الأوراق والتجربة والخطأ التي كنا نعاني منها يومياً.",
    author: "حسين الموسوي",
    role: "فني طباعة واستوديو الهوية",
    location: "النجف",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative py-24 border-t border-white/10 bg-ink-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>تجارب حقيقية</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-white">
            ماذا يقول أصحاب الاستوديوهات؟
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            ثقة آلاف المصورين والمحترفين تعكس التزامنا بتقديم أفضل تجربة عمل يومية.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="relative p-8 rounded-3xl border border-white/10 bg-ink-900/50 backdrop-blur-md flex flex-col justify-between hover:border-brand-500/40 transition-all duration-300 hover:-translate-y-1 shadow-xl group"
            >
              <Quote className="absolute top-6 left-6 w-10 h-10 text-white/5 group-hover:text-brand-500/20 transition-colors" />

              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-6">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-neutral-200 text-sm sm:text-base leading-relaxed mb-8 relative z-10 font-medium">
                  "{rev.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-white/10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{rev.author}</div>
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                    <span>{rev.role}</span>
                    <span>•</span>
                    <span className="text-brand-400 font-semibold">{rev.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
