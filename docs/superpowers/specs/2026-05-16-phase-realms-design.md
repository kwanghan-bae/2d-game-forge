# Phase Realms — 5 던전 확장 + Phase E 부채 청산

**작성일**: 2026-05-16
**대상 게임**: `games/inflation-rpg`
**상위 spec**: `docs/superpowers/specs/2026-05-01-content-300h-design.md`
**선행 phase**: `phase-compass-complete` (Phase Compass)
**Tag (예정)**: `phase-realms-complete`

## 0. 한 줄 요약

`plains/forest/mountains` 3 던전을 **8 던전 (sea/volcano/underworld/heaven/chaos 추가)** 으로 확장하고,
Phase E (유물·Mythic) 가 남긴 known limitations 6 종을 **하나의 spec 으로** 청산한다.
콘텐츠는 기존 boss 109 / monster 130 / quest 28 의 region-cluster data 를 그대로 흡수 — 신규 콘텐츠 작업 없음.
부채 청산은 `run.playerHp` 영구화를 축으로 lifesteal / sp_steal / swift_winds / infinity_seal / light_of_truth 정합.

## 1. 배경

### 1.1 콘텐츠 측면 (D)

`src/data/bosses.ts` 와 `src/data/quests.ts` 는 이미 **8 region** 의 cluster 구조로 작성돼 있다:

- bosses.ts region 코멘트: `plains / forest / mountains / sea / volcano / underworld / heaven / chaos`
- quests.ts regionId: `plains / forest / mountains / coast / heaven-realm / chaos / final-realm / underworld`

그러나 `src/data/dungeons.ts` 의 `DUNGEONS` 는 `plains / forest / mountains` 3개만 노출되어 있고,
나머지 region 의 보스/퀘스트는 **dungeon entry 가 없어 player 가 도달할 수 없다**.

Phase Compass 의 tripwire 테스트 (`data/compass.test.ts` 의 `DUNGEONS ↔ COMPASS_ITEMS` 일치) 도
3 던전 기준으로 잡혀있어, 새 던전 추가 시 자연 catch.

### 1.2 부채 측면 (A)

Phase E 완료 시 의도적으로 받은 5+1 known limitations (memo `project_phase_e_complete.md`):

1. **lifesteal / sp_steal proc 적용 미완** — BattleScene 의 `currentHPEstimate = playerHP - monstersDefeated × dmgTaken × 0.1` 이 estimate-based.
   영구 `run.playerHp` 필드 없음. SP = stat points (skill SP 별도 자원 없음). `evaluateMythicProcs` 가 값을 계산하지만 BattleScene 의 적용은 deferred.
2. **swift_winds base-only 의도** — 현재 cooldown_mult def 에 target 없음. base/ult 양쪽 적용. 후속 polish.
3. **infinity_seal first pass** — "모든 drop ×2" 가 `applyMetaDropMult` 한정. xp 등 다른 mult 적용은 후속.
4. **light_of_truth first pass** — "수식어 마그니튜드 +25%" 가 modifier magnitude 한정. 다른 effect 적용은 후속.
5. **thorns + magic_burst** — 이미 wired. 확인만 필요.

이 모든 항목은 Phase E memo 가 "후속 polish" 또는 "post-Phase E follow-up" 으로 명시.
이번 phase 가 그 follow-up.

## 2. Scope

### 2.1 포함 (In scope)

