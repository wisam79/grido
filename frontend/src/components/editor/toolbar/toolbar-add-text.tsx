import React from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import type { TextPresetType } from '@/lib/templates';

interface TextPresetDef {
  id: TextPresetType;
  title: string;
  /** لون رمادي دلالي فاخر (نجمة، ختم) — اختياري */
  tone?: string;
  Icon: Icon;
}

const TEXT_PRESET_GROUPS: { header: string; items: TextPresetDef[] }[] = [
  {
    header: 'قياسية',
    items: [
      { id: 'heading', title: 'عنوان رئيسي', Icon: TextHOne },
      { id: 'subheading', title: 'عنوان فرعي', Icon: TextHTwo },
      { id: 'body', title: 'نص عادي', Icon: FileText },
    ],
  },
  {
    header: 'توثيق',
    items: [
      { id: 'studio-date', title: 'تاريخ اليوم', Icon: CalendarBlank },
      { id: 'photographer-tag', title: 'توقيع المصور', Icon: Camera },
      { id: 'badge', title: 'شارة مميزة', Icon: Tag },
      { id: 'watermark', title: 'علامة مائية', Icon: Copyright },
    ],
  },
  {
    header: 'تأثيرات',
    items: [
      {
        id: 'gold-luxury',
        title: 'ذهب ملكي',
        tone: 'text-amber-600 dark:text-amber-400',
        Icon: Crown,
      },
      {
        id: 'neon-glow',
        title: 'نيون متوهج',
        tone: 'text-cyan-600 dark:text-cyan-400',
        Icon: Lightning,
      },
      { id: 'stamp-circle', title: 'ختم مقوس', tone: 'text-destructive', Icon: Stamp },
      {
        id: '3d-title',
        title: 'عنوان مجسّم',
        tone: 'text-indigo-600 dark:text-indigo-400',
        Icon: Cube,
      },
      {
        id: 'outline-modern',
        title: 'نص مفرغ',
        tone: 'text-violet-600 dark:text-violet-400',
        Icon: FrameCorners,
      },
      {
        id: 'caption-card',
        title: 'بطاقة ملاحظة',
        tone: 'text-teal-600 dark:text-teal-400',
        Icon: Note,
      },
    ],
  },
];

/** قائمة النصوص الجاهزة — أيقونة سطرية + اسم فقط (بلا صناديق ولا وصف مكرر) */
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
      <DropdownMenuContent
        align="start"
        className="w-44 max-h-[420px] overflow-y-auto font-cairo rounded-xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1"
      >
        {TEXT_PRESET_GROUPS.map((group, gi) => (
          <React.Fragment key={group.header}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <div className="px-2 py-1 text-mini font-bold text-muted-foreground/70 select-none">
              {group.header}
            </div>
            {group.items.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => addTextPreset(preset.id)}
                className="flex items-center gap-2.5 px-2 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
              >
                <preset.Icon
                  className={`w-4 h-4 shrink-0 ${preset.tone ?? 'text-muted-foreground'}`}
                  weight="duotone"
                />
                <span className="font-medium text-foreground truncate">{preset.title}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
