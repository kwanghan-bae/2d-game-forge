import { useCallback, useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useGameStore } from '../store/gameStore';
import { computeLightDelta } from '../overworld/lightEmit';
import { getLightRateMul, getMoveSpeedMul } from '../buff/buffEffects';
import { REALM_CATALOG } from '../data/realms';
import { getRealmLore } from '../data/realmLore';
import { formatCompact } from '../systems/numberFormat';
import { getOverkillMessage, getDangerZoneMessage, getCloseCallMessage, getCriticalHitMessage, getBossRageMessage, getEliteMessage, getVillageRestMessage, getFirstBloodMessage, getRevengeKillMessage, getLuckyDodgeMessage, getMercyMessage } from '../data/battleFlavorText';
import type { SagaEvent } from '../saga/SagaTypes';
import { getNpcKindEmoji } from '../data/npcs';
import type { NpcEntity } from '../types';
import { SpendModal } from './SpendModal';
import { NpcEncounterModal } from './NpcEncounterModal';
import { SagaBookModal } from './SagaBookModal';
import { StatusModal } from './StatusModal';
import { RelicPanel } from '../components/RelicPanel';
import { StrategyPanel } from '../components/StrategyPanel';
import { CombatOverlay } from '../components/CombatOverlay';
import { DamageFloater } from '../components/DamageFloater';
import { DamageFloaterLogic } from '../components/DamageFloaterLogic';
import { BattleOutcomeBadge } from '../components/BattleOutcomeBadge';
import type { BattleOutcomeInput } from '../components/BattleOutcomeBadgeLogic';
import { ComboStreakBadge } from '../components/ComboStreakBadge';
import { ExpBreakdownBadge } from '../components/ExpBreakdownBadge';
import { EventChoiceToast } from '../components/EventChoiceToast';
import { HealBreakdownBadge } from '../components/HealBreakdownBadge';
import type { ExpBreakdownEntry } from '../components/ExpBreakdownBadgeLogic';
import type { PostCombatHealResult } from '../overworld/encounter/PostCombatHealCalc';
import { StatDeltaPopup } from '../components/StatDeltaPopup';
import { WeatherHudIndicator } from '../components/WeatherHudIndicator';
import { HudIndicatorBarComponent } from '../components/HudIndicatorBarComponent';
import type { ActiveEventState } from '../components/HudIndicatorBar';
import { DestinationBadge } from '../components/DestinationBadge';
import type { Weather } from '../overworld/encounter/WeatherSystem';
import type { TraitId } from '../cycle/traits';
import { computeStatDeltas } from '../components/StatDeltaPopupLogic';
import { AtkBreakdownTooltip } from '../components/AtkBreakdownTooltip';
import { computeAtkBreakdown } from '../components/AtkBreakdownLogic';
import { ShrineChoiceModal } from '../components/ShrineChoiceModal';
import { DangerChoiceModal } from '../components/DangerChoiceModal';
import { FateRollModal } from './FateRollModal';
import { BossIntroModal, type BossIntroCard } from './BossIntroModal';
import { RealmForkModal } from './RealmForkModal';
import type { RealmForkCard, RealmForkCardId } from '../buff/realmForkCatalog';
import { findRealm } from '../data/realms';
import { seasonEmoji, seasonNameKR, seasonBonus } from '../season/SeasonState';
// Cycle 106 F2 — inflation milestone VFX overlay
import { InflationMilestoneVFX } from '../components/InflationMilestoneVFX';
import { useMilestoneStore } from '../store/milestoneStore';
import { getActiveCosmeticTint } from '../data/seasonalModifierSelector';
import { cosmeticTintToHex } from '../data/seasonalCosmeticTint';

interface Props {
  onCycleEnd: () => void;
  /** V3-H: 자동 저장 후 메인 메뉴로 복귀. cycle 상태는 유지된다. */
  onExitToMenu?: () => void;
}

const LOG_LIMIT = 12;

// Lazy-load Phaser only on the client + only when this component mounts. This
// avoids server-rendering issues with the dev-shell.
async function bootPhaser(
  container: HTMLDivElement,
  onEvent: (e: import('../overworld/OverworldEvents').OverworldEvent) => void,
  hero: import('../hero/HeroEntity').HeroEntity,
  ai: import('../decisionAI/HeroDecisionAI').HeroDecisionAI,
  seed: number,
  initialSpeed: number,
  currentRealm?: import('../types').RealmId,
  unlockedRealms?: readonly import('../types').RealmId[],
  currentSeason?: import('../types').SeasonId,
): Promise<{
  destroy: () => void;
  setSpeed: (m: number) => void;
  setUnlockedRealms: (r: readonly import('../types').RealmId[]) => void;
  setCurrentRealm: (r: import('../types').RealmId) => void;
  setSeason: (s: import('../types').SeasonId) => void;
  setCosmeticTintOverride: (hex: string | null) => void;
  getScene: () => { getLastInfluencingTraits?: () => readonly string[] } | null;
}> {
  const [Phaser, { OverworldScene, GRID_H }] = await Promise.all([
    import('phaser'),
    import('../overworld/OverworldScene'),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 640,   // V3-D: viewport fixed at 640px regardless of GRID_W
    height: GRID_H * 32,
    backgroundColor: '#0a0e1a',
    scene: OverworldScene,
    physics: { default: 'arcade' },
  });
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent, initialSpeed, currentRealm, unlockedRealms, currentSeason });
  const getScene = () => game.scene.getScene('OverworldScene') as InstanceType<typeof OverworldScene> | null;
  const setSpeed = (m: number) => {
    getScene()?.setSpeed(m);
  };
  const setUnlockedRealms = (r: readonly import('../types').RealmId[]) => {
    getScene()?.setUnlockedRealms(r);
  };
  const setCurrentRealm = (r: import('../types').RealmId) => {
    getScene()?.setCurrentRealm(r);
  };
  const setSeason = (s: import('../types').SeasonId) => {
    getScene()?.setSeason(s);
  };
  // Cycle 177 — SeasonalModifier cosmeticTint override (wire chain 7/n).
  const setCosmeticTintOverride = (hex: string | null) => {
    getScene()?.setCosmeticTintOverride(hex);
  };
  return { destroy: () => game.destroy(true), setSpeed, setUnlockedRealms, setCurrentRealm, setSeason, setCosmeticTintOverride, getScene };
}

const SPEED_PRESETS = [1, 2, 5, 10] as const;
type SpeedPreset = (typeof SPEED_PRESETS)[number];

