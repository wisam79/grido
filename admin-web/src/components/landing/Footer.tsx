import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#141414] border-t border-[#2C2C2C] pt-14 pb-8 text-xs text-[#9E9E9E]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-[#2C2C2C]">
          {/* Column 1: Brand */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/logo.png"
                alt="Grido Studio Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="text-sm font-bold text-white tracking-wide">
                Grido Studio Pro
              </span>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed max-w-sm mb-4">
              البرنامج الرائد لمعالجة وطباعة صور الهوية والفيزا والكولاج بالذكاء الاصطناعي لاستوديوهات التصوير ومراكز الطباعة.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#10b981] bg-[#1E1E1E] px-3 py-1 rounded-full border border-[#2C2C2C]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>جميع الأنظمة تعمل بكفاءة (v2.4 Ready)</span>
            </div>
          </div>

          {/* Column 2: Links */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-white text-xs mb-3">المنتج والميزات</h4>
            <ul className="space-y-2">
              <li><a href="#capabilities" className="hover:text-white transition-colors">عزل الخلفيات الذكي (Defringe)</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">قوالب الجوازات والفيزا الدولية</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">صانع الكولاج ومصفوفة الطباعة</a></li>
              <li><a href="#windows-experience" className="hover:text-white transition-colors">تجربة وأداء ويندوز 11 الأصلي</a></li>
            </ul>
          </div>

          {/* Column 3: Support & Legal */}
          <div className="md:col-span-4">
            <h4 className="font-bold text-white text-xs mb-3">الدعم والأمان</h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة وتفعيل الترخيص</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">شروط الرخصة وضمان الاسترجاع</a></li>
              <li className="text-[#9E9E9E]">الخصوصية: 100% بدون خوادم سحابية خارجية</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#9E9E9E]">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} Grido Studio.
          </div>
          <div className="flex items-center gap-1">
            <span>صُنع بشغف للاستوديوهات الاحترافية</span>
            <Heart className="w-3 h-3 text-[#ef4444] fill-[#ef4444]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
