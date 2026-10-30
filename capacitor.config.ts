import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the native Android and iOS shells.
 *
 * - `appId` must not use dashes and must contain at least two dots.
 * - `webDir` points at the Vite production build output.
 */
const config: CapacitorConfig = {
  appId: 'com.asif.rgbcontroller',
  appName: 'ASIF RGB Control',
  webDir: 'dist',
  backgroundColor: '#020617',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
