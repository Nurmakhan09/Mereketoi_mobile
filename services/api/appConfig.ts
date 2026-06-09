import { apiGet } from './client';
import { Endpoints } from './endpoints';
import { AppConfig } from '@/types';

export function fetchAppConfig() {
  return apiGet<AppConfig>(Endpoints.appConfig);
}
