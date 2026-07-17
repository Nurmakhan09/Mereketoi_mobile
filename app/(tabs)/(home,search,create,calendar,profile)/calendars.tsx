import { Redirect } from 'expo-router';

/**
 * Legacy "Calendars hub" route — superseded by the single Calendar tab (one-listing
 * model). Any old link here lands on the notebook calendar.
 */
export default function CalendarsRedirect() {
  return <Redirect href="/calendar" />;
}
