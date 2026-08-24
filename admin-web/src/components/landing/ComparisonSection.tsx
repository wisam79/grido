import { Check, X, Sparkles, Zap, Clock, ShieldCheck, Flame, Scissors, Lock } from 'lucide-react';

const COMPARISONS = [
  {
    feature: 'الوقت المستغرق لتجهيز الزبون',
    legacy: '5 إلى 8 دقائق (قص يدوي في الفوتوشوب)',
    grido: '3 ثوانٍ فقط (عزل وتوزيع آلي فوري)',
    icon: Clock,
  },
  {
    feature: 'عزل الخلفيات وإزالة الهالات',
    legacy: 'تحديد يدوي يترك حواف بيضاء خشنة',
    grido: 'عزل ذكي نقي مع تصفير الهالات',
    icon: Sparkles,
  },
  {
    feature: 'مطابقة شروط الجوازات والفيزا',
    legacy: 'تخمين يدوي قد ترفضه السفارات',
    grido: 'قوالب قياسية معتمدة 100%',
    icon: ShieldCheck,
  },
  {
    feature: 'توزيع الصور ومصفوفة الطباعة',
    legacy: 'نسخ وتكرار يدوي مع هدر في الورق',
    grido: 'توزيع ذكي مع خطوط قص 0.5mm',
    icon: Scissors,
  },
  {
    feature: 'خصوصية بيانات العملاء وسرية الصور',
    legacy: 'مواقع سحابية ترفع الصور لخوادم خارجية',
    grido: '100% محلي دون أي اتصال بالإنترنت',
    icon: Lock,
  },
  {
    feature: 'نموذج التكلفة والتراخيص',
    legacy: 'اشتراكات شهرية متكررة ترهق الاستوديو',
    grido: 'رخصة أصلية لمدى الحياة بدون رسوم',
    icon: Flame,
  },
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="ai-badge mb-3">
            <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>مقارنة السرعة والكفاءة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            لماذا يختار المحترفون استوديو جريدو؟
          </h2>
          <p className="text-xs sm:text-base text-[#9E9E9E] max-w-2xl mx-auto leading-relaxed">
            مقارنة مباشرة بين الطرق التقليدية البطيئة وسير العمل الفوري مع Grido Studio Pro.
          </p>
        </div>

        {/* Mobile View: Card-based Comparison (< sm) */}
        <div className="block sm:hidden space-y-3">
          {COMPARISONS.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.feature}
                className="p-4 rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-2 text-white font-bold text-xs pb-2 border-b border-[#2C2C2C]">
                  <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{row.feature}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Legacy */}
                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#2C2C2C] flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-[#ef4444] font-bold text-[10px] mb-1">
                      <X className="w-3 h-3" />
                      <span>التقليدي</span>
                    </div>
                    <span className="text-[#9E9E9E] leading-tight text-[10px]">{row.legacy}</span>
                  </div>

                  {/* Grido Studio */}
                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#3b82f6]/30 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-[#3b82f6] font-bold text-[10px] mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Grido Pro</span>
                    </div>
                    <span className="text-white font-semibold leading-tight text-[10px]">{row.grido}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet View: High-Contrast Matrix (>= sm) */}
        <div className="hidden sm:block max-w-4xl mx-auto rounded-2xl border border-[#2C2C2C] bg-[#1E1E1E] overflow-hidden shadow-md">
          
          {/* Table Header Row */}
          <div className="grid grid-cols-12 bg-[#141414] p-4 sm:p-5 border-b border-[#2C2C2C] text-xs sm:text-sm font-bold text-white items-center">
            <div className="col-span-5 text-start font-bold">المعيار</div>
            
            <div className="col-span-3 text-center text-[#ef4444] flex items-center justify-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              <span>التقليدي</span>
            </div>
            
            <div className="col-span-4 text-center text-[#3b82f6] flex items-center justify-center gap-1 font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>Grido Studio Pro</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#2C2C2C] text-xs sm:text-sm">
            {COMPARISONS.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.feature}
                  className={`grid grid-cols-12 p-4 items-center gap-1 transition-colors ${
                    idx % 2 === 0 ? 'bg-[#1E1E1E]' : 'bg-[#171717]'
                  } hover:bg-[#242424]`}
                >
                  {/* Feature Title */}
                  <div className="col-span-5 font-bold text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm leading-tight">{row.feature}</span>
                  </div>

                  {/* Legacy Method */}
                  <div className="col-span-3 text-center px-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#9E9E9E] leading-tight">
                      <X className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                      <span>{row.legacy}</span>
                    </div>
                  </div>

                  {/* Grido Studio Pro */}
                  <div className="col-span-4 text-center px-2">
                    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#141414] border border-[#2C2C2C] text-xs font-semibold text-white leading-tight">
                      <Check className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                      <span>{row.grido}</span>
                    </div>
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