- **D 콘텐츠**: `sea / volcano / underworld / heaven / chaos` 5 던전을 `DUNGEONS` 에 추가.
- **D unlock 시스템**: Tier-gated unlock. `DungeonUnlock` type 에 `{ type: 'tier'; minTier: number }` 추가.
- **D Compass 확장**: 던전 8 × 2 + omni = 17 `COMPASS_ITEMS`. `CompassId` literal union 확장. omni 조건 = 모든 8 mini-boss 첫 처치.
- **D UI**: `DungeonPickModal` 의 자유선택 mode 에 locked 던전 grayed + tier hint. `Relics.tsx` Compass tab 의 17 entries 표시.
- **A run.playerHp**: `RunState` 에 `playerHp: number | null` 추가. BattleScene 의 HP read/write 가 store 경유.
- **A lifesteal**: `evaluateMythicProcs` 의 lifesteal 값이 `run.playerHp` 에 실제 적용 (cap maxHp).
- **A sp_steal**: data redefine — "처치 시 모든 active skill cooldown -N초". BattleScene SkillSystem 의 remaining cooldown 에 적용.
- **A swift_winds**: `MythicEffect.target?: 'base' | 'ult' | 'both'` 추가. swift_winds = `target: 'base'`.
- **A infinity_seal**: drop_mult flag 만 → `appliesToXp / appliesToGold` flag 확장.
- **A light_of_truth**: modifier-magnitude only → effect-magnitude 의 일반화된 ×1.25 wrap.
- **A thorns/magic_burst**: 회귀 테스트만.
- **Persist v13**: STORE_VERSION 12 → 13. `migrateV12ToV13` 가 `run.playerHp` 와 `compassOwned` 신규 키 default 주입.
- **Balance-sim parity**: SimPlayer 에 lifesteal / cooldown-reduce / xp+gold mult 반영. baseline (mythic-off) 회귀 0 유지.

### 2.2 미포함 (Out of scope)

- **신규 콘텐츠 (보스/몬스터/퀘스트/장비/스킬/스토리)** — 기존 data 흡수만. 신규 작성 없음.
- **Skill SP / mana / MP 자원** — sp_steal 은 data redefine 으로 우회. 신규 자원 도입은 미래 phase.
- **HP regen tick / 자동 회복** — `run.playerHp` 는 단순 영구화. regen 메커니즘 없음.
- **Dungeon-specific 모디파이어** — 던전 별 themeColor / emoji / unlock 외 차별화 없음. boss hpMult/atkMult 가 이미 region 별로 다른 것이 사실상의 차별화.
- **20 던전 풀 확장** — 8 던전이 최종. 12 던전 더 추가는 별도 phase (region 의 sub-area 승격).
- **광고 SDK 실연결** — 별도 phase. Phase E 의 광고 stub 그대로.
- **IAP 실연결** — 별도 phase.

## 3. 상세 설계

### 3.1 D — 5 던전 확장

#### 3.1.1 신규 던전 entries

각 entry 는 기존 region cluster 의 boss/monster data 를 흡수한다.
보스 ID 는 `src/data/bosses.ts` 의 region 주석을 그대로 매핑:

| dungeon id | nameKR | emoji | themeColor | unlockGate | mini | major | sub (3개) | final |
|---|---|---|---|---|---|---|---|---|
| `sea` | 해 | 🌊 | `#2c3e50` | `{ type: 'tier', minTier: 1 }` | `wave-spirit` | `dragon-king-guard` | `ice-sea-dragon` + 2 추가 | `sea-god` |
| `volcano` | 화산 | 🌋 | `#c0392b` | `{ type: 'tier', minTier: 3 }` | (region boss 매핑) | (region boss 매핑) | (region boss 3) | (region final) |
| `underworld` | 명계 | 💀 | `#34495e` | `{ type: 'tier', minTier: 5 }` | (region boss 매핑) | (region boss 매핑) | (region boss 3) | `death-reaper` |
| `heaven` | 천계 | ☁️ | `#f1c40f` | `{ type: 'tier', minTier: 8 }` | (region boss 매핑) | (region boss 매핑) | (region boss 3) | (region final) |
| `chaos` | 혼돈 | 🌀 | `#8e44ad` | `{ type: 'tier', minTier: 12 }` | (region boss 매핑) | (region boss 매핑) | (region boss 3) | `final-boss` |

> **구현 task 에서 결정할 매핑 디테일**:
> bosses.ts 의 각 region cluster 가 보유한 보스 수가 4-9개로 다양. mini/major/sub/final 4-slot
> 매핑은 `bpReward` 가 낮은 순으로 mini → sub → major → final 로 채운다. 정확한 슬롯 할당은 spec 외 plan task 단계에서 fix.

