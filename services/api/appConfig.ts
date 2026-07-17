import { apiGet } from './client';
import { Endpoints } from './endpoints';
import { BOOT_REQUEST_TIMEOUT } from '@/constants/config';
import { AppConfig } from '@/types';

/** Boot-path request — short timeout so a slow server never stalls cold start. */
export function fetchAppConfig() {
  return apiGet<AppConfig>(Endpoints.appConfig, { timeout: BOOT_REQUEST_TIMEOUT });
}
