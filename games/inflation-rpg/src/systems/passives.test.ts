import { describe, it, expect } from 'vitest';
import { getPassiveBonuses } from './passives';

describe('getPassiveBonuses', () => {
  it('returns stat_boost for hwarang', () => {
    const b = getPassiveBonuses('hwarang');
    expect(b.statBoostMult).toBe(1.15);
    expect(b.critRateBonus).toBe(0);
  });

  it('returns crit_rate for geomgaek', () => {
    const b = getPassiveBonuses('geomgaek');
    expect(b.critRateBonus).toBe(0.25);
    expect(b.statBoostMult).toBe(1);
  });

  it('returns dodge_rate for yacha', () => {
    const b = getPassiveBonuses('yacha');
    expect(b.dodgeRateBonus).toBe(0.2);
  });

  it('returns exp_boost for seungbyeong (monk_guard)', () => {
    const b = getPassiveBonuses('seungbyeong');
    expect(b.expBoostMult).toBe(1.2);
  });

  it('returns gold_boost for yongnyeo (dragon_blessing)', () => {
    const b = getPassiveBonuses('yongnyeo');
    expect(b.goldBoostMult).toBe(1.3);
  });

  it('returns boss_damage for dosa', () => {
    const b = getPassiveBonuses('dosa');
    expect(b.bossDamageMult).toBe(1.3);
  });

  it('returns first_strike for jangsu (iron_wall)', () => {
    const b = getPassiveBonuses('jangsu');
    expect(b.firstStrikeMult).toBe(2.0);
  });

  it('returns stat_boost for seonin (immortal_body)', () => {
    const b = getPassiveBonuses('seonin');
    expect(b.statBoostMult).toBe(1.2);
  });

  it('returns defaults for unknown character', () => {
    const b = getPassiveBonuses('nonexistent');
    expect(b.statBoostMult).toBe(1);
    expect(b.critRateBonus).toBe(0);
    expect(b.dodgeRateBonus).toBe(0);
    expect(b.expBoostMult).toBe(1);
    expect(b.goldBoostMult).toBe(1);
    expect(b.bossDamageMult).toBe(1);
    expect(b.firstStrikeMult).toBe(1);
    expect(b.itemFindMult).toBe(1);
    expect(b.beastDamageMult).toBe(1);
    expect(b.lifeConversion).toBe(0);
  });

  it('returns item_find for mudang', () => {
    const b = getPassiveBonuses('mudang');
    expect(b.itemFindMult).toBe(1.2);
  });

  it('returns life_conversion for choeui', () => {
    const b = getPassiveBonuses('choeui');
    expect(b.lifeConversion).toBe(0.05);
  });

  it('returns beast_damage for tiger_hunter', () => {
    const b = getPassiveBonuses('tiger_hunter');
    expect(b.beastDamageMult).toBe(1.5);
  });
});
