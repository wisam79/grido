import { BarChart3, Key, RefreshCw, Sliders, Users, Wand2 } from 'lucide-react';
import type { ActiveTab } from '../types';

/**
 * DashboardHeader — شريط العنوان وزر المزامنة، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface DashboardHeaderProps {
  activeTab: ActiveTab;
  loading: boolean;
  onSync: () => void;
}

export function DashboardHeader({ activeTab, loading, onSync }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1E1E1E] border border-[#2C2C2C] p-5 rounded-2xl relative z-10 backdrop-blur-xl">
      <div>
        <h2 className="text-lg font-black font-display text-white flex items-center gap-2.5 tracking-tight">
          {activeTab === 'users' && <Users className="w-5 h-5 text-white" />}
          {activeTab === 'keys' && <Key className="w-5 h-5 text-white" />}
          {activeTab === 'usage' && <Wand2 className="w-5 h-5 text-white" />}
          {activeTab === 'stats' && <BarChart3 className="w-5 h-5 text-white" />}
          {activeTab === 'settings' && <Sliders className="w-5 h-5 text-white" />}
          {activeTab === 'users' && 'إدارة الحسابات والمشتركين'}
          {activeTab === 'keys' && 'إدارة وتوليد مفاتيح الترخيص'}
          {activeTab === 'usage' && 'سجل استهلاك الذكاء الاصطناعي'}
          {activeTab === 'stats' && 'مؤشرات الاشتراكات والإيرادات'}
          {activeTab === 'settings' && 'إعدادات وحصص النظام'}
        </h2>
        <p className="text-xs text-[#9E9E9E] mt-1 font-sans">
          لوحة مركزية لإدارة التراخيص والمشتركين والخدمات السحابية
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={onSync}
          disabled={loading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-medium border border-[#2C2C2C] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>
    </div>
  );
}