`monsterPool` 도 동일하게 region 별 monster 매핑 (`forest-fox` 같은 region-prefix monster 가 이미 있음).
region prefix 없는 generic monster (`slime`, `goblin` 등) 는 일부 던전이 공유 가능.

#### 3.1.2 타입 확장

`src/types.ts`:

```ts
export type DungeonUnlock =
  | { type: 'start' }
  | { type: 'tier'; minTier: number };  // [신규]

export type CompassId =
  | 'plains_first' | 'plains_second'
  | 'forest_first' | 'forest_second'
  | 'mountains_first' | 'mountains_second'
  | 'sea_first' | 'sea_second'
  | 'volcano_first' | 'volcano_second'
  | 'underworld_first' | 'underworld_second'
  | 'heaven_first' | 'heaven_second'
  | 'chaos_first' | 'chaos_second'
  | 'omni';
```

`src/data/compass.ts` 의 `COMPASS_ITEMS`, `ALL_COMPASS_IDS`, `EMPTY_COMPASS_OWNED` 도 동시 확장.

#### 3.1.3 isDungeonUnlocked 시스템

`src/systems/dungeons.ts` (신규 또는 기존 확장):

```ts
export function isDungeonUnlocked(meta: MetaState, dungeon: Dungeon): boolean {
  switch (dungeon.unlockGate.type) {
    case 'start': return true;
    case 'tier':  return meta.ascTier >= dungeon.unlockGate.minTier;
  }
}
```

Pure function. unit test 로 start / tier 충족 / tier 미달 케이스 커버.

#### 3.1.4 Compass picker 의 unlock 필터

`src/systems/compass.ts`:

- `pickRandomDungeon(meta, dungeons, rng)` 가 unlock 안 된 던전을 가중치 풀에서 제외.
- `getDungeonWeight(meta, dungeonId)` 의 결과는 그대로 (unlock 검사 외부). filter 는 picker 에서.
- Edge case: unlock 된 던전이 0개 (이론상 불가, plains/forest/mountains 가 start) → fallback 으로 `dungeons[0]` 반환 + console.warn.

`awardMiniBossCompass` 의 omni trigger 조건:

```ts
const newCleared = [...meta.miniBossesCleared, dungeonId].filter(unique);
const allMiniCleared = newCleared.length >= DUNGEONS.length;  // 3 → 8 자동
```

기존 spec/code 가 이미 `DUNGEONS.length` 로 참조하므로 코드 변경 불필요. data 확장만으로 7→8 자동.

> **v12 → v13 backward compat**: 이미 v12 에서 omni 보유한 user 는 그대로 유지. 신규 던전 unlock 후 mini 처치 시 omni 재발급 idempotent (`compassOwned[omni]` 가 이미 true 면 patch null).

#### 3.1.5 UI 변경

- **`Town.tsx`**: 변화 없음. 단일 [던전 입장] 버튼 그대로.
- **`DungeonPickModal.tsx`**:
  - 자유선택 mode: 8개 던전 전부 표시. locked 던전 = grayed + tier hint ("Tier 3 도달 시 해제") + click disabled.
  - 추첨 (가중치) mode: locked 던전은 풀에서 제외되어 추첨 결과로 나오지 않음.
- **`Relics.tsx` Compass tab**: 17 entries 표시. locked 던전의 first/second 도 표시 + hint.
  - Layout: grid 2-column → 2-column 유지 (17 entries = 약 9 row). scroll 가능. 신규 layout 작업 없음.

### 3.2 A — Phase E 부채 청산

#### 3.2.1 `run.playerHp` 영구화

`src/types.ts` 의 `RunState`:

```ts
export interface RunState {
  // ... 기존 fields
  playerHp: number | null;  // [신규] null = run 시작 직후. hydrate 시 maxHp.
  featherUsed: boolean;     // 기존
}
```

**Lifecycle**:

