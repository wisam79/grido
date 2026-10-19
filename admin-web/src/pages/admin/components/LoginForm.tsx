import type { FormEvent } from 'react';
import { LayoutGrid, Loader2, ShieldCheck } from 'lucide-react';

/**
 * LoginForm — شاشة الدخول، JSX منقول verbatim من AdminDashboard.tsx.
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
  return (
    <div
      className="admin-shell min-h-screen bg-[#121212] flex items-center justify-center p-6 relative overflow-hidden"
      dir="rtl"
    >
      {/* Ambient Aurora Glow */}
      <div className="aurora-bg" />

      <div className="w-full max-w-md app-mockup p-8 space-y-6 relative z-10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-white/5 text-white rounded-xl border border-[#2C2C2C]">
            <LayoutGrid className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black font-display text-white tracking-tight">GRIDO STUDIO</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-[#9E9E9E]">
            لوحة إدارة التراخيص والخوادم السحابية
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-right">
          {!import.meta.env.VITE_SUPABASE_URL && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">
                Supabase URL
              </label>
              <input
                type="url"
                required
                value={sbUrl}
                onChange={(e) => onSbUrlChange(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full px-3.5 py-2.5 text-xs border border-[#2C2C2C] rounded-xl bg-[#1E1E1E] text-white focus:outline-none focus:border-white font-mono"
              />
            </div>
          )}

          {!import.meta.env.VITE_SUPABASE_ANON_KEY && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">
                Anon Key
              </label>
              <input
                type="password"
                required
                value={sbKey}
                onChange={(e) => onSbKeyChange(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full px-3.5 py-2.5 text-xs border border-[#2C2C2C] rounded-xl bg-[#1E1E1E] text-white focus:outline-none focus:border-white font-mono"
              />
            </div>
          )}

          <div className="border-t border-[#2C2C2C] my-4 pt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">البريد الإلكتروني للمسؤول</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2.5 text-xs border border-[#2C2C2C] rounded-xl bg-[#1E1E1E] text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs border border-[#2C2C2C] rounded-xl bg-[#1E1E1E] text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 magnetic-pill"
          >
            {loginLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>تسجيل الدخول كمسؤول</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
