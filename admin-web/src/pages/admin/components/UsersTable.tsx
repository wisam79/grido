import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  RotateCcw,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import {
  computeUserFilterCounts,
  getUserAccountState,
  getUserDaysRemaining,
  sortUsers,
  type UserSortBy,
} from '../../../lib/admin-utils';
import type { UserProfile, UserStatusFilter } from '../types';
import { AccountStateBadge, CopyButton, PlanBadge } from './admin-badges';

/**
 * UsersTable — شريط التصفية والفرز + جدول المشتركين بهوية Grido المكتبية.
 */

interface UsersTableProps {
  allUsers?: UserProfile[];
  loading?: boolean;
  searchQuery: string;
  statusFilter: UserStatusFilter;
  filteredUsers: UserProfile[];
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: UserStatusFilter) => void;
  onExportCSV: () => void;
  onOpenEditUser: (u: UserProfile) => void;
  onInspectUser?: (u: UserProfile) => void;
  extendingUserId?: string | null;
  onExtendLicense: (id: string, months: number) => void;
  onRevokeLicense: (id: string) => void;
  onToggleBanUser: (u: UserProfile) => void;
}

const PAGE_SIZE = 20;

const FILTER_OPTIONS: ReadonlyArray<{ id: UserStatusFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'pro', label: 'احترافي' },
  { id: 'enterprise', label: 'مؤسسات' },
  { id: 'free', label: 'مجاني' },
  { id: 'trial', label: 'تجريبي' },
  { id: 'expired', label: 'منتهي' },
  { id: 'banned', label: 'محظور' },
];

