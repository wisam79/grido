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

        {/* فاصل مرن بين الأدوات والإجراءات */}
        <div className="flex-1 min-w-0" />

        {/* المجموعة 4: الحفظ والطباعة والتصدير في مجموعة أوامر موحدة */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="fluent-command-group shadow-2xs">
            {/* حفظ (Ctrl+S) */}
            <TooltipBtn content="حفظ المشروع (Ctrl + S)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                data-testid="toolbar-save"
                aria-label="حفظ المشروع"
                className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] group"
              >
                <FloppyDisk className="w-4 h-4 text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all" weight="duotone" />
                <span className="hidden xl:inline">حفظ</span>
              </Button>
            </TooltipBtn>

            {/* طباعة (Ctrl+P) */}
            <TooltipBtn content="طباعة المستند (Ctrl + P)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                data-testid="toolbar-print"
                aria-label="طباعة المستند"
                className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md cursor-pointer transition-all duration-150 font-semibold text-xs active:scale-[0.98] group"
              >
                <PrintIcon className="w-4 h-4 group-hover:scale-105 transition-transform" />
                <span className="hidden xl:inline">طباعة</span>
              </Button>
            </TooltipBtn>

            {/* تصدير (Ctrl+E) */}
            <TooltipBtn content="تصدير صورة (Ctrl + E)">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                data-testid="toolbar-export"
                aria-label="تصدير صورة"
                className="h-8 px-2.5 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-md cursor-pointer transition-all duration-150 font-bold text-xs active:scale-[0.98] group"
              >
                <Export className="w-4 h-4 group-hover:scale-105 transition-transform" weight="bold" />
                <span>تصدير</span>
              </Button>
            </TooltipBtn>
          </div>

          {/* قائمة المزيد للإجراءات السريعة */}
          <DropdownMenu>
            <TooltipBtn content="المزيد من خيارات المستند">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="toolbar-more"
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
