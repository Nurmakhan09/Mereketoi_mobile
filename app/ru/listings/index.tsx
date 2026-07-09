// Universal link (Russian site prefix): https://mereketoi.kz/ru/listings → Search tab.
import { Redirect } from 'expo-router';

export default function ListingsCatalogLinkRu() {
  return <Redirect href="/search" />;
}
