// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackProvider, useFeedback } from '../../../components/common/FeedbackProvider';
import type { AiUsageRecord, LicenseKey, UserProfile, UserStatusFilter } from '../types';
import { DashboardHeader } from './DashboardHeader';
import { KeysTable } from './KeysTable';
import { LoginForm } from './LoginForm';
import { SettingsForm } from './SettingsForm';
import { Sidebar } from './Sidebar';
import { StatsBreakdown } from './StatsBreakdown';
import { StatsCards } from './StatsCards';
import { UsageLogsTable } from './UsageLogsTable';
import { UserDetailsDrawer } from './UserDetailsDrawer';
import { UsersTable } from './UsersTable';

const cleanups: Array<() => void> = [];

async function mountNode(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mounted = true;
  const unmount = () => {
    if (mounted) {
      act(() => root.unmount());
      mounted = false;
      container.remove();
    }
  };
  cleanups.push(unmount);
  await act(async () => {
    root.render(element);
  });
  return { container, unmount };
}

const sampleUsers: UserProfile[] = [
  {
    id: 'user-1',
    name: 'أحمد المصور',
    email: 'ahmed@studio.test',
    plan: 'pro',
    expires_at: '2027-06-01T00:00:00Z',
    license_key: 'GRIDO-PRO-AAAA',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'user-2',
    name: 'ليلى ستوديو',
    email: 'laila@studio.test',
    plan: 'trial',
    expires_at: '2026-01-10T00:00:00Z',
    license_key: '',
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
];

const sampleLogs: AiUsageRecord[] = [
  {
    id: 'log-1',
    user_id: 'user-1',
    used_at: '2026-06-01T10:00:00Z',
    image_bytes: 2 * 1024 * 1024,
    execution_seconds: 3.5,
    cost_usd: 0,
  },
  {
    id: 'log-2',
    user_id: 'user-1',
    used_at: '2026-06-02T11:00:00Z',
    image_bytes: 1024 * 1024,
    execution_seconds: 2.0,
    cost_usd: 0.025,
  },
];

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  vi.unstubAllGlobals();
});

