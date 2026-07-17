/**
 * App-wide configuration.
 *
 * The mobile app is a thin client of the one mereketoi.kz CodeIgniter backend.
 * Base URL defaults to production so an Expo Go phone (on cellular or any Wi-Fi)
 * can reach it over the internet without LAN/WSL plumbing. Point it at a local
 * backend by setting EXPO_PUBLIC_API_URL (e.g. http://192.168.1.10:8899) in a
 * .env file — Expo inlines EXPO_PUBLIC_* vars at build time.
 */

const DEFAULT_WEB_URL = 'https://mereketoi.kz';

/** Web origin (no trailing slash) — used for browser auth + building image URLs. */
export const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_WEB_URL).replace(/\/+$/, '');

/** Versioned mobile API base (always ends without a trailing slash). */
export const API_BASE_URL = `${WEB_URL}/api/v1`;

/** Uploaded images are served from {WEB_URL}/uploads/{relativePath}. */
export const UPLOADS_BASE_URL = `${WEB_URL}/uploads`;

/** This app's own semantic version (compared against app-config.min_version). */
export const APP_VERSION = '1.0.1';

/** Request timeout (ms). */
export const REQUEST_TIMEOUT = 20000;

/**
 * Timeout for BOOT-path requests (app-config, /me). Cold start must never hang
 * behind the shared 20s timeout — nobody waits 20s for an app to open; fail
 * fast and continue on cached data instead.
 */
export const BOOT_REQUEST_TIMEOUT = 4000;
