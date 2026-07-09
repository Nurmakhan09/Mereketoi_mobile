// Universal link: https://mereketoi.kz/listings → the app's Search tab.
import { Redirect } from 'expo-router';

export default function ListingsCatalogLink() {
  return <Redirect href="/search" />;
}