1. Run 시작 (`startRun` action): `playerHp = null`.
2. BattleScene 진입 시: `playerHp == null` 이면 `maxHp = calcFinalStat(...,'hp', meta)` 로 hydrate. 이미 값이 있으면 그대로 유지.
3. Floor 클리어 → 다음 floor 진입: `playerHp` 유지 (carry).
4. Encounter 중 피해: `playerHp -= damage`. store action `applyDamageToPlayer(amount)`.
5. Encounter 중 lifesteal: `playerHp = min(maxHp, playerHp + amount)`. action `applyLifestealHeal(amount)`.
6. `playerHp <= 0`:
   - `feather_of_fate` 보유 + `featherUsed == false` → revive: `playerHp = maxHp`, `featherUsed = true`. BattleScene 계속.
   - 그 외 → GameOver. Run 종료 (`endRun` action). Town 복귀 후 다음 run 시작 시 `playerHp = null` reset.
7. maxHp 변동 (장비 변경 등 — 실제로는 town 에서만 발생): clamping `playerHp = min(playerHp, maxHp)`. encounter 중 clamping 없음.

**Persist invariant**: `run.playerHp` 는 persist 됨. 앱 닫고 다시 열어도 floor 진입 직전 HP 유지.

#### 3.2.2 lifesteal proc 적용

`src/systems/mythicEval.ts`:

```ts
// 기존: evaluateMythicProcs 가 { lifesteal: amount } 를 반환하지만 BattleScene 에서 미사용
// 변경: BattleScene 의 monster_killed hook 이 결과를 받아 store.applyLifestealHeal(amount) 호출
```

BattleScene 내부:

```ts
// monster killed 직후
const procResult = evaluateMythicProcs(state, 'monster_killed', { damageDone });
if (procResult.lifesteal && procResult.lifesteal > 0) {
  state.applyLifestealHeal(procResult.lifesteal);
}
```

`applyLifestealHeal(amount)`:

```ts
applyLifestealHeal: (amount) => set((s) => {
  if (!s.run) return {};
  const maxHp = calcFinalStat(/* ... 'hp' ... */);
  const newHp = Math.min(maxHp, (s.run.playerHp ?? maxHp) + amount);
  return { run: { ...s.run, playerHp: newHp } };
}),
```

#### 3.2.3 sp_steal redefine

**data/mythics.ts** 의 sp_steal mythic entry:

```ts
// 변경 전 description: "처치 시 스킬 SP +N"
// 변경 후 description: "처치 시 모든 active skill cooldown -N초"
{
  id: 'serpent_fang',
  effects: [{ type: 'proc', proc: 'sp_steal', value: 0.5 }],  // value 단위 = 초
  // ...
}
```

**`evaluateMythicProcs`** 의 sp_steal trigger ('monster_killed'):

```ts
// 변경 전: { spSteal: amount }
// 변경 후: { cooldownReduce: seconds }
```

**BattleScene SkillSystem**:

```ts
if (procResult.cooldownReduce && procResult.cooldownReduce > 0) {
  for (const skill of activeSkills) {
    skill.remainingCooldown = Math.max(0, skill.remainingCooldown - procResult.cooldownReduce);
  }
}
```

#### 3.2.4 swift_winds target 분기

`src/types.ts` 의 `MythicEffect`:

```ts
export type MythicEffect =
  | { type: 'flat_mult'; stat: StatKey; value: number }
  | { type: 'cooldown_mult'; value: number; target?: 'base' | 'ult' | 'both' }  // [target 추가]
  | { type: 'drop_mult'; value: number; appliesToXp?: boolean; appliesToGold?: boolean }  // [3.2.5]
  | { type: 'xp_mult'; value: number }
  | { type: 'proc'; proc: 'lifesteal' | 'thorns' | 'magic_burst' | 'sp_steal'; value: number }
  | { type: 'passive'; passive: 'no_death_loss' | 'revive_once' | 'magnitude_buff'; value?: number };
```

`data/mythics.ts` 의 `swift_winds`:

```ts
{ type: 'cooldown_mult', value: 0.95, target: 'base' }
```

