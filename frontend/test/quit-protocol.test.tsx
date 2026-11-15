import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RequestGracefulQuit, RespondGracefulQuit, SaveAutoSave } from '@bindings/grido/app';

import { QuitSaveFailedDialog } from '../src/components/editor/system/quit-save-failed-dialog';
import { requestAppClose, useQuitProtocol } from '../src/hooks/use-quit-protocol';
import { useEditorStore } from '../src/lib/editor-store';
import { EventsOn, Quit } from '../wailsjs/runtime/runtime';

vi.mock('@bindings/grido/app', () => ({
  RequestGracefulQuit: vi.fn(() => Promise.resolve(1)),
  RespondGracefulQuit: vi.fn(() => Promise.resolve(true)),
  LoadAutoSave: vi.fn(() => Promise.resolve('')),
  SaveAutoSave: vi.fn(() => Promise.resolve()),
  ClearAutoSave: vi.fn(() => Promise.resolve()),
}));

vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(() => () => {}),
  Quit: vi.fn(),
}));

function QuitHarness() {
  const { quitState, retryQuitSave, cancelQuit, quitWithoutSaving } = useQuitProtocol();
  return (
    <div>
      <span data-testid="quit-phase">{quitState.phase}</span>
      <span data-testid="quit-req">{quitState.requestId}</span>
      <QuitSaveFailedDialog
        quitState={quitState}
        onRetry={retryQuitSave}
        onCancel={cancelQuit}
        onQuitWithoutSaving={quitWithoutSaving}
      />
    </div>
  );
}

describe('useQuitProtocol & QuitSaveFailedDialog (RV-LIFE-01/02/04/06)', () => {
  let quitListeners: Array<(payload?: unknown) => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    quitListeners = [];
    useEditorStore.getState().reset();
    vi.mocked(EventsOn).mockImplementation((eventName, cb) => {
      if (eventName === 'app:quit-requested') {
        quitListeners.push(cb);
      }
      return () => {
        quitListeners = quitListeners.filter((item) => item !== cb);
      };
    });
    vi.mocked(SaveAutoSave).mockResolvedValue(undefined);
    vi.mocked(RespondGracefulQuit).mockResolvedValue(true);
    vi.mocked(RequestGracefulQuit).mockResolvedValue(1);
  });

  const emitQuitRequested = (requestId: number) => {
    for (const cb of quitListeners) {
      cb({ requestId });
    }
  };

  it('routes custom close button through RequestGracefulQuit instead of direct Quit', async () => {
    await requestAppClose();
    expect(RequestGracefulQuit).toHaveBeenCalledTimes(1);
    expect(Quit).not.toHaveBeenCalled();
  });

  it('commits focused textarea input before flushing and confirms quit on success', async () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.addEventListener('blur', () => {
      useEditorStore.getState().addTextElement('نص محفوظ عند الإغلاق');
    });

    try {
      render(<QuitHarness />);

      await act(async () => {
        emitQuitRequested(7);
      });

      await waitFor(() => {
        expect(RespondGracefulQuit).toHaveBeenCalledWith(7, 'saving');
        expect(RespondGracefulQuit).toHaveBeenCalledWith(7, 'confirm');
      });

      expect(SaveAutoSave).toHaveBeenCalledTimes(1);
      const savedPayload = vi.mocked(SaveAutoSave).mock.calls[0][0];
      expect(savedPayload).toContain('نص محفوظ عند الإغلاق');
      expect(Quit).not.toHaveBeenCalled();
    } finally {
      textarea.remove();
    }
  });

  it('does NOT quit automatically on save failure and supports retry, cancel, and explicit quit without saving', async () => {
    useEditorStore.getState().addTextElement('تعديل مهم');
    vi.mocked(SaveAutoSave).mockRejectedValueOnce(new Error('disk full'));

    render(<QuitHarness />);

    await act(async () => {
      emitQuitRequested(11);
    });

    await waitFor(() => {
      expect(screen.getByTestId('quit-phase').textContent).toBe('failed');
    });
    expect(RespondGracefulQuit).toHaveBeenCalledWith(11, 'saving');
    expect(RespondGracefulQuit).toHaveBeenCalledWith(11, 'failed');
    expect(RespondGracefulQuit).not.toHaveBeenCalledWith(11, 'confirm');
    expect(Quit).not.toHaveBeenCalled();
    expect(screen.getByText('تعذّر حفظ التعديلات الأخيرة قبل الإغلاق')).toBeTruthy();

    // Duplicate quit-requested while dialog is open is ignored without parallel flush
    await act(async () => {
      emitQuitRequested(11);
    });
    expect(SaveAutoSave).toHaveBeenCalledTimes(1);

    // 1) User cancels closing -> returns to idle and notifies backend cancel
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء الإغلاق' }));
    await waitFor(() => {
      expect(screen.getByTestId('quit-phase').textContent).toBe('idle');
    });
    expect(RespondGracefulQuit).toHaveBeenCalledWith(11, 'cancel');

    // 2) Second close fails again, then user retries and succeeds
    vi.mocked(SaveAutoSave).mockRejectedValueOnce(new Error('disk full again'));
    await act(async () => {
      emitQuitRequested(12);
    });
    await waitFor(() => {
      expect(screen.getByTestId('quit-phase').textContent).toBe('failed');
    });

    vi.mocked(SaveAutoSave).mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => {
      expect(RespondGracefulQuit).toHaveBeenCalledWith(12, 'confirm');
    });
  });

  it('allows explicit quit without saving after save failure', async () => {
    useEditorStore.getState().addTextElement('تعديل غير محفوظ');
    vi.mocked(SaveAutoSave).mockRejectedValueOnce(new Error('permission denied'));

    render(<QuitHarness />);

    await act(async () => {
      emitQuitRequested(21);
    });

    await waitFor(() => {
      expect(screen.getByTestId('quit-phase').textContent).toBe('failed');
    });

    fireEvent.click(screen.getByRole('button', { name: 'الخروج دون حفظ' }));
    await waitFor(() => {
      expect(RespondGracefulQuit).toHaveBeenCalledWith(21, 'confirm');
    });
  });
});
