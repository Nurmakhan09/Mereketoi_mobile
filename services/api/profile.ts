/**
 * Profile self-service (name + password). The logic lives in services/api/auth.ts
 * (it shares the same /me/* endpoints); re-exported here to match the spec's file map.
 */
export { fetchMe, updateProfile, changePassword, logout } from './auth';
