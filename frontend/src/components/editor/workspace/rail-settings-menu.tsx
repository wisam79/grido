import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentKbd } from '@/components/ui/blocks/fluent-kbd';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowsCounterClockwise,
  Columns,
  Desktop,
  Gear,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Moon,
  Ruler,
  SidebarSimple,
  SlidersHorizontal,
  Sun,
  Trash,
  User,
} from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import { useUiZoom } from '@/hooks/use-ui-zoom';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

interface RailSettingsMenuProps {
  className?: string;
}

export const RailSettingsMenu = React.memo(function RailSettingsMenu({
  className,
}: RailSettingsMenuProps) {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { zoomScale } = useUiZoom();

  const {
    user,
    isLicenseActiveFn,
    setAccountModalOpen,
    showRuler,
    setShowRuler,
    showUserGuides,
    setShowUserGuides,
    clearUserGuides,
    userGuidesCount,
  } = useEditorStore(
    useShallow((state) => ({
      user: state.user,
      isLicenseActiveFn: state.isLicenseActive,
      setAccountModalOpen: state.setAccountModalOpen,
      showRuler: state.showRuler,
      setShowRuler: state.setShowRuler,
      showUserGuides: state.showUserGuides,
      setShowUserGuides: state.setShowUserGuides,
      clearUserGuides: state.clearUserGuides,
      userGuidesCount: state.userGuides.length,
    })),
  );

  const isLicenseActive = isLicenseActiveFn();

  const handleToggleLeft = () => {
    window.dispatchEvent(new CustomEvent('grido:toggle-left-sidebar'));
  };

  const handleToggleRight = () => {
    window.dispatchEvent(new CustomEvent('grido:toggle-right-sidebar'));
  };

  return (
    <DropdownMenu dir="rtl">
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="rail-settings-menu-trigger"
              aria-label="إعدادات ومظهر التطبيق"
              className={cn(
                'h-9 w-9 rounded-md transition-colors duration-150 cursor-pointer relative',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                className,
              )}
            >
              <Gear className="size-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
        >
          <span>الإعدادات والمظهر</span>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-72 p-1.5 rounded-lg border fluent-specular font-cairo shadow-fluent-16 z-(--z-menu)"
      >
        {/* قسم 1: الحساب والترخيص */}
        <DropdownMenuLabel className="text-3xs text-muted-foreground/70 font-semibold px-2.5 pt-1.5 pb-1 uppercase tracking-wider">
          الحساب والترخيص
        </DropdownMenuLabel>
        <DropdownMenuItem
          data-testid="rail-account-modal-item"
          onClick={() => setAccountModalOpen(true)}
          className="flex items-center gap-2.5 cursor-pointer py-2 px-2.5 rounded-md group text-xs font-semibold hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="size-7 rounded-full bg-accent/80 border border-border/80 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:border-primary/40 transition-colors">
            <User className="size-4" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-semibold text-foreground text-start" dir="ltr">
              {user?.email || 'إدارة الحساب والترخيص'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {user?.plan === 'trial' ? (
                <span className="inline-flex items-center gap-1 text-3xs font-medium text-amber-500">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  نسخة تجريبية
                </span>
              ) : isLicenseActive ? (
                <span className="inline-flex items-center gap-1 text-3xs font-medium text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  ترخيص مفعّل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-3xs font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  غير مفعّل
                </span>
              )}
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        {/* قسم 2: المظهر والثيم */}
        <DropdownMenuLabel className="text-3xs text-muted-foreground/70 font-semibold px-2.5 pt-1.5 pb-1 uppercase tracking-wider">
          المظهر والعرض
        </DropdownMenuLabel>
        <DropdownMenuItem
          data-testid="rail-theme-toggle-item"
          onClick={toggleTheme}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {themeMode === 'system' ? (
              <Desktop className="size-4 text-muted-foreground group-hover:text-foreground" />
            ) : themeMode === 'dark' ? (
              <Moon className="size-4 text-muted-foreground group-hover:text-foreground" />
            ) : (
              <Sun className="size-4 text-muted-foreground group-hover:text-foreground" />
            )}
            <span>مظهر التطبيق</span>
          </div>
          <span className="text-micro text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">
            {themeMode === 'system'
              ? `تلقائي (${theme === 'dark' ? 'داكن' : 'مضيء'})`
              : themeMode === 'dark'
                ? 'داكن'
                : 'مضيء'}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-in'))}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MagnifyingGlassPlus className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>تكبير حجم الواجهة</span>
          </div>
          <div className="flex items-center gap-1.5">
            {zoomScale !== 1 && (
              <span className="text-3xs font-mono text-muted-foreground font-medium">
                {Math.round(zoomScale * 100)}%
              </span>
            )}
            <FluentKbd keys="Ctrl+Shift++" />
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-out'))}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MagnifyingGlassMinus className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>تصغير حجم الواجهة</span>
          </div>
          <FluentKbd keys="Ctrl+Shift+-" />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-reset'))}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <ArrowsCounterClockwise className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>استعادة الحجم الافتراضي</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-3xs font-mono text-muted-foreground font-medium">100%</span>
            <FluentKbd keys="Ctrl+Shift+⌫" />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        {/* قسم 3: الألواح الجانبية */}
        <DropdownMenuLabel className="text-3xs text-muted-foreground/70 font-semibold px-2.5 pt-1.5 pb-1 uppercase tracking-wider">
          الألواح الجانبية
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleToggleRight}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <SidebarSimple className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>لوحة الأدوات والقوالب</span>
          </div>
          <FluentKbd keys="Ctrl+B" />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleToggleLeft}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>لوحة الخصائص والمفتش</span>
          </div>
          <FluentKbd keys="Ctrl+Shift+B" />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        {/* قسم 4: أدوات القياس والإرشاد */}
        <DropdownMenuLabel className="text-3xs text-muted-foreground/70 font-semibold px-2.5 pt-1.5 pb-1 uppercase tracking-wider">
          المساطر والخطوط الإرشادية
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setShowRuler(!showRuler)}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Ruler className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>{showRuler ? 'إخفاء المساطر' : 'إظهار المساطر'}</span>
          </div>
          <FluentKbd keys="Ctrl+R" />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setShowUserGuides(!showUserGuides)}
          className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md group text-xs font-medium hover:bg-accent/70 focus:bg-accent/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Columns className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>{showUserGuides ? 'إخفاء الخطوط الإرشادية' : 'إظهار الخطوط الإرشادية'}</span>
          </div>
          <FluentKbd keys="Ctrl+;" />
        </DropdownMenuItem>

        {userGuidesCount > 0 && (
          <DropdownMenuItem
            onClick={clearUserGuides}
            className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded-md text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive text-xs font-medium transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Trash className="size-4 shrink-0 text-destructive" />
              <span>مسح جميع الخطوط</span>
            </div>
            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-mono font-bold">
              {userGuidesCount}
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
