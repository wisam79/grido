import { Page } from '@playwright/test';

// 1x1 transparent PNG data URL & base64
export const MOCK_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
export const MOCK_RAW_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

export const MOCK_USER_PROFILE = {
  id: "e2e-user-id",
  name: "E2E Tester",
  email: "e2e-test@grido.app",
  plan: "pro",
  token: "e2e-mock-token-12345",
  refreshToken: "e2e-refresh-token",
  createdAt: "2026-01-01T00:00:00Z",
  expiresAt: "2030-01-01T00:00:00Z",
  licenseKey: "GRIDO-PRO-E2E-TEST-KEY",
  status: "active",
  updatedAt: "2026-01-01T00:00:00Z",
};

export const MOCK_PROJECTS: any[] = [
  {
    id: "mock-proj-1",
    name: "مشروع اختباري أول",
    data: "{}",
    preview: MOCK_PNG_BASE64,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  }
];

export const MOCK_CUSTOM_TEMPLATES: any[] = [];

/**
 * خريطة استدعاءات Wails v3 عبر معرّفات الدوال الرقمية ($Call.ByID)
 * مستخرجة من frontend/bindings/grido/**
 */
export const WAILS_V3_METHOD_HANDLERS: Record<number, (...args: any[]) => any> = {
  // ── App bindings (frontend/bindings/grido/app.ts) ──
  3084559015: async () => MOCK_PNG_BASE64, // ApplyMaskRaw
  2977102455: async () => MOCK_PNG_BASE64, // ApplyMaskToImage
  2347956003: async () => ({ has_update: false, current_version: 'v1.0.0', latest_version: 'v1.0.0', download_url: '', release_notes: '' }), // CheckForUpdate
  3605864796: async () => ({ cleaned: 0 }), // CleanUnusedMediaNow
  485242536: async () => undefined, // ClearAutoSave
  1006108175: async () => undefined, // DeleteCustomTemplate
  2440793480: async () => undefined, // DownloadAndInstallUpdate
  2111291824: async () => MOCK_PNG_BASE64, // EnhanceImageWithAI
  2950359501: async () => 'C:/mock/logs.txt', // ExportSupportLogs
  4177774687: async (paths: string[]) => { // GetBatchImageDimensions
    const res: Record<string, { width: number; height: number }> = {};
    for (const p of paths || []) res[p] = { width: 800, height: 600 };
    return res;
  },
  345087440: async () => MOCK_CUSTOM_TEMPLATES, // GetCustomTemplates
  1522265743: async () => [], // GetDeviceProfiles
  143340993: async () => ({ width: 800, height: 600 }), // GetImageDimensions
  896689433: async () => ({ count: 1, size_bytes: 1024 }), // GetMediaStorageStats
  1794026154: async () => [], // GetPaperTemplates
  3709429484: async () => ({ isRunning: false, url: '', receivedCount: 0, lastReceived: '' }), // GetPhoneBridgeStatus
  3983598326: async () => '', // GetStartupFile
  984446249: async () => '[]', // LoadAiUsageLogs
  1086724551: async () => '', // LoadAutoSave
  514392429: async () => undefined, // LogFrontendError
  1188724780: async () => ['C:/mock/dir'], // OpenDirectoryDialog
  1958968983: async () => MOCK_PNG_BASE64, // OpenFile
  3894305329: async () => undefined, // OpenFolderInExplorer
  3132122792: async () => [MOCK_PNG_BASE64], // OpenMultipleFiles
  1049178424: async () => undefined, // OpenPath
  2892812386: async () => undefined, // SaveAiUsageLogs
  2863230114: async () => undefined, // SaveAutoSave
  1013443833: async () => 'success', // SaveCustomTemplate
  1166008166: async () => 'C:/mock/saved.png', // SaveFile
  211586642: async () => 'C:/mock/saved.png', // SaveFileDialog
  3958356690: async () => 'C:/mock/export', // SelectExportDirectory
  2207617336: async () => undefined, // SendNotification
  966799716: async () => undefined, // SetClipboardText
  1338676276: async () => undefined, // SetProgressBar
  1225131967: async () => undefined, // ShowItemInFolder
  93234400: async () => ({ ip: '127.0.0.1', port: 8741, token: 'mock-token', url: 'http://127.0.0.1:8741', isRunning: true }), // StartPhoneBridge
  1433752998: async () => undefined, // StopPhoneBridge
  2987688963: async () => undefined, // Startup / fallback
  2154875234: async () => undefined, // Shutdown / fallback

  // ── LicenseHandler bindings (frontend/bindings/grido/internal/handlers/licensehandler.ts) ──
  1507354738: async () => MOCK_USER_PROFILE, // ActivateLicenseKey
  2824574168: async () => MOCK_USER_PROFILE, // GetLicenseStatus
  4008420485: async () => MOCK_USER_PROFILE, // LoginAccount
  3777204317: async () => MOCK_USER_PROFILE, // LoginWithGoogle
  2529001923: async () => 'success', // Logout
  844537991: async () => MOCK_USER_PROFILE, // RegisterAccount
  2733599319: async () => MOCK_USER_PROFILE, // ResendOTP
  952907889: async () => 'success', // ResetPassword
  3668504133: async () => MOCK_USER_PROFILE, // VerifyOTP
  874821600: async () => MOCK_USER_PROFILE, // VerifyRecoveryOTP

  // ── ProjectHandler bindings (frontend/bindings/grido/internal/handlers/projecthandler.ts) ──
  4228529901: async () => 'success', // DeleteProject
  1640193742: async () => MOCK_PROJECTS, // GetAllProjects
  71630846: async () => MOCK_PROJECTS[0] || null, // GetProject
  2446384535: async () => 'success', // SaveProject

  // ── BackupHandler bindings (frontend/bindings/grido/internal/handlers/backuphandler.ts) ──
  1327210012: async () => 'C:/mock/backup.zip', // ExportBackup
  824902195: async () => 'success', // ImportBackup
  2659213342: async () => 'success', // ResetLibrary
  377054365: async () => 'success', // ResetSettings

  // ── PrintHandler bindings (frontend/bindings/grido/internal/handlers/printhandler.ts) ──
  334009393: async () => ({ success: true, imagePath: 'C:/mock/sheet.png', filePath: 'C:/mock/sheet.png' }), // ExportPrintSheet
  100771007: async () => ({ success: true, filePath: 'C:/mock/sheet.png' }), // PrintNative
};

