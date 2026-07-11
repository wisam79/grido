import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App';
import React from 'react';

// Mock Wails backend functions
vi.mock('../../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  SaveFile: vi.fn(() => Promise.resolve('success')),
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
}));

// Mock Wails runtime functions
vi.mock('../../wailsjs/runtime/runtime', () => ({
  WindowMinimise: vi.fn(),
  WindowToggleMaximise: vi.fn(),
  Quit: vi.fn(),
}));

// Mock ProjectHandler functions
vi.mock('../../../wailsjs/go/handlers/ProjectHandler', () => ({
  SaveProject: vi.fn(() => Promise.resolve('success')),
  GetAllProjects: vi.fn(() => Promise.resolve([])),
  GetProject: vi.fn(() => Promise.resolve(null)),
  DeleteProject: vi.fn(() => Promise.resolve('success')),
}));

// Mock KonvaCanvas to avoid loading canvas/konva dependencies in test
vi.mock('../src/components/editor/konva/konva-canvas', () => ({
  KonvaCanvas: () => null,
}));

// Mock ProjectsDialog to render trigger synchronously under lazy evaluation
vi.mock('../src/components/editor/projects-dialog', () => ({
  ProjectsDialog: ({ trigger }: any) => trigger || null,
}));

describe('Component Testing: UI Rendering', () => {
  it('renders the initial header and toolbar correctly', async () => {
    render(<App />);
    expect(screen.getByText('Grido Studio | استوديو الهوية')).toBeInTheDocument();
    expect(screen.getByTitle('رفع صورة جديدة')).toBeInTheDocument();
    expect(await screen.findByTitle('مكتبة المشاريع المحلية')).toBeInTheDocument();
  });

  it('renders the TemplatePanel correctly', () => {
    render(<App />);
    expect(screen.getByText('لون خلفية مساحة العمل')).toBeInTheDocument();
  });

  it('renders initial collage templates correctly', () => {
    render(<App />);
    
    // Open the templates dialog
    const openBtn = screen.getByText('قوالب الكولاج والطباعة');
    fireEvent.click(openBtn);

    expect(screen.getAllByText('طقم هوية ومعاملات عراقية (مختلط)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة البطاقة الوطنية وجواز السفر (8 صور)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ورقة الأحوال والجنسية العراقية (8 صور)')[0]).toBeInTheDocument();
  });
});
