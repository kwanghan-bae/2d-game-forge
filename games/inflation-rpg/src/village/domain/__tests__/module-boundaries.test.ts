import { describe, expect, it } from 'vitest';
import * as facade from '../../domain';
import * as story from '../../story';
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
import {
  getExpeditionForecast,
  getExpeditionSuccessChance,
  getNextRealmId,
} from '../expedition/forecast';
import {
  confirmNextRealmUnlock,
  confirmPendingExpedition,
  startExpedition,
} from '../expedition/commands';
import {
  completeFacilityTaskNow,
  completeFacilityTasks,
} from '../expedition/settlement';
import { advanceHeroAutonomy, decideHeroAction } from '../hero/autonomy';
import { chooseStoryChoice } from '../story/choices';
import { grantInterventionCharge, useIntervention } from '../intervention/commands';
import { grantOfflineResourceBonus } from '../rewards/offline';
import { setVillagePolicy, updateVillageSettings } from '../settings/commands';

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

  it('exposes expedition operations through the façade without wrappers', () => {
    expect(facade.getExpeditionForecast).toBe(getExpeditionForecast);
    expect(facade.getExpeditionSuccessChance).toBe(getExpeditionSuccessChance);
    expect(facade.getNextRealmId).toBe(getNextRealmId);
    expect(facade.startExpedition).toBe(startExpedition);
    expect(facade.confirmPendingExpedition).toBe(confirmPendingExpedition);
    expect(facade.confirmNextRealmUnlock).toBe(confirmNextRealmUnlock);
    expect(facade.completeFacilityTasks).toBe(completeFacilityTasks);
    expect(facade.completeFacilityTaskNow).toBe(completeFacilityTaskNow);
    expect(facade.advanceHeroAutonomy).toBe(advanceHeroAutonomy);
    expect(facade.decideHeroAction).toBe(decideHeroAction);
  });

  it('exposes the remaining commands through the façade without wrappers', () => {
    expect(facade.chooseStoryChoice).toBe(chooseStoryChoice);
    expect(facade.grantInterventionCharge).toBe(grantInterventionCharge);
    expect(facade.useIntervention).toBe(useIntervention);
    expect(facade.grantOfflineResourceBonus).toBe(grantOfflineResourceBonus);
    expect(facade.setVillagePolicy).toBe(setVillagePolicy);
    expect(facade.updateVillageSettings).toBe(updateVillageSettings);
  });

  it('keeps chooseStoryChoice out of the read-only story module', () => {
    expect(story).not.toHaveProperty('chooseStoryChoice');
  });
});
