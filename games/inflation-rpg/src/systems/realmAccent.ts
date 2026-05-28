/**
 * Realm accent colors — each realm has a distinct accent.
 * Applied as CSS custom property --forge-realm-accent on .forge-ui-root.
 */

import type { RealmId } from '../types';

export const REALM_ACCENTS: Record<RealmId, { accent: string; accentDim: string }> = {
  base:       { accent: '#f0c060', accentDim: '#2a2410' },  // gold (default)
  sea:        { accent: '#60c0e0', accentDim: '#102a30' },  // cyan-blue
  volcano:    { accent: '#e06030', accentDim: '#301510' },  // ember-orange
  underworld: { accent: '#b060e0', accentDim: '#1a1030' },  // purple
  heaven:     { accent: '#e0e0f0', accentDim: '#1a1a2a' },  // white-silver
  chaos:      { accent: '#e02060', accentDim: '#301020' },  // crimson
};

export function applyRealmAccent(realmId: RealmId): void {
  const colors = REALM_ACCENTS[realmId] ?? REALM_ACCENTS.base;
  const root = document.documentElement;
  root.style.setProperty('--forge-accent', colors.accent);
  root.style.setProperty('--forge-accent-dim', colors.accentDim);
}
