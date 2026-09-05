import React from 'react';
import {
  type ElementType,
  ELEMENT_METAS,
  getEquipmentElement,
  getEnemyElement,
  computeElementalMultiplier,
  getAffinityRelation,
} from '../systems/elementalSystem';

interface BadgeProps {
  element?: ElementType;
  baseId?: string;
  enemyId?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hideNeutral?: boolean;
}

export function ElementalBadge({
  element,
  baseId,
  enemyId,
  showLabel = true,
  size = 'md',
  hideNeutral = false,
}: BadgeProps) {
  const resolvedType: ElementType = element
    ? element
    : baseId
    ? getEquipmentElement(baseId)
    : enemyId
    ? getEnemyElement(enemyId)
    : 'neutral';

  if (hideNeutral && resolvedType === 'neutral') {
    return null;
  }

  const meta = ELEMENT_METAS[resolvedType];
  const sizeStyles = {
    sm: { fontSize: 10, padding: '1px 4px', gap: 2 },
    md: { fontSize: 11, padding: '2px 6px', gap: 4 },
    lg: { fontSize: 13, padding: '3px 8px', gap: 6 },
  }[size];

  return (
    <span
      data-testid="elemental-badge"
      data-element={resolvedType}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        borderRadius: 4,
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}55`,
        color: meta.color,
        fontWeight: 'bold',
        verticalAlign: 'middle',
      }}
      title={meta.description}
    >
      <span>{meta.emoji}</span>
      {showLabel && <span>{meta.nameKR}</span>}
    </span>
  );
}

interface AffinityBannerProps {
  attackerElement: ElementType;
  defenderElement: ElementType;
}

export function AffinityMatchBanner({ attackerElement, defenderElement }: AffinityBannerProps) {
  const relation = getAffinityRelation(attackerElement, defenderElement);
  const multiplier = computeElementalMultiplier(attackerElement, defenderElement);

  if (relation === 'neutral') return null;

  const config = {
    weakness: {
      bg: 'rgba(239, 68, 68, 0.2)',
      border: '#ef4444',
      color: '#fca5a5',
      label: `⚡ WEAKNESS! (${multiplier}x 피해)`,
      testId: 'affinity-weakness',
    },
    resistance: {
      bg: 'rgba(59, 130, 246, 0.2)',
      border: '#3b82f6',
      color: '#93c5fd',
      label: `🛡️ RESIST (${multiplier}x 피해)`,
      testId: 'affinity-resistance',
    },
    dark_clash: {
      bg: 'rgba(168, 85, 247, 0.2)',
      border: '#a855f7',
      color: '#d8b4fe',
      label: `🌑 DARK CLASH! (${multiplier}x 상호 격돌)`,
      testId: 'affinity-dark-clash',
    },
  }[relation];

  return (
    <div
      data-testid={config.testId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 4,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: 11,
        fontWeight: 'bold',
        animation: 'pulse 1.5s infinite ease-in-out',
      }}
    >
      {config.label}
    </div>
  );
}
