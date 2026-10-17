import { create } from 'zustand';

export interface PhoneBridgeState {
  isRunning: boolean;
  pairedDevice: string;
  receivedCount: number;
  lastReceived: string;
  setIsRunning: (isRunning: boolean) => void;
  setPairedDevice: (pairedDevice: string) => void;
  setReceivedCount: (count: number) => void;
  incrementReceivedCount: () => void;
  updateStatus: (status: {
    isRunning?: boolean;
    pairedDevice?: string;
    receivedCount?: number;
    lastReceived?: string;
  }) => void;
  reset: () => void;
}

export const usePhoneBridgeStore = create<PhoneBridgeState>((set) => ({
  isRunning: false,
  pairedDevice: '',
  receivedCount: 0,
  lastReceived: '',
  setIsRunning: (isRunning) => set({ isRunning }),
  setPairedDevice: (pairedDevice) => set({ pairedDevice }),
  setReceivedCount: (receivedCount) => set({ receivedCount }),
  incrementReceivedCount: () => set((state) => ({ receivedCount: state.receivedCount + 1 })),
  updateStatus: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set({ isRunning: false, pairedDevice: '', receivedCount: 0, lastReceived: '' }),
}));
