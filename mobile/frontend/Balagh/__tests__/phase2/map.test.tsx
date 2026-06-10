/**
 * Tests for Map screen (src/screens/Map.tsx)
 *
 * Uses @testing-library/react-native render + fireEvent.
 * @rnmapbox/maps is mocked via __mocks__/@rnmapbox/maps.js.
 *
 * Key areas tested:
 *  1. MapView renders
 *  2. LocationPermission modal shown on first launch
 *  3. LocationPermission modal hidden when already asked
 *  4. LocationPuck presence based on permission state
 *  5. Status pill label accuracy (via mocked computeStatus)
 *  6. Reduce-motion disables breathe animation loop
 *  7. Recenter FAB interaction
 *  8. Bottom tray navigation
 *  9. Offline pack download triggered after map loads
 */

import React from 'react';
import {
  render,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── @rnmapbox/maps is automatically picked up from __mocks__/@rnmapbox/maps.js

// ── Mock computeStatus so we can control the status pill output ───────────────

let mockComputeStatusResult: 'calm' | 'watch' | 'active' = 'calm';

jest.mock('../../src/domain/status', () => ({
  computeStatus: jest.fn((..._args: any[]) => mockComputeStatusResult),
  haversineKm: jest.requireActual('../../src/domain/status').haversineKm,
}));

// ── Mock db ───────────────────────────────────────────────────────────────────

const mockIncidents: any[] = [
  {
    id: 'i1',
    ref: 'BLG-TEST01',
    category: 'SUSPICIOUS',
    severity: 'medium',
    lat: 32.5145,
    lng: 35.157,
    localityId: 'umm-al-fahm',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    confirmations: 2,
    denials: 0,
    myVote: null,
  },
];

jest.mock('../../src/data/mock/db', () => ({
  LOCALITIES: [
    {
      id: 'umm-al-fahm',
      nameAr: 'أم الفحم',
      nameHe: 'אום אל-פחם',
      nameEn: 'Umm al-Fahm',
      lat: 32.5139,
      lng: 35.1566,
    },
  ],
  db: {
    incidents: {
      getAll: jest.fn(() => [...mockIncidents]),
      getById: jest.fn((id: string) => mockIncidents.find((i: any) => i.id === id)),
      add: jest.fn(),
      update: jest.fn(),
      resolve: jest.fn(),
    },
    notifications: {
      getAll: jest.fn(() => []),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      add: jest.fn(),
    },
  },
}));

// ── Mock eventEmitter ─────────────────────────────────────────────────────────

jest.mock('../../src/data/mock/eventEmitter', () => ({
  wsEventEmitter: {
    subscribe: jest.fn(() => jest.fn()),
    emit: jest.fn(),
  },
  startMockEmitter: jest.fn(),
  stopMockEmitter: jest.fn(),
}));

// ── Mock storage with controlled values ───────────────────────────────────────

let mockStorageMap: Record<string, string> = {};

jest.mock('../../src/core/storage', () => ({
  __esModule: true,
  default: {
    getString: jest.fn((key: string) => mockStorageMap[key]),
    setString: jest.fn((key: string, val: string) => {
      mockStorageMap[key] = val;
    }),
    getBoolean: jest.fn((key: string) => {
      const v = mockStorageMap[key];
      return v === undefined ? undefined : v === '1';
    }),
    setBoolean: jest.fn((key: string, val: boolean) => {
      mockStorageMap[key] = val ? '1' : '0';
    }),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  },
  StorageKeys: {
    LANGUAGE: 'language',
    LOCALITY_ID: 'localityId',
    ONBOARDING_DONE: 'onboardingDone',
    PRIVATE_KEY: 'identity_priv',
    BOOKMARKS: 'bookmarks',
    NOTIFICATION_NEARBY: 'notif_nearby',
    NOTIFICATION_STATUS: 'notif_status',
    NOTIFICATION_FOLLOWUP: 'notif_followup',
    READ_INCIDENTS: 'readIncidents',
    PENDING_REPORTS: 'pendingReports',
    LOCATION_PERMISSION_ASKED: 'locationPermAsked',
    LOCATION_GRANTED: 'locationGranted',
  },
}));

// ── Mock useReduceMotion ──────────────────────────────────────────────────────

let mockReduceMotion = false;

jest.mock('../../src/core/a11y/useReduceMotion', () => ({
  useReduceMotion: () => mockReduceMotion,
  getReduceMotion: () => mockReduceMotion,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import MapboxGL from '@rnmapbox/maps';
import { Animated, PermissionsAndroid } from 'react-native';
import MapScreen from '../../src/screens/Map';
import { useMapStore } from '../../src/domain/stores/map';

// ── Test helpers ──────────────────────────────────────────────────────────────

const mockNavigation: any = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

const mockRoute: any = {
  params: undefined,
  key: 'Map-test',
  name: 'Map',
};

function renderMap() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 44, left: 0, bottom: 34, right: 0 },
      }}>
      <MapScreen navigation={mockNavigation} route={mockRoute} />
    </SafeAreaProvider>,
  );
}