`buildActiveSkillsForCombat` (또는 cooldown 계산 callsite):

```ts
const cooldownMults = mythicEquipped.flatMap(getEffects)
  .filter(e => e.type === 'cooldown_mult')
  .filter(e => {
    if (!e.target || e.target === 'both') return true;
    return e.target === (skill.kind === 'ultimate' ? 'ult' : 'base');
  })
  .map(e => e.value);
```

**Backward compat**: target 미지정 = 'both' (기존 동작). data 미수정 mythic 은 영향 없음.

#### 3.2.5 infinity_seal expand

`data/mythics.ts` 의 `infinity_seal`:

```ts
{ type: 'drop_mult', value: 2, appliesToXp: true, appliesToGold: true }
```

`applyMetaDropMult(base, kind, meta)` 의 drop_mult aggregator: 변화 없음 (기존 drop_mult 처리).

`applyExpGain(base, meta)`:

```ts
// 신규 xp mult factor:
const xpFromDropMult = mythicEquipped.flatMap(getEffects)
  .filter(e => e.type === 'drop_mult' && e.appliesToXp)
  .reduce((acc, e) => acc * e.value, 1);
return base * (existing factors) * xpFromDropMult;
```

`applyGoldGain(base, meta)` (신규 callsite, 기존 gold 계산이 분산되어 있으면 통합):

```ts
const goldFromDropMult = mythicEquipped.flatMap(getEffects)
  .filter(e => e.type === 'drop_mult' && e.appliesToGold)
  .reduce((acc, e) => acc * e.value, 1);
```

#### 3.2.6 light_of_truth expand

현재 light_of_truth = `{ type: 'passive', passive: 'magnitude_buff', value: 0.25 }` (또는 유사).
적용 범위 = modifier magnitude 만.

**확장**: "buff effect 의 magnitude" 일반화. 영향 받는 magnitude:

1. Modifier magnitude (기존, 그대로 유지).
2. lifesteal proc 의 value (`amount × 1.25`).
3. thorns proc 의 value (`reflectDmg × 1.25`).
4. magic_burst proc 의 value (`burstDmg × 1.25`).
5. sp_steal 의 cooldownReduce (`seconds × 1.25`).
6. flat_mult, cooldown_mult 등 stat effect: **미적용** (지나친 power creep).

`evaluateMythicProcs` 의 마지막에 `applyLightOfTruthMagnitude(result, meta)` wrap:

```ts
function applyLightOfTruthMagnitude(result: ProcResult, meta: MetaState): ProcResult {
  if (!meta.mythicEquipped.includes('light_of_truth')) return result;
  const buff = 1 + getLightOfTruthValue(meta);  // 1.25
  return {
    lifesteal: (result.lifesteal ?? 0) * buff,
    thornsDmg: (result.thornsDmg ?? 0) * buff,
    magicBurstDmg: (result.magicBurstDmg ?? 0) * buff,
    cooldownReduce: (result.cooldownReduce ?? 0) * buff,
  };
}
```

#### 3.2.7 thorns / magic_burst 회귀 테스트

Phase E memo 가 "BattleScene 에 fully wired" 라고 명시. 단, refactor 후 회귀 가능성.
신규 unit test:

- `evaluateMythicProcs` 의 thorns / magic_burst 가 옳은 value emit (기존 테스트 보강).
- light_of_truth 보유 시 ×1.25 적용 검증.

코드 변경 없음 — refactor 가 회귀를 만들지 않았는지만 lock.

### 3.3 Persist v13

`src/store/gameStore.ts`:

```ts
const STORE_VERSION = 13;  // 12 → 13

function migrateV12ToV13(state: any): any {
  // 1. run.playerHp 신설 (null = next hydrate 시 maxHp 로 채워짐)
  if (state.run && state.run.playerHp === undefined) {
    state.run.playerHp = null;
  }
  // 2. compassOwned 신규 10 키 default false
  if (state.meta && state.meta.compassOwned) {
    const next = { ...state.meta.compassOwned };
    for (const id of ALL_COMPASS_IDS) {
      if (next[id] === undefined) next[id] = false;
    }
    state.meta.compassOwned = next;
  }
  return state;
}
```

