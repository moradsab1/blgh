import { create } from 'zustand';

interface NetState {
  isConnected: boolean;
  wasOffline: boolean;
  setConnected: (connected: boolean) => void;
}

export const useNetStore = create<NetState>((set) => ({
  isConnected: true,
  wasOffline: false,

  setConnected: (connected) => {
    set((state) => ({
      isConnected: connected,
      // Latches once we've seen a disconnect, so the UI can show a
      // "back online" banner after reconnect. (Pending-queue drain on
      // reconnect lands with the sync queue in a later phase.)
      wasOffline: connected ? state.wasOffline : true,
    }));
  },
}));
