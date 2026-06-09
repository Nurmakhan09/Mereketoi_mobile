import { Redirect } from 'expo-router';

/**
 * Legacy per-listing owner calendar — superseded by the single Calendar tab (one
 * listing per user). Redirects so old links keep working.
 */
export default function OwnerCalendarRedirect() {
  return <Redirect href="/calendar" />;
}
