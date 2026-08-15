import { Layers, Wand2, Printer } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const WORKFLOW_NODES = [
  {
    title: 'الاستيراد والتوسيط التلقائي',
    subtitle: 'Auto-Crop & Biometric Centering',
    desc: 'بمجرد إسقاط صورة الزبون، يتعرف النظام تلقائياً على الوجه ومستوى العينين والأكتاف ويضبط مقاسات الهوية الرسمية (40×32 أو 35×45 أو الفيزا) بدقة بيومترية متناهية وبدون أي تدخل يدوي.',
    icon: Layers,
    badge: 'المرحلة 01',
  },
  {
    title: 'الترميم وعزل الخلفية بالذكاء الاصطناعي',
    subtitle: 'AI Restoration & Clean Background Swap',
    desc: 'تطبيق مسار المعالجة المزدوج (CodeFormer + Real-ESRGAN) لإعادة مسام البشرة الطبيعية وإصلاح الإضاءة القوية والظلال، مع عزل الخلفية وتطبيق اللون الأبيض أو الأزرق الرسمي بنقرة واحدة.',
    icon: Wand2,
    badge: 'المرحلة 02',
  },
  {
    title: 'الطباعة وتصدير CMYK بأسود خالص',
    subtitle: 'Commercial CMYK Print Engine (300 DPI)',
    desc: 'توزيع فوري لكافة الصور على ورق A4 أو 10×15 بدون أي هدر، مع تحويل ألوان المطابع الحقيقي وفرض الأسود الخالص (K=100%) على خطوط وأسياخ التقصي لمنع تلطخ الحبر.',
    icon: Printer,
    badge: 'المرحلة 03',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="مسار الإنتاج"
          title="من الصورة الخام إلى التسليم المطبوع في 3 ثوانٍ"
          subtitle="ثلاث خطوات هندسية متصلة توفر 90% من وقت الاستوديو وتضمن صفر أخطاء."
          index="01"
        />

        {/* Workflow Nodes */}
        <div className="max-w-4xl mx-auto mt-10 sm:mt-14 space-y-4">
          {WORKFLOW_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.title}
                className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center p-6 rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)]"
              >
                {/* Node Badge + Title */}
                <div className="sm:col-span-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center shrink-0 text-[#00a3ff]">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <span className="resend-badge font-mono">
                      {node.badge}
                    </span>
                    <h3 className="text-base sm:text-lg font-normal font-serif text-[#f0f0f0] leading-snug">
                      {node.title}
                    </h3>
                    <div className="text-xs font-mono text-[#a1a4a5]">{node.subtitle}</div>
                  </div>
                </div>

                {/* Node Detailed Description */}
                <div className="sm:col-span-7 sm:border-s sm:border-[rgba(214,235,253,0.1)] sm:ps-6">
                  <p className="text-sm text-[#a1a4a5] leading-relaxed">
                    {node.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

