import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProjectsDialog } from '../src/components/editor/dialogs/projects-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { ExportBackupToPath } from '../wailsjs/go/handlers/BackupHandler';
import { SaveProject } from '../wailsjs/go/handlers/ProjectHandler';

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

describe('ProjectsDialog save history ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  async function startPendingSave() {
    let finishSave!: (value: string) => void;
    // This test controls completion only; native cancellation is not exercised.
    const pendingSave = new Promise<string>((resolve) => {
      finishSave = resolve;
    });
    vi.mocked(SaveProject).mockReturnValueOnce(
      pendingSave as unknown as ReturnType<typeof SaveProject>,
    );
    render(<ProjectsDialog open onOpenChange={vi.fn()} />);
    const name = screen.getByRole('textbox', { name: 'اسم المشروع' });
    await waitFor(() => expect(name).toBeEnabled());
    fireEvent.change(name, { target: { value: 'مشروع محفوظ' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المشروع' }));
    await waitFor(() => expect(SaveProject).toHaveBeenCalledTimes(1));
    return async () => {
      await act(async () => finishSave('success'));
    };
  }

  function editBackground(color: string) {
    act(() => {
      useEditorStore.getState().setBackgroundColor(color);
      useEditorStore.getState().pushHistory();
    });
  }

  it('anchors undo to the submitted snapshot when editing continues during save', async () => {
    useEditorStore.getState().markProjectSaved('p1', 'مشروع سابق');
    const previouslySavedColor = useEditorStore.getState().backgroundColor;
    editBackground('#112233');
    const finishSave = await startPendingSave();
    editBackground('#445566');

    await finishSave();

    expect(useEditorStore.getState().isDirty).toBe(true);
    act(() => useEditorStore.getState().undo());
    expect(useEditorStore.getState().backgroundColor).toBe('#112233');
    expect(useEditorStore.getState().isDirty).toBe(false);
    act(() => useEditorStore.getState().undo());
    expect(useEditorStore.getState().backgroundColor).toBe(previouslySavedColor);
    expect(useEditorStore.getState().isDirty).toBe(true);
    act(() => useEditorStore.getState().redo());
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it('accepts the save identity when the same document evicts its oldest history entry', async () => {
    editBackground('#112233');
    const finishSave = await startPendingSave();
    const initialSeed = useEditorStore.getState().history[0];
    for (let index = 0; index < 35; index += 1) {
      editBackground(`#${(0x223344 + index).toString(16)}`);
    }
    expect(useEditorStore.getState().history[0]).not.toBe(initialSeed);

    await finishSave();

    const savedId = vi.mocked(SaveProject).mock.calls[0][0]?.id;
    expect(savedId).toEqual(expect.any(String));
    expect(useEditorStore.getState().projectId).toBe(savedId);
    expect(useEditorStore.getState().lastSavedEntry?.backgroundColor).toBe('#112233');
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it('does not attach a completed save to a different document with the same null identity', async () => {
    editBackground('#112233');
    const finishSave = await startPendingSave();
    act(() => useEditorStore.getState().reset());
    editBackground('#445566');
    const newDocument = useEditorStore.getState();

    await finishSave();

    expect(useEditorStore.getState().projectId).toBeNull();
    expect(useEditorStore.getState().lastSavedEntry).toBe(newDocument.lastSavedEntry);
    expect(useEditorStore.getState().backgroundColor).toBe('#445566');
    expect(useEditorStore.getState().isDirty).toBe(true);
  });
});

describe('ProjectsDialog backup export result handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast when the backend export completes', async () => {
    vi.mocked(ExportBackupToPath).mockResolvedValueOnce('C:/mock/backup.json');

    await exportBackup();

    // مهلة صريحة: الموك يفور فوراً، لكن عامل CI المثقل بالتغطية قد يأخر الجدولة أكثر من الثانية الافتراضية
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم تصدير النسخة الاحتياطية'), {
      timeout: 4000,
    });
  });

  it('shows a cancel toast when the user dismisses the save dialog', async () => {
    vi.mocked(ExportBackupToPath).mockResolvedValueOnce('');

    await exportBackup();

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('تم إلغاء التصدير'), {
      timeout: 4000,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the explicit error toast when the backend export rejects', async () => {
    vi.mocked(ExportBackupToPath).mockRejectedValueOnce(new Error('Access is denied.'));

    await exportBackup();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Access is denied.'), {
      timeout: 4000,
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
