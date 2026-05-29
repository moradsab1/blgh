import { create } from 'zustand';
import type { SafetyState } from '../../core/types';

interface MapState {
  userLat: number | null;
  userLng: number | null;
  locationGranted: boolean;
  safetyState: SafetyState;
  isRecenterVisible: boolean;
  activeIncidentId: string | null;
  setUserLocation: (lat: number, lng: number) => void;
  setLocationGranted: (granted: boolean) => void;
  setSafetyState: (state: SafetyState) => void;
  setRecenterVisible: (visible: boolean) => void;
  setActiveIncident: (id: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  userLat: null,
  userLng: null,
  locationGranted: false,
  safetyState: 'calm',
  isRecenterVisible: false,
  activeIncidentId: null,

  setUserLocation: (lat, lng) => set({ userLat: lat, userLng: lng }),
  setLocationGranted: (granted) => set({ locationGranted: granted }),
  setSafetyState: (state) => set({ safetyState: state }),
  setRecenterVisible: (visible) => set({ isRecenterVisible: visible }),
  setActiveIncident: (id) => set({ activeIncidentId: id }),
}));
