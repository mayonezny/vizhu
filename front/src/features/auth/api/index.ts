import { api } from '@/shared/api';
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  storeRefreshToken,
} from '@/shared/api/refresh-token-store';
import { isNativePlatform } from '@/shared/platform';

export type VerifyOtpResponse = {
  accessToken: string;
  isNewUser: boolean;
  /** Только для нативного клиента (X-Client: native) — web получает httpOnly-куку. */
  refreshToken?: string;
};

export type AuthErrorCode = 'invalid_code' | 'code_expired' | 'too_many_requests';

export type AuthErrorResponse = {
  error: AuthErrorCode;
  message: string;
};

export const authApi = {
  sendOtp: (phone: string) => api.post<{ message: string }>('/auth/send-otp', { phone }),

  verifyOtp: async (phone: string, code: string) => {
    const res = await api.post<VerifyOtpResponse>('/auth/verify-otp', { phone, code });
    // Натив: refresh-токен приходит в теле — прячем в Keychain/EncryptedSharedPreferences.
    if (res.data.refreshToken) {
      await storeRefreshToken(res.data.refreshToken);
    } else if (isNativePlatform()) {
      // Бэк не отдал токен нативному клиенту — заголовок X-Client потерялся
      // или на сервере старая версия. Без токена сессия умрёт при перезапуске.
      console.warn('[auth] verify-otp: нативный клиент не получил refreshToken в теле ответа');
    }
    return res;
  },

  logout: async () => {
    // Натив: серверу нужен сам токен, куки у него нет.
    const refreshToken = await getStoredRefreshToken();
    const res = await api.post<void>('/auth/logout', refreshToken ? { refreshToken } : undefined);
    await clearStoredRefreshToken();
    return res;
  },
};
