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
import { OnboardingTour } from '@/components/OnboardingTour';
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
// see the "Guarded against a rapid double-tap race" comment below. Keyed PER TAB
// (route.key): a single shared timestamp let a pop on tab A silently swallow a
// legitimate repress-pop on tab B within the same window.
//
// 600ms, not 400: it has to outlast the iOS cross-fade between tab scenes
// (screenOptions.animation === 'fade'), which is the exact window in which a
// second press used to land a popToTop on a half-transitioned stack.
const POP_DEBOUNCE_MS = 600;
const lastPopAt = new Map<string, number>();

// The guest "+" gate pushes /auth on a gesture; without a guard a fast double-tap
// opens the modal TWICE (see the tabPress handler on the (create) screen).
const AUTH_NAV_DEBOUNCE_MS = 600;
let lastAuthNavAt = 0;

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
  // Guarded against a rapid double-tap race: tapping a tab twice fast could blank
  // the screen on iOS. bottom-tabs emits tabPress BEFORE the tab switch is
  // dispatched, so on the press that merely SWITCHES to a tab this listener runs
  // while the tab is still unfocused. With the old `isFocused()`-first ordering
  // that press returned without recording anything, so the second press of a
  // double-tap sailed past the debounce and dispatched popToTop into a stack that
  // was still mid cross-fade — leaving a detached scene, i.e. a white page.
  //
  // Order now: debounce → stamp UNCONDITIONALLY → focus check → pop. Stamping
  // every accepted press (not just the ones that actually pop) is what closes the
  // transition window. The dispatch also re-reads this tab's route fresh, by key,
  // from the navigator's CURRENT state rather than trusting the stale `route`
  // captured in this listener-factory closure.
  const popToRootOnRepress = ({ navigation, route }: any) => ({
    tabPress: () => {
      const now = Date.now();
      const tabKey: string = route?.key ?? '';
      if (now - (lastPopAt.get(tabKey) ?? 0) < POP_DEBOUNCE_MS) return;
      lastPopAt.set(tabKey, now);

      if (!navigation.isFocused()) return;

      const freshRoute: any =
        navigation.getState?.()?.routes?.find((r: any) => r.key === route?.key) ?? route;
      const state = freshRoute?.state;
      if (state?.key && (state.index ?? 0) > 0) {
        navigation.dispatch({ ...StackActions.popToTop(), target: state.key });
      }
    },
  });

  const tabBarStyle =
    tabBarMode === 'glass'
      ? {
          // iOS 26 Liquid Glass: floating pill, content scrolls beneath it.
          position: 'absolute' as const,
          // MUST be margins, not left/right: the library's base bar style sets the
          // LOGICAL edges `start: 0 / end: 0` (BottomTabBar styles.bottom) and Yoga
          // gives logical edges precedence over physical left/right, so physical
          // insets were dead code and the "floating pill" rendered full-width,
          // corners jammed against the screen edges. Margins aren't set by the base
          // style, so they survive the merge.
          marginHorizontal: GLASS_SIDE_MARGIN,
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
    <>
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
              // preventDefault keeps this tab UNFOCUSED, so a second fast tap runs
              // this exact branch again. push() would stack a SECOND /auth modal
              // (closing one then reveals an identical sheet — "✕ looks broken");
              // navigate() re-targets the existing one, and the timestamp guard
              // covers taps that drain before the first commit lands.
              const now = Date.now();
              if (now - lastAuthNavAt < AUTH_NAV_DEBOUNCE_MS) return;
              lastAuthNavAt = now;
              router.navigate({ pathname: '/auth', params: { returnTo: '/create' } });
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
    <OnboardingTour />
    </>
  );
}
