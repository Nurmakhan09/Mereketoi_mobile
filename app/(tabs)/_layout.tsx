import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { AddTabIcon } from '@/components/AddTabIcon';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { useI18n } from '@/locales';

/**
 * Bottom navigation — mirrors the web's single shared bar (app/Views/partials/
 * bottom_nav.php, 2026-06-27 «барлық беттерге тек бір төменгі навбар»): a FIXED
 * 5-item bar, identical on every screen, that NEVER changes by auth or published
 * state:
 *   Басты бет · Іздеу · ➕ Жариялау · Күнтізбе · Профиль
 * Only the destinations adapt to auth, and the SCREENS handle that themselves —
 * create.tsx bounces guests to /auth, calendar.tsx renders <GuestGate>, profile
 * shows the guest profile — so the bar's items, order and icons stay constant.
 *
 * Design = web tokens.css: icons are navy accent (#0B1F4D = Colors.secondary),
 * blue (#000099 = Colors.primary) when active; labels are muted grey, blue when
 * active. The middle «Жариялау» is a filled rounded-square (radius-md) with a
 * white «+» (see AddTabIcon), not a raised circle. Calendar carries the red
 * pending-той-booking badge for providers (9+ cap), mirroring the web partial.
 */
export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authed';
  const { t } = useI18n();

  const insets = useSafeAreaInsets();
  // Honour the real safe-area inset so the bar clears the system gesture pill.
  const bottomInset = insets.bottom;
  const tabBarHeight = (Platform.OS === 'ios' ? 64 : 62) + bottomInset;
  const tabBarPadBottom = Math.max(bottomInset, 8);

  const pendingBookings = useMyListingStore((s) => s.pendingBookings);
  const refreshMine = useMyListingStore((s) => s.refresh);
  const resetMine = useMyListingStore((s) => s.reset);

  // Keep the pending-booking count fresh for the calendar badge: load when
  // authed, clear on logout. (Naturally 0 for clients with no listings.)
  useEffect(() => {
    if (isAuthed) void refreshMine();
    else resetMine();
  }, [isAuthed, refreshMine, resetMine]);

  const calendarBadge =
    isAuthed && pendingBookings > 0 ? (pendingBookings > 9 ? '9+' : pendingBookings) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: tabBarPadBottom,
          // Web: box-shadow 0 -2px 12px rgba(15,23,42,0.08)
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: { fontFamily: Fonts.semibold, fontSize: 10 },
        // Red pending-booking badge (web .nav-badge: #dc2626 / white).
        tabBarBadgeStyle: { backgroundColor: '#dc2626', color: '#fff', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.tabSearch,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t.tabCreate,
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
        }}
        listeners={{
          // Guests must NOT mount create.tsx: push the auth modal from the ROOT context on
          // the gesture (the GuestGate pattern), instead of letting create.tsx fire a
          // cross-navigator router.replace inside useFocusEffect — that asymmetry can
          // intermittently redbox / boomerang on the New Architecture.
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              router.push({ pathname: '/auth', params: { returnTo: '/create' } });
            }
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t.calendarTitle,
          tabBarBadge: calendarBadge,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          // One-listing model: reached via the profile menu / create flow, never
          // a bottom tab. Kept as a route only (the web bar has no «my listing» slot).
          href: null,
          title: t.myListing,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
    </Tabs>
  );
}
