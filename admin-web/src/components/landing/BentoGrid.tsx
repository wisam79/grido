import { useState, lazy, Suspense } from 'react';
import { Sparkles, Grid, ShieldCheck, Printer, Scissors, Check, Box } from 'lucide-react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SectionHeader } from './SectionHeader';

const Biometric3DCard = lazy(() => import('./Biometric3DCard').then((m) => ({ default: m.Biometric3DCard })));
const CMYK3DStack = lazy(() => import('./CMYK3DStack').then((m) => ({ default: m.CMYK3DStack })));

export function BentoGrid() {
  const [card1View, setCard1View] = useState<'photo' | '3d'>('photo');
  const [card4View, setCard4View] = useState<'sheet' | 'cmyk3d'>('sheet');

  return (
    <section id="capabilities" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <SectionHeader title="كل ما يحتاجه استوديو التصوير" description="أربع قدرات أساسية تغطي دورة العمل كاملة — من الصورة الخام إلى ورقة الطباعة الجاهزة" gap="lg" />

        {/* 4-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 reveal-stagger">

          {/* Card 1: Large (col-span-12 lg:col-span-8) - AI ID & Biometric Passport */}
          <div className="ds-card lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-primary/40 transition-all duration-300 shadow-md card-specular-edge spotlight-hover">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="ds-icon-tile w-10 h-10 text-brand-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    تجهيز صور الجوازات والفيزا فورياً
                  </h3>
                </div>

                {/* 2D / 3D Toggle */}
                <div role="group" aria-label="طريقة عرض معالجة الصور" className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-inset border border-border-subtle">
                  <button
                    type="button"
                    aria-pressed={card1View === 'photo'}
                    onClick={() => setCard1View('photo')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      card1View === 'photo'
                        ? 'bg-card-hover text-white shadow-xs'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    معاينة
                  </button>
                  <button
                    type="button"
                    aria-pressed={card1View === '3d'}
                    onClick={() => setCard1View('3d')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      card1View === '3d'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    <Box className="w-3 h-3" />
                    <span>مجسم 3D</span>
                  </button>
                </div>
              </div>

              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-5">
                عزل ذكي بدون هالات بيضاء مع ضبط نسب الرأس ومستوى العينين بضغطة زر.
              </p>
            </div>

            {/* Visual Container */}
            <div className="rounded-xl border border-border-subtle bg-inset overflow-hidden p-3.5">
              {card1View === '3d' ? (
                <div className="w-full aspect-[16/9] sm:aspect-[21/9]">
                  <ErrorBoundary fallback={<div className="w-full h-full min-h-[230px] rounded-lg bg-inset flex items-center justify-center text-xs text-text-secondary">تعذر تشغيل WebGL على هذا المتصفح</div>}>
                    <Suspense
                      fallback={
                        <div className="w-full h-full min-h-[230px] rounded-lg bg-inset flex items-center justify-center text-xs text-text-secondary">
                          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin me-2" />
                          <span>جاري تحميل المشهد ثلاثي الأبعاد...</span>
                        </div>
                      }
                    >
                      <Biometric3DCard />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                  {/* Photo with Biometric Overlays */}
                  <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-border-subtle aspect-[16/10] bg-black">
                    <img
                      src="/biometric-cutout-blend.jpg"
                      alt="عزل حيوي نقي بالذكاء الاصطناعي — حواف دقيقة للشعر"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/sample-passport-after.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-2.5">
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="bg-brand-primary text-white px-2 py-0.5 rounded font-bold text-[10px]">
                          عزل نقي
                        </span>
                        <span className="text-[10px] font-mono text-text-primary bg-black/70 px-2 py-0.5 rounded">
                          معتمد دولياً
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Step Indicator Flow */}
                  <div className="sm:col-span-5 flex flex-col justify-center gap-2 text-xs text-text-secondary">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border-subtle">
                      <span className="w-5 h-5 rounded-md bg-inset text-brand-light border border-border-subtle flex items-center justify-center font-mono font-bold text-[10px]">1</span>
                      <span className="text-white text-xs">تحديد معالم الوجه</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border-subtle">
                      <span className="w-5 h-5 rounded-md bg-inset text-brand-light border border-border-subtle flex items-center justify-center font-mono font-bold text-[10px]">2</span>
                      <span className="text-white text-xs">عزل الخلفية وتوحيد الإضاءة</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border-subtle">
                      <span className="w-5 h-5 rounded-md bg-inset text-status-success border border-border-subtle flex items-center justify-center font-mono font-bold text-[10px]">3</span>
                      <span className="text-white text-xs">طقم طباعة مع خطوط القص</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Medium (col-span-12 lg:col-span-4) - Smart Collage Canvas */}
          <div className="ds-card lg:col-span-4 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-primary/40 transition-all duration-300 shadow-md card-specular-edge spotlight-hover">
            <div>
              <div className="mb-3">
                <div className="ds-icon-tile w-10 h-10 text-brand-primary">
                  <Grid className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                صانع الكولاج والشبكات
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-5">
                كانفاس مرن بمحاذاة مغناطيسية وتحكم كامل بالطبقات بأي مقاس.
              </p>
            </div>

            {/* Mini Collage Grid Mockup — flex-1 يجعل المعاينة تمتص ارتفاع الصف
                الممتد بدل أن يبقى فراغ أسفلها عند مجاورة البطاقة الأطول. */}
            <div className="rounded-xl border border-border-subtle bg-inset p-3 flex flex-col justify-between flex-1 min-h-[140px]">
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                <div className="rounded-md bg-card border border-dashed border-brand-primary/40 flex items-center justify-center p-1.5 text-center">
                  <span className="text-[10px] font-mono text-brand-light">35×45mm</span>
                </div>
                <div className="rounded-md bg-card border border-dashed border-border-subtle flex items-center justify-center p-1.5 text-center">
                  <span className="text-[10px] font-mono text-text-secondary">35×45mm</span>
                </div>
                <div className="rounded-md bg-card border border-dashed border-border-subtle flex items-center justify-center p-1.5 text-center">
                  <span className="text-[10px] font-mono text-text-secondary">35×45mm</span>
                </div>
                <div className="rounded-md bg-card border border-dashed border-status-success/40 flex items-center justify-center p-1.5 text-center">
                  <span className="text-[10px] font-mono text-status-success">35×45mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Medium (col-span-12 lg:col-span-4) - Offline & Privacy */}
          <div className="ds-card lg:col-span-4 p-6 sm:p-7 flex flex-col justify-between hover:border-status-success/40 transition-all duration-300 shadow-md card-specular-edge spotlight-hover">
            <div>
              <div className="mb-3">
                <div className="ds-icon-tile w-10 h-10 text-status-success">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                خصوصية تامة دون إنترنت
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-5">
                جميع الصور تُعالج وتُحفظ محلياً على جهازك دون خوادم سحابية.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-inset p-3 flex flex-col justify-center gap-2 text-xs flex-1 min-h-[140px]">
              <div className="flex items-center justify-between p-2 rounded bg-card border border-border-subtle">
                <span className="text-[11px] text-white">الاتصال السحابي:</span>
                <span className="text-[10px] font-bold text-status-success">معطل (0 Uploads)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-card border border-border-subtle">
                <span className="text-[11px] text-white">تخزين الصور:</span>
                <span className="text-[10px] text-text-secondary">القرص المحلي فقط</span>
              </div>
            </div>
          </div>

          {/* Card 4: Wide (col-span-12 lg:col-span-8) - Print & Cutter Sheets */}
          <div className="ds-card lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between hover:border-status-warning/40 transition-all duration-300 shadow-md card-specular-edge spotlight-hover">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="ds-icon-tile w-10 h-10 text-status-warning">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    مراكز الطباعة وخطوط القص
                  </h3>
                </div>

                {/* 2D / 3D Toggle */}
                <div role="group" aria-label="طريقة عرض ورقة الطباعة" className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-inset border border-border-subtle">
                  <button
                    type="button"
                    aria-pressed={card4View === 'sheet'}
                    onClick={() => setCard4View('sheet')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      card4View === 'sheet'
                        ? 'bg-card-hover text-white shadow-xs'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    ورقة الطباعة
                  </button>
                  <button
                    type="button"
                    aria-pressed={card4View === 'cmyk3d'}
                    onClick={() => setCard4View('cmyk3d')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      card4View === 'cmyk3d'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    <Box className="w-3 h-3" />
                    <span>طبقات CMYK 3D</span>
                  </button>
                </div>
              </div>

              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-5">
                توزيع شبكي آلي مع خطوط قص 0.5mm لتقليل الهدر وسرعة القص.
              </p>
            </div>

            {/* Visual Container */}
            <div className="rounded-xl border border-border-subtle bg-inset overflow-hidden p-3.5">
              {card4View === 'cmyk3d' ? (
                <div className="w-full aspect-[16/9] sm:aspect-[21/9]">
                  <ErrorBoundary fallback={<div className="w-full h-full min-h-[230px] rounded-lg bg-inset flex items-center justify-center text-xs text-text-secondary">تعذر تشغيل WebGL على هذا المتصفح</div>}>
                    <Suspense
                      fallback={
                        <div className="w-full h-full min-h-[230px] rounded-lg bg-inset flex items-center justify-center text-xs text-text-secondary">
                          <div className="w-6 h-6 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin me-2" />
                          <span>جاري تحميل طبقات الألوان ثلاثية الأبعاد...</span>
                        </div>
                      }
                    >
                      <CMYK3DStack />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                  <div className="sm:col-span-7 relative rounded-lg overflow-hidden border border-border-subtle aspect-[16/9] bg-black">
                    <img
                      src="/studio-cutter-sheet.jpg"
                      alt="ورقة توزيع A4 بخطوط قص دقيقة من استوديو جريدو"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/cmyk-print-lab-macro.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-xs font-bold text-white bg-black/70 px-2 py-0.5 rounded">
                        توزيع A4 مع خطوط قص 0.5mm
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-5 flex flex-col justify-center gap-2 text-xs text-text-secondary">
                    <div className="flex items-center justify-between p-2 rounded bg-card border border-border-subtle">
                      <span className="text-white text-xs">هوامش الأمان:</span>
                      <span className="font-mono text-white text-xs font-bold">Safe 3mm</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-card border border-border-subtle">
                      <div className="flex items-center gap-1 text-white">
                        <Scissors className="w-3 h-3 text-brand-light" />
                        <span className="text-xs">خطوط القص:</span>
                      </div>
                      <span className="font-mono text-brand-light text-xs font-bold">0.5mm Auto</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-card border border-border-subtle">
                      <div className="flex items-center gap-1 text-white">
                        <Check className="w-3 h-3 text-status-success" />
                        <span className="text-xs">توفير الورق:</span>
                      </div>
                      <span className="font-mono text-status-success font-bold text-xs">حتى 35%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