export function UsersTable({
  allUsers,
  loading = false,
  searchQuery,
  statusFilter,
  filteredUsers,
  onSearchChange,
  onStatusFilterChange,
  onExportCSV,
  onOpenEditUser,
  onInspectUser,
  extendingUserId = null,
  onExtendLicense,
  onRevokeLicense,
  onToggleBanUser,
}: UsersTableProps) {
  const [sortBy, setSortBy] = useState<UserSortBy>('newest');
  const [page, setPage] = useState(1);

  const filterCounts = useMemo(
    () => computeUserFilterCounts(allUsers ?? filteredUsers),
    [allUsers, filteredUsers],
  );

  const sortedUsers = useMemo(
    () => sortUsers(filteredUsers, sortBy),
    [filteredUsers, sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = sortedUsers.slice(pageStart, pageStart + PAGE_SIZE);

  const hasActiveFilter = Boolean(searchQuery.trim() || statusFilter !== 'all');

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      {/* Command Filter Toolbar */}
      <div className="admin-card p-2.5 space-y-2 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#a9afaf] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                onSearchChange(e.target.value);
              }}
              aria-label="ابحث بالاسم أو البريد الإلكتروني أو مفتاح الترخيص"
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو المفتاح..."
              className="admin-input w-full h-7 ps-8 pe-7 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  onSearchChange('');
                }}
                aria-label="مسح البحث"
                className="absolute end-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="users-sort-select" className="sr-only">
              ترتيب المشتركين
            </label>
            <select
              id="users-sort-select"
              value={sortBy}
              onChange={(e) => {
                setPage(1);
                setSortBy(e.target.value as UserSortBy);
              }}
              aria-label="ترتيب المشتركين"
              className="admin-input h-7 px-2 text-xs cursor-pointer"
            >
              <option value="newest">الأحدث تسجيلاً</option>
              <option value="expiry-asc">الأقرب انتهاءً</option>
              <option value="plan">الباقة الأعلى</option>
              <option value="name">الاسم أبجدياً</option>
            </select>

            <button
              type="button"
              onClick={onExportCSV}
              className="admin-btn-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3 h-3 text-[#a9afaf]" aria-hidden="true" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Status / Plan Segment Bar */}
        <div
          className="admin-segment flex items-center gap-1 flex-wrap"
          role="group"
          aria-label="تصفية المشتركين حسب الباقة أو الحالة"
        >
          {FILTER_OPTIONS.map(({ id, label }) => {
            const active = statusFilter === id;
            const count = filterCounts[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setPage(1);
                  onStatusFilterChange(id);
                }}
                className="admin-segment-btn h-6 px-2 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    active ? 'text-[#93c5fd]' : 'text-[#a9afaf]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table Container */}
      <div className="admin-card flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto max-h-[65vh] md:max-h-none">
          <table className="w-full text-right text-xs text-[#f5f5f5]">
            <thead className="admin-table-head sticky top-0 z-10 text-[11px] font-medium">
              <tr>
                <th className="px-3.5 py-2">المستخدم</th>
                <th className="px-3.5 py-2">الباقة</th>
                <th className="px-3.5 py-2">الحالة</th>
                <th className="px-3.5 py-2">تاريخ الانتهاء</th>
                <th className="px-3.5 py-2">مفتاح الترخيص</th>
                <th className="px-3.5 py-2 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredUsers.length === 0 ? (
                Array.from({ length: 5 }, (_, idx) => (
                  <tr key={`sk-${idx}`} className="admin-table-row">
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="admin-skeleton h-3.5 w-28" />
                        <div className="admin-skeleton h-2.5 w-40" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-5 w-14" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-5 w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-5 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-6 w-28 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="space-y-2.5">
                      <p className="text-xs text-[#a9afaf]">
                        لا توجد نتائج تطابق خيارات البحث الحالية.
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setPage(1);
                            onSearchChange('');
                            onStatusFilterChange('all');
                          }}
                          className="admin-btn-secondary h-7 px-3 text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>إعادة ضبط الفلاتر</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageUsers.map((user) => {
                  const accountState = getUserAccountState(user);
                  const daysRemaining = getUserDaysRemaining(user.expires_at);
                  const isBanned = accountState === 'banned';

                  return (
                    <tr key={user.id} className="admin-table-row">
                      <td className="px-4 py-3">
                        {onInspectUser ? (
                          <button
                            type="button"
                            onClick={() => onInspectUser(user)}
                            className="text-right group cursor-pointer block max-w-full"
                          >
                            <div className="font-medium text-[#f5f5f5] group-hover:text-[#60a5fa] text-xs transition-colors truncate">
                              {user.name || 'بدون اسم'}
                            </div>
                            <div
                              className="text-[11px] text-[#a9afaf] font-mono truncate max-w-56"
                              dir="ltr"
                            >
                              {user.email}
                            </div>
                          </button>
                        ) : (
                          <div>
                            <div className="font-medium text-[#f5f5f5] text-xs">
                              {user.name || 'بدون اسم'}
                            </div>
                            <div className="text-[11px] text-[#a9afaf] font-mono" dir="ltr">
                              {user.email}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <PlanBadge plan={user.plan} />
                      </td>

                      <td className="px-4 py-3">
                        <AccountStateBadge state={accountState} />
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-[#c9cfcf]">
                        <div>
                          {user.expires_at
                            ? new Date(user.expires_at).toLocaleDateString('ar-SA')
                            : 'غير محدد'}
                        </div>
                        {daysRemaining !== null && (
                          <div
                            className={`text-[10px] mt-0.5 ${
                              daysRemaining <= 0
                                ? 'text-amber-300'
                                : daysRemaining <= 7
                                  ? 'text-blue-300'
                                  : 'text-[#a9afaf]'
                            }`}
                          >
                            {daysRemaining <= 0
                              ? `منتهي (${Math.abs(daysRemaining)} يوم)`
                              : `متبقي ${daysRemaining} يوم`}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {user.license_key ? (
                          <div className="inline-flex items-center gap-1.5">
                            <code
                              dir="ltr"
                              className="admin-card-inset px-2 py-0.5 text-[11px] font-mono text-[#93c5fd] whitespace-nowrap"
                            >
                              {user.license_key}
                            </code>
                            <CopyButton
                              value={user.license_key}
                              label={`نسخ مفتاح ${user.email || user.id}`}
                            />
                          </div>
                        ) : (
                          <span className="text-[#a9afaf]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {onInspectUser && (
                            <button
                              type="button"
                              onClick={() => onInspectUser(user)}
                              aria-label={`تفاصيل حساب ${user.email || user.name || user.id}`}
                              title="عرض التفاصيل وسجل الاستخدام"
                              className="admin-btn-secondary w-7 h-7 flex items-center justify-center cursor-pointer text-[#a9afaf] hover:text-[#f5f5f5]"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenEditUser(user)}
                            className="admin-btn-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Sliders className="w-3 h-3 text-[#a9afaf]" aria-hidden="true" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            disabled={extendingUserId === user.id}
                            onClick={() => onExtendLicense(user.id, 1)}
                            className="admin-btn-secondary h-7 px-2.5 text-[11px] font-mono tabular-nums cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="تمديد الصلاحية لشهر إضافي"
                          >
                            +شهر
                          </button>
                          {user.plan !== 'free' && (
                            <button
                              type="button"
                              onClick={() => onRevokeLicense(user.id)}
                              className="h-7 px-2.5 rounded-sm bg-amber-500/12 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium cursor-pointer transition-colors"
                              title="سحب الترخيص وتحويل الحساب للباقة المجانية"
                            >
                              سحب
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleBanUser(user)}
                            className={`h-7 px-2.5 rounded-sm text-[11px] font-medium cursor-pointer border transition-colors ${
                              isBanned
                                ? 'bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-red-500/12 hover:bg-red-500/20 text-red-300 border-red-500/30'
                            }`}
                          >
                            {isBanned ? 'إلغاء الحظر' : 'حظر'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Client-side Pagination Footer */}
        {sortedUsers.length > PAGE_SIZE && (
          <div className="shrink-0 px-3.5 py-1.5 bg-[#1a1a1a] border-t border-[#333333]/75 flex items-center justify-between gap-2 text-[11px] text-[#a9afaf] font-mono tabular-nums">
            <span>
              عرض {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sortedUsers.length)} من{' '}
              {sortedUsers.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="الصفحة السابقة"
                className="admin-btn-secondary w-7 h-7 flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-2 text-[#f5f5f5]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="الصفحة التالية"
                className="admin-btn-secondary w-7 h-7 flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
