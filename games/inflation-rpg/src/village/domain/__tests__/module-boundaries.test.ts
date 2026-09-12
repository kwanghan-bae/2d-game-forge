// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
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

const STORY_FILE = 'src/village/story.ts';
const STORY_PATH = fileURLToPath(new URL('../../story.ts', import.meta.url));
const CHOICES_FILE = 'src/village/domain/story/choices.ts';
const CHOICES_PATH = fileURLToPath(new URL('../story/choices.ts', import.meta.url));

const ASSIGNMENT_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);
const MUTATING_METHODS = new Set(['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']);
const STATE_CHANGING_HELPERS = new Set([
  'addUniqueEntry',
  'addUniqueStoryEntry',
  'applyAgentTrustGain',
  'give',
  'syncHeroAction',
  'touchSave',
]);

function parseSource(path: string, file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function callName(node: ts.CallExpression): string | null {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

function sourceLocation(source: ts.SourceFile, node: ts.Node): string {
  const start = node.getStart(source);
  const { line, character } = source.getLineAndCharacterOfPosition(start);
  return `${source.fileName}:${line + 1}:${character + 1} ${node.getText(source)}`;
}

function stateChangingText(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)) {
      violations.push(sourceLocation(source, node));
    } else if (ts.isPrefixUnaryExpression(node)
      && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
      violations.push(sourceLocation(source, node));
    } else if (ts.isPostfixUnaryExpression(node)) {
      violations.push(sourceLocation(source, node));
    } else if (ts.isDeleteExpression(node)) {
      violations.push(sourceLocation(source, node));
    } else if (ts.isCallExpression(node)) {
      const name = callName(node);
      if (name && (MUTATING_METHODS.has(name) || STATE_CHANGING_HELPERS.has(name))) {
        violations.push(sourceLocation(source, node));
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return violations;
}

function exportedFunction(source: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
  return source.statements.find((statement): statement is ts.FunctionDeclaration => (
    ts.isFunctionDeclaration(statement)
      && statement.name?.text === name
      && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  ));
}

function commandResponsibilities(command: ts.FunctionDeclaration): Set<string> {
  const found = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = callName(node);
      if (name === 'cloneSave') found.add('clone source save');
      if (name === 'applyAgentTrustGain') found.add('apply agent trust');
      if (name === 'addUniqueEntry' || name === 'addUniqueStoryEntry') found.add('record story entry');
      if (name === 'push'
        && ts.isPropertyAccessExpression(node.expression)
        && node.expression.expression.getText() === 'save.meta.unlockedRealms') {
        found.add('unlock underworld');
      }
    } else if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)) {
      const target = node.left.getText();
      if (target.startsWith('save.meta.currencies[')) found.add('apply currency reward');
      if (target === 'save.updatedAt') found.add('update save timestamp');
      if (target === 'save.lastProcessedAt') found.add('update processing timestamp');
    }
    ts.forEachChild(node, visit);
  };
  if (command.body) ts.forEachChild(command.body, visit);
  return found;
}

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

  it('keeps story.ts read-only and the complete choice command in its domain module', () => {
    const storySource = parseSource(STORY_PATH, STORY_FILE);
    const storyViolations = stateChangingText(storySource);
    expect(
      storyViolations,
      `${STORY_FILE} contains state-changing implementation text:\n${storyViolations.join('\n')}`,
    ).toEqual([]);

    const choicesSource = parseSource(CHOICES_PATH, CHOICES_FILE);
    const command = exportedFunction(choicesSource, 'chooseStoryChoice');
    expect(
      command?.body,
      `${CHOICES_FILE} must own an exported chooseStoryChoice implementation body.`,
    ).toBeDefined();
    if (!command?.body) return;

    const requiredResponsibilities = [
      'clone source save',
      'apply agent trust',
      'apply currency reward',
      'record story entry',
      'unlock underworld',
      'update save timestamp',
      'update processing timestamp',
    ];
    const foundResponsibilities = commandResponsibilities(command);
    const missingResponsibilities = requiredResponsibilities.filter((name) => !foundResponsibilities.has(name));
    expect(
      missingResponsibilities,
      `${CHOICES_FILE} chooseStoryChoice body is missing state-changing responsibilities:\n${missingResponsibilities.join('\n')}\n\n${sourceLocation(choicesSource, command)}`,
    ).toEqual([]);
  });
});
