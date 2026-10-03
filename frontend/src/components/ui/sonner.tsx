import React from 'react';
import { Toaster as Sonner, ToasterProps } from 'sonner';
import { CheckCircle, XCircle, WarningCircle, Info } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/huge-icon';

const Toaster = ({ offset = 20, ...props }: ToasterProps) => {
  const theme =
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

  return (
    <Sonner
      duration={2200}
      visibleToasts={1}
      theme={theme as ToasterProps['theme']}
      dir="rtl"
      className="toaster group"
      offset={offset}
      icons={{
        success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" weight="fill" />,
        error: <XCircle className="w-4 h-4 text-rose-500 shrink-0" weight="fill" />,
        warning: <WarningCircle className="w-4 h-4 text-amber-500 shrink-0" weight="fill" />,
        info: <Info className="w-4 h-4 text-primary shrink-0" weight="fill" />,
        loading: <Spinner size={15} className="w-4 h-4 text-primary" />,
      }}
      toastOptions={{
        classNames: {
          /* التنسيق البصري الموحد (الحبة العائمة) يعيش في index.css — هنا الأصناف الوظيفية فقط */
          toast: 'group toast font-sans transition-all duration-150',
          title: 'text-xs font-medium text-foreground tracking-normal font-sans whitespace-nowrap',
          description: 'text-xs text-muted-foreground font-sans mt-0.5',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
          closeButton:
            'group-[.toast]:text-muted-foreground/60 group-[.toast]:hover:text-foreground group-[.toast]:border-none group-[.toast]:rounded-full transition-colors p-0.5',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