export function OverworldRunner({ onCycleEnd, onExitToMenu }: Props) {
  const status = useCycleStoreV2(s => s.status);
  const controller = useCycleStoreV2(s => s.controller);
  const endCycle = useCycleStoreV2(s => s.endCycle);
  const startCycle = useCycleStoreV2(s => s.start);
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setHudTick] = useState(0);
  const [logEntries, setLogEntries] = useState<readonly SagaEvent[]>([]);
  const [speed, setSpeed] = useState<SpeedPreset>(1);
  const [chapterOverlay, setChapterOverlay] = useState<{ toChapter: string; atAge: number; key: number } | null>(null);
  const [dangerFlash, setDangerFlash] = useState(false);
  const dangerFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [milestoneFlash, setMilestoneFlash] = useState<number | null>(null);
  const milestoneFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [comboDisplay, setComboDisplay] = useState<number>(0);
  const [momentumDisplay, setMomentumDisplay] = useState<number>(0);
  const [battleFlavor, setBattleFlavor] = useState<string | null>(null);
  const battleFlavorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [realmOverlay, setRealmOverlay] = useState<{ realmId: import('../types').RealmId; key: number } | null>(null);
  type LightFloat = { id: string; amount: number; createdAt: number };
  const FADE_MS = 1500;
  const MAX_FLOATS = 3;
  const [lightFloats, setLightFloats] = useState<LightFloat[]>([]);
  const damageFloaterRef = useRef(new DamageFloaterLogic({ duration: 800 }));
  const [badgeInput, setBadgeInput] = useState<BattleOutcomeInput | null>(null);
  const [expBreakdown, setExpBreakdown] = useState<ExpBreakdownEntry[] | null>(null);
  const [eventSubType, setEventSubType] = useState<string | null>(null);
  const [healResult, setHealResult] = useState<PostCombatHealResult | null>(null);
  const [statDeltaEntries, setStatDeltaEntries] = useState<import('../components/StatDeltaPopupLogic').StatDeltaEntry[]>([]);
  const [currentWeather, setCurrentWeather] = useState<Weather>('normal');
  const [isNight, setIsNight] = useState(false);
  const [inspirationRemaining, setInspirationRemaining] = useState(0);
  const [influencingTraits, setInfluencingTraits] = useState<TraitId[]>([]);
  const [activeEvents, setActiveEvents] = useState<ActiveEventState>({ trialGroundsRemaining: 0, colosseumRemaining: 0, voidRiftRemaining: 0 });
  const [currentDestination, setCurrentDestination] = useState<import('../data/landmarks').LandmarkKind | null>(null);
  const [showAtkBreakdown, setShowAtkBreakdown] = useState(false);
  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const [sagaModalOpen, setSagaModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [shrineModalOpen, setShrineModalOpen] = useState(false);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [npcModal, setNpcModal] = useState<{ npcInstanceId: string } | null>(null);
  // Cycle 108 F1 — fate roll modal state.
  const [fateRollModal, setFateRollModal] = useState<{ oldLevel: number; pendingDeathPenaltyNewLevel: number } | null>(null);
  // Cycle 109 F1 — boss intro modal state.
  const [bossIntroModal, setBossIntroModal] = useState<{ landmarkId: string; cards: ReadonlyArray<BossIntroCard> } | null>(null);
  // Cycle 110 F1 — realm fork modal state.
  const [realmForkModal, setRealmForkModal] = useState<{
    oldRealm: import('../types').RealmId;
    newRealm: import('../types').RealmId;
    riskCard: RealmForkCard;
    safeCard: RealmForkCard;
    autoChoice: RealmForkCardId;
  } | null>(null);
  // Cycle 106 F2 — milestone VFX queue
  const milestoneQueue = useMilestoneStore(s => s.queue);
  const pushMilestone = useMilestoneStore(s => s.pushMilestone);
  const dequeueMilestone = useMilestoneStore(s => s.dequeueMilestone);
  const clearMilestones = useMilestoneStore(s => s.clearMilestones);
  const setSceneSpeedRef = useRef<((m: number) => void) | null>(null);
  const setSceneUnlockedRealmsRef = useRef<((r: readonly import('../types').RealmId[]) => void) | null>(null);
  const setSceneCurrentRealmRef = useRef<((r: import('../types').RealmId) => void) | null>(null);
  const setSceneSeasonRef = useRef<((s: import('../types').SeasonId) => void) | null>(null);
  // Cycle 177 — SeasonalModifier cosmeticTint override ref (wire chain 7/n).
  const setSceneCosmeticTintRef = useRef<((hex: string | null) => void) | null>(null);
  // C761: scene accessor for trait badge wiring
  const getSceneRef = useRef<(() => { getLastInfluencingTraits?: () => readonly string[] } | null) | null>(null);
  const endedRef = useRef(false);
  const chapterOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realmOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRejuvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveMul = getMoveSpeedMul(meta);

  const emitLightFloat = useCallback((amount: number) => {
    setLightFloats(prev => {
      const next: LightFloat[] = [...prev, { id: `${Date.now()}-${Math.random()}`, amount, createdAt: Date.now() }];
      return next.slice(-MAX_FLOATS);
    });
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setLightFloats(prev => prev.filter(f => now - f.createdAt < FADE_MS));
    }, 500);
    return () => clearInterval(tick);
  }, []);

  // V3-H B2: auto-start cycle on mount if no cycle is active.
  // If run.heroSnapshot exists the cycle controller will restore the hero from it
  // (same age/level/saga context). Otherwise a fresh hero is created as usual.
  useEffect(() => {
    const cycleState = useCycleStoreV2.getState();
    if (cycleState.status === 'idle' || cycleState.controller === null) {
      const atkBaseBonus = useGameStore.getState().meta.atkBaseBonus ?? 0;
      const hpBaseBonus = useGameStore.getState().meta.hpBaseBonus ?? 0;
      startCycle({
        seed: Date.now() & 0xffffffff,
        traits: [],
        heroHpMax: 100 + hpBaseBonus,
        heroAtkBase: 50 + atkBaseBonus,
        // heroSnapshot is picked up automatically from run.heroSnapshot inside cycleSliceV2.start
      });
    }
  }, []);

  useEffect(() => {
    if (status !== 'running' || !controller || !containerRef.current) return;
    let destroy: (() => void) | null = null;
    endedRef.current = false;

    bootPhaser(
      containerRef.current,
      (event) => {
        if (event.type === 'arrived_at') {
          // C729: DestinationBadge wiring
          setCurrentDestination(event.landmarkKind);
          const evs = controller.handleArrival(event.landmarkKind, event.landmarkId);
          const { delta: rawDelta } = computeLightDelta(evs, event.landmarkKind);
          if (rawDelta > 0) {
            const curMeta = useGameStore.getState().meta;
            // V3-H F6: spring bonus lightRateMul stacked on top of meta rateMul.
            const rateMul = getLightRateMul(curMeta) * seasonBonus(curMeta.season.current).lightRateMul;
            const finalDelta = rawDelta * rateMul;
            useGameStore.setState(s => ({
              ...s,
              meta: { ...s.meta, light: (s.meta.light ?? 0) + finalDelta },
            }));
            emitLightFloat(finalDelta);
          }
          setHudTick(n => n + 1);
          setLogEntries(controller.getRecentSagaEvents(LOG_LIMIT));
          // C119: danger zone flash
          if (evs.some(e => e.type === 'danger_zone_entered')) {
           setDangerFlash(true);
           if (dangerFlashTimerRef.current) clearTimeout(dangerFlashTimerRef.current);
           dangerFlashTimerRef.current = setTimeout(() => {
             setDangerFlash(false);
             dangerFlashTimerRef.current = null;
           }, 1200);
          }
          // C121: milestone fanfare
          const milestone = evs.find(e => e.type === 'milestone_reached');
          if (milestone && milestone.type === 'milestone_reached') {
           setMilestoneFlash(milestone.level);
           if (milestoneFlashTimerRef.current) clearTimeout(milestoneFlashTimerRef.current);
           milestoneFlashTimerRef.current = setTimeout(() => {
             setMilestoneFlash(null);
             milestoneFlashTimerRef.current = null;
           }, 2000);
          }
          // C128: update combo display from combo_streak event
          const comboEvent = evs.find(e => e.type === 'combo_streak');
          if (comboEvent && comboEvent.type === 'combo_streak') {
            setComboDisplay(comboEvent.streak);
          } else if (evs.some(e => e.type === 'hero_died')) {
            setComboDisplay(0);
            setMomentumDisplay(0);
          }
          // C129: momentum display — track battles since village
          if (evs.some(e => e.type === 'battle_won')) {
            setMomentumDisplay(m => Math.min(m + 1, 20));
            const wonEv = evs.find(e => e.type === 'battle_won');
            if (wonEv && wonEv.type === 'battle_won' && wonEv.expGain > 0) {
              damageFloaterRef.current.addEntry({ value: wonEv.expGain, type: 'exp' });
            }
          }
          if (evs.some(e => e.type === 'hero_died')) {
            damageFloaterRef.current.addEntry({ value: 0, type: 'damage' });
          }
          const critEv = evs.find(e => e.type === 'critical_hit');
          if (critEv && critEv.type === 'critical_hit') {
            damageFloaterRef.current.addEntry({ value: critEv.damage, type: 'critical' });
          }
          const closeCallEv = evs.find(e => e.type === 'close_call');
          if (closeCallEv && closeCallEv.type === 'close_call') {
            damageFloaterRef.current.addEntry({ value: closeCallEv.healed, type: 'heal' });
          }
          // C663: BattleOutcomeBadge integration
          if (evs.some(e => e.type === 'battle_won')) {
            setBadgeInput({
              turnCount: momentumDisplay + 1,
              didCrit: !!critEv,
              wasCloseCall: !!closeCallEv,
            });
          }
          // C682: StatDeltaPopup wiring
          const deltas = computeStatDeltas(evs);
          if (deltas.length > 0) {
            setStatDeltaEntries(deltas);
            setTimeout(() => setStatDeltaEntries([]), 1500);
          }
          // C707: ExpBreakdownBadge + EventChoiceToast wiring
          const cachedBreakdown = engineRef.current?.getExpBreakdown?.() ?? null;
          if (cachedBreakdown) setExpBreakdown(cachedBreakdown);
          // C712: HealBreakdownBadge wiring
          const cachedHeal = engineRef.current?.getHealResult?.() ?? null;
          if (cachedHeal && cachedHeal.totalHeal > 0) setHealResult(cachedHeal);
          // C725: WeatherHudIndicator wiring
          setCurrentWeather(engineRef.current?.getWeather?.() ?? 'normal');
          // C735: Night indicator wiring
          setIsNight(engineRef.current?.getIsNight?.() ?? false);
          // C753: Inspiration badge wiring
          setInspirationRemaining(engineRef.current?.getInspirationRemaining?.() ?? 0);
          // C761: Trait influence badge wiring
          setInfluencingTraits([...(getSceneRef.current?.()?.getLastInfluencingTraits?.() ?? [])] as TraitId[]);
          // C765: Active event badges
          setActiveEvents({
            trialGroundsRemaining: controller.getTrialGroundsRemaining(),
            colosseumRemaining: controller.getColosseumRemaining(),
            voidRiftRemaining: controller.getVoidRiftRemaining(),
          });
          const eventSubTypeEv = evs.find(e =>
            e.type.startsWith('event_merchant_') ||
            e.type.startsWith('event_gambler_') ||
            e.type.startsWith('event_altar_')
          );
          if (eventSubTypeEv) setEventSubType(eventSubTypeEv.type);
          if (event.landmarkKind === 'village') {
            setMomentumDisplay(0);
          }
          // C131: battle flavor text float
          const tick = Date.now();
          const flavor =
           evs.some(e => e.type === 'event_treasure_shrine_pending') ? (() => { setShrineModalOpen(true); return '✨ 보물 제단! 축복을 선택하세요'; })() :
           evs.some(e => e.type === 'danger_zone_choice') ? (() => { setDangerModalOpen(true); return '⚠️ 위험지대! 전투 or 도주?'; })() :
           evs.some(e => e.type === 'event_merchant') ? '🏪 상인 등장! 렐릭 구매' :
           evs.some(e => e.type === 'event_treasure_shrine') ? '✨ 보물 제단 발견!' :
            evs.some(e => e.type === 'event_trap_avoided') ? '⚡ 함정 회피! (높은 콤보)' :
            evs.some(e => e.type === 'event_trap') ? '💥 함정에 걸렸다!' :
            evs.some(e => e.type === 'event_rest_shrine') ? '🛏️ 휴식 제단 (전체 회복)' :
            evs.some(e => e.type === 'event_gambler') ? '🎲 도박사와의 만남!' :
            evs.some(e => e.type === 'event_blacksmith') ? '🔨 대장장이 강화!' :
            evs.some(e => e.type === 'event_cursed_altar') ? '☠️ 저주받은 제단!' :
            evs.some(e => e.type === 'event_fairy') ? '🧚 요정의 축복!' :
            evs.some(e => e.type === 'event_time_rift') ? '⏳ 시간의 균열!' :
            evs.some(e => e.type === 'event_chain_reward') ? '🎊 이벤트 체인 보상!' :
            evs.some(e => e.type === 'lucky_dodge') ? getLuckyDodgeMessage(tick) :
            evs.some(e => e.type === 'revenge_kill') ? getRevengeKillMessage(tick) :
            evs.some(e => e.type === 'first_blood') ? getFirstBloodMessage(tick) :
            evs.some(e => e.type === 'overkill') ? getOverkillMessage(tick) :
            evs.some(e => e.type === 'close_call') ? getCloseCallMessage(tick) :
            evs.some(e => e.type === 'critical_hit') ? getCriticalHitMessage(tick) :
            evs.some(e => e.type === 'boss_rage') ? getBossRageMessage(tick) :
            evs.some(e => e.type === 'elite_spawned') ? getEliteMessage(tick) :
            evs.some(e => e.type === 'mercy_activated') ? getMercyMessage(tick) :
            evs.some(e => e.type === 'village_rest_bonus') ? getVillageRestMessage(tick) :
            evs.some(e => e.type === 'danger_zone_entered') ? getDangerZoneMessage(tick) :
            evs.some(e => e.type === 'danger_retreat') ? '🏃 위험지대 회피! (-50G, 콤보 초기화)' :
            null;
          if (flavor) {
            setBattleFlavor(flavor);
            if (battleFlavorTimerRef.current) clearTimeout(battleFlavorTimerRef.current);
            battleFlavorTimerRef.current = setTimeout(() => {
              setBattleFlavor(null);
              battleFlavorTimerRef.current = null;
            }, 1500);
          }
          const transition = evs.find(e => e.type === 'chapter_transition');
          if (transition && transition.type === 'chapter_transition') {
            setChapterOverlay({ toChapter: transition.toChapter, atAge: transition.atAge, key: Date.now() });
            if (chapterOverlayTimerRef.current) clearTimeout(chapterOverlayTimerRef.current);
            chapterOverlayTimerRef.current = setTimeout(() => {
              setChapterOverlay(null);
              chapterOverlayTimerRef.current = null;
            }, 2000);
          }
          const npcEncounter = evs.find(e => e.type === 'npc_encounter');
          if (npcEncounter && npcEncounter.type === 'npc_encounter') {
            setNpcModal({ npcInstanceId: npcEncounter.npcInstanceId });
          }
          const realmEntered = evs.find(e => e.type === 'realm_entered');
          if (realmEntered && realmEntered.type === 'realm_entered') {
            useGameStore.getState().setCurrentRealm(realmEntered.realmId);
            // Cycle-8 C1: also sync the OverworldScene's stale currentRealm copy
            // so the C1 candidate filter (and the existing columnBounds binding)
            // immediately switch to the new realm. Without this, the filter
            // keeps the previous realm's column range for the rest of the
            // cycle and either '무위'-terminates the run or pushes the F4
            // fallback back into the hot path — defeats the C1 fix.
            setSceneCurrentRealmRef.current?.(realmEntered.realmId);
            setRealmOverlay({ realmId: realmEntered.realmId, key: Date.now() });
            if (realmOverlayTimerRef.current) clearTimeout(realmOverlayTimerRef.current);
            realmOverlayTimerRef.current = setTimeout(() => {
              setRealmOverlay(null);
              realmOverlayTimerRef.current = null;
            }, 3000);
          }
          // V3-H Bug A: sync OverworldScene's stale unlockedRealms copy after a
          // realm_unlocked event so DestinationResolver.choose sees the new exit landmark.
          const realmUnlocked = evs.find(e => e.type === 'realm_unlocked');
          if (realmUnlocked && realmUnlocked.type === 'realm_unlocked') {
            setSceneUnlockedRealmsRef.current?.(controller.getUnlockedRealms());
          }
          // Cycle 106 F2 — inflation milestone events → push to FIFO VFX queue.
          // Multiple tiers in one arrival emit ascending; pushed in same order
          // (ledger guarantees uniqueness per cycle).
          for (const ev of evs) {
            if (ev.type === 'inflation_milestone') {
              pushMilestone({
                tier: ev.tier,
                thresholdLv: ev.thresholdLv,
                fromLv: ev.fromLv,
                toLv: ev.toLv,
                atAge: ev.atAge,
              });
            }
          }
          // V3-H F6: season changed → update scene bg tint. Store already updated by controller.
          const seasonChanged = evs.find(e => e.type === 'season_changed');
          if (seasonChanged && seasonChanged.type === 'season_changed') {
            setSceneSeasonRef.current?.(seasonChanged.season);
          }
          // Cycle 108 F1: fate roll modal. Controller emits fate_roll_required
          // when hero would die in combat AND fate is still available this cycle.
          // Mount modal — player chooses A/B within 5s or auto-decline. Resolve
          // callback re-enters the hero_died processing pipeline (see below).
          const fateRollRequired = evs.find(e => e.type === 'fate_roll_required');
          if (fateRollRequired && fateRollRequired.type === 'fate_roll_required') {
            setFateRollModal({
              oldLevel: fateRollRequired.oldLevel,
              pendingDeathPenaltyNewLevel: fateRollRequired.pendingDeathPenaltyNewLevel,
            });
          }
          // Cycle 109 F1: boss intro modal. EncounterEngine emits boss_intro_offered
          // *before* battle_started when kind === 'boss' AND eligible. Mount
          // modal — player picks idx within 8s or auto-choose cards[0]. Resolve
          // callback applies buff + re-enters resolveEncounter for the actual
          // boss combat (events are spliced in below).
          const bossIntroOffered = evs.find(e => e.type === 'boss_intro_offered');
          if (bossIntroOffered && bossIntroOffered.type === 'boss_intro_offered') {
            setBossIntroModal({
              landmarkId: bossIntroOffered.landmarkId,
              cards: bossIntroOffered.cards,
            });
          }
          // Cycle 110 F1: realm fork modal. CycleControllerV2 emits
          // realm_fork_offered before performing realm transition when fork
          // is eligible (cap < 4 + not pending). Mount modal — player picks
          // risk/safe within 6s or auto-choose (trait-based). Resolve callback
          // applies buff + performs deferred realm transition (events spliced
          // in below).
          const realmForkOffered = evs.find(e => e.type === 'realm_fork_offered');
          if (realmForkOffered && realmForkOffered.type === 'realm_fork_offered') {
            setRealmForkModal({
              oldRealm: realmForkOffered.oldRealm,
              newRealm: realmForkOffered.newRealm,
              riskCard: realmForkOffered.riskCard,
              safeCard: realmForkOffered.safeCard,
              autoChoice: realmForkOffered.autoChoice,
            });
          }
          // V3-H E1 + B3: hero_died comes from handleArrival (EncounterEngine emits it).
          // It is NOT a top-level OverworldScene event — move detection here alongside
          // the other evs.find() checks so the auto-rejuv timer actually fires.
          //
          // Cycle-11 C10-A: branch on cause. '전사' = B3 free post-mortem rejuv
          // (영원한 영웅). '자연사' = age cap reached, cycle ends — no free rejuv
          // (would otherwise loop hero forever between age 70 → 65 → 70).
          const heroDied = evs.find(e => e.type === 'hero_died');
          if (heroDied && heroDied.type === 'hero_died') {
            if (heroDied.cause === '전사') {
              // V3-H B3: 영웅은 불멸 — 사망 후 2초 극적 여운, 자동 5년 회춘.
              // 회춘은 빛 비용 없이 무료 (영원한 영웅 컨셉).
              // hero.staggered=true 이므로 다음 arrival 에서 HP 가 자동 회복됨.
              if (autoRejuvTimerRef.current) clearTimeout(autoRejuvTimerRef.current);
              autoRejuvTimerRef.current = setTimeout(() => {
                autoRejuvTimerRef.current = null;
                const ctrl = useCycleStoreV2.getState().controller;
                if (!ctrl) return;
                ctrl.getHero().rejuvenate(5);
                ctrl.recordRejuvenation(5);
                // Cycle-14: clear the controller's stuck endCause = '전사' so the
                // post-resurrection arrivals can again fire `maybeEmitNaturalDeath`
                // (age >= 70) and `maybeAutoRejuvenate` (age >= 65 + light).
                // Without this clear, the hero is locked to the B3 path for the
                // rest of the cycle and dev-server-only ages past 70 without
                // ever ending the cycle — exactly the cycle 13 baseline failure.
                ctrl.clearEndCause();
              }, 2000);
            } else {
              // Cycle-11 C10-A: '자연사' terminates the cycle. Controller has
              // already set endCause = '자연사' so endCycle finalizes with the
              // correct cause. Mirrors the OverworldScene 'cycle_ended' path so
              // the rest of the cleanup (clearHeroSnapshot, sponsorGold spend,
              // run reset) runs the same way as a 무위 / abandon termination.
              if (!endedRef.current) {
                endedRef.current = true;
                useGameStore.getState().clearHeroSnapshot();
                clearMilestones();
                endCycle('자연사');
                onCycleEnd();
              }
            }
          }
          // Cycle-6 P0: 매 arrival 마다 hero snapshot 자동 저장.
          // 기존엔 "메인 메뉴" 버튼 클릭 경로에서만 saveHeroSnapshot 이 호출되어
          // page reload / 앱 강제 종료 / 브라우저 충돌 시 run.heroSnapshot 이 null
          // 인 채로 다음 부팅을 맞이했다 → MainMenu 가 "이어하기" 버튼을 못 띄움.
          // 매 landmark 도착 시점에 직렬화해서 store 에 밀어넣는다. zustand persist
          // 가 set() 마다 localStorage 에 flush 하므로 cycle 도중 어느 시점에 죽어도
          // 다음 부팅에서 동일 hero 로 복원된다 (V3-H B2 의 HeroEntity.restore 활용).
          //
          // cycle_ended 직후 clearHeroSnapshot 이 호출되므로 자연 종료 후엔 다시
          // null 로 돌아간다 (정상 흐름).
          useGameStore.getState().saveHeroSnapshot(controller.getHero().serialize(controller.getSeed()));
        }
        if (event.type === 'cycle_ended' && !endedRef.current) {
          endedRef.current = true;
          // V3-H B2: cycle ends naturally → clear hero snapshot so next visit spawns fresh hero.
          useGameStore.getState().clearHeroSnapshot();
          // Cycle 106 F2 — flush in-flight milestone VFX queue at cycle boundary.
          clearMilestones();
          // Cycle-5 F3: forward optional cause (e.g. '무위') so the saga
          // records pathfinder-exhausted runs distinctly from '자연사'.
          endCycle(event.cause);
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
      speed * moveMul,
      controller.getCurrentRealmId() ?? undefined,
      controller.getUnlockedRealms(),
      useGameStore.getState().meta.season.current,
    ).then(g => {
      destroy = g.destroy;
      setSceneSpeedRef.current = g.setSpeed;
      setSceneUnlockedRealmsRef.current = g.setUnlockedRealms;
      setSceneCurrentRealmRef.current = g.setCurrentRealm;
      setSceneSeasonRef.current = g.setSeason;
      setSceneCosmeticTintRef.current = g.setCosmeticTintOverride;
      getSceneRef.current = g.getScene;
    });

    return () => {
      setSceneSpeedRef.current = null;
      setSceneUnlockedRealmsRef.current = null;
      setSceneCurrentRealmRef.current = null;
      setSceneSeasonRef.current = null;
      setSceneCosmeticTintRef.current = null;
      getSceneRef.current = null;
      if (chapterOverlayTimerRef.current) {
        clearTimeout(chapterOverlayTimerRef.current);
        chapterOverlayTimerRef.current = null;
      }
      if (realmOverlayTimerRef.current) {
        clearTimeout(realmOverlayTimerRef.current);
        realmOverlayTimerRef.current = null;
      }
      if (autoRejuvTimerRef.current) {
        clearTimeout(autoRejuvTimerRef.current);
        autoRejuvTimerRef.current = null;
      }
      destroy?.();
    };
    // `speed` is intentionally not a dep — mutations are forwarded to the
    // scene via the effect below without remounting the Phaser game.
  }, [status, controller, onCycleEnd, endCycle]);

  useEffect(() => {
    setSceneSpeedRef.current?.(speed * moveMul);
  }, [speed, moveMul]);

  // Cycle 177 — SeasonalModifier cosmeticTint wire chain 7/n. controller 의
  // currentRealm 또는 meta.seasonStartedAt 변화 시 active modifier 의
  // cosmeticTint → hex 매핑을 OverworldScene 에 적용.
  const currentRealmId = controller?.getCurrentRealmId() ?? null;
  const seasonStartedAt = meta.seasonStartedAt ?? 0;
  useEffect(() => {
    if (!setSceneCosmeticTintRef.current) return;
    if (!currentRealmId) {
      setSceneCosmeticTintRef.current(null);
      return;
    }
    const token = getActiveCosmeticTint(seasonStartedAt, currentRealmId);
    const hex = token ? cosmeticTintToHex(token) : null;
    setSceneCosmeticTintRef.current(hex);
  }, [currentRealmId, seasonStartedAt]);

  if (status === 'idle' || !controller) {
    return <div style={{ padding: 24, color: '#eee' }}>사이클이 시작되지 않았습니다.</div>;
  }

  const hero = controller.getHero();

  return (
    <div data-testid="overworld-runner" style={{ position: 'relative' }}>
      <div data-testid="overworld-hud" style={hudStyle}>
        {/* Cycle 4 B1: 3-row chunk — 정체성 / 자원 / 액션. 모바일 word-break 방지. */}
        {/* Row 1: 정체성 — 이름 / 나이·시기 / 직업·LV / HP */}
        <div data-testid="hud-row-identity" style={hudRowStyle(13)}>
          <span data-testid="hud-name" style={hudChipStyle}>{hero.emoji} {hero.name}</span>
          <span data-testid="hud-age" style={hudChipStyle}>{hero.age}세 · {hero.chapter}</span>
          <span data-testid="hud-job-lv" style={{...hudChipStyle, cursor: 'pointer'}} onClick={() => setShowAtkBreakdown(v => !v)}>{hero.job} · LV {formatCompact(hero.level)}</span>
          <span data-testid="hud-hp" style={{...hudChipStyle, color: hero.hp < hero.hpMax * 0.25 ? '#f44' : hero.hp < hero.hpMax * 0.5 ? '#fa0' : '#8f8'}}>HP {formatCompact(hero.hp)}/{formatCompact(hero.hpMax)}</span>
        </div>
        {/* Row 2: 자원 — 빛 / 재생 / 계절 / 지역 */}
        <div data-testid="hud-row-resource" style={hudRowStyle(12)}>
          <span data-testid="hud-gold" style={hudChipStyle}>💰 {formatCompact(hero.gold)}</span>
          <span data-testid="hud-fights" style={hudChipStyle}>⚔️ {formatCompact(controller.getTotalFights())}</span>
          <span data-testid="hud-light" style={hudChipStyle}>빛 {Math.floor(meta.light ?? 0)}</span>
          <span data-testid="hud-rejuvenation" style={hudChipStyle}>재생 #{hero.rejuvenationCount}</span>
          <span data-testid="hud-season" style={hudChipStyle}>{seasonEmoji(meta.season.current)} {seasonNameKR(meta.season.current)}</span>
          <span data-testid="hud-realm" style={hudChipStyle}>
            {(() => {
              const r = REALM_CATALOG.find(rr => rr.id === run.currentRealmId);
              return `🌍 ${r?.nameKR ?? '?'} (${meta.unlockedRealms.length}/${REALM_CATALOG.length})`;
            })()}
          </span>
        </div>
        {/* Row 3: 액션 — 3 버튼 + 속도 프리셋. whiteSpace: nowrap 으로 future label 추가 시에도 word-break 방지. */}
        <div data-testid="hud-row-action" style={{ ...hudRowStyle(12), gap: 6 }}>
          <button
            type="button"
            onClick={() => setSpendModalOpen(true)}
            data-testid="open-spend-modal"
            style={hudActionBtnStyle}
          >
            신의 메뉴
          </button>
          <button
            type="button"
            onClick={() => setSagaModalOpen(true)}
            data-testid="open-saga-modal"
            style={hudActionBtnStyle}
          >
            📖 기록
          </button>
          <button
            type="button"
            data-testid="open-status-modal"
            onClick={() => setStatusModalOpen(true)}
            style={hudActionBtnStyle}
          >
            📊 상태
          </button>
          <button
            type="button"
            onClick={() => setStrategyOpen(true)}
            style={hudActionBtnStyle}
          >
            ⚙️ 전략
          </button>
          <span data-testid="speed-buttons" style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
            {SPEED_PRESETS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                data-testid={`speed-${s}x`}
                data-active={speed === s ? 'true' : undefined}
                style={speedBtnStyle(speed === s)}
              >
                {s}×
              </button>
            ))}
          </span>
        </div>
      </div>
      <div data-testid="light-floaters" style={{ position: 'absolute', right: 0, top: 60, pointerEvents: 'none', zIndex: 5 }}>
        {lightFloats.map((f, idx) => {
          const elapsed = Date.now() - f.createdAt;
          const opacity = Math.max(0, 1 - elapsed / FADE_MS);
          return (
            <div
              key={f.id}
              style={{
                position: 'absolute',
                right: 16 + idx * 4,
                top: idx * 18,
                color: '#ffd54f',
                fontSize: 14,
                fontWeight: 700,
                opacity,
                transition: 'opacity 0.3s',
              }}
            >
              +{f.amount.toFixed(1)}
            </div>
          );
        })}
      </div>
      <div ref={containerRef} style={{ background: '#0a0e1a', display: 'flex', justifyContent: 'center', paddingTop: 8 }} />
      <CombatOverlay />
      <DamageFloater logic={damageFloaterRef.current} />
      <BattleOutcomeBadge input={badgeInput} />
      <HudIndicatorBarComponent weather={currentWeather} isNight={isNight} influencingTraits={influencingTraits} inspirationRemaining={inspirationRemaining} activeEvents={activeEvents} />
      <DestinationBadge kind={currentDestination} />
      <StatDeltaPopup entries={statDeltaEntries} />
      <ExpBreakdownBadge breakdown={expBreakdown} />
      <HealBreakdownBadge healResult={healResult} heroHpMax={hero.hpMax} />
      <EventChoiceToast eventSubType={eventSubType} onDone={() => setEventSubType(null)} />
      {showAtkBreakdown && (
        <div style={{ position: 'absolute', top: 60, left: 8, zIndex: 20 }}>
          <AtkBreakdownTooltip breakdown={controller.getAtkBreakdownInput() ? computeAtkBreakdown(controller.getAtkBreakdownInput()!) : null} />
        </div>
      )}
      <ComboStreakBadge combo={momentumDisplay} />
      <div style={{ position: 'absolute', left: 8, bottom: 80, zIndex: 10 }}>
        <RelicPanel />
      </div>
      {spendModalOpen && <SpendModal onClose={() => setSpendModalOpen(false)} />}
      {npcModal && <NpcEncounterModal npcInstanceId={npcModal.npcInstanceId} onClose={() => setNpcModal(null)} />}
      {sagaModalOpen && <SagaBookModal onClose={() => setSagaModalOpen(false)} />}
      {statusModalOpen && <StatusModal onClose={() => setStatusModalOpen(false)} />}
      {strategyOpen && <StrategyPanel onClose={() => setStrategyOpen(false)} />}
      {shrineModalOpen && <ShrineChoiceModal onClose={() => setShrineModalOpen(false)} />}
      {dangerModalOpen && <DangerChoiceModal onClose={() => setDangerModalOpen(false)} />}
      {fateRollModal && (
        <FateRollModal
          oldLevel={fateRollModal.oldLevel}
          pendingDeathPenaltyNewLevel={fateRollModal.pendingDeathPenaltyNewLevel}
          onResolve={(choice) => {
            // Close modal first so the React render doesn't double-fire.
            setFateRollModal(null);
            const ctrl = useCycleStoreV2.getState().controller;
            if (!ctrl) return;
            const resolveEvents = ctrl.resolveFateRoll(choice);
            // Light from these events is 0 by design (excluded list). Still
            // push HUD tick + log refresh + saga snapshot so UI reflects the
            // hero state changes (hp on accept, level penalty on decline).
            setHudTick(n => n + 1);
            setLogEntries(ctrl.getRecentSagaEvents(LOG_LIMIT));
            useGameStore.getState().saveHeroSnapshot(ctrl.getHero().serialize(ctrl.getSeed()));
            // If the resolution produced a hero_died (= decline path),
            // re-enter the existing B3 free-rejuv timer flow. Mirrors the
            // arrival handler's hero_died branch (see line 234 below).
            const heroDied = resolveEvents.find(e => e.type === 'hero_died');
            if (heroDied && heroDied.type === 'hero_died') {
              if (heroDied.cause === '전사') {
                if (autoRejuvTimerRef.current) clearTimeout(autoRejuvTimerRef.current);
                autoRejuvTimerRef.current = setTimeout(() => {
                  autoRejuvTimerRef.current = null;
                  const ctrl2 = useCycleStoreV2.getState().controller;
                  if (!ctrl2) return;
                  ctrl2.getHero().rejuvenate(5);
                  ctrl2.recordRejuvenation(5);
                  ctrl2.clearEndCause();
                }, 2000);
              }
            }
          }}
        />
      )}
      {bossIntroModal && (
        <BossIntroModal
          cards={bossIntroModal.cards}
          onResolve={(idx) => {
            // Close modal first to avoid double-fire from React render.
            setBossIntroModal(null);
            const ctrl = useCycleStoreV2.getState().controller;
            if (!ctrl) return;
            const resolveEvents = ctrl.resolveBossIntro(idx);
            // Light excluded for the boss_intro_resolved / boss_intro_offered
            // pair; but the inner boss combat events DO emit light. Mirror the
            // main arrival handler's lightDelta pass on this synthesized stream.
            const meta = useGameStore.getState().meta;
            const lightMul = getLightRateMul(meta) * ctrl.getBossIntroLightMul();
            const lightDelta = computeLightDelta(resolveEvents, 'boss');
            const totalLight = lightDelta.delta * lightMul;
            if (totalLight > 0) {
              useGameStore.setState(s => ({
                ...s,
                meta: { ...s.meta, light: (s.meta.light ?? 0) + totalLight },
              }));
              emitLightFloat(totalLight);
            }
            // Push milestone VFX for any tier crossings produced by the
            // boss-after-intro combat.
            for (const ev of resolveEvents) {
              if (ev.type === 'inflation_milestone') {
                pushMilestone({
                  tier: ev.tier,
                  thresholdLv: ev.thresholdLv,
                  fromLv: ev.fromLv,
                  toLv: ev.toLv,
                  atAge: ev.atAge,
                });
              }
            }
            // If the boss intro combat surfaced fate_roll_required (hero died
            // mid-boss + fate roll still available), mount the FateRollModal
            // exactly like the regular arrival handler does.
            const fateRoll = resolveEvents.find(e => e.type === 'fate_roll_required');
            if (fateRoll && fateRoll.type === 'fate_roll_required') {
              setFateRollModal({
                oldLevel: fateRoll.oldLevel,
                pendingDeathPenaltyNewLevel: fateRoll.pendingDeathPenaltyNewLevel,
              });
            }
            // If hero_died emitted directly (no fate roll left), re-enter the
            // existing B3 free-rejuv timer (cause='전사' branch only — boss
            // intro is mid-cycle, '자연사' impossible from this path).
            const heroDied = resolveEvents.find(e => e.type === 'hero_died');
            if (heroDied && heroDied.type === 'hero_died' && heroDied.cause === '전사') {
              if (autoRejuvTimerRef.current) clearTimeout(autoRejuvTimerRef.current);
              autoRejuvTimerRef.current = setTimeout(() => {
                autoRejuvTimerRef.current = null;
                const ctrl2 = useCycleStoreV2.getState().controller;
                if (!ctrl2) return;
                ctrl2.getHero().rejuvenate(5);
                ctrl2.recordRejuvenation(5);
                ctrl2.clearEndCause();
              }, 2000);
            }
            setHudTick(n => n + 1);
            setLogEntries(ctrl.getRecentSagaEvents(LOG_LIMIT));
            useGameStore.getState().saveHeroSnapshot(ctrl.getHero().serialize(ctrl.getSeed()));
          }}
        />
      )}
      {realmForkModal && (
        <RealmForkModal
          oldRealm={realmForkModal.oldRealm}
          newRealm={realmForkModal.newRealm}
          newRealmNameKR={findRealm(realmForkModal.newRealm).nameKR}
          riskCard={realmForkModal.riskCard}
          safeCard={realmForkModal.safeCard}
          autoChoice={realmForkModal.autoChoice}
          onResolve={(choice) => {
            setRealmForkModal(null);
            const ctrl = useCycleStoreV2.getState().controller;
            if (!ctrl) return;
            const resolveEvents = ctrl.resolveRealmFork(choice);
            // realm_fork_resolved + realm_entered are excluded from light emit
            // (decision channel). No light delta from these events.
            // Sync the realm_entered side effects (store + scene + overlay)
            // exactly like the main arrival handler does.
            const realmEntered = resolveEvents.find(e => e.type === 'realm_entered');
            if (realmEntered && realmEntered.type === 'realm_entered') {
              useGameStore.getState().setCurrentRealm(realmEntered.realmId);
              setSceneCurrentRealmRef.current?.(realmEntered.realmId);
              setRealmOverlay({ realmId: realmEntered.realmId, key: Date.now() });
              if (realmOverlayTimerRef.current) clearTimeout(realmOverlayTimerRef.current);
              realmOverlayTimerRef.current = setTimeout(() => {
                setRealmOverlay(null);
                realmOverlayTimerRef.current = null;
              }, 2000);
            }
            setHudTick(n => n + 1);
            setLogEntries(ctrl.getRecentSagaEvents(LOG_LIMIT));
            useGameStore.getState().saveHeroSnapshot(ctrl.getHero().serialize(ctrl.getSeed()));
          }}
        />
      )}

      <style>{`
        @keyframes forgeChapterFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes forgeLightFloat {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
      `}</style>
      {/* Cycle 106 F2 — inflation milestone VFX overlay (queue head only). */}
      {milestoneQueue.length > 0 && (() => {
        const head = milestoneQueue[0]!;
        return (
          <InflationMilestoneVFX
            key={head.id}
            tier={head.tier}
            thresholdLv={head.thresholdLv}
            onDone={dequeueMilestone}
          />
        );
      })()}
      {comboDisplay >= 1 && (
        <div style={{
          position: 'absolute', top: 8, right: 8, padding: '6px 12px',
          background: comboDisplay >= 10 ? 'rgba(255,80,0,0.92)' : 'rgba(255,150,0,0.85)',
          borderRadius: 8,
          color: '#fff', fontSize: comboDisplay >= 10 ? 15 : 13, fontWeight: 700, zIndex: 15,
          transition: 'all 0.2s ease',
          boxShadow: comboDisplay >= 10 ? '0 0 8px rgba(255,100,0,0.6)' : 'none',
        }} data-testid="combo-hud">
          🔥 ×{comboDisplay} {comboDisplay >= 10 ? 'COMBO!' : 'combo'}
        </div>
      )}
      {momentumDisplay >= 1 && (
        <div style={{
          position: 'absolute', top: comboDisplay >= 1 ? 42 : 8, right: 8, padding: '5px 10px',
          background: 'rgba(100,180,255,0.85)', borderRadius: 8,
          color: '#fff', fontSize: 12, fontWeight: 600, zIndex: 15,
          transition: 'all 0.2s ease',
        }} data-testid="momentum-hud">
          ⚡ ATK +{momentumDisplay * 2}%
        </div>
      )}
      {battleFlavor && (
        <div style={{
          position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
          color: '#eee', fontSize: 14, fontWeight: 600, fontStyle: 'italic',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)', pointerEvents: 'none', zIndex: 18,
        }} data-testid="battle-flavor">
          {battleFlavor}
        </div>
      )}
      {dangerFlash && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          color: '#ff4444', fontSize: 22, fontWeight: 700, textShadow: '0 0 8px #ff0000',
          animation: 'fadeIn 0.2s ease-out', pointerEvents: 'none', zIndex: 20,
        }} data-testid="danger-zone-flash">
          ⚠️ 강적 출현!
        </div>
      )}
      {milestoneFlash !== null && (
        <div style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
          color: '#ffd700', fontSize: 26, fontWeight: 700, textShadow: '0 0 12px #ffaa00',
          animation: 'fadeIn 0.3s ease-out', pointerEvents: 'none', zIndex: 21,
          textAlign: 'center',
        }} data-testid="milestone-flash">
          🎉 LV {milestoneFlash.toLocaleString()} 돌파!
        </div>
      )}
      {chapterOverlay && (
        <div
          key={chapterOverlay.key}
          style={chapterOverlayStyle}
          data-testid="chapter-transition-overlay"
        >
          <div style={{ fontSize: 28, fontWeight: 700 }}>📖 {chapterOverlay.toChapter}</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{chapterOverlay.atAge}세</div>
        </div>
      )}
      {realmOverlay && (
        <div
          key={realmOverlay.key}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffd54f',
            fontSize: 24,
            fontWeight: 700,
            background: 'rgba(0,0,0,0.7)',
            padding: '12px 24px',
            borderRadius: 8,
            animation: 'forgeChapterFade 3s ease-in-out forwards',
            pointerEvents: 'none',
            zIndex: 50,
          }}
          data-testid="realm-entered-overlay"
        >
          다음 영역: {(() => {
            const r = REALM_CATALOG.find(rr => rr.id === realmOverlay.realmId);
            return r?.nameKR ?? realmOverlay.realmId;
          })()}
          <div style={{ fontSize: 12, fontWeight: 400, marginTop: 6, opacity: 0.8, maxWidth: 280, lineHeight: 1.5 }}>
            {getRealmLore(realmOverlay.realmId)}
          </div>
        </div>
      )}

      <div data-testid="event-log" style={logPanelStyle}>
        <div style={logHeaderStyle}>최근 일대기</div>
        {logEntries.length === 0 ? (
          <div style={{ opacity: 0.4, fontSize: 12 }}>아직 사건이 없다.</div>
        ) : (
          [...logEntries].reverse().map((ev, i) => {
            // Cycle 268: NPC/family event 시 kind emoji prefix (UI guide visual hierarchy 3단계).
            const kindEmoji = (ev.type === 'npcEncounter' || ev.type === 'npcDeath')
              ? getNpcKindEmoji(((ev.payload as { kind?: NpcEntity['kind'] } | undefined)?.kind) ?? 'friend')
              : '';
            return (
              <div key={`${logEntries.length - i}-${ev.age}`} style={logRowStyle(eventColor(ev.type))}>
                <span style={{ opacity: 0.6, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{ev.age}세</span>
                {kindEmoji && <span style={{ marginRight: 4 }}>{kindEmoji}</span>}
                {ev.narrativeText}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        data-testid="open-main-menu"
        onClick={() => {
          // V3-H B2: 자동 저장 — controller 의 현재 hero snapshot 을 run 에 persist.
          const ctrl = useCycleStoreV2.getState().controller;
          if (ctrl) {
            const heroSnap = ctrl.getHero().serialize(ctrl.getSeed());
            useGameStore.getState().saveHeroSnapshot(heroSnap);
          }
          if (onExitToMenu) {
            onExitToMenu();
          } else {
            window.history.back();
          }
        }}
        style={mainMenuBtnStyle}
      >
        메인 메뉴
      </button>
    </div>
  );
}

function eventColor(type: SagaEvent['type']): string {
  switch (type) {
    case 'battle':       return '#fca5a5';
    case 'levelUp':      return '#fde68a';
    case 'drop':         return '#a7f3d0';
    case 'jobUnlock':    return '#fbbf24';
    case 'skillLearned': return '#c4b5fd';
    case 'shrine':       return '#7dd3fc';
    case 'moralChoice':  return '#f0abfc';
    case 'death':        return '#f87171';
    // Cycle 261: NPC/family event 시각 위계 surface (UI guide 발견).
    case 'npcEncounter': return '#bef264';
    case 'npcDeath':     return '#fdba74';
    case 'familyEvent':  return '#fbcfe8';
    default:             return '#cbd5e1';
  }
}

const hudStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 16px',
  background: '#1f2937',
  color: '#cbd5e1',
  fontSize: 13,
  borderBottom: '1px solid #334155',
  position: 'relative',
  zIndex: 10,
};

function speedBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 12,
    background: active ? '#fbbf24' : 'transparent',
    color: active ? '#0f172a' : '#cbd5e1',
    border: active ? '1px solid #fbbf24' : '1px solid #475569',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
    whiteSpace: 'nowrap',
  };
}

/** Cycle 4 B1: HUD row 공통 스타일. flex + wrap + gap. fontSize 만 row 별 override. */
function hudRowStyle(fontSize: number): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize,
    flexWrap: 'wrap',
    width: '100%',
  };
}

