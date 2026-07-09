import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock Go bindings
vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
  ApplyMaskToImage: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock MediaPipe Tasks-Vision
vi.mock('@mediapipe/tasks-vision', () => {
  const mockSegmenter = {
    segment: vi.fn().mockReturnValue({
      categoryMask: {
        width: 100,
        height: 100,
        getAsUint8Array: () => new Uint8Array(10000).fill(1),
      },
    }),
  };
  return {
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({}),
    },
    ImageSegmenter: {
      createFromOptions: vi.fn().mockResolvedValue(mockSegmenter),
    },
  };
});

describe('ElementProperties - Main Thread Background Removal', () => {
  let ElementProperties: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Polyfill HTML globals missing in JSDOM
    (window as any).createImageBitmap = vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      close: () => {},
    } as any);

    (window as any).fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob([])),
    } as any);

    // Mock HTMLCanvasElement context and exports for JSDOM
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      createImageData: vi.fn().mockReturnValue({ data: new Uint8Array(40000) }),
      putImageData: vi.fn(),
    } as any);

    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mockdata");

    // Dynamically load the component to pick up the mocks
    const mod = await import('../src/components/editor/properties/element-properties');
    ElementProperties = mod.ElementProperties;
  });

  const dummyImageElement = {
    id: 'el-1',
    type: 'image' as const,
    x: 0.1,
    y: 0.1,
    width: 0.5,
    height: 0.5,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    imageSrc: '/local-image/dummy.png',
  };

  it('should run background removal on main thread and update element src on success', async () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    
    await act(async () => {
      fireEvent.click(removeBgBtn);
    });

    // Verify ApplyMaskToImage was called to generate the transparent image
    const { ApplyMaskToImage: mockApplyMask } = await import('../wailsjs/go/main/App');
    expect(mockApplyMask).toHaveBeenCalled();

    expect(onUpdateMock).toHaveBeenCalledWith('el-1', {
      imageSrc: '/local-image/saved-bg.png',
      originalImageSrc: '/local-image/dummy.png',
    });
  });

  it('should handle cancel button click and reset loading UI', async () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    
    // We mock getSegmenter to take a bit of time to check loading/canceling states
    const mediapipe = await import('@mediapipe/tasks-vision');
    let resolveSegmenter: any;
    const segmenterPromise = new Promise((resolve) => {
      resolveSegmenter = resolve;
    });
    vi.spyOn(mediapipe.ImageSegmenter, 'createFromOptions').mockImplementation(() => segmenterPromise as any);

    act(() => {
      fireEvent.click(removeBgBtn);
    });

    // UI should show the cancel button now
    expect(screen.getByTitle('إلغاء عملية عزل الخلفية')).toBeDefined();

    // Click cancel
    const cancelBtn = screen.getByTitle('إلغاء عملية عزل الخلفية');
    act(() => {
      fireEvent.click(cancelBtn);
    });

    // UI should reset back to normal
    expect(screen.queryByTitle('إلغاء عملية عزل الخلفية')).toBeNull();
    expect(screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي')).toBeDefined();
  });
});
