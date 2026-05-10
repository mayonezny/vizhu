import { api } from '@/shared/api';

export type VerifyOtpResponse = {
  accessToken: string;
  isNewUser: boolean;
};

export type RefreshResponse = {
  accessToken: string;
};

export type AuthErrorCode = 'invalid_code' | 'code_expired' | 'too_many_requests';

export type AuthErrorResponse = {
  error: AuthErrorCode;
  message: string;
};

export const authApi = {
  sendOtp: (phone: string) => api.post<{ message: string }>('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post<VerifyOtpResponse>('/auth/verify-otp', { phone, code }),

  refresh: () => api.post<RefreshResponse>('/auth/refresh'),

  logout: () => api.post<void>('/auth/logout'),
};
