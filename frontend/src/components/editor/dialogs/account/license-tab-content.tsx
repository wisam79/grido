import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/huge-icon";
import { Warning, Key, ShieldCheck, DownloadSimple, ArrowSquareOut } from "@phosphor-icons/react";
import { ExportSupportLogs } from "../../../../../wailsjs/go/main/App";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/store/slices/license-slice";

interface LicenseTabContentProps {
  user: UserProfile | null;
  licenseActive: boolean;
  onActivate: (key: string) => Promise<void>;
  onClearError: () => void;
  error: string | null;
  onError: (msg: string) => void;
}

/**
 * 🧭 تبويب الترخيص: بطاقة النسخة المفعلة مع نسخ المفتاح، نموذج التفعيل
 * باللصق من الحافظة، وشريط السجلات والشراء — كان JSX هذا مضمّناً في
 * AccountLicenseModal.
 */
export function LicenseTabContent({
  user,
  licenseActive,
  onActivate,
  onClearError,
  error,
  onError,
}: LicenseTabContentProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onClearError();
    try {
      await onActivate(licenseKey.trim());
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "مفتاح الترخيص غير صالح. يرجى التحقق من الصيغة.");
      onError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {user && (user.plan === "pro" || user.plan === "enterprise") ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 text-center space-y-2.5 fluent-specular">
          <div className="inline-flex p-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30 shadow-2xs">
            <ShieldCheck className="w-6 h-6 shrink-0" weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">النسخة مفعلة بنجاح</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">الباقة: {user.plan === "pro" ? "Pro احترافي" : "Enterprise"}</p>
          </div>

          {user.licenseKey && (
            <div className="bg-background/80 border border-border/80 rounded-lg p-2 text-center text-xs flex items-center justify-between px-3">
              <div>
                <span className="text-muted-foreground ml-1 font-medium">مفتاح التفعيل:</span>
                <code className="font-mono text-primary font-bold text-xs">{user.licenseKey}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(user.licenseKey || "");
                  toast.success("تم نسخ المفتاح إلى الحافظة");
                }}
                className="text-xs text-primary hover:underline font-bold cursor-pointer"
              >
                نسخ
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleActivate} className="space-y-3.5">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
              <Warning className="w-4 h-4 shrink-0" weight="duotone" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-foreground/90">مفتاح الترخيص (License Key)</Label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setLicenseKey(text.trim().toUpperCase());
                      toast.success("تم لصق المفتاح من الحافظة");
                    }
                  } catch {
                    toast.error("يرجى لصق المفتاح يدوياً");
                  }
                }}
                className="text-[11px] text-primary hover:underline font-bold cursor-pointer flex items-center gap-1"
              >
                <span>لصق من الحافظة 📋</span>
              </button>
            </div>
            <div className="relative">
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
              <Input
                placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                className="pr-9 h-9 text-xs font-mono uppercase rounded-lg tracking-wider"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
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
                <span>جاري تفعيل الترخيص ...</span>
              </>
            ) : (
              "تفعيل مفتاح الترخيص"
            )}
          </Button>
        </form>
      )}

      {/* 🔹 الشريط السفلي للإجراءات والمعلومات */}
      <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-3">
        <button
          type="button"
          onClick={async () => {
            try {
              const path = await ExportSupportLogs();
              if (path) {
                toast.success(`تم حفظ السجلات بنجاح في: ${path}`);
              }
            } catch (e) {
              toast.error((e as Error)?.message || "فشل تصدير السجلات");
            }
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
        >
          <DownloadSimple className="w-3.5 h-3.5 shrink-0" weight="bold" />
          <span>السجلات</span>
        </button>

        <a
          href="https://grido.cloud-ip.cc"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
        >
          <span>شراء ترخيص</span>
          <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
        </a>
      </div>
    </div>
  );
}
