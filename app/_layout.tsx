import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import 'react-native-reanimated';

import { AppGate } from '@/components/AppGate';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
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
            {/* All content pages now live INSIDE (tabs) — per-tab stacks + the shared
                route group — so the bottom bar shows on every page. Only true modals
                (auth, nickname) and the reset flow stay outside the tab navigator. */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" options={{ presentation: 'modal', animation: 'fade' }} />
            <Stack.Screen name="forgot-password" options={{ animation: 'fade' }} />
            <Stack.Screen name="set-nickname" options={{ presentation: 'modal', animation: 'fade' }} />
          </Stack>
          <StatusBar style="dark" />
        </AppGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
