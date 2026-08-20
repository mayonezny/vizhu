import { isNativePlatform, platform } from '@/shared/platform';

/**
 * Refresh-токен для НАТИВНОГО клиента (Capacitor).
 *
 * В web refresh-токен живёт в httpOnly-куке и клиенту недоступен — эти
 * функции там no-op. В нативке куки между capacitor://localhost и API-доменом
 * ненадёжны, поэтому бэкенд отдаёт refresh-токен в теле ответа (по заголовку
 * X-Client: native), а мы храним его в защищённом хранилище
 * (Keychain / EncryptedSharedPreferences) и явно шлём в /auth/refresh.
 */

const REFRESH_TOKEN_KEY = 'vizhu-refresh-token';

export const getStoredRefreshToken = async (): Promise<string | null> =>
  isNativePlatform() ? platform.secureStorage.get(REFRESH_TOKEN_KEY) : null;

export const storeRefreshToken = async (token: string): Promise<void> => {
  if (isNativePlatform()) {
    await platform.secureStorage.set(REFRESH_TOKEN_KEY, token);
  }
};

export const clearStoredRefreshToken = async (): Promise<void> => {
  if (isNativePlatform()) {
    await platform.secureStorage.remove(REFRESH_TOKEN_KEY);
  }
};
