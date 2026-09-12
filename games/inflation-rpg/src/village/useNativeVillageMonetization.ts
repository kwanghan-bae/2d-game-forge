import { useEffect, useRef, useState } from 'react';
import {
  createNativeVillageMonetization,
  type NativeVillageMonetizationHandle,
  type VillageMonetizationAdapter,
} from './monetization';

function disposeNativeHandle(
  handle: NativeVillageMonetizationHandle,
  disposedHandles: { current: WeakSet<object> },
): Promise<void> {
  if (disposedHandles.current.has(handle)) return Promise.resolve();
  disposedHandles.current.add(handle);
  try {
    return Promise.resolve(handle.dispose?.()).then(() => undefined);
  } catch {
    return Promise.resolve();
  }
}

export function useNativeVillageMonetization(
  villageMonetization: VillageMonetizationAdapter | undefined,
): VillageMonetizationAdapter | undefined {
  const [nativeMonetization, setNativeMonetization] = useState<VillageMonetizationAdapter | undefined>(undefined);
  const nativeMonetizationPromise = useRef<ReturnType<typeof createNativeVillageMonetization> | null>(null);
  const nativeMonetizationLifecycleToken = useRef<symbol | null>(null);
  const disposedNativeHandles = useRef(new WeakSet<object>());

  useEffect(() => {
    const token = Symbol('village-monetization-lifecycle');
    nativeMonetizationLifecycleToken.current = token;
    return () => {
      const pendingHandle = nativeMonetizationPromise.current;
      // React StrictMode may tear down and immediately recreate effects during
      // development. Defer the disposal check until the replacement effect
      // has had a chance to claim the lifecycle token.
      void Promise.resolve().then(() => {
        if (nativeMonetizationLifecycleToken.current !== token) return;
        nativeMonetizationLifecycleToken.current = null;
        if (pendingHandle) {
          void pendingHandle.then((handle) => disposeNativeHandle(handle, disposedNativeHandles)).catch(() => {
            // Monetization cleanup is optional and must never block root unmount.
          });
        }
      });
    };
  }, []);

  useEffect(() => {
    if (villageMonetization || nativeMonetization) return;
    const capacitor = (window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    let isNativePlatform = false;
    try {
      isNativePlatform = Boolean(capacitor?.isNativePlatform?.());
    } catch {
      // A broken native bridge must not prevent the local-first game from booting.
      return;
    }
    if (!isNativePlatform) return;

    const handlePromise = nativeMonetizationPromise.current
      ?? (nativeMonetizationPromise.current = createNativeVillageMonetization());
    const lifecycleToken = nativeMonetizationLifecycleToken.current;
    let cancelled = false;
    void handlePromise.then(async (handle) => {
      try {
        if (cancelled) {
          // The empty-dependency lifecycle effect changes its token during a
          // StrictMode probe. Only the same live root token means that this
          // effect was replaced by a new monetization source.
          if (nativeMonetizationLifecycleToken.current === lifecycleToken) {
            await disposeNativeHandle(handle, disposedNativeHandles);
          }
          return;
        }
        const initialized = await handle.initialize();
        if (cancelled || !initialized) {
          if (!cancelled || nativeMonetizationLifecycleToken.current === lifecycleToken) {
            await disposeNativeHandle(handle, disposedNativeHandles);
          }
          return;
        }
        setNativeMonetization(handle.adapter);
      } catch {
        if (!cancelled || nativeMonetizationLifecycleToken.current === lifecycleToken) {
          await disposeNativeHandle(handle, disposedNativeHandles);
        }
      }
    }).catch(() => {
      // Native monetization is optional; failure leaves the core loop playable.
    });
    return () => { cancelled = true; };
  }, [villageMonetization, nativeMonetization]);

  return nativeMonetization;
}
