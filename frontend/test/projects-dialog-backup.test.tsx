import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProjectsDialog } from '../src/components/editor/dialogs/projects-dialog';
import { ExportBackupToPath } from '../wailsjs/go/handlers/BackupHandler';

vi.mock('../wailsjs/go/handlers/BackupHandler', () => ({
  // 🌊 عقد التصدير الجديد: يفتح الحوار الأصلي في Go ويبثّ الأرشيف مباشرة إلى
  // المسار المختار — السلسلة الفارغة = ألغى المستخدم، والفشل يرفع استثناء.
  ExportBackupToPath: vi.fn(() => Promise.resolve('C:/mock/backup.json')),
  ImportBackup: vi.fn(() => Promise.resolve('success')),
  ResetLibrary: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('../wailsjs/go/handlers/ProjectHandler', () => ({
  SaveProject: vi.fn(() => Promise.resolve('success')),
  GetAllProjects: vi.fn(() => Promise.resolve([{ id: 'p1', name: 'مشروع' }])),
  DeleteProject: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** يفتح تبويب النسخ الاحتياطي وينقر «تصدير JSON». */
async function exportBackup() {
  render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);

  fireEvent.click(screen.getByRole('tab', { name: 'النسخ' }));
  fireEvent.click(await screen.findByRole('button', { name: 'تصدير JSON' }));

  await waitFor(() => expect(ExportBackupToPath).toHaveBeenCalled());
}

describe('ProjectsDialog backup export result handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast when the backend export completes', async () => {
    vi.mocked(ExportBackupToPath).mockResolvedValueOnce('C:/mock/backup.json');

    await exportBackup();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم تصدير النسخة الاحتياطية'));
  });

  it('shows a cancel toast when the user dismisses the save dialog', async () => {
    vi.mocked(ExportBackupToPath).mockResolvedValueOnce('');

    await exportBackup();

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('تم إلغاء التصدير'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the explicit error toast when the backend export rejects', async () => {
    vi.mocked(ExportBackupToPath).mockRejectedValueOnce(new Error('Access is denied.'));

    await exportBackup();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Access is denied.'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
