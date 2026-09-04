import { Check, Sparkles, Download, ShieldCheck, Zap, Star, RefreshCw, Headphones, Award } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '../../data/landing-content';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const FEATURES = [
  'رخصة أصلية لمدى الحياة (Lifetime)',
  'تحديثات وتطويرات مجانية للأبد',
  'محرك عزل وترميم الوجوه بلا حدود',
  'تصدير فائق الدقة (300 DPI - CMYK)',
  'قوالب الجوازات والفيزا لكافة الدول',
  'صانع الكولاج والشبكات الحرة',
  'توفير الورق مع خطوط قص 0.5mm',
  'عمل محلي 100% دون إنترنت',
  'دعم فني مباشر وتفعيل فوري',
];

const GUARANTEES = [
  {
    title: 'استثمار لمرة واحدة',
    desc: 'تدفع المبلغ لمرة واحدة فقط وتمتلك البرنامج للأبد مع كافة التحديثات مجاناً دون أي اشتراكات.',
    icon: Award,
  },
  {
    title: 'ضمان استرجاع 14 يوماً',
    desc: 'جرب البرنامج بحرية؛ إن لم يناسبك، نضمن لك استرجاع المبلغ بالكامل دون أي تعقيدات.',
    icon: RefreshCw,
  },
  {
    title: 'تفعيل فوري ودعم فني',
    desc: 'مفتاح ترخيص فوري مع مساعدة في التثبيت والإعداد على كافة أجهزتك من فريق الدعم.',
    icon: Headphones,
  },
];

interface PricingSectionProps {
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
}

export function PricingSection({ currency = 'IQD', onCurrencyChange }: PricingSectionProps) {
  const currentCurr = CURRENCIES[currency] || CURRENCIES.IQD;

  return (
    <section id="pricing" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="ai-badge mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>باقة واحدة شفافة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2.5 tracking-tight">
            استثمر مرة واحدة، واستفد للأبد
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E] mb-5">
            لا اشتراكات شهرية ولا تكاليف خفية — ترخيص دائم لكافة أجهزتك.
          </p>

          {/* Currency Switcher Pill Bar */}
          {onCurrencyChange && (
            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#1E1E1E] border border-[#2C2C2C] shadow-sm">
              {(['IQD', 'SAR', 'USD'] as CurrencyCode[]).map((c) => {
                const isActive = currency === c;
                return (
                  <button
                    key={c}
                    onClick={() => onCurrencyChange(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#3b82f6] text-white shadow-sm'
                        : 'text-[#9E9E9E] hover:text-white hover:bg-white/[0.04]'
                    }`}
                    aria-pressed={isActive}
                  >
                    {CURRENCIES[c].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2-Column Balanced Pricing Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Main Pricing Card (col-span-12 lg:col-span-7) */}
          <div className="lg:col-span-7 relative pt-3 flex flex-col">
            
            <div className="absolute -top-1 inset-x-0 mx-auto w-max z-20 bg-[#3b82f6] text-white text-[11px] sm:text-xs font-extrabold px-4 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap border border-white/20 shadow-md">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>ترخيص مدى الحياة (Lifetime)</span>
            </div>

            <div className="rounded-2xl bg-[#1E1E1E] border border-[#3b82f6]/40 p-6 sm:p-8 shadow-xl relative hover:border-white/20 transition-all duration-300 flex-1 flex flex-col justify-between">
              
              <div className="text-center pb-5 border-b border-[#2C2C2C] mb-6 pt-2">
                <div className="flex items-center justify-center gap-1 mb-2 text-[#f59e0b]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-xs text-[#9E9E9E] ms-1 font-semibold">4.9/5 تقييم الاستوديوهات</span>
                </div>

                <h3 className="text-2xl font-black text-white mb-1">Grido Studio</h3>
                <p className="text-xs text-[#9E9E9E] mb-5">النسخة الكاملة لاستوديوهات ومراكز الطباعة</p>

                {/* Price Row (Dynamic Currency) */}
                <div className="flex items-baseline justify-center gap-2.5 mb-2.5">
                  <span className="text-sm text-[#666666] line-through font-mono">
                    {currentCurr.originalPriceFormatted}
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    {currentCurr.priceFormatted}
                  </span>
                  <div className="flex flex-col items-start text-start">
                    <span className="text-sm font-bold text-[#3b82f6]">{currentCurr.unit}</span>
                    <span className="text-[10px] text-[#9E9E9E]">{currentCurr.note}</span>
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-1 bg-[#141414] px-3 py-0.5 rounded-full border border-[#2C2C2C] text-[#10b981] text-[11px] font-semibold">
                  <Check className="w-3 h-3" />
                  <span>رخصة دائمة • بدون اشتراك شهري</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-2.5 mb-6 flex-1">
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
              <div>
                <a
                  href={GITHUB_RELEASE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full !h-12 text-sm sm:text-base justify-center mb-3 font-bold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
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

          {/* Value & Guarantees Side Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 pt-3">
            {GUARANTEES.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  className="p-5 sm:p-6 rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] flex flex-col justify-between flex-1 hover:border-white/20 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">{g.title}</h4>
                  </div>
                  <p className="text-xs text-[#9E9E9E] leading-relaxed">
                    {g.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
