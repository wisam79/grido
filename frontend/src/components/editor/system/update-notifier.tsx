import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Sparkle,
  DownloadSimple,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  Globe,
  Tag,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { CheckForUpdate, DownloadAndInstallUpdate } from "../../../../wailsjs/go/main/App";
import { service } from "../../../../wailsjs/go/models";
import { EventsOn, EventsOff, BrowserOpenURL } from "../../../../wailsjs/runtime/runtime";

/**
 * معالجة وتنسيق ملاحظات التحديث لتحويل أسطر Markdown إلى عناصر واجهة نقية
 */
function FormattedReleaseNotes({ notes }: { notes: string }) {
  const lines = notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
      {lines.map((line, idx) => {
        // العناوين
        if (line.startsWith("#")) {
          const cleanTitle = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
          return (
            <div
              key={idx}
              className="text-foreground font-bold text-xs pt-1 first:pt-0 flex items-center gap-1.5 border-b border-border/40 pb-1"
            >
              <Tag className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
              <span>{cleanTitle}</span>
            </div>
          );
        }

        // عناصر القوائم
        if (line.startsWith("-") || line.startsWith("*")) {
          const cleanItem = line.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
          return (
            <div key={idx} className="flex items-start gap-2 pr-1 text-[11px] text-foreground/90">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/80 mt-1.5 shrink-0" />
              <span>{cleanItem}</span>
            </div>
          );
        }

        // نص عادي
        return (
          <p key={idx} className="text-[11px] text-muted-foreground">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </div>
  );
}

export function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<service.UpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const performCheck = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        toast.info("جاري التحقق من وجود تحديثات جديدة ...");
      }
      const info = await CheckForUpdate();
      if (info && info.has_update) {
        setUpdateInfo(info);
        setIsOpen(true);
      } else if (isManual) {
        toast.success("أنت تستخدم أحدث إصدار من التطبيق حالياً.");
      }
    } catch (err) {
      console.warn("Failed to check for updates:", err);
      if (isManual) {
        toast.error("تعذر الاتصال بخادم التحديثات، يرجى المحاولة لاحقاً.");
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    performCheck(false);

    const handleManualCheck = () => performCheck(true);
    window.addEventListener("grido:check-updates", handleManualCheck);

    const unsubscribe = EventsOn("update-progress", (p: number) => {
      setProgress(p);
    });

    return () => {
      window.removeEventListener("grido:check-updates", handleManualCheck);
      if (typeof EventsOff === "function") {
        EventsOff("update-progress");
      }
    };
  }, [performCheck]);

  if (!updateInfo || !isOpen) return null;

  const handleStartUpdate = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      const url = updateInfo.download_url || "https://grido.cloud-ip.cc/api/download";
      await DownloadAndInstallUpdate(url, updateInfo.sha256 || "");
    } catch (err: unknown) {
      console.error("Failed to update:", err);
      const errMsg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل وتثبيت التحديث.";
      setError(errMsg);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDownloading && setIsOpen(open)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl rounded-2xl p-5 dir-rtl fluent-acrylic fluent-specular font-cairo"
        dir="rtl"
      >
        {/* الهيدر مع شارة التحديث الفاخرة وزر الإغلاق في شريط العنوان */}
        <DialogHeader className="space-y-1 text-right pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
                <Sparkle className="w-5 h-5" weight="duotone" />
              </div>
              <div className="flex flex-col min-w-0">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  تحديث جديد متوفر
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  يتوفر إصدار أحدث جاهز للتحميل والتثبيت التلقائي
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        <div className="space-y-3 my-1">
          {/* 1. بطاقة مقارنة الإصدارات الأنيقة */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/70 fluent-specular">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold">الإصدار المثبت</span>
              <span className="font-mono text-xs text-foreground/80 font-bold bg-background/90 px-2 py-0.5 rounded-md border border-border/50 inline-block w-fit">
                {updateInfo.current_version || "dev"}
              </span>
            </div>

            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" weight="bold" />
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-primary font-bold">الإصدار الأحدث</span>
              <span className="font-mono text-xs text-primary-foreground font-bold bg-primary px-2.5 py-0.5 rounded-md shadow-xs shadow-primary/30 flex items-center gap-1">
                <Sparkle className="w-3 h-3" weight="fill" />
                {updateInfo.latest_version}
              </span>
            </div>
          </div>

          {/* 2. ملاحظات الإصدار المنسقة */}
          {updateInfo.release_notes && !isDownloading && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" weight="duotone" />
                <span>أبرز ما يتضمنه هذا التحديث:</span>
              </span>
              <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-3 max-h-36 overflow-y-auto border border-border/60 fluent-specular">
                <FormattedReleaseNotes notes={updateInfo.release_notes} />
              </div>
            </div>
          )}

          {/* 3. شريط تقدم التحميل التفاعلي */}
          {isDownloading && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground flex items-center gap-2">
                  <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} />
                  <span>
                    {progress >= 100
                      ? "جاري فحص الحزمة وتطبيق التحديث ..."
                      : "جاري تحميل التحديث ..."}
                  </span>
                </span>
                <span className="font-mono text-primary font-bold text-xs">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-primary/15 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                سيتم إغلاق التطبيق وتطبيق التحديث تلقائياً ثم إعادة فتحه.
              </p>
            </div>
          )}

          {/* 4. رسالة الخطأ في حال الفشل مع زر التحميل اليدوي */}
          {error && (
            <div className="p-3 text-[11px] text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-medium flex items-start gap-2">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" weight="fill" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 5. أزرار الإجراءات السفلية */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          {!isDownloading ? (
            <>
              {!error ? (
                <Button
                  onClick={handleStartUpdate}
                  className="flex-1 h-9 text-xs font-bold gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm fluent-hover-lift cursor-pointer"
                >
                  <DownloadSimple className="w-4 h-4" weight="bold" />
                  تثبيت التحديث الآن
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const url =
                      updateInfo.download_url || "https://grido.cloud-ip.cc/api/download";
                    if (typeof BrowserOpenURL === "function") {
                      BrowserOpenURL(url);
                    } else {
                      window.open(url, "_blank");
                    }
                  }}
                  className="flex-1 h-9 text-xs font-bold gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
                >
                  <Globe className="w-4 h-4" weight="bold" />
                  تحميل مباشر من الموقع
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-lg hover:bg-muted/80 cursor-pointer"
              >
                إغلاق
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground gap-2 font-medium">
              <Spinner className="w-4 h-4 text-primary" size={16} />
              <span>جاري المعالجة، الرجاء الانتظار ...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
