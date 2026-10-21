import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
  DialogFooter,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Copy,
  Check,
  ArrowClockwise,
  WifiHigh,
  Image as ImageIcon,
  WarningCircle,
  Cloud,
  XCircle,
} from '@/components/ui/icons';
import { createLogger } from '@/lib/logger';
import { usePhoneBridgeStore } from '@/lib/phone-bridge-store';
import { toErrorMessage } from '@/lib/wails-error';

import {
  StartPhoneBridge,
  StopPhoneBridge,
  GetPhoneBridgeStatus,
} from '../../../../wailsjs/go/main/App';

import type { service } from '../../../../wailsjs/go/models';

const phoneLog = createLogger('PhoneBridgeDialog');

export interface PhoneBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhoneBridgeDialog({ open, onOpenChange }: PhoneBridgeDialogProps) {
  const [bridgeInfo, setBridgeInfo] = useState<service.BridgeInfo | null>(null);
  const [bridgeMode, setBridgeMode] = useState<'cloud' | 'local'>('cloud');
  const pairedDevice = usePhoneBridgeStore((s) => s.pairedDevice);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Invariant: Modal Loading State Cleanup
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false);
    setError(null);
    setCopied(false);
  }, [open]);

  // Start or fetch bridge status when modal opens
  const initBridge = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const info = await StartPhoneBridge();
      if (!isMountedRef.current) return;
      setBridgeInfo(info);
      usePhoneBridgeStore.getState().setIsRunning(true);
      // إذا لم يكن الرابط السحابي متاحاً (المستخدم غير مسجل)، نحوّل تلقائياً للشبكة المحلية
      if (!info?.cloudUrl) {
        setBridgeMode('local');
      }

      const status = await GetPhoneBridgeStatus();
      if (!isMountedRef.current) return;
      if (status) {
        setReceivedCount(status.receivedCount);
        usePhoneBridgeStore.getState().updateStatus({
          isRunning: status.isRunning,
          pairedDevice: status.pairedDevice,
          receivedCount: status.receivedCount,
          lastReceived: status.lastReceived,
        });
      }
    } catch (err) {
      phoneLog.error('[PhoneBridgeDialog] Failed to start phone bridge:', err);
      if (!isMountedRef.current) return;
      const msg = toErrorMessage(err, 'تعذر تشغيل جسر الهاتف');
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // بدء الجسر عند فتح النافذة لأول مرة.
  // 🛡️ معمارية الجلسة المستمرة: إغلاق نافذة الـ QR لا يوقف الجسر إطلاقاً!
  // المصور يغلق النافذة ليرى الكانفاس ويبدأ بالتقاط الصور من هاتفه.
  // إيقاف الجسر يتم حصراً عبر الزر الصريح «إيقاف الجسر» أو عند إغلاق التطبيق.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initBridge();
    }
  }, [open, initBridge]);

  // تحديث دوري للعداد أثناء فتح النافذة
  useEffect(() => {
    if (!open || !bridgeInfo?.isRunning) return;

    const interval = setInterval(async () => {
      try {
        const status = await GetPhoneBridgeStatus();
        if (isMountedRef.current && status) {
          setReceivedCount(status.receivedCount);
          usePhoneBridgeStore.getState().updateStatus({
            isRunning: status.isRunning,
            pairedDevice: status.pairedDevice,
            receivedCount: status.receivedCount,
            lastReceived: status.lastReceived,
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, bridgeInfo?.isRunning]);

  const activeUrl = bridgeMode === 'cloud' ? bridgeInfo?.cloudUrl || '' : bridgeInfo?.url || '';

  const handleCopyUrl = async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      if (!isMountedRef.current) return;
      setCopied(true);
      toast.success('تم نسخ الرابط');
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) setCopied(false);
      }, 2000);
    } catch {
      toast.error('فشل نسخ الرابط');
    }
  };

  const handleRestart = async () => {
    try {
      setIsLoading(true);
      await StopPhoneBridge();
      await initBridge();
      if (isMountedRef.current) toast.success('تمت إعادة تشغيل الجسر');
    } catch (err) {
      phoneLog.error('Restart error:', err);
      if (isMountedRef.current) toast.error('تعذر إعادة التشغيل');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleStopBridge = async () => {
    try {
      setIsLoading(true);
      await StopPhoneBridge();
      if (isMountedRef.current) {
        setBridgeInfo(null);
        setReceivedCount(0);
        usePhoneBridgeStore.getState().reset();
        toast.info('تم إيقاف جسر كاميرا الهاتف');
      }
    } catch (err) {
      phoneLog.error('Stop error:', err);
      if (isMountedRef.current) toast.error('تعذر إيقاف الجسر');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] sm:max-w-[480px] flex flex-col p-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 rounded-xl shadow-fluent-16 font-cairo fluent-specular gap-0"
        dir="rtl"
      >
        {/* Title Bar with Close Button */}
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                جسر كاميرا الهاتف
              </DialogTitle>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center gap-4 max-h-[75vh] overflow-y-auto">
          {isLoading && (
            <div
              role="status"
              aria-label="جاري تجهيز الخادم"
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <Spinner size={32} className="w-8 h-8 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">جاري تجهيز الخادم ...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="w-full flex flex-col items-center gap-3 py-8 px-4 bg-destructive/5 rounded-md border border-destructive/20 text-center">
              <WarningCircle className="w-10 h-10 text-destructive" weight="duotone" />
              <div className="text-sm font-bold text-foreground">تعذر تشغيل خادم الكاميرا</div>
              <div className="text-xs text-muted-foreground">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={initBridge}
                className="h-8 rounded-md text-xs mt-2 gap-1.5"
              >
                <ArrowClockwise className="w-3.5 h-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {!isLoading && !error && (!bridgeInfo || !bridgeInfo.isRunning) && (
            <div className="w-full flex flex-col items-center gap-3 py-10 px-4 bg-muted/20 rounded-md border border-border/40 text-center">
              <WifiHigh className="w-10 h-10 text-muted-foreground/60" />
              <div className="text-sm font-bold text-foreground">الجسر متوقف حالياً</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                اربط كاميرا هاتفك وأسقط الصور في الكانفاس مباشرة.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={initBridge}
                className="h-8 rounded-md text-xs mt-2 gap-1.5 font-bold cursor-pointer"
              >
                <WifiHigh className="w-3.5 h-3.5" />
                <span>تشغيل الجسر</span>
              </Button>
            </div>
          )}

          {!isLoading && !error && bridgeInfo && bridgeInfo.isRunning && (
            <>
              {/* Segmented Mode Selector: Cloud vs Local */}
              <div className="flex items-center w-full p-1 bg-muted/60 dark:bg-muted/30 rounded-md border border-border/60">
                <button
                  type="button"
                  onClick={() => setBridgeMode('cloud')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bridgeMode === 'cloud'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-primary" weight="bold" />
                  <span>عبر الإنترنت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBridgeMode('local')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bridgeMode === 'local'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <WifiHigh className="w-3.5 h-3.5 text-primary" weight="bold" />
                  <span>شبكة محلية (LAN)</span>
                </button>
              </div>

              {/* تحذير عند اختيار وضع الإنترنت والمستخدم غير مسجل الدخول */}
              {bridgeMode === 'cloud' && !bridgeInfo.cloudUrl && (
                <div className="w-full flex flex-col items-center gap-2 py-4 px-3 bg-amber-500/10 dark:bg-amber-500/15 rounded-md border border-amber-500/30 text-center">
                  <WarningCircle className="w-6 h-6 text-amber-500 shrink-0" weight="duotone" />
                  <div className="text-xs font-bold text-foreground">يتطلب تسجيل الدخول للحساب</div>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    لتشغيل جسر الكاميرا عبر الإنترنت، سجّل دخولك إلى حسابك أولاً، أو استخدم وضع
                    «شبكة محلية (LAN)» فوراً بدون إنترنت.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBridgeMode('local')}
                    className="h-7 text-xs rounded-lg mt-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  >
                    التحويل إلى الشبكة المحلية
                  </Button>
                </div>
              )}

              {/* QR Code Container */}
              {activeUrl ? (
                <div className="relative group p-4 bg-card dark:bg-white rounded-md shadow-fluent-8 border border-border/40 flex items-center justify-center">
                  <QRCodeSVG
                    value={activeUrl}
                    size={190}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#090d16"
                    includeMargin={false}
                  />
                  <div className="absolute inset-0 rounded-md pointer-events-none ring-1 ring-inset ring-black/5" />
                </div>
              ) : null}

              {/* Status and Received Photos Row */}
              <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-semibold text-foreground">
                    {pairedDevice ? `متصل: ${pairedDevice}` : 'الجسر متصل ويعمل'}
                  </span>
                  {bridgeInfo.ip && bridgeInfo.port && (
                    <span className="text-muted-foreground font-mono text-micro">
                      {bridgeInfo.ip}:{bridgeInfo.port}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
                  <span className="text-muted-foreground text-xs">الصور المستلمة:</span>
                  <span className="font-bold text-foreground bg-background px-2 py-0.5 rounded-md border border-border/40">
                    {receivedCount}
                  </span>
                </div>
              </div>

              {/* Manual URL Bar with Copy */}
              {activeUrl ? (
                <div className="w-full flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-lg p-1">
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="w-full bg-transparent px-2.5 text-xs font-mono text-muted-foreground outline-none select-all truncate"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="h-7 px-2.5 gap-1 text-xs font-medium shrink-0 rounded-md"
                    title="نسخ الرابط"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {bridgeInfo && bridgeInfo.isRunning && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopBridge}
                  disabled={isLoading}
                  className="h-8 rounded-md text-xs font-semibold gap-1.5 cursor-pointer"
                  title="إيقاف الجسر وقطع الاتصال"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>إيقاف الجسر</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  disabled={isLoading}
                  className="h-8 rounded-md text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="توليد رمز اتصال جديد"
                >
                  <ArrowClockwise className="w-3.5 h-3.5" />
                  <span>إعادة تعيين الجلسة</span>
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md text-xs font-semibold px-4 cursor-pointer"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
