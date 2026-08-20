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
    { label: "تحديد كافة العناصر", keys: ["Ctrl", "A"] },
    { label: "تراجع عن الإجراء", keys: ["Ctrl", "Z"] },
    { label: "إعادة الإجراء", keys: ["Ctrl", "Y"] },
    { label: "حذف العنصر المحدد", keys: ["Delete"] },
    { label: "تكرار العنصر", keys: ["Ctrl", "D"] },
    { label: "تجميع العناصر", keys: ["Ctrl", "G"] },
    { label: "فك التجميع", keys: ["Ctrl", "Shift", "G"] },
    { label: "حفظ المشروع", keys: ["Ctrl", "S"] },
    { label: "تصدير صورة", keys: ["Ctrl", "E"] },
    { label: "طباعة المستند", keys: ["Ctrl", "P"] },
    { label: "تحريك دقيق للعنصر", keys: ["الأسهم"] },
    { label: "تحريك سريع للعنصر", keys: ["Shift", "الأسهم"] },
    { label: "لصق صورة من الحافظة", keys: ["Ctrl", "V"] },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl rounded-2xl font-cairo fluent-specular transition-all duration-150" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Keyboard className="w-4 h-4 text-primary" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-2">
          {shortcuts.map((shortcut, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-muted-foreground font-semibold text-xs">{shortcut.label}</span>
                <div className="flex items-center gap-1.5" dir="ltr">
                  {shortcut.keys.map((key, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-muted/80 border border-border/60 rounded-md text-[11px] font-bold font-mono text-foreground shadow-2xs flex items-center justify-center min-w-7 h-6"
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
        
        <div className="mt-4 bg-primary/10 border border-primary/20 rounded-xl p-3 text-center fluent-specular">
          <p className="text-[11px] text-primary/90 font-bold">
            إظهار هذه القائمة بالضغط على 
            <kbd className="mx-1 px-1.5 py-0.5 bg-background rounded-md border border-border/60 text-[10px] font-mono font-bold shadow-2xs">Ctrl + /</kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
