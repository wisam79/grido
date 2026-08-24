import { Sparkles, Grid, ShieldCheck, Printer, Scissors, Check, Lock, HardDrive, Layers } from 'lucide-react';

export function BentoGrid() {
  return (
    <section id="capabilities" className="py-20 md:py-28 relative scroll-mt-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
          <div className="ai-badge mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>القدرات الأساسية للاستوديو</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            كل ما يحتاجه استوديو التصوير
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            سير عمل فائق السرعة مخصص لمعالجة وطباعة صور الهوية بأقل مجهود وبأعلى جودة.
          </p>
        </div>

        {/* 4-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Large (col-span-12 lg:col-span-8) - AI ID & Biometric Passport */}
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] hover:border-white/20 transition-all duration-300 shadow-md">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      تجهيز صور الجوازات والفيزا فورياً
                    </h3>
                    <span className="text-xs text-[#9E9E9E]">عزل نقي ومطابقة كاملة لمعايير الجوازات الدولية (ICAO)</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#141414] text-[#60a5fa] border border-[#2C2C2C]">
                  0.02s
                </span>
              </div>

              <p className="text-[#9E9E9E] text-xs sm:text-sm leading-relaxed mb-6">
                يتعرف الذكاء الاصطناعي على ملامح الوجه تلقائياً، يعزل الخلفية بدون أي هالات بيضاء، ويضبط نسب الرأس ومستوى العينين بدقة متناهية.
              </p>
            </div>

            {/* Visual Container */}
            <div className="rounded-xl border border-[#2C2C2C] bg-[#141414] overflow-hidden p-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* Photo with Biometric Overlays */}
                <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-[#2C2C2C] aspect-[16/10] bg-black">
                  <img
                    src="/biometric-cutout-blend.jpg"
                    alt="Biometric Cutout AI Process"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/sample-passport.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-3">
                    <div className="flex items-center justify-between w-full text-xs">
                      <span className="bg-[#3b82f6] text-white px-2.5 py-0.5 rounded font-bold text-[10px]">
                        ✓ عزل نقي بدون هالة
                      </span>
                      <span className="text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded">
                        ICAO 9303 Compliant
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Step Indicator Flow */}
                <div className="sm:col-span-5 flex flex-col justify-center gap-2.5 text-xs text-[#9E9E9E]">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <span className="w-5 h-5 rounded-md bg-[#141414] text-[#60a5fa] border border-[#2C2C2C] flex items-center justify-center font-mono font-bold text-[10px]">1</span>
                    <span className="text-white text-xs font-medium">التعرف على معالم الوجه</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <span className="w-5 h-5 rounded-md bg-[#141414] text-[#60a5fa] border border-[#2C2C2C] flex items-center justify-center font-mono font-bold text-[10px]">2</span>
                    <span className="text-white text-xs font-medium">عزل الخلفية وتوحيد الإضاءة</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <span className="w-5 h-5 rounded-md bg-[#141414] text-[#10b981] border border-[#2C2C2C] flex items-center justify-center font-mono font-bold text-[10px]">3</span>
                    <span className="text-white text-xs font-medium">طقم طباعة A4 جاهز للمقص</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Card 2: Medium (col-span-12 lg:col-span-4) - Smart Collage Canvas */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] hover:border-white/20 transition-all duration-300 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                  <Grid className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#9E9E9E] bg-[#141414] px-3 py-1 rounded-full border border-[#2C2C2C]">
                  محرر حر
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                صانع الكولاج والشبكات الحرة
              </h3>
              <p className="text-[#9E9E9E] text-xs leading-relaxed mb-6">
                كانفاس مرن بمحاذاة مغناطيسية، فواصل تفاعلية، وتحكم كامل بالطبقات والنصوص بأي مقاس تريده.
              </p>
            </div>

            {/* Visual Mini Collage Layout Canvas (Replacing tiny pen icon) */}
            <div className="rounded-xl border border-[#2C2C2C] bg-[#141414] p-3.5 flex flex-col justify-between min-h-[170px]">
              
              {/* Mini Interactive 4-Photo Grid Mockup */}
              <div className="grid grid-cols-2 gap-2 flex-1 mb-2.5">
                <div className="rounded-lg bg-[#1E1E1E] border border-dashed border-[#3b82f6]/40 flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-mono text-[#60a5fa]">إطار 35×45mm</span>
                </div>
                <div className="rounded-lg bg-[#1E1E1E] border border-dashed border-[#2C2C2C] flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-mono text-[#9E9E9E]">إطار 35×45mm</span>
                </div>
                <div className="rounded-lg bg-[#1E1E1E] border border-dashed border-[#2C2C2C] flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-mono text-[#9E9E9E]">إطار 35×45mm</span>
                </div>
                <div className="rounded-lg bg-[#1E1E1E] border border-dashed border-[#10b981]/40 flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-mono text-[#10b981]">إطار 35×45mm</span>
                </div>
              </div>

              {/* Bottom Layer Status Pill */}
              <div className="flex items-center justify-between text-[10px] text-[#9E9E9E] bg-[#1E1E1E] px-2.5 py-1 rounded-lg border border-[#2C2C2C]">
                <div className="flex items-center gap-1.5 text-white">
                  <Layers className="w-3 h-3 text-[#60a5fa]" />
                  <span>محاذاة مغناطيسية نشطة</span>
                </div>
                <span className="text-[#10b981] font-bold">Snap 100%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Medium (col-span-12 lg:col-span-4) - Offline & Privacy Dashboard */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] hover:border-white/20 transition-all duration-300 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#10b981] bg-[#141414] px-3 py-1 rounded-full border border-[#2C2C2C]">
                  100% بدون إنترنت
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                خصوصية 100% دون إنترنت
              </h3>
              <p className="text-[#9E9E9E] text-xs leading-relaxed mb-6">
                جميع صور عملائك تُعالج محلياً على جهازك دون إرسال أي صورة إلى الإنترنت أو خوادم سحابية.
              </p>
            </div>

            {/* Visual Security Status Widget (Replacing empty box with tiny shield) */}
            <div className="rounded-xl border border-[#2C2C2C] bg-[#141414] p-3.5 space-y-2 text-xs min-h-[170px] flex flex-col justify-center">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                <div className="flex items-center gap-2 text-white">
                  <Lock className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="text-[11px] font-semibold">حالة الاتصال السحابي:</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#10b981] bg-[#141414] px-2 py-0.5 rounded border border-[#2C2C2C]">
                  معطل (0 Uploads)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                <div className="flex items-center gap-2 text-white">
                  <HardDrive className="w-3.5 h-3.5 text-[#60a5fa]" />
                  <span className="text-[11px] font-semibold">تخزين ومعالجة الصور:</span>
                </div>
                <span className="text-[10px] font-mono text-white">القرص المحلي فقط</span>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-[#9E9E9E]">أمان وسرية تامة لبيانات الاستوديو والزبائن</span>
              </div>
            </div>
          </div>

          {/* Card 4: Wide (col-span-12 lg:col-span-8) - Print & Cutter Sheets */}
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] hover:border-white/20 transition-all duration-300 shadow-md">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#f59e0b] shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      أدوات مراكز الطباعة وخطوط القص
                    </h3>
                    <span className="text-xs text-[#9E9E9E]">توفير الورق والأحبار بأعلى دقة ألوان</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#141414] text-[#f59e0b] border border-[#2C2C2C]">
                  توفير 35%
                </span>
              </div>

              <p className="text-[#9E9E9E] text-xs sm:text-sm leading-relaxed mb-6">
                حساب آلي لأقصى استغلال لمساحة الورق مع رسم خطوط قص دقيقة 0.5mm لتقليل الهدر وسرعة القص المكتبي.
              </p>
            </div>

            {/* Visual Sheet and Metrics */}
            <div className="rounded-xl border border-[#2C2C2C] bg-[#141414] overflow-hidden p-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* Cutter Sheet Image */}
                <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-[#2C2C2C] aspect-[16/9] bg-black">
                  <img
                    src="/studio-cutter-sheet.jpg"
                    alt="Studio Cutter Sheet"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/cmyk-print-lab-macro.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-bold text-white bg-black/70 px-2.5 py-0.5 rounded">
                      توزيع شبكي A4 مع خطوط قص 0.5mm
                    </span>
                  </div>
                </div>

                {/* 3 Metric Inset Cards */}
                <div className="sm:col-span-5 flex flex-col justify-center gap-2.5 text-xs text-[#9E9E9E]">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <div className="flex items-center gap-2 text-white">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      <span className="text-xs font-semibold">هوامش الأمان:</span>
                    </div>
                    <span className="font-mono text-white text-xs font-bold">Safe 3mm</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <div className="flex items-center gap-2 text-white">
                      <Scissors className="w-3.5 h-3.5 text-[#60a5fa]" />
                      <span className="text-xs font-semibold">خطوط القص:</span>
                    </div>
                    <span className="font-mono text-[#60a5fa] text-xs font-bold">0.5mm Auto</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2C2C2C]">
                    <div className="flex items-center gap-2 text-white">
                      <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      <span className="text-xs font-semibold">توفير الورق:</span>
                    </div>
                    <span className="font-mono text-[#10b981] font-bold text-xs">حتى 35%</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
