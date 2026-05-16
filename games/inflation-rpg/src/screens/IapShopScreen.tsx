import { useEffect, useState } from 'react';

import { IAP_CATALOG, IAP_PRODUCT_IDS } from '../services/IapCatalog';
import type { IapProductId } from '../types';
import styles from './IapShopScreen.module.css';

interface IapShopScreenProps {
  adFreeOwned: boolean;
  getPrice: (id: IapProductId) => string | undefined;
  onPurchase: (id: IapProductId) => Promise<boolean>;
  onBack: () => void;
}

export function IapShopScreen({ adFreeOwned, getPrice, onPurchase, onBack }: IapShopScreenProps) {
  const [busy, setBusy] = useState<IapProductId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const handlePurchase = async (id: IapProductId) => {
    if (busy !== null) return;
    setBusy(id);
    try {
      const ok = await onPurchase(id);
      setToast(ok ? '구매 완료' : '구매가 취소되었습니다');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.shop}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.back}>←</button>
        <h2>상점</h2>
      </header>
      <ul className={styles.list}>
        {IAP_PRODUCT_IDS.map((id) => {
          const entry = IAP_CATALOG[id];
          const owned = id === 'ad_free' && adFreeOwned;
          const price = getPrice(id) ?? '—';
          return (
            <li key={id} className={styles.card}>
              <div className={styles.cardBody}>
                <h3>{entry.displayName}</h3>
                <p>
                  {entry.type === 'non-consumable'
                    ? (entry as { description: string }).description
                    : `${(entry as { crackStones: number }).crackStones}개 균열석 지급`}
                </p>
              </div>
              <button
                className={styles.buy}
                disabled={owned || busy !== null}
                onClick={() => handlePurchase(id)}
              >
                {owned ? '보유 중' : busy === id ? '...' : price}
              </button>
            </li>
          );
        })}
      </ul>
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
