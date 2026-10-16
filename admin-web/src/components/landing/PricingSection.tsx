import { Check, Download, Headphones, Award } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '../../data/landing-content';
import { GITHUB_RELEASE_DOWNLOAD_URL } from '../../lib/version';
import { SectionHeader } from './SectionHeader';

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
    title: 'تفعيل فوري ودعم فني',
    desc: 'مفتاح ترخيص فوري مع مساعدة في التثبيت والإعداد على كافة أجهزتك من فريق الدعم.',
    icon: Headphones,
  },
];

interface PricingSectionProps {
  currency?: CurrencyCode;
}

export function PricingSection({ currency = 'IQD' }: PricingSectionProps) {
  const currentCurr = CURRENCIES[currency] || CURRENCIES.IQD;

  return (
    <section id="pricing" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* مبدّل العملة موحّد في حاسبة التوفير (#roi) أعلى الصفحة —
            إبقاء مبدّل ثانٍ هنا كان يشتت (مبدلان لنفس الغرض في صفحة واحدة) */}
        <SectionHeader title="استثمر مرة واحدة، واستفد للأبد" />

        {/* 2-Column Balanced Pricing Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Main Pricing Card (col-span-12 lg:col-span-7) */}
          <div className="lg:col-span-7 relative pt-3 flex flex-col">
            
            <div className="absolute -top-1 inset-x-0 mx-auto w-max z-20 bg-[#3b82f6] text-white text-[11px] sm:text-xs font-extrabold px-4 py-1 rounded-full whitespace-nowrap border border-white/20 shadow-md">
              <span>ترخيص مدى الحياة (Lifetime)</span>
            </div>

            <div className="rounded-2xl bg-[#1E1E1E] border border-[#3b82f6]/40 p-6 sm:p-8 shadow-xl relative hover:border-white/20 transition-all duration-300 flex-1 flex flex-col justify-between">
              
              <div className="text-center pb-5 border-b border-[#2C2C2C] mb-6 pt-2">
                <h3 className="text-2xl font-black text-white mb-1">Grido Studio</h3>
                <p className="text-xs text-[#9E9E9E] mb-5">النسخة الكاملة لاستوديوهات ومراكز الطباعة</p>

                {/* Price Row (Dynamic Currency) */}
                <div className="flex items-baseline justify-center gap-2.5 mb-2.5">
                  <span className="text-sm text-[#8A8A8A] line-through font-mono">
                    {currentCurr.originalPriceFormatted}
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    {currentCurr.priceFormatted}
                  </span>
                  <div className="flex flex-col items-start text-start">
                    <span className="text-sm font-bold text-[#3b82f6]">{currentCurr.unit}</span>
                  </div>
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

                <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-[#9E9E9E]">
                  <span>تنزيل فوري</span>
                </div>
              </div>

            </div>
          </div>

          {/* Value & Guarantees Side Panel —
              كان كل ضمان بطاقة رأسية بـ justify-between تدفع العنوان للأعلى والوصف للأسفل،
              فتبقى داخل البطاقة الممتدة فراغ ~70px في المنتصف. الآن صف أفقي موسّط رأسياً
              فيقرأ التمدد كحشوة متعمّدة بدل فجوة. */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 pt-3 reveal-stagger">
            {GUARANTEES.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  className="ds-card p-5 sm:p-6 flex items-center gap-4 flex-1 hover:border-[#3b82f6]/40 transition-colors shadow-sm"
                >
                  <div className="ds-icon-tile w-11 h-11 text-[#3b82f6]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white mb-1">{g.title}</h4>
                    <p className="text-xs text-[#9E9E9E] leading-relaxed">
                      {g.desc}
                    </p>
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
