import { View, Pressable, StyleSheet, Share } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { Text } from './ui/Text';
import { AvailabilityBadge } from './ui/Badge';
import { ListingCard as ListingCardType } from '@/types';
import { imageUrl } from '@/utils/imageUrl';
import { formatPrice } from '@/utils/format';
import { useI18n, localized } from '@/locales';

interface Props {
  item: ListingCardType;
  onPress: () => void;
  favorited?: boolean;
  onToggleFavorite?: () => void;
}

/** Public listing card. Image is cover-cropped; inner buttons don't open detail. */
export function ListingCard({ item, onPress, favorited, onToggleFavorite }: Props) {
  const { t, locale } = useI18n();
  const img = imageUrl(item.main_image);

  const price = formatPrice(item.price_amount, item.price_type, {
    negotiable: t.priceNegotiable,
    notSpecified: t.priceNotSpecified,
    tenge: t.tenge,
  });

  const districtName = item.district ? localized(item.district, 'name', locale) : '';

  const onShare = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (!item.url) return;
    Share.share({ message: item.url, url: item.url }).catch(() => {});
  };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {img ? (
          <Image
            source={{ uri: img }}
            style={styles.image}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={item.uuid}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={Colors.textFaint} />
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <AvailabilityBadge status={item.today_status} t={t} />
        </View>
        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            hitSlop={10}
            style={styles.heart}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? Colors.favorite : Colors.white}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        {/* Fixed 2-line title height so 2-up cards align regardless of title length. */}
        <Text variant="h3" color={Colors.text} numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text variant="xsmall" color={Colors.textMuted} numberOfLines={1} style={styles.meta}>
          {districtName || ' '}
        </Text>
        <Text variant="small" color={Colors.textMuted} numberOfLines={2} style={styles.desc}>
          {item.short_description || ' '}
        </Text>
        <View style={styles.foot}>
          <Text style={[Typography.h3, styles.price]} numberOfLines={1}>
            {price}
          </Text>
          <Pressable onPress={onShare} hitSlop={8} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, // fill the grid cell so 2-up cards are equal width/height
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    overflow: 'hidden',
    ...Shadow.md,
  },
  pressed: { opacity: 0.97, transform: [{ scale: 0.995 }] },
  imageWrap: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badgeOverlay: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  heart: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: Spacing.md, flex: 1 },
  title: { minHeight: 48 }, // 2 lines of h3 — keeps card bodies aligned
  meta: { marginTop: 2, minHeight: 16 },
  desc: { marginTop: Spacing.xs, minHeight: 38 }, // 2 lines reserved
  price: { color: Colors.primary },
  foot: {
    marginTop: 'auto', // push price/share to the bottom
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareBtn: { padding: Spacing.xs },
});
