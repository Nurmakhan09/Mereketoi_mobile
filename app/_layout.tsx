import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import 'react-native-reanimated';

import { AppGate } from '@/components/AppGate';
import { BackButton } from '@/components/BackButton';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Shared header for pushed screens: blank title + a label-less navy back chevron. */
const pushedHeader = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Colors.background },
  headerLeft: () => <BackButton />,
} as const;

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // splash stays up
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
            <Stack.Screen name="listing/[uuid]/index" options={pushedHeader} />
            <Stack.Screen name="listing/[uuid]/calendar" options={pushedHeader} />
            <Stack.Screen name="my/[uuid]/edit" options={pushedHeader} />
            <Stack.Screen name="my/[uuid]/publish" options={pushedHeader} />
            <Stack.Screen name="my/[uuid]/calendar" options={pushedHeader} />
            <Stack.Screen name="calendars" options={pushedHeader} />
            <Stack.Screen name="calendar-day" />
            <Stack.Screen name="set-nickname" options={{ presentation: 'modal' }} />
            <Stack.Screen name="favorites" options={pushedHeader} />
            <Stack.Screen name="toi/index" options={pushedHeader} />
            <Stack.Screen name="toi/history" options={pushedHeader} />
            <Stack.Screen name="invite/[token]" options={pushedHeader} />
            <Stack.Screen name="settings" options={pushedHeader} />
            <Stack.Screen name="notifications" options={pushedHeader} />
            <Stack.Screen name="notifications-preferences" options={pushedHeader} />
            <Stack.Screen name="page/[slug]" options={pushedHeader} />
          </Stack>
          <StatusBar style="dark" />
        </AppGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
