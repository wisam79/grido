import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUiZoom } from '../src/hooks/use-ui-zoom';

vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

describe('useUiZoom', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('zoom');
  });

  it('يدعم تكبير الواجهة حتى 200% ولا يتجاوزه', () => {
    const { result } = renderHook(() => useUiZoom());

    act(() => result.current.setZoom(2));
    expect(result.current.zoomScale).toBe(2);
    expect(document.documentElement.style.zoom).toBe('2');

    act(() => result.current.zoomIn());
    expect(result.current.zoomScale).toBe(2);

    act(() => result.current.setZoom(3));
    expect(result.current.zoomScale).toBe(2);
  });
});
