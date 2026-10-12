import {
  BarChart3,
  ChevronLeft,
  Key,
  LayoutGrid,
  LogOut,
  Sliders,
  Users,
  Wand2,
} from 'lucide-react';
import type { ActiveTab } from '../types';

/**
 * Sidebar — الشريط الجانبي، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (t: ActiveTab) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  return (
    <aside className="w-full md:w-64 bg-[#171717] text-slate-200 flex flex-col shrink-0 border-l border-[#2C2C2C]">
      <div className="p-5 border-b border-[#2C2C2C] flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white text-black rounded-xl">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold font-display text-sm text-white tracking-tight">
              GRIDO STUDIO
            </span>
            <span className="text-[9px] font-mono text-[#9E9E9E] uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              SYSTEM ACTIVE
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 hover:bg-white/10 rounded-lg text-[#9E9E9E] hover:text-rose-400 transition-colors cursor-pointer"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 text-right text-xs font-semibold">
        <button
          onClick={() => onTabChange('users')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            activeTab === 'users'
              ? 'bg-[#3b82f6]/15 text-[#93c5fd] font-bold ring-1 ring-inset ring-[#3b82f6]/30'
              : 'text-[#9E9E9E] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Users className="w-4 h-4" />
            إدارة المشتركين
          </span>
          <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={() => onTabChange('keys')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            activeTab === 'keys'
              ? 'bg-[#3b82f6]/15 text-[#93c5fd] font-bold ring-1 ring-inset ring-[#3b82f6]/30'
              : 'text-[#9E9E9E] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Key className="w-4 h-4" />
            التراخيص والتوليد المجمع
          </span>
          <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={() => onTabChange('usage')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            activeTab === 'usage'
              ? 'bg-[#3b82f6]/15 text-[#93c5fd] font-bold ring-1 ring-inset ring-[#3b82f6]/30'
              : 'text-[#9E9E9E] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Wand2 className="w-4 h-4" />
            سجل استهلاك الـ AI
          </span>
          <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={() => onTabChange('stats')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            activeTab === 'stats'
              ? 'bg-[#3b82f6]/15 text-[#93c5fd] font-bold ring-1 ring-inset ring-[#3b82f6]/30'
              : 'text-[#9E9E9E] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4" />
            إحصائيات الإيرادات والأداء
          </span>
          <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            activeTab === 'settings'
              ? 'bg-[#3b82f6]/15 text-[#93c5fd] font-bold ring-1 ring-inset ring-[#3b82f6]/30'
              : 'text-[#9E9E9E] hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4" />
            إعدادات محلية (مسودة)
          </span>
          <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
        </button>
      </nav>

      <div className="p-4 border-t border-[#2C2C2C] text-[10px] text-[#9E9E9E] text-center font-mono uppercase tracking-wider select-none">
        SUPABASE LIVE CONNECTED
      </div>
    </aside>
  );
}
