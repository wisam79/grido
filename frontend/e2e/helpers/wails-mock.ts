import { Page } from '@playwright/test';

export async function setupWailsMock(page: Page) {
  await page.addInitScript(() => {
    const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    (window as any).go = {
      main: {
        App: {
          OpenFile: async () => mockImage,
          OpenMultipleFiles: async () => [mockImage],
          GetCustomTemplates: async () => [],
          SaveCustomTemplate: async () => 'success',
          DeleteCustomTemplate: async () => 'success',
          LoadAutoSave: async () => '',
          SaveAutoSave: async () => {},
          ClearAutoSave: async () => {},
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
          GetLicenseStatus: async () => ({
            id: "mock-user",
            email: "e2e-test@grido.app",
            name: "E2E Tester",
            plan: "pro",
            status: "active",
            expiresAt: "2030-01-01T00:00:00Z",
            token: "mock-token"
          }),
          Logout: async () => 'success'
        },
        PrintHandler: {
          ExportPrintSheet: async () => ({ success: true, imagePath: 'mock.png' })
        }
      }
    };
    (window as any).runtime = {
      WindowMinimise: () => {},
      WindowToggleMaximise: () => {},
      Quit: () => {},
    };
  });
}
