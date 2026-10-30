import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import App from '../src/App';
import { TemplatePanel } from '../src/components/editor/panels/template-panel';
import { AppDialogsHost } from '../src/components/editor/workspace/app-dialogs-host';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  notifyFreeformTemplateSaved,
  setFreeformDialogOpen,
} from '../src/features/freeform-collage/lib/freeform-dialog-state';
import { useEditorStore } from '../src/lib/editor-store';
import { GetCustomTemplates } from '../wailsjs/go/main/App';

// Mock Wails v3 generated bindings — هوية الوحدات التي تستوردها App وحقاخها
// (useAppBootstrap/useAutoSave/useKeyboardShortcuts/logger) مباشرةً عبر @bindings/grido/app.
// بدون هذا المحاكاة تنفَّذ الربطات الحقيقية ($Call.ByID) وتحاول fetch إلى خادم Wails.
vi.mock('@bindings/grido/app', () => ({
  LogFrontendError: vi.fn(() => Promise.resolve()),
  GetStartupFile: vi.fn(() => Promise.resolve('')),
  ProcessLocalImageFile: vi.fn((p: string) => Promise.resolve(p)),
  CheckPendingCrashReport: vi.fn(() => Promise.resolve(null)),
  DismissCrashReport: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  SaveImageFromBase64: vi.fn(() => Promise.resolve('success')),
  EnhanceImageWithAI: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  ApplyMaskToImage: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
  SaveCustomTemplateWithMetadata: vi.fn(() => Promise.resolve()),
}));

// Mock Wails backend functions (شيم wailsjs/go/main/App — تستورده license-slice وبقية الوحدات غير المُرحَّلة)
vi.mock('../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  OpenMultipleFiles: vi.fn(() => Promise.resolve(['data:image/png;base64,mocked'])),
  SaveFile: vi.fn(() => Promise.resolve('success')),
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
  SaveImageFromBase64: vi.fn(() => Promise.resolve('success')),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
  CheckForUpdate: vi.fn(() =>
    Promise.resolve({
      has_update: false,
      current_version: 'v1.0.0',
      latest_version: 'v1.0.0',
      download_url: '',
      release_notes: '',
    }),
  ),
  DownloadAndInstallUpdate: vi.fn(() => Promise.resolve()),
  ExportSupportLogs: vi.fn(() => Promise.resolve('')),
  LogFrontendError: vi.fn(() => Promise.resolve()),
  GetCustomTemplates: vi.fn(() => Promise.resolve([])),
  GetLocalApiToken: vi.fn(() => Promise.resolve('test-local-api-session-token')),
  SaveCustomTemplate: vi.fn(() => Promise.resolve()),
  DeleteCustomTemplate: vi.fn(() => Promise.resolve()),
  ApplyMaskToImage: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  EnhanceImageWithAI: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  SelectExportDirectory: vi.fn(() => Promise.resolve('C:\\Export')),
  GetStartupFile: vi.fn(() => Promise.resolve('')),
  StartPhoneBridge: vi.fn(() => Promise.resolve({ isRunning: false, url: '', port: 0, ip: '' })),
  StopPhoneBridge: vi.fn(() => Promise.resolve()),
  GetPhoneBridgeStatus: vi.fn(() =>
    Promise.resolve({ isRunning: false, url: '', port: 0, ip: '', receivedCount: 0 }),
  ),
}));

// Mock Wails runtime functions
vi.mock('../wailsjs/runtime/runtime', () => ({
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
  WindowIsMaximised: vi.fn(() => Promise.resolve(false)),
  WindowMaximise: vi.fn(),
  WindowUnmaximise: vi.fn(),
  WindowGetSize: vi.fn(() => Promise.resolve({ w: 1024, h: 768 })),
  WindowSetSize: vi.fn(),
  WindowGetPosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
  WindowSetPosition: vi.fn(),
  WindowSetTitle: vi.fn(),
  Quit: vi.fn(),
  EventsOn: vi.fn(() => () => {}),
  EventsOnMultiple: vi.fn(() => () => {}),
  EventsOff: vi.fn(),
  EventsOffAll: vi.fn(),
  EventsOnce: vi.fn(),
  EventsEmit: vi.fn(),
  BrowserOpenURL: vi.fn(),
  OnFileDrop: vi.fn(),
  OnFileDropOff: vi.fn(),
  LogPrint: vi.fn(),
  LogTrace: vi.fn(),
  LogDebug: vi.fn(),
  LogInfo: vi.fn(),
  LogWarning: vi.fn(),
  LogError: vi.fn(),
  LogFatal: vi.fn(),
}));

