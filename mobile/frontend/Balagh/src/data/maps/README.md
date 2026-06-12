# Arabic street names on Mapbox — implementation plan

## The problem

Mapbox's built-in map data comes from OpenStreetMap (OSM). In Israel, OSM coverage
of minor streets in Arab towns and villages is significantly incomplete: road lines
exist but `name:ar` (Arabic name) is often missing, leaving labels blank or showing
only Hebrew. Because this app serves Arab communities the map must show Arabic street
names reliably.

---

## What data is actually available (verified)

### 1. Population Authority — israel-streets-synom (FREE, weekly updated)

**Source:** [data.gov.il/dataset/israel-streets-synom](https://data.gov.il/he/datasets/population_authority/israel-streets-synom)
**Publisher:** רשות האוכלוסין וההגירה (Population Authority)
**Update frequency:** Weekly
**Records:** 152,124 (official names + synonyms for every locality in Israel)
**Format:** CSV download or CKAN REST API (no auth required)
**Has geometry:** NO — names only

This is the official master street-name register for Israel. It covers every
registered locality including all Arab towns and villages. **Hebrew only** — no
Arabic. It is the most complete and current street-name list available for free.

**CKAN API endpoint (live resource):**
```
https://data.gov.il/api/3/action/datastore_search
  ?resource_id=bf185c7f-1a4e-4662-88c5-fa118a244bda
  &limit=1000&offset=0
```

**Schema:**

| Field name | Type | Example | Notes |
|---|---|---|---|
| `_id` | Integer | `1` | CKAN internal row ID |
| `region_code` | Integer | `2` | District (מחוז) code |
| `region_name` | String | `מחוז צפון` | District name in Hebrew |
| `city_code` | Integer | `7100` | Locality code — **primary join key** |
| `city_name` | String | `נצרת` | Locality name in Hebrew |
| `street_code` | Integer | `315` | Street code within locality — **secondary join key** |
| `street_name` | String | `שד' הגליל` | Street name in Hebrew |
| `street_name_status` | Integer | `0` | 0 = official name, 1 = synonym, 2 = historical |
| `official_code` | Integer | `315` | Points to the official row when this row is a synonym |

Filter `street_name_status = 0` to keep only official names.
`(city_code, street_code)` is the compound key that links this table to any
geometry source that carries those two codes.

---

### 2. OpenStreetMap — Israel & Palestine extract (FREE)

**Source:** [Geofabrik](https://download.geofabrik.de/asia/israel-and-palestine.html) |
[HOT HDX](https://data.humdata.org/dataset/hotosm_isr_roads)
**Publisher:** OpenStreetMap contributors
**Update frequency:** Geofabrik daily; HDX weekly
**Format:** OSM PBF, Shapefile, GeoJSON
**Has geometry:** YES — road LineStrings in WGS84 (EPSG:4326)
**License:** ODbL 1.0 (attribution + share-alike required)

OSM is the only free source that has **both geometry and Arabic names** (`name:ar`).
The problem is that `name:ar` is present for major roads and some cities but is empty
for many streets in Arab towns — exactly the gap we need to fill.

**Schema (roads layer from HOT HDX shapefile / osmium GeoJSON export):**

| Field | Type | Example | Notes |
|---|---|---|---|
| `osm_id` | Integer | `4821093` | OSM way ID |
| `highway` | String | `residential` | Road class: motorway, trunk, primary, secondary, tertiary, residential, service, unclassified, path, track |
| `name` | String | `שד' הגליל` | Default name (usually Hebrew in Israel) |
| `name_he` | String | `שד' הגליל` | Explicit Hebrew name tag |
| `name_ar` | String | `شارع الجليل` | Arabic name — **often empty in Arab towns** |
| `name_en` | String | `HaGalil Blvd` | English name |
| `ref` | String | `4` | Road number for numbered highways |
| `oneway` | String | `yes` | `yes` \| `no` \| `-1` (reverse) |
| `surface` | String | `asphalt` | `asphalt` \| `paved` \| `unpaved` \| `gravel` |
| `maxspeed` | Integer | `50` | Speed limit km/h |
| `lanes` | Integer | `2` | Total lane count |
| `bridge` | String | `yes` | Present when the segment is a bridge |
| `tunnel` | String | `yes` | Present when the segment is a tunnel |
| `access` | String | `private` | Access restriction |
| `geometry` | LineString | — | WGS84 (EPSG:4326), ready for Mapbox |

---

### 3. Survey of Israel NTDB / BNTAL — ⚠️ NOT free open data

The National Topographic Database is the most complete Israeli road geometry source
(updated annually for roads, quarterly for other layers). However, it is **distributed
to government ministries only** and requires **purchase** from the Survey of Israel
for any other use. It is not downloadable from data.gov.il.

**Do not plan on using this for free.** If budget allows, the commercial license
gives you the geometry in File Geodatabase / Shapefile / DWG (CRS: EPSG:2039 ITM),
and joining it to `israel-streets-synom` by `(city_code, street_code)` gives
complete Hebrew official names. You would still need the Arabic translation step
described below.

**Contact:** [Survey of Israel](https://www.gov.il/en/departments/survey_of_israel)

---

## Approaches — ranked by effort and completeness

### Option A — OSM geometry + gov names + translation (Recommended)

**What you get:** full road network, official Hebrew names from the government,
Arabic names generated from translation.
**Effort:** medium (one-time pipeline ~1 day)
**Cost:** free (translation API has a free tier sufficient for ~150k street names)

#### Step 1 — Download OSM roads for Israel

```bash
# Geofabrik PBF (preferred, ~120 MB)
wget https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf

# Extract only road features as GeoJSON
osmium export \
  --geometry-types=linestring \
  --attributes=id,version \
  --add-unique-id=counter \
  israel-and-palestine-latest.osm.pbf \
  -o osm-roads-raw.geojson

# Or use the HDX shapefile (simpler, already filtered to roads)
# https://data.humdata.org/dataset/hotosm_isr_roads → download .shp
ogr2ogr -f GeoJSON osm-roads-raw.geojson hotosm_isr_roads.shp
```

#### Step 2 — Download the official street-name list

```bash
# Fetch all 152,124 records via CKAN API (paginate with offset)
python3 - <<'EOF'
import requests, json

resource_id = "bf185c7f-1a4e-4662-88c5-fa118a244bda"
base = "https://data.gov.il/api/3/action/datastore_search"
records, offset = [], 0

while True:
    r = requests.get(base, params={"resource_id": resource_id, "limit": 1000, "offset": offset}).json()
    batch = r["result"]["records"]
    if not batch:
        break
    records += batch
    offset += 1000
    print(f"  fetched {offset} rows…")

# keep official names only
official = [x for x in records if str(x["street_name_status"]) == "0"]
with open("streets-official.json", "w", encoding="utf-8") as f:
    json.dump(official, f, ensure_ascii=False, indent=2)

print(f"Done — {len(official)} official street names saved.")
EOF
```

Output: `streets-official.json` — a list of `{city_code, city_name, street_code, street_name}`.

#### Step 3 — Translate Hebrew street names → Arabic

Common Hebrew street name prefixes have fixed Arabic equivalents. A small prefix
lookup handles most cases without an API call:

| Hebrew prefix | Arabic equivalent |
|---|---|
| `רחוב` | `شارع` |
| `שדרות` / `שד'` | `شارع` / `جادة` |
| `כיכר` | `ميدان` |
| `סמטה` | `زقاق` |
| `נחל` | `وادي` |
| `מעלה` | `تلة` |
| `דרך` | `طريق` |
| `שביל` | `ممشى` |
| `גבעת` | `تل` |

For names that don't match a prefix pattern use the Google Cloud Translation API
(free up to 500,000 characters/month — enough for the ~150k names):

```bash
pip install google-cloud-translate

python3 - <<'EOF'
import json
from google.cloud import translate_v2 as translate

client = translate.Client()

PREFIXES = {
    "רחוב": "شارع", "שדרות": "جادة", 'שד\'': 'جادة', "כיכר": "ميدان",
    "סמטה": "زقاق", "נחל": "وادي", "מעלה": "تلة", "דרך": "طريق",
    "שביל": "ممشى", "גבעת": "تل",
}

def translate_name(name_he: str) -> str:
    for he, ar in PREFIXES.items():
        if name_he.startswith(he):
            rest = name_he[len(he):].strip()
            result = client.translate(rest, source_language="iw", target_language="ar")
            return ar + " " + result["translatedText"]
    result = client.translate(name_he, source_language="iw", target_language="ar")
    return result["translatedText"]

with open("streets-official.json", encoding="utf-8") as f:
    streets = json.load(f)

for row in streets:
    row["name_ar"] = translate_name(row["street_name"])

with open("streets-with-arabic.json", "w", encoding="utf-8") as f:
    json.dump(streets, f, ensure_ascii=False, indent=2)

print("Done — Arabic names added.")
EOF
```

#### Step 4 — Merge Arabic names into OSM GeoJSON

Match OSM features to the names list on `name` (Hebrew) vs `street_name` within
the same locality boundary. For unmatched roads fall back to the OSM `name:ar` if
it exists.

```bash
pip install geopandas shapely fiona

python3 - <<'EOF'
import json, re, unicodedata
import geopandas as gpd
from shapely.geometry import shape

def normalise(s):
    s = (s or "").strip()
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"['\"]", "", s)        # remove geresh / apostrophes
    s = re.sub(r"\s+", " ", s)
    return s.lower()

# build lookup: {normalised_hebrew_name: name_ar}
with open("streets-with-arabic.json", encoding="utf-8") as f:
    streets = json.load(f)
lookup = {normalise(x["street_name"]): x["name_ar"] for x in streets}

gdf = gpd.read_file("osm-roads-raw.geojson")
gdf["name_ar"] = gdf.apply(
    lambda row: row.get("name_ar") or
                lookup.get(normalise(row.get("name_ar", ""))) or
                lookup.get(normalise(row.get("name", ""))) or
                lookup.get(normalise(row.get("name_he", ""))) or
                "",
    axis=1,
)

# drop roads with no name at all
gdf = gdf[gdf["name"].notna() | gdf["name_ar"].notna()]

gdf.to_file("israel-roads-enriched.geojson", driver="GeoJSON")
print(f"Saved {len(gdf):,} road features.")
EOF
```

#### Step 5 — Upload to Mapbox as a custom tileset

```bash
pip install mapbox-tilesets
export MAPBOX_ACCESS_TOKEN=sk.eyJ1...   # secret token, tilesets:write scope

MAPBOX_USER=your_mapbox_username

# 1. Upload the GeoJSON as a tileset source
tilesets upload-source $MAPBOX_USER israel-roads-src israel-roads-enriched.geojson

# 2. Create recipe.json
cat > recipe.json <<JSON
{
  "version": 1,
  "layers": {
    "roads": {
      "source": "mapbox://tileset-source/$MAPBOX_USER/israel-roads-src",
      "minzoom": 8,
      "maxzoom": 16
    }
  }
}
JSON

# 3. Create and publish the tileset
tilesets create $MAPBOX_USER.il_roads_ar \
  --recipe recipe.json \
  --name "Israel roads with Arabic names"

tilesets publish $MAPBOX_USER.il_roads_ar
```

#### Step 6 — Wire it into Map.tsx

Add a `VectorSource` inside the existing `<MapboxGL.MapView>`. The `textField`
expression reuses the same `name_ar → name → name_en` fallback chain that
`ArabicLabels.tsx` already uses:

```tsx
<MapboxGL.VectorSource
  id="il-roads-ar"
  url="mapbox://your_mapbox_username.il_roads_ar"
>
  <MapboxGL.LineLayer
    id="il-roads-ar-line"
    sourceLayerID="roads"
    belowLayerID="road-label"   // slot under Mapbox's own road labels
    style={{
      lineColor: [
        'match', ['get', 'highway'],
        ['motorway', 'trunk'],  '#e87722',
        ['primary'],            '#ffd700',
        ['secondary'],          '#ffffff',
        '#c9c9c9',              // default
      ],
      lineWidth: ['interpolate', ['linear'], ['zoom'],
        8, 0.5,
        14, 2.5,
      ],
      lineOpacity: 0.85,
    }}
  />
  <MapboxGL.SymbolLayer
    id="il-roads-ar-label"
    sourceLayerID="roads"
    minZoomLevel={13}
    style={{
      symbolPlacement: 'line',
      textField: ['coalesce',
        ['get', 'name_ar'],
        ['get', 'name'],
        ['get', 'name_en'],
      ],
      textSize: 12,
      textColor: '#333',
      textHaloColor: '#fff',
      textHaloWidth: 1.5,
    }}
  />
</MapboxGL.VectorSource>
```

---

### Option B — Arabic-only supplement patch (Fastest to ship)

Instead of replacing all road data, only add a **thin override layer** that fills in
the Arabic names that Mapbox is currently missing. This is smaller scope (~5,000
features for Arab localities vs ~600,000 total roads) and faster to iterate on.

1. From `streets-with-arabic.json`, filter to only Arab localities (city codes for
   Umm al-Fahm, Nazareth, Baqa al-Gharbiyye, Shefar'am, Kafr Kanna, Lod, Ramla
   Arab neighbourhoods, etc. — the same set already in `src/data/mock/db.ts`).
2. Cross-reference OSM: extract only the OSM road segments **within those localities**
   that are missing `name:ar`.
3. Attach translated Arabic names.
4. Upload this small GeoJSON (~a few thousand features) to Mapbox.
5. Overlay only the `SymbolLayer` (labels), not the `LineLayer` — Mapbox base tiles
   already draw the road lines correctly, only the labels are wrong.

This is the quickest path to visible improvement for this app's target cities.

---

### Option C — Contribute directly to OSM (Simplest long-term)

Add `name:ar` tags to missing streets in Arab towns directly in OSM via
[JOSM](https://josm.openstreetmap.de/) or [iD editor](https://www.openstreetmap.org/edit).
Mapbox refreshes its tiles from OSM roughly monthly, so names appear in production
without any tileset management.

Use the government `streets-with-arabic.json` file as a reference when editing.
This benefits every application that uses OSM data, not just this app, and requires
no Mapbox account or tileset hosting.

**Tools:** JOSM with the Conflation plugin or the "MapWithAI" AI-assisted road
tracing tool ([RapiD editor](https://rapideditor.org)) can speed up bulk edits.

---

## Recommended approach for this app

Use **Option B** first (patch the specific Arab cities from `db.ts`) to fix the
visible problem quickly. Then run **Option A** in parallel to build the full pipeline
for a permanent solution. Only consider Option C if you have contributors willing
to maintain OSM edits over time.

**Maintenance:** re-run Steps 2–5 of Option A whenever `israel-streets-synom` has
significant changes (weekly updates are available but monthly refresh is sufficient).

---

## Licensing

| Source | License | Attribution required |
|---|---|---|
| israel-streets-synom (data.gov.il) | Israeli Government Open Data | No |
| OpenStreetMap (Geofabrik / HDX) | ODbL 1.0 | Yes — "© OpenStreetMap contributors" |
| Survey of Israel NTDB | Commercial — requires purchase | Per contract |
| Google Cloud Translation | Commercial API | No (output is yours) |
