# Phase 6 — Native steps

The cross-platform pieces of Phase 6 (Privacy Constitution, About, skeletons,
offline banner, 426 update gate, error/retry states) are pure JS/TS and are
covered by the test suite. A few platform-native pieces can only be wired in the
native projects and **verified on a device/simulator**, which isn't possible in
the cloud build environment. They're spelled out here so they can be applied and
verified locally before release.

## Android — done in this repo

- **App-icon long-press shortcut "بلاغ فوري آمن" → `balagh://crisis`**
  - `android/app/src/main/res/xml/shortcuts.xml` — static shortcut firing the
    `balagh://crisis` VIEW intent.
  - `AndroidManifest.xml` — `<meta-data android:name="android.app.shortcuts" .../>`
    on the launcher activity.
  - `res/values/strings.xml` — `shortcut_crisis_short` / `shortcut_crisis_long`.
  - Caught by the existing `balagh://crisis` intent-filter → routed to
    `CrisisReassure` by `src/navigation/linking.ts`.
- **FLAG_SECURE** — set app-wide in `MainActivity.onCreate` (blocks screenshots
  and the recents thumbnail). Per-screen toggling would need a custom native
  module, which the minimal-stack rule forbids; app-wide is the stricter
  guarantee.

## iOS — apply locally (cannot be verified in cloud)

These require an Xcode build + a real device/simulator to verify, so they are
documented rather than committed blind.

1. **Quick Action (home-screen long-press) "بلاغ فوري آمن"**
   In `ios/Balagh/Info.plist` add:
   ```xml
   <key>UIApplicationShortcutItems</key>
   <array>
     <dict>
       <key>UIApplicationShortcutItemType</key>
       <string>com.balagh.crisis</string>
       <key>UIApplicationShortcutItemTitle</key>
       <string>بلاغ فوري آمن</string>
     </dict>
   </array>
   ```
   In `AppDelegate`, handle the shortcut by opening the `balagh://crisis` URL
   through React Native's `RCTLinkingManager` so it lands on `CrisisReassure`.

2. **App-switcher blur (FLAG_SECURE equivalent)**
   In `AppDelegate`, add a blur/cover view on
   `applicationWillResignActive` and remove it on
   `applicationDidBecomeActive`, so app content isn't shown in the iOS app
   switcher. (iOS has no FLAG_SECURE; the standard pattern is an overlay
   `UIVisualEffectView`.)

## Verification checklist (device)

- [ ] Long-press the app icon → "بلاغ فوري آمن" appears → tapping it opens the
      crisis reassure screen.
- [ ] Take a screenshot on Android → blocked / black (FLAG_SECURE).
- [ ] Open the app switcher on iOS → content is blurred.
- [ ] New-Arch badge shows on first render; cold start is clean.
