import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, ArrowUp, ArrowDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      // Ctrl + / (or Cmd + / on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shortcuts = [
    { label: "تراجع عن الإجراء", keys: ["Ctrl", "Z"] },
    { label: "إعادة الإجراء", keys: ["Ctrl", "Y"] },
    { label: "حذف العنصر المحدد", keys: ["Delete"] },
    { label: "تكرار العنصر (Duplicate)", keys: ["Ctrl", "D"] },
    { label: "تجميع العناصر (Group)", keys: ["Ctrl", "G"] },
    { label: "فك تجميع العناصر (Ungroup)", keys: ["Ctrl", "Shift", "G"] },
    { label: "حفظ المشروع", keys: ["Ctrl", "S"] },
    { label: "تحريك دقيق للعنصر", keys: ["الأسهم"] },
    { label: "تحريك سريع للعنصر", keys: ["Shift", "الأسهم"] },
    { label: "لصق صورة من الحافظة", keys: ["Ctrl", "V"] },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-2xl font-cairo" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Keyboard className="w-5 h-5 text-primary" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {shortcuts.map((shortcut, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground font-semibold text-[13px]">{shortcut.label}</span>
                <div className="flex items-center gap-1.5" dir="ltr">
                  {shortcut.keys.map((key, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-muted/60 border border-border/50 rounded-md text-[11px] font-bold font-mono text-foreground shadow-sm flex items-center justify-center min-w-7"
                    >
                      {key === "الأسهم" ? (
                        <div className="flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3" />
                          <ArrowDown className="w-3 h-3" />
                        </div>
                      ) : (
                        key
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {index < shortcuts.length - 1 && <Separator className="bg-border/30" />}
            </React.Fragment>
          ))}
        </div>
        
        <div className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-[11px] text-primary/80 font-bold">
            يمكنك إظهار هذه القائمة في أي وقت بالضغط على 
            <kbd className="mx-1 px-1.5 py-0.5 bg-background rounded border text-[10px] font-mono">Ctrl + /</kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
