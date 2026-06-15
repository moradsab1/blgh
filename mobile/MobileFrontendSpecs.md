# Balagh (بلاغ) — Complete Product, UI, Architecture & Build Spec (Bare React Native)

> **Target:** **Bare React Native CLI** (no Expo) · iOS + Android · Mock API (contract defined here) · Phased build · TypeScript strict · **New Architecture (mandatory)**
> **Minimal, JS-first dependency set.** The stack is deliberately small to avoid the cold-start crashes a heavy native stack caused (see §16): persistence is AsyncStorage, icons are **lucide-react-native** SVG vectors, i18n is a plain strings object, sheets/animations are plain RN primitives. The one heavy native module is the map (`@rnmapbox/maps`). Every native module is New-Architecture-compatible — see the matrix in §6.4.
> **Single source of truth:** product principles → full UI spec → architecture → native config → mock API → phased plan → the AI build prompt.

---

## Table of contents

1. How to read this document
2. What Balagh is
3. Core principles (hard constraints)
4. Design system (spec)
5. Full UI — every screen & flow
6. Validated technology stack (bare RN) + compatibility matrix
7. Native project configuration (the part Expo used to hide)
8. Recommended AI prompt structure
9. High-level architecture
10. Mock API contract
11. Device identity (kept simple)
12. Design system (implementation)
13. Offline, resilience & safety hardening
14. Phased build plan
15. The AI build prompt (context block + per-phase prompts)
16. Risks & gotchas
17. What changed & improved vs a managed (Expo) setup

---

## 1. How to read this document

Three usable parts:

- **Product & UI (§2–§5)** — the *what*: principles, design system, and every screen/flow in full detail. The UI must match this exactly, including the Arabic labels.
- **Architecture & native config (§6–§13)** — the *how*: validated bare-RN stack with a compatibility matrix, the native iOS/Android configuration you now own directly, folder structure, state/data layers, the mock API contract, the device-identity model, theming, i18n/RTL, and offline/safety behavior.
- **Build (§14–§17)** — the *plan*: six phases with per-phase tests, the ready-to-paste AI prompt, the gotchas, and a summary of what improved by going bare.

A note on privacy: you said privacy isn't a priority for this build, so the identity layer is **deliberately minimal** — a single random device identifier, generated once and stored device-only in AsyncStorage, no login, no hardening beyond sensible defaults. The "no personal data" property falls out for free because the app never has a field to collect it. Going bare actually *strengthens* one guarantee: you control the native permission manifest directly, so "one permission only" is auditable in plain sight (§7).

---

## 2. What Balagh is

Balagh is a safety-critical civilian incident-reporting app for the Arabic-speaking community in Israel, with full Hebrew and English support. Residents of mixed and high-risk localities — Umm al-Fahm, Lod, Ramla, Nazareth, Haifa, Tira, and others — receive geo-targeted safety alerts, submit anonymous reports **without any state or police intermediation**.

It is explicitly built for adverse conditions: stressed users in fight-or-flight mode, unstable mobile connectivity, one-handed operation while moving or hiding, variable lighting (night and bright sun), and older mid-range Android devices.

---

## 3. Core principles (hard constraints)

Architectural invariants enforced in code, native config, and tests.

- **Zero identity collection.** No phone number, email, name, social login, or any ID screen anywhere.
- **Anonymous by design.** Each device generates a silent cryptographic identity on first launch — invisible to the user, never shared with authorities.
- **No police or state data sharing.** Zero government integration. Stated explicitly during onboarding and in crisis flows.
- **No media capture.** Never accesses camera, microphone, or photo library. Reports are text + category + location only.
- **No personal statistics.** No streaks, badges, or counters — to prevent competitive reporting and behavioral profiling.
- **Local-first data.** Settings and read history live on the device. Uninstalling erases everything.
- **Zero sound.** The app emits no sounds at all — for users who may be hiding.

Exactly **one** runtime permission (Location, "while using"). The app **never** requests camera, microphone, photo library, contacts, calendar, motion, advertising ID, or background location. In bare RN this is enforced directly in `Info.plist` / `AndroidManifest.xml` (§7).

---

## 4. Design system (spec)

**Theme:** Light-only. A single light theme ships in v1 (dark mode deferred). The light theme reads as clean, modern, and professional, keeps severity colors legible in daylight, and matches the light Mapbox canvas.

**Color palette:**
- Background layers: near-white slate (`#F8FAFC` base → `#FFFFFF` cards, `#EEF2F7` inset surfaces, `#E2E8F0` borders)
- Text: dark-slate primary (`#0F172A`), slate secondary and muted; white (`textOnAccent`) on accent-colored surfaces
- Severity: Critical = crimson red · High = burnt orange · Medium = amber (`#D97706`, darkened for contrast on white) · Low = olive green
- Status: Calm = green · Watch = amber · Active = red
- Primary accent: crimson red

**Typography:** IBM Plex Sans Arabic (Arabic and Hebrew), Inter (Latin), JetBrains Mono (reference codes). All numbers displayed in Western Arabic numerals (0–9) regardless of language — even in Arabic UI.

**Layout:** 8-point spacing grid. Primary CTAs always sit in the bottom 40% of the screen for thumb-first reachability. All tap targets ≥ 48×48 pt. No gradients, no illustrations beyond onboarding glyphs; soft functional shadows (`shadow.card` / `shadow.float`) lift cards and floating chrome off the light background.

**Component language.** filter **chips** are soft borderless pills — inset gray (`cardElevated`) when idle, solid accent with white text when active. Filled primary/danger **buttons** carry a soft `shadow.card` lift. Category/severity context is conveyed by **tinted icon badges** (a rounded square filled with the severity color at ~8% opacity holding the category icon) used consistently across feed cards, the category grids, and the incident detail sheet; the report/crisis category grid uses white cards with these badges and a subtle press-scale.

**Motion:** Transitions range 100 ms (instant) → 480 ms (deliberate). All pulsing/motion effects disabled when the OS reduce-motion setting is on.

**Haptics:** *(currently no-op stubs — see note below.)*
- Light tap → toggle/chips
- Medium press → primary buttons
- Success notification → confirmed submit
- Warning notification → high-severity status appears
- Error notification → submit or validation failure
- Heavy impact → Active (red) status transition

> In the current minimal build the haptic API (`core/haptics`) is a set of **no-op stubs** — the semantic surface (`haptics.success()` etc.) exists so callers stay stable, but no native haptic library is installed. On Android the OS provides implicit touch feedback via ripples. A real haptics implementation can be wired later behind the same API.

**Icons:** **`lucide-react-native`** SVG vector icons (over `react-native-svg`), re-exported through `core/icons` so screens keep importing the same names (`<IconName size color style />`). All icons are monochrome strokes tinted via the `color` prop — no emoji anywhere in the UI. Category icons use modern, instantly-readable glyphs: **Target** (gunfire) / **Sword** (stabbing) / **HandFist** (assault) / **HandCoins** (robbery) / **ScanEye** (suspicious) / **Siren** (other emergency). Directional icons (chevrons, arrows) follow the active language's direction (`useIsRTL`, §12.5) at call sites.

---

## 5. Full UI — every screen & flow

### 5.1 Splash Screen
Plain light background. Centered crimson square with a white Arabic letter **ب** inside, app name **بلاغ** below. No tagline, no spinner. Holds until all local data is ready — **max 1.5 s**. If longer, an error message + retry button appears. (No native launch-screen library; the in-app readiness gate is a plain `View` shown until `hydrateStorage()` resolves — see §9.2.)

### 5.2 Language Selection *(first launch only)*
Three full-width cards stacked vertically:
- 🇸🇦 **العربية**
- 🇮🇱 **עברית**
- 🇬🇧 **English**

Each card: flag emoji, language name in its own script, trailing chevron. Tapping applies the language (and RTL layout if needed) and moves to Welcome.

### 5.3 Welcome Carousel *(3 slides)*
Swipeable onboarding carousel; dot indicator animates circle → pill on the active slide.
- **Slide 1 — Reporting:** pulsing radar circles. *"بلّغ. شاهد. احمِ"* / *"Report. Watch. Protect."*
- **Slide 2 — Geo alerts:** map pin with emanating rings. *"تنبيهات في نطاقك"* / *"Alerts Where You Are"*
- **Slide 3 — Privacy:** shield-check. *"خصوصية مطلقة"* / *"Absolute Privacy"*. Four checkmarks: no phone number required, no police connection, fully anonymous reports, data stays on your device.

**"التالي"** advances; **"ابدأ الآن"** on slide 3 → Locality selection.

### 5.4 Locality Selection
Sticky header with back button + title *"اختر بلدتك"*. Subtitle explains the locality is only used to show nearby reports — not shared. Full-width search (works across Arabic, Hebrew, English scripts). Results in a scrollable sheet at 90% height, locality name in active language + canonical name smaller. **"تفعيل الحساب الآمن"** CTA pinned bottom, disabled until a locality is chosen.

### 5.5 Main Map Dashboard *(primary surface)*
Single home screen. Everything else slides over it as sheets/modals.

```
┌──────────────────────────────────────┐
│  [Status Pill]      [🔔]  [⚙️]       │  ← Floating top, safe-area
│            ( Map Canvas )            │
│              with pins               │
│                                      │
│  [🕘 History]   [🚨 Report]   [📰 Feeds] │  ← Bottom action tray (FAB centered)
└──────────────────────────────────────┘
```

**Map canvas:** full-bleed streets map (`mapbox://styles/mapbox/streets-v12` — Mapbox's most complete, continuously-updated road network) with street/place labels localized to **Arabic** via an explicit fallback expression (`name_ar` → `name` → `name_en`, applied to the style's label layers by `<ArabicLabels />`) so roads whose names exist only in Hebrew still show a label instead of going blank. Mapbox logo/attribution/scale-bar hidden, user location dot, **north-up fixed**.

**Incident pins (privacy circles, 24 h open window):**
- The map shows **only currently open incidents**: unresolved and reported within the last **24 hours**. The backend enforces this window and serves the frontend only open incidents (mocked today by `db.incidents.getOpen()`). Older or resolved incidents are browsable in the feed's history filters (§5.10), never on the map.
- **Location privacy:** an incident is never rendered as an exact point. Each open incident draws as a **translucent severity-tinted circle covering ~150 m of ground radius** (`INCIDENT_PRIVACY_RADIUS_M`) around the reported location, hiding the precise spot from viewers. The pixel radius is zoom-interpolated (Web Mercator, exponential base-2 — `presentation/map/privacyCircle.ts`) so the circle covers the same ground area at every zoom.
- Lower zoom: cluster bubbles tinted to highest-severity member, with count.
- Higher zoom: individual privacy circles in severity color; the highest-priority active incident's circle edge pulses.
- New circles: **320 ms scale-in** + **warning haptic**.
- Resolved: fade to 30% opacity, removed after 30 s (just-resolved incidents linger briefly in the open set so the fade can play).
- Tap: opens Incident Detail Sheet + centers the map.

