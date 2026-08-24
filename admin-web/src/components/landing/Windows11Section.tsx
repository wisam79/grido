import { Monitor, Sliders, Cpu, Zap, HardDrive, Printer } from 'lucide-react';

const PERKS = [
  {
    title: 'واجهة داكنة مريحة لساعات العمل الطويلة',
    desc: 'تصميم أنيق وعصري يتكيف بسلاسة مع ويندوز 11 و 10 لراحة العين أثناء العمل اليومي.',
    icon: Monitor,
  },
  {
    title: 'إقلاع لحظي وخفة فائقة في الأداء',
    desc: 'يفتح بلمح البصر ويستهلك أقل من 120MB من الذاكرة ليبقى جهاز الكمبيوتر سريعاً وخفيفاً.',
    icon: Zap,
  },
  {
    title: 'حفظ تلقائي مستمر دون فقدان البيانات',
    desc: 'لا تقلق عند انقطاع الكهرباء المفاجئ؛ جميع أعمالك ومشاريعك تُحفظ تلقائياً ولن تضيع.',
    icon: HardDrive,
  },
  {
    title: 'متوافق مع كافة طابعات ومقصات الاستوديو',
    desc: 'طباعة فورية مباشرة لكافة طابعات الصور الحرارية والليزرية (DNP، Epson، Canon، Citizen).',
    icon: Printer,
  },
];

export function Windows11Section() {
  return (
    <section id="windows-experience" className="py-16 md:py-24 relative scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Right Column: Title & Feature List */}
          <div className="lg:col-span-6 flex flex-col items-start text-start">
            <div className="ai-badge mb-3">
              <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>سرعة وخفة فائقة</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-white mb-4 tracking-tight leading-[1.2]">
              برنامج خفيف وسريع، لا يثقل جهازك أبداً
            </h2>
            
            <p className="text-sm sm:text-base text-[#9E9E9E] mb-6 leading-relaxed font-normal">
              صُمم ليعمل بسلاسة وسرعة استجابة فورية حتى على أجهزة الكمبيوتر القديمة أو المتوسطة داخل الاستوديو دون أي تهنيج أو تعليق.
            </p>

            {/* 4 Feature Cards */}
            <div className="w-full space-y-3">
              {PERKS.map((perk) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={perk.title}
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] hover:border-white/20 transition-all duration-200 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0 mt-0.5 shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{perk.title}</h4>
                      <p className="text-xs text-[#9E9E9E] leading-relaxed font-normal">{perk.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Column: System Monitor Card */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="w-full max-w-lg rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-6 sm:p-8 shadow-md">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C] mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">كفاءة تشغيل الاستوديو</h4>
                    <span className="text-xs text-[#9E9E9E]">استجابة فورية بدون أي بطء</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#10b981] bg-[#141414] px-3 py-1 rounded-full border border-[#2C2C2C]">
                  جاهز للعمل فوراً
                </span>
              </div>

              {/* Metrics */}
              <div className="space-y-3 text-xs">
                
                {/* Metric 1: RAM */}
                <div className="p-3.5 rounded-xl bg-[#141414] border border-[#2C2C2C] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Zap className="w-4 h-4 text-[#3b82f6]" />
                      <span>خفة استهلاك الذاكرة</span>
                    </div>
                    <span className="font-mono text-[#10b981] font-bold text-xs">118 MB فقط (فائق الخفة)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
                    <div className="h-full w-[12%] bg-[#10b981] rounded-full" />
                  </div>
                </div>

                {/* Metric 2: Printing Quality */}
                <div className="p-3.5 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Cpu className="w-4 h-4 text-[#60a5fa]" />
                    <span>دقة وضوح ألوان الطباعة</span>
                  </div>
                  <span className="font-bold text-white text-xs bg-[#1E1E1E] px-2.5 py-1 rounded-lg border border-[#2C2C2C]">
                    ألوان مطابقة للشاشة 100%
                  </span>
                </div>

                {/* Metric 3: Safe Save */}
                <div className="p-3.5 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <HardDrive className="w-4 h-4 text-[#f59e0b]" />
                    <span>الحفظ التلقائي للصور</span>
                  </div>
                  <span className="text-[#9E9E9E] font-medium text-xs">
                    مفعل دائماً
                  </span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-5 pt-4 border-t border-[#2C2C2C] flex items-center justify-between text-xs text-[#9E9E9E]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                  <span className="text-white">يعمل على ويندوز 11 و 10 و 7</span>
                </div>
                <span className="text-[#60a5fa] font-bold text-xs">بدون إنترنت</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
