import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '../src/components/error-boundary';
import { clearAutoSave } from '../src/hooks/use-autosave';

vi.mock('../src/hooks/use-autosave', () => ({ clearAutoSave: vi.fn() }));
vi.mock('@bindings/grido/app', () => ({ LogFrontendError: vi.fn(() => Promise.resolve()) }));

function CrashingChild(): React.ReactNode {
  throw new Error('broken draft');
}

function fallback() {
  const ref = React.createRef<ErrorBoundary>();
  const view = render(
    <ErrorBoundary ref={ref}>
      <CrashingChild />
    </ErrorBoundary>,
  );
  return { ...view, ref };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(clearAutoSave).mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary draft recovery', () => {
  it('requires confirmation and does not clear when cancelled', () => {
    fallback();
    fireEvent.click(screen.getByRole('button', { name: 'مسح المسودة وإعادة التحميل' }));
    expect(clearAutoSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByRole('button', { name: 'تأكيد مسح المسودة' })).not.toBeInTheDocument();
    expect(clearAutoSave).not.toHaveBeenCalled();
  });

  it('awaits the real ordered draft clear, prevents repeated actions and reports failures', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(clearAutoSave).mockImplementation(
      () => new Promise<boolean>((_resolve, fail) => (reject = fail)),
    );
    fallback();
    fireEvent.click(screen.getByRole('button', { name: 'مسح المسودة وإعادة التحميل' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد مسح المسودة' }));
    expect(clearAutoSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'إعادة تحميل التطبيق' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'مسح المسودة وإعادة التحميل' }));
    expect(clearAutoSave).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('disk unavailable')));
    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر مسح المسودة');
    expect(screen.getByRole('button', { name: 'إعادة تحميل التطبيق' })).toBeEnabled();
  });

  it('does not reload if a newer document supersedes the offered clear', async () => {
    vi.mocked(clearAutoSave).mockResolvedValue(false);
    fallback();
    fireEvent.click(screen.getByRole('button', { name: 'مسح المسودة وإعادة التحميل' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد مسح المسودة' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('لم تُحذف المسودة');
  });
});
