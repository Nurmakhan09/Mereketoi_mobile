import { Stack } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { Colors } from '@/constants/theme';

/** Shared header for pushed screens: blank title + a label-less navy back chevron. */
const pushedHeader = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Colors.background },
  headerLeft: () => <BackButton />,
} as const;

interface Props {
  /** The group's own tab screen (e.g. 'index' for (home), 'search' for (search)). */
  initial: string;
  /** Optional native-header options for the tab screen itself (used by Calendar). */
  initialOptions?: Record<string, unknown>;
}

/**
 * The per-tab Stack every tab group renders. All detail routes live in the
 * shared group dir `(home,search,create,calendar,profile)` so they exist inside
 * EVERY tab's stack — the bottom bar therefore stays visible on every page
 * (owner request 2026-07-17: «қай бетке кірсе де навбар тұруы қажет») while
 * push animation and the iOS swipe-back gesture keep working.
 */
export function TabGroupStack({ initial, initialOptions }: Props) {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name={initial} options={initialOptions} />
      <Stack.Screen name="listing/[uuid]/index" options={pushedHeader} />
      <Stack.Screen name="listing/[uuid]/calendar" options={pushedHeader} />
      <Stack.Screen name="my/[uuid]/edit" options={pushedHeader} />
      <Stack.Screen name="my/[uuid]/publish" options={pushedHeader} />
      <Stack.Screen name="my/[uuid]/calendar" options={pushedHeader} />
      <Stack.Screen name="my-listings" options={pushedHeader} />
      <Stack.Screen name="calendars" options={pushedHeader} />
      <Stack.Screen name="calendar-day" />
      <Stack.Screen name="favorites" options={pushedHeader} />
      <Stack.Screen name="toi/index" options={pushedHeader} />
      <Stack.Screen name="toi/history" options={pushedHeader} />
      <Stack.Screen name="invite/[token]" options={pushedHeader} />
      <Stack.Screen name="settings" options={pushedHeader} />
      <Stack.Screen name="notifications" options={pushedHeader} />
      <Stack.Screen name="notifications-preferences" options={pushedHeader} />
      <Stack.Screen name="page/[slug]" options={pushedHeader} />
      <Stack.Screen name="contact" options={pushedHeader} />
    </Stack>
  );
}
