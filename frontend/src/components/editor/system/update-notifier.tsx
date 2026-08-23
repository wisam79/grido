import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, ArrowUpCircle, Loader2 } from "lucide-react";
import { CheckForUpdate, DownloadAndInstallUpdate } from "../../../../wailsjs/go/main/App";
import { service } from "../../../../wailsjs/go/models";
import { EventsOn, EventsOff, BrowserOpenURL } from "../../../../wailsjs/runtime/runtime";

export function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<service.UpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    CheckForUpdate()
      .then((info) => {
        if (isMounted && info && info.has_update) {
          setUpdateInfo(info);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to check for updates:", err);
      });

    const unsubscribe = EventsOn("update-progress", (p: number) => {
      setProgress(p);
    });

    return () => {
      isMounted = false;
      if (typeof EventsOff === "function") {
        EventsOff("update-progress");
      }
    };
  }, []);

  if (!updateInfo || !isOpen) return null;

  const handleStartUpdate = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      const url = updateInfo.download_url || "https://grido.cloud-ip.cc/api/download";
      // تمرير بصمة المثبت المعلنة من خادم الإصدارات — يتحقق منها Go قبل تشغيل المثبت
      await DownloadAndInstallUpdate(url, updateInfo.sha256 || "");
    } catch (err: unknown) {
      console.error("Failed to update:", err);
      const errMsg = typeof err === 'string' ? err : (err instanceof Error ? err.message : "حدث خطأ أثناء تحميل وتثبيت التحديث.");
      setError(errMsg);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDownloading && setIsOpen(open)}>
      <DialogContent
        className="max-w-sm bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl rounded-2xl p-5 dir-rtl fluent-specular"
        dir="rtl"
      >
        <DialogHeader className="space-y-1 text-right border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>تحديث جديد متوفر</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            يتوفر إصدار جديد من Grido Studio.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2 fluent-specular">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">الإصدار الحالي:</span>
            <Badge variant="outline" className="font-mono text-[10px] px-2 py-0 rounded-md">
              {updateInfo.current_version || "v1.0.0"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
            <span className="text-muted-foreground text-[11px]">الإصدار الجديد:</span>
            <Badge className="bg-primary text-primary-foreground font-mono text-[10px] px-2 py-0 rounded-md">
              <ArrowUpCircle className="w-3 h-3 ml-1" />
              {updateInfo.latest_version}
            </Badge>
          </div>

          {updateInfo.release_notes && !isDownloading && (
            <div className="border-t border-border/40 pt-2 space-y-1">
              <span className="text-[11px] font-semibold text-foreground block">ملاحظات التحديث:</span>
              <div className="bg-background rounded-md p-2 text-[11px] text-muted-foreground max-h-28 overflow-y-auto leading-normal whitespace-pre-wrap font-sans border border-border/40">
                {updateInfo.release_notes}
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">
                  {progress >= 100 ? "جاري التثبيت وإعادة التشغيل ..." : "جاري تحميل التحديث ..."}
                </span>
                <span className="font-mono text-primary font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 text-[11px] text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {!isDownloading ? (
            <>
              {!error ? (
                <Button
                  onClick={handleStartUpdate}
                  className="flex-1 h-8 text-xs font-semibold gap-1.5 rounded-md shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  تثبيت التحديث الآن
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const url = updateInfo.download_url || "https://grido.cloud-ip.cc/api/download";
                    if (typeof BrowserOpenURL === "function") {
                      BrowserOpenURL(url);
                    } else {
                      window.open(url, "_blank");
                    }
                  }}
                  className="flex-1 h-8 text-xs font-semibold gap-1.5 rounded-md shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  تحميل يدوي (عبر المتصفح)
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="h-8 px-3 text-xs font-semibold rounded-md"
              >
                إغلاق
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>سيتم إغلاق التطبيق وتطبيق التحديث تلقائياً ...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
