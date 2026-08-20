/**
 * Определение платформы в рантайме.
 *
 * Capacitor инжектит глобальный `window.Capacitor` в WebView — по нему
 * отличаем нативную оболочку от обычного браузера, не завися от пакета
 * `@capacitor/core` (он появится только при переезде).
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

const getCapacitor = (): CapacitorGlobal | undefined =>
  typeof window === 'undefined' ? undefined : (window as { Capacitor?: CapacitorGlobal }).Capacitor;

/** true — приложение запущено внутри нативной оболочки Capacitor. */
export const isNativePlatform = (): boolean => getCapacitor()?.isNativePlatform?.() ?? false;

/** Имя платформы: 'web' | 'ios' | 'android'. */
export const getPlatformName = (): 'web' | 'ios' | 'android' => {
  const name = getCapacitor()?.getPlatform?.();
  return name === 'ios' || name === 'android' ? name : 'web';
};
