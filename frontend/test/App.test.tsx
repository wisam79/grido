import {
  render,
  renderHook,
  screen,
  cleanup,
  act,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CheckPendingCrashReport, GetStartupFile } from '@bindings/grido/app';

import App from '../src/App';
import { TemplatePanel } from '../src/components/editor/panels/template-panel';
import { StartupSplash } from '../src/components/editor/system/startup-splash';
import { AppDialogsHost } from '../src/components/editor/workspace/app-dialogs-host';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  notifyFreeformTemplateSaved,
  setFreeformDialogOpen,
} from '../src/features/freeform-collage/lib/freeform-dialog-state';
import { useAppBootstrap } from '../src/hooks/use-app-bootstrap';
import { useEditorStore } from '../src/lib/editor-store';
import { GetLicenseStatus, LoginAccount } from '../wailsjs/go/handlers/LicenseHandler';
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

// 🚀 عدّادات تحميل وحدات حوارات التصدير/الطباعة — تثبت نمط «التركيب عند أول
// فتح»: وحدة الحوار لا تُطلب (dynamic import داخل lazy) قبل أول render له.
const dialogModuleLoads = vi.hoisted(() => ({ exportDialog: 0, printDialog: 0 }));

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
// (+ عدّاد التحميل لإثبات «التركيب عند أول فتح» في اختبار AppDialogsHost أدناه)
vi.mock('../src/components/editor/dialogs/export-dialog', () => {
  dialogModuleLoads.exportDialog += 1;
  return { ExportDialog: () => null };
});
vi.mock('../src/components/editor/dialogs/print-dialog', () => {
  dialogModuleLoads.printDialog += 1;
  return { PrintDialog: () => null };
});

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

    // التحقق من عرض محتوى تبويب القوالب المحفوظة
    expect(await screen.findByText('لا توجد قوالب محفوظة')).toBeInTheDocument();
  }, 15000);

  it('shows no illustrative layout before a freeform template is applied', async () => {
    useEditorStore.setState({ mode: 'collage', collageTemplate: null });
    render(<TemplatePanel activeCollageTab="freeform" />);

    expect(await screen.findByRole('button', { name: 'فتح المحرر' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^التخطيط المطبق:/ })).not.toBeInTheDocument();
  }, 15000);

  it('previews resumable freeform geometry with its paper ratio and rotation', async () => {
    useEditorStore.setState({
      mode: 'collage',
      collageTemplate: {
        id: 'freeform-preview',
        name: 'تخطيط تجريبي',
        slots: 1,
        cells: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, rotation: 90 }],
        metadata: { version: 1, kind: 'freeform', paperWidthMM: 200, paperHeightMM: 100 },
      },
    });
    render(<TemplatePanel activeCollageTab="freeform" />);

    const preview = await screen.findByRole('img', { name: 'التخطيط المطبق: تخطيط تجريبي' });
    expect(preview).toHaveAttribute('viewBox', '-1 -1 102 52');
    expect(preview.querySelector('rect[transform]')).toHaveAttribute(
      'transform',
      'rotate(90 25 20)',
    );
    expect(screen.getByRole('button', { name: 'تحرير التخطيط' })).toBeInTheDocument();
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

  it('defers export/print dialog chunks until their first open (mount-on-first-open)', async () => {
    const baseProps = {
      onExportOpenChange: vi.fn(),
      onPrintOpenChange: vi.fn(),
      crashReport: null,
      onRecoverCrash: async () => {},
      onDismissCrash: async () => {},
    };
    // قيم أساسية مستقلة عن ترتيب الاختبارات (الوحدات قد تكون طُلبت في اختبار سابق)
    const exportLoadsBefore = dialogModuleLoads.exportDialog;
    const printLoadsBefore = dialogModuleLoads.printDialog;

    const view = render(
      <TooltipProvider>
        <AppDialogsHost exportOpen={false} printOpen={false} {...baseProps} />
      </TooltipProvider>,
    );

    // قبل أي فتح: لا حوار يُركَّب ولا وحدة تُطلب (كانتا تُطلبان حزمهما عند الإقلاع)
    expect(dialogModuleLoads.exportDialog).toBe(exportLoadsBefore);
    expect(dialogModuleLoads.printDialog).toBe(printLoadsBefore);

    // أول فتح للتصدير: وحدته تُطلب مرة واحدة فقط، وطباعة تبقى بلا طلب
    view.rerender(
      <TooltipProvider>
        <AppDialogsHost exportOpen={true} printOpen={false} {...baseProps} />
      </TooltipProvider>,
    );
    await waitFor(() => expect(dialogModuleLoads.exportDialog).toBe(exportLoadsBefore + 1));
    expect(dialogModuleLoads.printDialog).toBe(printLoadsBefore);

    // الإغلاق يُبقي الحوار مركّباً (حركة إغلاق محفوظة) — لا إعادة طلب للوحدة
    view.rerender(
      <TooltipProvider>
        <AppDialogsHost exportOpen={false} printOpen={false} {...baseProps} />
      </TooltipProvider>,
    );
    expect(dialogModuleLoads.exportDialog).toBe(exportLoadsBefore + 1);
    expect(dialogModuleLoads.printDialog).toBe(printLoadsBefore);

    // أول فتح للطباعة: وحدتها تُطلب الآن فقط
    view.rerender(
      <TooltipProvider>
        <AppDialogsHost exportOpen={false} printOpen={true} {...baseProps} />
      </TooltipProvider>,
    );
    await waitFor(() => expect(dialogModuleLoads.printDialog).toBe(printLoadsBefore + 1));
    expect(dialogModuleLoads.exportDialog).toBe(exportLoadsBefore + 1);
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

describe('App workspace selection integration', () => {
  const preferencesKey = 'grido_workspace_layout_v1';
  let previousWidth: number;
  let previousPreferences: string | null;

  beforeEach(() => {
    previousWidth = window.innerWidth;
    previousPreferences = localStorage.getItem(preferencesKey);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ isInspectorPinned: true, isTemplatesDrawerOpen: true }),
    );
    useEditorStore.getState().reset();
    useEditorStore.setState({
      mode: 'collage',
      accountModalOpen: false,
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: previousWidth,
    });
    if (previousPreferences === null) localStorage.removeItem(preferencesKey);
    else localStorage.setItem(preferencesKey, previousPreferences);
  });

  it('keeps desktop panels collapsed when selection changes during Zen and restores them on exit', async () => {
    render(<App />);
    const zen = await screen.findByTestId('canvas-zen-mode-toggle');
    const templates = screen.getByTestId('workspace-panel-templates');
    const inspector = screen.getByTestId('workspace-panel-properties');
    const [firstSlot] = useEditorStore.getState().slots;

    act(() => useEditorStore.getState().selectElement(firstSlot.id));
    expect(inspector).toHaveAttribute('data-collapsed', 'false');
    fireEvent.click(zen);
    expect(templates).toHaveAttribute('data-collapsed', 'true');
    expect(inspector).toHaveAttribute('data-collapsed', 'true');

    act(() => useEditorStore.getState().selectElement(null));
    act(() => useEditorStore.getState().selectElement(firstSlot.id));
    expect(templates).toHaveAttribute('data-collapsed', 'true');
    expect(inspector).toHaveAttribute('data-collapsed', 'true');

    fireEvent.click(zen);
    expect(templates).toHaveAttribute('data-collapsed', 'false');
    expect(inspector).toHaveAttribute('data-collapsed', 'false');
    expect(useEditorStore.getState().selectedId).toBe(firstSlot.id);
  }, 15000);

  it('reveals an unpinned desktop inspector without pinning it and hides it on deselection', async () => {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ isInspectorPinned: false, isTemplatesDrawerOpen: true }),
    );
    render(<App />);
    const inspector = await screen.findByTestId('workspace-panel-properties');
    const pin = within(inspector).getByRole('button', {
      name: 'اللوحة تفاعلية مع التحديد (انقر للتثبيت الدائم)',
      hidden: true,
    });
    expect(inspector).toHaveAttribute('data-collapsed', 'true');
    expect(pin).toHaveAttribute('aria-pressed', 'false');

    act(() => useEditorStore.getState().selectElement(useEditorStore.getState().slots[0].id));
    expect(inspector).toHaveAttribute('data-collapsed', 'false');
    expect(pin).toHaveAttribute('aria-pressed', 'false');

    act(() => useEditorStore.getState().selectElement(null));
    expect(inspector).toHaveAttribute('data-collapsed', 'true');
  }, 15000);

  it('still opens the compact properties sheet when a canvas slot is selected', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 840 });
    render(<App />);
    await screen.findByTestId('workspace-layout');
    expect(screen.queryByRole('dialog', { name: 'لوحات العمل' })).not.toBeInTheDocument();

    act(() => useEditorStore.getState().selectElement(useEditorStore.getState().slots[0].id));
    const sheet = await screen.findByRole('dialog', { name: 'لوحات العمل' });
    expect(within(sheet).getByRole('tab', { name: 'الخصائص' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByTestId('workspace-panel-properties')).not.toBeInTheDocument();
  }, 15000);
});

