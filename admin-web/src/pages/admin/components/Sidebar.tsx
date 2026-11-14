import { useState } from 'react';
import {
  BarChart3,
  Key,
  LogOut,
  Menu,
  Sliders,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import type { ActiveTab } from '../types';
import { AdminBrandMark } from './AdminBrandMark';

/**
 * Sidebar — الشريط الجانبي المكتبي (Fluent 2 Pure Charcoal) + شريط تنقل متجاوب للهواتف.
 */

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (t: ActiveTab) => void;
  onLogout: () => void;
  loading?: boolean;
  lastSyncedAt?: Date | null;
  counts?: {
    users?: number;
    unusedKeys?: number;
    aiRuns?: number;
  };
}

interface NavItem {
  id: ActiveTab;
  label: string;
  Icon: typeof Users;
  badgeKey?: 'users' | 'unusedKeys' | 'aiRuns';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'users', label: 'إدارة المشتركين', Icon: Users, badgeKey: 'users' },
  { id: 'keys', label: 'مفاتيح التراخيص', Icon: Key, badgeKey: 'unusedKeys' },
  { id: 'usage', label: 'سجل الذكاء الاصطناعي', Icon: Wand2, badgeKey: 'aiRuns' },
  { id: 'stats', label: 'المؤشرات والإحصائيات', Icon: BarChart3 },
  { id: 'settings', label: 'الإعدادات العامة', Icon: Sliders },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onLogout,
  loading = false,
  lastSyncedAt = null,
  counts,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const syncText = loading
    ? 'جارٍ مزامنة البيانات...'
    : lastSyncedAt
      ? `آخر مزامنة: ${lastSyncedAt.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'جاهز للمزامنة';

  const renderNavButtons = (onSelectExtra?: () => void) =>
    NAV_ITEMS.map(({ id, label, Icon, badgeKey }) => {
      const isCurrent = activeTab === id;
      const badgeValue = badgeKey && counts ? counts[badgeKey] : undefined;

      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            onTabChange(id);
            onSelectExtra?.();
          }}
          aria-current={isCurrent ? 'page' : undefined}
          className="admin-nav-item w-full h-9 px-3 flex items-center justify-between gap-2 text-xs font-medium cursor-pointer relative"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            {isCurrent && (
              <span
                className="w-[3px] h-4 rounded-full bg-[#3b82f6] shrink-0"
                aria-hidden="true"
              />
            )}
            <Icon
              className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#3b82f6]' : 'text-[#a9afaf]'}`}
              aria-hidden="true"
            />
            <span className="truncate">{label}</span>
          </span>
          {typeof badgeValue === 'number' && (
            <span
              className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono tabular-nums shrink-0 ${
                isCurrent
                  ? 'bg-[#3b82f6]/15 text-[#93c5fd]'
                  : 'bg-white/[0.05] text-[#a9afaf]'
              }`}
            >
              {badgeValue}
            </span>
          )}
        </button>
      );
    });

  return (
    <>
      {/* Mobile / Compact Top Command Strip */}
      <header className="md:hidden bg-[#1a1a1a] border-b border-[#333333]/75 sticky top-0 z-20">
        <div className="min-h-12 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
              aria-label={mobileOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل'}
              className="w-8 h-8 rounded-sm border border-[#454545] bg-[#171717] hover:bg-white/[0.08] text-[#f5f5f5] flex items-center justify-center shrink-0 cursor-pointer"
            >
              {mobileOpen ? (
                <X className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Menu className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <AdminBrandMark size={22} />
            <span className="text-xs font-semibold text-[#f5f5f5] truncate">
              Grido Studio · الإدارة
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="h-8 px-2.5 rounded-sm border border-[#454545] bg-[#171717] hover:bg-red-500/15 hover:border-red-500/35 text-[#a9afaf] hover:text-red-300 text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>خروج</span>
          </button>
        </div>

        {mobileOpen && (
          <nav
            id="admin-mobile-nav"
            aria-label="التنقل الرئيسي للوحة الإدارة"
            className="px-3 pb-3 pt-1 border-t border-[#333333]/65 space-y-1 bg-[#1a1a1a]"
          >
            {renderNavButtons(() => setMobileOpen(false))}
          </nav>
        )}
      </header>

      {/* Desktop Studio Sidebar */}
      <aside
        aria-label="الشريط الجانبي للوحة الإدارة"
        className="hidden md:flex md:w-60 shrink-0 flex-col bg-[#1a1a1a] border-e border-[#333333]/75 sticky top-0 h-screen"
      >
        <div className="min-h-12 px-4 py-3 border-b border-[#333333]/75 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AdminBrandMark size={26} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#f5f5f5] tracking-tight truncate">
                Grido Studio
              </div>
              <div className="text-[10px] text-[#a9afaf] truncate">لوحة الإدارة</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="w-8 h-8 rounded-sm border border-transparent hover:border-[#454545] hover:bg-red-500/12 text-[#a9afaf] hover:text-red-300 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="أقسام الإدارة" className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {renderNavButtons()}
        </nav>

        <div className="px-4 py-3 border-t border-[#333333]/75 flex items-center gap-2 text-[11px] text-[#a9afaf] tabular-nums">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              loading ? 'bg-[#3b82f6]' : lastSyncedAt ? 'bg-emerald-400' : 'bg-[#6b7280]'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">{syncText}</span>
        </div>
      </aside>
    </>
  );
}
