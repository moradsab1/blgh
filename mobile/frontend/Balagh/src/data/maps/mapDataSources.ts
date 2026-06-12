/**
 * Catalog of candidate map data sources for enriching the Mapbox map with
 * up-to-date Israeli street/road data.
 *
 * IMPORTANT — geometry vs. names:
 *   To actually draw or update *road lines* on the map you need a dataset that
 *   carries geographic **geometry** (line/point coordinates). A pure name list
 *   (street codes + street names, no coordinates) can never render roads — it
 *   can only enrich search/autocomplete or supply alternative label text.
 *
 *   - `survey-of-israel-ntdb` (data.gov.il, Survey of Israel / מפ"י) is the
 *     OFFICIAL government road/street GEOMETRY, updated quarterly with the most
 *     complete street-name coverage in Israel. This is the recommended source.
 *     See `RECOMMENDED_ROAD_GEOMETRY_SOURCE` below.
 *   - `israel-streets-synom` (data.gov.il) is a NAME CATALOG ONLY. It has no
 *     coordinates, so on its own it CANNOT add or update roads on Mapbox — but
 *     it is the canonical official street-name list and joins to geometry by
 *     city_code + street_code.
 *   - `osm-israel-palestine` (OpenStreetMap) ships road line GEOMETRY plus
 *     multilingual names (incl. name:ar), but minor-street name coverage is
 *     patchy. Useful mainly as an Arabic-name supplement / fallback.
 *
 * See ./README.md for the step-by-step "download → convert → Mapbox tileset"
 * integration guide.
 *
 * This module is a typed reference catalog only (no runtime fetch, no bundled
 * data) so the app bundle stays light. It is consumable by future map/search
 * code that decides how to integrate a given source.
 */

export type MapDataFormat =
  | 'csv'
  | 'json'
  | 'api'
  | 'osm-pbf'
  | 'geojson'
  | 'shapefile';

export interface MapDataSource {
  /** Stable identifier used to reference this source in code. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Publishing organisation. */
  provider: string;
  /** Landing page / download URL(s) for the dataset. */
  url: string[];
  /** Available distribution format(s). */
  format: MapDataFormat[];
  /**
   * Whether the dataset contains geographic geometry (coordinates).
   * `false` means names only — it cannot render roads on its own.
   */
  hasGeometry: boolean;
  /** Documented field / column schema. */
  fields: string[];
  /** Name locales the dataset provides, e.g. ['he', 'ar', 'en']. */
  nameLocales: string[];
  /** What this dataset is actually good for in this app. */
  recommendedUse: string;
  /** How this source would reach Mapbox (integration path). */
  mapboxIntegration: string;
  /** Licensing terms. */
  license: string;
}

