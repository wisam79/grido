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
import {
  TEXT_PRESET_CATALOG,
  type TextPresetMenuGroup,
  type TextPresetType,
} from '@/lib/templates';

// أيقونات القائمة عرض فقط — الاسم/الوصف/التجميع تأتي من الكتالوج الموحّد
const PRESET_ICONS: Record<TextPresetType, Icon> = {
  heading: TextHOne,
  subheading: TextHTwo,
  body: FileText,
  badge: Tag,
  watermark: Copyright,
  'studio-date': CalendarBlank,
  'gold-luxury': Crown,
  'neon-glow': Lightning,
  'stamp-circle': Stamp,
  '3d-title': Cube,
  'outline-modern': FrameCorners,
  'photographer-tag': Camera,
  'caption-card': Note,
  congrats: Crown,
  'sale-offer': Tag,
  certificate: FileText,
  'special-price': Tag,
};

const PRESET_TONES: Partial<Record<TextPresetType, string>> = {
  'gold-luxury': 'text-amber-600 dark:text-amber-400',
  'neon-glow': 'text-cyan-600 dark:text-cyan-400',
  'stamp-circle': 'text-destructive',
  '3d-title': 'text-indigo-600 dark:text-indigo-400',
  'outline-modern': 'text-violet-600 dark:text-violet-400',
  'caption-card': 'text-teal-600 dark:text-teal-400',
};

const MENU_GROUP_LABELS: Array<{ id: TextPresetMenuGroup; header: string }> = [
  { id: 'standard', header: 'قياسية' },
  { id: 'documentation', header: 'توثيق' },
  { id: 'effects', header: 'تأثيرات' },
];

const TEXT_PRESET_GROUPS = MENU_GROUP_LABELS.map((group) => ({
  header: group.header,
  items: TEXT_PRESET_CATALOG.filter((preset) => preset.menuGroup === group.id).map((preset) => ({
    id: preset.id,
    title: preset.label,
    tone: PRESET_TONES[preset.id],
    Icon: PRESET_ICONS[preset.id],
  })),
}));

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
        className="w-44 max-h-[420px] overflow-y-auto font-cairo rounded-lg backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1"
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
