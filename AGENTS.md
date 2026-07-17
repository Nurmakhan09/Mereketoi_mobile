# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Bottom navigation contract (mirrors the web)

The bottom tab bar (`app/(tabs)/_layout.tsx`) is a **fixed 5-item bar**, visible on
**every page** (owner request 2026-07-17), that **never changes by auth or published
state**:

> Басты бет · Іздеу · ＋Жариялау · Күнтізбе · Профиль

This mirrors the website's single shared bar (`app/Views/partials/bottom_nav.php`,
2026-06-27 "барлық беттерге тек бір төменгі навбар"). Rules:

- Items, order and icons are **constant** — do not hide/show tabs or relabel the
  middle slot by `hasPublished`/auth.
- **Every tab is its own Stack** (`(home)`, `(search)`, `(create)`, `(calendar)`,
  `(profile)` groups, each rendering `components/TabGroupStack.tsx`); all detail
  routes live in the shared group `(home,search,create,calendar,profile)` so the
  bar stays visible on every page while push animation + iOS swipe-back keep
  working. Only true modals (`auth`, `set-nickname`) and `forgot-password` stay
  outside `(tabs)`.
- The bar background **adapts to the OS** (owner request 2026-07-17, see
  `hooks/useTabBarPadding.ts`): iOS 26+ → floating Liquid Glass pill
  (`expo-glass-effect`), older iOS → classic translucent blur bar (`expo-blur`),
  Android → the original solid white bar. On iOS the bar is `position:absolute`,
  so every scrollable screen adds `useTabBarPadding()` to its bottom padding
  (`components/ui/Screen.tsx` does this automatically; custom lists/sticky
  footers add it themselves).
- Guest gating is delegated to the **screens**, not the bar: `create.tsx` bounces
  guests to `/auth`, `calendar.tsx` renders `<GuestGate>`, the profile tab shows the
  guest profile. `my-listings` lives in the shared group (reached via the profile
  menu / create flow), not a bottom slot.
- Design = web tokens: inactive icons navy accent (`Colors.secondary` #0B1F4D),
  active icon+label primary (`Colors.primary` #000099), inactive labels `Colors.textMuted`.
  The center "＋" is a filled rounded-square (`Radius.md`, `AddTabIcon`), not a raised
  circle. Calendar carries the red pending-той-booking badge (9+ cap) for providers.

## Fonts

Brand font is **Nunito** (`@expo-google-fonts/nunito`, mapped in
`constants/theme.ts → Fonts`). Do NOT switch back to Quicksand — it has no
Cyrillic-Extended glyphs, so Kazakh letters (Ә Ғ Қ Ң Ө Ұ Ү Һ І) fell back to the
system font (owner bug report 2026-07-17).