### 5.6 Safety Status Pill
Floating top-left:

| State | Color | Label | Trigger |
|---|---|---|---|
| Calm | Green | *هادئ* | No active alerts within 3 km |
| Watch | Amber | *يقظة* | ≥1 active alert within 3 km in the last 60 min |
| Active | Red | *خطر نشط* | ≥3 alerts within 1 km in the last 15 min |

Watch/Active show a slow pulsing dot. Tap → popover explaining criteria. → Watch fires a **warning haptic**; → Active fires the **heavy haptic**.

### 5.7 Floating Toolbar (Top-Right)
A white pill with two icon buttons (monochrome glyphs tinted to the theme): **Inbox (envelope)** with red unread badge; **Settings (gear)** no badge.

### 5.8 Recenter Button
Sits in the bottom action tray's end slot; appears when panned away from location. Tap animates back to user position; button disappears.

### 5.9 Bottom Action Tray
Controls float free over the map, each with its own elevation (no dark band). Three balanced flex slots keep the primary action centered, flanked by two icon-only circular buttons (56 pt, white, hairline border, float shadow):
- **History button** (start slot): circular **history icon**, no label → Incidents Feed history browser (§5.10).
- **Report FAB** (centered): **68×68 pt** orange circle with a 3 pt white ring, white plus glyph — dead-center and **raised ~20 pt above the side controls** so it reads as the bold focal action, not one button among three. Breathes subtly when Calm; pulse **stops** on Watch/Active.
- **Feeds button** (end slot): circular **newspaper icon**, no label → Feeds screen (§5.10b).
- **Recenter button** (conditional — §5.8): floats above the tray on the trailing edge.

### 5.10 Incidents Feed Drawer (history browser)
Slides up; snaps to **25% / 60% (default) / 90%**; backdrop-tap dismisses. While the map shows only the open 24 h window, the feed is where users **browse incident history**.
**Header (sticky):** drag handle · title *"البلاغات"* with a live **results-count pill** · two filter rows *(no search bar — descriptions are prepared options, so time range + locality are the meaningful filters; only the city picker keeps a search field)*:
- **Facet counts on every filter option:** each option shows a live count of the incidents it would match under the user's *other* active filters — the time-range chips carry count badges, every city/type row in the picker sheets shows its per-option count (e.g. with *آخر شهر* active, each city row shows that city's last-month total), the extended ranges in the more-filters sheet are counted, and the custom-range **تطبيق** button previews the count for the pending dates. Counting lives in `domain/feed/filters.ts` (`countByLocality` / `countByCategory` / `countByRange`); each helper ignores its own dimension so its options stay comparable.
- **Time-range chips (horizontally scrollable row):** **آخر 24 ساعة** (default) | **آخر أسبوع** | **آخر شهر** — history beyond the map's 24 h window — followed by a **"المزيد" (more) button** (sliders glyph) that opens a **more-filters bottom sheet**: the extended presets **آخر 3 أشهر** and **آخر سنة** (apply instantly) plus a **custom date range** picked on a compact in-app month calendar (`DateRangeCalendar`, plain RN primitives — tap start day then end day, future days disabled, range highlighted) confirmed with **تطبيق**. While an extended/custom selection is active, the more button tints accent and shows the active preset label or the chosen *from–to* dates.
- **City + incident-type selectors (multi-select, horizontally scrollable row):** one **"اختر البلدة"** pill (map-pin glyph + selection summary + chevron-down) and one **"نوع البلاغ"** pill (shapes glyph) — never inline chips for all options. Each opens a shared **multi-select bottom sheet**: drag handle, title, checkbox rows that toggle and stay open, a *كل البلدات / كل الأنواع* row that clears the selection, and a **تطبيق** button to close. The city sheet keeps a search field matching across ar/he/en names; the type sheet lists the six categories with their icons. Button labels summarize multi-selections (*الناصرة +2*) and show a clear ✕ when active — so a user can e.g. see *gunfire + robbery over the last month in Nazareth + Haifa*.
Filtering logic lives in `domain/feed/filters.ts` (`filterIncidents`: range — quick `day/week/month`, extended `quarter/year`, or `custom` with inclusive from/to bounds — × `localityIds[]` × `categories[]`; empty arrays mean no restriction).
**Feed cards (modern):** a severity-colored **accent strip** on the card edge; a severity-tinted rounded **icon badge**; category label as the title; a meta row with locality name (map-pin glyph) + relative time (30 s refresh) + a muted **"منتهي" (resolved) badge** for closed incidents; description (≤3 lines). No vote pills (§5.11) and no bookmark — cards carry no per-incident actions. Tap body → Incident Detail Sheet.

### 5.10b Feeds Screen
A draggable **bottom sheet** (25 / 60 / 90 %, route `Feeds`) over the map — the same surface idiom as the incidents Feed (§5.10) — opened from the map tray's **feeds button** (§5.9), distinct from the incidents list. It surfaces community content the map can't:
- **Announcements / events** organized by the Balagh team (e.g. safety workshops, a mediation line, safety guides).
- **News** about violence in the Arab community (community coverage, initiatives).
**Header (sticky, inside the sheet — drag handle + backdrop-tap dismiss, no back button):** title *"الأخبار والفعاليات"* + one-line subtitle. **Filter chips:** الكل | فعاليات | أخبار. **Post cards:** a tinted **kind badge** (megaphone for events in crimson, newspaper for news in amber), source + relative time meta row, title, and a 3-line body. Backed by the mock `db.feedPosts` (a `FeedPost` = `{ id, kind: 'announcement' | 'news', source, title, body, createdAt }`); when a backend lands it serves the same shape. Empty state: newspaper glyph + *"لا يوجد محتوى بعد"*.

### 5.11 No Verification Votes
There is no Confirm/Deny verification feature: incidents carry no vote counts, no `myVote` state, no vote endpoint, and no vote UI. The "active" status rule (§5.6) counts nearby incidents, not "verified" ones.

### 5.12 Incident Detail Sheet
Default **60%**, expandable **95%**. Scrollable: severity pill + timestamp + category; locality + distance; the prepared situation description and any optional location note (§5.13); non-interactive **140 pt** map snippet (light style, Arabic labels) rendering the **~150 m privacy circle** — never an exact pin. No comments and no vote row.

### 5.13 Report Flow

**Step 1 — Category Grid.** Full-screen modal sliding up; 2×3 grid:

| Category | Label (ar) | Severity |
|---|---|---|
| GUNFIRE | *إطلاق نار* | Critical |
| STABBING | *عملية طعن* | Critical |
| ASSAULT | *اعتداء جسدي* | High |
| ROBBERY | *سطو / سرقة* | High |
| SUSPICIOUS | *نشاط مشبوه* | Medium |
| OTHER | *طوارئ أخرى* | Medium |

Severity-tinted icon on top, label below. Tap → Step 2.

**Step 2 — Location + situation picker (no typing).** Sticky header with back + *"وصف الحالة"*.

*Location section (top — GPS is unreliable in the field, so the reporter can correct it):* a **"موقع الحادثة"** card with an interactive **map** centered on the current GPS fix, showing the chosen point as a movable accent pin. **Tap the map to move the pin**; a **"موقعي الحالي"** button re-acquires GPS and recenters; an optional **free-text place field** (*"أو اكتب وصف الموقع"*) captures a description like *"قرب مدرسة الرشيد"*. A status line reflects *locating* / *GPS-failed* (tap to set manually) / *manually adjusted*. The submitted report carries the chosen coordinates and the optional `locationText`.

*Situation section:* subtitle *"اختر الوصف الأقرب لما يحدث"*; users **never type a description** — the screen lists **four prepared situation descriptions** for the chosen category (localized ar/he/en, defined in `core/strings` under `report.situations`), rendered as radio-style selectable cards. The **"إرسال البلاغ"** CTA is pinned bottom and stays **disabled until a situation is selected**; the selected text is submitted as the incident description. **No free-text description field, no photo attachment** — by design. On submit: spinner → submit chosen location → modal closes → pulsing "syncing" pin. If retries exhausted: pin turns amber + dismissable banner *"بلاغك لم يُرسل بعد — جارٍ إعادة المحاولة"*.

**Step 3 — Success.** Full-screen. Centered green animated checkmark (draws **480 ms** + success haptic). *"تم إرسال بلاغك"*. Monospace reference **#BLG-XXXXXX** — long-press copies + *"تم النسخ"* toast. Thank-you: *"شكراً لمساعدتك على حماية حيّك."* **"إغلاق"** returns to map. **No share, no rating, no social.**

### 5.14 Phase-2 Follow-Up *(push, 4–18 h later)*
Push: *"هل لديك تفاصيل إضافية لإضافتها لبلاغك؟"*
**Wellbeing gate (first screen):** *"هل أنت بأمان تام حالياً؟"*
- **"نعم، أنا بأمان"** → skippable detail chips (vehicle description, number of assailants, direction of escape, visible weapon); each opens one focused question.
- **"لا، أحتاج مساعدة"** → suspends follow-up entirely; shows civilian emergency resources (Magen David Adom non-police number + local civil-committee contacts). No further questions.

### 5.15 Crisis One-Shot Flow *(app-icon long-press shortcut)*
Shortcut labeled **"بلاغ فوري آمن"**; submission in **under 3 taps**.
1. **Reassurance:** crimson logo on dark, three checkmark privacy lines. CTA **"متابعة"**.
2. **Category grid:** same 2×3 grid.
3. **Geo confirm:** 140 pt map with a pin at current location. CTA **"إرسال بلاغ فوري آمن"** (siren). One tap submits.
4. **Success:** identical to Step 3.

### 5.16 Notifications Inbox
Modal; sticky header *"التنبيهات"* + "Mark all read". Grouped by day (Today / Yesterday / Last Week / date). Each item: icon, title, body, relative time. Unread = small crimson dot on the leading edge.
**Types:** Nearby incident · Verification update · Status change · Follow-up prompt.
**Empty:** bell-slash · *"لا توجد تنبيهات"* · *"ستظهر التنبيهات هنا عند ورودها"*.

### 5.17 Settings
Inset-grouped list (iOS Settings style): each section is an elevated white card with hairline dividers; every row carries a **tinted icon badge** (the same visual language as feed cards and the category grid). The locality and language rows show the **current selection** as a value; toggles use a green on-state; the delete-data row is destructive red. Section headers:
- **Account:** Change locality · Change language · Public identifier (first/last 6 chars of the key; long-press reveals full key + copy).
- **Privacy & Security:** Privacy Constitution · Delete my data (destructive, confirm — wipes everything, returns to onboarding).
- **Notifications:** Toggles — Nearby incidents · Area status changes · Follow-up invitations. **All on by default.**
- **About:** About · Version (long-press 5× → hidden debug screen).
- **Support:** How does Balagh work? (→ the §5.19b How It Works screen) · Contact us.

