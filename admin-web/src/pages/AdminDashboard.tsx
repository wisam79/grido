import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import type { ActiveTab } from './admin/types';
import { useAdminSession } from './admin/useAdminSession';
import { useAdminUsers } from './admin/useAdminUsers';
import { useAdminKeys } from './admin/useAdminKeys';
import { useAdminSettings } from './admin/useAdminSettings';
import { LoginForm } from './admin/components/LoginForm';
import { Sidebar } from './admin/components/Sidebar';
import { DashboardHeader } from './admin/components/DashboardHeader';
import { StatsCards } from './admin/components/StatsCards';
import { UsersTable } from './admin/components/UsersTable';
import { KeysTable } from './admin/components/KeysTable';
import { UsageLogsTable } from './admin/components/UsageLogsTable';
import { StatsBreakdown } from './admin/components/StatsBreakdown';
import { SettingsForm } from './admin/components/SettingsForm';
import { EditUserModal } from './admin/components/EditUserModal';

function AdminErrorFallback() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-workspace text-text-primary flex flex-col items-center justify-center p-6 text-center gap-4"
    >
      <h1 className="text-xl font-bold">تعذر عرض لوحة الإدارة</h1>
      <p className="text-sm text-text-secondary max-w-md">
        حدث خطأ غير متوقع أثناء عرض بيانات الإدارة. يمكنك إعادة تحميل الصفحة للمحاولة مجدداً.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold cursor-pointer"
      >
        إعادة تحميل الصفحة
      </button>
    </main>
  );
}

/**
 * AdminDashboard — مخرج محروس بـ ErrorBoundary يربط الجلسة وبيانات المستخدمين والمفاتيح.
 */
