import { useState, lazy, Suspense, type SyntheticEvent } from "react";
import {
  Cloud,
  Crop,
  HardDrive,
  Layers,
  Lock,
  Printer,
  Scissors,
  SlidersHorizontal,
} from "lucide-react";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { SectionHeader } from "./SectionHeader";

const Biometric3DCard = lazy(() =>
  import("./Biometric3DCard").then((m) => ({ default: m.Biometric3DCard })),
);
const CMYK3DStack = lazy(() =>
  import("./CMYK3DStack").then((m) => ({ default: m.CMYK3DStack })),
);

type CollageLayoutKey = "mixed" | "id-grid" | "freeform";

const COLLAGE_LAYOUTS: Array<{
  key: CollageLayoutKey;
  label: string;
  specLabel: string;
  specMetric?: string;
  ariaLabel: string;
}> = [
  {
    key: "mixed",
    label: "مختلط",
    specMetric: "10×15",
    specLabel: "سم · 4 خلايا",
    ariaLabel: "مثال تخطيط كولاج مختلط بأربع خلايا متفاوتة الحجم",
  },
  {
    key: "id-grid",
    label: "شبكة 2×4",
    specMetric: "35×45 mm",
    specLabel: "· 8 صور",
    ariaLabel: "مثال تخطيط شبكة منتظمة بثماني صور هوية",
  },
  {
    key: "freeform",
    label: "كولاج حر",
    specLabel: "محاذاة مغناطيسية",
    ariaLabel: "مثال تخطيط كولاج حر ببطاقات متناسقة ومحاذاة مغناطيسية",
  },
];

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallback) return;
  image.dataset.fallback = "true";
  image.src = "/sample-passport-after.png";
}

function ModelPreview({
  kind,
  failed = false,
}: {
  kind: "identity" | "print";
  failed?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-[340px] items-center justify-center bg-inset p-6">
      <img
        src={
          kind === "identity"
            ? "/biometric-cutout-blend.jpg"
            : "/cmyk-print-lab-macro.jpg"
        }
        alt={
          kind === "identity"
            ? "معاينة تجهيز صورة الهوية"
            : "معاينة ورقة الطباعة"
        }
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        onError={handleImageFallback}
      />
      <p
        role="status"
        className="relative rounded-lg border border-white/10 bg-workspace/90 px-4 py-3 text-center text-xs leading-relaxed text-text-secondary backdrop-blur-sm"
      >
        {failed
          ? "العرض ثلاثي الأبعاد غير متاح. يمكنك العودة إلى المعاينة."
          : "جاري إعداد العرض ..."}
      </p>
    </div>
  );
}

