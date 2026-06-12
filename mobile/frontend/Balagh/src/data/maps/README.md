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

## Dataset schemas

### Survey of Israel NTDB — shapefile attribute table

Source: [data.gov.il → Survey of Israel](https://data.gov.il/organization/survey_of_israel)
Download: zipped Shapefile (`.shp` + `.dbf` + `.prj`), CRS **EPSG:2039 (ITM)**

| Field | Type | Example | Notes |
|---|---|---|---|
| `OBJECTID` | Integer | `1284` | Auto-increment feature ID |
| `STR_ID` | Integer | `20081` | Unique road-segment ID |
| `ROAD_NO` | Integer | `4` | Numbered road (0 = unnamed street) |
| `STREET_NAME` | String(80) | `שד' ירושלים` | Primary Hebrew street name |
| `CITY_CODE` | Integer | `7100` | Municipal locality code — matches `israel-streets-synom` `city_code` |
| `CITY_NAME` | String(50) | `נצרת` | Hebrew locality name |
| `STREET_CODE` | Integer | `315` | Street code — joins to `israel-streets-synom` for canonical names |
| `ROAD_CLASS` | Integer | `3` | 1=Freeway, 2=Highway, 3=Primary, 4=Secondary, 5=Local, 6=Service |
| `ONEWAY` | Integer | `0` | 0=bidirectional, 1=forward, -1=reverse |
| `SPEED_LIMIT` | Integer | `50` | km/h; 0 = unknown |
| `LANES` | Integer | `2` | Lane count per direction |
| `SURFACE` | String(20) | `asphalt` | `asphalt` \| `concrete` \| `gravel` \| `unpaved` |
| `FROM_NODE` | Integer | `9402` | Start junction ID |
| `TO_NODE` | Integer | `9403` | End junction ID |
| `SHAPE_LEN` | Float | `134.72` | Segment length in ITM metres |
| `geometry` | LineString | — | EPSG:2039; reproject to EPSG:4326 before tiling |

After `ogr2ogr` conversion the `STREET_CODE` field can be used to join
`israel-streets-synom` for official/synonym name variants, and `CITY_CODE` to
attach a locality name if `CITY_NAME` is blank on a segment.

---

### israel-streets-synom — Population Authority CSV / REST API

Source: [data.gov.il](https://data.gov.il/he/datasets/population_authority/israel-streets-synom)
CKAN API endpoint (JSON, no auth required):
```
https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-97c7-7be0b5b94b3f&limit=1000&offset=0
```

| Field (Hebrew) | Field (English alias) | Type | Example | Notes |
|---|---|---|---|---|
| `סמל מחוז` | `region_code` | Integer | `2` | District code |
| `שם מחוז` | `region_name` | String | `מחוז צפון` | — |
| `סמל ישוב` | `city_code` | Integer | `7100` | Matches NTDB `CITY_CODE` |
| `שם ישוב` | `city_name` | String | `נצרת` | Hebrew locality name |
| `סמל רחוב` | `street_code` | Integer | `315` | Matches NTDB `STREET_CODE` |
| `שם רחוב` | `street_name` | String | `שד' הגליל` | Official or synonym name |
| `סטטוס שם הרחוב` | `street_name_status` | Integer | `0` | 0=official, 1=synonym, 2=historical |

**Tip:** filter `street_name_status = 0` to keep only official names, or keep
all rows for a rich street-search autocomplete.

Sample API call to fetch one page (adjust `offset` to paginate):
```bash
curl "https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-97c7-7be0b5b94b3f&limit=500&offset=0" \
  | jq '.result.records[] | {city_code: .["סמל ישוב"], city_name: .["שם ישוב"], street_code: .["סמל רחוב"], street_name: .["שם רחוב"]}'
```

---

### GeoJSON feature shape after conversion

This is what a single road segment looks like after `ogr2ogr` + optional
`israel-streets-synom` join + optional OSM `name:ar` merge:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[35.3025, 32.7022], [35.3040, 32.7031]]
  },
  "properties": {
    "STR_ID": 20081,
    "ROAD_NO": 0,
    "STREET_NAME": "שד' הגליל",
    "CITY_CODE": 7100,
    "CITY_NAME": "נצרת",
    "STREET_CODE": 315,
    "ROAD_CLASS": 3,
    "ONEWAY": 0,
    "SPEED_LIMIT": 50,
    "SURFACE": "asphalt",
    "name_ar": "شارع الجليل",
    "name_en": "HaGalil Blvd"
  }
}
```

The `name_ar` field is not in the NTDB — add it by joining the OSM extract on
`(CITY_CODE, STREET_CODE)` or by calling a transliteration step. This aligns
with the `name_ar → name → name_en` fallback already wired in
`src/presentation/components/ArabicLabels.tsx`.

## Licensing
- Survey of Israel / data.gov.il: Israeli Government Open Data terms of use.
- Population Authority (israel-streets-synom) / data.gov.il: Israeli Government Open Data terms of use.
- OpenStreetMap: ODbL 1.0 (attribution + share-alike required if used).