export default function AdminDashboard() {
  return (
    <ErrorBoundary fallback={<AdminErrorFallback />}>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}

function AdminDashboardContent() {
  const session = useAdminSession();
  const settings = useAdminSettings();
  const users = useAdminUsers(session.supabase, session.sessionOwnerRef);
  const keys = useAdminKeys(session.supabase, session.sessionOwnerRef);
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');

  const loading = users.loading || keys.loading;

  useEffect(() => {
    users.resetUsersData();
    keys.resetKeysData();
    if (session.isAuthenticated && session.supabase) {
      void users.loadUsersData();
      void keys.loadKeysData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated, session.checkingSession, session.supabase, session.sessionEpoch]);

  if (session.checkingSession) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <LoginForm
        sbUrl={session.sbUrl}
        sbKey={session.sbKey}
        email={session.email}
        password={session.password}
        loginLoading={session.loginLoading}
        onSbUrlChange={session.setSbUrl}
        onSbKeyChange={session.setSbKey}
        onEmailChange={session.setEmail}
        onPasswordChange={session.setPassword}
        onSubmit={session.handleLogin}
      />
    );
  }

  const handleSync = () => {
    void users.loadUsersData();
    void keys.loadKeysData();
  };

  // Session changes drive resets above; an old logout continuation must not reset a new owner.
  const handleLogout = session.handleLogout;

  return (
    <div
      className="admin-shell min-h-screen flex flex-col md:flex-row bg-[#121212] text-white font-sans selection:bg-[#3b82f6]/30 selection:text-white"
      dir="rtl"
    >
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-screen relative">
        <div className="aurora-bg" />

        <DashboardHeader activeTab={activeTab} loading={loading} onSync={handleSync} />

        <StatsCards
          totalUsers={users.totalUsers}
          usersCount={users.users.length}
          activePro={users.activePro}
          activeEnt={users.activeEnt}
          unusedKeys={keys.unusedKeys}
          keysCount={keys.keys.length}
          totalKeys={keys.totalKeys}
          totalAiRuns={users.totalAiRuns}
          aiLogsCount={users.aiUsageLogs.length}
          windowAiCost={users.windowAiCost}
          estimatedMRR={users.estimatedMRR}
          sampleTruncated={users.sampleTruncated}
        />

        {activeTab === 'users' && (
          <UsersTable
            searchQuery={users.searchQuery}
            statusFilter={users.statusFilter}
            filteredUsers={users.filteredUsers}
            onSearchChange={users.setSearchQuery}
            onStatusFilterChange={users.setStatusFilter}
            onExportCSV={users.handleExportCSV}
            onOpenEditUser={users.handleOpenEditUser}
            onExtendLicense={users.handleExtendLicense}
            onRevokeLicense={users.handleRevokeLicense}
            onToggleBanUser={users.handleToggleBanUser}
          />
        )}

        {activeTab === 'keys' && (
          <KeysTable
            genMode={keys.genMode}
            genPlan={keys.genPlan}
            genDuration={keys.genDuration}
            genCount={keys.genCount}
            genPrefix={keys.genPrefix}
            generatedKey={keys.generatedKey}
            generatedBatchKeys={keys.generatedBatchKeys}
            generatingBatch={keys.generatingBatch}
            keysCount={keys.keys.length}
            totalKeys={keys.totalKeys}
            keyStatusFilter={keys.keyStatusFilter}
            keySearchQuery={keys.keySearchQuery}
            filteredKeys={keys.filteredKeys}
            onGenModeChange={keys.setGenMode}
            onGenPlanChange={keys.setGenPlan}
            onGenDurationChange={keys.setGenDuration}
            onGenCountChange={keys.setGenCount}
            onGenPrefixChange={keys.setGenPrefix}
            onGenerateKey={keys.handleGenerateKey}
            onGenerateBatchKeys={keys.handleGenerateBatchKeys}
            onExportBatch={keys.handleExportBatch}
            onCopyKey={keys.handleCopyKey}
            onKeyStatusFilterChange={keys.setKeyStatusFilter}
            onKeySearchChange={keys.setKeySearchQuery}
          />
        )}

        {activeTab === 'usage' && (
          <UsageLogsTable aiUsageLogs={users.aiUsageLogs} totalAiRuns={users.totalAiRuns} />
        )}

        {activeTab === 'stats' && (
          <StatsBreakdown
            proCount={users.proCount}
            entCount={users.entCount}
            freeCount={users.freeCount}
            proPct={users.proPct}
            entPct={users.entPct}
            freePct={users.freePct}
            estimatedMRR={users.estimatedMRR}
            windowAiCost={users.windowAiCost}
            aiLogsCount={users.aiUsageLogs.length}
            sampleTruncated={users.sampleTruncated}
            usersCount={users.users.length}
            totalUsers={users.totalUsers}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsForm
            freeAiLimit={settings.freeAiLimit}
            proAiLimit={settings.proAiLimit}
            enterpriseAiLimit={settings.enterpriseAiLimit}
            systemNotice={settings.systemNotice}
            maintenanceMode={settings.maintenanceMode}
            savingSettings={settings.savingSettings}
            onFreeLimitChange={settings.setFreeAiLimit}
            onProLimitChange={settings.setProAiLimit}
            onEnterpriseLimitChange={settings.setEnterpriseAiLimit}
            onNoticeChange={settings.setSystemNotice}
            onMaintenanceToggle={() => settings.setMaintenanceMode(!settings.maintenanceMode)}
            onSubmit={settings.handleSaveSettings}
          />
        )}
      </main>

      <EditUserModal
        editModalUser={users.editModalUser}
        editName={users.editName}
        editEmail={users.editEmail}
        editPlan={users.editPlan}
        editStatus={users.editStatus}
        editExpiresAt={users.editExpiresAt}
        savingUser={users.savingUser}
        onClose={() => users.setEditModalUser(null)}
        onNameChange={users.setEditName}
        onPlanChange={users.setEditPlan}
        onStatusChange={users.setEditStatus}
        onExpiresChange={users.setEditExpiresAt}
        onSubmit={users.handleSaveUserProfile}
      />
    </div>
  );
}
