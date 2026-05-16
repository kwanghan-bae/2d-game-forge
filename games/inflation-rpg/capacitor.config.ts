import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.korea.inflationrpg',
  appName: 'KoreaInflationRPG',
  webDir: 'out',
  ios: {
    backgroundColor: '#0f0f14',
  },
  android: {
    backgroundColor: '#0f0f14',
  },
  plugins: {
    OnestoreIap: {
      // licenseKey is passed via initialize() at runtime, not config.
    },
    AdMob: {
      appId: { android: 'ca-app-pub-3940256099942544~3347511713' },
    },
  },
};

export default config;
