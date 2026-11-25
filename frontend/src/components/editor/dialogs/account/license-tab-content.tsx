import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import { Key, ShieldCheck, DownloadSimple, ArrowSquareOut } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toErrorMessage } from '@/lib/wails-error';

import { AccountErrorAlert } from './account-error-alert';

import { ExportSupportLogs } from '../../../../../wailsjs/go/main/App';
import { BrowserOpenURL } from '../../../../../wailsjs/runtime/runtime';

import type { UserProfile } from '@/lib/store/slices/license-slice';

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
  licenseActive: _licenseActive,
  onActivate,
  onClearError,
  error,
  onError,
}: LicenseTabContentProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onClearError();
    try {
      await onActivate(licenseKey.trim());
    } catch (err) {
      if (!isMountedRef.current) return;
      const errMsg = toErrorMessage(err, 'مفتاح الترخيص غير صالح.');
      onError(errMsg);
      toast.error(errMsg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {user && (user.plan === 'pro' || user.plan === 'enterprise') ? (
        <div className="bg-success/5 border border-success/25 rounded-md p-4 text-center space-y-2.5 fluent-specular">
          <div className="inline-flex p-2.5 bg-success/15 text-success rounded-md border border-success/30 shadow-2xs">
            <ShieldCheck className="w-6 h-6 shrink-0" weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">النسخة مفعلة بنجاح</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              الباقة: {user.plan === 'pro' ? 'Pro احترافي' : 'Enterprise'}
            </p>
          </div>

          {user.licenseKey && (
            <div className="bg-background/80 border border-border/80 rounded-lg p-2 text-center text-xs flex items-center justify-between px-3">
              <div>
                <span className="text-muted-foreground me-1 font-medium">مفتاح التفعيل:</span>
                {/* 🛡️ عزل ثنائي الاتجاه: الشرطات في المفتاح اللاتيني كانت
                    تُعاد ترتيبها داخل السياق RTL */}
                <code dir="ltr" className="font-mono text-primary font-bold text-xs">
                  {user.licenseKey}
                </code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(user.licenseKey || '');
                  toast.success('تم نسخ المفتاح');
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
          <AccountErrorAlert error={error} />
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="license-key-input" className="text-xs font-bold text-foreground/90">
                مفتاح الترخيص (License Key)
              </Label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setLicenseKey(text.trim().toUpperCase());
                      toast.success('تم لصق المفتاح');
                    }
                  } catch {
                    toast.error('الصق المفتاح يدوياً');
                  }
                }}
                className="text-xs text-primary hover:underline font-bold cursor-pointer flex items-center gap-1"
              >
                <span>لصق من الحافظة</span>
              </button>
            </div>
            <div className="relative">
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
              <Input
                id="license-key-input"
                dir="ltr"
                placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                className="pr-9 h-9 text-xs font-mono uppercase rounded-md tracking-wider text-start"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-xs font-bold rounded-md shadow-sm gap-1.5 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4" size={16} />
                <span>جاري تفعيل الترخيص ...</span>
              </>
            ) : (
              'تفعيل مفتاح الترخيص'
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
                // 🛡️ عزل المسار اللاتيني (شرطات/نقطتان) عن السياق RTL
                toast.success(
                  <>
                    تم حفظ السجلات في: <bdi dir="auto">{path}</bdi>
                  </>,
                );
              }
            } catch (e) {
              toast.error(toErrorMessage(e, 'فشل تصدير السجلات'));
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
          onClick={(e) => {
            e.preventDefault();
            const url = 'https://grido.cloud-ip.cc';
            if (typeof BrowserOpenURL === 'function') {
              BrowserOpenURL(url);
            } else {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
        >
          <span>شراء ترخيص</span>
          <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
        </a>
      </div>
    </div>
  );
}
