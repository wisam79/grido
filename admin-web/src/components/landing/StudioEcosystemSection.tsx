import { Download, Printer, Layers, Cpu, ShieldCheck } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export function StudioEcosystemSection() {
  return (
    <section className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: 4-Core Feature Matrix */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-5 space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#00a3ff]">
                <Printer className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-normal font-serif text-[#f0f0f0]">محرك ألوان CMYK أصلي</h3>
              <p className="text-xs text-[#a1a4a5] leading-relaxed">
                تصدير بصيغ TIFF و JPEG بدقة 300 DPI مع أسود خالص K=100% لخطوط القص.
              </p>
            </div>

            <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-5 space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#00a3ff]">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-normal font-serif text-[#f0f0f0]">ترميم الوجه بالذكاء الاصطناعي</h3>
              <p className="text-xs text-[#a1a4a5] leading-relaxed">
                مسار معالجة مزدوج يدمج 65% وجه مرمم مع 35% مسام بشرة طبيعية.
              </p>
            </div>

            <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-5 space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#00a3ff]">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-normal font-serif text-[#f0f0f0]">شبكات كولاج وطباعة ذكية</h3>
              <p className="text-xs text-[#a1a4a5] leading-relaxed">
                توزيع فوري للأوراق بمقاسات A4 و 10×15 و 13×18 بدون أي هدر ورقي.
              </p>
            </div>

            <div className="rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-5 space-y-2.5">
              <div className="w-8 h-8 rounded bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#00a3ff]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-normal font-serif text-[#f0f0f0]">أوفلاين وأمان تام 100%</h3>
              <p className="text-xs text-[#a1a4a5] leading-relaxed">
                معالجة الصور على جهازك مباشرة لضمان أقصى سرعة وحماية خصوصية الزبائن.
              </p>
            </div>
          </div>

          {/* Right Column: Editorial Pitch */}
          <div className="lg:col-span-6 space-y-6 text-start">
            <div className="space-y-3">
              <span className="resend-badge font-mono">
                النظام البيئي المتكامل
              </span>
              <h2 className="text-3xl sm:text-5xl font-normal font-serif text-[#f0f0f0] tracking-tight leading-tight">
                منصة واحدة تدير كافة احتياجات الطباعة والمعاملات
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#a1a4a5] leading-relaxed max-w-lg">
              صُمم البرنامج ليربط بين استيراد الصور السريع، الترميم الذكي، وتوزيع الطباعة بدون أي هدر في الورق أو الحبر — مناسب للمطابع الكبرى والاستوديوهات ومكاتب الخدمات.
            </p>

            <div className="pt-2">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل البرنامج والبدء مجاناً</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


