import 'dotenv/config';
import type { CapacitorConfig } from '@capacitor/cli';

const devUrl = process.env.CAP_DEV_URL || '';

const config: CapacitorConfig = {
  appId: 'com.stihlmotors.app',
  appName: 'Stihl Motors',
  webDir: 'dist',
  server: {
    androidScheme: devUrl ? 'http' : 'https',
    ...(devUrl ? { url: devUrl, cleartext: true } : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#1A1C1E',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Camera: {
      // Permisos declarados en AndroidManifest.xml
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6B00',
      sound: 'beep.wav',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#1A1C1E',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: !process.env.NODE_ENV || process.env.NODE_ENV !== 'production',
  },
};

export default config;
