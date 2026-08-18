import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';
import React from 'react';
import { useEditorStore } from '../src/lib/editor-store';

// Mock Wails backend functions
vi.mock('../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  OpenMultipleFiles: vi.fn(() => Promise.resolve(['data:image/png;base64,mocked'])),
  SaveFile: vi.fn(() => Promise.resolve('success')),
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
  SaveImageFromBase64: vi.fn(() => Promise.resolve('success')),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
  CheckForUpdate: vi.fn(() => Promise.resolve({ has_update: false, current_version: 'v1.0.0', latest_version: 'v1.0.0', download_url: '', release_notes: '' })),
  DownloadAndInstallUpdate: vi.fn(() => Promise.resolve()),
  ExportSupportLogs: vi.fn(() => Promise.resolve('')),
  LogFrontendError: vi.fn(() => Promise.resolve()),
  GetCustomTemplates: vi.fn(() => Promise.resolve([])),
  SaveCustomTemplate: vi.fn(() => Promise.resolve()),
  DeleteCustomTemplate: vi.fn(() => Promise.resolve()),
  ApplyMaskToImage: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  EnhanceImageWithAI: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  OpenExportsFolder: vi.fn(() => Promise.resolve()),
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
  ActivateLicenseKey: vi.fn(() => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    token: 'test-token'
  })),
  GetLicenseStatus: vi.fn(() => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    hardwareId: 'test-hw-id',
    role: 'user'
  })),
  LoginAccount: vi.fn(() => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    token: 'test-token'
  })),
  LoginWithGoogle: vi.fn(() => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    token: 'test-token'
  })),
  Logout: vi.fn(() => Promise.resolve('success')),
  RegisterAccount: vi.fn((name: string, email: string) => Promise.resolve({
    id: 'test-id',
    name: name || 'Test User',
    email: email || 'test@example.com',
    plan: 'trial',
    status: 'pending_otp',
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    token: ''
  })),
  ResendOTP: vi.fn((email: string) => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: email || 'test@example.com',
    plan: 'trial',
    status: 'pending_otp',
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    hardwareId: 'test-hw-id',
    role: 'user'
  })),
  ResetPassword: vi.fn(() => Promise.resolve('success')),
  VerifyRecoveryOTP: vi.fn(() => Promise.resolve({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    hardwareId: 'test-hw-id',
    role: 'user',
    token: 'test-jwt-token'
  })),
  VerifyOTP: vi.fn(() => Promise.resolve({

    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    hardwareId: 'test-hw-id',
    role: 'user',
    token: 'test-token'
  })),
}));

// Mock KonvaCanvas to avoid loading canvas/konva dependencies in test
vi.mock('../src/components/editor/konva/konva-canvas', () => ({
  KonvaCanvas: () => null,
}));

// Mock ProjectsDialog to render trigger synchronously under lazy evaluation
vi.mock('../src/components/editor/projects-dialog', () => ({
  ProjectsDialog: ({ trigger }: any) => trigger || null,
}));

// Mock ExportDialog and PrintDialog to avoid useStageRef errors during testing
vi.mock('../src/components/editor/export-dialog', () => ({
  ExportDialog: () => null,
}));
vi.mock('../src/components/editor/print-dialog', () => ({
  PrintDialog: () => null,
}));

describe('Component Testing: UI Rendering', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any
    });
  });

  it('renders the initial header and toolbar correctly', async () => {
    render(<App />);
    expect(await screen.findByText('Grido Studio | استوديو الهوية')).toBeInTheDocument();
    expect(await screen.findByLabelText('إضافة صورة جديدة')).toBeInTheDocument();
    expect(await screen.findByLabelText('مكتبة المشاريع المحلية')).toBeInTheDocument();
  }, 15000);

  it('renders the TemplatePanel correctly', async () => {
    render(<App />);
    expect(await screen.findByText('لون خلفية مساحة العمل')).toBeInTheDocument();
  }, 15000);

  it('renders initial collage templates correctly', async () => {
    render(<App />);
    
    // Open the templates dialog
    const openBtn = await screen.findByText('قوالب الكولاج والطباعة');
    await act(async () => {
      fireEvent.click(openBtn);
    });

    expect(screen.getAllByText('طقم هوية ومعاملات عراقية (مختلط)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة البطاقة الوطنية وجواز السفر (8 صور)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة الأحوال والجنسية العراقية (8 صور)')[0]).toBeInTheDocument();
  }, 15000);
});
