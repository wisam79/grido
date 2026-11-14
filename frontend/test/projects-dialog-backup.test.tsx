import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProjectsDialog } from '../src/components/editor/dialogs/projects-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { ExportBackupToPath } from '../wailsjs/go/handlers/BackupHandler';
import { SaveProject, GetAllProjects } from '../wailsjs/go/handlers/ProjectHandler';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new CancellablePromise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  await screen.findByRole('button', { name: 'فتح المشروع مشروع' });
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

describe('ProjectsDialog list states and fetch ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  const projectList = (name = 'مشروع') =>
    [{ id: 'p1', name }] as unknown as Awaited<ReturnType<typeof GetAllProjects>>;

  it('shows loading without claiming that the library is empty', async () => {
    const request = deferred<Awaited<ReturnType<typeof GetAllProjects>>>();
    vi.mocked(GetAllProjects).mockReturnValueOnce(request.promise);
    render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);
    await screen.findByRole('status', { name: 'جاري تحميل المشاريع' });
    expect(screen.queryByText('لا توجد مشاريع محفوظة')).not.toBeInTheDocument();
    expect(screen.queryByText('لا توجد نتائج')).not.toBeInTheDocument();
    await act(async () => request.resolve([]));
    expect(screen.getByText('لا توجد مشاريع محفوظة')).toBeInTheDocument();
  });

  it('distinguishes a failed fetch from empty/search-empty and retries only the list', async () => {
    vi.mocked(GetAllProjects).mockRejectedValueOnce('"تعذر الاتصال بالمكتبة"');
    render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر الاتصال بالمكتبة');
    expect(screen.queryByText('لا توجد مشاريع محفوظة')).not.toBeInTheDocument();
    expect(screen.queryByText('لا توجد نتائج')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await screen.findByRole('button', { name: 'فتح المشروع مشروع' });
    expect(GetAllProjects).toHaveBeenCalledTimes(2);
    expect(SaveProject).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears only the search when a populated library has no matches', async () => {
    render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);
    await screen.findByRole('button', { name: 'فتح المشروع مشروع' });
    const search = screen.getByRole('textbox', { name: 'بحث في المشاريع' });
    fireEvent.change(search, { target: { value: 'غير موجود' } });
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد مشاريع محفوظة')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('button', { name: 'فتح المشروع مشروع' })).toBeInTheDocument();
    expect(GetAllProjects).toHaveBeenCalledTimes(1);
  });

  it('shows a refresh error instead of exposing stale list actions', async () => {
    render(<ProjectsDialog open onOpenChange={vi.fn()} defaultTab="list" />);
    await screen.findByRole('button', { name: 'فتح المشروع مشروع' });
    fireEvent.click(screen.getByRole('tab', { name: 'حفظ' }));
    vi.mocked(GetAllProjects).mockRejectedValueOnce(new Error('refresh failed'));
    fireEvent.click(screen.getByRole('tab', { name: 'المشاريع' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('refresh failed');
    expect(screen.queryByRole('button', { name: 'فتح المشروع مشروع' })).not.toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores an old fetch %s/finally while a reopened session is loading',
    async (completion) => {
      const oldFetch = deferred<Awaited<ReturnType<typeof GetAllProjects>>>();
      const newFetch = deferred<Awaited<ReturnType<typeof GetAllProjects>>>();
      vi.mocked(GetAllProjects)
        .mockReturnValueOnce(oldFetch.promise)
        .mockReturnValueOnce(newFetch.promise);
      const ui = (open: boolean) => (
        <ProjectsDialog open={open} onOpenChange={vi.fn()} defaultTab="list" />
      );
      const view = render(ui(true));
      await waitFor(() => expect(GetAllProjects).toHaveBeenCalledTimes(1));
      view.rerender(ui(false));
      view.rerender(ui(true));
      await waitFor(() => expect(GetAllProjects).toHaveBeenCalledTimes(2));
      await act(async () => {
        if (completion === 'resolve') oldFetch.resolve(projectList('قديم'));
        else oldFetch.reject(new Error('old failure'));
      });
      expect(screen.getByRole('status', { name: 'جاري تحميل المشاريع' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
      await act(async () => newFetch.resolve(projectList('جديد')));
      expect(screen.getByRole('button', { name: 'فتح المشروع جديد' })).toBeInTheDocument();
      expect(screen.queryByText('قديم')).not.toBeInTheDocument();
    },
  );

  it('keeps the synchronous save guard during repeated Enter presses', async () => {
    const save = deferred<string>();
    vi.mocked(SaveProject).mockReturnValueOnce(save.promise as ReturnType<typeof SaveProject>);
    render(<ProjectsDialog open onOpenChange={vi.fn()} />);
    const name = screen.getByRole('textbox', { name: 'اسم المشروع' });
    fireEvent.change(name, { target: { value: '  محفوظ  ' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(SaveProject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(SaveProject).mock.calls[0][0]?.name).toBe('محفوظ');
    await act(async () => save.resolve('success'));
    expect(useEditorStore.getState().isDirty).toBe(false);
  });
});
