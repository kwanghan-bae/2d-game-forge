import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AstralResonanceBanner } from '../AstralResonanceBanner';
import type { EquipmentInstance } from '../../types';

describe('C1121: AstralResonanceBanner Component Tests', () => {
  const createItem = (id: string, affix?: import('../../systems/cosmicInfusion').CosmicAffixType): EquipmentInstance => ({
    instanceId: id,
    baseId: 'w-' + id,
    enhanceLv: 10,
    modifiers: [],
    cosmicAffix: affix,
  });

  it('returns null when hideInactive is true and no harmony is active', () => {
    const { container } = render(
      <AstralResonanceBanner equippedInstances={[]} hideInactive />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Tier 0 inactive banner when hideInactive is false', () => {
    render(<AstralResonanceBanner equippedInstances={[]} hideInactive={false} />);
    const banner = screen.getByTestId('astral-resonance-banner');
    expect(banner.textContent).toContain('공명 비활성');
    expect(banner.textContent).toContain('0/3개');
  });

  it('renders Tier 1 Dual Harmony with active badges and stats', () => {
    const items = [
      createItem('1', 'celestial_sharpness'),
      createItem('2', 'astral_fortitude'),
    ];

    render(<AstralResonanceBanner equippedInstances={items} />);
    const banner = screen.getByTestId('astral-resonance-banner');
    expect(banner.textContent).toContain('이원성 성간 조화');
    expect(banner.textContent).toContain('올스탯 +5%');
    expect(banner.textContent).toContain('관통 +5%');

    expect(screen.getByTestId('active-affix-celestial_sharpness')).toBeDefined();
    expect(screen.getByTestId('active-affix-astral_fortitude')).toBeDefined();
  });

  it('renders Tier 2 Trinity Harmony with full perks', () => {
    const items = [
      createItem('1', 'celestial_sharpness'),
      createItem('2', 'astral_fortitude'),
      createItem('3', 'singularity_might'),
    ];

    render(<AstralResonanceBanner equippedInstances={items} />);
    const banner = screen.getByTestId('astral-resonance-banner');
    expect(banner.textContent).toContain('삼위일체 성간 조화');
    expect(banner.textContent).toContain('올스탯 +10%');
    expect(banner.textContent).toContain('관통 +10%');
    expect(banner.textContent).toContain('최종 피해 +10%');
    expect(banner.textContent).toContain('차원 회피 +10%');
  });
});
