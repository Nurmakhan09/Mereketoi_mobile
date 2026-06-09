/**
 * Public user shape (master-spec §5.1). No raw id, no password.
 * `role` is server-controlled — registration only ever yields `client`;
 * `provider` is auto-assigned by the backend on the first listing.
 */
export type UserRole = 'client' | 'provider' | 'moderator' | 'admin';

export interface User {
  public_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

/** Auth response payload (register/login/oauth). */
export interface AuthResult {
  token: string;
  user: User;
}
