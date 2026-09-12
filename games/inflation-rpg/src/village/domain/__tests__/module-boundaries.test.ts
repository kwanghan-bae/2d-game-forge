import { describe, expect, it } from 'vitest';
import * as facade from '../../domain';
import * as contracts from '../contracts';
import {
  advanceHeroActions,
  getHeroNextAction,
} from '../hero/autonomy';
import { getVillageHeroPower, rejuvenateHero } from '../hero/progression';

describe('Village domain module boundaries', () => {
  it('keeps public result constants available through the façade', () => {
    expect(facade.MAX_INTERVENTION_CHARGES).toBe(contracts.MAX_INTERVENTION_CHARGES);
    expect(facade.AGENT_REST_RECOVERY).toBe(contracts.AGENT_REST_RECOVERY);
  });

  it('exposes hero operations through the façade without wrapping them', () => {
    expect(facade.advanceHeroActions).toBe(advanceHeroActions);
    expect(facade.getHeroNextAction).toBe(getHeroNextAction);
    expect(facade.getVillageHeroPower).toBe(getVillageHeroPower);
    expect(facade.rejuvenateHero).toBe(rejuvenateHero);
  });
});
