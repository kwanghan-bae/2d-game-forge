import type { RealmId } from '../types';
import { REALM_CATALOG, findRealm } from '../data/realms';

export function canEnterRealm(unlocked: readonly RealmId[], target: RealmId): boolean {
  return unlocked.includes(target);
}

export function realmForColumn(column: number): RealmId | null {
  for (const r of REALM_CATALOG) {
    if (column >= r.columnRange[0] && column < r.columnRange[1]) return r.id;
  }
  return null;
}

export function fieldLevelAtColumn(realmId: RealmId, column: number): number {
  const realm = findRealm(realmId);
  const [colStart, colEnd] = realm.columnRange;
  const [lvStart, lvEnd] = realm.fieldLevelRange;
  const span = colEnd - colStart;
  if (span <= 0) return lvStart;
  const t = Math.max(0, Math.min(1, (column - colStart) / span));
  return Math.floor(lvStart + t * (lvEnd - lvStart));
}

export function nextRealmOf(id: RealmId): RealmId | null {
  return findRealm(id).nextRealm;
}
