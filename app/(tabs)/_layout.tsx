import { useEffect } from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { CreateTabButton, ListingTabButton } from '@/components/CreateTabButton';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { useI18n } from '@/locales';

/**
 * Auth-aware bottom nav (design prompt §3 — 5 slots, no Favorites tab; Favorites
 * lives in the profile menu as a pushed page):
 *  Guest:             Home · Search · Жариялау(+) · Profile
 *  Authed (no ad):    Search · Жариялау(+) · Profile
 *  Authed + published: Search · Күнтізбе · Хабарландыруым · Profile
 * Calendar shows only for a PUBLISHED provider; the middle CTA flips from the
 * raised "+" (create) to "Хабарландыруым" (opens the single ad) once published.
 * Active tab is navy; inactive icons are uniform grey (design prompt §3 — gold is
 * accent-only, never the whole nav). The raised middle "+" stays gold.
 */
export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authed';
  const { t } = useI18n();

  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // "Хабарландыруым" lights up on its screen and on the single ad's editor.
  const listingActive = pathname === '/my-listings' || pathname.startsWith('/my/');

  const hasPublished = useMyListingStore((s) => s.hasPublished);
  const pendingBookings = useMyListingStore((s) => s.pendingBookings);
  const refreshMine = useMyListingStore((s) => s.refresh);
  const resetMine = useMyListingStore((s) => s.reset);

  // Lift the bar above the system gesture/nav area. Samsung (and most Android
  // gesture-nav phones) draw a back/home pill at the very bottom; a fixed
  // paddingBottom let it overlap our tabs and swallow the taps. Honor the real
  // safe-area inset on every platform so the tab bar always clears it.
  const bottomInset = insets.bottom;
  const tabBarHeight = (Platform.OS === 'ios' ? 58 : 56) + bottomInset;
  const tabBarPadBottom = Math.max(bottomInset, 8);

  // Keep the one-listing flag fresh: load it when authed, clear it on logout.
  useEffect(() => {
    if (isAuthed) void refreshMine();
    else resetMine();
  }, [isAuthed, refreshMine, resetMine]);

  const showCalendar = isAuthed && hasPublished;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: tabBarPadBottom,
        },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: isAuthed ? null : '/',
          title: t.tabHome,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.tabSearch,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: showCalendar ? '/calendar' : null,
          title: t.calendarTitle,
          tabBarBadge: showCalendar && pendingBookings > 0 ? pendingBookings : undefined,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          // One-listing model: not a bottom tab. Reached via the middle CTA below
          // (and the profile menu). Kept as a route only.
          href: null,
          title: t.myListing,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: hasPublished ? t.myListing : t.tabCreate,
          tabBarLabel: () => null,
          tabBarButton: () =>
            hasPublished ? (
              <ListingTabButton label={t.myListing} active={listingActive} onPress={() => router.navigate('/my-listings')} />
            ) : (
              <CreateTabButton onPress={() => router.navigate('/create')} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? Colors.primary : Colors.tabInactive} />
          ),
        }}
      />
    </Tabs>
  );
}
