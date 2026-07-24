import { Page } from '@playwright/test';

export async function setupWailsMock(page: Page) {
  await page.addInitScript(() => {
    const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const mockGo = {
      main: {
        App: {
          ApplyMaskToImage: async () => mockImage,
          CheckForUpdate: async () => ({ has_update: false, current_version: 'v1.0.0', latest_version: 'v1.0.0', download_url: '', release_notes: '' }),
          ClearAutoSave: async () => {},
          DeleteCustomTemplate: async () => 'success',
          DownloadAndInstallUpdate: async () => {},
          EnhanceImageWithAI: async () => mockImage,
          ExportSupportLogs: async () => 'C:/mock/logs.txt',
          GetCustomTemplates: async () => [],
          LoadAutoSave: async () => '',
          LogFrontendError: async () => {},
          OpenFile: async () => mockImage,
          OpenMultipleFiles: async () => [mockImage],
          SaveAutoSave: async () => {},
          SaveCustomTemplate: async () => 'success',
          SaveFile: async () => 'success',
          SaveFileDialog: async () => 'success',
          SaveImageFromBase64: async () => 'success',
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
          ActivateLicenseKey: async () => ({
            id: "mock-user",
            email: "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          }),
          GetLicenseStatus: async () => ({
            id: "mock-user",
            email: "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          }),
          LoginAccount: async () => ({
            id: "mock-user",
            email: "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          }),
          LoginWithGoogle: async () => ({
            id: "mock-user",
            email: "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          }),
          Logout: async () => 'success',
          RegisterAccount: async (name: string, email: string) => ({
            id: "mock-user",
            email: email || "e2e-test@grido.app",
            name: name || "E2E Tester",
            plan: "trial",
            status: "pending_otp",
            expiresAt: "2030-01-01T00:00:00Z",
            token: ""
          }),
          ResendOTP: async (email: string) => ({
            id: "mock-user",
            email: email || "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "trial",
            status: "pending_otp",
            expiresAt: "2030-01-01T00:00:00Z",
            token: ""
          }),
          VerifyOTP: async (email: string) => ({
            id: "mock-user",
            email: email || "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          })
        },
        PrintHandler: {
          ExportPrintSheet: async () => ({ success: true, imagePath: 'mock.png' })
        }
      }
    };

    const mockRuntime = {
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

    Object.defineProperty(window, 'go', {
      value: mockGo,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'runtime', {
      value: mockRuntime,
      writable: true,
      configurable: true,
    });
  });
}
