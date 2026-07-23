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
import { CheckForUpdate, DownloadAndInstallUpdate } from "../../../wailsjs/go/main/App";
import { service } from "../../../wailsjs/go/models";
import { EventsOn, EventsOff, BrowserOpenURL } from "../../../wailsjs/runtime/runtime";

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
      await DownloadAndInstallUpdate(url);
    } catch (err: any) {
      console.error("Failed to update:", err);
      const errMsg = typeof err === 'string' ? err : (err?.message || "حدث خطأ أثناء تحميل وتثبيت التحديث.");
      setError(errMsg);
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDownloading && setIsOpen(open)}>
      <DialogContent
        className="max-w-sm bg-background border border-border shadow-lg rounded-xl p-5 dir-rtl"
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

        <div className="my-2 bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">الإصدار الحالي:</span>
            <Badge variant="outline" className="font-mono text-[10px] px-2 py-0">
              {updateInfo.current_version || "v1.0.0"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
            <span className="text-muted-foreground text-[11px]">الإصدار الجديد:</span>
            <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0">
              <ArrowUpCircle className="w-3 h-3 ml-1" />
              {updateInfo.latest_version}
            </Badge>
          </div>

          {updateInfo.release_notes && !isDownloading && (
            <div className="border-t border-border/40 pt-2 space-y-1">
              <span className="text-[11px] font-medium text-foreground block">ملاحظات التحديث:</span>
              <div className="bg-background rounded p-2 text-[11px] text-muted-foreground max-h-28 overflow-y-auto leading-normal whitespace-pre-wrap font-sans border border-border/40">
                {updateInfo.release_notes}
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-foreground">
                  {progress >= 100 ? "جاري التثبيت وإعادة التشغيل..." : "جاري تحميل التحديث..."}
                </span>
                <span className="font-mono text-primary font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 text-[11px] text-red-500 bg-red-500/10 rounded border border-red-500/20">
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
                  className="flex-1 h-9 text-xs font-bold gap-1.5"
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
                  className="flex-1 h-9 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  تحميل يدوي (عبر المتصفح)
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-9 px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                إغلاق
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>سيتم إغلاق التطبيق وتطبيق التحديث تلقائياً...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
