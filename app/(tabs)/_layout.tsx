import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackActions } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

import { ActiveTheme, Colors, Fonts, Radius } from '@/constants/theme';
import { AddTabIcon } from '@/components/AddTabIcon';
import { GlassTabBarBackground } from '@/components/GlassTabBarBackground';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { useI18n } from '@/locales';
import {
  getTabBarMode,
  TAB_BAR_HEIGHT,
  GLASS_SIDE_MARGIN,
  GLASS_BOTTOM_GAP,
} from '@/hooks/useTabBarPadding';

/**
 * Bottom navigation — mirrors the web's single shared bar (app/Views/partials/
 * bottom_nav.php, 2026-06-27 «барлық беттерге тек бір төменгі навбар»): a FIXED
 * 5-item bar, identical on every screen, that NEVER changes by auth or published
 * state:
 *   Басты бет · Іздеу · ➕ Жариялау · Күнтізбе · Профиль
 * Each tab is its own Stack (group) and every detail route lives in the shared
 * group `(home,search,create,calendar,profile)`, so the bar stays visible on
 * EVERY page (owner request 2026-07-17). Only the destinations adapt to auth,
 * and the SCREENS handle that themselves — create.tsx bounces guests to /auth,
 * calendar.tsx renders <GuestGate>, profile shows the guest profile.
 *
 * Bar background adapts to the OS (owner request 2026-07-17):
 *   iOS 26+ → floating Liquid Glass pill (expo-glass-effect), older iOS → classic
 *   translucent blur bar (expo-blur), Android → the original solid white bar.
 * Icons/labels keep the web tokens: navy accent (#0B1F4D) inactive, blue
 * (#000099) active; the middle «Жариялау» is a filled rounded-square (AddTabIcon).
 * Calendar carries the red pending-той-booking badge for providers (9+ cap).
 */

// Module-level (not per-render) so a rapid double-tap is caught across renders —
// see the "Guarded against a rapid double-tap race" comment below.
const POP_DEBOUNCE_MS = 400;
let lastPopAt = 0;

export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authed';
  const { t } = useI18n();

  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const tabBarMode = getTabBarMode();

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

  // Re-tapping the ACTIVE tab pops its nested stack back to the tab's root screen
  // (native iOS behaviour) — each tab hosts a Stack now, so without this a deep
  // detail page would stay put when its own tab icon is tapped.
  //
  // Guarded against a rapid double-tap race (owner report 2026-07-19): tapping a
  // tab twice fast, then tapping a DIFFERENT tab, could leave that tab failing to
  // open. Root cause: this dispatched popToTop() against `route.state` captured
  // in the listener-factory closure — on a fast double-tap the second dispatch
  // could fire against an already-stale target key while the first was still
  // being processed, and the very next (different-tab) tabPress could then land
  // while the navigator was mid-update. Fixed by (a) re-reading this tab's route
  // fresh, by key, from the navigator's CURRENT state instead of trusting the
  // closure, and (b) ignoring a repeat repress within POP_DEBOUNCE_MS.
  const popToRootOnRepress = ({ navigation, route }: any) => ({
    tabPress: () => {
      if (!navigation.isFocused()) return;

      const now = Date.now();
      if (now - lastPopAt < POP_DEBOUNCE_MS) return;

      const freshRoute: any =
        navigation.getState?.()?.routes?.find((r: any) => r.key === route?.key) ?? route;
      const state = freshRoute?.state;
      if (state?.key && (state.index ?? 0) > 0) {
        lastPopAt = now;
        navigation.dispatch({ ...StackActions.popToTop(), target: state.key });
      }
    },
  });

  const tabBarStyle =
    tabBarMode === 'glass'
      ? {
          // iOS 26 Liquid Glass: floating pill, content scrolls beneath it.
          position: 'absolute' as const,
          left: GLASS_SIDE_MARGIN,
          right: GLASS_SIDE_MARGIN,
          bottom: bottomInset + GLASS_BOTTOM_GAP,
          height: TAB_BAR_HEIGHT,
          borderRadius: Radius.xl,
          overflow: 'hidden' as const,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: 8,
          elevation: 0,
          shadowOpacity: 0,
        }
      : tabBarMode === 'blur'
        ? {
            // Older iOS: classic edge-to-edge translucent bar.
            position: 'absolute' as const,
            backgroundColor: 'transparent',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: Colors.border,
            height: TAB_BAR_HEIGHT + bottomInset,
            paddingTop: 6,
            paddingBottom: Math.max(bottomInset, 8),
            elevation: 0,
            shadowOpacity: 0,
          }
        : {
            // Android: original opaque bar in normal layout flow.
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            height: TAB_BAR_HEIGHT + bottomInset,
            paddingTop: 6,
            paddingBottom: Math.max(bottomInset, 8),
            // Web: box-shadow 0 -2px 12px rgba(15,23,42,0.08)
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
          };

  const tabBarBackground =
    tabBarMode === 'glass'
      ? () => <GlassTabBarBackground />
      : tabBarMode === 'blur'
        ? () => (
            <BlurView
              tint={ActiveTheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
              intensity={100}
              style={StyleSheet.absoluteFill}
            />
          )
        : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // iOS: subtle native-style cross-fade between tab scenes (Android keeps
        // the platform's instant switch).
        animation: tabBarMode === 'solid' ? 'none' : 'fade',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle,
        tabBarBackground,
        tabBarLabelStyle: { fontFamily: Fonts.semibold, fontSize: 10 },
        // Red pending-booking badge (web .nav-badge: #dc2626 / white).
        tabBarBadgeStyle: { backgroundColor: '#dc2626', color: '#fff', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="(home)"
        listeners={popToRootOnRepress}
        options={{
          title: t.tabHome,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        listeners={popToRootOnRepress}
        options={{
          title: t.tabSearch,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="(create)"
        options={{
          title: t.tabCreate,
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
        }}
        listeners={(ctx) => ({
          // Guests must NOT mount create.tsx: push the auth modal from the ROOT context on
          // the gesture (the GuestGate pattern), instead of letting create.tsx fire a
          // cross-navigator router.replace inside useFocusEffect — that asymmetry can
          // intermittently redbox / boomerang on the New Architecture.
          tabPress: (e) => {
            if (!isAuthed) {
              e.preventDefault();
              router.push({ pathname: '/auth', params: { returnTo: '/create' } });
              return;
            }
            popToRootOnRepress(ctx).tabPress();
          },
        })}
      />
      <Tabs.Screen
        name="(calendar)"
        listeners={popToRootOnRepress}
        options={{
          title: t.calendarTitle,
          tabBarBadge: calendarBadge,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? Colors.primary : Colors.secondary} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        listeners={popToRootOnRepress}
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
