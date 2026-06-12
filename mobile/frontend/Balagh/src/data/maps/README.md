# Maps Data — Israeli street/road sources & Mapbox integration

`mapDataSources.ts` is a typed catalog of candidate datasets for putting **up-to-date
Israeli roads + street names** on the Mapbox map. This doc explains which one to use
and exactly how to get it onto the map.

## Which dataset?

| Dataset | Provider | Geometry? | Names | Notes |
| --- | --- | --- | --- | --- |
| **`survey-of-israel-ntdb`** ✅ recommended | Survey of Israel (מפ"י) via [data.gov.il](https://data.gov.il/organization/survey_of_israel) | ✅ road lines | Hebrew (most complete) | **Official** national topographic DB, refreshed **quarterly**. Best street coverage. Published in ITM (EPSG:2039). |
| `israel-streets-synom` | Population Authority via [data.gov.il](https://data.gov.il/he/datasets/population_authority/israel-streets-synom) | ❌ names only | Hebrew | Canonical street-name list. Join to geometry by `city_code` + `street_code`. Can't draw roads. |
| `osm-israel-palestine` | OpenStreetMap ([Geofabrik](https://download.geofabrik.de/asia/israel-and-palestine.html)) | ✅ road lines | `name` / `name:he` / `name:ar` / `name:en` | Patchy minor-street coverage. Use as **Arabic-name supplement / fallback** only. |

**Why not OSM as the base:** OSM minor-street name coverage in Israel is incomplete.
The Survey of Israel NTDB is the official, fuller, quarterly-updated source — so it's
the base for geometry + names. OSM stays useful only for Arabic (`name:ar`) labels,
which the NTDB doesn't carry.

## How to add these roads to Mapbox

Custom geometry reaches `@rnmapbox/maps` as a **Mapbox vector tileset** built with the
[Mapbox Tiling Service (MTS)](https://docs.mapbox.com/mapbox-tiling-service/guides/).

### 1. Download the official layer
From [data.gov.il → Survey of Israel](https://data.gov.il/organization/survey_of_israel)
download the roads/streets layer (usually a zipped Shapefile). It uses the **Israeli TM
Grid (ITM, EPSG:2039)**.

### 2. Reproject to WGS84 + convert to GeoJSON (GDAL/ogr2ogr)
```bash
ogr2ogr -f GeoJSON \
  -s_srs EPSG:2039 -t_srs EPSG:4326 \
  -select "street_name,city_name,city_code,street_code,road_class,oneway" \
  israel-roads.geojson israel-roads.shp
```
> Optional: join `israel-streets-synom` (by `city_code`+`street_code`) to fill official
> names, and merge OSM `name:ar` to add an `name_ar` property for Arabic labels.

### 3. Upload as a tileset source (Mapbox Tilesets CLI)
```bash
pip install mapbox-tilesets
export MAPBOX_ACCESS_TOKEN=sk....   # secret token with tilesets:write scope
tilesets upload-source <username> israel-roads-src israel-roads.geojson
```

### 4. Write a recipe (`recipe.json`)
```json
{
  "version": 1,
  "layers": {
    "roads": {
      "source": "mapbox://tileset-source/<username>/israel-roads-src",
      "minzoom": 6,
      "maxzoom": 16
    }
  }
}
```

### 5. Create & publish the tileset
```bash
tilesets create <username>.israel_roads --recipe recipe.json --name "Israel Streets (Survey of Israel)"
tilesets publish <username>.israel_roads
```

### 6. Render it in the app — `src/screens/Map.tsx`
Add a vector source + layers under the existing `MapboxGL.MapView`, reusing the
`name_ar → name → name_en` fallback already used in
`src/presentation/components/ArabicLabels.tsx`:
```tsx
<MapboxGL.VectorSource id="il-roads" url="mapbox://<username>.israel_roads">
  <MapboxGL.LineLayer
    id="il-roads-line"
    sourceLayerID="roads"
    style={{ lineColor: '#9aa0a6', lineWidth: 1.2 }}
  />
  <MapboxGL.SymbolLayer
    id="il-roads-label"
    sourceLayerID="roads"
    style={{
      symbolPlacement: 'line',
      textField: ['coalesce', ['get', 'name_ar'], ['get', 'street_name'], ['get', 'name_en']],
      textSize: 12,
    }}
  />
</MapboxGL.VectorSource>
```
Alternatively, add the tileset as a layer inside a **Mapbox Studio** style and point
`MAPBOX_STYLE` in `Map.tsx` at that style URL — no per-layer code needed.

## Licensing
- Survey of Israel / data.gov.il: Israeli Government Open Data terms of use.
- OpenStreetMap: ODbL 1.0 (attribution + share-alike required if used).
