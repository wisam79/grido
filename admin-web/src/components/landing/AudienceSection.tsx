import { Camera, Printer, Palette, User, Users, Check } from 'lucide-react';

const AUDIENCES = [
  {
    title: 'استوديوهات التصوير',
    role: 'Photo Studios',
    desc: 'تجهيز الزبون في 3 ثوانٍ وعزل فوري بدون فوتوشوب.',
    icon: Camera,
    features: ['سرعة 3 ثوانٍ', 'عزل نقي بدون هالات', 'ترميم تلقائي للبشرة'],
  },
  {
    title: 'مراكز الطباعة والنسخ',
    role: 'Print Centers',
    desc: 'أقصى توفير في الورق مع خطوط قص جاهزة للمقص.',
    icon: Printer,
    features: ['توفير 35% ورق', 'ألوان CMYK', 'خطوط قص 0.5mm'],
  },
  {
    title: 'المصممون وصناع المحتوى',
    role: 'Designers',
    desc: 'صانع كولاج وتأطير سريع للبورتريه والشهادات.',
    icon: Palette,
    features: ['تحكم بالطبقات', 'تصدير 300 DPI', 'قوالب غير محدودة'],
  },
  {
    title: 'الأفراد وأصحاب المعاملات',
    role: 'Everyday Users',
    desc: 'تجهيز صور الفيزا والجوازات من المنزل بسهولة.',
    icon: User,
    features: ['معايير فيزا معتمدة', 'سهولة تامة', 'خصوصية محلية 100%'],
  },
];

export function AudienceSection() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="ai-badge mb-3">
            <Users className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>حلول مخصصة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2.5 tracking-tight">
            من يستفيد من استوديو جريدو؟
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            تسريع الإنتاجية وتوفير الوقت والتكاليف لمختلف الاحتياجات.
          </p>
        </div>

        {/* 4 Unified Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCES.map((aud) => {
            const Icon = aud.icon;
            return (
              <div
                key={aud.title}
                className="rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-md"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] mb-3.5 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    {aud.role}
                  </span>
                  <h3 className="text-base font-bold text-white mb-1">
                    {aud.title}
                  </h3>
                  <p className="text-xs text-[#9E9E9E] leading-relaxed mb-4">
                    {aud.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2C2C2C] space-y-1.5">
                  {aud.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#F5F5F5]">
                      <div className="w-4 h-4 rounded-md bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
