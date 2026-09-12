import { describe, expect, it } from 'vitest';
import * as facade from '../../domain';
import * as contracts from '../contracts';
import {
  advanceHeroActions,
  getHeroNextAction,
} from '../hero/autonomy';
import { getVillageHeroPower, rejuvenateHero } from '../hero/progression';
import {
  getBlacksmithEquipmentOutput,
  getBlacksmithEquipmentRecommendation,
  getFacilityTaskPreview,
} from '../facility/preview';
import { cancelFacilityTask, restAgent, startFacilityTask } from '../facility/tasks';
import { getFacilityUpgradeCost, upgradeFacility } from '../facility/upgrade';

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

  it('exposes facility operations through the façade without wrappers', () => {
    expect(facade.getBlacksmithEquipmentOutput).toBe(getBlacksmithEquipmentOutput);
    expect(facade.getBlacksmithEquipmentRecommendation).toBe(getBlacksmithEquipmentRecommendation);
    expect(facade.getFacilityTaskPreview).toBe(getFacilityTaskPreview);
    expect(facade.startFacilityTask).toBe(startFacilityTask);
    expect(facade.cancelFacilityTask).toBe(cancelFacilityTask);
    expect(facade.restAgent).toBe(restAgent);
    expect(facade.getFacilityUpgradeCost).toBe(getFacilityUpgradeCost);
    expect(facade.upgradeFacility).toBe(upgradeFacility);
  });
});
