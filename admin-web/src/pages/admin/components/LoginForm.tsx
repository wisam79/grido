import { useId, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { AdminBrandMark } from './AdminBrandMark';

/**
 * LoginForm — شاشة تسجيل دخول لوحة الإدارة بهوية Grido Studio المكتبية (Fluent 2 Pure Charcoal).
 * مكوّن عرضي بحت (props-driven) بلا منطق شبكة.
 */

interface LoginFormProps {
  sbUrl: string;
  sbKey: string;
  email: string;
  password: string;
  loginLoading: boolean;
  onSbUrlChange: (v: string) => void;
  onSbKeyChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function LoginForm({
  sbUrl,
  sbKey,
  email,
  password,
  loginLoading,
  onSbUrlChange,
  onSbKeyChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSbKey, setShowSbKey] = useState(false);
  const baseId = useId();
  const urlId = `${baseId}-sb-url`;
  const keyId = `${baseId}-sb-key`;
  const emailId = `${baseId}-email`;
  const passwordId = `${baseId}-password`;

  const hasEnvConn = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  return (
    <div
      className="admin-shell min-h-screen bg-[#141414] text-[#f5f5f5] flex items-center justify-center p-4 sm:p-6 font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-[#202020] border border-[#333333] rounded-[10px] shadow-2xl overflow-hidden">
        {/* Desktop App Titlebar Header */}
        <div className="px-6 py-4 bg-[#1a1a1a] border-b border-[#333333]/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AdminBrandMark size={30} />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[#f5f5f5] tracking-tight truncate">
                Grido Studio
              </h1>
              <p className="text-[11px] text-[#a9afaf] truncate">
                بوابة إدارة التراخيص والخوادم السحابية
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-sm bg-[#2563eb]/15 border border-[#3b82f6]/35 text-[#93c5fd] text-[10px] font-mono uppercase shrink-0">
            Admin
          </span>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-right">
          {!import.meta.env.VITE_SUPABASE_URL && (
            <div className="space-y-1.5">
              <label
                htmlFor={urlId}
                className="text-xs font-medium text-[#c9cfcf] block"
              >
                رابط مشروع Supabase
              </label>
              <input
                id={urlId}
                type="url"
                dir="ltr"
                required
                value={sbUrl}
                onChange={(e) => onSbUrlChange(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="admin-input w-full h-9 px-3 text-xs font-mono"
              />
            </div>
          )}

          {!import.meta.env.VITE_SUPABASE_ANON_KEY && (
            <div className="space-y-1.5">
              <label
                htmlFor={keyId}
                className="text-xs font-medium text-[#c9cfcf] block"
              >
                مفتاح الواجهة العام (Anon Key)
              </label>
              <div className="relative">
                <input
                  id={keyId}
                  type={showSbKey ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={sbKey}
                  onChange={(e) => onSbKeyChange(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="admin-input w-full h-9 ps-10 pe-3 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSbKey((prev) => !prev)}
                  aria-pressed={showSbKey}
                  aria-label={showSbKey ? 'إخفاء مفتاح الواجهة' : 'إظهار مفتاح الواجهة'}
                  className="absolute inset-y-1 start-1 w-7 rounded-sm text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.06] flex items-center justify-center cursor-pointer"
                >
                  {showSbKey ? (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className={!hasEnvConn ? 'border-t border-[#333333]/75 pt-4 space-y-3.5' : 'space-y-3.5'}>
            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="text-xs font-medium text-[#c9cfcf] block"
              >
                البريد الإلكتروني للمسؤول
              </label>
              <input
                id={emailId}
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="admin@example.com"
                className="admin-input w-full h-9 px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={passwordId}
                className="text-xs font-medium text-[#c9cfcf] block"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input w-full h-9 ps-10 pe-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute inset-y-1 start-1 w-7 rounded-sm text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.06] flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="admin-btn-primary w-full h-9 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loginLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>جارٍ التحقق من الصلاحيات...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>تسجيل الدخول كمسؤول</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
