import { motion } from 'framer-motion';

import { Image, SquaresFour } from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

/**
 * 🧭 مبدّل وضع العمل (كولاج / تعديل حر) — سطح مكتب.
 *
 * كان معروضاً كجزيرة عائمة في منتصف شريط العنوان (absolute left-1/2)، فكان
 * يتنافس بصرياً مع القوائم ويزيد ضجيج الشريط العلوي إلى 15 عنصراً في 36px.
 * الوضع هنا **سياق مستند** لا هوية تطبيق، فمكانه الطبيعي في شريط الأدوات
 * بجوار أوامر المستند (إدراج/المشاريع) — على قاعدة أدوات التصميم الاحترافية.
 */
export function ModeSwitcher({ className }: { className?: string }) {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);

  return (
    <div
      role="tablist"
      aria-label="وضع العمل"
      dir="rtl"
      className={cn(
        'relative inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border/70 select-none',
        className,
      )}
    >
      {/* خيار 1: كولاج */}
      <button
        type="button"
        role="tab"
        id="mode-tab-collage"
        aria-selected={mode === 'collage'}
        data-testid="mode-tab-collage"
        title="وضع الكولاج (Ctrl+Alt+1)"
        onClick={() => setMode('collage')}
        className={cn(
          'coarse-touch-target relative z-10 flex items-center gap-1.5 h-7 px-3 rounded-md text-xs transition-colors duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          mode === 'collage'
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium',
        )}
      >
        {mode === 'collage' && (
          <motion.span
            layoutId="workspace-mode-indicator"
            className="absolute inset-0 bg-card border border-border/80 dark:border-white/10 rounded-md shadow-2xs -z-10"
            transition={{ duration: 0.12, ease: 'easeOut' }}
          />
        )}
        <SquaresFour
          aria-hidden="true"
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-colors',
            mode === 'collage' ? 'text-foreground' : 'text-muted-foreground',
          )}
          weight={mode === 'collage' ? 'fill' : 'regular'}
        />
        <span>كولاج</span>
      </button>

      {/* خيار 2: تعديل حر */}
      <button
        type="button"
        role="tab"
        id="mode-tab-single"
        aria-selected={mode === 'single'}
        data-testid="mode-tab-single"
        title="وضع التعديل الحر (Ctrl+Alt+2)"
        onClick={() => setMode('single')}
        className={cn(
          'coarse-touch-target relative z-10 flex items-center gap-1.5 h-7 px-3 rounded-md text-xs transition-colors duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          mode === 'single'
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 font-medium',
        )}
      >
        {mode === 'single' && (
          <motion.span
            layoutId="workspace-mode-indicator"
            className="absolute inset-0 bg-card border border-border/80 dark:border-white/10 rounded-md shadow-2xs -z-10"
            transition={{ duration: 0.12, ease: 'easeOut' }}
          />
        )}
        <Image
          aria-hidden="true"
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-colors',
            mode === 'single' ? 'text-foreground' : 'text-muted-foreground',
          )}
          weight={mode === 'single' ? 'fill' : 'regular'}
        />
        <span>تعديل حر</span>
      </button>
    </div>
  );
}
