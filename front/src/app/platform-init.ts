import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { useRegistrationStore } from '@/features/registration';
import { useA11yStore } from '@/shared/lib/a11y/store';
import { useThemeStore } from '@/shared/lib/theme/use-theme';
import { isNativePlatform } from '@/shared/platform';

/**
 * Инициализация платформы. Вызывается в main.tsx ДО bootstrapAuth и рендера.
 *
 * В web — no-op (web-реализации портов зарегистрированы по умолчанию).
 * В Capacitor — динамически подгружает нативные реализации (чтобы плагины
 * не попадали в web-бандл) и перечитывает персист-сторы: они создаются при
 * импорте модулей, т.е. успевают гидрироваться из пустого localStorage до
 * того, как зарегистрируется нативный Preferences-storage.
 */
export const initPlatform = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  const { registerNativePlatform } = await import('@/shared/platform/native');
  registerNativePlatform();

  await Promise.all(
    [useAuthStore, useRegistrationStore, useOnboardingStore, useThemeStore, useA11yStore].map(
      (store) => store.persist.rehydrate(),
    ),
  );
};
