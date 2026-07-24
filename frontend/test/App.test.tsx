import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';
import React from 'react';
import { useEditorStore } from '../src/lib/editor-store';

// Mock Wails backend functions
vi.mock('../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  SaveFile: vi.fn(() => Promise.resolve('success')),
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
  CheckForUpdate: vi.fn(() => Promise.resolve({ has_update: false, version: '', release_notes: '' })),
  DownloadAndInstallUpdate: vi.fn(() => Promise.resolve()),
  ExportSupportLogs: vi.fn(() => Promise.resolve('')),
  LogFrontendError: vi.fn(() => Promise.resolve()),
  GetCustomTemplates: vi.fn(() => Promise.resolve([])),
  SaveCustomTemplate: vi.fn(() => Promise.resolve()),
  DeleteCustomTemplate: vi.fn(() => Promise.resolve()),
}));

// Mock Wails runtime functions
vi.mock('../wailsjs/runtime/runtime', () => ({
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
  Quit: vi.fn(),
  EventsOn: vi.fn(() => () => {}),
  EventsOff: vi.fn(),
}));

// Mock ProjectHandler functions
vi.mock('../wailsjs/go/handlers/ProjectHandler', () => ({
  SaveProject: vi.fn(() => Promise.resolve('success')),
  GetAllProjects: vi.fn(() => Promise.resolve([])),
  GetProject: vi.fn(() => Promise.resolve(null)),
  DeleteProject: vi.fn(() => Promise.resolve('success')),
}));

// Mock LicenseHandler functions
vi.mock('../wailsjs/go/handlers/LicenseHandler', () => ({
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
    expect(screen.getByLabelText('رفع صورة جديدة')).toBeInTheDocument();
    expect(await screen.findByLabelText('مكتبة المشاريع المحلية')).toBeInTheDocument();
  });

  it('renders the TemplatePanel correctly', async () => {
    render(<App />);
    expect(await screen.findByText('لون خلفية مساحة العمل')).toBeInTheDocument();
  });

  it('renders initial collage templates correctly', async () => {
    render(<App />);
    
    // Open the templates dialog
    const openBtn = await screen.findByText('قوالب الكولاج والطباعة');
    fireEvent.click(openBtn);

    expect(screen.getAllByText('طقم هوية ومعاملات عراقية (مختلط)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة البطاقة الوطنية وجواز السفر (8 صور)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة الأحوال والجنسية العراقية (8 صور)')[0]).toBeInTheDocument();
  });
});
