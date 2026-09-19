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

    expect(screen.getByLabelText('تصغير')).toBeDefined();
    expect(screen.getByLabelText('تكبير')).toBeDefined();
    expect(screen.getByLabelText('إغلاق')).toBeDefined();
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

    fireEvent.click(screen.getByLabelText('تصغير'));
    expect(onMinimize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('تكبير'));
    expect(onMaximize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('إغلاق'));
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

    expect(screen.getByLabelText('استعادة')).toBeDefined();
  });
});
