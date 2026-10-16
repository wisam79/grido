import { useState, useEffect, type CSSProperties } from 'react';
import { Calculator, Clock, TrendingUp } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '../../data/landing-content';

interface RoiCalculatorProps {
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
}

// حدود منزلق عدد الزبائن — مصدر واحد يغذّي المنزلق ونسبة التعبئة معاً
const CLIENT_MIN = 5;
const CLIENT_MAX = 150;
const CLIENT_STEP = 5;

export function RoiCalculator({ currency = 'IQD', onCurrencyChange }: RoiCalculatorProps) {
  const currentCurr = CURRENCIES[currency] || CURRENCIES.IQD;

  const [dailyClients, setDailyClients] = useState(25);
  const [sheetPrice, setSheetPrice] = useState(currentCurr.defaultRoiPrice);

  // Sync price defaults when currency changes
  useEffect(() => {
    setSheetPrice(currentCurr.defaultRoiPrice);
  }, [currency, currentCurr.defaultRoiPrice]);

  const savedMinutesPerDay = Math.round(dailyClients * 5.5);
  const savedHoursPerMonth = Math.round((savedMinutesPerDay * 26) / 60);
  const monthlyExtraRevenue = Math.round(dailyClients * sheetPrice * 26 * 0.25);

  // نسبة تعبئة المسار للقراءة البصرية السريعة (تحرس القسمة على صفر)
  const clientsFill = Math.round(((dailyClients - CLIENT_MIN) / (CLIENT_MAX - CLIENT_MIN)) * 100);
  const priceSpan = currentCurr.roiMaxPrice - currentCurr.roiMinPrice;
  // السعر يُقيَّد بمدى العملة الحالية: لحظة تبديل العملة يبقى السعر السابق حتى يزامنه
  // التأثير، فالقراءة المقيَّدة تمنع قفزة تعبئة خارج النطاق 0–100.
  const clampedSheetPrice = Math.min(currentCurr.roiMaxPrice, Math.max(currentCurr.roiMinPrice, sheetPrice));
  const priceFill = priceSpan > 0
    ? Math.round(((clampedSheetPrice - currentCurr.roiMinPrice) / priceSpan) * 100)
    : 0;

  return (
    <section id="roi" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Harmonized Charcoal Card */}
        <div className="ds-card w-full p-5 sm:p-8 shadow-md relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
            <div className="ai-badge mb-2.5">
              <Calculator className="w-3.5 h-3.5 text-brand-primary" />
              <span>حاسبة التوفير والعائد</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              كم ستوفر شهرياً مع استوديو جريدو؟
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-4">
              حرّك المؤشر لحساب الوقت والمال الموفر داخل الاستوديو بناءً على حجم زبائنك.
            </p>

            {/* Inline Currency Selector */}
            {onCurrencyChange && (
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-inset border border-border-subtle">
                {(['IQD', 'SAR', 'USD'] as CurrencyCode[]).map((c) => {
                  const isActive = currency === c;
                  return (
                    <button
                      key={c}
                      onClick={() => onCurrencyChange(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-card-hover text-white border border-white/10'
                          : 'text-text-secondary hover:text-white'
                      }`}
                      aria-pressed={isActive}
                    >
                      {CURRENCIES[c].symbol} {CURRENCIES[c].name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Controls */}
            <div className="md:col-span-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="roi-clients" className="text-xs font-semibold text-white">
                    زبائن صور الهوية يومياً
                  </label>
                  <span className="text-xs font-mono font-bold text-brand-light bg-inset px-2.5 py-0.5 rounded border border-border-subtle">
                    {dailyClients} زبون
                  </span>
                </div>
                <input
                  id="roi-clients"
                  type="range"
                  min={CLIENT_MIN}
                  max={CLIENT_MAX}
                  step={CLIENT_STEP}
                  value={dailyClients}
                  onChange={(e) => setDailyClients(Number(e.target.value))}
                  aria-label={`عدد زبائن صور الهوية يومياً: ${dailyClients}`}
                  style={{ '--range-fill': `${clientsFill}%` } as CSSProperties}
                  className="ds-range w-full [--range-accent:var(--grido-brand-primary)]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="roi-price" className="text-xs font-semibold text-white">
                    سعر طقم الصور للزبون ({currentCurr.unit})
                  </label>
                  <span className="text-xs font-mono font-bold text-status-success bg-inset px-2.5 py-0.5 rounded border border-border-subtle">
                    {sheetPrice.toLocaleString()} {currentCurr.unit}
                  </span>
                </div>
                <input
                  id="roi-price"
                  type="range"
                  min={currentCurr.roiMinPrice}
                  max={currentCurr.roiMaxPrice}
                  step={currentCurr.roiStep}
                  value={sheetPrice}
                  onChange={(e) => setSheetPrice(Number(e.target.value))}
                  aria-label={`سعر طقم الصور للزبون: ${sheetPrice.toLocaleString()} ${currentCurr.unit}`}
                  style={{ '--range-fill': `${priceFill}%` } as CSSProperties}
                  className="ds-range w-full [--range-accent:var(--grido-status-success)]"
                />
              </div>
            </div>

            {/* Results Display */}
            <div className="md:col-span-6 grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-inset border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-brand-light mb-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">الوقت الموفر شهرياً</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {savedHoursPerMonth} <span className="text-xs text-text-secondary font-sans">ساعة</span>
                </div>
                <span className="text-[10px] text-text-secondary mt-1">تفرّغ لأعمال إضافية</span>
              </div>

              <div className="p-4 rounded-xl bg-inset border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-status-success mb-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">عائد إضافي تقديري</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white">
                  +{monthlyExtraRevenue.toLocaleString()} <span className="text-[11px] text-text-secondary font-sans">{currentCurr.unit}</span>
                </div>
                <span className="text-[10px] text-text-secondary mt-1">من تقليل هدر الورق</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