### 5.18 Privacy Constitution Screen
From Settings or onboarding Slide 3. **Seven collapsible rule cards**, each with title + explanation + expandable *"كيف نضمن ذلك؟"*. If updated since last viewed, a *"محدّث"* badge shows in the Settings entry.

### 5.19 About Screen
General info only: logo · app name + tagline · one-paragraph mission · version pill. **No source-repository link, no license section, no OSS acknowledgements** (removed from the product).

### 5.19b How It Works Screen
Opened from Settings → Support (its own screen — it previously duplicated the Privacy Constitution). Four localized step cards with tinted icon badges and step numbers: report in seconds (prepared descriptions, anonymous) · reaches people around you (~150 m circle, 24 h) · area status (calm/watch/active) · privacy first (no account, data stays on device). Route: `HowItWorks`.

### 5.20 Permission Prompts
**Location** — requested after locality selection, before first map load. Pre-prompt screen explains why. Options: **"تابع"** (native prompt) / **"ليس الآن"** (skip — map centers on locality, no user dot). Level: "while using the app". If denied: map still works + banner with *"الإعدادات"* link.
**Notifications** — only when a notification toggle is enabled in Settings (Android 13+ `POST_NOTIFICATIONS`).
Never: camera, microphone, photo library, contacts, calendar, motion, advertising ID, background location.

### 5.21 Error & Edge-Case States
- **Generic:** warning icon · *"تعذر التحميل"* · context message · **"إعادة المحاولة"**.
- **Network:** *"تحقّق من اتصالك بالإنترنت ثم أعد المحاولة"*.
- **Map load failure:** full-screen replacement + retry that reinitializes the map.
- **Submit failure (retries exhausted):** sticky dismissable orange banner + reference ID + retry.
- **Feed empty:** shield-check · *"منطقتك هادئة الآن"* · *"لا توجد بلاغات مطابقة في النطاق الزمني المحدد"*.
- **Search no results:** search icon · *"لا توجد نتائج"*.
- **Skeleton loading:** feed = 5 shimmer cards (static under reduce-motion); inbox = 7 rows; submit = inline spinner.
- **Offline indicator:** offline 3 s+ → 28 pt amber banner under toolbar *"أنت غير متصل. سيتم إرسال بلاغاتك عند عودة الاتصال."*; on reconnect briefly green *"اتصلت مجدداً. جارٍ إرسال بلاغاتك المعلّقة."* then slides away.
- **Update required (426):** full-screen, non-dismissable · warning icon · *"يلزم تحديث التطبيق"* · explanation · **"فتح المتجر"**. Cannot be bypassed.

---

## 6. Validated technology stack (bare React Native) + compatibility matrix

### 6.1 Why versioning is harder without Expo — and the discipline that replaces `expo install`

Bare RN has no `expo install` to auto-resolve SDK-matched versions. The replacement discipline:

1. **Pin React Native first**, then choose libraries whose `peerDependencies` allow that RN version.
2. **Check every native module on the React Native Directory** (`reactnative.directory`) for the **"New Architecture" badge** — non-compatible modules will crash, because the old bridge was removed in RN 0.82.
3. **Use the React Native Upgrade Helper** for any RN version bump (it diffs native template files you now own).
4. Prefer **TurboModule/Fabric-native** libraries; legacy modules that still work do so only via the New-Arch interop layer.

### 6.2 Runtime & build

| Concern | Choice | Validated note (28 May 2026) |
|---|---|---|
| Framework | **Bare React Native CLI** | Scaffold: `npx @react-native-community/cli@latest init Balagh`. The old `react-native init` is deprecated. |
| RN version | **0.85.3** | Latest stable (Apr 2026); 0.86 targets June 2026. **Pin `react` and `react-test-renderer` to the EXACT renderer version RN bundles — `react-native-renderer@19.2.3` → `react`/`react-test-renderer` = `19.2.3`.** A mismatch throws `Incompatible React versions` at startup (§16). |
| Architecture | **New Architecture (Fabric + TurboModules + JSI), Hermes** | **Mandatory.** Default since 0.76; old bridge permanently removed in 0.82. The minimal stack uses only New-Arch-clean modules. |
| Language | **TypeScript (strict)** | `strict: true`, no implicit `any`. |
| Min OS | iOS 15.1+, Android 7 / API 24+ | `IPHONEOS_DEPLOYMENT_TARGET = 15.1` (Xcode project); `minSdkVersion = 24` in `android/build.gradle` — matches the "older mid-range Android" requirement. |
| Build | Xcode (CocoaPods) + Android Studio/Gradle | No EAS/config plugins — native config is yours (§7). Optionally add Fastlane for CI later. |

### 6.3 Core libraries

**Why minimal was chosen.** The architecture was deliberately stripped to a small, JS-first dependency set: **lighter** install and bundle, **no native module initialization at cold start** (the class of bug that crashed the app — §16), **no CMake/NDK build step** at install time, and **fewer crash surfaces** to audit. Anything that needed a heavy native module was replaced by a JS-only equivalent or deferred.

These are the core runtime dependencies — small and JS-first; the one heavy native module is the map (§6.6). Everything else lives in `devDependencies`:

| Purpose | Package | Note |
|---|---|---|
| Navigation | `@react-navigation/native` v7 + `@react-navigation/native-stack` | Needs `react-native-screens` + `react-native-safe-area-context`. Typed param lists; deep-link config (`balagh://`) is ready for the crisis shortcut. `enableScreens()` is called in `index.js` (§7.3, §16). |
| Screens / safe area | `react-native-screens` (^4) + `react-native-safe-area-context` (5.8.0) | React Navigation native deps. The only two non-trivial native modules left, both Fabric-clean and well-behaved at startup. |
| UI / app state | `zustand` (^5) | All app state: language, onboarding progress, map/feed selection, connectivity. JS-only. |
| Icons | `lucide-react-native` (^1) + `react-native-svg` (^15) | Professional SVG vector icons, re-exported through `core/icons`. `react-native-svg` is Fabric-clean and does no startup init. |
| Local persistence | `@react-native-async-storage/async-storage` (^2.2) | A thin, well-tested key/value store (no Nitro/JSI native layer to crash on cold boot like MMKV). Async-only; fronted by a synchronous in-memory cache (§9, `core/storage`). |
| Core | `react` (**19.2.3**) + `react-native` (0.85.3) | Hermes + New Architecture. `react` is pinned to RN's bundled renderer version — see §6.2 / §16. |

Replacements for the libraries that were removed (all JS-only, no native init):

| Removed need | Now provided by | Note |
|---|---|---|
| MMKV / Keychain (persistence + key store) | `core/storage` over **AsyncStorage** | One async `multiGet` hydrates an in-memory cache at startup (`hydrateStorage()`); reads are synchronous, writes are fire-and-forget. The device identity lives here under `PRIVATE_KEY`. |
| `@noble/ed25519` + `@noble/hashes` + `react-native-get-random-values` (crypto identity) | `core/identity` over Hermes' built-in `crypto.getRandomValues` | A persistent random 32-byte hex string (RN 0.73+ ships `crypto.getRandomValues` in Hermes). No ed25519, no keychain. `signRequest()` is a **stub** (empty signature) until a backend exists. |
| `i18next` + `react-i18next` + `react-native-localize` | `core/strings` (plain TS object) | `ar` / `he` / `en` string tables + `applyRTL()` / `isRTL()` / `SUPPORTED_LANGUAGES` over `I18nManager`. No i18n runtime. |
| `react-native-haptic-feedback` | `core/haptics` (no-op stubs) | Semantic API kept; no native haptics installed (§4, §12.4). |
| `@tanstack/react-query` + `axios` + WS client | `data/mock` (in-memory mock DB) + `zustand` | An in-memory `db` (incidents / notifications) + `LOCALITIES` (18 cities) feeds the UI directly. A mock `wsEventEmitter` / `startMockEmitter` exists but isn't wired into screens yet. |
| `@react-native-firebase/*` + `@notifee/react-native` | *(deferred)* | No remote/local push yet. Notification toggles persist to AsyncStorage; no native push library is installed (their Android `ContentProvider`s ran native init at startup — §16). |
| `@react-native-clipboard/clipboard` + `mailto` open | RN built-in **`Share`** API | Used in Settings (copy reference / contact). No clipboard native module. |
| `@rn-bridge/react-native-shortcuts` | *(deferred)* | Crisis app-icon shortcut deferred; `balagh://` deep-link config is already in `navigation/linking.ts`. |
| `@react-native-community/netinfo` | *(deferred)* | Connectivity banner/queue deferred; a `net` zustand store stub exists (§13). |
| `react-native-bootsplash` | plain `View` readiness gate | No native splash library; `App.tsx` renders a theme-colored `View` until storage hydrates (§5.1, §9.2). |
| Fonts (asset linking) | `react-native.config.js` `assets: ['./assets/fonts']` | Still uses `npx react-native-asset` when fonts are added; no runtime dependency. |

### 6.4 Architecture status matrix

