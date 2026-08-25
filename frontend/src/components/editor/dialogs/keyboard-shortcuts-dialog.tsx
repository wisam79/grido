import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Keyboard20Filled,
  ArrowUp20Regular,
  ArrowDown20Regular,
  Sparkle20Filled,
} from "@fluentui/react-icons";
import { Separator } from "@/components/ui/separator";

interface ShortcutItem {
  label: string;
  keys: string[];
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

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

    const handleOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("grido:open-shortcuts", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("grido:open-shortcuts", handleOpenEvent);
    };
  }, []);

  const categories: ShortcutCategory[] = [
    {
      title: "التحرير والتنظيم",
      items: [
        { label: "تحديد كافة العناصر", keys: ["Ctrl", "A"] },
        { label: "تراجع عن الإجراء", keys: ["Ctrl", "Z"] },
        { label: "إعادة الإجراء", keys: ["Ctrl", "Y"] },
        { label: "تكرار العنصر", keys: ["Ctrl", "D"] },
        { label: "حذف العنصر المحدد", keys: ["Delete"] },
        { label: "تجميع العناصر", keys: ["Ctrl", "G"] },
        { label: "فك التجميع", keys: ["Ctrl", "Shift", "G"] },
        { label: "لصق صورة من الحافظة", keys: ["Ctrl", "V"] },
      ],
    },
    {
      title: "الملف والتصدير والطباعة",
      items: [
        { label: "حفظ المشروع", keys: ["Ctrl", "S"] },
        { label: "تصدير صورة", keys: ["Ctrl", "E"] },
        { label: "طباعة المستند", keys: ["Ctrl", "P"] },
      ],
    },
    {
      title: "التحريك والمحاذاة",
      items: [
        { label: "تحريك دقيق للعنصر (1px)", keys: ["الأسهم"] },
        { label: "تحريك سريع للعنصر (10px)", keys: ["Shift", "الأسهم"] },
      ],
    },
    {
      title: "الرؤية واللوحات الجانبية",
      items: [
        { label: "تكبير مساحة العمل", keys: ["Ctrl", "+"] },
        { label: "تصغير مساحة العمل", keys: ["Ctrl", "-"] },
        { label: "إعادة ضبط المقياس (100%)", keys: ["Ctrl", "0"] },
        { label: "إظهار / إخفاء المساطر", keys: ["Ctrl", "R"] },
        { label: "إظهار / إخفاء شبكة المحاذاة", keys: ["Ctrl", "'"] },
        { label: "إظهار / إخفاء لوحة القوالب", keys: ["Ctrl", "B"] },
        { label: "إظهار / إخفاء لوحة الخصائص", keys: ["Ctrl", "Shift", "B"] },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[95vw] sm:max-w-[480px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card backdrop-blur-2xl border border-border shadow-2xl rounded-2xl font-cairo fluent-specular transition-all duration-150 gap-0"
        dir="rtl"
      >
        {/* رأس النافذة الثابت */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
              <Keyboard20Filled className="w-4 h-4" />
            </div>
            <span>اختصارات لوحة المفاتيح</span>
          </DialogTitle>
        </DialogHeader>

        {/* جسم النافذة القابل للتمرير بحدود ارتفاع محكومة */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar min-h-0 select-none">
          {categories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-2">
              <div className="text-[11px] font-extrabold text-primary flex items-center gap-1.5 px-0.5">
                <Sparkle20Filled className="w-3 h-3 opacity-70" />
                <span>{cat.title}</span>
              </div>
              <div className="bg-muted/30 rounded-xl border border-border/40 p-2 space-y-1">
                {cat.items.map((shortcut, itemIdx) => (
                  <React.Fragment key={itemIdx}>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors text-xs">
                      <span className="text-foreground/90 font-medium text-xs">
                        {shortcut.label}
                      </span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        {shortcut.keys.map((key, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-background border border-border/70 rounded-md text-[11px] font-bold font-mono text-foreground shadow-2xs flex items-center justify-center min-w-7 h-6"
                          >
                            {key === "الأسهم" ? (
                              <div className="flex items-center gap-0.5">
                                <ArrowUp20Regular className="w-3 h-3" />
                                <ArrowDown20Regular className="w-3 h-3" />
                              </div>
                            ) : (
                              key
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                    {itemIdx < cat.items.length - 1 && (
                      <Separator className="bg-border/30 my-0.5" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ذيل النافذة الثابت */}
        <div className="px-5 py-3 border-t border-border/40 bg-muted/20 text-center shrink-0">
          <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
            <span>يمكنك فتح هذه النافذة دائماً بالضغط على</span>
            <kbd className="px-2 py-0.5 bg-background rounded-md border border-border text-[11px] font-mono font-bold text-foreground shadow-2xs">
              Ctrl + /
            </kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
