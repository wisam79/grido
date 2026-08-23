import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Printer,
  Save,
} from "lucide-react";
import { ToolbarFileOps } from "./toolbar-file-ops";
import {
  TooltipBtn,
  ToolbarAddTools,
  ToolbarSelectionTools,
  ToolbarHistoryTools,
  TemplateInfo,
} from "./toolbar-items";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // تلاشي حواف الشريط عند وجود أدوات مقصوصة خارج العرض — بدونها تختفي
  // المجموعات بصمت في النوافذ الضيقة ولا يعرف المستخدم أن هناك مزيداً
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      // dir=rtl: المحتوى الزائد يمتد يساراً وscrollLeft يصبح سالباً
      const maxScroll = el.scrollWidth - el.clientWidth;
      const absLeft = Math.abs(el.scrollLeft);
      setFadeLeft(maxScroll - absLeft > 4);
      setFadeRight(absLeft > 4);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div className="relative h-12 shrink-0 border-b border-border bg-sidebar/95 backdrop-blur-xl select-none no-print fluent-specular font-cairo">
      <div
        ref={scrollRef}
        className="h-full flex items-center gap-2 px-3 overflow-x-auto scrollbar-none flex-nowrap"
      >
        {/* المجموعة 1: إدارة الملفات والمستندات */}
        <ToolbarFileOps />

        <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

        {/* المجموعة 2: إضافة عناصر (نص وأشكال) */}
        <ToolbarAddTools />

        <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

        {/* المجموعة 3: تعديل وترتيب ومحاذاة العنصر المحدد */}
        <ToolbarSelectionTools />

        {/* المجموعة 4: التراجع والإعادة */}
        <ToolbarHistoryTools />


        <div className="flex-1" />

        {/* معلومات القالب */}
        <TemplateInfo />

        <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

        {/* المجموعة 6: الحفظ والتصدير والطباعة */}
        <div className="flex items-center gap-0.5 bg-input border border-border p-0.5 rounded-lg shadow-2xs">
          <TooltipBtn content="حفظ المشروع (Ctrl + S)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              aria-label="حفظ المشروع"
              className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/90 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </Button>
          </TooltipBtn>

          <TooltipBtn content="طباعة المستند (Ctrl + P)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrint}
              aria-label="طباعة المستند"
              className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/90 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </Button>
          </TooltipBtn>

          <TooltipBtn content="تصدير صورة (Ctrl + E)">
            <Button
              size="sm"
              onClick={onExport}
              aria-label="تصدير صورة"
              className="h-8 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs rounded-md cursor-pointer transition-all duration-150 font-bold text-xs active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>تصدير</span>
            </Button>
          </TooltipBtn>
        </div>
      </div>

      {/* تدرجات الحواف — pointer-events-none حتى لا تحجب النقر */}
      {fadeLeft && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
          style={{ background: "linear-gradient(to right, var(--sidebar), transparent)" }}
        />
      )}
      {fadeRight && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
          style={{ background: "linear-gradient(to left, var(--sidebar), transparent)" }}
        />
      )}
    </div>
  );
}
