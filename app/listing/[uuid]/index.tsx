import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Share, Alert, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { AvailabilityBadge } from '@/components/ui/Badge';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { ReportSheet } from '@/components/ReportSheet';
import { BookingSheet } from '@/features/booking/BookingSheet';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchListing, fetchPhone, reportListing } from '@/services/api/listings';
import { imageUrl } from '@/utils/imageUrl';
import { formatPrice, formatPhone } from '@/utils/format';
import { ListingDetail, ReportReason } from '@/types';

export default function ListingDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { isAuthed, requireAuth } = useRequireAuth();
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const favorited = favoriteIds.has(uuid);

  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchListing(uuid);
      setData(d);
      navigation.setOptions({ title: d.title });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uuid, navigation]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reveal the phone (then show Call + WhatsApp buttons).
  const onShowPhone = async () => {
    setPhoneLoading(true);
    try {
      const p = await fetchPhone(uuid);
      setPhone(p);
    } catch {
      Alert.alert(t.error, t.phoneUnavailable);
    } finally {
      setPhoneLoading(false);
    }
  };

  const onCall = () => {
    if (phone) Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
  };

  // WhatsApp: normalise to digits, 8→7 (KZ), open wa.me.
  const onWhatsApp = () => {
    if (!phone) return;
    let wa = phone.replace(/\D/g, '');
    if (wa.startsWith('8')) wa = '7' + wa.slice(1);
    Linking.openURL(`https://wa.me/${wa}`).catch(() => {});
  };

  const onFavorite = () =>
    requireAuth(() => {
      void toggleFav(uuid).catch(() => {});
    });

  const onShare = () => {
    if (data?.url) Share.share({ message: data.url, url: data.url }).catch(() => {});
  };

  // The Report button is opened via requireAuth, so the user is already authed here.
  const onReport = async (reason: ReportReason, comment: string) => {
    await reportListing(uuid, reason, comment);
    setReportOpen(false);
    Alert.alert(t.appName, t.reportSent);
  };

  if (loading) return <Loading />;
  if (error || !data) {
    return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;
  }

  const images = data.images?.length ? data.images : data.main_image ? [{ path: data.main_image, is_main: true }] : [];
  const price = formatPrice(data.price_amount, data.price_type, {
    negotiable: t.priceNegotiable,
    notSpecified: t.priceNotSpecified,
    tenge: t.tenge,
  });

  return (
    <View style={styles.fill}>
      <Screen scroll>
        {/* Gallery */}
        <View style={[styles.gallery, { height: width * 0.7 }]}>
          {images.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {images.map((img, i) => (
                <Image key={i} source={{ uri: imageUrl(img.path) ?? '' }} style={{ width, height: width * 0.7 }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.galleryPlaceholder, { height: width * 0.7 }]}>
              <Ionicons name="image-outline" size={48} color={Colors.textFaint} />
            </View>
          )}
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImg && styles.dotActive]} />
              ))}
            </View>
          ) : null}
          <View style={styles.badgeOverlay}>
            <AvailabilityBadge status={data.today_status} t={t} />
          </View>
        </View>

        <View style={styles.body}>
          <Text variant="h1" color={Colors.text}>
            {data.title}
          </Text>
          <Text style={styles.price} variant="h2" color={Colors.primary}>
            {price}
          </Text>

          {/* Category + city chips */}
          <View style={styles.chips}>
            {data.category ? <Pill label={localized(data.category, 'name', locale)} /> : null}
            {data.city ? <Pill label={localized(data.city, 'name', locale)} /> : null}
          </View>

          {data.full_description ? (
            <View style={styles.descBlock}>
              <Text variant="h3" color={Colors.text} style={styles.descTitle}>
                {t.description}
              </Text>
              <Text variant="body" color={Colors.textBody}>
                {data.full_description}
              </Text>
            </View>
          ) : null}

          {/* Calendar link */}
          <Pressable style={styles.calLink} onPress={() => router.push(`/listing/${uuid}/calendar`)}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text variant="body" color={Colors.primary} style={styles.calLinkText}>
              {t.viewCalendar}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>

          {/* Тойға қосу — calendar-driven booking request */}
          <Button
            title={t.bookingAdd}
            icon="add-circle-outline"
            onPress={() => requireAuth(() => setBookOpen(true))}
            style={styles.bookBtn}
          />

          {/* Secondary actions */}
          <View style={styles.secondaryRow}>
            <Button
              title={isAuthed && favorited ? t.removeFavorite : t.addFavorite}
              variant="outline"
              icon={isAuthed && favorited ? 'heart' : 'heart-outline'}
              onPress={onFavorite}
              style={styles.flex1}
            />
          </View>
          <View style={styles.secondaryRow}>
            <Button title={t.share} variant="ghost" icon="share-social-outline" onPress={onShare} style={styles.flex1} />
            <Button title={t.report} variant="ghost" icon="flag-outline" onPress={() => requireAuth(() => setReportOpen(true))} style={styles.flex1} />
          </View>
        </View>
      </Screen>

      {/* Sticky contact CTA */}
      <View style={styles.cta}>
        {phone ? (
          <View style={styles.ctaRow}>
            <Button title={`${t.callPhone} ${formatPhone(phone)}`} icon="call" onPress={onCall} style={styles.flex1} />
            <Button title="WhatsApp" icon="logo-whatsapp" onPress={onWhatsApp} style={styles.waBtn} />
          </View>
        ) : (
          <Button title={t.showPhone} icon="eye-outline" loading={phoneLoading} onPress={onShowPhone} />
        )}
      </View>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} onSubmit={onReport} />
      <BookingSheet
        visible={bookOpen}
        onClose={() => setBookOpen(false)}
        listingUuid={uuid}
        halls={data.halls ?? []}
        defaultSlug={data.category?.slug}
        onBooked={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  gallery: { width: '100%', backgroundColor: Colors.surfaceMuted },
  galleryPlaceholder: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: Spacing.md, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  badgeOverlay: { position: 'absolute', top: Spacing.md, left: Spacing.md },
  body: { padding: Spacing.base },
  price: { marginTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.md, gap: Spacing.sm },
  descBlock: { marginTop: Spacing.lg },
  descTitle: { marginBottom: Spacing.sm },
  calLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  calLinkText: { flex: 1, marginLeft: Spacing.sm },
  bookBtn: { marginTop: Spacing.lg },
  secondaryRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  flex1: { flex: 1 },
  cta: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  waBtn: { flex: 0, paddingHorizontal: Spacing.lg, backgroundColor: '#25D366', borderColor: '#25D366' },
});
