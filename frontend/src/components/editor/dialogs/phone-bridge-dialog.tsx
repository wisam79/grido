import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DeviceMobileCamera,
  QrCode,
  Copy,
  Check,
  ArrowClockwise,
  WifiHigh,
  Image as ImageIcon,
  WarningCircle,
} from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  StartPhoneBridge,
  StopPhoneBridge,
  GetPhoneBridgeStatus,
} from "../../../../wailsjs/go/main/App";
import { service } from "../../../../wailsjs/go/models";

export interface PhoneBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhoneBridgeDialog({ open, onOpenChange }: PhoneBridgeDialogProps) {
  const [bridgeInfo, setBridgeInfo] = useState<service.BridgeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [receivedCount, setReceivedCount] = useState<number>(0);

  // Invariant: Modal Loading State Cleanup
  useEffect(() => {
    setIsLoading(false);
    setError(null);
    setCopied(false);
  }, [open]);

  // Start or fetch bridge status when modal opens
  const initBridge = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await StartPhoneBridge();
      setBridgeInfo(info);
      const status = await GetPhoneBridgeStatus();
      if (status) {
        setReceivedCount(status.receivedCount);
      }
    } catch (err) {
      console.error("[PhoneBridgeDialog] Failed to start phone bridge:", err);
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل في تشغيل جسر الهاتف");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      initBridge();
    }
  }, [open, initBridge]);

  // Poll status occasionally while dialog is open to refresh photo count
  useEffect(() => {
    if (!open || !bridgeInfo?.isRunning) return;

    const interval = setInterval(async () => {
      try {
        const status = await GetPhoneBridgeStatus();
        if (status) {
          setReceivedCount(status.receivedCount);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [open, bridgeInfo?.isRunning]);

  const handleCopyUrl = async () => {
    if (!bridgeInfo?.url) return;
    try {
      await navigator.clipboard.writeText(bridgeInfo.url);
      setCopied(true);
      toast.success("تم نسخ رابط الكاميرا إلى الحافظة");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ الرابط");
    }
  };

  const handleRestart = async () => {
    try {
      await StopPhoneBridge();
      await initBridge();
      toast.success("تمت إعادة تشغيل الجسر بنجاح");
    } catch (err) {
      console.error("Restart error:", err);
      toast.error("تعذر إعادة التشغيل");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] sm:max-w-[480px] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl font-cairo fluent-specular gap-0"
        dir="rtl"
      >
        {/* Title Bar with Close Button */}
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <DeviceMobileCamera className="w-5 h-5" weight="duotone" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  جسر كاميرا الهاتف
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  التقاط الصور من هاتفك مباشرة وإسقاطها فوراً في مساحة العمل
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center gap-5 max-h-[75vh] overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">جاري تجهيز خادم الكاميرا اللاسلكي ...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="w-full flex flex-col items-center gap-3 py-8 px-4 bg-destructive/5 rounded-xl border border-destructive/20 text-center">
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

          {!isLoading && !error && bridgeInfo && (
            <>
              {/* QR Code Container (High-contrast for easy phone camera scanning) */}
              <div className="relative group p-4 bg-white rounded-2xl shadow-md border border-border/40 flex items-center justify-center">
                <QRCodeSVG
                  value={bridgeInfo.url}
                  size={190}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#090d16"
                  includeMargin={false}
                />
                <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-black/5" />
              </div>

              {/* Status and Network Info */}
              <div className="w-full flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="font-semibold text-foreground">الجسر متصل ويعمل</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <WifiHigh className="w-3.5 h-3.5 text-primary" weight="bold" />
                    <span className="font-mono text-[11px]">{bridgeInfo.ip}:{bridgeInfo.port}</span>
                  </div>
                </div>

                {/* Received Photos Counter */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <ImageIcon className="w-4 h-4" weight="duotone" />
                    <span>الصور المستلمة في هذه الجلسة:</span>
                  </div>
                  <span className="font-bold text-foreground text-sm font-mono bg-background/80 px-2 py-0.5 rounded-md border border-border/40">
                    {receivedCount}
                  </span>
                </div>
              </div>

              {/* Instructions Banner */}
              <div className="w-full text-center space-y-1 bg-muted/20 p-3 rounded-xl border border-border/40">
                <p className="text-xs font-semibold text-foreground">
                  امسح الرمز أعلاه بكاميرا هاتفك
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  يجب أن يكون الهاتف والكمبيوتر متصلين بنفس شبكة الـ Wi-Fi. التقط الصور وستظهر في الكانفاس فورياً!
                </p>
              </div>

              {/* Manual URL Bar with Copy */}
              <div className="w-full flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-lg p-1">
                <input
                  type="text"
                  readOnly
                  value={bridgeInfo.url}
                  className="w-full bg-transparent px-2.5 text-[11px] font-mono text-muted-foreground outline-none select-all truncate"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="h-7 px-2.5 gap-1 text-[11px] font-medium shrink-0 rounded-md"
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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestart}
            disabled={isLoading}
            className="h-8 rounded-md text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowClockwise className="w-3.5 h-3.5" />
            إعادة تعيين الجلسة
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md text-xs font-semibold px-4"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
