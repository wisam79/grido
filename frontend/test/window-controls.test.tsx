import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WindowControls } from '../src/components/editor/system/window-controls';

vi.mock('../../../../wailsjs/runtime/runtime', () => ({
  WindowSnapAssist: vi.fn(),
}));

describe('WindowControls Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders minimize, maximize, and close buttons', () => {
    const onMinimize = vi.fn();
    const onMaximize = vi.fn();
    const onClose = vi.fn();

    render(
      <WindowControls
        isMaximized={false}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    );

    expect(screen.getByLabelText('تصغير النافذة')).toBeDefined();
    expect(screen.getByLabelText('تكبير النافذة')).toBeDefined();
    expect(screen.getByLabelText('إغلاق التطبيق')).toBeDefined();
  });

  it('handles click events properly', () => {
    const onMinimize = vi.fn();
    const onMaximize = vi.fn();
    const onClose = vi.fn();

    render(
      <WindowControls
        isMaximized={false}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByLabelText('تصغير النافذة'));
    expect(onMinimize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('تكبير النافذة'));
    expect(onMaximize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('إغلاق التطبيق'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows restore label when isMaximized is true', () => {
    render(
      <WindowControls
        isMaximized={true}
        onMinimize={vi.fn()}
        onMaximize={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('استعادة حجم النافذة')).toBeDefined();
  });
});
