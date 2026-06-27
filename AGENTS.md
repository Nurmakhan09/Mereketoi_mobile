# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Bottom navigation contract (mirrors the web)

The bottom tab bar (`app/(tabs)/_layout.tsx`) is a **fixed 5-item bar**, identical on
every screen, that **never changes by auth or published state**:

> Басты бет · Іздеу · ＋Жариялау · Күнтізбе · Профиль

This mirrors the website's single shared bar (`app/Views/partials/bottom_nav.php`,
2026-06-27 "барлық беттерге тек бір төменгі навбар"). Rules:

- Items, order and icons are **constant** — do not hide/show tabs or relabel the
  middle slot by `hasPublished`/auth.
- Guest gating is delegated to the **screens**, not the bar: `create.tsx` bounces
  guests to `/auth`, `calendar.tsx` renders `<GuestGate>`, the profile tab shows the
  guest profile. `my-listings` is `href: null` (reached via the profile menu / create
  flow), not a bottom slot.
- Design = web tokens: inactive icons navy accent (`Colors.secondary` #0B1F4D),
  active icon+label primary (`Colors.primary` #000099), inactive labels `Colors.textMuted`.
  The center "＋" is a filled rounded-square (`Radius.md`, `AddTabIcon`), not a raised
  circle. Calendar carries the red pending-той-booking badge (9+ cap) for providers.