export function BentoGrid() {
  const [identityView, setIdentityView] = useState<"photo" | "3d">("photo");
  const [printView, setPrintView] = useState<"sheet" | "3d">("sheet");
  const [collageLayout, setCollageLayout] = useState<CollageLayoutKey>("mixed");

  const activeCollage =
    COLLAGE_LAYOUTS.find((item) => item.key === collageLayout) ??
    COLLAGE_LAYOUTS[0];

  return (
    <section
      id="capabilities"
      className="landing-section landing-section-bordered relative"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="الإمكانات الأساسية"
          title="من الصورة إلى ورقة الطباعة"
          description="أدوات مترابطة لتجهيز صور الهوية، ترتيبها في كولاج دقيق، وإخراجها بالمقاس المطلوب للطباعة."
          gap="lg"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {/* Card 1: Identity & Visa Preparation */}
          <article className="landing-card landing-card-hoverable flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 basis-56">
                <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                  تجهيز صور الهوية والفيزا
                </h3>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-secondary">
                  ضبط إطار الصورة ونسب الرأس والخلفية بمقاسات قياسية أو مخصصة قبل
                  الطباعة.
                </p>
              </div>
              <div
                role="group"
                aria-label="طريقة عرض معالجة الصور"
                className="landing-switch shrink-0"
              >
                <button
                  type="button"
                  aria-pressed={identityView === "photo"}
                  aria-controls="identity-preview"
                  onClick={() => setIdentityView("photo")}
                >
                  معاينة
                </button>
                <button
                  type="button"
                  aria-pressed={identityView === "3d"}
                  aria-controls="identity-preview"
                  onClick={() => setIdentityView("3d")}
                >
                  مجسم 3D
                </button>
              </div>
            </div>

            <div
              id="identity-preview"
              className="landing-visual min-h-[340px] overflow-hidden"
            >
              {identityView === "3d" ? (
                <div className="h-[340px] sm:h-[360px]">
                  <ErrorBoundary
                    fallback={<ModelPreview kind="identity" failed />}
                  >
                    <Suspense fallback={<ModelPreview kind="identity" />}>
                      <Biometric3DCard />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid min-h-[340px] sm:min-h-[360px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="relative min-h-[250px] overflow-hidden bg-workspace sm:min-h-0">
                    <img
                      src="/biometric-cutout-blend.jpg"
                      alt="مثال على تجهيز خلفية صورة هوية مع خطوط المحاذاة"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageFallback}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent"
                    />
                    <div
                      dir="ltr"
                      className="absolute bottom-3 start-3 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur-md"
                    >
                      <span>35×45 mm</span>
                      <span className="text-white/35">·</span>
                      <span>50×50 mm</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                    <ol className="relative space-y-5">
                      {[
                        {
                          step: "01",
                          title: "تحديد إطار الوجه",
                          note: "محاذاة سريعة للرأس ومستوى العينين",
                        },
                        {
                          step: "02",
                          title: "تجهيز الخلفية والألوان",
                          note: "عزل محلي وتبديل فوري للخلفية والإضاءة",
                        },
                        {
                          step: "03",
                          title: "ترتيب الصور للطباعة",
                          note: "توزيع مباشر على مقاس ورق الطابعة",
                        },
                      ].map((item) => (
                        <li key={item.step} className="flex items-start gap-3.5">
                          <span
                            aria-hidden="true"
                            dir="ltr"
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-primary/30 bg-brand-primary/10 font-mono text-xs font-semibold text-brand-light"
                          >
                            {item.step}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-text-primary leading-snug">
                              {item.title}
                            </div>
                            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
                              {item.note}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4 text-[11px] text-text-secondary">
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        جوازات وهوية
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        فيزا ولوتري
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                        مقاسات مخصصة
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Card 2: Interactive Custom Collage */}
          <article className="landing-card landing-card-hoverable flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-4">
            <div>
              <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                كولاج بمقاسك
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                خلايا قابلة للتخصيص مع محاذاة مغناطيسية وتحكم دقيق بالهوامش.
              </p>
            </div>

            <div className="landing-visual flex min-h-[280px] flex-1 flex-col justify-between gap-4 p-4">
              {/* Interactive layout preset switcher */}
              <div
                role="group"
                aria-label="نمط معاينة الكولاج"
                className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.07] bg-workspace/90 p-1"
              >
                {COLLAGE_LAYOUTS.map((layout) => {
                  const isActive = layout.key === collageLayout;
                  return (
                    <button
                      key={layout.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setCollageLayout(layout.key)}
                      className={`min-h-11 rounded-md px-2 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-card-hover text-text-primary border border-white/15"
                          : "text-text-secondary hover:text-text-primary border border-transparent"
                      }`}
                    >
                      {layout.label}
                    </button>
                  );
                })}
              </div>

              {/* Precision Studio Sheet Canvas */}
              <div className="relative flex flex-1 items-center justify-center py-2">
                <div
                  role="img"
                  aria-label={activeCollage.ariaLabel}
                  dir="ltr"
                  className="relative mx-auto aspect-[15/10] w-full max-w-[264px] rounded-[4px] border border-white/20 bg-[#f6f7f9] p-2.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.85)]"
                >
                  {/* Magnetic snap crosshair indicator */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-1.5 left-1/2 border-l border-dashed border-brand-primary/50"
                  />

                  {collageLayout === "mixed" && (
                    <div className="grid h-full w-full grid-cols-5 grid-rows-2 gap-1.5">
                      <div className="col-span-3 row-span-2 overflow-hidden rounded-[2px] border border-brand-primary/50 bg-[#dbe4ec]">
                        <img
                          src="/sample-passport-after.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="col-span-2 overflow-hidden rounded-[2px] border border-slate-300 bg-[#e6ecf2]">
                        <img
                          src="/sample-passport-before.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="col-span-1 overflow-hidden rounded-[2px] border border-slate-300 bg-[#edf1f5]">
                        <img
                          src="/sample-passport-after.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="col-span-1 overflow-hidden rounded-[2px] border border-slate-300 bg-[#edf1f5]">
                        <img
                          src="/sample-passport-after.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    </div>
                  )}

                  {collageLayout === "id-grid" && (
                    <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-1.5">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-[2px] border border-slate-300 bg-white"
                        >
                          <img
                            src="/sample-passport-after.png"
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {collageLayout === "freeform" && (
                    <div className="relative h-full w-full">
                      <div className="absolute left-0 top-0 h-[70%] w-[52%] overflow-hidden rounded-[2px] border-2 border-brand-primary bg-white shadow-sm">
                        <img
                          src="/sample-passport-after.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="absolute right-0 top-[6%] h-[58%] w-[41%] overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-sm">
                        <img
                          src="/sample-passport-before.png"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="absolute bottom-0 right-[6%] flex h-[22%] w-[68%] items-center justify-center rounded-[2px] border border-dashed border-brand-primary/70 bg-brand-primary/10 font-mono text-[9px] font-semibold text-brand-hover">
                        SNAP 2.0mm
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-text-secondary">
                <span>ترتيب حر أو شبكة منتظمة</span>
                <span className="text-[11px] font-medium text-brand-light whitespace-nowrap">
                  {activeCollage.specMetric && (
                    <bdi dir="ltr" className="font-mono me-1">
                      {activeCollage.specMetric}
                    </bdi>
                  )}
                  {activeCollage.specLabel}
                </span>
              </div>
            </div>
          </article>

          {/* Card 3: Local-First Privacy Architecture */}
          <article className="landing-card landing-card-hoverable flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-4">
            <div>
              <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                ملفاتك على جهازك
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                التحرير والتخطيط والطباعة محلياً، والخدمات السحابية عند اختيارك
                استخدامها فقط.
              </p>
            </div>

            <div className="landing-visual flex min-h-[280px] flex-1 flex-col justify-between p-5">
              {/* Local vs Optional Cloud visual architecture */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-workspace/80 p-3.5">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-status-success/30 bg-status-success/10 text-status-success">
                    <HardDrive aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="whitespace-nowrap">
                    <div className="text-xs font-semibold text-text-primary">
                      جهازك
                    </div>
                    <div className="text-[11px] text-status-success">
                      عمل محلي
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="flex-1 min-w-4 border-t border-dashed border-white/25"
                />

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="whitespace-nowrap text-end">
                    <div className="text-xs font-semibold text-text-primary">
                      السحابة
                    </div>
                    <div className="text-[11px] text-brand-light">اختياري</div>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-primary/30 bg-brand-primary/10 text-brand-light">
                    <Cloud aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <dl className="mt-4 divide-y divide-white/[0.07] text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <dt className="flex items-center gap-2 text-text-secondary">
                    <Lock
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-text-muted"
                    />
                    <span>المشاريع والصور</span>
                  </dt>
                  <dd className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium text-text-primary">
                    تخزين محلي
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <dt className="flex items-center gap-2 text-text-secondary">
                    <Printer
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-text-muted"
                    />
                    <span>التخطيط والطباعة</span>
                  </dt>
                  <dd className="rounded-md border border-status-success/25 bg-status-success/10 px-2.5 py-0.5 text-xs font-medium text-status-success">
                    دون اتصال
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5">
                  <dt className="flex items-center gap-2 text-text-secondary">
                    <Cloud
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-text-muted"
                    />
                    <span>المعالجة السحابية</span>
                  </dt>
                  <dd className="rounded-md border border-brand-primary/30 bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-light">
                    عند الطلب
                  </dd>
                </div>
              </dl>
            </div>
          </article>

          {/* Card 4: Print-Ready Sheet & CMYK 3D */}
          <article className="landing-card landing-card-hoverable flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 basis-56">
                <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                  ورقة جاهزة للطباعة
                </h3>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-secondary">
                  توزيع محسوب، خطوط قص تلقائية، ودعم التصدير بدقة طباعة عالية مع
                  مساحات ألوان <bdi dir="ltr">sRGB</bdi> و{" "}
                  <bdi dir="ltr">CMYK</bdi>.
                </p>
              </div>
              <div
                role="group"
                aria-label="طريقة عرض ورقة الطباعة"
                className="landing-switch shrink-0"
              >
                <button
                  type="button"
                  aria-pressed={printView === "sheet"}
                  aria-controls="print-preview"
                  onClick={() => setPrintView("sheet")}
                >
                  ورقة الطباعة
                </button>
                <button
                  type="button"
                  aria-pressed={printView === "3d"}
                  aria-controls="print-preview"
                  onClick={() => setPrintView("3d")}
                >
                  طبقات CMYK 3D
                </button>
              </div>
            </div>

            <div
              id="print-preview"
              className="landing-visual min-h-[340px] overflow-hidden"
            >
              {printView === "3d" ? (
                <div className="h-[340px] sm:h-[360px]">
                  <ErrorBoundary fallback={<ModelPreview kind="print" failed />}>
                    <Suspense fallback={<ModelPreview kind="print" />}>
                      <CMYK3DStack />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid min-h-[340px] sm:min-h-[360px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="relative min-h-[250px] overflow-hidden bg-workspace sm:min-h-0">
                    <img
                      src="/cmyk-print-lab-macro.jpg"
                      alt="معاينة معايرة الطباعة وعلامات التسجيل اللونية CMYK"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageFallback}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent"
                    />
                    <div
                      dir="ltr"
                      className="absolute bottom-3 start-3 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/75 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur-md"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
                        <span className="h-2 w-2 rounded-full bg-[#ec4899]" />
                        <span className="h-2 w-2 rounded-full bg-[#facc15]" />
                        <span className="h-2 w-2 rounded-full bg-[#e5e7eb]" />
                      </span>
                      <span>300 DPI · CMYK</span>
                    </div>
                  </div>

                  <dl className="flex flex-col justify-center divide-y divide-white/[0.07] px-5 text-sm sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <dt className="flex items-center gap-2 text-text-secondary">
                        <Crop
                          aria-hidden="true"
                          className="h-4 w-4 text-brand-light"
                        />
                        <span>المقاس</span>
                      </dt>
                      <dd className="font-medium text-text-primary">
                        قياسي أو مخصص
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <dt className="flex items-center gap-2 text-text-secondary">
                        <SlidersHorizontal
                          aria-hidden="true"
                          className="h-4 w-4 text-brand-light"
                        />
                        <span>هوامش الأمان</span>
                      </dt>
                      <dd className="font-medium text-text-primary">
                        قابلة للضبط
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <dt className="flex items-center gap-2 text-text-secondary">
                        <Scissors
                          aria-hidden="true"
                          className="h-4 w-4 text-brand-light"
                        />
                        <span>خطوط القص</span>
                      </dt>
                      <dd className="font-medium text-text-primary">تلقائية</dd>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <dt className="flex items-center gap-2 text-text-secondary">
                        <Layers
                          aria-hidden="true"
                          className="h-4 w-4 text-brand-light"
                        />
                        <span>صيغ الإخراج</span>
                      </dt>
                      <dd dir="ltr" className="font-mono text-xs text-text-primary">
                        TIFF · PNG · JPEG
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
