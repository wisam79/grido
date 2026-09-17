import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FloppyDisk,
  Export,
  DotsThreeVertical,
  Folders,
} from "@phosphor-icons/react";
import { PrintIcon } from "@/components/ui/print-icon";
import { ToolbarFileOps } from "./toolbar-file-ops";
import {
  TooltipBtn,
  ToolbarAddTools,
  ToolbarHistoryTools,
  TemplateInfo,
} from "./toolbar-items";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  return (
    <div
      data-testid="workspace-toolbar"
      dir="rtl"
      className="relative h-12 shrink-0 border-b border-border bg-sidebar/95 backdrop-blur-xl select-none no-print font-cairo"
    >
      <div className="h-full flex items-center justify-between gap-2 px-3 overflow-hidden">
        {/* المجموعات الرئيسية (ملف، أدوات، تحرير) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* المجموعة 1: إدارة الملفات والمستندات */}
          <ToolbarFileOps />

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

          {/* المجموعة 2: إضافة عناصر (نص وأشكال وملصقات) */}
          <ToolbarAddTools />

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />

          {/* المجموعة 3: التراجع والإعادة */}
          <ToolbarHistoryTools />
        </div>

        {/* المنتصف: معلومات القالب والمقاس */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <TemplateInfo />
        </div>

        {/* المجموعة 4: الحفظ والتصدير والطباعة بتسلسل هرمي وقائمة المزيد */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* حفظ (Ctrl+S) */}
          <TooltipBtn content="حفظ المشروع (Ctrl + S)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              aria-label="حفظ المشروع"
              className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] group"
            >
              <FloppyDisk className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" weight="duotone" />
              <span className="hidden xl:inline">حفظ</span>
            </Button>
          </TooltipBtn>

          {/* طباعة (Ctrl+P) */}
          <TooltipBtn content="طباعة المستند (Ctrl + P)">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              aria-label="طباعة المستند"
              className="h-8 px-2.5 gap-1.5 border border-border/80 dark:border-border bg-background/80 hover:bg-accent text-foreground rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] shadow-2xs group"
            >
              <PrintIcon className="w-4 h-4 group-hover:scale-105 transition-transform" />
              <span className="hidden xl:inline">طباعة</span>
            </Button>
          </TooltipBtn>

          {/* تصدير (Ctrl+E) - الإجراء البارز الأساسي */}
          <TooltipBtn content="تصدير صورة (Ctrl + E)">
            <Button
              size="sm"
              onClick={onExport}
              aria-label="تصدير صورة"
              className="h-8 px-3.5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs rounded-md cursor-pointer transition-all duration-150 font-bold text-xs active:scale-[0.98]"
            >
              <Export className="w-4 h-4" weight="bold" />
              <span>تصدير</span>
            </Button>
          </TooltipBtn>

          {/* قائمة المزيد للإجراءات السريعة */}
          <DropdownMenu>
            <TooltipBtn content="المزيد من خيارات المستند">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="المزيد من الخيارات"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-all cursor-pointer"
                >
                  <DotsThreeVertical className="w-4 h-4" weight="bold" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipBtn>
            <DropdownMenuContent align="end" className="w-52 font-cairo [direction:rtl] rounded-xl backdrop-blur-2xl bg-popover/95 border border-border shadow-fluent-16 p-1.5 space-y-1">
              <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 select-none">
                خيارات المستند
              </div>
              <DropdownMenuItem
                onClick={onSave}
                className="flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FloppyDisk className="w-4 h-4 text-primary" weight="duotone" />
                  <span className="font-semibold">حفظ المشروع</span>
                </div>
                <span className="text-micro font-mono text-muted-foreground">Ctrl+S</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onPrint}
                className="flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PrintIcon className="w-4 h-4 text-primary" />
                  <span className="font-semibold">طباعة المستند</span>
                </div>
                <span className="text-micro font-mono text-muted-foreground">Ctrl+P</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-border/50" />

              <DropdownMenuItem
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("grido:open-projects-dialog", { detail: { tab: "list" } }));
                }}
                className="flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Folders className="w-4 h-4 text-muted-foreground" weight="duotone" />
                  <span>مكتبة المشاريع</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
