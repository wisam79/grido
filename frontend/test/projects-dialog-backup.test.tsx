import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProjectsDialog } from '../src/components/editor/dialogs/projects-dialog';
import { SaveFileDialog } from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/handlers/BackupHandler', () => ({
  ExportBackup: vi.fn(() => Promise.resolve('[{"id":"p1"}]')),
  ImportBackup: vi.fn(() => Promise.resolve('success')),
  ResetLibrary: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('../wailsjs/go/handlers/ProjectHandler', () => ({
  SaveProject: vi.fn(() => Promise.resolve('success')),
  GetAllProjects: vi.fn(() => Promise.resolve([])),
  DeleteProject: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** يفتح تبويب النسخ الاحتياطي وينقر «تصدير JSON». */
async function exportBackup() {
  render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);

  fireEvent.click(screen.getByRole('tab', { name: 'النسخ' }));
  fireEvent.click(await screen.findByRole('button', { name: 'تصدير JSON' }));

  await waitFor(() => expect(SaveFileDialog).toHaveBeenCalled());
}

describe('ProjectsDialog backup export result handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast when the save dialog reports success', async () => {
    vi.mocked(SaveFileDialog).mockResolvedValueOnce('success');

    await exportBackup();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم تصدير النسخة الاحتياطية'));
  });

  it('shows a cancel toast when the user dismisses the save dialog', async () => {
    vi.mocked(SaveFileDialog).mockResolvedValueOnce('');

    await exportBackup();

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('تم إلغاء التصدير'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('stays silent when the save dialog reports an error', async () => {
    vi.mocked(SaveFileDialog).mockResolvedValueOnce('Access is denied.');

    await exportBackup();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