export const MAP_DATA_SOURCES: MapDataSource[] = [
  {
    id: 'survey-of-israel-ntdb',
    title: 'מבט"ל / NTDB — National Topographic DB roads & streets (Survey of Israel)',
    provider: 'Survey of Israel — מרכז למיפוי ישראל / MAPI (via data.gov.il)',
    url: [
      'https://data.gov.il/organization/survey_of_israel',
      'https://www.gov.il/he/departments/survey_of_israel/govil-landing-page',
      'https://www.govmap.gov.il/',
    ],
    // Official road/street line geometry. Note: published in the Israeli TM
    // Grid (ITM, EPSG:2039) — must be reprojected to WGS84 (EPSG:4326) before
    // tiling for Mapbox.
    format: ['shapefile', 'geojson', 'api'],
    hasGeometry: true,
    // Exact attribute names vary per NTDB release — confirm from the layer's
    // attribute table / the data.gov.il resource schema.
    fields: [
      'street_name', // street name (Hebrew, primary)
      'city_name',
      'city_code',
      'street_code', // joins to israel-streets-synom
      'road_class',
      'oneway', // traffic direction
      'geometry', // LineString (ITM / EPSG:2039)
    ],
    nameLocales: ['he'],
    recommendedUse:
      'The official, most complete & current road/street geometry for Israel, ' +
      'refreshed quarterly. Recommended base for adding/updating roads on Mapbox. ' +
      'Hebrew-primary names; supplement Arabic labels from OSM name:ar or a ' +
      'transliteration, and join israel-streets-synom for canonical names.',
    mapboxIntegration:
      'Download layer -> reproject ITM (EPSG:2039) to WGS84 (EPSG:4326) and ' +
      'convert to GeoJSON (ogr2ogr) -> upload via Mapbox Tiling Service to a ' +
      'custom tileset -> add as a VectorSource + LineLayer/SymbolLayer in ' +
      'src/screens/Map.tsx. See ./README.md for exact commands.',
    license: 'Israeli Government Open Data (data.gov.il terms of use)',
  },
  {
    id: 'israel-streets-synom',
    title: 'רשימת רחובות בישראל (Israel Streets List)',
    provider: 'Population & Immigration Authority (via data.gov.il)',
    url: [
      'https://data.gov.il/he/datasets/population_authority/israel-streets-synom',
    ],
    format: ['csv', 'api'],
    // Names only — region / city / street codes + names. No coordinates.
    hasGeometry: false,
    fields: [
      'region_code', // סמל מחוז
      'region_name', // שם מחוז
      'city_code', // סמל ישוב
      'city_name', // שם ישוב
      'street_code', // סמל רחוב
      'street_name', // שם רחוב
      'street_name_status', // סטטוס שם הרחוב / synonym flag
    ],
    nameLocales: ['he'],
    recommendedUse:
      'Street-name search / autocomplete and address entry, plus Hebrew ' +
      'street-name enrichment. Has NO geometry, so it cannot draw or update ' +
      'roads on the map by itself.',
    mapboxIntegration:
      'Not a map layer. Use as a lookup table joined to geometry by ' +
      'city_code + street_code, or to power a street-name search box.',
    license: 'Israeli Government Open Data (data.gov.il terms of use)',
  },
  {
    id: 'osm-israel-palestine',
    title: 'OpenStreetMap — Israel & Palestine extract (roads)',
    provider: 'OpenStreetMap contributors (Geofabrik / HOT-HDX)',
    url: [
      'https://download.geofabrik.de/asia/israel-and-palestine.html',
      'https://data.humdata.org/dataset/hotosm_isr_roads',
    ],
    format: ['osm-pbf', 'shapefile', 'geojson'],
    // Road line geometry + multilingual names — the source for updated roads.
    hasGeometry: true,
    fields: [
      'osm_id',
      'highway', // road class (motorway, primary, residential, ...)
      'name', // local/default name (often Hebrew)
      'name:he',
      'name:ar',
      'name:en',
      'surface',
      'oneway',
      'geometry', // LineString
    ],
    nameLocales: ['he', 'ar', 'en'],
    recommendedUse:
      'The dataset to add to Mapbox for up-to-date road geometry AND road ' +
      'names. Multilingual names align with the app\'s existing label ' +
      'fallback chain (name_ar -> name -> name_en) in ArabicLabels.tsx.',
    mapboxIntegration:
      'Extract the roads layer -> convert to GeoJSON -> upload via Mapbox ' +
      'Tiling Service to a custom tileset -> add as a vector source/layer in ' +
      'src/screens/Map.tsx, reusing the ArabicLabels name fallback chain.',
    license: 'Open Database License (ODbL) 1.0',
  },
];

/**
 * The source to use when the goal is updated *road geometry* on Mapbox.
 * The official Survey of Israel NTDB has the most complete & current street
 * coverage; OSM is only a fallback and `israel-streets-synom` is names-only.
 */
export const RECOMMENDED_ROAD_GEOMETRY_SOURCE = 'survey-of-israel-ntdb';

/** Look up a single source by its `id`. */
export function getMapDataSource(id: string): MapDataSource | undefined {
  return MAP_DATA_SOURCES.find(source => source.id === id);
}
