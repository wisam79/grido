import { useState, lazy, Suspense, type SyntheticEvent } from "react";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { SectionHeader } from "./SectionHeader";

const Biometric3DCard = lazy(() =>
  import("./Biometric3DCard").then((m) => ({ default: m.Biometric3DCard })),
);
const CMYK3DStack = lazy(() =>
  import("./CMYK3DStack").then((m) => ({ default: m.CMYK3DStack })),
);

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
    <div className="relative flex h-full min-h-[320px] items-center justify-center bg-inset p-6">
      <img
        src={
          kind === "identity"
            ? "/biometric-cutout-blend.jpg"
            : "/studio-cutter-sheet.jpg"
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
        className="relative rounded-lg bg-workspace/90 px-4 py-3 text-center text-xs leading-relaxed text-text-secondary"
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

  return (
    <section id="capabilities" className="landing-section relative">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="من الصورة إلى ورقة الطباعة"
          description="أدوات مترابطة لتجهيز صور الهوية، ترتيبها، وإخراجها بالمقاس المطلوب."
          gap="lg"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          <article className="landing-card flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 basis-56">
                <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                  تجهيز صور الهوية والفيزا
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
                  ضبط إطار الصورة ونسب الرأس والخلفية قبل الطباعة.
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
              className="landing-visual min-h-[320px] overflow-hidden"
            >
              {identityView === "3d" ? (
                <div className="h-[320px] sm:h-[340px]">
                  <ErrorBoundary
                    fallback={<ModelPreview kind="identity" failed />}
                  >
                    <Suspense fallback={<ModelPreview kind="identity" />}>
                      <Biometric3DCard />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid min-h-[320px] sm:min-h-[340px] sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                  <div className="relative min-h-[240px] overflow-hidden bg-workspace sm:min-h-0">
                    <img
                      src="/biometric-cutout-blend.jpg"
                      alt="مثال على تجهيز خلفية صورة هوية"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageFallback}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <ol className="flex flex-col justify-center gap-5 p-5 text-sm text-text-secondary sm:p-6">
                    {[
                      "تحديد إطار الوجه",
                      "تجهيز الخلفية والألوان",
                      "ترتيب الصور للطباعة",
                    ].map((step, index) => (
                      <li key={step} className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="font-mono text-xs text-brand-light"
                        >
                          0{index + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </article>

          <article className="landing-card flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-4">
            <div>
              <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                كولاج بمقاسك
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                خلايا قابلة للتخصيص مع محاذاة مغناطيسية وتحكم بالهوامش.
              </p>
            </div>
            <div className="landing-visual flex min-h-[248px] flex-1 flex-col justify-center gap-4 p-5">
              <div
                role="img"
                aria-label="مثال تخطيط كولاج بأربع خلايا متفاوتة الحجم"
                className="mx-auto grid aspect-[4/3] w-full max-w-[260px] grid-cols-5 grid-rows-2 gap-2 rounded-sm border border-white/10 bg-[#ebece9] p-3 shadow-sm"
                dir="ltr"
              >
                <div className="col-span-3 row-span-2 border border-[#688ba2]/45 bg-[#9db6c5]/70" />
                <div className="col-span-2 border border-[#94a4b2]/40 bg-[#d0d8df]" />
                <div className="col-span-1 border border-[#a7aaa1]/45 bg-[#c8cabb]" />
                <div className="col-span-1 border border-[#a5aca9]/45 bg-[#bac9c1]" />
              </div>
              <p className="text-center text-xs text-text-secondary">
                ترتيب حر أو شبكة منتظمة
              </p>
            </div>
          </article>

          <article className="landing-card flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-4">
            <div>
              <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                ملفاتك على جهازك
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                التحرير والتخطيط والطباعة محليًا، والخدمات السحابية عند
                استخدامها.
              </p>
            </div>
            <dl className="landing-visual flex min-h-[248px] flex-1 flex-col justify-center divide-y divide-border-subtle px-5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-text-secondary">المشاريع والصور</dt>
                <dd className="text-text-primary">تخزين محلي</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-text-secondary">التخطيط والطباعة</dt>
                <dd className="text-text-primary">دون اتصال</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <dt className="text-text-secondary">المعالجة السحابية</dt>
                <dd className="text-brand-light">عند الطلب</dd>
              </div>
            </dl>
          </article>

          <article className="landing-card flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 basis-56">
                <h3 className="text-lg font-semibold leading-snug text-text-primary sm:text-xl">
                  ورقة جاهزة للطباعة
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
                  توزيع محسوب، خطوط قص، وهوامش قابلة للضبط.
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
              className="landing-visual min-h-[320px] overflow-hidden"
            >
              {printView === "3d" ? (
                <div className="h-[320px] sm:h-[340px]">
                  <ErrorBoundary
                    fallback={<ModelPreview kind="print" failed />}
                  >
                    <Suspense fallback={<ModelPreview kind="print" />}>
                      <CMYK3DStack />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="grid min-h-[320px] sm:min-h-[340px] sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                  <div className="relative min-h-[240px] overflow-hidden bg-workspace sm:min-h-0">
                    <img
                      src="/studio-cutter-sheet.jpg"
                      alt="معاينة توزيع صور على ورقة طباعة بخطوط قص"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageFallback}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <dl className="flex flex-col justify-center divide-y divide-border-subtle px-5 text-sm sm:px-6">
                    <div className="flex flex-wrap justify-between gap-3 py-4">
                      <dt className="text-text-secondary">المقاس</dt>
                      <dd className="text-text-primary">قياسي أو مخصص</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-3 py-4">
                      <dt className="text-text-secondary">هوامش الأمان</dt>
                      <dd className="text-text-primary">قابلة للضبط</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-3 py-4">
                      <dt className="text-text-secondary">خطوط القص</dt>
                      <dd className="text-text-primary">تلقائية</dd>
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
