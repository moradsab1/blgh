/**
 * Jest manual mock for @rnmapbox/maps.
 *
 * Map.tsx imports:
 *   import MapboxGL from '@rnmapbox/maps';
 * and accesses MapboxGL.MapView, .Camera, .ShapeSource, .CircleLayer,
 * .SymbolLayer, .LocationPuck, .setAccessToken, .requestAndroidLocationPermissions,
 * .offlineManager, .StyleURL.
 *
 * All React components are simple functional stubs that satisfy the shape
 * expected by @testing-library/react-native.
 */

'use strict';

const React = require('react');
const { View } = require('react-native');

// ── Component stubs ───────────────────────────────────────────────────────────

/** MapView renders children and calls onDidFinishLoadingMap on mount. */
const MapView = React.forwardRef(function MapView(props, _ref) {
  const { children, onDidFinishLoadingMap, testID, ...rest } = props;

  React.useEffect(() => {
    if (typeof onDidFinishLoadingMap === 'function') {
      onDidFinishLoadingMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement(
    View,
    { testID: testID || 'mapbox-map-view', ...rest },
    children,
  );
});

MapView.displayName = 'MapboxGL.MapView';

/** Camera exposes a setCamera method via ref (forwardRef). */
const Camera = React.forwardRef(function Camera(_props, ref) {
  React.useImperativeHandle(ref, () => ({
    setCamera: jest.fn(),
    flyTo: jest.fn(),
    zoomTo: jest.fn(),
  }));
  return null;
});

Camera.displayName = 'MapboxGL.Camera';

/** ShapeSource renders children so layers nested inside it are rendered. */
const ShapeSource = React.forwardRef(function ShapeSource(props, _ref) {
  const { children, testID, ...rest } = props;
  return React.createElement(
    View,
    { testID: testID || 'mapbox-shape-source', ...rest },
    children,
  );
});

ShapeSource.displayName = 'MapboxGL.ShapeSource';

/** CircleLayer renders nothing — it's a descriptor consumed by Mapbox native. */
function CircleLayer(_props) {
  return null;
}
CircleLayer.displayName = 'MapboxGL.CircleLayer';

/** SymbolLayer renders nothing. */
function SymbolLayer(_props) {
  return null;
}
SymbolLayer.displayName = 'MapboxGL.SymbolLayer';

/** LocationPuck renders a View so tests can assert its presence via testID. */
function LocationPuck(props) {
  return React.createElement(View, {
    testID: props.testID || 'mapbox-location-puck',
  });
}
LocationPuck.displayName = 'MapboxGL.LocationPuck';

// ── Offline manager ───────────────────────────────────────────────────────────

const offlineManager = {
  createPack: jest.fn((_opts, _progressCb, _errorCb) => Promise.resolve({})),
  getPacks: jest.fn(() => Promise.resolve([])),
  deletePack: jest.fn(() => Promise.resolve()),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

// ── StyleURL constants ────────────────────────────────────────────────────────

const StyleURL = {
  Dark: 'mapbox://styles/mapbox/dark-v11',
  Light: 'mapbox://styles/mapbox/light-v11',
  Street: 'mapbox://styles/mapbox/streets-v12',
  Satellite: 'mapbox://styles/mapbox/satellite-v9',
  SatelliteStreet: 'mapbox://styles/mapbox/satellite-streets-v12',
  TrafficDay: 'mapbox://styles/mapbox/traffic-day-v2',
  TrafficNight: 'mapbox://styles/mapbox/traffic-night-v2',
};

// ── Default export object (MapboxGL namespace) ────────────────────────────────

const MapboxGL = {
  MapView,
  Camera,
  ShapeSource,
  CircleLayer,
  SymbolLayer,
  LocationPuck,

  StyleURL,
  offlineManager,

  setAccessToken: jest.fn(),
  requestAndroidLocationPermissions: jest.fn(() => Promise.resolve(true)),

  // Additional helpers that Map.tsx may reference
  UserTrackingMode: {
    Follow: 'normal',
    FollowWithHeading: 'compass',
    FollowWithCourse: 'course',
  },

  InterpolationMode: {
    Exponential: 1,
    Categorical: 2,
    Interval: 3,
    Identity: 4,
  },
};

// Named exports mirror the default so both
//   import MapboxGL from '@rnmapbox/maps'
//   import { MapView } from '@rnmapbox/maps'
// work in tests.
module.exports = MapboxGL;
module.exports.default = MapboxGL;
module.exports.MapView = MapView;
module.exports.Camera = Camera;
module.exports.ShapeSource = ShapeSource;
module.exports.CircleLayer = CircleLayer;
module.exports.SymbolLayer = SymbolLayer;
module.exports.LocationPuck = LocationPuck;
module.exports.StyleURL = StyleURL;
module.exports.offlineManager = offlineManager;
module.exports.setAccessToken = MapboxGL.setAccessToken;
module.exports.requestAndroidLocationPermissions = MapboxGL.requestAndroidLocationPermissions;
