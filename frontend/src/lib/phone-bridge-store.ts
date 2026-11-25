import { create } from 'zustand';

export interface BridgeStatusSnapshot {
  isRunning?: boolean;
  pairedDevice?: string;
  receivedCount?: number;
  lastReceived?: string;
}

export interface PhoneBridgeState {
  isRunning: boolean;
  pairedDevice: string;
  receivedCount: number;
  lastReceived: string;
  setIsRunning: (isRunning: boolean) => void;
  setPairedDevice: (pairedDevice: string) => void;
  setReceivedCount: (count: number) => void;
  incrementReceivedCount: () => void;
  updateStatus: (status: BridgeStatusSnapshot) => void;
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

/** مزامنة لقطة حالة جسر الهاتف الواردة من الخلفية مع المتجر المركزي بمصدر واحد. */
export function syncPhoneBridgeStatus(status: {
  isRunning: boolean;
  pairedDevice: string;
  receivedCount: number;
  lastReceived: string;
}) {
  usePhoneBridgeStore.getState().updateStatus({
    isRunning: status.isRunning,
    pairedDevice: status.pairedDevice,
    receivedCount: status.receivedCount,
    lastReceived: status.lastReceived,
  });
}
