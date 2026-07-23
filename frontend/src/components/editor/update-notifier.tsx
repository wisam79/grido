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
import { Sparkles, Download, ArrowUpCircle } from "lucide-react";
import { CheckForUpdate } from "../../../wailsjs/go/main/App";
import { service } from "../../../wailsjs/go/models";
import { BrowserOpenURL } from "../../../wailsjs/runtime/runtime";

export function UpdateNotifier() {
  const [updateInfo, setUpdateInfo] = useState<service.UpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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

    return () => {
      isMounted = false;
    };
  }, []);

  if (!updateInfo || !isOpen) return null;

  const handleDownload = () => {
    const url = updateInfo.download_url || "https://grido.cloud-ip.cc/api/download";
    if (typeof BrowserOpenURL === "function") {
      BrowserOpenURL(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

          {updateInfo.release_notes && (
            <div className="border-t border-border/40 pt-2 space-y-1">
              <span className="text-[11px] font-medium text-foreground block">ملاحظات التحديث:</span>
              <div className="bg-background rounded p-2 text-[11px] text-muted-foreground max-h-28 overflow-y-auto leading-normal whitespace-pre-wrap font-sans border border-border/40">
                {updateInfo.release_notes}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleDownload}
            className="flex-1 h-9 text-xs font-bold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل التحديث
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-9 px-3 text-xs text-muted-foreground hover:bg-muted"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
