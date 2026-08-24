import { Check, X, Sparkles, Zap, Clock, ShieldCheck, Flame, Scissors, Lock } from 'lucide-react';

const COMPARISONS = [
  {
    feature: 'الوقت المستغرق لتجهيز الزبون',
    legacy: '5 إلى 8 دقائق (قص يدوي في الفوتوشوب)',
    grido: '3 ثوانٍ فقط (عزل وتوزيع آلي فوري)',
    icon: Clock,
  },
  {
    feature: 'عزل الخلفيات وإزالة الهالات البيضاء',
    legacy: 'تحديد يدوي يترك حواف بيضاء خشنة',
    grido: 'عزل ذكي نقي مع Defringe تلقائي للضوء',
    icon: Sparkles,
  },
  {
    feature: 'مطابقة شروط الجوازات والفيزا العالمية',
    legacy: 'تخمين يدوي وقياسات قد ترفضها السفارات',
    grido: 'قوالب قياسية معتمدة بدقة المليمتر 100%',
    icon: ShieldCheck,
  },
  {
    feature: 'توزيع الصور ومصفوفة الطباعة',
    legacy: 'نسخ وتكرار يدوي مع هدر كبير في الورق',
    grido: 'حشر ذكي لأقصى استغلال مع خطوط قص 0.5mm',
    icon: Scissors,
  },
  {
    feature: 'خصوصية بيانات العملاء وسرية الصور',
    legacy: 'مواقع سحابية ترفع صور العملاء لخوادم خارجية',
    grido: '100% محلي على جهازك دون اتصال بالإنترنت',
    icon: Lock,
  },
  {
    feature: 'نموذج التكلفة والتراخيص',
    legacy: 'اشتراكات شهرية متكررة ومكلفة ترهق الاستوديو',
    grido: 'رخصة أصلية لمدى الحياة بدون أي رسوم إضافية',
    icon: Flame,
  },
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-32 relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <div className="ai-badge mb-4">
            <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>مقارنة السرعة والكفاءة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-5 tracking-tight">
            لماذا يختار المحترفون استوديو جريدو برو؟
          </h2>
          <p className="text-xs sm:text-base text-[#9E9E9E] max-w-2xl mx-auto leading-relaxed">
            مقارنة مباشرة وواقعية بين الطرق اليدوية القديمة وسير العمل فائق السرعة مع Grido Studio Pro.
          </p>
        </div>

        {/* High-Contrast Comparison Matrix (Fully Mobile Responsive) */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-[#2C2C2C] bg-[#1E1E1E] overflow-hidden shadow-xl">
          
          {/* Table Header Row */}
          <div className="grid grid-cols-12 bg-[#141414] p-3.5 sm:p-6 border-b border-[#2C2C2C] text-[11px] sm:text-sm font-bold text-white items-center">
            <div className="col-span-4 sm:col-span-5 text-start font-bold">المعيار</div>
            
            <div className="col-span-4 sm:col-span-3 text-center text-[#ef4444] flex items-center justify-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] hidden sm:inline" />
              <span>التقليدي</span>
            </div>
            
            <div className="col-span-4 sm:col-span-4 text-center text-[#3b82f6] flex items-center justify-center gap-1 font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#3b82f6] hidden sm:inline" />
              <span>Grido Studio</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#2C2C2C] text-xs sm:text-sm">
            {COMPARISONS.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.feature}
                  className={`grid grid-cols-12 p-3 sm:p-5 items-center gap-1 transition-colors ${
                    idx % 2 === 0 ? 'bg-[#1E1E1E]' : 'bg-[#171717]'
                  } hover:bg-[#242424]`}
                >
                  {/* Feature Title */}
                  <div className="col-span-4 sm:col-span-5 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0 hidden md:flex">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] sm:text-xs md:text-sm leading-tight">{row.feature}</span>
                  </div>

                  {/* Legacy Method */}
                  <div className="col-span-4 sm:col-span-3 text-center px-1">
                    <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-[#9E9E9E] leading-tight">
                      <X className="w-3 h-3 text-[#ef4444] shrink-0 hidden sm:inline" />
                      <span>{row.legacy}</span>
                    </div>
                  </div>

                  {/* Grido Studio Pro */}
                  <div className="col-span-4 sm:col-span-4 text-center px-1">
                    <div className="flex items-center justify-center gap-1 py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#141414] border border-[#2C2C2C] text-[10px] sm:text-xs font-semibold text-white leading-tight shadow-xs">
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
