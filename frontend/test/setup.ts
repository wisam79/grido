import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(matchers);
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

// Mock Wails bindings
Object.defineProperty(window, 'go', {
  value: {
    main: {
      App: {
        ApplyMaskToImage: () => Promise.resolve(''),
        CheckForUpdate: () => Promise.resolve({ has_update: false, current_version: 'v1.0.0', latest_version: 'v1.0.0', download_url: '', release_notes: '' }),
        CleanUnusedMediaNow: () => Promise.resolve({ cleanedCount: 0, freedBytes: 0 }),
        ClearAutoSave: () => Promise.resolve(),
        DeleteCustomTemplate: () => Promise.resolve(),
        DownloadAndInstallUpdate: () => Promise.resolve(),
        EnhanceImageWithAI: () => Promise.resolve(''),
        ExportSupportLogs: () => Promise.resolve(''),
        GetCustomTemplates: () => Promise.resolve([]),
        GetImageDimensions: () => Promise.resolve({ width: 800, height: 600 }),
        GetMediaStorageStats: () => Promise.resolve({ count: 0, totalBytes: 0 }),
        GetPhoneBridgeStatus: () => Promise.resolve({ isRunning: false, url: '', receivedCount: 0, lastReceived: '' }),
        GetStartupFile: () => Promise.resolve(''),
        LoadAiUsageLogs: () => Promise.resolve('[]'),
        LoadAutoSave: () => Promise.resolve(''),
        LogFrontendError: () => Promise.resolve(),
        OpenDirectoryDialog: () => Promise.resolve([]),
        OpenFile: () => Promise.resolve(''),
        OpenMultipleFiles: () => Promise.resolve([]),
        SaveAiUsageLogs: () => Promise.resolve(),
        SaveAutoSave: () => Promise.resolve(),
        SaveCustomTemplate: () => Promise.resolve(),
        SaveFile: () => Promise.resolve(''),
        SaveFileDialog: () => Promise.resolve(''),
        SaveImageFromBase64: () => Promise.resolve(''),
        SelectExportDirectory: () => Promise.resolve(''),
        StartPhoneBridge: () => Promise.resolve({ ip: '127.0.0.1', port: 8741, token: 'mock-token', url: 'http://127.0.0.1:8741?token=mock-token', isRunning: true }),
        StopPhoneBridge: () => Promise.resolve(),
      }
    },
    handlers: {
      ProjectHandler: {
        SaveProject: () => Promise.resolve('success'),
        GetAllProjects: () => Promise.resolve([]),
        GetProject: () => Promise.resolve(null),
        DeleteProject: () => Promise.resolve('success'),
      },
      BackupHandler: {
        ExportBackup: () => Promise.resolve(''),
        ImportBackup: () => Promise.resolve('success'),
        ResetLibrary: () => Promise.resolve('success'),
      },
      PrintHandler: {
        ExportPrintSheet: () => Promise.resolve({ success: true, imagePath: '', filePath: '/tmp/sheet.png' }),
        PrintNative: () => Promise.resolve({ success: true, filePath: '/tmp/sheet.png' }),
      },
      LicenseHandler: {
        ActivateLicenseKey: () => Promise.resolve({}),
        GetLicenseStatus: () => Promise.resolve({}),
        LoginAccount: () => Promise.resolve({}),
        LoginWithGoogle: () => Promise.resolve({}),
        Logout: () => Promise.resolve('success'),
        RegisterAccount: () => Promise.resolve({}),
        ResendOTP: () => Promise.resolve({}),
        ResetPassword: () => Promise.resolve('success'),
        VerifyOTP: () => Promise.resolve({}),
        VerifyRecoveryOTP: () => Promise.resolve({}),
      }

    }
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'runtime', {
  value: {
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
  },
  writable: true,
  configurable: true,
});

