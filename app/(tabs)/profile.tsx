import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { Locale } from '@/stores/localeStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

export default function ProfileScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const clearFav = useFavoritesStore((s) => s.clear);
  const isAuthed = status === 'authed';

  const onLogout = () => {
    Alert.alert('', t.confirmLogout, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearFav();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.fill} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Logo size="sm" style={styles.brandLogo} />
      {/* Header */}
      {isAuthed && user ? (
        <View style={styles.userHead}>
          <View style={styles.avatar}>
            <Text variant="h1" color={Colors.white}>
              {user.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text variant="h2" color={Colors.text} style={styles.userName}>
            {user.name}
          </Text>
        </View>
      ) : (
        <View style={styles.guestHead}>
          <Text variant="h2" color={Colors.text} center>
            {t.guestProfileTitle}
          </Text>
          <Text variant="small" color={Colors.textMuted} center style={styles.guestHint}>
            {t.guestProfileHint}
          </Text>
          <Button
            title={t.loginRegister}
            icon="log-in-outline"
            onPress={() => router.push({ pathname: '/auth', params: { returnTo: '/profile' } })}
            style={styles.loginBtn}
          />
        </View>
      )}

      {/* Account menu (authed) */}
      {isAuthed ? (
        <Card style={styles.menu} padded={false}>
          <MenuItem icon="list-outline" label={t.menuMyListings} onPress={() => router.push('/my-listings')} />
          <MenuItem icon="sparkles-outline" label={t.menuToi} onPress={() => router.push('/toi')} />
          <MenuItem icon="calendar-outline" label={t.calendarTitle} onPress={() => router.push('/calendars')} />
          <MenuItem icon="notifications-outline" label={t.notificationsTitle} onPress={() => router.push('/notifications')} />
          <MenuItem icon="settings-outline" label={t.menuSettings} onPress={() => router.push('/settings')} last />
        </Card>
      ) : null}

      {/* Language */}
      <LangSwitch />

      {/* CMS links */}
      <Card style={styles.menu} padded={false}>
        <MenuItem icon="information-circle-outline" label={t.menuAbout} onPress={() => router.push('/page/about')} />
        <MenuItem icon="help-circle-outline" label={t.menuHelp} onPress={() => router.push('/page/help')} />
        <MenuItem icon="document-text-outline" label={t.menuTerms} onPress={() => router.push('/page/terms')} />
        <MenuItem icon="shield-checkmark-outline" label={t.menuPrivacy} onPress={() => router.push('/page/privacy')} last />
      </Card>

      {/* Logout */}
      {isAuthed ? (
        <View style={styles.logoutWrap}>
          <Button title={t.logout} variant="danger" icon="log-out-outline" onPress={onLogout} />
          {user?.public_code ? (
            <Text variant="xsmall" color={Colors.textFaint} center style={styles.code}>
              ID: {user.public_code}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.item, !last && styles.itemDivider]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text variant="body" color={Colors.textBody} style={styles.itemLabel}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
    </Pressable>
  );
}

function LangSwitch() {
  const { t, locale, setLocale } = useI18n();
  const options: { value: Locale; label: string }[] = [
    { value: 'kk', label: 'ҚАЗ' },
    { value: 'ru', label: 'РУС' },
  ];
  return (
    <View style={styles.langWrap}>
      <Text variant="small" color={Colors.textMuted} style={styles.langLabel}>
        {t.language}
      </Text>
      <View style={styles.langSwitch}>
        {options.map((o) => {
          const active = locale === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setLocale(o.value)}
              style={[styles.langSeg, active && styles.langSegActive]}
            >
              <Text variant="small" color={active ? Colors.white : Colors.secondary}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  brandLogo: { alignSelf: 'center', marginBottom: Spacing.lg },
  userHead: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  userName: {},
  guestHead: { alignItems: 'center', marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  guestHint: { marginTop: Spacing.sm, maxWidth: 300 },
  loginBtn: { marginTop: Spacing.lg, alignSelf: 'stretch' },
  menu: { marginBottom: Spacing.base },
  item: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  itemLabel: { flex: 1, marginLeft: Spacing.md },
  langWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  langLabel: {},
  langSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  langSeg: { paddingVertical: 6, paddingHorizontal: Spacing.base },
  langSegActive: { backgroundColor: Colors.primary },
  logoutWrap: { marginTop: Spacing.base },
  code: { marginTop: Spacing.md },
});
