import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { CrashRecoveryDialog } from '../src/components/crash-recovery-dialog';
import type { CrashReport } from '../bindings/grido/internal/service/models';

describe('CrashRecoveryDialog', () => {
  const dummyReport: CrashReport = {
    timestamp: '2026-10-02T12:00:00Z',
    app_version: 'v1.9.6',
    os: 'windows',
    arch: 'amd64',
    error: 'runtime error: invalid memory address or nil pointer dereference',
    stack_trace: 'goroutine 1 [running]:\nmain.test()\n\tc:/projects/grido/main.go:10',
    has_autosave: true,
  };

  it('renders nothing when report is null', () => {
    const { container } = render(
      <CrashRecoveryDialog open={true} report={null} onRecover={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders crash information and buttons when open with autosave', () => {
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText('تم رصد إغلاق غير متوقع')).toBeInTheDocument();
    expect(screen.getByText('استعادة المسودة ومتابعة العمل')).toBeInTheDocument();
    expect(screen.getByText('تجاهل والبدء بمشروع جديد')).toBeInTheDocument();
    expect(screen.getByText('نسخ التقرير')).toBeInTheDocument();
  });

  it('calls onRecover when clicking restore draft button', () => {
    const onRecover = vi.fn();
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={onRecover}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('استعادة المسودة ومتابعة العمل'));
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when clicking discard button', () => {
    const onDismiss = vi.fn();
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByText('تجاهل والبدء بمشروع جديد'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders single continue button when has_autosave is false', () => {
    const noAutosaveReport: CrashReport = {
      ...dummyReport,
      has_autosave: false,
    };

    render(
      <CrashRecoveryDialog
        open={true}
        report={noAutosaveReport}
        onRecover={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText('متابعة')).toBeInTheDocument();
    expect(screen.queryByText('استعادة المسودة ومتابعة العمل')).not.toBeInTheDocument();
  });

  it('expands technical stack trace details on toggle', () => {
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    const toggleBtn = screen.getByText('عرض التفاصيل الفنية (Stack Trace) ▼');
    fireEvent.click(toggleBtn);

    expect(screen.getByText(dummyReport.error)).toBeInTheDocument();
    expect(screen.getByText('إخفاء التفاصيل الفنية ▲')).toBeInTheDocument();
  });

  // 🛡️ انحدار: ESC أو النقر خارج النافذة كانا يستدعيان onOpenChange(false) ⇒
  // onDismiss() ⇒ ClearAutoSave() + reset()، أي تلف العمل المستعاد بصمت.
  it('does not dismiss on Escape — only explicit buttons may act', async () => {
    const onDismiss = vi.fn();
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(onDismiss).not.toHaveBeenCalled();
    });
    // والحوار ما زال معروضاً: الاختيار المتعمَّد لا يزال ممكناً
    expect(screen.getByText('تم رصد إغلاق غير متوقع')).toBeInTheDocument();
  });

  it('does not dismiss on outside pointer interaction', async () => {
    const onDismiss = vi.fn();
    render(
      <CrashRecoveryDialog
        open={true}
        report={dummyReport}
        onRecover={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
