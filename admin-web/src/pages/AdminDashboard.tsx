import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { buildUserLookupMap } from '../lib/admin-utils';
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
import { UserDetailsDrawer } from './admin/components/UserDetailsDrawer';

function AdminErrorFallback() {
  return (
    <main
      dir="rtl"
      className="admin-shell min-h-screen bg-[#141414] text-[#f5f5f5] flex flex-col items-center justify-center p-6 text-center gap-4"
    >
      <h1 className="text-lg font-semibold">تعذر عرض لوحة الإدارة</h1>
      <p className="text-xs text-[#a9afaf] max-w-md">
        حدث خطأ غير متوقع أثناء عرض بيانات الإدارة. يمكنك إعادة تحميل الصفحة للمحاولة مجدداً.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="admin-btn-primary h-8 px-4 text-xs font-semibold cursor-pointer"
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
  const usersLookup = useMemo(() => buildUserLookupMap(users.users), [users.users]);
  const keys = useAdminKeys(session.supabase, session.sessionOwnerRef, usersLookup);
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loading = users.loading || keys.loading;

  const inspectedUser =
    session.isAuthenticated && inspectedUserId ? (usersLookup[inspectedUserId] ?? null) : null;

  useEffect(() => {
    let cancelled = false;
    setInspectedUserId(null);
    setLastSyncedAt(null);
    users.resetUsersData();
    keys.resetKeysData();
    if (session.isAuthenticated && session.supabase) {
      void Promise.all([users.loadUsersData(), keys.loadKeysData()]).then(([usersOk, keysOk]) => {
        if (!cancelled && usersOk && keysOk) setLastSyncedAt(new Date());
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated, session.checkingSession, session.supabase, session.sessionEpoch]);

  if (session.checkingSession) {
    return (
      <div
        dir="rtl"
        className="admin-shell min-h-screen bg-[#141414] flex flex-col items-center justify-center gap-3 text-xs text-[#a9afaf]"
      >
        <Loader2 className="w-7 h-7 text-[#3b82f6] animate-spin" aria-hidden="true" />
        <span>جارٍ التحقق من جلسة المسؤول...</span>
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
    const syncEpoch = session.sessionEpoch;
    void Promise.all([users.loadUsersData(), keys.loadKeysData()]).then(([usersOk, keysOk]) => {
      if (session.sessionOwnerRef.current.epoch === syncEpoch && usersOk && keysOk) {
        setLastSyncedAt(new Date());
      }
    });
  };

  // Session changes drive resets above; an old logout continuation must not reset a new owner.
  const handleLogout = session.handleLogout;

  return (
    <div
      className="admin-shell min-h-screen flex flex-col md:flex-row bg-[#141414] text-[#f5f5f5] font-sans selection:bg-[#3b82f6]/30 selection:text-white"
      dir="rtl"
    >
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        loading={loading}
        lastSyncedAt={lastSyncedAt}
        counts={{
          users: users.totalUsers,
          unusedKeys: keys.unusedKeys,
          aiRuns: users.totalAiRuns,
        }}
      />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden p-3 sm:p-4 gap-2.5">
        <DashboardHeader
          activeTab={activeTab}
          loading={loading}
          lastSyncedAt={lastSyncedAt}
          onSync={handleSync}
        />

        {activeTab === 'users' && (
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
            onFilterUsers={(filter) => {
              users.setStatusFilter(filter);
              setActiveTab('users');
            }}
            onOpenUnusedKeys={() => {
              keys.setKeyStatusFilter('unused');
              setActiveTab('keys');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === 'users' && (
            <UsersTable
              allUsers={users.users}
              loading={users.loading}
              searchQuery={users.searchQuery}
              statusFilter={users.statusFilter}
              filteredUsers={users.filteredUsers}
              onSearchChange={users.setSearchQuery}
              onStatusFilterChange={users.setStatusFilter}
              onExportCSV={users.handleExportCSV}
              onOpenEditUser={users.handleOpenEditUser}
              onInspectUser={(u) => setInspectedUserId(u.id)}
              extendingUserId={users.extendingUserId}
              onExtendLicense={users.handleExtendLicense}
              onRevokeLicense={users.handleRevokeLicense}
              onToggleBanUser={users.handleToggleBanUser}
            />
          )}

          {activeTab === 'keys' && (
            <KeysTable
              allKeys={keys.keys}
              usersLookup={usersLookup}
              loading={keys.loading}
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
              onInspectUser={(u) => setInspectedUserId(u.id)}
            />
          )}

          {activeTab === 'usage' && (
            <UsageLogsTable
              aiUsageLogs={users.aiUsageLogs}
              totalAiRuns={users.totalAiRuns}
              usersLookup={usersLookup}
              loading={users.loading}
              onInspectUser={(u) => setInspectedUserId(u.id)}
            />
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
              users={users.users}
              aiUsageLogs={users.aiUsageLogs}
              usersLookup={usersLookup}
              onInspectUser={(u) => setInspectedUserId(u.id)}
              onFilterUsers={(filter) => {
                users.setStatusFilter(filter);
                setActiveTab('users');
              }}
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
        </div>
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

      <UserDetailsDrawer
        user={inspectedUser}
        aiUsageLogs={users.aiUsageLogs}
        onClose={() => setInspectedUserId(null)}
        onOpenEditUser={users.handleOpenEditUser}
        extendingUserId={users.extendingUserId}
        onExtendLicense={users.handleExtendLicense}
        onRevokeLicense={users.handleRevokeLicense}
        onToggleBanUser={users.handleToggleBanUser}
      />
    </div>
  );
}
