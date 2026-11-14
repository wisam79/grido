import { BarChart3, Key, RefreshCw, Sliders, Users, Wand2 } from 'lucide-react';
import type { ActiveTab } from '../types';

/**
 * DashboardHeader — شريط العنوان الرشيق وزر المزامنة على نمط Fluent 2.
 */

interface DashboardHeaderProps {
  activeTab: ActiveTab;
  loading: boolean;
  lastSyncedAt?: Date | null;
  onSync: () => void;
}

const TAB_HEADER_META: Record<ActiveTab, { title: string; Icon: typeof Users }> = {
  users: {
    title: 'إدارة الحسابات والمشتركين',
    Icon: Users,
  },
  keys: {
    title: 'إدارة وتوليد مفاتيح الترخيص',
    Icon: Key,
  },
  usage: {
    title: 'سجل استهلاك الذكاء الاصطناعي',
    Icon: Wand2,
  },
  stats: {
    title: 'مؤشرات الاشتراكات والإيرادات',
    Icon: BarChart3,
  },
  settings: {
    title: 'إعدادات وحصص النظام',
    Icon: Sliders,
  },
};

export function DashboardHeader({
  activeTab,
  loading,
  lastSyncedAt = null,
  onSync,
}: DashboardHeaderProps) {
  const { title, Icon } = TAB_HEADER_META[activeTab];

  return (
    <div className="shrink-0 bg-[#1a1a1a] border border-[#333333]/75 rounded-[6px] px-3.5 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-sm bg-[#2563eb]/15 border border-[#3b82f6]/30 text-[#60a5fa] flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <h1 className="text-sm font-semibold text-[#f5f5f5] tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lastSyncedAt && (
          <span className="hidden sm:inline-flex items-center h-7 px-2 rounded-sm bg-[#171717] border border-[#333333]/75 text-[11px] font-mono tabular-nums text-[#a9afaf]">
            {lastSyncedAt.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
        <button
          type="button"
          onClick={onSync}
          disabled={loading}
          className="admin-btn-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3 h-3 text-[#a9afaf] ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>تحديث البيانات</span>
        </button>
      </div>
    </div>
  );
}
