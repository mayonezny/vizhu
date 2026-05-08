/**
 * Произносит сообщение через скринридер при смене роута.
 *
 * В SPA переходы "тихие" — браузер не сигнализирует скринридеру о смене страницы.
 * Функция пишет текст в невидимый div[aria-live="polite"] (id="sr-announcer" в RootLayout) —
 * скринридер следит за ним и вслух произносит всё, что туда попадает.
 *
 * Сброс в '' перед записью обязателен: без него повторный одинаковый текст не озвучится.
 * Задержка 50мс нужна, чтобы сброс и запись не слились в один тик и оба сработали.
 *
 * @param message - текст для произнесения (обычно document.title текущей страницы)
 */
export function announceRouteChange(message: string) {
  const el = document.getElementById('sr-announcer');
  if (!el) {
    return;
  }
  el.textContent = '';
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
