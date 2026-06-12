// __DEV__ is provided by React Native's global type declarations
declare const __DEV__: boolean;

export const USE_MOCK_API = true;

export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.balagh.app';

export const WS_URL = __DEV__
  ? 'ws://localhost:3000/ws'
  : 'wss://api.balagh.app/ws';

export const APP_SCHEME = 'balagh';
export const CRISIS_DEEP_LINK = `${APP_SCHEME}://crisis`;

export const INCIDENT_RADIUS_KM = 5;
export const WATCH_RADIUS_KM = 3;
export const ACTIVE_RADIUS_KM = 1;
export const WATCH_WINDOW_MIN = 60;
export const ACTIVE_WINDOW_MIN = 15;
export const ACTIVE_THRESHOLD = 3;

// An incident counts as "open" (shown as a map pin) for 24 hours after it
// is reported. The backend will enforce this window and serve only currently
// open incidents to the map; the mock layer simulates the same behavior.
export const OPEN_INCIDENT_WINDOW_HOURS = 24;

// Location privacy — incidents are never rendered as an exact point.
// Each open incident is drawn as a translucent circle covering roughly
// this ground radius so the precise location stays hidden.
export const INCIDENT_PRIVACY_RADIUS_M = 150;
