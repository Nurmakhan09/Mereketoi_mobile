import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/Text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  getTabBarMode,
  GLASS_BOTTOM_GAP,
  GLASS_SIDE_MARGIN,
  TAB_BAR_HEIGHT,
} from '@/hooks/useTabBarPadding';

/**
 * New-user onboarding tour — a pure-JS overlay that walks a first-time user
 * through the bottom-nav tabs (owner request 2026-07-21: «стрелкамен және
 * жазумен әр бетті көрсету, келесі батырма»). Highlights one tab at a time with
 * a dimmed "spotlight" cutout + a bouncing arrow + a caption card.
 *
 * NO native module is used (no react-native-svg): the spotlight is four dark
 * rectangles that leave the highlighted tab bright, so the whole feature ships
 * over-the-air via EAS Update — no App Store / Google Play release needed.
 *
 * The tab geometry is COMPUTED from the same constants the real bar uses
 * (TAB_BAR_HEIGHT / GLASS_* + insets), mirroring GlassTabBarBackground — no refs
 * into the navigator. Exact on Android (solid) and older-iOS (blur); on iOS 26
 * glass it assumes the intended inset pill.
 */

const N_TABS = 5;
const SCRIM = 'rgba(8, 12, 28, 0.80)';

type Step = { tab?: number; title: string; body: string };

/** Top-left origin of the bar's icon row (excludes the bottom safe-area inset). */
function barTopY(H: number, insetBottom: number, mode: ReturnType<typeof getTabBarMode>): number {
  return mode === 'glass'
    ? H - (insetBottom + GLASS_BOTTOM_GAP) - TAB_BAR_HEIGHT
    : H - (TAB_BAR_HEIGHT + insetBottom);
}

/** Spotlight rect (padded) for tab `index`. */
function tabHole(index: number, W: number, H: number, insetBottom: number, mode: ReturnType<typeof getTabBarMode>) {
  const barX = mode === 'glass' ? GLASS_SIDE_MARGIN : 0;
  const barW = mode === 'glass' ? W - 2 * GLASS_SIDE_MARGIN : W;
  const slotW = barW / N_TABS;
  const top = barTopY(H, insetBottom, mode);
  return {
    x: barX + slotW * index + 4,
    y: top + 2,
    w: slotW - 8,
    h: TAB_BAR_HEIGHT - 4,
  };
}