// Helper: set permission as already asked + denied, skip overlay
function setPermissionAlreadyAsked(granted: boolean) {
  mockStorageMap['locationPermAsked'] = '1';
  mockStorageMap['locationGranted'] = granted ? '1' : '0';
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockStorageMap = {};
  mockReduceMotion = false;
  mockComputeStatusResult = 'calm';
  jest.clearAllMocks();
  // Reset zustand map store to defaults
  useMapStore.setState({
    userLat: null,
    userLng: null,
    locationGranted: false,
    safetyState: 'calm',
    isRecenterVisible: false,
    activeIncidentId: null,
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Map screen', () => {
  // 1. MapView renders
  it('renders the MapboxGL MapView', async () => {
    const { getByTestId } = renderMap();
    await waitFor(() => {
      expect(getByTestId('mapbox-map-view')).toBeTruthy();
    });
  });

  // 2. LocationPermission modal shown on first load
  it('shows LocationPermission modal when LOCATION_PERMISSION_ASKED is not set', async () => {
    // mockStorageMap is empty → getBoolean returns undefined (falsy)
    const { getByText } = renderMap();
    await waitFor(() => {
      expect(getByText('متابعة')).toBeTruthy();
      expect(getByText('ليس الآن')).toBeTruthy();
    });
  });

  // 3. LocationPermission modal NOT shown when already asked
  it('does NOT show LocationPermission modal when LOCATION_PERMISSION_ASKED is already set', async () => {
    setPermissionAlreadyAsked(false);

    const { queryByText } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    expect(queryByText('متابعة')).toBeNull();
    expect(queryByText('ليس الآن')).toBeNull();
  });

  // 4a. When permission is granted → LocationPuck is shown
  it('shows LocationPuck when locationGranted is true', async () => {
    setPermissionAlreadyAsked(true);
    useMapStore.setState({ locationGranted: true });

    const { getByTestId } = renderMap();
    await waitFor(() => {
      expect(getByTestId('mapbox-location-puck')).toBeTruthy();
    });
  });

  // 4b. When permission is denied → LocationPuck is NOT shown, denied banner visible
  it('does not show LocationPuck when locationGranted is false, shows denied banner', async () => {
    setPermissionAlreadyAsked(false);
    useMapStore.setState({ locationGranted: false });

    const { queryByTestId, findByTestId } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    expect(queryByTestId('mapbox-location-puck')).toBeNull();

    const banner = await findByTestId('location-denied-banner');
    expect(banner).toBeTruthy();
  });

  // 5a. Status pill shows correct label for calm
  it('status pill shows calm label when computeStatus returns calm', async () => {
    setPermissionAlreadyAsked(false);
    mockComputeStatusResult = 'calm';

    const { findByText } = renderMap();

    // The map useEffect calls setSafetyState('calm') after mount
    // which sets the store → the pill reads from the store
    await findByText('هادئ');
  });

  // 5b. Status pill shows watch label
  it('status pill shows watch label when computeStatus returns watch', async () => {
    setPermissionAlreadyAsked(false);
    mockComputeStatusResult = 'watch';

    const { findByText } = renderMap();
    await findByText('يقظة');
  });

  // 5c. Status pill shows active label
  it('status pill shows active label when computeStatus returns active', async () => {
    setPermissionAlreadyAsked(false);
    mockComputeStatusResult = 'active';

    const { findByText } = renderMap();
    await findByText('خطر نشط');
  });

  // 6. Reduce-motion: Animated.loop is not called (breathe animation disabled)
  it('does not start breathe Animated.loop when reduceMotion is true', async () => {
    mockReduceMotion = true;
    setPermissionAlreadyAsked(false);
    mockComputeStatusResult = 'calm';

    const loopSpy = jest.spyOn(Animated, 'loop');

    renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 100));
    });

    expect(loopSpy).not.toHaveBeenCalled();
    loopSpy.mockRestore();
  });

  // 6b. Animated.loop IS called when reduceMotion is false and state is calm
  it('starts breathe Animated.loop when reduceMotion is false and safetyState is calm', async () => {
    mockReduceMotion = false;
    setPermissionAlreadyAsked(false);
    mockComputeStatusResult = 'calm';

    const loopSpy = jest.spyOn(Animated, 'loop');

    renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 100));
    });

    expect(loopSpy).toHaveBeenCalled();
    loopSpy.mockRestore();
  });

  // 7. Tapping "Not Now" dismisses the overlay
  it('tapping Not Now dismisses the overlay and shows denied banner', async () => {
    const storeModule = require('../../src/core/storage');

    const { getByText, queryByText, findByTestId } = renderMap();

    await waitFor(() => {
      expect(getByText('ليس الآن')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('ليس الآن'));
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    await waitFor(() => {
      expect(queryByText('متابعة')).toBeNull();
    });

    expect(storeModule.default.setBoolean).toHaveBeenCalledWith(
      'locationPermAsked',
      true,
    );
    expect(storeModule.default.setBoolean).toHaveBeenCalledWith(
      'locationGranted',
      false,
    );

    const banner = await findByTestId('location-denied-banner');
    expect(banner).toBeTruthy();
  });

  // 8. Pressing "Continue" in overlay requests location permission (Android)
  it('tapping Continue in overlay requests Android location permission', async () => {
    const permSpy = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED as any);

    const Platform = require('react-native').Platform;
    const origOS = Platform.OS;
    Platform.OS = 'android';

    const { getByText } = renderMap();

    await waitFor(() => {
      expect(getByText('متابعة')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('متابعة'));
      await new Promise<void>(r => setTimeout(() => r(), 100));
    });

    expect(permSpy).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    Platform.OS = origOS;
    permSpy.mockRestore();
  });

  // 9. Recenter FAB press updates store (sets isRecenterVisible to false)
  it('pressing Recenter FAB sets isRecenterVisible to false', async () => {
    setPermissionAlreadyAsked(true);
    useMapStore.setState({
      locationGranted: true,
      userLat: 32.5139,
      userLng: 35.1566,
      isRecenterVisible: true,
    });

    const { getByTestId } = renderMap();

    await waitFor(() => {
      expect(getByTestId('recenter-fab')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('recenter-fab'));
    });

    expect(useMapStore.getState().isRecenterVisible).toBe(false);
  });

  // 10. Feed pill navigates
  it('pressing feed pill calls navigate', async () => {
    setPermissionAlreadyAsked(false);

    const { getByTestId } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    fireEvent.press(getByTestId('feed-pill'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Feed');
  });

  // 11. Report FAB navigates to ReportCategory
  it('pressing report FAB navigates to ReportCategory', async () => {
    setPermissionAlreadyAsked(false);

    const { getByTestId } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    fireEvent.press(getByTestId('report-fab'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ReportCategory');
  });

  // 12. MapView loaded callback triggers offline pack download
  it('calls MapboxGL.offlineManager.getPacks after map loads', async () => {
    setPermissionAlreadyAsked(false);

    renderMap();

    await waitFor(() => {
      expect(MapboxGL.offlineManager.getPacks).toHaveBeenCalled();
    });
  });

  // 13. Settings toolbar button navigates
  it('pressing settings toolbar button navigates to Settings', async () => {
    setPermissionAlreadyAsked(false);

    const { getByTestId } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    fireEvent.press(getByTestId('toolbar-settings-btn'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  // 14. Inbox toolbar button navigates
  it('pressing inbox toolbar button navigates to Inbox', async () => {
    setPermissionAlreadyAsked(false);

    const { getByTestId } = renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    fireEvent.press(getByTestId('toolbar-inbox-btn'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Inbox');
  });

  // 15. Pin press calls setCamera (via Camera ref) and shows detail sheet
  // Note: Mapbox layers are native descriptors; testing actual onPress requires
  // manually firing the handler. We test that the selected incident state is set.
  it('setting activeIncidentId shows it in the store', async () => {
    setPermissionAlreadyAsked(false);

    renderMap();
    await act(async () => {
      await new Promise<void>(r => setTimeout(() => r(), 50));
    });

    // Simulate a pin press by directly updating the store as the handler would
    act(() => {
      useMapStore.getState().setActiveIncident('i1');
    });

    expect(useMapStore.getState().activeIncidentId).toBe('i1');
  });
});
