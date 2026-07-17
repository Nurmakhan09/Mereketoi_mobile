import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';
import { useSegments } from 'expo-router';
import { Colors } from '@/constants/theme';

/** Tab order — must match the Tabs.Screen order in app/(tabs)/_layout.tsx. */
const GROUP_ORDER = ['(home)', '(search)', '(create)', '(calendar)', '(profile)'];

/**
 * Liquid Glass tab-bar background (iOS 26 mode only): the glass pill plus a
 * soft selection «blob» that SLIDES to the active tab with a spring — the same
 * switching style native iOS 26 tab bars have (owner request 2026-07-17:
 * «навбардың ауысу стилі де тек айфонның стилі болсын»). Older iOS keeps the
 * plain blur bar with tint-only selection, matching its native look.
 */
export function GlassTabBarBackground() {
  const segments = useSegments() as string[];
  const active = Math.max(0, GROUP_ORDER.indexOf(segments[1] ?? ''));

  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const positioned = useRef(false);

  const slot = width / GROUP_ORDER.length;

  useEffect(() => {
    if (width <= 0) return;
    if (!positioned.current) {
      positioned.current = true;
      x.value = active * slot; // first layout: place instantly, no slide-in
      return;
    }
    x.value = withSpring(active * slot, { damping: 20, stiffness: 250, mass: 0.7 });
  }, [active, slot, width, x]);

  const blobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />
      {width > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.slot, { width: slot }, blobStyle]}>
          <View style={styles.blob} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    width: '86%',
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    opacity: 0.55,
  },
});