Chain: `migrateV8ToV9 → ... → migrateV11ToV12 → migrateV12ToV13`.

`INITIAL_META.compassOwned` 도 `EMPTY_COMPASS_OWNED` (17 keys) 로 갱신.
`INITIAL_RUN.playerHp` 도 null.

**Ascend reset 정책**: 기존과 동일. `meta.compassOwned` 와 `meta.miniBossesCleared / majorBossesCleared` 는 보존.

## 4. 파일별 변경 지도

```
games/inflation-rpg/src/
├── data/
│   ├── dungeons.ts          [+5 entries (sea/volcano/underworld/heaven/chaos)]
│   ├── compass.ts           [+10 entries (8 던전 × 2), ALL_COMPASS_IDS 갱신]
│   └── mythics.ts           [swift_winds.target='base' / infinity_seal flag / sp_steal description]
├── types.ts                 [CompassId union 확장 / DungeonUnlock tier / MythicEffect.target+appliesToXp/Gold / RunState.playerHp]
├── systems/
│   ├── compass.ts           [pickRandomDungeon unlock 필터]
│   ├── dungeons.ts          [신규: isDungeonUnlocked(meta, dungeon)]
│   ├── mythicEval.ts        [sp_steal redefine / lifesteal emit consume / light_of_truth wrap]
│   ├── battle.ts (or drops.ts) [applyExpGain / applyGoldGain 에 infinity_seal flag chain]
│   └── skills.ts            [cooldown_mult target 분기]
├── store/
│   └── gameStore.ts         [migrateV12ToV13 / applyDamageToPlayer / applyLifestealHeal / applyCooldownReduce / hydrate playerHp]
├── scenes/
│   └── BattleScene.ts       [currentHP estimate 제거 → run.playerHp read/write, lifesteal hook, sp_steal hook, revive 분기]
├── screens/
│   ├── DungeonPickModal.tsx [자유선택 mode 의 locked 던전 grayed + tier hint]
│   ├── Relics.tsx           [Compass tab 17 entries + locked hint]
│   └── (Town.tsx 변화 없음)
├── tools/balance-sim.ts     [SimPlayer 에 lifesteal HP 유지 / cooldown-reduce kill-rate / xp+gold mult 반영]
└── tests/* (다수)
```

## 5. Testing 계획

| 영역 | 신규 unit | e2e |
|---|---|---|
| `data/dungeons.test.ts` | +6 (5 entries integrity + tier gate field) | - |
| `data/compass.test.ts` | +5 (17 entries + DUNGEONS↔COMPASS tripwire 갱신) | - |
| `data/mythics.test.ts` | +3 (swift_winds.target / infinity_seal flags / sp_steal value 단위) | - |
| `systems/compass.test.ts` | +6 (omni 조건 8개, picker unlock 필터) | - |
| `systems/dungeons.test.ts` | +4 (isDungeonUnlocked: start/tier 충족/미달/extreme) | - |
| `systems/mythicEval.test.ts` | +12 (lifesteal emit, sp_steal=cooldownReduce, light_of_truth wrap, swift_winds target) | - |
| `systems/battle.test.ts` 또는 `drops.test.ts` | +6 (infinity_seal: drop+xp+gold) | - |
| `store/gameStore.test.ts` | +14 (migrateV12ToV13 chain, run.playerHp hydrate/clamp/revive, applyLifestealHeal, applyCooldownReduce) | - |
| `screens/DungeonPickModal.test.tsx` | +3 (locked grayed, tier hint, free-mode 8 entries) | - |
| `screens/Relics.test.tsx` | +2 (Compass tab 17 entries, locked hint) | - |
| `e2e/dungeon-unlock-flow.spec.ts` | - | 3 logical (locked 던전 표시 → tier up → unlock) × 2 = 6 |
| `e2e/lifesteal-flow.spec.ts` | - | 2 logical (lifesteal HP 회복 / sp_steal cooldown 단축) × 2 = 4 |
| **합계** | **+61 unit** | **+10 e2e** |

