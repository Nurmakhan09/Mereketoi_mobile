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
 * Auth-aware bottom nav — mirrors the website's mobile cabinet nav (layouts/app.php):
 *  Guest:             Home · Search · Жариялау(+) · Favorites · Profile
 *  Authed (no ad):    Search · Жариялау(+) · Favorites · Profile
 *  Authed + published: Search · Күнтізбе · Хабарландыруым · Favorites · Profile
 * Calendar shows only for a PUBLISHED provider; the middle CTA flips from the
 * raised "+" (create) to "Хабарландыруым" (opens the single ad) once published.
 * Active tab is navy; inactive icons are gold (owner preference).
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
        tabBarInactiveTintColor: Colors.textMuted,
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
        name="calendar"
        options={{
          href: showCalendar ? '/calendar' : null,
          title: t.calendarTitle,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
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
        name="favorites"
        options={{
          title: t.tabFavorites,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
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
