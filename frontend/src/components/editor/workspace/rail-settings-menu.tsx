import React from 'react';
import { useShallow } from 'zustand/react/shallow';

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
  Columns,
  Desktop,
  Gear,
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
              {/* شارة حالة الحساب/الترخيص على الترس */}
              {user?.plan === 'trial' ? (
                <span className="absolute top-1.5 start-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-sidebar" />
              ) : isLicenseActive ? (
                <span className="absolute top-1.5 start-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-sidebar" />
              ) : null}
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
        className="w-60 p-1.5 rounded-lg border fluent-specular font-cairo shadow-fluent-16 z-(--z-menu)"
      >
        {/* قسم 1: الحساب والترخيص */}
        <DropdownMenuLabel className="text-micro text-muted-foreground font-bold px-2 py-1">
          الحساب والترخيص
        </DropdownMenuLabel>
        <DropdownMenuItem
          data-testid="rail-account-modal-item"
          onClick={() => setAccountModalOpen(true)}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>{user?.email || 'إدارة الحساب والترخيص'}</span>
          </div>
          {user?.plan === 'trial' ? (
            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
              تجريبي
            </span>
          ) : isLicenseActive ? (
            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
              مفعّل
            </span>
          ) : (
            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              غير مفعّل
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* قسم 2: المظهر والثيم */}
        <DropdownMenuLabel className="text-micro text-muted-foreground font-bold px-2 py-1">
          المظهر والعرض
        </DropdownMenuLabel>
        <DropdownMenuItem
          data-testid="rail-theme-toggle-item"
          onClick={toggleTheme}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            {themeMode === 'system' ? (
              <Desktop className="size-4 text-primary" weight="duotone" />
            ) : themeMode === 'dark' ? (
              <Moon className="size-4 text-primary" />
            ) : (
              <Sun className="size-4 text-amber-500" />
            )}
            <span>مظهر التطبيق</span>
          </div>
          <span className="text-micro text-muted-foreground font-mono">
            {themeMode === 'system'
              ? `تلقائي (${theme === 'dark' ? 'داكن' : 'مضيء'})`
              : themeMode === 'dark'
                ? 'داكن'
                : 'مضيء'}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-in'))}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <span className="size-4 flex items-center justify-center font-bold text-sm text-primary font-mono">
              +
            </span>
            <span>تكبير حجم الواجهة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-3xs font-mono text-muted-foreground">
              {Math.round(zoomScale * 100)}%
            </span>
            <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
              Ctrl+Shift++
            </kbd>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-out'))}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <span className="size-4 flex items-center justify-center font-bold text-sm text-primary font-mono">
              -
            </span>
            <span>تصغير حجم الواجهة</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+Shift+-
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.dispatchEvent(new CustomEvent('grido:ui-zoom-reset'))}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <span className="size-4 flex items-center justify-center font-bold text-3xs text-muted-foreground font-mono">
              100%
            </span>
            <span>استعادة حجم الواجهة</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+Shift+⌫
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* قسم 3: الألواح الجانبية */}
        <DropdownMenuLabel className="text-micro text-muted-foreground font-bold px-2 py-1">
          الألواح الجانبية
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleToggleLeft}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <SidebarSimple className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>لوحة الأدوات والقوالب</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+B
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleToggleRight}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>لوحة الخصائص والمفتش</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+Shift+B
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* قسم 4: أدوات القياس والإرشاد */}
        <DropdownMenuLabel className="text-micro text-muted-foreground font-bold px-2 py-1">
          المساطر والخطوط الإرشادية
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setShowRuler(!showRuler)}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Ruler className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>{showRuler ? 'إخفاء المساطر' : 'إظهار المساطر'}</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+R
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setShowUserGuides(!showUserGuides)}
          className="flex items-center justify-between cursor-pointer py-2 px-2 rounded-md group text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Columns className="size-4 text-muted-foreground group-hover:text-foreground" />
            <span>{showUserGuides ? 'إخفاء الخطوط الإرشادية' : 'إظهار الخطوط الإرشادية'}</span>
          </div>
          <kbd className="px-1 py-0.5 text-3xs font-mono bg-muted/80 rounded border border-border">
            Ctrl+;
          </kbd>
        </DropdownMenuItem>

        {userGuidesCount > 0 && (
          <DropdownMenuItem
            onClick={clearUserGuides}
            className="flex items-center gap-2 cursor-pointer py-2 px-2 rounded-md text-destructive hover:bg-destructive/10 text-xs font-semibold"
          >
            <Trash className="size-4 shrink-0" />
            <span>مسح جميع الخطوط ({userGuidesCount})</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
