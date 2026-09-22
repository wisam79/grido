import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TextT,
  CaretDown,
  TextHOne,
  TextHTwo,
  FileText,
  CalendarBlank,
  Camera,
  Tag,
  Copyright,
  Crown,
  Lightning,
  Stamp,
  Cube,
  FrameCorners,
  Note,
  type Icon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";
import type { TextPresetType } from "@/lib/templates";

interface TextPresetDef {
  id: TextPresetType;
  title: string;
  titleCls: string;
  sub: string;
  subCls: string;
  Icon: Icon;
  sw: string;
  badge: string;
  badgeCls: string;
}

const TEXT_PRESET_GROUPS: { header: string; items: TextPresetDef[] }[] = [
  {
    header: "نصوص قياسية",
    items: [
      { id: "heading", title: "عنوان رئيسي", titleCls: "font-bold", sub: "نص عريض", subCls: "text-muted-foreground/80", Icon: TextHOne, sw: "bg-primary/10 text-primary", badge: "48px", badgeCls: "font-mono font-bold bg-muted text-muted-foreground" },
      { id: "subheading", title: "عنوان فرعي", titleCls: "font-semibold", sub: "نص متوسط", subCls: "text-muted-foreground/80", Icon: TextHTwo, sw: "bg-primary/10 text-primary/80", badge: "28px", badgeCls: "font-mono font-medium bg-muted text-muted-foreground" },
      { id: "body", title: "نص عادي", titleCls: "font-normal", sub: "فقرة تفاصيل", subCls: "text-muted-foreground/80", Icon: FileText, sw: "bg-muted text-muted-foreground", badge: "18px", badgeCls: "font-mono bg-muted text-muted-foreground" },
    ],
  },
  {
    header: "توثيق واستوديو",
    items: [
      { id: "studio-date", title: "تاريخ اليوم", titleCls: "font-semibold", sub: "تاريخ تلقائي منسق", subCls: "text-muted-foreground/80", Icon: CalendarBlank, sw: "bg-emerald-500/10 text-emerald-500", badge: "تلقائي", badgeCls: "font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
      { id: "photographer-tag", title: "توقيع المصور", titleCls: "font-semibold", sub: "حقوق العمل", subCls: "text-muted-foreground/80", Icon: Camera, sw: "bg-sky-500/10 text-sky-500", badge: "حقوق", badgeCls: "font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400" },
      { id: "badge", title: "شارة مميزة", titleCls: "font-semibold", sub: "كبسولة ملونة", subCls: "text-muted-foreground/80", Icon: Tag, sw: "bg-blue-500/10 text-blue-500", badge: "شارة", badgeCls: "font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400" },
      { id: "watermark", title: "علامة مائية", titleCls: "font-semibold", sub: "حماية شفافة", subCls: "text-muted-foreground", Icon: Copyright, sw: "bg-muted text-muted-foreground", badge: "مسودة", badgeCls: "font-medium bg-muted text-muted-foreground" },
    ],
  },
  {
    header: "تأثيرات فنية",
    items: [
      { id: "gold-luxury", title: "ذهب ملكي", titleCls: "font-semibold", sub: "تدرج ذهبي فاخر", subCls: "text-muted-foreground/80", Icon: Crown, sw: "bg-amber-500/10 text-amber-500", badge: "فاخر", badgeCls: "font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400" },
      { id: "neon-glow", title: "نيون متوهج", titleCls: "font-semibold", sub: "إضاءة ساطعة", subCls: "text-muted-foreground/80", Icon: Lightning, sw: "bg-cyan-500/10 text-cyan-500", badge: "نيون", badgeCls: "font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
      { id: "stamp-circle", title: "ختم مقوس", titleCls: "font-semibold", sub: "نص دائري", subCls: "text-muted-foreground", Icon: Stamp, sw: "bg-destructive/10 text-destructive", badge: "ختم", badgeCls: "font-medium bg-destructive/10 text-destructive" },
      { id: "3d-title", title: "عنوان مجسّم", titleCls: "font-semibold", sub: "ظل مجسم", subCls: "text-muted-foreground/80", Icon: Cube, sw: "bg-indigo-500/10 text-indigo-500", badge: "مجسّم", badgeCls: "font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
      { id: "outline-modern", title: "نص مفرغ", titleCls: "font-semibold", sub: "حدود بلا ملء", subCls: "text-muted-foreground/80", Icon: FrameCorners, sw: "bg-violet-500/10 text-violet-500", badge: "مفرّغ", badgeCls: "font-mono font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400" },
      { id: "caption-card", title: "بطاقة ملاحظة", titleCls: "font-semibold", sub: "نص مؤطر", subCls: "text-muted-foreground/80", Icon: Note, sw: "bg-teal-500/10 text-teal-500", badge: "بطاقة", badgeCls: "font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400" },
    ],
  },
];

/** قائمة النصوص الجاهزة — كانت 13 عنصراً مكرر الهيكل (~15 سطراً لكل واحد). */
export const AddTextDropdown = React.memo(function AddTextDropdown() {
  const addTextPreset = useEditorStore((state) => state.addTextPreset);

  return (
    <DropdownMenu>
      <TooltipBtn content="إضافة نص">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            data-testid="toolbar-add-text"
            aria-label="إضافة نص"
            className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
          >
            <TextT className="w-5 h-5" />
            <CaretDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
      </TooltipBtn>
      <DropdownMenuContent align="start" className="w-64 max-h-[460px] overflow-y-auto font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
        {TEXT_PRESET_GROUPS.map((group, gi) => (
          <React.Fragment key={group.header}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
              {group.header}
            </div>
            {group.items.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => addTextPreset(preset.id)}
                className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${preset.sw}`}>
                    <preset.Icon className="w-4 h-4" weight="bold" />
                  </div>
                  <div className="flex flex-col min-w-0 text-start">
                    <span className={`${preset.titleCls} text-foreground truncate`}>{preset.title}</span>
                    <span className={`text-micro truncate ${preset.subCls}`}>{preset.sub}</span>
                  </div>
                </div>
                <span className={`text-micro px-1.5 py-0.5 rounded-md shrink-0 ${preset.badgeCls}`}>
                  {preset.badge}
                </span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
