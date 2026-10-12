import { Ban, CheckCircle2, Clock, Download, Search, Sliders } from 'lucide-react';
import type { UserProfile, UserStatusFilter } from '../types';

/**
 * UsersTable — شريط الفلاتر + جدول المستخدمين، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface UsersTableProps {
  searchQuery: string;
  statusFilter: UserStatusFilter;
  filteredUsers: UserProfile[];
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: UserStatusFilter) => void;
  onExportCSV: () => void;
  onOpenEditUser: (u: UserProfile) => void;
  onExtendLicense: (id: string, months: number) => void;
  onRevokeLicense: (id: string) => void;
  onToggleBanUser: (u: UserProfile) => void;
}

export function UsersTable({
  searchQuery,
  statusFilter,
  filteredUsers,
  onSearchChange,
  onStatusFilterChange,
  onExportCSV,
  onOpenEditUser,
  onExtendLicense,
  onRevokeLicense,
  onToggleBanUser,
}: UsersTableProps) {
  return (
    <div className="space-y-4 relative z-10 tab-content-reveal">
      {/* Filters Bar */}
      <div className="bg-[#1E1E1E] border border-[#2C2C2C] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-[#9E9E9E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بالاسم، البريد الإلكتروني، أو المفتاح..."
            className="w-full pr-10 pl-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white focus:outline-none focus:border-white font-sans"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1 bg-[#141414] border border-[#2C2C2C] p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => onStatusFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'all' ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              ALL
            </button>
            <button
              onClick={() => onStatusFilterChange('pro')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'pro' ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              PRO
            </button>
            <button
              onClick={() => onStatusFilterChange('enterprise')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'enterprise' ? 'bg-purple-600 text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              ENT
            </button>
            <button
              onClick={() => onStatusFilterChange('free')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'free' ? 'bg-white/10 text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              FREE
            </button>
            <button
              onClick={() => onStatusFilterChange('trial')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'trial' ? 'bg-amber-600 text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              TRIAL
            </button>
            <button
              onClick={() => onStatusFilterChange('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'expired' ? 'bg-slate-600 text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              EXPIRED
            </button>
            <button
              onClick={() => onStatusFilterChange('banned')}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'banned' ? 'bg-rose-600 text-white font-bold' : 'text-[#9E9E9E] hover:text-white'}`}
            >
              BANNED
            </button>
          </div>

          <button
            onClick={onExportCSV}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-[#2C2C2C] rounded-xl text-xs flex items-center gap-2 cursor-pointer font-mono font-bold uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-2xl overflow-hidden shadow-2xl">
        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="sticky top-0 z-10 bg-[#141414] text-[#9E9E9E] font-mono text-[11px] uppercase tracking-wider border-b border-[#2C2C2C]">
              <tr>
                <th className="p-4">المستخدم</th>
                <th className="p-4">الباقة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">تاريخ الانتهاء</th>
                <th className="p-4">مفتاح الترخيص</th>
                <th className="p-4 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2C]/70">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#9E9E9E] font-mono">
                    لا توجد نتائج تطابق خيارات البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isExpired = user.expires_at && new Date(user.expires_at) <= new Date();
                  const isBanned = user.status === 'banned';

                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{user.name || 'بدون اسم'}</div>
                        <div className="text-[11px] text-[#9E9E9E] font-mono">{user.email}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase ${
                            user.plan === 'enterprise'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : user.plan === 'pro'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-white/5 text-[#9E9E9E] border border-[#2C2C2C]'
                          }`}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <Ban className="w-3 h-3 shrink-0" />
                            BANNED
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 shrink-0" />
                            EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-300">
                        {user.expires_at ? new Date(user.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                      </td>
                      <td className="p-4">
                        {user.license_key ? (
                          <code className="inline-block px-2 py-1 rounded-md bg-[#141414] border border-[#2C2C2C] text-[10px] text-[#93c5fd] whitespace-nowrap">
                            {user.license_key}
                          </code>
                        ) : (
                          <span className="text-[#8A8A8A]">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenEditUser(user)}
                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-[#2C2C2C] rounded-lg text-[11px] cursor-pointer flex items-center gap-1 font-mono"
                          >
                            <Sliders className="w-3 h-3" />
                            EDIT
                          </button>
                          <button
                            onClick={() => onExtendLicense(user.id, 1)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-slate-200 border border-[#2C2C2C] rounded-lg text-[11px] font-mono cursor-pointer"
                            title="+1 شهر"
                          >
                            +1M
                          </button>
                          {user.plan !== 'free' && (
                            <button
                              onClick={() => onRevokeLicense(user.id)}
                              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-mono cursor-pointer"
                              title="سحب الترخيص وإعادته للـ Free"
                            >
                              REVOKE
                            </button>
                          )}
                          <button
                            onClick={() => onToggleBanUser(user)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer border ${
                              isBanned
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isBanned ? 'UNBAN' : 'BAN'}
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
      </div>
    </div>
  );
}