// Mock ProjectHandler functions
vi.mock('../wailsjs/go/handlers/ProjectHandler', () => ({
  SaveProject: vi.fn(() => Promise.resolve('success')),
  GetAllProjects: vi.fn(() => Promise.resolve([])),
  GetProject: vi.fn(() => Promise.resolve(null)),
  DeleteProject: vi.fn(() => Promise.resolve('success')),
}));

// Mock BackupHandler functions
vi.mock('../wailsjs/go/handlers/BackupHandler', () => ({
  ExportBackup: vi.fn(() => Promise.resolve('C:/mock/backup.zip')),
  ImportBackup: vi.fn(() => Promise.resolve('success')),
  ResetLibrary: vi.fn(() => Promise.resolve('success')),
  Startup: vi.fn(() => Promise.resolve()),
}));

// Mock PrintHandler functions
vi.mock('../wailsjs/go/handlers/PrintHandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, imagePath: 'mock.png' })),
}));

// Mock LicenseHandler functions
vi.mock('../wailsjs/go/handlers/LicenseHandler', () => ({
  ActivateLicenseKey: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      token: 'test-token',
    }),
  ),
  GetLicenseStatus: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      hardwareId: 'test-hw-id',
      role: 'user',
    }),
  ),
  LoginAccount: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      token: 'test-token',
    }),
  ),
  LoginWithGoogle: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      token: 'test-token',
    }),
  ),
  Logout: vi.fn(() => Promise.resolve('success')),
  RegisterAccount: vi.fn((name: string, email: string) =>
    Promise.resolve({
      id: 'test-id',
      name: name || 'Test User',
      email: email || 'test@example.com',
      plan: 'trial',
      status: 'pending_otp',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      token: '',
    }),
  ),
  ResendOTP: vi.fn((email: string) =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: email || 'test@example.com',
      plan: 'trial',
      status: 'pending_otp',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      hardwareId: 'test-hw-id',
      role: 'user',
    }),
  ),
  ResetPassword: vi.fn(() => Promise.resolve('success')),
  VerifyRecoveryOTP: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      hardwareId: 'test-hw-id',
      role: 'user',
      token: 'test-jwt-token',
    }),
  ),
  VerifyOTP: vi.fn(() =>
    Promise.resolve({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      hardwareId: 'test-hw-id',
      role: 'user',
      token: 'test-token',
    }),
  ),
}));

// Mock KonvaCanvas to avoid loading canvas/konva dependencies in test
vi.mock('../src/components/editor/konva/konva-canvas', () => ({
  KonvaCanvas: () => null,
}));

// Mock ProjectsDialog to render trigger synchronously under lazy evaluation
vi.mock('../src/components/editor/dialogs/projects-dialog', () => ({
  ProjectsDialog: ({ trigger }: any) => trigger || null,
}));

// Mock ExportDialog and PrintDialog to avoid useStageRef errors during testing
vi.mock('../src/components/editor/dialogs/export-dialog', () => ({
  ExportDialog: () => null,
}));
vi.mock('../src/components/editor/dialogs/print-dialog', () => ({
  PrintDialog: () => null,
}));

