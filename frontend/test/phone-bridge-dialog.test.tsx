import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { PhoneBridgeDialog } from '../src/components/editor/dialogs/phone-bridge-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import * as AppWails from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  StartPhoneBridge: vi.fn(),
  StopPhoneBridge: vi.fn(),
  GetPhoneBridgeStatus: vi.fn(),
}));

describe('PhoneBridgeDialog Component Tests', () => {
  const mockBridgeInfo = {
    url: 'http://192.168.1.100:8080',
    ip: '192.168.1.100',
    port: 8080,
    isRunning: true,
  };

  const mockStatus = {
    isRunning: true,
    url: 'http://192.168.1.100:8080',
    ip: '192.168.1.100',
    port: 8080,
    receivedCount: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppWails.StartPhoneBridge).mockResolvedValue(mockBridgeInfo as any);
    vi.mocked(AppWails.GetPhoneBridgeStatus).mockResolvedValue(mockStatus as any);
    vi.mocked(AppWails.StopPhoneBridge).mockResolvedValue(undefined);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders dialog title and description when open is true', async () => {
    renderWithProviders(<PhoneBridgeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('جسر كاميرا الهاتف')).toBeInTheDocument();
    expect(screen.getByText('التقاط الصور من هاتفك مباشرة وإسقاطها فوراً في مساحة العمل')).toBeInTheDocument();

    await waitFor(() => {
      expect(AppWails.StartPhoneBridge).toHaveBeenCalled();
    });
  });

  it('displays QR code, connection info, and received photos count', async () => {
    renderWithProviders(<PhoneBridgeDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('الجسر متصل ويعمل')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100:8080')).toBeInTheDocument();
      expect(screen.getByText('الصور المستلمة في هذه الجلسة:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('allows copying bridge URL to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderWithProviders(<PhoneBridgeDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTitle('نسخ الرابط')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTitle('نسخ الرابط');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('http://192.168.1.100:8080');
    });
  });

  it('restarts bridge when clicking restart button', async () => {
    renderWithProviders(<PhoneBridgeDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('إعادة تعيين الجلسة')).toBeInTheDocument();
    });

    const restartBtn = screen.getByText('إعادة تعيين الجلسة');
    fireEvent.click(restartBtn);

    await waitFor(() => {
      expect(AppWails.StopPhoneBridge).toHaveBeenCalled();
      expect(AppWails.StartPhoneBridge).toHaveBeenCalledTimes(2);
    });
  });

  it('displays error message and retry button when StartPhoneBridge fails', async () => {
    vi.mocked(AppWails.StartPhoneBridge).mockRejectedValueOnce(new Error('Network adapter error'));

    renderWithProviders(<PhoneBridgeDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('تعذر تشغيل خادم الكاميرا')).toBeInTheDocument();
      expect(screen.getByText('Network adapter error')).toBeInTheDocument();
      expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument();
    });

    // Test retry
    vi.mocked(AppWails.StartPhoneBridge).mockResolvedValueOnce(mockBridgeInfo as any);
    fireEvent.click(screen.getByText('إعادة المحاولة'));

    await waitFor(() => {
      expect(screen.getByText('الجسر متصل ويعمل')).toBeInTheDocument();
    });
  });
});
