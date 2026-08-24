import { useState } from 'react';
import { Calculator, Clock, TrendingUp } from 'lucide-react';

export function RoiCalculator() {
  const [dailyClients, setDailyClients] = useState(25);
  const [sheetPrice, setSheetPrice] = useState(4000); // 4,000 Dinar per passport sheet

  const savedMinutesPerDay = Math.round(dailyClients * 5.5);
  const savedHoursPerMonth = Math.round((savedMinutesPerDay * 26) / 60);
  const monthlyExtraRevenue = Math.round(dailyClients * sheetPrice * 26 * 0.25);

  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Harmonized Charcoal Card */}
        <div className="w-full rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-6 sm:p-9 shadow-md relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <div className="ai-badge mb-3">
              <Calculator className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>حاسبة التوفير والعائد</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">
              كم ستوفر شهرياً مع استوديو جريدو؟
            </h2>
            <p className="text-xs sm:text-sm text-[#9E9E9E]">
              حرّك المؤشر لحساب الوقت والورق الموفر داخل الاستوديو.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Controls */}
            <div className="md:col-span-6 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="roi-clients" className="text-xs font-semibold text-white">عدد زبائن صور الهوية يومياً</label>
                  <span className="text-xs font-mono font-bold text-[#60a5fa] bg-[#141414] px-2.5 py-0.5 rounded border border-[#2C2C2C]">
                    {dailyClients} زبون
                  </span>
                </div>
                <input
                  id="roi-clients"
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={dailyClients}
                  onChange={(e) => setDailyClients(Number(e.target.value))}
                  aria-label={`عدد زبائن صور الهوية يومياً: ${dailyClients}`}
                  className="w-full h-2 bg-[#141414] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="roi-price" className="text-xs font-semibold text-white">سعر طقم الصور للزبون</label>
                  <span className="text-xs font-mono font-bold text-[#10b981] bg-[#141414] px-2.5 py-0.5 rounded border border-[#2C2C2C]">
                    {sheetPrice.toLocaleString()} دينار
                  </span>
                </div>
                <input
                  id="roi-price"
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={sheetPrice}
                  onChange={(e) => setSheetPrice(Number(e.target.value))}
                  aria-label={`سعر طقم الصور للزبون: ${sheetPrice.toLocaleString()} دينار`}
                  className="w-full h-2 bg-[#141414] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                />
              </div>
            </div>

            {/* Results Display */}
            <div className="md:col-span-6 grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2C2C2C] flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#60a5fa] mb-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">الوقت الموفر شهرياً</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {savedHoursPerMonth} <span className="text-xs text-[#9E9E9E] font-sans">ساعة</span>
                </div>
                <span className="text-[10px] text-[#9E9E9E] mt-1">تفرّغ لالتقاط صور أكثر</span>
              </div>

              <div className="p-4 rounded-xl bg-[#141414] border border-[#2C2C2C] flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#10b981] mb-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">عائد إضافي تقديري</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white">
                  +{monthlyExtraRevenue.toLocaleString()} <span className="text-[11px] text-[#9E9E9E] font-sans">دينار</span>
                </div>
                <span className="text-[10px] text-[#9E9E9E] mt-1">من تقليل هدر الورق</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
