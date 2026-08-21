import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'su.vizhu.app',
  appName: 'ВИЖУ',
  // Нативная сборка живёт отдельно от web-бандла: у них разный VITE_API_URL
  // (web ходит на относительный /api через nginx, WebView обязан знать
  // абсолютный адрес). Общая папка приводила к тому, что случайный
  // `npm run build` подсовывал в приложение web-бандл, и запросы уходили
  // в capacitor://localhost/api, то есть никуда.
  webDir: 'dist-native'
};

export default config;
