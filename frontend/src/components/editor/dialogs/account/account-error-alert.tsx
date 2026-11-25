import { Warning } from '@/components/ui/icons';

/** شريط تنبيه خطأ موحد لنماذج المصادقة وتفعيل الترخيص. */
export function AccountErrorAlert({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
      <Warning className="w-4 h-4 shrink-0" weight="duotone" />
      <span>{error}</span>
    </div>
  );
}