describe('Component Testing: UI Rendering', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      mode: 'collage',
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any,
    });
  });

  afterEach(() => {
    act(() => setFreeformDialogOpen(false));
    cleanup();
  });

  it('renders the initial header and toolbar correctly', async () => {
    render(<App />);
    expect(await screen.findByText('GRIDO')).toBeInTheDocument();
    expect(await screen.findByLabelText('إدراج صورة جديدة')).toBeInTheDocument();
    expect(await screen.findByLabelText('مكتبة المشاريع')).toBeInTheDocument();
  }, 15000);

  it('renders the TemplatePanel correctly', async () => {
    localStorage.setItem(
      'grido_workspace_layout_v1',
      JSON.stringify({ lastActivePanel: 'templates' }),
    );
    // اللوح الافتراضي في الاستوديو هو «الملصقات» (الطبقات تبقى أول الشريط)
    useEditorStore.setState({ mode: 'single' });
    render(<App />);
    expect(await screen.findByTestId('studio-elements-stickers')).toBeInTheDocument();
  }, 15000);

  it('renders initial collage templates correctly', async () => {
    useEditorStore.setState({ mode: 'collage' });
    render(<TemplatePanel />);

    // العنوان السياقي الافتراضي هو "شبكة الكولاج" مع محتوى أبعاد الشبكة
    expect(await screen.findByText('شبكة الكولاج')).toBeInTheDocument();
    // التحقق من أن محتوى تبويب الشبكة هو التبويب الافتراضي عند فتح التطبيق
    expect(await screen.findByText('أبعاد الشبكة')).toBeInTheDocument();
    const activeTab = screen.getByRole('tab', { name: 'مخصص' });
    expect(activeTab).toHaveAttribute('aria-controls', 'collage-section-grid-content-custom');
    expect(screen.getByRole('tabpanel', { name: 'مخصص' })).toHaveAttribute(
      'id',
      'collage-section-grid-content-custom',
    );
    for (const tab of screen.getAllByRole('tab')) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).not.toBeNull();
      const panel = document.getElementById(panelId!);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
      expect(panel?.hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
    }
    expect(screen.queryByText('طقم سفر')).not.toBeInTheDocument();
  }, 15000);

  it('renders collage presets panel correctly', async () => {
    useEditorStore.setState({ mode: 'collage' });
    render(<TemplatePanel activeCollageTab="presets" />);

    // التحقق من عرض محتوى تبويب القوالب مباشرة
    expect(await screen.findByText('طقم سفر')).toBeInTheDocument();
  }, 15000);

  it('opens the freeform collage dialog from the shared app host', async () => {
    useEditorStore.setState({ accountModalOpen: false });
    render(
      <TooltipProvider>
        <AppDialogsHost
          exportOpen={false}
          onExportOpenChange={vi.fn()}
          printOpen={false}
          onPrintOpenChange={vi.fn()}
          crashReport={null}
          onRecoverCrash={async () => {}}
          onDismissCrash={async () => {}}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument();
    act(() => setFreeformDialogOpen(true));
    expect(await screen.findByRole('dialog', { name: 'الكولاج الحر' })).toBeInTheDocument();
  }, 15000);

  it('reloads custom templates when the freeform editor saves a template', async () => {
    const callsBefore = vi.mocked(GetCustomTemplates).mock.calls.length;
    render(<TemplatePanel activeCollageTab="presets" />);
    await waitFor(() => expect(GetCustomTemplates).toHaveBeenCalledTimes(callsBefore + 1));
    act(() => notifyFreeformTemplateSaved());
    await waitFor(() => expect(GetCustomTemplates).toHaveBeenCalledTimes(callsBefore + 2));
  }, 15000);

  it('hides only the duplicated panel header when embedded in the compact sheet', async () => {
    // في compact تعرض التبويبات الداخلية اسم الأداة نفسه، فرأس PanelShell
    // الثاني كان تكراراً — يُخفى وحده مع بقاء المحتوى كاملاً.
    useEditorStore.setState({ mode: 'collage' });
    render(<TemplatePanel hideHeader />);

    expect(await screen.findByText('أبعاد الشبكة')).toBeInTheDocument();
    expect(screen.queryByText('شبكة الكولاج')).toBeNull();
  }, 15000);
});
