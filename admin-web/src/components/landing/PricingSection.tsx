import { Check, Sparkles, Download, ShieldCheck, Zap, Star } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const FEATURES = [
  'رخصة أصلية كاملة لمدى الحياة (Lifetime)',
  'تحديثات وتطويرات مستمرة مجاناً للأبد',
  'محرك عزل وترميم الوجوه بالذكاء الاصطناعي بلا حدود',
  'تصدير فائق الدقة (300 DPI مع إدارة ألوان CMYK)',
  'قوالب الجوازات والفيزا لكافة دول العالم',
  'صانع الكولاج والشبكات الحرة ومحرر الطبقات',
  'توفير الورق مع خطوط قص آلية 0.5mm',
  'عمل محلي 100% دون الحاجة للإنترنت',
  'دعم فني مباشر وتفعيل فوري على Windows 11 و 10',
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="ai-badge mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>باقة واحدة شفافة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            استثمر مرة واحدة، واستفد للأبد
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            لا اشتراكات شهرية، ولا تكاليف خفية. رخصة أصلية تمنحك كافة إمكانيات الاستوديو.
          </p>
        </div>

        {/* Centralized Pricing Card */}
        <div className="max-w-lg mx-auto relative pt-4">
          
          {/* Floating Badge */}
          <div className="absolute top-0 start-1/2 -translate-x-1/2 z-20 bg-[#3b82f6] text-white text-[11px] sm:text-xs font-extrabold px-4 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap border border-white/20">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>ترخيص مدى الحياة (Lifetime License)</span>
          </div>

          <div className="rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-6 sm:p-9 shadow-md relative hover:border-white/20 transition-all duration-300">
            
            <div className="text-center pb-5 border-b border-[#2C2C2C] mb-6 pt-1">
              <div className="flex items-center justify-center gap-1 mb-2 text-[#f59e0b]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-current" />
                ))}
                <span className="text-xs text-[#9E9E9E] ms-1 font-semibold">4.9/5 تقييم الاستوديوهات</span>
              </div>

              <h3 className="text-2xl font-black text-white mb-1">Grido Studio Pro</h3>
              <p className="text-xs text-[#9E9E9E] mb-5">النسخة الكاملة لاستوديوهات ومراكز الطباعة</p>

              {/* Price Row in Dinar */}
              <div className="flex items-baseline justify-center gap-2.5 mb-2.5">
                <span className="text-sm text-[#666666] line-through font-mono">150,000</span>
                <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">75,000</span>
                <div className="flex flex-col items-start text-start">
                  <span className="text-sm font-bold text-[#3b82f6]">دينار</span>
                  <span className="text-[10px] text-[#9E9E9E]">دفع لمرة واحدة فقط</span>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-1 bg-[#141414] px-3 py-0.5 rounded-full border border-[#2C2C2C] text-[#10b981] text-[11px] font-semibold">
                <Check className="w-3 h-3" />
                <span>رخصة دائمة لمدى الحياة • بدون اشتراك شهري</span>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-2.5 mb-7">
              {FEATURES.map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-xs sm:text-sm text-white">
                  <div className="w-4 h-4 rounded bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="leading-normal">{feat}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA Button */}
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full !h-12 text-sm sm:text-base justify-center mb-4 font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل وتفعيل رخصتك الآن</span>
            </a>

            {/* Guarantee Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-[#9E9E9E]">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#3b82f6]" />
                <span>تنزيل فوري</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                <span>ضمان استرجاع 14 يوماً</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