/** Cycle 4 B1: HUD chip 공통 — word-break 방지. */
const hudChipStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
};

/** Cycle 4 B1: action 버튼 공통 — 44px 터치 타겟 (4a Mobile UX) + nowrap. */
const hudActionBtnStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '4px 10px',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const logPanelStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '12px auto 0',
  padding: '10px 12px',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 6,
  color: '#cbd5e1',
  fontSize: 12,
  lineHeight: 1.7,
  maxHeight: 220,
  overflowY: 'auto',
};

const logHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  opacity: 0.5,
  marginBottom: 6,
};

const chapterOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20%',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '16px 24px',
  background: 'rgba(0,0,0,0.7)',
  color: '#ffd166',
  borderRadius: 8,
  pointerEvents: 'none',
  zIndex: 100,
  animation: 'forgeChapterFade 2s ease-in-out forwards',
  textAlign: 'center',
};

function logRowStyle(color: string): React.CSSProperties {
  return {
    color,
    paddingLeft: 8,
    borderLeft: `2px solid ${color}55`,
    marginBottom: 2,
  };
}

const mainMenuBtnStyle: React.CSSProperties = {
  margin: '12px auto',
  display: 'block',
  minHeight: 44,
  padding: '8px 16px',
  background: '#3b4252',
  color: '#eee',
  border: '1px solid #555',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
