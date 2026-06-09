import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { CreateTabButton } from '@/components/CreateTabButton';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from '@/locales';

/**
 * Auth-aware 5-tab bottom nav.
 *  Guest:  Home · Search · Create(+) · Favorites · Profile
 *  Authed: Search · My Listings · Create(+) · Favorites · Profile
 * (Home is hidden when authed; My Listings is hidden when a guest.)
 * Active tab (icon + label) is navy; inactive icons are gold (owner preference).
 */
export default function TabLayout() {
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authed';
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
        name="my-listings"
        options={{
          href: isAuthed ? '/my-listings' : null,
          title: t.tabMyListings,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={24}
              color={focused ? Colors.primary : Colors.secondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t.tabCreate,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
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