describe('Startup splash regressions', () => {
  const activeProfile: NonNullable<Awaited<ReturnType<typeof GetLicenseStatus>>> = {
    id: 'startup-user',
    name: 'Startup User',
    email: 'startup@example.com',
    plan: 'pro',
    status: 'active',
    token: 'startup-session-token',
    refreshToken: '',
    createdAt: '',
    updatedAt: '',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    licenseKey: '',
  };

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((complete, fail) => {
      resolve = complete;
      reject = fail;
    });
    return { promise, resolve, reject };
  }

  function expectSplashOnly(message = 'جاري التهيئة ...') {
    const splash = screen.getByRole('main', { name: 'Grido Studio' });
    expect(within(splash).getByRole('status')).toHaveTextContent(message);
    expect(screen.queryByText('GRIDO')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('إدراج صورة جديدة')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
    return splash;
  }

  function expectEditorReady() {
    expect(screen.queryByRole('main', { name: 'Grido Studio' })).not.toBeInTheDocument();
    expect(screen.queryByText('جاري التهيئة ...')).not.toBeInTheDocument();
    expect(screen.getByText('GRIDO')).toBeInTheDocument();
    expect(screen.getByLabelText('إدراج صورة جديدة')).toBeInTheDocument();
    expect(screen.queryAllByRole('dialog', { name: 'الحساب والترخيص' })).toHaveLength(0);
  }

  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ user: null, accountModalOpen: false, licenseLoading: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    useEditorStore.setState({ user: null, accountModalOpen: false, licenseLoading: false });
  });

  it('labels one main and one polite status, with the real logo and geometry decorative', () => {
    const { unmount } = render(<StartupSplash />);
    const splash = expectSplashOnly();
    const title = screen.getByRole('heading', { level: 1, name: 'Grido Studio' });
    const status = screen.getByRole('status');

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(splash.tagName).toBe('MAIN');
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([title]);
    expect(title.id).not.toBe('');
    expect(splash).toHaveAttribute('aria-labelledby', title.id);
    expect(screen.getAllByRole('status')).toEqual([status]);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent(/^جاري التهيئة \.\.\.$/);

    const logo = splash.querySelector('svg[viewBox="0 0 1000 1000"]');
    expect(logo).toHaveAttribute('width', '96');
    expect(logo).toHaveAttribute('height', '96');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo).toHaveAttribute('focusable', 'false');
    expect(logo?.querySelector('path')).not.toBeNull();
    const logoParts = logo!.querySelectorAll('use');
    expect(logoParts.length).toBeGreaterThan(0);
    for (const part of logoParts) {
      const reference = part.getAttribute('href');
      expect(reference).toMatch(/^#/);
      expect(logo!.contains(document.getElementById(reference!.slice(1)))).toBe(true);
    }
    expect(logo!.querySelector('image, script, foreignObject')).toBeNull();
    for (const geometry of splash.querySelectorAll('svg')) {
      expect(geometry.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(splash.querySelector('img')).toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the editor and account modal out while license is pending, then enters immediately', async () => {
    const license = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
    // Existing Wails mocks use ordinary promises; bootstrap never calls cancellation methods.
    vi.mocked(GetLicenseStatus).mockReturnValueOnce(
      license.promise as ReturnType<typeof GetLicenseStatus>,
    );
    const startedAt = Date.now();

    try {
      render(<App />);
      expectSplashOnly();
      expect(useEditorStore.getState().accountModalOpen).toBe(false);

      await act(async () => {
        license.resolve(activeProfile);
      });

      // No clock advance, image load or animation-end event may be needed to dismiss the splash.
      expectEditorReady();
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
      expect(Date.now()).toBe(startedAt);
    } finally {
      // A failed assertion must not leave the store's single-flight license request pending.
      await act(async () => license.resolve(activeProfile));
    }
  }, 15000);

  it('waits for startup-file and crash-report reads, with no extra display delay afterward', async () => {
    const startupFile = deferred<Awaited<ReturnType<typeof GetStartupFile>>>();
    const crashReport = deferred<Awaited<ReturnType<typeof CheckPendingCrashReport>>>();
    vi.mocked(GetLicenseStatus).mockResolvedValueOnce(activeProfile);
    vi.mocked(GetStartupFile).mockReturnValueOnce(
      startupFile.promise as ReturnType<typeof GetStartupFile>,
    );
    vi.mocked(CheckPendingCrashReport).mockReturnValueOnce(
      crashReport.promise as ReturnType<typeof CheckPendingCrashReport>,
    );
    const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
    const crashCallsBefore = vi.mocked(CheckPendingCrashReport).mock.calls.length;
    const startedAt = Date.now();

    try {
      render(<App />);
      await act(async () => {});
      expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore + 1);
      expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore);
      expectSplashOnly();

      await act(async () => startupFile.resolve(''));
      expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore + 1);
      expectSplashOnly();

      await act(async () => crashReport.resolve(null));
      expectEditorReady();
      expect(Date.now()).toBe(startedAt);
    } finally {
      await act(async () => {
        startupFile.resolve('');
        crashReport.resolve(null);
      });
    }
  }, 15000);

  it('keeps a slow license check behind the splash even with a previously active user', async () => {
    const license = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
    vi.mocked(GetLicenseStatus).mockReturnValueOnce(
      license.promise as ReturnType<typeof GetLicenseStatus>,
    );
    const licenseCallsBefore = vi.mocked(GetLicenseStatus).mock.calls.length;
    const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
    useEditorStore.setState({ user: activeProfile });

    try {
      render(<App />);
      await act(async () => vi.advanceTimersByTimeAsync(3999));
      expectSplashOnly();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expectSplashOnly('التهيئة تستغرق وقتًا أطول. يرجى الانتظار.');
      expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'إغلاق التطبيق' })).toBeEnabled();
      await act(async () => vi.advanceTimersByTimeAsync(300000));
      expectSplashOnly('التهيئة تستغرق وقتًا أطول. يرجى الانتظار.');
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
      expect(GetLicenseStatus).toHaveBeenCalledTimes(licenseCallsBefore + 1);
      expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore);

      // A resolved native result may be its validated offline fallback, not only an online fetch.
      await act(async () => license.resolve(activeProfile));
      expectEditorReady();
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
    } finally {
      await act(async () => license.resolve(activeProfile));
    }
  }, 15000);

  it('keeps a technical failure visible and retries once without using the old active profile', async () => {
    const retry = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
    vi.mocked(GetLicenseStatus)
      .mockRejectedValueOnce(new Error('IPC temporarily unavailable'))
      .mockReturnValueOnce(retry.promise as ReturnType<typeof GetLicenseStatus>);
    const licenseCallsBefore = vi.mocked(GetLicenseStatus).mock.calls.length;
    const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
    const crashCallsBefore = vi.mocked(CheckPendingCrashReport).mock.calls.length;
    useEditorStore.setState({ user: activeProfile });

    try {
      render(<App />);
      await act(async () => {});
      const splash = expectSplashOnly('تعذّر التحقق من الجلسة. أعد المحاولة.');
      const logo = splash.querySelector('svg[viewBox="0 0 1000 1000"]');
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
      expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore);
      expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore);
      await act(async () => vi.advanceTimersByTimeAsync(5000));
      expectSplashOnly('تعذّر التحقق من الجلسة. أعد المحاولة.');

      const retryButton = screen.getByRole('button', { name: 'إعادة المحاولة' });
      act(() => {
        fireEvent.click(retryButton);
        fireEvent.click(retryButton);
      });
      await act(async () => {});
      expectSplashOnly();
      expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument();
      expect(GetLicenseStatus).toHaveBeenCalledTimes(licenseCallsBefore + 2);
      expect(splash.querySelector('svg[viewBox="0 0 1000 1000"]')).toBe(logo);
      await act(async () => retry.resolve(activeProfile));
      expectEditorReady();
      expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore + 1);
      expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore + 1);
    } finally {
      await act(async () => retry.resolve(activeProfile));
    }
  }, 15000);

  it('shows genuine session supersession as a lock result, not a retryable network error', async () => {
    useEditorStore.setState({ user: activeProfile });
    vi.mocked(GetLicenseStatus).mockRejectedValueOnce(
      new Error('ERR_SESSION_SUPERSEDED: تم تسجيل الدخول من جهاز آخر'),
    );
    render(<App />);
    await act(async () => {});

    expect(screen.queryByRole('main', { name: 'Grido Studio' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'النسخة مقفلة', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument();
    expect(useEditorStore.getState().user).toBeNull();
  }, 15000);

  it('cleans the slow timer and ignores bootstrap side effects after unmount', async () => {
    const license = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
    vi.mocked(GetLicenseStatus).mockReturnValueOnce(
      license.promise as ReturnType<typeof GetLicenseStatus>,
    );
    const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
    const crashCallsBefore = vi.mocked(CheckPendingCrashReport).mock.calls.length;
    const timersBefore = vi.getTimerCount();
    const view = renderHook(() => useAppBootstrap());
    view.unmount();
    expect(vi.getTimerCount()).toBe(timersBefore);

    await act(async () => license.resolve(null));
    expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore);
    expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore);
    expect(useEditorStore.getState().accountModalOpen).toBe(false);
  });

  it('shares a StrictMode license flight and performs post-license startup once', async () => {
    const license = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
    vi.mocked(GetLicenseStatus).mockReturnValueOnce(
      license.promise as ReturnType<typeof GetLicenseStatus>,
    );
    const licenseCallsBefore = vi.mocked(GetLicenseStatus).mock.calls.length;
    const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
    const crashCallsBefore = vi.mocked(CheckPendingCrashReport).mock.calls.length;
    const view = renderHook(() => useAppBootstrap(), {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });

    try {
      await act(async () => {});
      expect(GetLicenseStatus).toHaveBeenCalledTimes(licenseCallsBefore + 1);
      await act(async () => vi.advanceTimersByTimeAsync(4000));
      expect(view.result.current.initializationStatus).toBe('slow');
      await act(async () => license.resolve(activeProfile));
      expect(view.result.current.isInitializing).toBe(false);
      expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore + 1);
      expect(CheckPendingCrashReport).toHaveBeenCalledTimes(crashCallsBefore + 1);
    } finally {
      view.unmount();
      await act(async () => license.resolve(activeProfile));
    }
  });

  it.each(['empty profile', 'superseded error'])(
    'rechecks after authentication invalidates a late startup %s',
    async (outcome) => {
      const oldLicense = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
      const currentLicense = deferred<Awaited<ReturnType<typeof GetLicenseStatus>>>();
      vi.mocked(GetLicenseStatus)
        .mockReturnValueOnce(oldLicense.promise as ReturnType<typeof GetLicenseStatus>)
        .mockReturnValueOnce(currentLicense.promise as ReturnType<typeof GetLicenseStatus>);
      vi.mocked(LoginAccount).mockResolvedValueOnce(activeProfile);
      const licenseCallsBefore = vi.mocked(GetLicenseStatus).mock.calls.length;
      const startupCallsBefore = vi.mocked(GetStartupFile).mock.calls.length;
      const view = renderHook(() => useAppBootstrap());

      try {
        await act(async () => {
          await useEditorStore.getState().loginAccount('startup@example.com', 'test-password');
        });
        expect(GetLicenseStatus).toHaveBeenCalledTimes(licenseCallsBefore + 1);
        await act(async () => {
          if (outcome === 'superseded error') {
            oldLicense.reject(new Error('ERR_SESSION_SUPERSEDED: old session'));
          } else {
            oldLicense.resolve(null);
          }
        });
        expect(view.result.current.isInitializing).toBe(true);
        expect(GetLicenseStatus).toHaveBeenCalledTimes(licenseCallsBefore + 2);
        expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore);
        expect(useEditorStore.getState().accountModalOpen).toBe(false);
        await act(async () => currentLicense.resolve(activeProfile));
        expect(view.result.current.isInitializing).toBe(false);
        expect(GetStartupFile).toHaveBeenCalledTimes(startupCallsBefore + 1);
      } finally {
        view.unmount();
        await act(async () => {
          oldLicense.resolve(null);
          currentLicense.resolve(activeProfile);
        });
      }
    },
  );

  it('exposes retry only on an error and keeps a slow request non-retryable', () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();
    const view = render(<StartupSplash status="slow" onRetry={onRetry} onClose={onClose} />);
    expectSplashOnly('التهيئة تستغرق وقتًا أطول. يرجى الانتظار.');
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق التطبيق' }));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<StartupSplash status="error" onRetry={onRetry} onClose={onClose} />);
    const splash = expectSplashOnly('تعذّر التحقق من الجلسة. أعد المحاولة.');
    expect(within(splash).getByRole('status').querySelector('[aria-hidden="true"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    {
      session: 'an inactive profile without a token',
      profile: { ...activeProfile, status: 'expired', token: '' },
    },
    { session: 'no stored session', profile: null },
  ])(
    'routes $session to the existing lock/account screen, not the editor',
    async ({ profile }) => {
      vi.mocked(GetLicenseStatus).mockResolvedValueOnce(profile);
      const startedAt = Date.now();
      render(<App />);
      expectSplashOnly();

      await act(async () => {});

      expect(screen.queryByRole('main', { name: 'Grido Studio' })).not.toBeInTheDocument();
      expect(screen.queryByText('جاري التهيئة ...')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'النسخة مقفلة', hidden: true }),
      ).toBeInTheDocument();
      // Existing duplicate Radix hosts can aria-hide one another; only verify route ownership.
      const accountDialogs = screen.getAllByRole('dialog', { hidden: true });
      expect(accountDialogs.some((dialog) => dialog.textContent?.includes('الحساب والترخيص'))).toBe(
        true,
      );
      expect(useEditorStore.getState().accountModalOpen).toBe(true);
      expect(screen.queryByText('GRIDO')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('إدراج صورة جديدة')).not.toBeInTheDocument();
      expect(Date.now()).toBe(startedAt);
    },
    15000,
  );
});
