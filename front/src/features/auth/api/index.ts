import { api } from '@/shared/api';

export type VerifyCodeResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    is_new: boolean;
  };
};

export type AuthErrorCode = 'invalid_code' | 'code_expired' | 'too_many_requests';

export type AuthErrorResponse = {
  error: AuthErrorCode;
  message: string;
};

export const authApi = {
  requestCode: (phone: string) =>
    api.post<{ ok: true; expires_in: number }>('/auth/request-code', { phone }),

  verifyCode: (phone: string, code: string) =>
    api.post<VerifyCodeResponse>('/auth/verify-code', { phone, code }),
};
