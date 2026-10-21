import { Command as CommandPrimitive } from 'cmdk';
import * as React from 'react';

import { MagnifyingGlass } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * ⌘ لوحة الأوامر القياسية (Command Palette — Fluent 2 Styled)
 *
 * غلاف موحد فوق cmdk يتبع معايير الواجهة المعتمدة:
 * - استدارة السطح العائم rounded-lg مع إطار fluent-specular.
 * - حلقة التركيز المزدوجة على العناصر التفاعلية.
 * - دعم RTL كامل مع الاختصار في الطرف المقابل للاسم.
 *
 * تُستخدم داخل Popover (وليس Dialog) عبر ToolLauncherContent الوحيد في
 * workspace-panel-rail — لا تُضَف نسخة Dialog هنا: نسختان للوحة الأوامر خرق
 * لثابت «حظر ازدواجية الميزات» (.agents/AGENTS.md). المشغّلان (زر الشريط
 * وزر الجوال compact) يتشاركان المحتوى والحالة نفسيهما.
 */

const Command = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-lg bg-background text-foreground font-cairo',
      className,
    )}
    {...props}
  />
));
Command.displayName = 'Command';

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b border-border/70 px-2.5 py-2">
    <MagnifyingGlass className="w-4 h-4 shrink-0 text-muted-foreground" weight="duotone" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('overflow-y-auto overflow-x-hidden p-1.5 custom-scrollbar', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-xs text-muted-foreground"
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-mini [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground',
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandSeparator = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1.5 my-1 h-px bg-border/60', className)}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors duration-100',
      'data-[selected=true]:bg-accent-active data-[selected=true]:text-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

/** اختصار معروض في الطرف المقابل (يدعم RTL تلقائياً عبر ms-auto) */
const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'ms-auto shrink-0 px-1 py-0.5 text-micro font-mono text-muted-foreground bg-muted/70 rounded border border-border/60',
      className,
    )}
    {...props}
  />
);
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
};