/**
 * يقوم بتهيئة جسر محاكاة Wails v3 المتكامل لصفحة الاختبار في Playwright
 */
export async function setupWailsV3Bridge(page: Page, customHandlers?: Record<number, (...args: any[]) => any>) {
  const handlers = { ...WAILS_V3_METHOD_HANDLERS, ...customHandlers };

  // 1. اعتراض مسار استدعاءات Wails v3 Runtime Network Requests
  await page.route('**/wails/runtime', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    try {
      const payload = request.postDataJSON();
      // payload: { object: number, method: number, args?: { "call-id"?: string, methodID?: number, args?: any[] } }
      const objectId = payload?.object ?? 0;
      const rpcArgs = payload?.args;

      if (objectId === 0 && rpcArgs && typeof rpcArgs.methodID === 'number') {
        const methodId = rpcArgs.methodID;
        const callArgs = Array.isArray(rpcArgs.args) ? rpcArgs.args : [];

        if (handlers[methodId]) {
          const result = await handlers[methodId](...callArgs);
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(result !== undefined ? result : null),
          });
        }

        console.warn(`[Wails-v3-Mock] Unhandled methodID: ${methodId}`);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null),
        });
      }

      // باقي كائنات الـ Runtime (Window=6, Events=3, Clipboard=1, Application=2, System=8)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true),
      });
    } catch (err) {
      console.error('[Wails-v3-Mock] Error routing /wails/runtime:', err);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    }
  });

  // 2. اعتراض مسار الميديا والصور المحلية
  await page.route('**/local-image/**', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: MOCK_RAW_PNG,
    });
  });

  // 3. حقن كائنات التوافق العكسي وتجاوز شاشة الترحيب في بيئة الاختبار
  await page.addInitScript((mockImage) => {
    try {
      if (!localStorage.getItem('grido_workflow_mode')) {
        localStorage.setItem('grido_workflow_mode', 'studio');
      }
    } catch {
      // تجاهل أخطاء التخزين إن وجدت
    }

    const legacyMockGo = {
      main: {
        App: {
          ApplyMaskToImage: async () => mockImage,
          ApplyMaskRaw: async () => mockImage,
          CheckForUpdate: async () => ({ has_update: false, current_version: 'v1.0.0', latest_version: 'v1.0.0', download_url: '', release_notes: '' }),
          CleanUnusedMediaNow: async () => ({ cleaned: 0 }),
          ClearAutoSave: async () => {},
          DeleteCustomTemplate: async () => 'success',
          DownloadAndInstallUpdate: async () => {},
          EnhanceImageWithAI: async () => mockImage,
          ExportSupportLogs: async () => 'C:/mock/logs.txt',
          GetBatchImageDimensions: async () => ({}),
          GetCustomTemplates: async () => [],
          GetDeviceProfiles: async () => [],
          GetImageDimensions: async () => ({ width: 800, height: 600 }),
          GetMediaStorageStats: async () => ({ count: 1, size_bytes: 1024 }),
          GetPaperTemplates: async () => [],
          GetPhoneBridgeStatus: async () => ({ isRunning: false, url: '', receivedCount: 0, lastReceived: '' }),
          GetStartupFile: async () => '',
          LoadAiUsageLogs: async () => '[]',
          LoadAutoSave: async () => '',
          LogFrontendError: async () => {},
          OpenDirectoryDialog: async () => ['C:/mock/dir'],
          OpenFile: async () => mockImage,
          OpenFolderInExplorer: async () => {},
          OpenMultipleFiles: async () => [mockImage],
          OpenPath: async () => {},
          SaveAiUsageLogs: async () => {},
          SaveAutoSave: async () => {},
          SaveCustomTemplate: async () => 'success',
          SaveFile: async () => 'C:/mock/saved.png',
          SaveFileDialog: async () => 'C:/mock/saved.png',
          SaveImageFromBase64: async () => 'success',
          SelectExportDirectory: async () => 'C:/mock/export',
          SendNotification: async () => {},
          SetClipboardText: async () => {},
          SetProgressBar: async () => {},
          ShowItemInFolder: async () => {},
          StartPhoneBridge: async () => ({ ip: '127.0.0.1', port: 8741, token: 'mock', url: 'http://127.0.0.1:8741', isRunning: true }),
          StopPhoneBridge: async () => {},
        }
      },
      handlers: {
        ProjectHandler: {
          SaveProject: async () => 'success',
          GetAllProjects: async () => [],
          GetProject: async () => null,
          DeleteProject: async () => 'success',
        },
        LicenseHandler: {
          ActivateLicenseKey: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          GetLicenseStatus: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          LoginAccount: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          LoginWithGoogle: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          Logout: async () => 'success',
          RegisterAccount: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          ResendOTP: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          ResetPassword: async () => 'success',
          VerifyOTP: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
          VerifyRecoveryOTP: async () => ({ id: "e2e-user", plan: "pro", status: "active", expiresAt: "2030-01-01T00:00:00Z", token: "mock-tok" }),
        },
        BackupHandler: {
          ExportBackup: async () => 'C:/mock/backup.zip',
          ImportBackup: async () => 'success',
          ResetLibrary: async () => 'success',
          ResetSettings: async () => 'success',
        },
        PrintHandler: {
          ExportPrintSheet: async () => ({ success: true, imagePath: 'mock.png', filePath: 'C:/mock/sheet.png' }),
          PrintNative: async () => ({ success: true, filePath: 'C:/mock/sheet.png' })
        }
      }
    };

    const legacyMockRuntime = {
      EventsOnMultiple: () => () => {},
      EventsOn: () => () => {},
      EventsOff: () => {},
      EventsOffAll: () => {},
      EventsOnce: () => {},
      EventsEmit: () => {},
      BrowserOpenURL: () => {},
      WindowMinimise: () => {},
      WindowToggleMaximise: () => {},
      WindowIsMaximised: () => false,
      WindowMaximise: () => {},
      WindowUnmaximise: () => {},
      WindowRestore: () => {},
      WindowToggleFullscreen: () => {},
      WindowIsFullscreen: () => false,
      WindowSnapAssist: () => {},
      WindowGetSize: async () => ({ w: 1024, h: 768 }),
      WindowSetSize: () => {},
      WindowGetPosition: async () => ({ x: 0, y: 0 }),
      WindowSetPosition: () => {},
      WindowSetTitle: () => {},
      Quit: () => {},
      OnFileDrop: () => {},
      OnFileDropOff: () => {},
      LogPrint: () => {},
      LogTrace: () => {},
      LogDebug: () => {},
      LogInfo: () => {},
      LogWarning: () => {},
      LogError: () => {},
      LogFatal: () => {},
    };

    Object.defineProperty(window, 'go', { value: legacyMockGo, writable: true, configurable: true });
    Object.defineProperty(window, 'runtime', { value: legacyMockRuntime, writable: true, configurable: true });
  }, MOCK_PNG_BASE64);
}

/**
 * دالة انتظار قياسية لجاهزية مساحة عمل التطبيق في Playwright
 */
export async function waitForAppReady(page: Page, timeout = 20000) {
  // انتظار الكانفس الرئيسي أو الغلاف العام لمساحة العمل
  await page.locator('#canvas-area').or(page.getByTestId('workspace-canvas-shell')).first().waitFor({
    state: 'visible',
    timeout
  });
}
