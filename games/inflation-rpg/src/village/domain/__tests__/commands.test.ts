// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createInitialVillageSave,
  loadVillageSave,
  persistVillageSave,
} from '../../save';
import { cancelFacilityTask, startFacilityTask } from '../facility/tasks';
import { startExpedition } from '../expedition/commands';
import { completeFacilityTaskNow } from '../expedition/settlement';
import { grantInterventionCharge, useIntervention } from '../intervention/commands';
import { grantOfflineResourceBonus } from '../rewards/offline';
import { setVillagePolicy, updateVillageSettings } from '../settings/commands';
import { Village_MAX_SAGA_ENTRIES } from '../../types';

const STORY_FILE = 'src/village/story.ts';
const STORY_PATH = fileURLToPath(new URL('../../story.ts', import.meta.url));
const CHOICES_FILE = 'src/village/domain/story/choices.ts';
const CHOICES_PATH = fileURLToPath(new URL('../story/choices.ts', import.meta.url));
const HOUR = 60 * 60 * 1000;
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

beforeAll(() => {
  vi.setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
});

describe('Village commands domain', () => {
  it('keeps the saga history bounded to the newest records', () => {
    const initial = createInitialVillageSave(43);
    initial.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES + 5 }, (_, index) => ({
      id: `saga-${index}`,
      kind: 'milestone' as const,
      createdAt: initial.createdAt + index,
      title: `기록 ${index}`,
      text: `내용 ${index}`,
    })).reverse();

    const updated = setVillagePolicy(initial, 'training', initial.updatedAt + 1_000);

    expect(updated.meta.sagaEntries).toHaveLength(Village_MAX_SAGA_ENTRIES);
    expect(updated.meta.sagaEntries[0]?.id).toBe(`saga-${Village_MAX_SAGA_ENTRIES + 4}`);
    expect(updated.meta.sagaEntries.at(-1)?.id).toBe('saga-5');
  });

  it('keeps the save chronology valid when an explicit action sees a backwards clock', () => {
    const initial = createInitialVillageSave(24);
    initial.lastProcessedAt = initial.createdAt + HOUR;
    initial.updatedAt = initial.lastProcessedAt;

    const changed = setVillagePolicy(initial, 'training', initial.createdAt + 1_000);
    expect(changed.updatedAt).toBe(initial.lastProcessedAt);

    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;
    persistVillageSave(changed, fakeStorage);
    expect(loadVillageSave(fakeStorage)).not.toBeNull();
  });

  it('applies monetization effects through pure Village domain helpers', () => {
    const initial = createInitialVillageSave(72);
    const started = startFacilityTask(initial, 'temple', initial.createdAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const instant = completeFacilityTaskNow(started.save, 'temple', initial.createdAt + 1_000);
    expect(instant.ok).toBe(true);
    if (!instant.ok) return;
    expect(instant.save.meta.currencies.spirit).toBe(118);
    expect(instant.save.meta.tasks).toEqual({});

    const doubled = grantOfflineResourceBonus(instant.save, { spirit: 18, gold: 4 }, initial.createdAt + 2_000);
    expect(doubled.meta.currencies).toMatchObject({ spirit: 136, gold: 104 });
    const charged = grantInterventionCharge(doubled, initial.createdAt + 3_000);
    expect(charged.run.interventionCharges).toBe(2);
    expect(grantInterventionCharge({ ...charged, run: { ...charged.run, interventionCharges: 3 } }, initial.createdAt + 4_000).run.interventionCharges).toBe(3);
  });

  it('spends an intervention charge on a full heal and records the choice', () => {
    const initial = createInitialVillageSave(73);
    initial.run.hero.hp = 120;
    const result = useIntervention(initial, 'heal', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.run.interventionCharges).toBe(0);
    expect(result.save.run.hero.hp).toBe(result.save.run.hero.hpMax);
    expect(result.save.meta.sagaEntries[0]?.title).toBe('신의 개입: 즉시 회복');
  });

  it('uses an intervention to retreat safely and releases the guide', () => {
    const initial = createInitialVillageSave(74);
    const started = startExpedition(initial, 'sacred_fields', initial.createdAt, 'aggression', 'guide');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const result = useIntervention(started.save, 'retreat', initial.createdAt + 1_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.run.interventionCharges).toBe(0);
    expect(result.save.run.expedition).toBeNull();
    expect(result.save.run.hero.currentAction).toBe('rest');
    expect(result.save.meta.agents.find((agent) => agent.id === 'guide')?.activeTaskId).toBeNull();
    expect(result.save.meta.currencies.spirit).toBe(94);
    expect(result.save.meta.sagaEntries[0]?.title).toBe('신의 개입: 원정 후퇴');
  });

  it('does not spend an intervention charge on a stale action clock', () => {
    const initial = createInitialVillageSave(119);
    initial.run.hero.hp = 120;

    const result = useIntervention(initial, 'heal', initial.updatedAt - 1);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.save).toBe(initial);
    expect(initial.run.interventionCharges).toBe(1);
    expect(initial.run.hero.hp).toBe(120);
  });

  it('does not mutate a malformed intervention reserve into an invalid save', () => {
    const malformed = createInitialVillageSave(131);
    malformed.run.interventionCharges = Number.NaN;
    malformed.run.hero.hp = 120;

    const charged = grantInterventionCharge(malformed, malformed.updatedAt + 1_000);
    const healed = useIntervention(malformed, 'heal', malformed.updatedAt + 1_000);

    expect(charged).toBe(malformed);
    expect(healed.ok).toBe(false);
    if (healed.ok) return;
    expect(healed.save).toBe(malformed);
    expect(healed.error).toContain('충전');
    expect(malformed.run.interventionCharges).toBeNaN();
  });

  it.each([
    ['missing hp', undefined, 200],
    ['not-a-number hp', Number.NaN, 200],
    ['infinite hp', Number.POSITIVE_INFINITY, 200],
    ['negative hp', -1, 200],
    ['unsafe hp max', 100, Number.MAX_VALUE],
  ])('rejects healing when hero HP data is %s', (_label, hp, hpMax) => {
    const malformed = createInitialVillageSave(132);
    malformed.run.hero.hp = hp as never;
    malformed.run.hero.hpMax = hpMax;

    const result = useIntervention(malformed, 'heal', malformed.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(malformed);
    expect(malformed.run.interventionCharges).toBe(1);
    expect(malformed.run.hero.hp).toBe(hp);
    expect(malformed.run.hero.hpMax).toBe(hpMax);
  });

  it('updates only the Village audio settings through an isolated save copy', () => {
    const initial = createInitialVillageSave(91);
    const updated = updateVillageSettings(initial, { music: 0, sfx: 0.35, muted: true }, initial.createdAt + 1_000);

    expect(updated.meta.settings).toEqual({ music: 0, sfx: 0.35, muted: true });
    expect(updated.meta.currencies).toEqual(initial.meta.currencies);
    expect(updated.run.hero).toEqual(initial.run.hero);
    expect(initial.meta.settings).toEqual({ music: 0.7, sfx: 0.8, muted: false });
  });

  it('keeps runtime policy and audio settings valid when callers pass unknown values', () => {
    const initial = createInitialVillageSave(106);
    const policy = setVillagePolicy(initial, 'unsafe' as never, initial.updatedAt + 1_000);
    const settings = updateVillageSettings(initial, {
      music: 'broken' as never,
      sfx: Number.NaN,
      muted: 'yes' as never,
    }, initial.updatedAt + 1_000);

    expect(policy).toBe(initial);
    expect(settings.meta.settings).toEqual(initial.meta.settings);
  });

  it('keeps audio settings valid when the settings patch itself is malformed', () => {
    const initial = createInitialVillageSave(130);

    expect(() => updateVillageSettings(initial, null as never, initial.updatedAt + 1_000)).not.toThrow();
    expect(() => updateVillageSettings(initial, [] as never, initial.updatedAt + 1_000)).not.toThrow();
    expect(updateVillageSettings(initial, null as never, initial.updatedAt + 1_000).meta.settings)
      .toEqual(initial.meta.settings);
  });

  it('rejects an unknown intervention before consuming a charge or retreating', () => {
    const initial = createInitialVillageSave(108);
    const started = startExpedition(initial, 'sacred_fields', initial.updatedAt + 1_000, 'aggression', null);
    if (!started.ok) throw new Error(started.error);

    const result = useIntervention(started.save, 'teleport' as never, started.save.updatedAt + 1_000);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(started.save);
    expect(started.save.run.expedition).not.toBeNull();
    expect(started.save.run.interventionCharges).toBe(initial.run.interventionCharges);
  });

  it('ignores non-finite, negative, and unknown offline bonus values', () => {
    const initial = createInitialVillageSave(94);
    const updated = grantOfflineResourceBonus(initial, {
      spirit: Number.NaN,
      gold: Number.POSITIVE_INFINITY,
      materials: 3,
      rift: -10,
      unknown: 999,
    } as never, initial.createdAt + 1_000);

    expect(updated.meta.currencies).toEqual({ spirit: 100, gold: 100, materials: 15, rift: 0 });
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle an offline bonus over a malformed %s balance', (_label, gold) => {
    const malformed = createInitialVillageSave(135);
    malformed.meta.currencies.gold = gold;

    const updated = grantOfflineResourceBonus(malformed, { gold: 10 }, malformed.updatedAt + 1_000);

    expect(updated).toBe(malformed);
    expect(malformed.meta.currencies.gold).toBe(gold);
    expect(malformed.updatedAt).toBe(malformed.createdAt);
  });

  it('does not advance the save clock when an offline bonus has no valid gains', () => {
    const initial = createInitialVillageSave(121);
    const unchanged = grantOfflineResourceBonus(initial, {
      spirit: Number.NaN,
      gold: -1,
      materials: 0,
      unknown: 10,
    } as never, initial.updatedAt + 1_000);

    expect(unchanged).toBe(initial);
    expect(grantOfflineResourceBonus(initial, null as never, initial.updatedAt + 1_000)).toBe(initial);
  });

  it.each([
    ['fractional', 100.5],
    ['not-a-number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['unsafe', Number.MAX_VALUE],
  ])('does not settle a refund over a malformed %s spirit balance', (_label, spirit) => {
    const taskSource = createInitialVillageSave(136);
    const startedTask = startFacilityTask(taskSource, 'recovery', taskSource.updatedAt);
    expect(startedTask.ok).toBe(true);
    if (!startedTask.ok) return;
    startedTask.save.meta.currencies.spirit = spirit;

    const canceled = cancelFacilityTask(startedTask.save, 'recovery', startedTask.save.updatedAt + 1_000);

    const expeditionSource = createInitialVillageSave(137);
    const startedExpedition = startExpedition(expeditionSource, 'sacred_fields', expeditionSource.updatedAt, 'aggression', null);
    expect(startedExpedition.ok).toBe(true);
    if (!startedExpedition.ok) return;
    startedExpedition.save.meta.currencies.spirit = spirit;

    const retreated = useIntervention(startedExpedition.save, 'retreat', startedExpedition.save.updatedAt + 1_000);

    expect(canceled.ok).toBe(false);
    expect(canceled.save).toBe(startedTask.save);
    expect(startedTask.save.meta.tasks[startedTask.task.id]).toBeDefined();
    expect(retreated.ok).toBe(false);
    expect(retreated.save).toBe(startedExpedition.save);
    expect(startedExpedition.save.run.expedition).not.toBeNull();
  });

  it('saturates a currency bonus at the persistable ceiling', () => {
    const nearLimit = createInitialVillageSave(122);
    nearLimit.meta.currencies.gold = Number.MAX_SAFE_INTEGER - 1;

    const updated = grantOfflineResourceBonus(nearLimit, { gold: 10 }, nearLimit.updatedAt + 1_000);

    expect(updated.meta.currencies.gold).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('does not grant rewarded currency or intervention charges on an invalid action clock', () => {
    const initial = createInitialVillageSave(96);
    const invalidBonus = grantOfflineResourceBonus(initial, { gold: 10 }, Number.NaN);
    const staleBonus = grantOfflineResourceBonus(initial, { gold: 10 }, initial.updatedAt - 1);
    const invalidCharge = grantInterventionCharge(initial, Number.POSITIVE_INFINITY);
    const staleCharge = grantInterventionCharge(initial, initial.updatedAt - 1);

    expect(invalidBonus).toBe(initial);
    expect(staleBonus).toBe(initial);
    expect(invalidCharge).toBe(initial);
    expect(staleCharge).toBe(initial);
  });

  it('rejects an unsafe action clock before direct rewards can normalize it', () => {
    const initial = createInitialVillageSave(124);
    const unsafeClock = Number.MAX_SAFE_INTEGER + 1;

    const bonus = grantOfflineResourceBonus(initial, { gold: 10 }, unsafeClock);
    const charge = grantInterventionCharge(initial, unsafeClock);
    const intervention = useIntervention(initial, 'heal', unsafeClock);

    expect(bonus).toBe(initial);
    expect(charge).toBe(initial);
    expect(intervention.ok).toBe(false);
    if (intervention.ok) return;
    expect(intervention.save).toBe(initial);
  });

  it('does not mutate a full intervention reserve', () => {
    const full = createInitialVillageSave(97);
    full.run.interventionCharges = 3;

    expect(grantInterventionCharge(full, full.updatedAt + 1_000)).toBe(full);
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
