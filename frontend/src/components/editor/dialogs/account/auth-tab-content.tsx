import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Warning,
  EnvelopeSimple,
  Key,
  Lock,
  User,
} from "@phosphor-icons/react";
import { GoogleIcon } from "@/components/ui/image-icons";
import type { useAuthForms } from "./use-auth-forms";

export type AuthFormsApi = ReturnType<typeof useAuthForms>;

/**
 * 🧭 تبويب المصادقة: Google OAuth، دخول/تسجيل بالبريد، كشف OTP،
 * واستعادة كلمة المرور بكود OTP — كان JSX هذا مضمّناً في AccountLicenseModal.
 */
export function AuthTabContent({ forms }: { forms: AuthFormsApi }) {
  const {
    authMode,
    setAuthMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    loadingGoogle,
    resending,
    resendCooldown,
    error,
    setError,
    showOtp,
    setShowOtp,
    otpCode,
    setOtpCode,
    showRecoveryOtp,
    setShowRecoveryOtp,
    recoveryOtp,
    setRecoveryOtp,
    newPassword,
    setNewPassword,
    handleGoogleLogin,
    handleResendOTP,
    handleAuth,
    handleResetPassword,
    handleVerifyRecovery,
  } = forms;

  return showRecoveryOtp ? (
    <form onSubmit={handleVerifyRecovery} className="space-y-3">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
          <Warning className="w-4 h-4 shrink-0" weight="duotone" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs font-bold text-foreground/90">البريد الإلكتروني</Label>
        <div className="relative">
          <EnvelopeSimple className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
          <Input
            type="email"
            placeholder="name@example.com"
            className="pr-9 h-9 text-xs rounded-lg"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-bold text-foreground/90">كود الاستعادة (OTP)</Label>
        <div className="relative">
          <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
          <Input
            type="text"
            placeholder="123456"
            maxLength={6}
            className="pr-9 h-9 text-xs tracking-widest text-center font-mono rounded-lg"
            required
            value={recoveryOtp}
            onChange={(e) => setRecoveryOtp(e.target.value)}
            dir="ltr"
          />
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          أدخل كود الاستعادة المكون من 6 أرقام المرسل إلى {email}
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-bold text-foreground/90">كلمة المرور الجديدة</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
          <Input
            type="password"
            placeholder="••••••••"
            className="pr-9 h-9 text-xs rounded-lg"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer"
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner className="w-4 h-4" size={16} />
            <span>جاري الحفظ ...</span>
          </>
        ) : (
          "حفظ كلمة المرور الجديدة وتسجيل الدخول"
        )}
      </Button>
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => {
            setShowRecoveryOtp(false);
            setError(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
        >
          إلغاء والعودة لتسجيل الدخول
        </button>
      </div>
    </form>
  ) : (
    <>
      {/* زر الدخول السريع عبر Google في مقدمة التفاعل */}
      <Button
        type="button"
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full h-9 text-xs font-bold gap-2.5 border-border/80 dark:border-white/15 bg-background hover:bg-muted/70 dark:bg-card/80 dark:hover:bg-accent rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
        disabled={loading || loadingGoogle}
      >
        {loadingGoogle ? (
          <>
            <Spinner className="w-4 h-4 text-primary" size={16} />
            <span>جاري الدخول عبر Google ...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-semibold text-foreground/90 group-hover:text-foreground">
              متابعة باستخدام Google
            </span>
          </>
        )}
      </Button>

      <div className="relative flex py-0.5 items-center">
        <div className="flex-grow border-t border-border/40"></div>
        <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-medium">أو بالبريد الإلكتروني</span>
        <div className="flex-grow border-t border-border/40"></div>
      </div>

      <form onSubmit={handleAuth} className="space-y-3">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
            <Warning className="w-4 h-4 shrink-0" weight="duotone" />
            <span>{error}</span>
          </div>
        )}
        {showOtp ? (
          <div className="space-y-2.5">
            <Label className="text-xs font-bold text-foreground/90">كود التحقق (OTP)</Label>
            <div className="relative">
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
              <Input
                type="text"
                placeholder="123456"
                maxLength={6}
                className="pr-9 h-9 text-xs tracking-widest text-center font-mono rounded-lg"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              تم إرسال الكود إلى {email}
            </p>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" size={16} />
                  <span>جاري تأكيد الكود ...</span>
                </>
              ) : (
                "تأكيد الكود وتسجيل الدخول"
              )}
            </Button>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 mt-2">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resending || resendCooldown > 0}
                className="text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {resending ? (
                  <span className="flex items-center gap-1">
                    <Spinner className="w-3.5 h-3.5 inline" size={14} /> جاري الإرسال ...
                  </span>
                ) : resendCooldown > 0 ? (
                  `إعادة الإرسال بعد (${resendCooldown} ث)`
                ) : (
                  "إعادة إرسال كود التحقق"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer font-medium"
              >
                تغيير البريد
              </button>
            </div>
          </div>
        ) : (
          <>
            {authMode === "register" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground/90">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                  <Input
                    placeholder="الاسم"
                    className="pr-9 h-9 text-xs rounded-lg"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground/90">البريد الإلكتروني</Label>
              <div className="relative">
                <EnvelopeSimple className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pr-9 h-9 text-xs rounded-lg"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground/90">كلمة المرور</Label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="text-[11px] text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pr-9 h-9 text-xs rounded-lg"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer"
              disabled={loading || loadingGoogle}
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" size={16} />
                  <span>{authMode === "login" ? "جاري تسجيل الدخول ..." : "جاري إنشاء الحساب ..."}</span>
                </>
              ) : authMode === "login" ? (
                "تسجيل الدخول"
              ) : (
                "إنشاء حساب"
              )}
            </Button>
          </>
        )}
      </form>

      <div className="text-center pt-2 border-t border-border/30">
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          className="text-xs text-primary hover:underline font-bold cursor-pointer"
        >
          {authMode === "login" ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
        </button>
      </div>
    </>
  );
}
