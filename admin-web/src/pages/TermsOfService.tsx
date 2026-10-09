import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Scale, ShieldAlert, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0f0f10] text-[#e0e0e0] font-sans antialiased selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Navigation Header */}
      <header className="border-b border-[#242426] bg-[#141416]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-base hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Grido Studio" className="w-7 h-7 object-contain" />
            <span>Grido Studio</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#9e9e9e] hover:text-white transition-colors bg-[#1e1e20] px-3 py-1.5 rounded-lg border border-[#2a2a2d]"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Title Badge */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full w-fit mb-4">
          <FileText className="w-3.5 h-3.5" />
          <span>وثيقة شروط الاستخدام الرسمية</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
          شروط الخدمة والاستخدام — Terms of Service
        </h1>
        <p className="text-xs text-[#8e8e93] mb-8 pb-6 border-b border-[#242426]">
          آخر تحديث: 9 أكتوبر 2026 · Last Updated: October 9, 2026
        </p>

        {/* Introduction */}
        <section className="mb-10 text-sm leading-relaxed space-y-4 text-[#c7c7cc]">
          <p>
            أهلاً بكم في <strong className="text-white">Grido Studio</strong>. باستخدامك لبرنامج سطح المكتب الخاص بنا أو زيارة موقعنا الإلكتروني{' '}
            <a href="https://grido.cloud-ip.cc" className="text-blue-400 underline underline-offset-4">https://grido.cloud-ip.cc</a>،
            فإنك توافق على الالتزام الكامل بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى التوقف عن استخدام البرنامج فوراً.
          </p>
          <p className="text-xs text-[#9a9aa0] bg-[#161618] p-4 rounded-xl border border-[#262629]">
            By accessing or using the <strong>Grido Studio</strong> desktop application and its online services (https://grido.cloud-ip.cc), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access or use the application.
          </p>
        </section>

        {/* Section 1: License Grant */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2>1. منح ترخيص الاستخدام (Software License Grant)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              تمنحك Grido Studio رخصة شخصية أو تجارية (حسب باقة الترخيص المشتراة) غير حصرية وغير قابلة للتحويل لتثبيت البرنامج وتشغيله على أجهزة الحواسيب المصرح بها:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li><strong>الاستخدام التجاري:</strong> يُصرح لأصحاب استوديوهات التصوير والمطابع باستخدام البرنامج في تجهيز وطباعة صور عملائهم وبيع المطبوعات الناتجة بحرية تامة دون أي إتاوات.</li>
              <li><strong>حظر الهندسة العكسية:</strong> يُحظر تماماً محاولة تفكيك الكود المصدري، أو كسر حماية التراخيص، أو إعادة بيع وتوزيع ملفات البرنامج الثنائية دون إذن خطي مسبق.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: User Content Ownership */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Scale className="w-5 h-5 text-blue-400" />
            <h2>2. ملكية محتوى المستخدم وتصاميمه (User Content Ownership)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              أنت المالك الحصري والوحيد لكافة الصور، والتصاميم، والشعارات، والملفات التي تستوردها أو تنشئها داخل البرنامج:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li>لا تدّعي Grido Studio أي حقوق ملكية فكرية على صورك أو أعمال عملائك الفوتوغرافية.</li>
              <li>تتحمل أنت وحدك المسؤولية القانونية الكاملة عن أي محتوى تقوم بمعالجته والتأكد من عدم انتهاكه لحقوق الآخرين أو القوانين المعمول بها.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Cloud AI & Fair Use */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2>3. خدمات الذكاء الاصطناعي وسياسة الاستخدام العادل (Cloud AI & Fair Use)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              تخضع ميزات الذكاء الاصطناعي السحابي (مثل ترميز الوجه وعزل الخلفيات المتقدم) لحصص استخدام يومية تعتمد على نوع الخطة (Free, Pro, Studio):
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li>تُجدد الحصص يومياً بنظام توقيت غرينتش العالمي (UTC).</li>
              <li>يُحظر استخدام برمجيات آلية أو سحب جماعي غير معتاد لخدمات الذكاء الاصطناعي قد يسبب ضغطاً غير عادل على البنية التحتية.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Limitation of Liability */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2>4. إخلاء المسؤولية وحدود الضمان (Limitation of Liability)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              يُقدم البرنامج "كما هو" (AS IS) وبأعلى معايير الاستقرار الهندسي:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li>
                لا تتحمل Grido Studio أي مسؤولية عن أي أضرار غير مباشرة أو خسائر تجارية ناتجة عن أعطال الطابعات الخارجية، أو نفاد الأحبار، أو إعدادات مقاسات الورق الخاطئة التي يختارها المستخدم.
              </li>
              <li>
                يجب على المستخدم دائماً إجراء تجربة طباعة على ورقة اختبارية قبل بدء طباعة كميات تجارية ضخمة.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Governing Law & Contact */}
        <section className="bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Mail className="w-5 h-5 text-sky-400" />
            <h2>5. الاستفسارات والتواصل (Contact Information)</h2>
          </div>
          <div className="text-xs leading-relaxed text-[#b5b5ba] space-y-2">
            <p>لأي استفسارات بخصوص شروط الخدمة أو طلبات التراخيص المؤسسية، يُرجى التواصل معنا عبر:</p>
            <div className="bg-[#121214] p-3 rounded-lg border border-[#222225] font-mono text-xs text-white">
              <p>الجهة المطورة: Grido Studio Team</p>
              <p>الموقع الإلكتروني: <a href="https://grido.cloud-ip.cc" className="text-blue-400">https://grido.cloud-ip.cc</a></p>
              <p>البريد الإلكتروني المعتمد: <a href="mailto:wisamsamir78@gmail.com" className="text-blue-400">wisamsamir78@gmail.com</a></p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#242426] py-8 text-center text-xs text-[#71717a]">
        <p>© {new Date().getFullYear()} Grido Studio. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
