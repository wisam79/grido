import React from 'react';
import { Toaster as Sonner } from 'sonner';

import { Spinner } from '@/components/ui/huge-icon';
import { CheckCircle, XCircle, WarningCircle, Info } from '@/components/ui/icons';
import { useTheme } from '@/hooks/use-theme';

import type { ToasterProps } from 'sonner';

const Toaster = ({ offset = 20, style, ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      duration={2200}
      visibleToasts={1}
      theme={theme as ToasterProps['theme']}
      dir="rtl"
      className="toaster group z-(--z-toast)"
      // Sonner injects unlayered CSS with a numeric z-index; a utility cannot override it.
      style={{ zIndex: 'var(--z-toast)', ...style }}
      offset={offset}
      icons={{
        success: <CheckCircle className="w-4 h-4 text-success shrink-0" weight="fill" />,
        error: <XCircle className="w-4 h-4 text-destructive shrink-0" weight="fill" />,
        warning: <WarningCircle className="w-4 h-4 text-warning shrink-0" weight="fill" />,
        info: <Info className="w-4 h-4 text-info shrink-0" weight="fill" />,
        loading: <Spinner size={15} className="w-4 h-4 text-primary" />,
      }}
      toastOptions={{
        classNames: {
          /* التنسيق البصري الموحد للحبة العائمة يعيش في index.css — هنا الأصناف الوظيفية فقط */
          toast: 'group toast font-sans',
          title: 'font-sans tracking-normal',
          description: 'font-sans mt-0.5',
          actionButton:
            'group-[.toast]:bg-primary-action group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary-action-hover text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
