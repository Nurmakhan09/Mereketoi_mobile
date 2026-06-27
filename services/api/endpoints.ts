/**
 * API endpoint paths (relative to API_BASE_URL = {WEB}/api/v1).
 * Every path here is verified against the backend routes
 * (modules/Auth/Config/Routes.php, modules/Listings/Config/Routes.php,
 * modules/Notifications/Config/Routes.php, app/Config/Routes.php).
 * Nothing is invented. GET + POST only (deletes are POST .../delete).
 */

export const Endpoints = {
  // Driven client
  appConfig: '/app-config',

  // Auth (public)
  authLogin: '/auth/login',
  authRegister: '/auth/register',
  authOauth: (provider: string) => `/auth/oauth/${provider}`,
  // Auth (Bearer)
  authLogout: '/auth/logout',
  me: '/me',
  meProfile: '/me/profile',
  mePassword: '/me/password',
  meDelete: '/me/delete',

  // Public reads
  listings: '/listings',
  listingsSuggest: '/listings/suggest',
  listing: (uuid: string) => `/listings/${uuid}`,
  listingCalendar: (uuid: string) => `/listings/${uuid}/calendar`,
  categories: '/categories',
  cities: '/cities',
  regions: '/regions',
  districts: '/districts',
  pages: (slug: string) => `/pages/${slug}`,

  // Phone reveal (anonymous allowed)
  listingPhone: (uuid: string) => `/listings/${uuid}/phone`,

  // Favorite & report (Bearer)
  listingFavorite: (uuid: string) => `/listings/${uuid}/favorite`,
  listingReport: (uuid: string) => `/listings/${uuid}/report`,

  // Cabinet — my listings (Bearer)
  myListings: '/my/listings',
  myListing: (uuid: string) => `/my/listings/${uuid}`,
  myListingImages: (uuid: string) => `/my/listings/${uuid}/images`,
  myListingImageDelete: (uuid: string, id: number) => `/my/listings/${uuid}/images/${id}/delete`,
  myListingImagesReorder: (uuid: string) => `/my/listings/${uuid}/images/reorder`,
  myListingPublish: (uuid: string) => `/my/listings/${uuid}/publish`,
  myListingArchive: (uuid: string) => `/my/listings/${uuid}/archive`,
  myListingUnarchive: (uuid: string) => `/my/listings/${uuid}/unarchive`,
  myListingDelete: (uuid: string) => `/my/listings/${uuid}/delete`,
  myListingCalendar: (uuid: string) => `/my/listings/${uuid}/calendar`,
  myFavorites: '/my/favorites',

  // Notifications (Bearer)
  notifications: '/notifications',
  notificationsUnread: '/notifications/unread-count',
  notificationRead: (id: number) => `/notifications/${id}/read`,
  notificationsReadAll: '/notifications/read-all',
  notificationPreferences: '/notification-preferences',

  // Push device tokens (Bearer)
  pushRegister: '/push/register',
  pushUnregister: '/push/unregister',

  // Billing — packages public; payments Bearer (note the /app/* prefix on authed)
  billingPackages: '/billing/packages',
  billingMe: '/app/billing/me',
  paymentCreate: '/app/payments/halyk/create',
  paymentStatus: (invoiceId: string) => `/app/payments/${invoiceId}/status`,
  payments: '/app/payments',

  // Reminders (Bearer)
  reminders: '/reminders',
  reminder: (id: number) => `/reminders/${id}`,
  reminderToggle: (id: number) => `/reminders/${id}/toggle`,
  reminderDelete: (id: number) => `/reminders/${id}/delete`,

  // Той-жоспарлау (wedding plan) — Bearer
  weddingPlan: '/my/wedding-plan',
  bookingsHistory: '/my/bookings/history',

  // Booking handshake — Bearer (role inferred server-side from the booking parties)
  bookings: '/bookings',
  bookingCancel: (id: number) => `/my/bookings/${id}/cancel`,
  bookingAccept: (id: number) => `/my/bookings/${id}/accept`,
  bookingDecline: (id: number) => `/my/bookings/${id}/decline`,
  bookingChange: (id: number) => `/my/bookings/${id}/change`,
  bookingConfirmChange: (id: number) => `/my/bookings/${id}/confirm-change`,
  bookingRejectChange: (id: number) => `/my/bookings/${id}/reject-change`,
  // Provider invites + day view
  invites: '/my/invites',
  inviteCancel: (id: number) => `/my/invites/${id}/cancel`,
  calendarDay: '/my/calendar-day',
  // Invite link: preview is public, accept is Bearer
  invitePreview: (token: string) => `/bookings/invite/${token}`,
  inviteAccept: (token: string) => `/bookings/invite/${token}/accept`,
} as const;
