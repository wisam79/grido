import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock dependencies
vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
  ApplyMaskToImage: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('ElementProperties - Background Removal Worker Contract', () => {
  let mockWorkerInstance: any;
  let ElementProperties: any;

  beforeEach(async () => {
    // Reset module registry to clear state variables (like globalBgWorker and isWorkerBusy)
    vi.resetModules();
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      delete (window as any).globalBgWorker;
      delete (window as any).isModelCached;
    }
    
    // Mock the global Worker class
    mockWorkerInstance = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };
    
    global.Worker = vi.fn().mockImplementation(function(this: any) {
      this.postMessage = mockWorkerInstance.postMessage;
      this.terminate = mockWorkerInstance.terminate;
      return mockWorkerInstance;
    }) as any;

    // Dynamically load the component to pick up the fresh module state
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

  it('should spawn worker and post message to start background removal', () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    fireEvent.click(removeBgBtn);

    expect(global.Worker).toHaveBeenCalled();
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'remove_bg',
      imageSrc: '/local-image/dummy.png',
      elementId: 'el-1',
    });
  });

  it('should update progress text on receiving progress messages', () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    fireEvent.click(removeBgBtn);

    // Simulate progress message from worker
    act(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: {
            type: 'progress',
            key: 'compute:inference',
            current: 75,
            total: 100,
            elementId: 'el-1',
          },
        });
      }
    });

    expect(screen.getByText('تحليل الذكاء الاصطناعي... (75%)')).toBeInTheDocument();
  });

  it('should update element src on success and cleanup state', async () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    fireEvent.click(removeBgBtn);

    // Simulate success message from worker
    await act(async () => {
      if (mockWorkerInstance.onmessage) {
        await mockWorkerInstance.onmessage({
          data: {
            type: 'success',
            mimeType: 'image/png',
            base64: 'abc',
            elementId: 'el-1',
          },
        });
      }
    });

    expect(onUpdateMock).toHaveBeenCalledWith('el-1', {
      imageSrc: '/local-image/saved-bg.png',
    });
  });

  it('should handle cancel button click and resetting UI', () => {
    const onUpdateMock = vi.fn();
    render(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />);
    
    const removeBgBtn = screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي');
    fireEvent.click(removeBgBtn);

    // Worker is now busy and processing
    expect(screen.getByTitle('إلغاء عملية عزل الخلفية')).toBeInTheDocument();

    const cancelBtn = screen.getByTitle('إلغاء عملية عزل الخلفية');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTitle('إلغاء عملية عزل الخلفية')).not.toBeInTheDocument();
    expect(screen.getByTitle('إزالة الخلفية بالذكاء الاصطناعي')).toBeInTheDocument();
  });
});