export function OnboardingTour() {
  const visible = useOnboardingStore((s) => s.visible);
  const maybeStart = useOnboardingStore((s) => s.maybeStart);
  const finish = useOnboardingStore((s) => s.finish);

  const { t } = useI18n();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mode = getTabBarMode();

  const steps: Step[] = useMemo(
    () => [
      { title: t.onboardWelcomeTitle, body: t.onboardWelcomeBody },
      { tab: 0, title: t.onboardHomeTitle, body: t.onboardHomeBody },
      { tab: 1, title: t.onboardSearchTitle, body: t.onboardSearchBody },
      { tab: 2, title: t.onboardCreateTitle, body: t.onboardCreateBody },
      { tab: 3, title: t.onboardCalendarTitle, body: t.onboardCalendarBody },
      { tab: 4, title: t.onboardProfileTitle, body: t.onboardProfileBody },
      { title: t.onboardDoneTitle, body: t.onboardDoneBody },
    ],
    [t],
  );

  const [i, setI] = useState(0);
  const step = steps[i];
  const centered = step.tab === undefined;
  const isLast = i === steps.length - 1;

  const hole = centered
    ? { x: W / 2, y: H * 0.42, w: 0, h: 0 }
    : tabHole(step.tab as number, W, H, insets.bottom, mode);

  // Animated cutout rect.
  const hx = useSharedValue(hole.x);
  const hy = useSharedValue(hole.y);
  const hw = useSharedValue(hole.w);
  const hh = useSharedValue(hole.h);
  const bounce = useSharedValue(0);
  const firstFrame = useRef(true);

  // Boot: show the tour once if this install hasn't seen it.
  useEffect(() => {
    void maybeStart();
  }, [maybeStart]);

  // Restart at step 0 whenever it (re)opens; snap the spotlight, don't slide in.
  useEffect(() => {
    if (visible) {
      setI(0);
      firstFrame.current = true;
    }
  }, [visible]);

  // Drive the spotlight to the current step (snap on first frame, ease after).
  useEffect(() => {
    const cfg = { duration: 300, easing: Easing.out(Easing.cubic) };
    if (firstFrame.current) {
      firstFrame.current = false;
      hx.value = hole.x;
      hy.value = hole.y;
      hw.value = hole.w;
      hh.value = hole.h;
    } else {
      hx.value = withTiming(hole.x, cfg);
      hy.value = withTiming(hole.y, cfg);
      hw.value = withTiming(hole.w, cfg);
      hh.value = withTiming(hole.h, cfg);
    }
  }, [i, hole.x, hole.y, hole.w, hole.h, hx, hy, hw, hh]);

  // Looping arrow bob.
  useEffect(() => {
    bounce.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [bounce]);

  // Four dark rects tile the whole screen minus the {hx,hy,hw,hh} hole.
  const topStyle = useAnimatedStyle(() => ({ height: Math.max(0, hy.value) }));
  const bottomStyle = useAnimatedStyle(() => ({ top: hy.value + hh.value }));
  const leftStyle = useAnimatedStyle(() => ({ top: hy.value, height: hh.value, width: Math.max(0, hx.value) }));
  const rightStyle = useAnimatedStyle(() => ({ top: hy.value, height: hh.value, left: hx.value + hw.value }));
  const ringStyle = useAnimatedStyle(() => ({
    left: hx.value,
    top: hy.value,
    width: hw.value,
    height: hh.value,
    opacity: hw.value > 0 ? 1 : 0,
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    left: hx.value + hw.value / 2 - 16,
    top: hy.value - 44,
    opacity: hw.value > 0 ? 1 : 0,
    transform: [{ translateY: bounce.value * 6 }],
  }));

  if (!visible) return null;

  const next = () => {
    void Haptics.selectionAsync().catch(() => {});
    if (isLast) void finish();
    else setI((v) => v + 1);
  };
  const back = () => setI((v) => Math.max(0, v - 1));
  const skip = () => {
    void Haptics.selectionAsync().catch(() => {});
    void finish();
  };
  const onRequestClose = () => {
    if (i > 0) back();
    else void finish();
  };

  // Caption card: floats just above the bar for tab steps, centered otherwise.
  const cardPos = centered
    ? { top: H * 0.32, left: Spacing.base, right: Spacing.base }
    : { bottom: H - barTopY(H, insets.bottom, mode) + 26, left: Spacing.base, right: Spacing.base };

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.root}>
        {/* Spotlight scrim (leaves the highlighted tab bright). */}
        <Animated.View style={[styles.scrim, styles.scrimTop, topStyle]} />
        <Animated.View style={[styles.scrim, styles.scrimBottom, bottomStyle]} />
        <Animated.View style={[styles.scrim, styles.scrimLeft, leftStyle]} />
        <Animated.View style={[styles.scrim, styles.scrimRight, rightStyle]} />

        {/* Highlight ring + bobbing arrow. */}
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
        <Animated.View pointerEvents="none" style={[styles.arrow, arrowStyle]}>
          <Ionicons name="arrow-down" size={30} color={Colors.white} />
        </Animated.View>

        {/* Caption card. */}
        <Animated.View key={i} entering={FadeIn.duration(220)} style={[styles.card, cardPos]}>
          <View style={styles.dots}>
            {steps.map((_, idx) => (
              <View key={idx} style={[styles.dot, idx === i && styles.dotActive]} />
            ))}
          </View>

          <Text variant="h2" color={Colors.text} style={styles.title}>
            {step.title}
          </Text>
          <Text variant="body" color={Colors.textMuted} style={styles.body}>
            {step.body}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={skip} hitSlop={8} style={styles.skip}>
              <Text variant="button" color={Colors.textMuted}>
                {t.onboardSkip}
              </Text>
            </Pressable>

            <View style={styles.rightActions}>
              {i > 0 ? (
                <Pressable onPress={back} hitSlop={8} style={styles.backBtn}>
                  <Text variant="button" color={Colors.primary}>
                    {t.back}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={next} style={styles.nextBtn}>
                <Text variant="button" color={Colors.white}>
                  {isLast ? t.onboardStart : t.next}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { position: 'absolute', backgroundColor: SCRIM },
  scrimTop: { left: 0, right: 0, top: 0 },
  scrimBottom: { left: 0, right: 0, bottom: 0 },
  scrimLeft: { left: 0 },
  scrimRight: { right: 0 },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: Colors.white,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  arrow: { position: 'absolute', width: 32, alignItems: 'center' },
  card: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
  title: { marginBottom: Spacing.xs },
  body: { marginBottom: Spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  skip: { paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  backBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
  },
});
