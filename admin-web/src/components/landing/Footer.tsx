import { Link } from 'react-router-dom';
import { useAppVersion } from '../../lib/version';

export function Footer() {
  const version = useAppVersion();
  const displayVersion = version ? `v${version}` : 'v2.4';

  return (
    <footer className="bg-inset border-t border-border-subtle pt-14 pb-8 text-xs text-text-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-border-subtle">
          {/* Column 1: Brand */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/logo.png"
                alt="Grido Studio Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="text-sm font-bold text-white tracking-wide">
                Grido Studio
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm mb-4">
              البرنامج الرائد لمعالجة وطباعة صور الهوية والفيزا والكولاج بالذكاء الاصطناعي لاستوديوهات التصوير ومراكز الطباعة.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-status-success bg-card px-3 py-1 rounded-full border border-border-subtle">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              <span>جميع الأنظمة تعمل بكفاءة ({displayVersion} Ready)</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-white text-xs mb-3">التنقل السريع</h4>
            <ul className="space-y-2">
              <li><a href="#capabilities" className="hover:text-white transition-colors">القدرات الأساسية</a></li>
              <li><a href="#ai-engine" className="hover:text-white transition-colors">محرك الذكاء الاصطناعي</a></li>
              <li><a href="#windows-experience" className="hover:text-white transition-colors">تجربة ويندوز 11</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">الأسعار والتراخيص</a></li>
            </ul>
          </div>

          {/* Column 3: Support & Legal */}
          <div className="md:col-span-4">
            <h4 className="font-bold text-white text-xs mb-3">الدعم والأمان والخصوصية</h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة وتفعيل الترخيص</a></li>
              <li><Link to="/privacy" className="text-brand-light hover:text-white font-medium transition-colors">سياسة الخصوصية (Privacy Policy)</Link></li>
              <li><Link to="/terms" className="text-brand-light hover:text-white font-medium transition-colors">شروط الخدمة (Terms of Service)</Link></li>
              <li className="text-text-secondary">الخصوصية: 100% معالجة محلية لصور الطباعة</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-secondary">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} Grido Studio.
          </div>
          <div className="text-[11px] text-text-muted">
            برنامج سطح مكتب مخصص لنظام تشغيل Windows
          </div>
        </div>
      </div>
    </footer>
  );
}
