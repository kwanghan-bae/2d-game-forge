// Phase 5 — AdMob unit IDs.
// TEST IDs are safe to commit (per Google's policy). Replace with real IDs
// before submitting to 원스토어 (see docs/CONTRIBUTING.md §15).

export const ADMOB_CONFIG = {
  appId: {
    android: 'ca-app-pub-3940256099942544~3347511713',  // Google test app ID
  },
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917',  // Google test rewarded
  },
  banner: {
    android: 'ca-app-pub-3940256099942544/6300978111',  // Google test banner
  },
  // 원스토어 IAP licenseKey — placeholder. Replace at build time via env.
  iapLicenseKey: process.env.ONESTORE_IAP_LICENSE_KEY ?? 'PLACEHOLDER_LICENSE_KEY',
} as const;
