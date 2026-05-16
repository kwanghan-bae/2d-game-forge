import { registerPlugin } from '@capacitor/core';

import type { OnestoreIapPlugin } from './definitions';

const OnestoreIap = registerPlugin<OnestoreIapPlugin>('OnestoreIap', {
  web: () => import('./web').then((m) => new m.OnestoreIapWeb()),
});

export * from './definitions';
export { OnestoreIap };