총 vitest: 649 → **~710**. e2e: 40 → **~50**.

## 6. Balance-sim parity

`tools/balance-sim.ts` 의 `SimPlayer` 확장:

- **lifesteal**: 처치당 회복 HP × kill rate 가 effective HP 증가. 사실상 effective DPS 증가 (생존 시간 증가 → 더 많은 처치).
- **sp_steal**: 처치당 cooldown 단축. effective DPS 증가 (skill multiplier × frequency 증가).
- **swift_winds target='base'**: base skill cooldown 만 단축 → effective DPS base-portion 만 영향.
- **infinity_seal**: drop + xp + gold ×2 → progression sim 의 ascension currency 산출 빨라짐.
- **light_of_truth**: lifesteal / thorns / magic_burst / sp_steal 의 magnitude ×1.25.

Baseline (mythic-off) 회귀 0 유지. `balance-milestones` 테스트가 catch.

## 7. Risk / Mid-task 예상 함정

### 7.1 Persist v12→v13 envelope test

Phase Compass 의 T4 처럼 envelope-shape test 가 step 을 실제 exercise 하도록 `fromVersion=12` 호출이 필수.
v12 envelope 명시 (compassOwned 7 keys + playerHp 부재) → migration 후 v13 (compassOwned 17 keys + playerHp null).

### 7.2 BattleScene HP refactor 의 estimate 의존성

`currentHPEstimate` 가 BattleScene 외에도:

- `relicNoDeathLoss` (undead_coin) BP guard 분기.
- GameOver 트리거 조건.
- UI 의 HP 표시 (HUD).

이 모든 callsite 가 `run.playerHp` 로 일괄 치환. grep 으로 `currentHPEstimate` / `monstersDefeated × dmgTaken` 패턴 catch 후 단일 task 로 cleanup.

### 7.3 17 entries Compass UI overflow

`Relics.tsx` 3rd tab 의 grid 가 7 → 17 entries. 2-column grid 면 9 row. modal 높이 조정 또는 scroll 처리.
Mobile (iPhone 14) safe area 와 충돌 가능. e2e 시각 검증 권장.

### 7.4 Tier gate UX

Locked 던전 = 자유선택 mode 에서만 visible (grayed + hint). 추첨 mode 에선 보이지 않음.
Player 가 "다른 던전 있나?" 모를 위험 → 자유선택 toggle 자체가 'omni' 또는 '2차' 보유 시에만 등장 (기존 로직).

**완화책**: locked 던전이 1개라도 있으면 자유선택 toggle 의 hint 텍스트에 "잠긴 던전 N개 — 자유 선택으로 확인" 표시. data-driven, UX 작업 최소.

### 7.5 Compass omni 조건 7→8 의 backward compat

이미 v12 에서 omni 보유한 user (3 mini 처치) 는 v13 에서도 omni 유지 (migration 이 omni: true 보존).
신규 5 던전 unlock 후 mini 처치 시 omni 재발급 안 됨 (`compassOwned[omni] === true` 면 patch null).
이는 의도된 동작 — omni 보유는 한 번 발급되면 영구.

### 7.6 region boss 매핑의 정밀도

bosses.ts 의 region 별 boss 수가 4-9개로 다양. mini/major/sub/final 4-slot 매핑이 region 별로 자연스럽지 않을 수 있음.
원칙: `bpReward` 낮은 것 = mini, 가장 높은 것 = final, 나머지 분배. plan task 단계에서 정확한 매핑 결정.

### 7.7 final-realm dungeon 부재

quest data 의 `regionId: 'final-realm'` 과 boss data 의 `final-boss` (area: 'final-realm') 가 어느 dungeon 에 속하는가?
원안: **chaos 던전의 final boss = `final-boss`**. final-realm 은 별도 dungeon 으로 만들지 않음 (8 dungeon 유지).
quest 의 `regionId: 'final-realm'` quest 는 chaos dungeon 의 한 부분으로 흡수.

