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
 *   - `israel-streets-synom` (data.gov.il) is a NAME CATALOG ONLY. It has no
 *     coordinates, so on its own it CANNOT add or update roads on Mapbox.
 *   - `osm-israel-palestine` (OpenStreetMap) ships road line GEOMETRY plus
 *     multilingual names, so it is the source to feed into Mapbox for updated
 *     roads. See `RECOMMENDED_ROAD_GEOMETRY_SOURCE` below.
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
 * `israel-streets-synom` is names-only and intentionally NOT this.
 */
export const RECOMMENDED_ROAD_GEOMETRY_SOURCE = 'osm-israel-palestine';

/** Look up a single source by its `id`. */
export function getMapDataSource(id: string): MapDataSource | undefined {
  return MAP_DATA_SOURCES.find(source => source.id === id);
}
