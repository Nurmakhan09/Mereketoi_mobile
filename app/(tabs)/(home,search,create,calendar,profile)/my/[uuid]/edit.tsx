import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { Checkbox } from '@/components/ui/Checkbox';
import { GuideLink } from '@/components/GuideLink';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useTaxonomy } from '@/features/listings/useTaxonomy';
import { useImagePicker } from '@/features/listings/useImagePicker';
import {
  fetchMyListing,
  updateListing,
  uploadListingImage,
  deleteListingImage,
  reorderListingImages,
  fetchRegions,
  fetchCities,
  fetchDistricts,
} from '@/services/api/listings';
import {
  OwnerListingDetail,
  ListingFormData,
  PriceType,
  Region,
  City,
  District,
} from '@/types';
import { ApiError } from '@/types/api';
import { imageUrl } from '@/utils/imageUrl';
import { formatPhoneInput } from '@/utils/format';

// Description length limits — mirror the backend ListingRules.
const SHORT_MIN = 20;
const SHORT_MAX = 180;
const FULL_MIN = 40;
const FULL_MAX = 2000;
const TITLE_MAX = 80;

export default function EditListingScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { categories } = useTaxonomy();
  const { pick, picking } = useImagePicker(t.fieldPhotoHint);

  const [data, setData] = useState<OwnerListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // form fields
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [parentCat, setParentCat] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [priceAmount, setPriceAmount] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instagram, setInstagram] = useState('');

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionCities, setRegionCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Is the chosen region a big city (is_city=1)? Then skip the City step and load
  // districts by region; an oblast (is_city=0) shows a City step, then districts by city.
  const selectedRegion = regions.find((r) => r.id === regionId);
  const isBigCity = !!selectedRegion?.is_city;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchMyListing(uuid);
      setData(d);
      setTitle(d.title ?? '');
      setShortDesc(d.short_description ?? '');
      setFullDesc(d.full_description ?? '');
      setCategoryId(d.category_id);
      setRegionId(d.region_id);
      setCityId(d.city_id);
      setDistrictId(d.district_id);
      setPriceType(d.price_type === 'not_specified' ? 'fixed' : d.price_type ?? 'fixed');
      setPriceAmount(d.price_amount != null ? String(d.price_amount) : '');
      setContactPhone(d.contact_phone ? formatPhoneInput(d.contact_phone) : '');
      setInstagram(d.instagram ?? d.details?.instagram ?? '');
      navigation.setOptions({ title: d.status === 'draft' ? t.createTitle : t.editTitle });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uuid, navigation, t.createTitle, t.editTitle]);

  useEffect(() => {
    void load();
  }, [load]);

  // resolve parent category from the chosen subcategory once categories load
  useEffect(() => {
    if (categoryId && categories.length) {
      const parent = categories.find((c) => c.children?.some((ch) => ch.id === categoryId));
      if (parent) setParentCat(parent.id);
    }
  }, [categoryId, categories]);

  // load regions once
  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  // load cities for the chosen oblast (big cities have no city step)
  useEffect(() => {
    if (regionId && !isBigCity) {
      fetchCities(regionId).then(setRegionCities).catch(() => setRegionCities([]));
    } else {
      setRegionCities([]);
    }
  }, [regionId, isBigCity]);

  // load districts: by city for oblasts, by region for big cities
  useEffect(() => {
    if (isBigCity && regionId) {
      fetchDistricts({ region_id: regionId }).then(setDistricts).catch(() => setDistricts([]));
    } else if (cityId) {
      fetchDistricts({ city_id: cityId }).then(setDistricts).catch(() => setDistricts([]));
    } else {
      setDistricts([]);
    }
  }, [regionId, cityId, isBigCity]);

  const collect = (): ListingFormData => ({
    title: title.trim(),
    short_description: shortDesc.trim(),
    full_description: fullDesc.trim(),
    category_id: categoryId,
    region_id: regionId,
    // For a big city the region IS the city geo; send the matching city_id only for oblasts.
    city_id: isBigCity ? null : cityId,
    district_id: districtId,
    price_type: priceType,
    price_amount: priceAmount ? parseInt(priceAmount, 10) : null,
    contact_phone: contactPhone.replace(/\D/g, '') ? contactPhone.trim() : '',
    instagram: instagram.trim(),
  });

  const handleApiError = (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      Alert.alert(t.error, e.message);
    } else {
      Alert.alert(t.error, t.errorNetwork);
    }
  };

  // Refresh ONLY the images after an image op — a full load() would re-pull the
  // listing and overwrite the user's in-progress (unsaved) form fields.
  const refreshImages = async () => {
    try {
      const d = await fetchMyListing(uuid);
      setData((prev) => (prev ? { ...prev, images: d.images } : d));
    } catch (e) {
      handleApiError(e);
    }
  };

  // All required fields filled to the backend's rules? Publish + Preview stay
  // disabled until this is true, so nothing incomplete is ever sent/saved.
  const isComplete = (): boolean => {
    if (title.trim().length < 5) return false;
    if (!categoryId) return false;
    if (!regionId) return false;
    if (!isBigCity && !cityId) return false;
    if (shortDesc.trim().length < SHORT_MIN || shortDesc.trim().length > SHORT_MAX) return false;
    if (fullDesc.trim().length < FULL_MIN || fullDesc.trim().length > FULL_MAX) return false;
    if (contactPhone.replace(/\D/g, '').length < 10) return false;
    if (instagram.trim().length < 2) return false; // required for ALL categories (owner 2026-07-17)
    if (!priceAmount) return false;
    if (!data || data.images.length < 1) return false;
    return true;
  };
  const complete = isComplete();

  const onPreview = async () => {
    // Save the (complete) form, then open the public detail as a live preview.
    setSaving(true);
    setErrors({});
    try {
      await updateListing(uuid, collect());
      router.push(`/listing/${uuid}?preview=1`);
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  };

  // Publish now goes through payment: save the (complete) form, then send the user
  // to the package/payment page (/my/[uuid]/publish). The listing goes active only
  // after a successful payment (server activates it on Halyk's callback).
  const onPublish = async () => {
    setPublishing(true);
    setErrors({});
    try {
      await updateListing(uuid, collect());
      router.push(`/my/${uuid}/publish`);
    } catch (e) {
      handleApiError(e);
    } finally {
      setPublishing(false);
    }
  };

  // Already-published listing → "Save changes" (no re-publish), then back to the ad.
  const onSaveChanges = async () => {
    setPublishing(true);
    setErrors({});
    try {
      await updateListing(uuid, collect());
      Alert.alert(t.appName, t.listingSaved);
      router.replace('/my-listings');
    } catch (e) {
      handleApiError(e);
    } finally {
      setPublishing(false);
    }
  };

  const onAddImage = async () => {
    const asset = await pick();
    if (!asset) return;
    try {
      await uploadListingImage(uuid, asset);
      await refreshImages();
    } catch (e) {
      handleApiError(e);
    }
  };

  const onDeleteImage = (id: number) => {
    Alert.alert('', t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteListingImage(uuid, id);
            await refreshImages();
          } catch (e) {
            handleApiError(e);
          }
        },
      },
    ]);
  };

  // Make an image the cover: move it first, then send the new order.
  const onMakeCover = async (id: number) => {
    if (!data) return;
    const order = [id, ...data.images.filter((i) => i.id !== id).map((i) => i.id)];
    try {
      await reorderListingImages(uuid, order);
      await refreshImages();
    } catch (e) {
      handleApiError(e);
    }
  };

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const isDraft = data.status === 'draft';
  const parentOptions: SelectOption[] = categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }));
  const subOptions: SelectOption[] =
    categories
      .find((c) => c.id === parentCat)
      ?.children?.map((ch) => ({ value: ch.id, label: localized(ch, 'name', locale) })) ?? [];
  const regionOptions: SelectOption[] = regions.map((r) => ({ value: r.id, label: localized(r, 'name', locale) }));
  const cityOptions: SelectOption[] = regionCities.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }));
  const districtOptions: SelectOption[] = districts.map((d) => ({ value: d.id, label: localized(d, 'name', locale) }));

  return (
    <Screen scroll padded>
      <View style={styles.topGuide}>
        <GuideLink anchor="listing" label={t.guideListing} />
      </View>

      {/* Basic */}
      <SectionTitle text={t.sectionBasic} />
      <FormField
        label={t.fieldTitleForm}
        hint={t.fieldTitleHint}
        required
        value={title}
        onChangeText={setTitle}
        maxLength={TITLE_MAX}
        counter
        error={errors.title}
      />
      <SelectField
        label={t.fieldCategory}
        hint={t.fieldCategoryHint}
        required
        placeholder={t.selectCategory}
        value={parentCat}
        options={parentOptions}
        onChange={(v) => {
          setParentCat(Number(v));
          setCategoryId(null);
        }}
      />
      {parentCat ? (
        <SelectField
          label={t.fieldSubcategory}
          required
          placeholder={t.selectCategory}
          value={categoryId}
          options={subOptions}
          onChange={(v) => setCategoryId(Number(v))}
          error={errors.category_id}
        />
      ) : null}
      <GuideLink anchor="categories" label={t.guideCategories} />

      {/* Location — Өңір (required) → [oblast] Қала → Аудан */}
      <SectionTitle text={t.sectionLocation} />
      <SelectField
        label={t.fieldRegion}
        hint={t.fieldRegionHint}
        required
        placeholder={t.selectRegion}
        value={regionId}
        options={regionOptions}
        onChange={(v) => {
          setRegionId(Number(v));
          setCityId(null);
          setDistrictId(null);
        }}
        error={errors.region_id}
      />
      {regionId && !isBigCity ? (
        <SelectField
          label={t.fieldCity}
          hint={t.fieldCityHint}
          required
          placeholder={t.selectCity}
          value={cityId}
          options={cityOptions}
          onChange={(v) => {
            setCityId(Number(v));
            setDistrictId(null);
          }}
          error={errors.city_id}
        />
      ) : null}
      {districtOptions.length ? (
        <SelectField
          label={t.fieldDistrict}
          placeholder={t.fieldDistrict}
          value={districtId}
          options={districtOptions}
          onChange={(v) => setDistrictId(Number(v))}
        />
      ) : null}

      {/* Images — first image is the cover; tap a thumb to make it the cover */}
      <SectionTitle text={t.sectionImages} />
      <Text variant="xsmall" color={Colors.textMuted} style={styles.hint}>
        {t.fieldPhotoHint} {t.coverHint}
      </Text>
      <View style={styles.imageGrid}>
        {data.images.map((img, idx) => (
          <Pressable key={img.id} style={styles.thumb} onPress={() => !img.is_main && onMakeCover(img.id)}>
            <Image source={{ uri: imageThumb(img.path) }} style={styles.thumbImg} contentFit="cover" />
            {img.is_main || idx === 0 ? (
              <View style={styles.coverBadge}>
                <Text variant="xsmall" color={Colors.white}>
                  {t.coverLabel}
                </Text>
              </View>
            ) : null}
            <Pressable style={styles.thumbDel} onPress={() => onDeleteImage(img.id)}>
              <Ionicons name="close" size={14} color={Colors.white} />
            </Pressable>
          </Pressable>
        ))}
        {data.images.length < 10 ? (
          <Pressable style={styles.addThumb} onPress={onAddImage} disabled={picking}>
            <Ionicons name={picking ? 'hourglass-outline' : 'add'} size={26} color={Colors.primary} />
            <Text variant="xsmall" color={Colors.primary}>
              {t.addPhoto}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Description */}
      <SectionTitle text={t.sectionDescription} />
      <FormField
        label={t.fieldShortDesc}
        hint={`${t.fieldShortDescHint} (${SHORT_MIN}–${SHORT_MAX})`}
        required
        value={shortDesc}
        onChangeText={setShortDesc}
        maxLength={SHORT_MAX}
        counter
        multiline
        error={errors.short_description}
      />
      <FormField
        label={t.fieldDescription}
        hint={`${t.fieldDescriptionHint} (${FULL_MIN}–${FULL_MAX})`}
        required
        value={fullDesc}
        onChangeText={setFullDesc}
        maxLength={FULL_MAX}
        counter
        multiline
        style={styles.textarea}
        error={errors.full_description}
      />

      {/* Price — always shown/required; "Келісімді" is a supplementary flag, not a hide switch */}
      <SectionTitle text={t.sectionPrice} />
      <FormField
        label={t.fieldPrice}
        hint={t.fieldPriceHint}
        required
        value={priceAmount}
        onChangeText={(v) => setPriceAmount(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        error={errors.price_amount}
      />
      <Checkbox
        label={t.priceNegotiable}
        checked={priceType === 'negotiable'}
        onToggle={(next) => setPriceType(next ? 'negotiable' : 'fixed')}
      />

      {/* Contact — phone only, auto +7 */}
      <SectionTitle text={t.sectionContact} />
      <FormField
        label={t.fieldPhone}
        hint={t.fieldPhoneHint}
        required
        value={contactPhone}
        onChangeText={(v) => setContactPhone(formatPhoneInput(v))}
        keyboardType="phone-pad"
        error={errors.contact_phone}
      />
      <FormField
        label={t.fieldInstagram}
        hint={t.fieldInstagramHint}
        required
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
        maxLength={120}
        error={errors.instagram}
      />

      {/* Actions — Preview + Publish, both enabled only when fully filled */}
      <View style={styles.actions}>
        <Button
          title={t.previewBtn}
          variant="outline"
          icon="eye-outline"
          loading={saving}
          disabled={publishing || !complete}
          onPress={onPreview}
        />
        <View style={styles.gap} />
        {isDraft ? (
          <Button
            title={t.publish}
            variant="success"
            icon="checkmark-circle-outline"
            loading={publishing}
            disabled={saving || !complete}
            onPress={onPublish}
          />
        ) : (
          <Button
            title={t.saveChanges}
            icon="save-outline"
            loading={publishing}
            disabled={saving || !complete}
            onPress={onSaveChanges}
          />
        )}
        <Text variant="xsmall" color={Colors.textMuted} center style={styles.publishHint}>
          {complete ? (isDraft ? t.publishHint : t.saveChangesHint) : t.fillAllHint}
        </Text>
      </View>
    </Screen>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <Text variant="h3" color={Colors.text} style={styles.section}>
      {text}
    </Text>
  );
}

function imageThumb(path: string): string {
  return imageUrl(path) ?? '';
}

const styles = StyleSheet.create({
  topGuide: { alignItems: 'flex-end', marginBottom: Spacing.sm },
  section: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  hint: { marginBottom: Spacing.sm },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumb: { width: 88, height: 88, borderRadius: Radius.sm, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 2,
  },
  thumbDel: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 88,
    height: 88,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { marginTop: Spacing.xl },
  gap: { height: Spacing.md },
  publishHint: { marginTop: Spacing.sm },
});
