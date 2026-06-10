/**
 * Arabic label localization for Mapbox streets-v12.
 *
 * `localizeLabels` rewrites every symbol layer's text field to `name_ar`,
 * which BLANKS labels for features that have no Arabic name in the map data
 * (common for streets in Israel whose names exist only in Hebrew). Instead we
 * override the style's label layers with an explicit fallback chain:
 *
 *   name_ar → name (local name, e.g. Hebrew) → name_en
 *
 * so every named road/place always shows a label, in Arabic whenever the data
 * has one. (True Hebrew→Arabic transliteration can't happen in the renderer —
 * Arabic spellings must come from the map data itself.)
 *
 * Layer ids below are the label layers of mapbox://styles/mapbox/streets-v12.
 */
import React from 'react';
import MapboxGL from '@rnmapbox/maps';

const TEXT_FIELD = [
  'coalesce',
  ['get', 'name_ar'],
  ['get', 'name'],
  ['get', 'name_en'],
];

const LABEL_LAYERS = [
  'road-label',
  'road-intersection',
  'settlement-major-label',
  'settlement-minor-label',
  'settlement-subdivision-label',
  'poi-label',
  'transit-label',
  'airport-label',
  'natural-point-label',
  'natural-line-label',
  'water-point-label',
  'water-line-label',
  'waterway-label',
  'state-label',
  'country-label',
];

export const ArabicLabels = (): React.ReactElement => (
  <>
    {LABEL_LAYERS.map(id => (
      <MapboxGL.SymbolLayer
        key={id}
        id={id}
        existing
        style={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          textField: TEXT_FIELD as any,
        }}
      />
    ))}
  </>
);

export default ArabicLabels;