describe('Admin UI Desktop Identity & Organizational Components', () => {
  it('Sidebar exposes aria-current, real sync state without fake status claims, and accessible mobile toggle', async () => {
    const onTabChange = vi.fn();
    const onLogout = vi.fn();
    const { container } = await mountNode(
      <Sidebar
        activeTab="users"
        onTabChange={onTabChange}
        onLogout={onLogout}
        loading={false}
        lastSyncedAt={new Date('2026-06-01T12:30:00Z')}
        counts={{ users: 12, unusedKeys: 5, aiRuns: 40 }}
      />,
    );

    expect(container.textContent).not.toContain('النظام متصل');
    expect(container.textContent).not.toContain('قاعدة البيانات متصلة');
    expect(container.textContent).toContain('آخر مزامنة');

    const activeNav = container.querySelector<HTMLButtonElement>('button[aria-current="page"]');
    expect(activeNav?.textContent).toContain('إدارة المشتركين');

    const menuToggle = container.querySelector<HTMLButtonElement>('button[aria-controls="admin-mobile-nav"]')!;
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    act(() => menuToggle.click());
    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');

    const mobileKeysBtn = [...container.querySelectorAll('#admin-mobile-nav button')].find((b) =>
      b.textContent?.includes('مفاتيح التراخيص'),
    ) as HTMLButtonElement;
    act(() => mobileKeysBtn.click());
    expect(onTabChange).toHaveBeenCalledWith('keys');
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('DashboardHeader renders a real h1 heading and sync trigger', async () => {
    const onSync = vi.fn();
    const { container } = await mountNode(
      <DashboardHeader activeTab="keys" loading={false} onSync={onSync} />,
    );
    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toBe('إدارة وتوليد مفاتيح الترخيص');
    const syncBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('تحديث البيانات'),
    )!;
    act(() => syncBtn.click());
    expect(onSync).toHaveBeenCalledOnce();
  });

  it('StatsCards KPI buttons navigate/filter directly', async () => {
    const onFilterUsers = vi.fn();
    const onOpenUnusedKeys = vi.fn();
    const onNavigateTab = vi.fn();

    const { container } = await mountNode(
      <StatsCards
        totalUsers={20}
        usersCount={20}
        activePro={4}
        activeEnt={1}
        unusedKeys={8}
        keysCount={10}
        totalKeys={10}
        totalAiRuns={55}
        aiLogsCount={20}
        windowAiCost={0.25}
        estimatedMRR={109}
        sampleTruncated={false}
        onFilterUsers={onFilterUsers}
        onOpenUnusedKeys={onOpenUnusedKeys}
        onNavigateTab={onNavigateTab}
      />,
    );

    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
    act(() => buttons[0].click());
    expect(onFilterUsers).toHaveBeenCalledWith('all');
    act(() => buttons[1].click());
    expect(onFilterUsers).toHaveBeenCalledWith('pro');
    act(() => buttons[2].click());
    expect(onOpenUnusedKeys).toHaveBeenCalledOnce();
    act(() => buttons[3].click());
    expect(onNavigateTab).toHaveBeenCalledWith('usage');
    act(() => buttons[4].click());
    expect(onNavigateTab).toHaveBeenCalledWith('stats');
  });

  it('UsersTable supports sorting, filter counts, search clearing, and row inspection while preserving action button labels', async () => {
    const onInspect = vi.fn();
    const onEdit = vi.fn();
    const onRevoke = vi.fn();

    function UsersHarness() {
      const [search, setSearch] = useState('أحمد');
      const [filter, setFilter] = useState<UserStatusFilter>('all');
      const filtered = sampleUsers.filter((u) =>
        search ? u.name.includes(search) || u.email.includes(search) : true,
      );
      return (
        <UsersTable
          allUsers={sampleUsers}
          searchQuery={search}
          statusFilter={filter}
          filteredUsers={filtered}
          onSearchChange={setSearch}
          onStatusFilterChange={setFilter}
          onExportCSV={vi.fn()}
          onOpenEditUser={onEdit}
          onInspectUser={onInspect}
          onExtendLicense={vi.fn()}
          onRevokeLicense={onRevoke}
          onToggleBanUser={vi.fn()}
        />
      );
    }

    const { container } = await mountNode(<UsersHarness />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);

    const clearBtn = container.querySelector<HTMLButtonElement>('button[aria-label="مسح البحث"]')!;
    act(() => clearBtn.click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);

    const editBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === 'تعديل')!;
    act(() => editBtn.click());
    expect(onEdit).toHaveBeenCalledWith(sampleUsers[1]); // newest first puts user-2 first

    const inspectBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label^="تفاصيل حساب"]',
    )!;
    act(() => inspectBtn.click());
    expect(onInspect).toHaveBeenCalledOnce();

    const thead = container.querySelector('thead');
    expect(thead?.className).toContain('sticky');
    expect(thead?.className).toContain('top-0');
  });

  it('UsageLogsTable resolves user identities and preserves explicit $0.000 AI cost', async () => {
    const { container } = await mountNode(
      <UsageLogsTable
        aiUsageLogs={sampleLogs}
        totalAiRuns={2}
        usersLookup={{ 'user-1': sampleUsers[0] }}
      />,
    );
    expect(container.textContent).toContain('أحمد المصور');
    expect(container.textContent).toContain('ahmed@studio.test');
    expect(container.textContent).toContain('$0.000');
    expect(container.textContent).toContain('$0.025');
    expect(container.querySelector('thead')?.className).toContain('sticky');
  });

  it('UserDetailsDrawer opens with user metadata and filtered AI history inside FeedbackProvider', async () => {
    const onClose = vi.fn();
    await mountNode(
      <FeedbackProvider>
        <UserDetailsDrawer
          user={sampleUsers[0]}
          aiUsageLogs={sampleLogs}
          onClose={onClose}
          onOpenEditUser={vi.fn()}
          onExtendLicense={vi.fn()}
          onRevokeLicense={vi.fn()}
          onToggleBanUser={vi.fn()}
        />
      </FeedbackProvider>,
    );

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('أحمد المصور');
    expect(dialog.textContent).toContain('GRIDO-PRO-AAAA');
    expect(dialog.textContent).toContain('2 عملية');
    expect(dialog.textContent).toContain('$0.025');

    const closeBtn = document.querySelector<HTMLButtonElement>(
      'button[aria-label="إغلاق لوحة التفاصيل"]',
    )!;
    act(() => closeBtn.click());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('UserDetailsDrawer restores focus to the triggering drawer button after canceling nested confirmDialog', async () => {
    function DrawerConfirmHarness() {
      const { confirmDialog } = useFeedback();
      return (
        <UserDetailsDrawer
          user={sampleUsers[0]}
          aiUsageLogs={sampleLogs}
          onClose={vi.fn()}
          onOpenEditUser={vi.fn()}
          onExtendLicense={vi.fn()}
          onRevokeLicense={vi.fn()}
          onToggleBanUser={() => {
            void confirmDialog('هل تريد حظر المستخدم؟', { danger: true });
          }}
        />
      );
    }

    await mountNode(
      <FeedbackProvider>
        <DrawerConfirmHarness />
      </FeedbackProvider>,
    );

    const banBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((btn) =>
      btn.textContent?.includes('حظر الحساب'),
    )!;
    expect(banBtn).toBeTruthy();

    act(() => banBtn.focus());
    await act(async () => {
      banBtn.click();
    });

    const alertDialog = document.querySelector('[role="alertdialog"]');
    expect(alertDialog).not.toBeNull();
    const cancelBtn = Array.from(alertDialog!.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('إلغاء'),
    )!;

    await act(async () => {
      cancelBtn.click();
    });

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(banBtn);
  });

  it('StatsBreakdown displays trial tier, account health counts, and top AI consumers', async () => {
    const onFilterUsers = vi.fn();
    const { container } = await mountNode(
      <StatsBreakdown
        proCount={1}
        entCount={0}
        freeCount={0}
        proPct={50}
        entPct={0}
        freePct={0}
        estimatedMRR={15}
        windowAiCost={0.025}
        aiLogsCount={2}
        sampleTruncated={false}
        usersCount={2}
        totalUsers={2}
        users={sampleUsers}
        aiUsageLogs={sampleLogs}
        usersLookup={{ 'user-1': sampleUsers[0], 'user-2': sampleUsers[1] }}
        onFilterUsers={onFilterUsers}
      />,
    );
    expect(container.textContent).toContain('الباقة التجريبية (Trial)');
    expect(container.textContent).toContain('صحة الحسابات الحالية');
    expect(container.textContent).toContain('أكثر المستخدمين استهلاكاً لـ AI');
    expect(container.textContent).toContain('أحمد المصور');
  });

  it('LoginForm and SettingsForm wire accessible labels and toggles', async () => {
    const { container: loginBox } = await mountNode(
      <LoginForm
        sbUrl="https://x.supabase.co"
        sbKey="anon"
        email="admin@grido.test"
        password="secret"
        loginLoading={false}
        onSbUrlChange={vi.fn()}
        onSbKeyChange={vi.fn()}
        onEmailChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onSubmit={(e) => e.preventDefault()}
      />,
    );
    const togglePwd = loginBox.querySelector<HTMLButtonElement>(
      'button[aria-label="إظهار كلمة المرور"]',
    )!;
    expect(togglePwd.getAttribute('aria-pressed')).toBe('false');
    act(() => togglePwd.click());
    expect(
      loginBox.querySelector<HTMLButtonElement>('button[aria-label="إخفاء كلمة المرور"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');

    const onMaintenanceToggle = vi.fn();
    const { container: settingsBox } = await mountNode(
      <SettingsForm
        freeAiLimit={5}
        proAiLimit={15}
        enterpriseAiLimit={50}
        systemNotice=""
        maintenanceMode={true}
        savingSettings={false}
        onFreeLimitChange={vi.fn()}
        onProLimitChange={vi.fn()}
        onEnterpriseLimitChange={vi.fn()}
        onNoticeChange={vi.fn()}
        onMaintenanceToggle={onMaintenanceToggle}
        onSubmit={(e) => e.preventDefault()}
      />,
    );
    const switchBtn = settingsBox.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');
    act(() => switchBtn.click());
    expect(onMaintenanceToggle).toHaveBeenCalledOnce();
  });

  it('KeysTable supports collapsing generator header and resolves used_by user', async () => {
    const sampleKeys: LicenseKey[] = [
      {
        key: 'GRIDO-PRO-9999',
        plan: 'pro',
        duration_months: 12,
        status: 'used',
        user_id: 'user-1',
        created_at: '2026-04-01T10:00:00Z',
        activated_at: '2026-04-02T10:00:00Z',
      },
    ];
    const { container } = await mountNode(
      <FeedbackProvider>
        <KeysTable
          allKeys={sampleKeys}
          usersLookup={{ 'user-1': sampleUsers[0] }}
          genMode="single"
          genPlan="pro"
          genDuration="12"
          genCount="10"
          genPrefix=""
          generatedKey=""
          generatedBatchKeys={[]}
          generatingBatch={false}
          keysCount={1}
          totalKeys={1}
          keyStatusFilter="all"
          keySearchQuery=""
          filteredKeys={sampleKeys}
          onGenModeChange={vi.fn()}
          onGenPlanChange={vi.fn()}
          onGenDurationChange={vi.fn()}
          onGenCountChange={vi.fn()}
          onGenPrefixChange={vi.fn()}
          onGenerateKey={(e) => e.preventDefault()}
          onGenerateBatchKeys={(e) => e.preventDefault()}
          onExportBatch={vi.fn()}
          onCopyKey={vi.fn()}
          onKeyStatusFilterChange={vi.fn()}
          onKeySearchChange={vi.fn()}
        />
      </FeedbackProvider>,
    );

    expect(container.textContent).toContain('GRIDO-PRO-9999');
    expect(container.textContent).toContain('أحمد المصور');
    expect(container.textContent).toContain('توليد المفتاح');

    const collapseBtn = container.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')!;
    expect(collapseBtn.textContent).toContain('طي');
    act(() => collapseBtn.click());

    expect(collapseBtn.getAttribute('aria-expanded')).toBe('false');
    expect(collapseBtn.textContent).toContain('إظهار المُولّد');
    expect(container.textContent).not.toContain('توليد المفتاح');
  });
});