## 8. Plan task 분량 추정

D 부분 ~7 task:

1. types.ts CompassId/DungeonUnlock/MythicEffect 확장
2. data/dungeons.ts 5 entries 추가
3. data/compass.ts 17 entries + tests 갱신
4. systems/dungeons.ts (isDungeonUnlocked) + tests
5. systems/compass.ts unlock 필터 + tests
6. screens/DungeonPickModal.tsx + tests
7. screens/Relics.tsx Compass tab + tests

A 부분 ~10 task:

8. types.ts RunState.playerHp + MythicEffect.target/appliesToXp/Gold (3.2.4-3.2.5)
9. store/gameStore.ts: applyDamageToPlayer / applyLifestealHeal / applyCooldownReduce + hydrate
10. BattleScene HP refactor (estimate 제거, store 경유)
11. data/mythics.ts swift_winds.target / infinity_seal flag / sp_steal description
12. systems/mythicEval.ts: sp_steal redefine + light_of_truth wrap + lifesteal hook 호출
13. systems/skills.ts (또는 cooldown 적용 callsite): cooldown_mult target 분기
14. systems/battle.ts: applyExpGain / applyGoldGain 의 infinity_seal flag
15. BattleScene revive 분기 (run.playerHp + feather_of_fate)
16. thorns/magic_burst 회귀 테스트
17. tools/balance-sim.ts 의 SimPlayer 확장

공유 ~3 task:

18. store/gameStore.ts: migrateV12ToV13 + INITIAL_META/INITIAL_RUN
19. e2e/dungeon-unlock-flow.spec.ts
20. e2e/lifesteal-flow.spec.ts

총 **20 task**. cp 끊는 지점:

- **cp1**: D 끝 (Task 1-7). 던전 5개 + Compass UI 확장 완료. 부분 merge 가능.
- **cp2**: A 핵심 (Task 8-16). 부채 청산 본체.
- **cp3**: 공유 + e2e (Task 17-20). polish.

## 9. 검증 기준

- `pnpm typecheck` 0 / `pnpm lint` 0 / `pnpm circular` 0.
- `pnpm test` 통과 (~710 tests).
- `pnpm e2e` 통과 (~50 tests).
- `pnpm --filter @forge/game-inflation-rpg balance-milestones` 회귀 0 (mythic-off baseline 동일).
- v8 → v9 → v10 → v11 → v12 → v13 migration chain 정상 (e2e seed 검증).
- Persist v13 envelope 의 `run.playerHp` / `compassOwned` 17 keys 정상.

## 10. 진행 절차

1. 이 design (spec) 사용자 review → 승인.
2. `superpowers:writing-plans` 로 task 20개 plan 작성.
3. `superpowers:subagent-driven-development` 로 task 별 implementer + spec reviewer + code reviewer 분담.
4. cp1 / cp2 / cp3 별 사용자 review checkpoint.
5. 최종 머지 `--no-ff` + tag `phase-realms-complete`.
6. 자동 memory 갱신 + 다음 session prompt 작성.

## 11. 부록 — 보스 region 매핑 sketch

`src/data/bosses.ts` 의 region 클러스터 (plan task 단계에서 정확한 slot 매핑):

- **sea**: wave-spirit / dragon-king-guard / ice-sea-dragon / sea-god / hard-sea-god / 기타 4개. mini=wave-spirit (bp 4), final=sea-god (bp 4 normal), major=ice-sea-dragon, sub=3개.
- **volcano**: volcano region cluster (lv 100k-2.1M).
- **underworld**: underworld region cluster (lv 400k-∞) + death-reaper as final.
- **heaven**: heaven region cluster (lv 2M-32M).
- **chaos**: chaos region cluster (lv 15M-∞) + final-boss as ultimate final.

정확한 boss 이름 enumeration 은 plan task 의 첫 단계에서 `src/data/bosses.ts` 의 region 코멘트 사이 boss 전수 조회로 결정.