| Module | Status | Type | Note |
|---|---|---|---|
| react-native **0.85.3** | ✅ in use | core | New Architecture + Hermes |
| react **19.2.3** | ✅ in use | core | **Must equal RN's bundled `react-native-renderer` (19.2.3).** Mismatch (e.g. 19.2.6) crashes at startup — §16. `react-test-renderer` pinned to 19.2.3 too. |
| @react-navigation/native 7.2.4 + native-stack ^7 | ✅ in use | JS | Typed routes + `balagh://` linking |
| react-native-screens ^4 | ✅ in use | Fabric | `enableScreens()` in `index.js` (§7.3) |
| react-native-safe-area-context 5.8.0 | ✅ in use | Fabric | Safe-area insets |
| zustand ^5 | ✅ in use | JS | App/UI state |
| @react-native-async-storage/async-storage ^2.2 | ✅ in use | TurboModule | Persistence; hydrated once at startup |
| @rnmapbox/maps (Mapbox SDK v11) | ✅ in use | Fabric view | Live map + privacy-circle pins (§5.5, §6.6) |
| react-native-reanimated / -worklets | ⛔ removed | — | Avoids the heavy CMake native build at install (§16) |
| react-native-gesture-handler | ⛔ removed | — | Not needed without bottom-sheet/maps |
| @gorhom/bottom-sheet | ⛔ removed | — | Sheets built with plain RN Animated + PanResponder |
| react-native-svg ^15 + lucide-react-native ^1 | ✅ in use | Fabric | SVG vector icons re-exported via `core/icons` |
| @tanstack/react-query | ⛔ removed | — | Data via in-memory mock DB + zustand |
| react-native-mmkv / -nitro-modules | ⛔ removed | — | Persistence via AsyncStorage |
| react-native-keychain | ⛔ removed | — | Its `KeychainModule.kt` ran blocking DataStore I/O on the main thread at startup → crash (§16) |
| @noble/ed25519 / @noble/hashes / react-native-get-random-values | ⛔ removed | — | Identity uses Hermes `crypto.getRandomValues` |
| react-native-haptic-feedback | ⛔ removed | — | `core/haptics` no-op stubs |
| @react-native-firebase/* / @notifee/react-native | ⛔ removed | — | Their Android `ContentProvider`s ran native init at startup (§16) |
| @rn-bridge/react-native-shortcuts | ⛔ removed (deferred) | — | Deep-link config already present |
| @react-native-community/netinfo | ⛔ removed (deferred) | — | Connectivity deferred |
| i18next / react-i18next / react-native-localize | ⛔ removed | — | i18n via `core/strings` plain TS object |
| react-native-bootsplash | ⛔ removed | — | Plain `View` readiness gate instead |
| @react-native-clipboard/clipboard | ⛔ removed | — | Built-in `Share` API |

> When a real backend and the deferred features land, re-introduce native modules one at a time and verify each is New-Architecture-clean and does no blocking work at startup (the lesson of §16).

### 6.5 Notifications (deferred)

No remote/local push is installed in the minimal build. The notification **toggles** (nearby / status / follow-up) persist to AsyncStorage but don't yet drive any delivery. When push is added later, route it behind a small `NotificationService` interface so the transport (FCM, UnifiedPush, or local-only) is a contained choice. Note the privacy tension: FCM routes tokens/metadata through Google; data-only payloads rendered locally minimize what transits Google, and UnifiedPush/local-only avoid it on Android entirely.

### 6.6 Maps

The Map screen ships the real Mapbox surface (§5.5): `@rnmapbox/maps` (Mapbox Maps SDK v11) — the streets style (`streets-v12`, full road-name coverage) with labels localized to Arabic via the `<ArabicLabels />` fallback expression, logo/attribution hidden, north-up fixed (rotation/pitch off), `ShapeSource` clustering tinted to the highest-severity member, individual **~150 m privacy circles** at high zoom rendering the open mock incidents (`db.incidents.getOpen()`), a `LocationPuck` after permission, and offline regions around the chosen locality. Keep the secret download token out of git (Gradle property / `.netrc`); set the public token at runtime via `Mapbox.setAccessToken()`. Verify the New-Arch badge and a clean release-build cold start before merging.

---

## 7. Native project configuration (the part Expo used to hide)

Going bare means you own these files. This is also where the "one permission" guarantee becomes auditable.

### 7.1 iOS — `Info.plist`
- `NSLocationWhenInUseUsageDescription` → Arabic/Hebrew/English reason string. **No** "Always" key.
- `UIAppFonts` → the three font files (when fonts are added).
- `CFBundleShortcutItems` for the crisis Quick Action *(deferred with the shortcut feature)*.
- **Do NOT add:** `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSContactsUsageDescription`, `NSCalendarsUsageDescription`, `NSMotionUsageDescription`. Their absence is the guarantee.
- APNs entitlement only if remote push is enabled (deferred — §6.5).
- New Arch is on by default in the 0.85.3 template (`RCT_NEW_ARCH_ENABLED=1` in the Podfile env).

### 7.2 Android — `AndroidManifest.xml`
- `INTERNET`, `ACCESS_FINE_LOCATION` (+ `ACCESS_COARSE_LOCATION`), `POST_NOTIFICATIONS` (Android 13+, requested only on toggle).
- **Do NOT add:** `CAMERA`, `RECORD_AUDIO`, `READ_MEDIA_*`, `READ_CONTACTS`, `ACCESS_BACKGROUND_LOCATION`, `READ_CALENDAR`, `AD_ID`.
- `newArchEnabled=true` and `hermesEnabled=true` in `gradle.properties`.
- App Shortcuts XML for the crisis shortcut *(deferred with the shortcut feature)*.
- `android/build.gradle` must pin the Kotlin Gradle plugin with the explicit `${kotlinVersion}` classpath (`kotlinVersion = "2.1.20"`) — see §16.
- `FLAG_SECURE` consideration in §13 (screen-capture/recents protection).

### 7.3 Entry file — `index.js` (order matters)
`react-native-screens` is **not** auto-initialized by native-stack, so `enableScreens()` must run before `AppRegistry.registerComponent` (§16). There is no RNG polyfill, no Firebase background handler, and no i18n import — the entry file is minimal:
```js
import { enableScreens } from 'react-native-screens';
enableScreens();

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

### 7.4 Fonts
`react-native.config.js` → `{ assets: ['./assets/fonts'] }`, then `npx react-native-asset` (when fonts are added). Verify family names render under each script.

---

## 8. Recommended AI prompt structure

For a project this size with a clean phase boundary: **one master document with a shared context block + one prompt per phase**, fed to the coding agent sequentially.

- Context stays constant, scope stays small → complete, placeholder-free output.
- Each phase compiles, runs on device, and passes its tests before the next.
- Easy to resume — re-run a single phase against the existing repo.

Delivered in §15. (Avoid a single mega-prompt → it stubs to fit; avoid fully independent per-phase prompts → they drift on conventions.) For bare RN, every phase prompt must also state the **native setup steps** (pods, Gradle, Manifest/Info.plist edits) since there's no config plugin to do it.

---

## 9. High-level architecture

Feature-first, layered. Four layers; dependencies point inward (presentation → domain → data → core):

```
core         theme, strings (i18n), identity, storage, icons, haptics, a11y, types — no app logic
data         repository interfaces + an in-memory mock DB (incidents/notifications/localities)
domain       zustand stores (lang, map, onboarding, net), derived selectors, status rules
presentation navigation + screens + the shared theme components
```

> The data layer is **mock-only** today: there is no HTTP client, no WebSocket client, and no react-query cache. Repositories are plain interfaces backed by an in-memory `db`. When a backend lands, the interfaces stay; only their implementations change.

### 9.1 Folder structure (bare RN) — as built

```
balagh/
├─ index.js                     # entry: enableScreens() then AppRegistry (§7.3)
├─ react-native.config.js       # font assets
├─ app.json
├─ ios/                         # Xcode project, Podfile, Info.plist (you own this)
├─ android/                     # Gradle, AndroidManifest.xml (you own this)
├─ assets/fonts/
└─ src/
   ├─ App.tsx                   # AppErrorBoundary → SafeAreaProvider → NavigationContainer → RootNavigator; useHydrated() gate
   ├─ navigation/
   │  ├─ RootNavigator.tsx      # native-stack; typed param list; Feed/Feeds/IncidentDetail as transparent-modal sheets
   │  ├─ types.ts               # RootStackParamList
   │  └─ linking.ts             # balagh://crisis → Crisis flow (route reserved)
   ├─ screens/
   │  ├─ Splash.tsx
   │  ├─ onboarding/            # Language.tsx, Welcome.tsx, Locality.tsx
   │  ├─ Map.tsx                # primary surface — the live Mapbox dashboard (§5.5)
   │  └─ settings/Settings.tsx
   ├─ core/
   │  ├─ theme/                 # tokens.ts, components.tsx (Text/Button/Chip/SeverityPill)
   │  ├─ strings/               # plain TS string tables (ar/he/en) + applyRTL/isRTL/SUPPORTED_LANGUAGES
   │  ├─ identity/              # random 32-byte hex via Hermes crypto.getRandomValues; signRequest() stub
   │  ├─ storage/               # AsyncStorage + synchronous in-memory cache (hydrateStorage, StorageKeys)
   │  ├─ icons/                 # lucide-react-native re-exports + category icon map
   │  ├─ haptics/               # no-op stubs (kept as a semantic API surface)
   │  ├─ a11y/                  # useReduceMotion
   │  ├─ config.ts              # USE_MOCK_API, env
   │  └─ types/                 # Incident, AppNotification, Locality, …
   ├─ data/
   │  ├─ mock/                  # db.ts (in-memory store + LOCALITIES) + Mock*Repo.ts + eventEmitter.ts + index.ts
   │  └─ repositories/          # interfaces.ts — repository contracts (impl swap when a backend exists)
   └─ domain/
      └─ stores/               # zustand: lang.ts, map.ts, onboarding.ts, net.ts
```

> Not present yet (deferred to later phases): `data/api` (HTTP), `data/ws` (WebSocket), `data/notifications`, `data/queries` (react-query), `domain/queue` (offline write-queue), `presentation/` (the few shared widgets live in `core/theme/components.tsx`). The `core/strings` and `core/storage` modules replace what used to be `core/i18n` and the MMKV wrapper; `core/icons` re-exports `lucide-react-native`.

### 9.2 Data flow (current)
- **Read incidents:** screens read the in-memory `db` — the map via `db.incidents.getOpen()` (24 h window), the feed via `db.incidents.getAll()` + `domain/feed/filters` — rendered in Mapbox layers / a `FlatList`. No network, no cache layer.
- **Live updates:** the mock `eventEmitter` (`startMockEmitter`) drives `incident.created` / `incident.resolved` / `notification.new`; the map, feed and inbox subscribe and update in real time.
- **Write (report):** the report and crisis flows write to the mock `db` and emit `incident.created`. `signRequest()` returns an empty signature until a backend exists; mutations already go through the repository interfaces.
- **Status pill:** `domain/status.computeStatus` applies the §5.6 geo rules (≥1 within 3 km / 60 min → watch; ≥3 within 1 km / 15 min → active) over nearby open incidents, recomputed on foreground.
- **Language/RTL:** `App.tsx`'s `useHydrated()` reads the saved language from storage, sets the `lang` zustand store, and calls `applyRTL()` (native-flag sync only). The live layout direction is a `direction` style on the app root driven by `useIsRTL` — language switches apply instantly with no relaunch (§12.5).

---

## 10. Mock API contract

The frontend codes against **repository interfaces**. A `USE_MOCK_API` flag swaps mock for real HTTP — identical types, zero UI changes when the backend arrives.

### 10.1 Auth (minimal)
This is the **future** backend contract; nothing is signed today. When a backend exists, mutating requests will carry: `X-Device-Key` (the device's hex identity), `X-Signature`, `X-Timestamp` (unix ms). No tokens, no accounts; reads unauthenticated. **Currently** `core/identity.signRequest()` is a stub returning `{ signature: '', timestamp }` — see §11.

### 10.2 Core types (`core/types`)
```ts
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Category  = 'GUNFIRE' | 'STABBING' | 'ASSAULT' | 'ROBBERY' | 'SUSPICIOUS' | 'OTHER';
type SafetyState = 'calm' | 'watch' | 'active';

interface Incident {
  id: string; ref: string;            // ref e.g. "BLG-7Q2K9X"
  category: Category; severity: Severity;
  description?: string;                // one of the prepared situation descriptions (§5.13)
  locationText?: string;               // optional free-text place typed by the reporter (§5.13)
  lat: number; lng: number; localityId: string;
  createdAt: string; resolvedAt?: string;
}
interface AppNotification {
  id: string; type: 'nearby' | 'verification' | 'status' | 'follow_up';
  title: string; body: string; createdAt: string; read: boolean; incidentRef?: string;
}
```

### 10.3 Endpoints
| Method | Path | Purpose | Returns |
|---|---|---|---|
| `GET` | `/incidents?lat&lng&radiusKm` | **Currently open** incidents only — the backend closes pins **24 h** after they are reported (+ just-resolved linger for the fade-out) | `Incident[]` |
| `GET` | `/incidents/history?rangeHours&localityId` | Incident history (incl. resolved) within a time range, optionally per locality — feeds the §5.10 history filters | `Incident[]` |
| `GET` | `/incidents/:id` | Detail | `Incident` |
| `POST` | `/incidents` | Submit report *(signed)* | `{ id, ref }` |
| `GET` | `/status?lat&lng` | Safety state | `{ state, reason }` |
| `GET` | `/localities?q=` | Search ar/he/en | `Locality[]` |
| `GET` | `/notifications` | Inbox | `AppNotification[]` |
| `POST` | `/notifications/read` | Mark read | `204` |
| `POST` | `/follow-up/:ref` | Extra details *(signed)* | `204` |

*(The `POST /incidents/:id/vote` endpoint was removed with the verification-vote feature — §5.11.)*

**Errors:** JSON `{ code, message }`. **426** → non-dismissable update gate.

### 10.4 WebSocket events (`/ws`)
```ts
type WsEvent =
  | { t: 'incident.created'; incident: Incident }
  | { t: 'incident.resolved'; id: string }
  | { t: 'status.changed'; state: SafetyState; reason: string }
  | { t: 'notification.new'; notification: AppNotification };
```

### 10.5 Mock implementation (as built)
The in-memory mock is the only data source today:
- `data/mock/db.ts` — the in-memory store: seeded incidents/notifications + `LOCALITIES` (18 cities). Exposes `db.incidents` and `db.notifications` with getters/mutators. `db.incidents.getOpen()` simulates the backend's 24 h open-incident window for the map (unresolved + < 24 h old, with a ~60 s linger after resolve so the fade-out can play); `getAll()` remains the full history backing the feed filters. Seeds include **historical incidents** (3–25 days old, several in Nazareth) so the week/month history filters have data. **Seeded/emitted descriptions are never free text** — both `db.ts` and `eventEmitter.ts` reference the prepared situation options (`strings.ar.report.situations`) directly, and a seed-integrity test asserts every description is one of the prepared options for its category.
- `data/mock/Mock*Repo.ts` — `MockIncidentRepo`, `MockLocalityRepo`, `MockNotificationRepo`, `MockStatusRepo` implementing the `data/repositories/interfaces.ts` contracts over `db`.
- `data/mock/eventEmitter.ts` — `startMockEmitter()` pushes `incident.created` / `incident.resolved` / `status.changed` / `notification.new`; the map, feed and inbox consume them live.
- `core/config.ts`: `export const USE_MOCK_API = true;`

`Map.tsx` reads `db.incidents.getOpen()` (24 h window); the feed reads `db.incidents.getAll()`; `Locality.tsx` uses `LOCALITIES`. Swapping to a real backend later = filling thin HTTP repos behind the same interfaces. No screen edits.

---

## 11. Device identity (kept simple)

The identity is a persistent random hex string — no asymmetric crypto, no native key store. `crypto.getRandomValues` is built into Hermes (RN 0.73+), so no polyfill and no `@noble/*` libraries are needed.

1. First launch, `core/identity/ensureIdentity()`:
   - If a value exists under `StorageKeys.PRIVATE_KEY` in AsyncStorage → reuse it.
   - Otherwise generate `randomHex(32)` via `crypto.getRandomValues` and persist it.
2. `signRequest(method, path, body)` → **stub**: returns `{ signature: '', timestamp: String(Date.now()) }`. There is no backend to sign for yet; when one exists this becomes a real signature without touching callers.
3. **Public identifier** (Settings): `getPublicIdentifier()` → first 6 / last 6 chars (`abcdef...123456`).
4. **Delete my data:** `deleteIdentity()` clears the key from AsyncStorage and resets the in-memory id; the app's "Delete my data" also clears storage and returns to onboarding. Uninstall does the same implicitly.

No biometric gate, no rotation, no backup — intentionally minimal. If real signed requests are needed later, swap `core/identity` to an Ed25519 implementation behind the same exported functions.

---

## 12. Design system (implementation)

### 12.1 Tokens (`core/theme/tokens.ts`)
```ts
export const color = {
  bg: '#F8FAFC', card: '#FFFFFF', cardElevated: '#EEF2F7', border: '#E2E8F0',
  textPrimary: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
  textOnAccent: '#FFFFFF',
  accent: '#DC2626',
  severity: { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#65A30D' },
  status:   { calm: '#16A34A', watch: '#D97706', active: '#DC2626' },
};
export const space = (n: number) => n * 8;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const motion = { instant: 100, fast: 200, base: 320, deliberate: 480 };
export const hit = { min: 48 };
```
Baked-in rules: light-only, CTAs in the **bottom 40%**, tap targets ≥ 48×48, no gradients; soft functional shadows only (`shadow.card` / `shadow.float`). **All numerals Western Arabic (0–9)** in every locale via `formatNumber()`.

### 12.2 Typography
RN-linked fonts: IBM Plex Sans Arabic (ar/he), Inter (Latin), JetBrains Mono (ref codes). A `Text` wrapper picks family by active script.

### 12.3 Motion
Single source: `motion` tokens. Every animation checks `useReduceMotion()` (`AccessibilityInfo.isReduceMotionEnabled` + change listener) and degrades to instant + static.

### 12.4 Haptic map (`core/haptics` — currently no-op stubs)
The semantic API exists so callers stay stable, but every method is a no-op (no native haptics library installed). The intended mapping for a future implementation:

| Trigger | semantic call | (future) feedback |
|---|---|---|
| Toggle / chip | `haptics.toggle()` | light impact |
| Primary button | `haptics.press()` | medium impact |
| Confirmed submit | `haptics.success()` | success notification |
| High-severity status appears | `haptics.warning()` | warning notification |
| Submit / validation failure | `haptics.error()` | error notification |
| → Active (red) status | `haptics.heavy()` | heavy impact |

On Android the OS still gives implicit ripple feedback. Wire a real library later behind this same semantic API.

> **Zero-sound is a hard rule.** Never play audio. CI check: fail if anything imports an audio API (`react-native-sound`, `react-native-video`, `expo-av`, `Audio`).

### 12.5 RTL & icons
- **JS-driven RTL — no relaunch.** The app root (`App.tsx`) applies a `direction: 'rtl' | 'ltr'` style derived reactively from the lang store (`useIsRTL`), which Yoga propagates to the entire tree — switching to/from Arabic or Hebrew flips the layout instantly, with **no restart prompt** (first launch or from Settings). `core/strings.applyRTL(lang)` still syncs `I18nManager.forceRTL`, but only so the *next* cold start boots with the correct native direction.
- Directional icons: call sites pick the mirrored variant (e.g. ChevronLeft vs ChevronRight) via the reactive `useIsRTL()` hook (or `isRTL(lang)` where lang is a prop) — never `I18nManager.isRTL`, which is stale until the next cold start. Non-directional icons untouched.

---

## 13. Offline, resilience & safety hardening

> **Status:** most of this is **deferred** until there is a backend to be offline *from*. With a mock-only data layer there are no real network writes to queue. The targets below describe the intended behaviour; what exists today is the persistence primitive (AsyncStorage) and a `net` zustand store stub.

- **Write queue (deferred):** when a backend exists, reports enqueue to AsyncStorage (`pending → syncing → sent | failed`) — **not** MMKV. A sync engine drains on reconnect with exponential backoff. No queue is implemented yet.
- **Syncing pin (deferred):** pulses while `syncing`; amber on `failed` (retries exhausted) + dismissable banner + retry.
- **Offline banner (deferred):** 3 s offline → amber 28 pt; reconnect → brief green → auto-dismiss. Connectivity detection (previously NetInfo) is deferred; a `net` store stub holds the flag.
- **Update gate (426) (deferred):** full-screen, non-dismissable, "Open Store".
- **Offline maps:** the map downloads a capped offline pack around the chosen locality so it renders with no connectivity. A Settings UI to clear it is still a future addition.
- **Screen-capture protection (future):** consider Android `FLAG_SECURE` and an iOS app-switcher blur on sensitive screens (report/crisis) so a shoulder-surfer or recents preview can't reveal activity. Make it a toggle, default on for crisis screens.
- **Status without background location:** background location is forbidden, so the status pill recomputes on foreground (and, with a backend, via `status.changed` events) — never via a background geofence.

---

## 14. Phased build plan

Each phase **must compile, run on a device/emulator (New Arch), and pass its tests** before the next. "No placeholders" — every in-scope screen is fully wired to the mock layer. Each phase lists its **native setup** explicitly (no config plugins to lean on).

> **Status:** all six phases are implemented end-to-end against the mock layer — onboarding, the live Mapbox map, the incidents feed + filters, the Feeds sheet, incident detail, reporting, the crisis flow, notifications, and settings. The phases below are kept as the build order (the sequence to rebuild from scratch). Each phase that adds a native module verifies it is New-Arch-clean and does no blocking work at startup (§16).

> **The discipline:** every phase that adds a native module must (a) confirm its New-Architecture badge on `reactnative.directory`, (b) keep `index.js` minimal — no blocking work before `AppRegistry`, (c) re-verify cold start on a release build, and (d) keep the permission allowlist at Location / Internet / Notifications.

### Phase 0 — Scaffold & foundations *(done)*
- `npx @react-native-community/cli@latest init Balagh` (RN 0.85.3). New Arch + Hermes on. TS strict, ESLint/Prettier. `react`/`react-test-renderer` pinned to **19.2.3** (must equal the bundled renderer — §16.1).
- Base stack is **only** `react-native-screens` + `react-native-safe-area-context` (navigation primitives). `App.tsx` wires `SafeAreaProvider` + `NavigationContainer` (no `GestureHandlerRootView`, no `QueryClientProvider`); `index.js` calls `enableScreens()` before `AppRegistry`.
- `core/theme` (tokens + components), `core/strings` (ar/he/en + RTL + `formatNumber`), fonts linked, `core/haptics` (no-op stubs), `useReduceMotion`, `core/storage` (AsyncStorage + in-memory cache).
- **Tests (jest + @testing-library/react-native):** token snapshot; string-table key parity; `formatNumber` Western digits; RTL flag flip.

### Phase 1 — App structure & navigation *(done)*
- React Navigation v7 native-stack with a typed `RootStackParamList` + linking config (`balagh://crisis`). All routes navigable; not-yet-built routes resolve to a `StubScreen`.
- Fully built: Splash (readiness gate + error/retry), Language, Welcome carousel (dot→pill), Locality (search ar/he/en against `LOCALITIES`, sticky CTA disabled until chosen), Settings.
- `core/identity` (random 32-byte hex via Hermes `crypto.getRandomValues`; `signRequest` stub; public identifier in Settings) — **no ed25519, no keychain**.
- Repository **interfaces** + `data/mock` (in-memory `db`, `Mock*Repo`, `eventEmitter`) + `USE_MOCK_API` + zustand stores — **no react-query**.
- Map screen ships as an **incident-feed preview** (locality name, derived calm/watch/active status dot, `FlatList` of mock incidents, settings gear, Report FAB) — replaced by the real map in Phase 2.
- **Tests:** first-launch → language → welcome → locality → map route resolves; identity persists across relaunch (AsyncStorage mock); "Delete my data" returns to onboarding; locality search matches all scripts.

### Phase 2 — Real Mapbox map *(done)*
Add `@rnmapbox/maps` (Mapbox Maps SDK v11) and turn the Map screen into the real dashboard described in §5.5–§5.9.
- **Native setup:** install `@rnmapbox/maps`; set the **secret download token** via a Gradle property (`~/.gradle/gradle.properties`) + the iOS `Podfile`/`.netrc` (keep it out of git); set the **public token** at runtime with `Mapbox.setAccessToken()` early in `App.tsx`. `pod install` for iOS; verify the Fabric component autolinks under New Arch. Confirm a **release-build cold start** is clean.
- **Map canvas:** full-bleed streets style (`mapbox://styles/mapbox/streets-v12`) with street/place labels localized to Arabic via `<ArabicLabels />` (a `name_ar` → `name` → `name_en` coalesce over the style's label layers — never blank), logo/attribution/scale-bar hidden, **north-up fixed** (rotation + pitch gestures disabled), user-location `LocationPuck` shown only after permission.
- **Mock incident pins (the deliverable):** render the **currently open** mock incidents (`db.incidents.getOpen()` — the 24 h window, §5.5) on the map. Each open incident → a **~150 m privacy circle** in its severity color (never an exact point — `privacyCircleRadius()`); the highest-priority active incident's circle edge pulses. Use a `ShapeSource` with `cluster: true` + a `CircleLayer`/`SymbolLayer` so low zoom shows cluster bubbles tinted to the highest-severity member with a count, and high zoom shows individual privacy circles. New circles scale-in over 320 ms; resolved incidents fade to 30% then drop after 30 s. Tap → centers the map + opens the Incident Detail sheet (a stub sheet here; fully built in Phase 3). The mock `eventEmitter` (`startMockEmitter`) feeds live `incident.created` / `incident.resolved` so circles appear/disappear in real time.
- **Location permission:** pre-prompt screen (why) → native **"while using"** request. On deny: center on the chosen locality, show the user no dot, and surface a settings banner. Background location is **never** requested.
- **Surrounding UI:** the Safety Status pill (calm/watch/active, with the §5.6 radius/time rules computed in a `domain/status` helper from nearby incidents), the recenter FAB (appears when panned away), and the bottom action tray (a history icon button → incidents list, a feeds icon button → Feeds screen, and the centered breathing Report FAB that stops pulsing on Watch/Active).
- **Offline region:** download a Mapbox offline pack around the chosen locality so the map renders without connectivity; cap the pack size.
- **Tests:** status-rule unit tests (3 km/60 min → watch; 1 km/15 min/≥3 → active); privacy-circle meter→pixel math; cluster→individual circle transition; permission grant/deny branches; reduce-motion disables the pulse. Mock `@rnmapbox/maps` in jest.

### Phase 3 — Feed & incident detail *(done)*
- Incidents Feed drawer: a draggable bottom sheet snapping 25 / 60 / 90 % with a backdrop. Build it with plain RN `Animated` + `PanResponder` (no `@gorhom/bottom-sheet`/reanimated) to keep the stack minimal; if a richer sheet is justified later, add the library deliberately (§16).
- Sticky header (drag handle, title + results-count pill — no search bar) + the §5.10 **history filters**: time-range chips (آخر 24 ساعة / آخر أسبوع / آخر شهر) + the **"المزيد" more-filters sheet** (آخر 3 أشهر / آخر سنة / custom date range on the in-app `DateRangeCalendar`) + **multi-select "اختر البلدة" and "نوع البلاغ" buttons** opening the shared checkbox picker sheet (searchable for cities; the *all* row clears; labels summarize as *الناصرة +2*; clear ✕ when active; every option shows its facet count). Feed cards (modern): severity accent strip + tinted icon badge, category title, locality + relative time refreshing every 30 s, description (≤3 lines), resolved badge for closed incidents — no bookmark (removed from the product). Tap a card → Incident Detail.
- Incident Detail sheet (60 → 95 %): the prepared situation description, a 140 pt non-interactive Mapbox snippet drawing the ~150 m privacy circle. The feed and the map read the same mock `db` so they stay in sync. *(Comments and votes were removed from the product.)*
- **Tests:** 30 s timestamp refresh; feed↔map data consistency; 24 h open-window behavior (`getOpen`); history range/locality/category filtering (`filterIncidents`).

### Phase 4 — Reporting & crisis *(done)*
- Report flow: category grid (2×3, severity-tinted icons; GUNFIRE/STABBING = critical, ASSAULT/ROBBERY = high, SUSPICIOUS/OTHER = medium) → **location + situation picker** (an editable map — current GPS fix as a movable pin, tap to correct, optional free-text place — then four prepared descriptions per category, radio-style cards; submit disabled until one is chosen — **no free-text description, no media**) → success (green checkmark draw 480 ms, mono `#BLG-XXXXXX`, long-press copy via the built-in **`Share`** API + "تم النسخ" toast, no share-to-social/rating).
- Submit: spinner → acquire GPS fix → write to the mock `db` (a new pin appears on the map via `eventEmitter`); with a real backend later this enqueues to an AsyncStorage write-queue with a pulsing "syncing" pin, and on retry-exhaustion an amber pin + dismissable banner + retry.
- Crisis one-shot (≤3 taps): deep link `balagh://crisis` (route reserved in `linking.ts`) → reassure → category → geo-confirm (140 pt map) → success. The app-icon long-press shortcut that fires this deep link is wired in Phase 6 native steps.
- **Tests:** report happy path adds an incident the map renders; crisis flow ≤3 taps; deep link resolves; **assert camera/mic/photo permissions are absent from the native manifest**.

### Phase 5 — Notifications & follow-up *(done)*
- Add a `NotificationService` interface and a default implementation. For remote push, integrate `@react-native-firebase/messaging` (data-only payloads) + `@notifee/react-native` (local render, Android channels, badge) **only** once verified New-Arch-clean — register the background handler in `index.js` *after* `enableScreens()`, and confirm cold start is still clean (their `ContentProvider`s were a startup risk — §16). Keep the transport swappable to UnifiedPush/local-only for a privacy-max build.
- Request notification permission **only** when a toggle is enabled in Settings (Android 13+ `POST_NOTIFICATIONS`). Toggles persist to AsyncStorage.
- Notifications Inbox (grouped Today / Yesterday / Last Week / date, unread crimson dots, mark-all-read, empty state "لا توجد تنبيهات") fed by `MockNotificationRepo`. Four types: nearby, verification, status change, follow-up.
- Follow-up: wellbeing gate first ("هل أنت بأمان تام حالياً؟") → "نعم، أنا بأمان" → skippable detail chips (vehicle, assailant count, escape direction, weapon); "لا، أحتاج مساعدة" → suspend the follow-up and show civilian emergency resources (MDA non-police number + local civil-committee contacts), no further questions.
- **Tests:** permission only on toggle; follow-up "no" path shows resources and asks nothing further; inbox grouping + read state.

### Phase 6 — Polish & full working app *(done — full app, no stubs)*
By the end of this phase the app is **fully working end-to-end** against the mock layer — onboarding, the live Mapbox map with mock pins, the feed, incident detail, reporting, the crisis flow, notifications, and settings all function with no placeholder screens remaining.
- Privacy Constitution (7 collapsible rules + "كيف نضمن ذلك؟" + "محدّث" badge), About (general info only — logo, tagline, mission, version), the How It Works screen (§5.19b), full Settings (change locality/language, notification toggles default-on, contact = share `mailto` via the built-in `Share` API, hidden debug via 5× long-press on version).
- App-icon long-press shortcut "بلاغ فوري آمن" → fires `balagh://crisis` (native shortcut wiring for Android + iOS Quick Action).
- All error/edge states: generic ("تعذر التحميل") / network / map-load failure with retry, submit-fail banner, feed-empty ("منطقتك هادئة الآن") / search-empty, skeleton loaders (static under reduce-motion), offline indicator, non-dismissable **426 update gate**.
- Safety hardening: Android `FLAG_SECURE` + iOS app-switcher blur on crisis/report screens; offline-region management UI in Settings.
- A11y + reduce-motion sweep; haptic map verified (or confirmed no-op); **zero-sound CI check**.
- **Exit criteria / tests:** every route reachable and functional (no `StubScreen` remaining); each error state renders + retries; reduce-motion disables shimmer/pulse; update gate non-dismissable; no audio import anywhere; native manifest has only Location / Internet / Notifications; full onboarding→map→report→detail→inbox→settings smoke test passes.

---

## 15. The AI build prompt

> **Usage:** Paste **§15.1 (Context Block)** into your coding agent first. Then paste **one phase prompt at a time** from §15.2. Don't advance until the current phase compiles, runs on a device with the New Architecture, and its tests pass.

### 15.1 Context block (paste once, keep in context every phase)

```
ROLE
You are a senior React Native engineer building "Balagh" (بلاغ): a safety-critical,
privacy-first civilian incident-reporting app for Arabic-speaking communities in Israel,
with full Hebrew and English support. It must work for stressed users, one-handed, on
unstable networks and older mid-range Android devices. You write complete,
production-quality, TypeScript-strict code. This is a BARE React Native CLI app (NOT Expo).

HOW WE WORK
You build ONE phase at a time (§14). Build only the phase I give you, but make it fully
working end-to-end against the mock data layer — no placeholder screens, no TODOs. A phase
is "done" only when it compiles, runs on a release build with the New Architecture, its
tests pass, and the app still cold-starts cleanly.

EXACT VERSIONS (do not drift)
- react-native 0.85.3 (Hermes + New Architecture, both on by default).
- react 19.2.3 AND react-test-renderer 19.2.3 — these MUST equal the react-native-renderer
  that RN 0.85.3 bundles (19.2.3). Any mismatch (e.g. react 19.2.6) throws "Incompatible
  React versions" and the app dies on launch. Never bump react independently of RN.
- TypeScript strict. Node >= 20. Min OS: iOS 15.1+, Android 7 / API 24+.
- Android: kotlinVersion 2.1.20 (pinned), compileSdk/targetSdk 36, ndk 27.1.12297006.
- Scaffold with `npx @react-native-community/cli@latest init Balagh`.

THE 10 RUNTIME DEPENDENCIES (this is the whole runtime stack; everything else is a devDep)
  @react-navigation/native 7.2.4, @react-navigation/native-stack ^7,
  react-native-screens ^4, react-native-safe-area-context 5.8.0,
  zustand ^5, @react-native-async-storage/async-storage ^2.2,
  react-native-svg ^15 + lucide-react-native ^1 (icons),
  react 19.2.3, react-native 0.85.3.
MINIMAL-STACK RULE: every extra native module is a cold-start crash surface and/or a
CMake/NDK build cost. The default answer to "should I add a library?" is NO. A phase may
add a native module ONLY if its phase prompt explicitly says so (today only Phase 2 does,
for maps). Before adding any native module: confirm its New-Architecture badge on
reactnative.directory; if it is not New-Arch-clean, STOP and tell me — do not add it.

USE THESE JS-ONLY PATTERNS, NEVER THESE LIBRARIES
- Persistence: src/core/storage (AsyncStorage + a synchronous in-memory cache hydrated once
  at startup). NOT MMKV / nitro-modules.
- Device identity: src/core/identity — a persistent random 32-byte hex via Hermes' built-in
  crypto.getRandomValues (RN 0.73+). NOT @noble/ed25519, @noble/hashes, react-native-keychain,
  or react-native-get-random-values. signRequest() is a stub until a backend exists.
- i18n: src/core/strings (plain TS string tables ar/he/en) + I18nManager. NOT i18next.
- Icons: src/core/icons re-exports lucide-react-native (SVG vectors over react-native-svg).
- Clipboard / mailto: React Native's built-in Share API. NOT a clipboard module.
- Data: an in-memory mock db + Mock*Repo + zustand. NOT react-query/axios/a WS client.
- Haptics: src/core/haptics no-op stubs (kept as a stable semantic API).
- Splash: a plain <View> readiness gate in App.tsx. NOT react-native-bootsplash.
- Animations/sheets: plain RN Animated + PanResponder. NOT reanimated/worklets/
  gesture-handler/@gorhom/bottom-sheet.

PRIVACY & SAFETY — HARD CONSTRAINTS (enforced in code, native config, and tests)
- ZERO personal data collected: no phone, email, name, login, or any ID field anywhere.
- ZERO sound: never import or play audio. Keep the CI check that fails on audio imports.
- The native manifests contain ONLY: Location (while-using), Internet, and (Android 13+)
  POST_NOTIFICATIONS. NEVER add camera, microphone, photo library, contacts, calendar,
  motion, advertising ID, or BACKGROUND location. Their absence is the guarantee.
- No police/state/government integration of any kind.

NATIVE CONFIG YOU OWN (no Expo, no config plugins — spell out every native edit you make)
- index.js: call enableScreens() (from react-native-screens) FIRST, then
  AppRegistry.registerComponent. No RNG polyfill. (Add a push background handler ONLY in
  Phase 5, after enableScreens(), and re-verify cold start.)
- android/build.gradle: classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
  with kotlinVersion=2.1.20. gradle.properties: newArchEnabled=true, hermesEnabled=true.
- iOS Info.plist: NSLocationWhenInUseUsageDescription (ar/he/en) + UIAppFonts only. No
  "Always" location key. New Arch via RCT_NEW_ARCH_ENABLED=1.
- AndroidManifest: INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS.
- Fonts via react-native.config.js `assets: ['./assets/fonts']` + `npx react-native-asset`.

ARCHITECTURE (match spec §9.1 exactly)
- Feature-first, layered: presentation → domain → data → core (deps point inward).
- App.tsx = AppErrorBoundary → SafeAreaProvider → NavigationContainer → RootNavigator,
  gated by useHydrated() which calls hydrateStorage() then restores language + applyRTL().
  No GestureHandlerRootView, no QueryClientProvider.
- RootNavigator: native-stack, typed RootStackParamList, balagh:// linking. Not-yet-built
  routes resolve to a StubScreen (and must be replaced — none may remain after Phase 6).
- All data flows through the repository interfaces in data/repositories. USE_MOCK_API
  (src/core/config.ts) is true; Mock*Repo read the in-memory db (data/mock/db.ts) which
  also holds LOCALITIES. A mock eventEmitter (startMockEmitter) drives live updates.
  When a backend lands, the interfaces stay; only their implementations change.

DATA CONTRACT — types, endpoints, and WS events exactly as in spec §10.2–§10.4 (the FUTURE
backend contract). Signing is a stub today (empty signature). When a backend exists,
mutations carry X-Device-Key / X-Signature / X-Timestamp; 426 → update gate. There is NO
vote feature: incidents carry no vote fields and no vote endpoint exists. GET /incidents
serves only currently OPEN incidents (24 h window); GET /incidents/history serves the
feed's time-range/locality history filters.

DESIGN SYSTEM — tokens from spec §12: light-only, bg #F8FAFC / card #FFFFFF, crimson accent
#DC2626 with white textOnAccent, the severity & status palettes, 8-pt spacing grid, tap
targets ≥48pt, no gradients (soft shadow.card/shadow.float only), motion 100–480ms (respect
OS reduce-motion — degrade to instant/static), IBM Plex Sans Arabic / Inter / JetBrains Mono,
all numerals Western Arabic (0–9) via formatNumber(), primary CTAs in the bottom 40%.
RTL-correct for ar/he; directional icons mirror. Match the screen-by-screen UI in §5 exactly,
including the Arabic labels.

WORKFLOW FOR THE PHASE I GIVE YOU
1. Restate the phase scope in one line and list the files you will create/modify (this phase
   only) plus any native edits.
2. Implement everything in full — every in-scope screen wired to the mock layer.
3. Add the phase's tests (jest + @testing-library/react-native + native-module mocks) and
   show how to run them.
4. End with the exact install + pod/Gradle commands and how to run on iOS and Android, and
   confirm a clean release cold start.
5. If anything is ambiguous, or a library's API / New-Arch status forces a deviation from
   this brief, STOP and flag it instead of guessing.
```

### 15.2 Per-phase prompts (paste one at a time)

```
PHASE 0 — Scaffold & foundations (no features). [DONE — minimal stack]
Scaffold the bare RN 0.85.3 app with `npx @react-native-community/cli@latest init Balagh`;
confirm New Arch + Hermes are on. Pin react & react-test-renderer to 19.2.3 (must match the
bundled react-native-renderer). Set up TS strict, ESLint/Prettier. Add ONLY the navigation
primitives natively: react-native-screens + react-native-safe-area-context (pod install +
autolink). Do NOT add gesture-handler/reanimated/worklets/svg/mmkv/netinfo/bootsplash.
Implement src/core/theme (tokens + Text/Button/Chip/SeverityPill), src/core/strings
(ar/he/en + applyRTL/isRTL + formatNumber), font linking via react-native.config.js +
react-native-asset, src/core/haptics (no-op stubs), useReduceMotion, and src/core/storage
(AsyncStorage + synchronous in-memory cache via hydrateStorage). App.tsx wires
SafeAreaProvider + NavigationContainer only (no GestureHandlerRootView, no
QueryClientProvider). index.js calls enableScreens() before AppRegistry.
Tests: token snapshot; string-table key parity across locales; formatNumber Western-digit
output; RTL flag flip.
```

```
PHASE 1 — App structure & navigation (structure first). [DONE]
Build React Navigation v7 native-stack with a typed RootStackParamList and a linking
config (balagh://crisis → Crisis flow). Every route navigable; Phase 2+ routes resolve to a
StubScreen. Fully implement: Splash (readiness gate ≤1.5s + error/retry — no native
bootsplash), Language select, Welcome carousel (3 slides, dot→pill indicator), Locality
select (search across ar/he/en against LOCALITIES, sticky "تفعيل الحساب الآمن" CTA disabled
until chosen), Settings. Implement src/core/identity (random 32-byte hex via Hermes
crypto.getRandomValues stored in AsyncStorage; signRequest stub; getPublicIdentifier) —
no ed25519, no keychain. Add repository INTERFACES, the in-memory mock db +
Mock*Repo, USE_MOCK_API flag, zustand stores — no react-query.
Tests: first-launch flow resolves to the map route; identity persists across relaunch
(AsyncStorage mock); "Delete my data" wipes and returns to onboarding; locality search
matches all 3 scripts.
```

```
PHASE 2 — Real Mapbox map with mock pins. [implement the live map now]
Replace the Map incident-feed preview with the real Main Map Dashboard using @rnmapbox/maps
(Mapbox Maps SDK v11). Native setup: install @rnmapbox/maps; set the SECRET download token
via a Gradle property (~/.gradle/gradle.properties) + the iOS Podfile/.netrc (keep it OUT of
git); set the PUBLIC token at runtime via Mapbox.setAccessToken() early in App.tsx. Run pod
install; confirm the Fabric component autolinks under New Arch; verify a RELEASE-build cold
start is clean. Build: full-bleed streets style (mapbox://styles/mapbox/streets-v12) with
labels localized to Arabic (localizeLabels), north-up fixed (rotation + pitch gestures
disabled), LocationPuck only after permission. RENDER THE OPEN MOCK INCIDENTS: read
db.incidents.getOpen() (the 24h open window — older/resolved incidents NEVER reach the map)
and draw a ShapeSource with cluster:true — low zoom = cluster bubbles tinted to the
highest-severity member with a count; high zoom = ~150m PRIVACY CIRCLES in severity color
(translucent fill + stroke, zoom-interpolated meters→pixels via privacyCircleRadius() — never
an exact point), the highest-priority active circle's edge pulses. New circles scale-in 320ms;
resolved fade to 30% then drop after 30s; tap centers the map + opens a (stub) Incident Detail
sheet. Wire startMockEmitter so incident.created/resolved animate circles live. Location
pre-prompt screen (why) → native "while using" request; on deny center on the chosen locality,
no dot, settings banner — NEVER request background location. Add the Safety Status pill
(calm/watch/active via a domain/status helper: 3km/60min→watch, 1km/15min/≥3→active), the
recenter FAB (when panned away), and the bottom action tray (history + feeds icon buttons
flanking the centered breathing Report FAB that stops pulsing on Watch/Active). Download a Mapbox offline pack around the locality
(capped size).
Tests: status-rule units (watch/active thresholds); privacy-circle meter→pixel math;
cluster→individual transition; permission grant/deny branches; reduce-motion disables the
pulse. Mock @rnmapbox/maps in jest.
```

```
PHASE 3 — Feed & incidents.
Build the Incidents Feed using plain React Native primitives (a FlatList; if a draggable
bottom sheet is wanted, build it with Animated/PanResponder — do NOT add
@gorhom/bottom-sheet or reanimated). The feed is the HISTORY browser (the map only shows
the open 24h window): sticky header with title + results-count pill (NO search bar) +
time-range chips
(آخر 24 ساعة / آخر أسبوع / آخر شهر) + a "المزيد" more-filters sheet (آخر 3 أشهر / آخر سنة
presets + a custom date range on a compact in-app calendar — NO date-picker library) +
MULTI-SELECT "اختر البلدة" and "نوع البلاغ" buttons (NOT inline chips for all options)
opening a shared checkbox picker sheet (searchable for cities; the "all" row clears;
labels summarize as "الناصرة +2"; clear ✕ when active) so e.g. "gunfire + robbery, last
month, Nazareth + Haifa" works. Every filter option (range chips, city rows, type rows,
extended ranges, custom Apply) shows a live facet count of matching incidents under the
other active filters (countByLocality/countByCategory/countByRange).
Filtering = domain/feed/filters.ts
(range × localityIds[] × categories[]). Feed cards (modern): severity accent strip, severity-tinted
icon badge, category title, locality + relative timestamp refreshing every 30s,
description (≤3 lines), a muted "منتهي" resolved badge for closed incidents — NO
bookmark (the feature was removed). Incident Detail (60→95% sheet or full screen):
full description + a 140pt non-interactive snippet drawing the ~150m privacy circle — no
comments and NO votes (both features were removed from the product). (Mock eventEmitter
can drive live updates.)
Tests: timestamp refresh; getOpen 24h window;
filterIncidents range/locality/query.
```

```
PHASE 4 — Reporting & crisis.
Report flow: category grid (2×3, severity-tinted icons; GUNFIRE/STABBING=critical,
ASSAULT/ROBBERY=high, SUSPICIOUS/OTHER=medium) → situation picker: the user NEVER types a
description — show the four prepared situation descriptions for the chosen category
(core/strings report.situations, localized ar/he/en) as radio-style cards, submit disabled
until one is selected (NO free-text field, NO media attachment) → success (green checkmark
draw 480ms, monospace #BLG-XXXXXX, long-press to copy via the built-in Share API +
"تم النسخ" toast, no share-to-social/rating). Submit: spinner → acquire GPS fix → (with backend) enqueue →
pulsing syncing pin; on retry-exhausted failure, amber pin + dismissable banner
"بلاغك لم يُرسل بعد — جارٍ إعادة المحاولة" + retry. Crisis one-shot (≤3 taps) via the
deep link balagh://crisis (route already reserved in linking.ts; app-icon shortcut library
deferred): reassure → category → geo-confirm → success. Offline write-queue, when added, is
AsyncStorage-backed (no MMKV).
Tests: report happy path; crisis flow ≤3 taps; deep link resolves; assert the native
manifest has NO camera/mic/photo permissions.
```

```
PHASE 5 — Notifications & follow-up.
Notification toggles persist to AsyncStorage. Remote/local push is DEFERRED — do NOT add
Firebase/Notifee (their Android ContentProviders ran native init at startup). When push is
genuinely needed, hide it behind a NotificationService interface and ASK first; prefer
data-only payloads or a self-hosted/UnifiedPush path. Request notification permission ONLY
when a toggle is enabled in Settings (Android 13+ POST_NOTIFICATIONS). Build the
Notifications Inbox (grouped Today/Yesterday/Last Week/date, unread crimson dots,
mark-all-read, empty state "لا توجد تنبيهات") fed by MockNotificationRepo. Support the four
types (nearby, verification, status change, follow-up). Phase-2 follow-up opened from a
follow-up notification: wellbeing gate first ("هل أنت بأمان تام حالياً؟") — "نعم، أنا بأمان"
leads to skippable detail chips (vehicle, assailant count, escape direction, weapon), each a
single focused question; "لا، أحتاج مساعدة" suspends the follow-up entirely and shows
civilian emergency resources (Magen David Adom non-police number + local civil-committee
contacts) with no further questions.
Tests: permission requested only on toggle; follow-up "no" path shows resources and asks
nothing further; inbox grouping + read state.
```

```
PHASE 6 — Polish & full working app (FINAL: no stubs remain).
Goal: the app is fully working end-to-end on the mock layer — onboarding, the live Mapbox map
with mock pins, the feed, incident detail, reporting, the crisis flow,
notifications, and settings all function with NO placeholder/StubScreen routes left.
Build the Privacy Constitution screen (7 collapsible rule cards, each with a "كيف نضمن ذلك؟"
expandable; "محدّث" badge when changed), the About screen (general info only:
logo, tagline, mission, version), and the full Settings list (change locality, change
language, notification toggles default-on, contact = share a mailto via the built-in Share API
without opening a mail app, hidden debug via 5× long-press on version). Wire the app-icon
long-press shortcut "بلاغ فوري آمن" to fire balagh://crisis (Android dynamic shortcut + iOS
Quick Action native steps). Implement every error/edge state: generic ("تعذر التحميل") /
network / map-load failure with retry, submit-failure banner, feed-empty
("منطقتك هادئة الآن") and search-no-results states, skeleton loaders (5 feed cards / 7 inbox
rows; static under reduce-motion), the offline indicator, and the non-dismissable 426 update
gate ("يلزم تحديث التطبيق"). Add safety hardening: Android FLAG_SECURE + iOS app-switcher blur
on crisis/report screens; offline-region management UI in Settings. Accessibility +
reduce-motion sweep. Add a CI check that fails on any audio import and a test asserting the
native manifest contains only Location/Internet/Notifications.
Exit criteria/tests: every route reachable and functional (no StubScreen remains); a full
onboarding→map→report→detail→inbox→settings smoke test passes; each error state renders +
retries; reduce-motion disables all shimmer/pulse; update gate cannot be dismissed; no audio
import; manifest permission allowlist holds.
```

---

## 16. Risks & gotchas (front-load these)

### 16.1 Startup crash fixes (resolved)

These were the actual cold-start crashes that drove the move to the minimal stack. Each is fixed in the current build:

- **React / renderer version mismatch — THE startup crash.** `react` must be the *exact* same version as the `react-native-renderer` bundled inside `react-native`. RN 0.85.3 ships `react-native-renderer@19.2.3`, so `react` (and `react-test-renderer`) **must be pinned to `19.2.3`** — not `19.2.6`. A mismatch throws `Incompatible React versions: ... react: 19.2.6 / react-native-renderer: 19.2.3` at runtime and the app dies on launch. Never bump `react` independently of the RN version.
- **`enableScreens()` not auto-called.** `@react-navigation/native-stack` does **not** initialize `react-native-screens` for you. `index.js` must `import { enableScreens } from 'react-native-screens'; enableScreens();` **before** `AppRegistry.registerComponent`, or navigation crashes/hangs at startup.
- **Kotlin classpath version.** `android/build.gradle` must pin `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")` with the explicit `${kotlinVersion}` (= `2.1.20` in the `ext` block); leaving it unversioned lets Gradle resolve an arbitrary version that conflicts at sync.
- **`react-native-keychain` removed.** Its `KeychainModule.kt` `init` block ran `runBlocking { prefs.data.first() }` — blocking DataStore I/O on the **main thread** before JS loaded → cold-boot crash. Replaced by AsyncStorage; the identity is a plain hex string (§11).
- **Firebase / Notifee removed.** Their Android `ContentProvider`s run native init at process start (before React mounts), adding startup weight and crash surface. Push is deferred (§14, Phase 5).
- **No reanimated / worklets / MMKV / svg / gesture-handler.** These pull a CMake/NDK native build and (for the Nitro/JSI ones) run native init early. Dropping them removes the heavy build step and several startup failure modes.

### 16.2 General gotchas

- **New-Arch is mandatory.** Any library without New-Arch support will crash on RN 0.85.3. Check `reactnative.directory` before adding *anything* — and prefer not adding it at all (§6.3 keeps the runtime stack small and JS-first).
- **No config plugins.** You hand-edit `Info.plist`, `AndroidManifest.xml`, `Podfile`, and Gradle. Every phase prompt asks the agent to spell these out.
- **`index.js` is minimal.** `enableScreens()` first, then `AppRegistry.registerComponent`. No RNG polyfill (Hermes has `crypto.getRandomValues`), no Firebase background handler.
- **Hermes has crypto.** `crypto.getRandomValues` is built into Hermes since RN 0.73 — no `react-native-get-random-values` needed for `core/identity`.
- **Jest preset.** RN 0.85 ships the Jest preset as a separate package — install `@react-native/jest-preset` and set `preset: "@react-native/jest-preset"`.
- **RTL without relaunch.** Don't depend on `I18nManager.isRTL` mid-session — it only changes on the next cold start. The live direction is JS-driven (`direction` style at the app root + `useIsRTL`, §12.5); `applyRTL` keeps the native flag in sync for future cold starts.
- **Adding a heavy lib later (maps/push).** Treat it as a deliberate decision, not a default — it reintroduces the CMake build and startup-init surfaces this stack was trimmed to avoid. Mapbox tokens, when added: download (secret) token ≠ public token; keep the secret out of git.
- **Reduce-motion vs haptics.** Haptics are no-op stubs today; if a real library is wired later, decide whether reduce-motion also silences them (default: keep, as an accessibility aid).
- **Zero-sound enforcement.** A reviewer can miss an audio import; the CI forbidden-API check (already in the Android workflow) is the real guard.

---

## 17. What changed & improved

### 17.1 vs a managed (Expo) setup
- **Navigation:** Expo Router → **React Navigation v7** native-stack with a typed param list and explicit linking config for the crisis deep link.
- **Stronger permission guarantee.** You own `Info.plist` / `AndroidManifest.xml`, so "one permission only" is auditable directly in the manifest, and a test can assert the allowlist (§7, Phase 4/6).
- **Phase prompts include native setup**, since there are no config plugins to do it for you.

### 17.2 vs the original heavy bare-RN plan (the simplification)
The spec originally specced a large native stack; it was deliberately stripped to fix cold-start crashes and remove the CMake build. Removed → replaced with:
- **MMKV + Keychain** → `core/storage` over **AsyncStorage** (in-memory cache for sync reads); identity is a hex string stored there.
- **@noble/ed25519 + @noble/hashes + react-native-get-random-values** → `core/identity` over Hermes' built-in `crypto.getRandomValues`; `signRequest()` is a stub until a backend exists.
- **i18next + react-i18next + react-native-localize** → `core/strings` (plain TS tables) + `I18nManager`.
- **@tanstack/react-query + axios + WS client** → in-memory mock `db` + `zustand`.
- **react-native-reanimated + react-native-worklets + @gorhom/bottom-sheet + react-native-gesture-handler** → removed (plain RN primitives; no CMake).
- **@react-native-firebase/* + @notifee/react-native** → deferred (toggles persist to AsyncStorage; no native push).
- **@rnmapbox/maps** → **in use** — the live map; the single heavy native module, added deliberately (§6.6).
- **react-native-haptic-feedback** → no-op stubs. **@react-native-clipboard/clipboard** → built-in `Share`. **@react-native-community/netinfo** + **react-native-bootsplash** → deferred (a plain `View` is the readiness gate).
- **Result:** a small, JS-first runtime stack (plus `react-native-svg` + `lucide-react-native` for vector icons and `@rnmapbox/maps` for the map), with no native init on the main thread at startup and a clean cold start. See §16.1 for the specific crashes this resolved.
