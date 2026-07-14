/**
 * Category slug → Ionicons name.
 *
 * The home screen used to render the SAME generic grid icon for every category, which
 * reads as placeholder art (App Review flagged it under guideline 2.1(a)). Each category
 * now gets a meaningful icon. The server's `icon` column holds web icon names (landmark,
 * mic, gift, handshake) that don't map to Ionicons, so we key off the stable slug instead.
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const BY_SLUG: Record<string, IoniconName> = {
  // ── Орындар (venues) ──
  oryndar: 'business-outline',
  toikhana: 'business-outline',
  'banket-zaly': 'business-outline',
  meiramkhana: 'restaurant-outline',
  cafe: 'cafe-outline',
  karaoke: 'mic-circle-outline',
  'ashyk-alan': 'sunny-outline',
  'konferents-zal': 'easel-outline',
  'demalys-oryny': 'bed-outline',

  // ── Өнерпаздар (performers) ──
  onerpazdar: 'mic-outline',
  anshy: 'musical-notes-outline',
  asaba: 'mic-outline',
  dj: 'disc-outline',
  ansambl: 'musical-notes-outline',
  orkestr: 'musical-notes-outline',
  muzykanttar: 'musical-note-outline',
  bishiler: 'body-outline',
  dombyrashy: 'musical-note-outline',
  'shou-bagdarlama': 'sparkles-outline',
  'zhandy-dauys': 'mic-circle-outline',

  // ── Атрибуттар (decor / media / rentals) ──
  atributtar: 'gift-outline',
  kortezh: 'car-outline',
  fotograf: 'camera-outline',
  videograf: 'videocam-outline',
  'foto-video-studiya': 'aperture-outline',
  bezendiru: 'color-palette-outline',
  dekor: 'color-palette-outline',
  gulder: 'flower-outline',
  sharlar: 'balloon-outline',
  prokat: 'cube-outline',
  'toy-koilek': 'shirt-outline',
  kostyum: 'shirt-outline',
  'sahna-zharyk-dybys': 'flash-outline',
  'led-ekran': 'tv-outline',
  'arnaiy-effekt': 'sparkles-outline',

  // ── Ұйымдастырушылар (organizers) ──
  uiymdastyrushylar: 'people-outline',
  'toy-uiymdastyrushy': 'people-outline',
  'event-agenttik': 'briefcase-outline',
  'wedding-planner': 'clipboard-outline',
  koordinator: 'clipboard-outline',
  'toy-ortalygy': 'business-outline',
  'sauda-ortalygy': 'storefront-outline',
  keytering: 'restaurant-outline',
  dayashylar: 'people-circle-outline',
  'kyz-uzatu': 'heart-outline',
  betashar: 'heart-outline',
  'balalar-merekesi': 'happy-outline',
  korporativ: 'briefcase-outline',
};

export function categoryIcon(slug: string): IoniconName {
  return BY_SLUG[slug] ?? 'pricetag-outline';
}
