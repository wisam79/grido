import { ArrowLeft, Shield, Lock, Eye, RefreshCw, Trash2, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full w-fit mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>الوثيقة الرسمية للأمان والخصوصية</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
          سياسة الخصوصية — Privacy Policy
        </h1>
        <p className="text-xs text-[#8e8e93] mb-8 pb-6 border-b border-[#242426]">
          آخر تحديث: 9 أكتوبر 2026 · Last Updated: October 9, 2026
        </p>

        {/* Introduction */}
        <section className="mb-10 text-sm leading-relaxed space-y-4 text-[#c7c7cc]">
          <p>
            تلتزم <strong className="text-white">Grido Studio</strong> (المشار إليها بـ «نحن» أو «البرنامج»)، والمتاحة عبر الموقع الرسمي{' '}
            <a href="https://grido.cloud-ip.cc" className="text-blue-400 underline underline-offset-4">https://grido.cloud-ip.cc</a>،
            بحماية خصوصية وأمان بيانات مستخدميها لأقصى درجة. توضح هذه الوثيقة بوضوح وشفافية كيفية جمع، واستخدام، وحماية بياناتك عند استخدامك لبرنامج سطح المكتب
            أو خدماتنا الرقمية.
          </p>
          <p className="text-xs text-[#9a9aa0] bg-[#161618] p-4 rounded-xl border border-[#262629]">
            This Privacy Policy explains how <strong>Grido Studio</strong> collects, uses, and discloses your information when you use our desktop application and website (https://grido.cloud-ip.cc). We are strictly committed to safeguarding user data, adhering to global data protection laws (GDPR) and Google API Services User Data Policy.
          </p>
        </section>

        {/* Section 1: Google User Data */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Lock className="w-5 h-5 text-blue-400" />
            <h2>1. بيانات مستخدمي Google والمصادقة (Google OAuth Data)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              عند استخدامك لخيار «تسجيل الدخول بواسطة Google»، يطلب التطبيق الوصول فقط إلى البيانات الأساسية المصرح بها من قِبلكم عبر واجهة Google OAuth الرسمية:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li><strong>الاسم الكامل (Full Name):</strong> لعرضه في الملف الشخصي وإيصالات التراخيص.</li>
              <li><strong>البريد الإلكتروني (Email Address):</strong> كمعرّف وحيد لربط الترخيص وحصص الذكاء الاصطناعي اليومية.</li>
              <li><strong>الصورة الشخصية (Profile Picture URL):</strong> لعرضها في شريط عنوان التطبيق.</li>
            </ul>
            <div className="bg-[#1e1e23] border border-blue-500/20 rounded-xl p-4 mt-4">
              <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                الامتثال لسياسة بيانات مستخدم خدمات Google API:
              </h3>
              <p className="text-xs text-[#a1a1a6] leading-relaxed">
                استخدام Grido Studio ونقله للمعلومات المستلمة من Google APIs إلى أي تطبيق آخر سيلتزم كلياً بـ{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline underline-offset-2"
                >
                  Google API Services User Data Policy
                </a>
                ، بما في ذلك متطلبات الاستخدام المحدود (Limited Use requirements).
              </p>
              <p className="text-[11px] text-[#86868b] mt-2 italic">
                Grido Studio's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Local Processing & Media Files */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h2>2. خصوصية صور واستوديوهات الطباعة (Local Desktop Processing)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              نظراً لطبيعة عمل استوديوهات التصوير والمطابع وحساسية الصور الشخصية وصور العائلات:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li>
                <strong>معالجة محلية 100% افتراضياً:</strong> عمليات قص الكانفاس، تكرار بطاقات الصور، خطوط القص، والتصدير للطباعة (300+ DPI و CMYK و PDF)
                تتم كلياً على معالج وذاكرة جهاز الكمبيوتر الخاص بك، ولا تُرفع نهائياً لأي سيرفر خارجي.
              </li>
              <li>
                <strong>معالجة الذكاء الاصطناعي السحابي الاختيارية (Cloud AI):</strong> عند طلب ميزات الترميم المتقدم (CodeFormer) أو عزل الخلفيات السحابي،
                تُرسل الصورة عبر اتصال مشفر (TLS 1.3) إلى خوادم المعالجة، وتتم معالجتها في الذاكرة الحية (RAM) حصراً، ثم تعاد وتُحذف فوراً دون أي تخزين أو استخدام لتدريب نماذج الذكاء الاصطناعي.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: No Selling of Data */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <h2>3. حظر بيع أو مشاركة البيانات (No Sale of Personal Data)</h2>
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-[#b5b5ba]">
            <p className="font-semibold text-white">
              نحن نلتزم بشكل قاطع بما يلي:
            </p>
            <ul className="list-disc list-inside space-y-1 mr-2 text-[#d1d1d6]">
              <li>لا نقوم مطلقاً ببيع، أو تأجير، أو المتاجرة ببيانات المستخدمين أو حسابات Google مع أي طرف ثالث أو شبكات إعلانية.</li>
              <li>لا تُستخدم بيانات المستخدمين لأي أغراض تسويقية أو استهدافية خارج نطاق تقديم خدمة ترخيص البرنامج.</li>
              <li>لا نشارك بياناتك إلا بما يقتضيه تفعيل الترخيص عبر مزود قاعدة البيانات الآمن (Supabase) والمحمي بسياسات الوصول على مستوى الصفوف (Row Level Security).</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Data Retention & Deletion */}
        <section className="mb-10 bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h2>4. الاحتفاظ بالبيانات وحق الحذف الكامل (Data Retention & Deletion)</h2>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-[#b5b5ba]">
            <p>
              يحتفظ المستخدم بكامل السيطرة على حسابه وبياناته الرقمية:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mr-2 text-[#d1d1d6]">
              <li>
                <strong>حق الحذف الفوري:</strong> يحق لأي مستخدم في أي وقت طلب حذف حسابه وكافة بياناته المرتبطة به نهائياً من خوادمنا.
              </li>
              <li>
                <strong>كيفية طلب الحذف:</strong> يمكنك إرسال طلب الحذف مباشرة عبر البريد الإلكتروني المخصص للدعم:{' '}
                <a href="mailto:wisamsamir78@gmail.com" className="text-blue-400 font-mono font-bold">wisamsamir78@gmail.com</a>.
                سيتم تنفيذ الطلب ومسح كافة السجلات المرتبطة بالبريد خلال مهلة أقصاها 30 يوماً وتأكيد ذلك للمستخدم.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Security & Contact */}
        <section className="bg-[#161619] border border-[#27272b] rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-white font-bold text-base mb-4">
            <Mail className="w-5 h-5 text-sky-400" />
            <h2>5. التواصل ومسؤول الخصوصية (Contact Us)</h2>
          </div>
          <div className="text-xs leading-relaxed text-[#b5b5ba] space-y-2">
            <p>إذا كانت لديك أي استفسارات أو ملاحظات بخصوص سياسة الخصوصية أو معالجة البيانات، يسعدنا تواصلكم المباشر عبر:</p>
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
