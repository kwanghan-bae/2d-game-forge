# 설계 스펙: 콘텐츠 대확장 (5 Layer)

> **상태**: Draft, 2026-04-25
> **결정권자**: kwanghan-bae
> **배경**: forge-ui-opus 완료 후 콘텐츠 진단 — 120 areas 가 있으나
> 몬스터 8 종, 장비 15 종, 보스 9 normal areas 만 정의. 대부분 area 가
> "껍데기" 상태. 이 스펙은 inflation-rpg 의 콘텐츠 깊이를 한 phase 안에
> 대규모로 끌어올린다.

## 0. 요약 (TL;DR)

- 8 축의 변경을 **한 거대 스펙** 에 담되, **의존 순서로 5 Layer 분할**.
- 각 Layer 가 자기 phase tag 를 받음 — Layer 단위로 검증 가능.
- 스펙 1 개, plan 5 개 (Layer 단위).
- 기존 게임 저장 호환 유지 (마이그레이션 명시).

| Layer | 축 | 핵심 산출물 | Phase tag |
| --- | --- | --- | --- |
| 1 | C1+C2+C3 데이터 확장 | 몬스터 ~50 / 장비 ~50 / 보스 ~54 | `phase-content-data-complete` |
| 2 | M1 던전 | area = 5-10 stage 던전 | `phase-content-dungeon-complete` |
| 3 | M2+M4 크래프트+퀘스트 | 합성 시스템 + region 미션 | `phase-content-craft-quest-complete` |
| 4 | M3 스킬 | 클래스 16 × 액티브 2 + 패시브 1 = 48 스킬 | `phase-content-skills-complete` |
| 5 | M5 스토리 | region 진입/보스 처치 텍스트 | `phase-content-story-complete` |

---

## 1. 맥락 (Context)

### 1.1. 현재 콘텐츠 실태 (2026-04-25 기준)

| 카테고리 | 현재 | 목표 (이 스펙) |
| --- | --- | --- |
| 몬스터 종 | 8 (전 area 공유) | ~50 (region 별 5-7 종 + 공통) |
| 장비 종 | 15 (4 rarity tier) | ~50 (5-6 rarity tier + region 별 drop) |
| 보스 (normal) | 9 (9 area 만) | ~27 (모든 region 의 hub area + bossId placeholder 채움) |
| 보스 (hard) | 9 | ~27 (각 normal 보스의 hard 버전) |
| Area 구조 | 단일 전투 공간 | 5-10 stage 던전 |
| 크래프트 | 없음 | 합성 (3개 → 1 tier 상승) |
| 퀘스트 | 없음 | region 별 3-5 미션 |
| 스킬 | 패시브 1/캐릭터 | 액티브 2 + 패시브 1 / 캐릭터 |
| 스토리 | 없음 | region 진입 + 보스 처치 텍스트 |

### 1.2. 기존 코드 자산

- [`games/inflation-rpg/src/types.ts`](../../../games/inflation-rpg/src/types.ts) 의 `Monster`, `Equipment`, `Boss`, `MapArea`, `RunState`, `MetaState` 인터페이스는 그대로 활용.
- [`games/inflation-rpg/src/data/maps.ts`](../../../games/inflation-rpg/src/data/maps.ts) 의 `bossId` 필드는 이미 ~30 placeholder ID (예: `plains-ghost`, `spirit-post-guardian`, `gumiho`, `tree-spirit`) 를 사용 중. 이 placeholder 들을 Layer 1 에서 실제 보스 정의로 채운다.
- [`games/inflation-rpg/src/data/regions.ts`](../../../games/inflation-rpg/src/data/regions.ts) 의 9 region 정의는 region 정체성의 기준 — Layer 1 의 몬스터·장비 region 별 분류는 이 9 region 을 따른다.

### 1.3. 9 Region 정체성 (Layer 1 의 분류 축)

| Region ID | 이름 | 미적 | 몬스터 계열 |
| --- | --- | --- | --- |
| `plains` | 조선 평야 | 녹색 그라디언트 | 도깨비, 동물, 야적 |
| `forest` | 깊은 숲 | 어두운 녹색 | 여우, 나무 정령, 맹수 |
| `mountains` | 산악 지대 | 회색 바위 | 산짐승, 광부 영혼 |
| `coast` | 동해 해안 | 청색 | 해양 생물 (해룡, 게, 심해어) |
| `underground` | 지하 동굴 | 검정 | 광부 영혼, 동굴 거주체 |
| `heaven-realm` | 천계 | 금색 | 신수, 선인, 천사 |
| `underworld` | 저승 | 보라 | 망자, 사령, 저승사자 |
| `chaos` | 혼돈계 | 변색 | 혼돈체, 차원 침식체 |
| `final-realm` | 최종 영역 | 무지개/검정 | 최종 보스 군단 |

(상세 region 정의는 `regions.ts` 참조)

---

## 2. Layer 1 — 데이터 확장 (C1 + C2 + C3)

### 2.1. C1 몬스터 확장 — 8 → ~50 종

**원칙**:
- 9 region × 평균 5 종 region-specific + 5 공통 (모든 level) = 50 종
- 기존 8 종은 보존 (level range 재조정 + region tag 추가).
- 모든 몬스터에 `regionTags: string[]` 추가 (예: `['plains', 'forest']` 또는 `['*']` 공통).

**`Monster` 인터페이스 확장**:

```typescript
export interface Monster {
  id: string;
  nameKR: string;
  emoji: string;
  levelMin: number;
  levelMax: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  isBoss: false;
  regionTags: string[];  // ← 신규. region IDs 또는 ['*'] 공통.
}
```

**Region 별 신규 몬스터 예시 (각 region 5종)**:

- **plains**: 도깨비병사 / 들쥐 / 까마귀 / 야적 / 길잃은 영혼
- **forest**: 여우 / 청설모 / 곰 / 나무정령 / 독뱀
- **mountains**: 산양 / 산적 / 검독수리 / 광부유령 / 회색곰
- **coast**: 해룡유생 / 거북 / 게 / 인어 / 심해어
- **underground**: 박쥐 / 거미 / 광부영혼 / 골렘 / 도롱뇽
- **heaven-realm**: 선동 / 학 / 신마 / 옥토끼 / 봉황 (신수 보존)
- **underworld**: 망자 / 저승사자 / 처녀귀신 / 도깨비불 / 사령
- **chaos**: 혼돈체 / 차원침식체 / 변이체 / 시간거품 / 공허파편
- **final-realm**: (최종 보스만 — 잡몹 없음. 또는 1-2 종만)

**기존 8종 → 공통 (`regionTags: ['*']`)**: slime, goblin, tiger, dragon, ghost, undead, deity, chaos. Level range 유지.

**총 카운트**: 9 region × 5 + 8 공통 ≈ 53 종.

**파일 변경**:
- Modify: `games/inflation-rpg/src/data/monsters.ts` — 배열 확장 + `getMonstersForLevel` 시그니처에 `regionId` 추가.

```typescript
export function getMonstersForLevel(level: number, regionId?: string): Monster[] {
  return MONSTERS.filter(m =>
    m.levelMin <= level &&
    m.levelMax >= level &&
    (m.regionTags.includes('*') || (regionId && m.regionTags.includes(regionId)))
  );
}
```

**`pickMonster(level, regionId)` 호출처**: `BattleScene` 의 몬스터 스폰 로직. 현재 area 의 `regionId` 를 전달. → BattleScene 수정 필요.

### 2.2. C2 장비 확장 — 15 → ~50 종

**Rarity tier 확장**:
- 기존 4 단계: `common | rare | epic | legendary`
- 신규: `common | uncommon | rare | epic | legendary | mythic` (6 단계)

**`EquipmentRarity` type 확장**:

```typescript
export type EquipmentRarity =
  | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
```

**Region 별 고유 drop**: 각 region 의 hub area 에서 5-7 종 drop. Drop area 매핑은 기존 `dropAreaIds` 필드 활용.

**총 카운트**:
- weapons: ~15 (3 슬롯 × 5 tier 평균)
- armors: ~15
- accessories: ~12
- 합 ~42-50

**파일 변경**:
- Modify: `games/inflation-rpg/src/types.ts` — `EquipmentRarity` 6 tier
- Modify: `games/inflation-rpg/src/data/equipment.ts` — 카탈로그 확장
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx` / `Shop.tsx` — `uncommon` / `mythic` 색상 정의 추가
- Modify: `games/inflation-rpg/src/styles/game.css` — rarity 색상 변수 (`--forge-rarity-uncommon`, `--forge-rarity-mythic`).

**Mythic tier 정의**:
- `mythic` 은 final-realm 또는 hard-only 보스 drop 한정.
- 능력치는 percent stat 만 (legendary 의 ~1.5배). 합성 불가 (최상위).

### 2.3. C3 보스 확장 — 9 → ~27 normal + ~27 hard

**원칙**:
- 9 region × 평균 3 boss areas = ~27 normal boss.
- 각 normal boss 에 hard 버전 1:1 매핑 = ~27 hard boss.
- 기존 `MapArea.bossId` 의 placeholder ID 들을 모두 `bosses.ts` 에 정의.

**Placeholder 채우기 작업** (`maps.ts` 의 미정의 bossId 약 30 개):
- `plains-ghost`, `spirit-post-guardian`, `cursed-plains`, `plains-lord`, `gumiho`,
  `tree-spirit`, `black-tiger`, `cursed-tree-spirit`, `forest-ruler`,
  (mountains 영역 ~3), (coast 영역 ~3), (underground 영역 ~3),
  (heaven-realm 영역 ~3), (underworld 영역 ~3), (chaos 영역 ~3),
  (final-realm 영역 ~3), 등.

**`Boss` 인터페이스 확장**:

```typescript
export interface Boss {
  id: string;
  nameKR: string;
  emoji: string;
  areaId: string;
  bpReward: number;
  isHardMode: boolean;
  hpMult: number;
  atkMult: number;
  guaranteedDrop?: string;  // ← 신규. 보스 처치 시 보장 drop 의 equipment.id
  storyOnDefeat?: string;   // ← 신규 (Layer 5 와 연결). 처치 후 표시될 텍스트 ID
}
```

**파일 변경**:
- Modify: `games/inflation-rpg/src/types.ts`
- Modify: `games/inflation-rpg/src/data/bosses.ts` — ~54 보스 (27 normal + 27 hard)
- Modify: `games/inflation-rpg/src/data/maps.test.ts` — boss areaId integrity 검증

### 2.4. Layer 1 성공 기준

- [ ] `MONSTERS.length === 53` (또는 ±5 허용)
- [ ] `EQUIPMENT_CATALOG.length >= 42`
- [ ] `BOSSES.length >= 54` (27 normal + 27 hard)
- [ ] 모든 `MapArea.bossId` placeholder 가 `BOSSES` 에서 참조 해결
- [ ] `pnpm test` (115 + 신규 데이터 검증 ~10 = 125+ passed)
- [ ] BattleScene 이 region 별 몬스터 spawn 정상 작동
- [ ] Inventory / Shop 화면이 `uncommon`, `mythic` rarity 색상 표시
- [ ] 기존 save 호환 (rarity 4 tier 만 가진 save 도 로드 OK)

---

## 3. Layer 2 — 던전 구조 (M1)

### 3.1. 핵심 변경

**Area = 단일 전투 → 5-10 stage 던전**.

기존: `currentAreaId` → BattleScene 진입 → 무한 몬스터 처치.

신규: `currentAreaId` → DungeonScene 진입 → Stage 1 (몬스터 N마리) → Stage 2 → … → Stage final (보스 또는 강한 일반 몬스터). 모든 stage 클리어 시 area 클리어.

### 3.2. `MapArea` 확장

```typescript
export interface MapArea {
  // 기존 필드 …
  stageCount: number;       // ← 신규. 5-10. 기본 7.
  stageMonsterCount: number; // ← 신규. 한 stage 당 몬스터 수. 기본 5.
  /** 마지막 stage 가 보스인가 (bossId 와 함께 사용) */
  finalStageIsBoss: boolean; // ← 신규. bossId 있으면 true.
}
```

기본값:
- 모든 area: `stageCount = 7`, `stageMonsterCount = 5`, `finalStageIsBoss = (bossId !== undefined)`.
- 단순 area 는 stage 5, 보스 area 는 stage 10.

### 3.3. 새 Screen / Scene

- 신규 React 화면: `Dungeon.tsx` — 현재 stage 번호, 진행 바, 몬스터 처치 카운터, 보스 표시.
- 기존 `Battle.tsx` 는 단일 stage 의 BattleScene 으로 축소. Dungeon 이 Battle 을 N 회 연속 호출.
- `RunState` 에 `currentStage: number`, `dungeonRunMonstersDefeated: number` 추가.

### 3.4. Run 흐름 변경

- 사망 (HP 0): 던전 처음으로 (stage 1) — idle 게임 관례.
- 던전 클리어: `currentAreaId` 다음 area 로 자동 이동? 아니면 worldmap 로 복귀? → **worldmap 복귀** (사용자 선택권 유지).

### 3.5. UI 표시

- Dungeon 진입 시 "Stage 1/7" 진행 바.
- 몬스터 처치마다 "3/5 in stage 2" 표시.
- 마지막 stage 진입 시 보스 emoji + 이름 알림.

### 3.6. 파일 변경

- Create: `games/inflation-rpg/src/screens/Dungeon.tsx`
- Modify: `games/inflation-rpg/src/types.ts` — `MapArea` 확장, `RunState` 에 stage 필드 추가, `Screen` 에 `'dungeon'` 추가
- Modify: `games/inflation-rpg/src/data/maps.ts` — 모든 area 에 `stageCount` 등 추가 (기본값 일괄 적용)
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` — stage 단위 종료 콜백 추가
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — stage 진행 액션
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx` — area 진입 시 Dungeon 화면 전환

### 3.7. Layer 2 성공 기준

- [ ] 모든 area 진입 시 stage 1 부터 시작
- [ ] Stage 클리어 → 다음 stage 자동 진행
- [ ] Final stage 가 보스인 경우 적절한 보스 스폰
- [ ] 사망 시 stage 1 으로 리셋
- [ ] 던전 클리어 시 worldmap 복귀
- [ ] 기존 save 호환 (마이그레이션 — 진행 중 save 는 stage 1 으로 리셋)

---

## 4. Layer 3 — 크래프트 + 퀘스트 (M2 + M4)

### 4.1. M2 크래프트 시스템

**규칙**:
- 같은 `id` 장비 3개 → 다음 rarity tier 1개로 합성.
- common 3 → uncommon 1 / uncommon 3 → rare 1 / … / legendary 3 → mythic 1.
- mythic → 더 합성 안 됨.
- 합성 비용 (gold): tier 별 차등 (common→uncommon: 100g, … legendary→mythic: 100,000g).
- 합성 결과 장비: 같은 slot, 다음 tier, 능력치는 base + tier scaling.

**합성 결과 ID 규칙**:
- `w-knife-uncommon`, `w-knife-rare` 등. tier 가 같은 base id 에 suffix.

**`EQUIPMENT_CATALOG` 확장**:
- 모든 base 장비에 대해 6 tier 변형 자동 생성? 또는 명시 정의?
- 결정: **명시 정의** — 합성 가능한 장비만 6 tier 모두 정의. mythic-only drop 은 합성 비포함.

**`Inventory` 화면 변경**:
- 새 탭 "합성".
- 같은 id 장비 3개 이상 보유 시 "합성 가능" 표시.
- 합성 버튼 → confirm modal → gold 차감 + 장비 3 → 1 변환.

### 4.2. M4 퀘스트 시스템

**Quest 인터페이스**:

```typescript
export interface Quest {
  id: string;
  regionId: string;
  nameKR: string;
  description: string;
  type: 'kill_count' | 'boss_defeat' | 'item_collect';
  target: { monsterId?: string; bossId?: string; equipmentId?: string; count: number };
  reward: { gold?: number; bp?: number; equipmentId?: string };
}
```

**Region 별 미션 3-5종**:
- plains: "도깨비 100마리 처치", "마을 입구 보스 처치", "농가 들판에서 단도 3개 수집"
- forest: "여우 50마리 처치", "구미호 처치", …
- 등.

**`MetaState` 확장**:

```typescript
export interface MetaState {
  // 기존 …
  questProgress: Record<string, number>; // questId → current progress
  questsCompleted: string[];              // questId 배열
}
```

**진행 추적**:
- 몬스터 처치 시 store action 이 해당 region 의 kill_count quest progress 증가.
- 보스 처치 시 boss_defeat quest progress.
- 장비 획득 시 item_collect quest progress.

**UI**:
- WorldMap 에 region 클릭 시 "퀘스트 (3/5)" 배지 표시.
- 새 화면: `Quests.tsx` (region 진입 후 "퀘스트" 버튼). 퀘스트 목록 + 진행도 + 보상 수령 버튼.

### 4.3. Layer 3 파일 변경

- Create: `games/inflation-rpg/src/data/quests.ts`
- Create: `games/inflation-rpg/src/screens/Quests.tsx`
- Modify: `games/inflation-rpg/src/types.ts` — `Quest`, `MetaState` 확장
- Modify: `games/inflation-rpg/src/data/equipment.ts` — 6 tier 합성 변형 추가
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx` — 합성 탭
- Modify: `games/inflation-rpg/src/store/gameStore.ts` — 합성 액션 + 퀘스트 진행 추적
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx` — 퀘스트 배지

### 4.4. Layer 3 성공 기준

- [ ] 같은 장비 3개 → 1 tier 상승 합성 작동
- [ ] 합성 비용이 차감되고 장비가 3→1 로 변환
- [ ] 모든 region 에 3-5 quest 정의
- [ ] 몬스터 처치 시 quest progress 자동 증가
- [ ] 퀘스트 완료 시 보상 수령 가능
- [ ] 기존 save 호환

---

## 5. Layer 4 — 스킬 시스템 (M3)

### 5.1. 핵심

- **클래스 16 × 액티브 2 + 패시브 1 = 48 스킬**.
- 자동 전투에서 스킬이 쿨다운 후 자동 발동.
- 패시브: 항상 적용. (기존 `PassiveSkill` 인터페이스 활용)
- 액티브: 일정 쿨다운 후 자동 발동, 특수 효과 (멀티히트, AoE, HP 회복, BP 부스트 등).

### 5.2. `ActiveSkill` 신규 인터페이스

```typescript
export interface ActiveSkill {
  id: string;
  nameKR: string;
  description: string;
  cooldownSec: number;       // 발동 간격
  effect: {
    type: 'multi_hit' | 'aoe' | 'heal' | 'buff' | 'execute';
    multiplier?: number;     // 데미지 배수 (기본 atk × multiplier)
    targets?: number;        // multi_hit / aoe 의 대상 수
    healPercent?: number;    // 회복 비율
    buffStat?: StatKey;      // 버프 스탯
    buffPercent?: number;    // 버프 % 증가
    buffDurationSec?: number;
    executeThreshold?: number; // execute: HP % 이하면 즉사
  };
  vfxEmoji: string;          // 발동 시 효과 emoji
}
```

### 5.3. `Character` 인터페이스 확장

```typescript
export interface Character {
  // 기존 …
  activeSkills: [ActiveSkill, ActiveSkill]; // 정확히 2개
  // passiveSkill: PassiveSkill — 기존 유지
}
```

### 5.4. 스킬 발동 로직 (BattleScene)

```typescript
// pseudo
private skillCooldowns: Map<string, number> = new Map(); // skillId → next fire timestamp
update() {
  for (const skill of character.activeSkills) {
    if (now >= skillCooldowns.get(skill.id)) {
      this.fireSkill(skill);
      skillCooldowns.set(skill.id, now + skill.cooldownSec * 1000);
    }
  }
}
```

### 5.5. 16 캐릭터 × 2 액티브 = 32 액티브 스킬 정의

기존 16 캐릭터 (CLAUDE.md 명시) 의 컨셉에 맞춰 정의. 예시 (전체는 plan 단계):
- 전사 (warrior): "강타" (atk × 3), "방패막기" (def 30% buff 5초)
- 도적 (thief): "독묻은단검" (multi-hit 3회), "그림자은신" (회피 100% 3초)
- …

(각 캐릭터의 액티브 2 종은 plan 단계에서 구체화)

### 5.6. UI 변경

- ClassSelect 에 캐릭터 선택 시 스킬 미리보기 (액티브 2 + 패시브 1).
- BattleScene / DungeonScene 에 스킬 발동 시 emoji 효과 + 데미지 숫자 강조.
- Inventory 에 "스킬" 탭 (현재 캐릭터 스킬 정보).

### 5.7. Layer 4 파일 변경

- Create: `games/inflation-rpg/src/data/skills.ts`
- Modify: `games/inflation-rpg/src/types.ts` — `ActiveSkill`, `Character` 확장
- Modify: `games/inflation-rpg/src/data/characters.ts` — 각 캐릭터에 `activeSkills` 추가
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts` — 스킬 발동 로직
- Modify: `games/inflation-rpg/src/screens/ClassSelect.tsx` — 스킬 미리보기
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx` — 스킬 탭

### 5.8. Layer 4 성공 기준

- [ ] 16 캐릭터 모두 `activeSkills` 길이 2
- [ ] 32 액티브 스킬 정의 (`skills.ts`)
- [ ] BattleScene 에서 쿨다운 후 자동 발동
- [ ] vfxEmoji 가 화면에 표시
- [ ] ClassSelect 에서 스킬 미리보기 작동
- [ ] 기존 save 호환

---

## 6. Layer 5 — 스토리 조각 (M5)

### 6.1. 핵심

- **9 region 진입 텍스트** (각 3-5줄, 한국어 평서문 ~다체).
- **~27 normal 보스 처치 후 텍스트** (각 1-2줄).
- 텍스트는 `data/stories.ts` 에 정의.

### 6.2. `Story` 인터페이스

```typescript
export interface Story {
  id: string;
  type: 'region_enter' | 'boss_defeat';
  refId: string;  // regionId or bossId
  textKR: string; // 본문
}
```

### 6.3. UI

- Region 첫 진입 시 modal: 큰 region 이름 + emoji + 텍스트. "확인" 버튼으로 닫기.
- 보스 처치 후 GameOver 화면 또는 별도 modal 에 텍스트 표시.
- `MetaState.regionsVisited: string[]` 추가하여 첫 진입 추적 (이미 본 region 은 modal 안 띄움).

### 6.4. Layer 5 파일 변경

- Create: `games/inflation-rpg/src/data/stories.ts`
- Create: `games/inflation-rpg/src/components/StoryModal.tsx`
- Modify: `games/inflation-rpg/src/types.ts` — `Story`, `MetaState.regionsVisited`
- Modify: `games/inflation-rpg/src/screens/RegionMap.tsx` — 첫 진입 시 StoryModal
- Modify: `games/inflation-rpg/src/screens/GameOver.tsx` 또는 보스 처치 hook — boss_defeat 텍스트

### 6.5. Layer 5 성공 기준

- [ ] 9 region 진입 텍스트 정의
- [ ] ~27 normal 보스 처치 텍스트 정의
- [ ] Region 첫 진입 시 StoryModal 표시
- [ ] 보스 처치 시 텍스트 표시
- [ ] 재방문 시 modal 미표시
- [ ] 기존 save 호환 (regionsVisited 기본값 빈 배열)

---

## 7. Cross-cutting

### 7.1. 데이터 모델 변경 요약

| 인터페이스 | 추가 필드 | Layer |
| --- | --- | --- |
| `Monster` | `regionTags: string[]` | 1 |
| `EquipmentRarity` | `'uncommon' \| 'mythic'` 추가 | 1 |
| `Boss` | `guaranteedDrop?`, `storyOnDefeat?` | 1 (story field) / 5 |
| `MapArea` | `stageCount`, `stageMonsterCount`, `finalStageIsBoss` | 2 |
| `RunState` | `currentStage`, `dungeonRunMonstersDefeated` | 2 |
| `Quest` (신규) | — | 3 |
| `MetaState` | `questProgress`, `questsCompleted`, `regionsVisited` | 3 / 5 |
| `ActiveSkill` (신규) | — | 4 |
| `Character` | `activeSkills: [ActiveSkill, ActiveSkill]` | 4 |
| `Story` (신규) | — | 5 |

### 7.2. UI 일관성

- 모든 신규 컴포넌트는 forge-ui registry 의 `<ForgeButton>`, `<ForgePanel>`, `<ForgeGauge>`, `<ForgeInventoryGrid>`, `<ForgeScreen>` 사용.
- 신규 색상 토큰 필요 시 `theme-modern-dark-gold.css` 에 추가:
  - `--forge-rarity-uncommon` (white-green)
  - `--forge-rarity-mythic` (rainbow gradient or red)
  - `--forge-skill-active` (액티브 스킬 강조)

### 7.3. Save 호환 (Migration)

기존 save 의 `MetaState` / `RunState` 가 신규 필드를 안 가짐. 로드 시 누락 필드는 기본값 주입:

```typescript
// gameStore 로드 함수 (pseudo)
function migrateMetaState(loaded: Partial<MetaState>): MetaState {
  return {
    ...loaded,
    questProgress: loaded.questProgress ?? {},
    questsCompleted: loaded.questsCompleted ?? [],
    regionsVisited: loaded.regionsVisited ?? [],
    // 등 …
  } as MetaState;
}
```

기존 save 의 4 tier 장비 (`common | rare | epic | legendary`) 는 그대로 유지. 신규 `uncommon`, `mythic` 만 추가 — 기존 save 의 rarity 값이 6 tier union 의 부분집합이라 호환.

기존 save 의 `RunState.currentStage` 누락 — Layer 2 에서 진행 중 save 는 stage 1 으로 리셋.

### 7.4. Phaser BattleScene 변경 영향

- Layer 1: `pickMonster(level, regionId)` 호출 → regionId 전달 가능하도록 수정.
- Layer 2: stage 단위 종료 콜백 + DungeonScene 으로 wrap.
- Layer 4: 액티브 스킬 발동 로직 + vfxEmoji 표시.

### 7.5. forge-ui-opus 와의 관계

- 본 스펙은 inflation-rpg **콘텐츠 레이어**. Layer A (공용 규격) 에 속하는 변경 없음.
- 신규 React 컴포넌트는 모두 inflation-rpg 내부 — registry 승격 없음 (3의 규칙: 게임 #2 도착 후).
- forge-ui registry 의 컴포넌트 (`<ForgeButton>` 등) 는 그대로 소비.

---

## 8. Phase 분할 + Plan 분할

각 Layer 가 자기 plan + tag.

| Layer | Plan 파일 | Tag | 예상 task |
| --- | --- | --- | --- |
| 1 | `2026-04-25-content-layer1-data-plan.md` | `phase-content-data-complete` | 30+ |
| 2 | `2026-04-26-content-layer2-dungeon-plan.md` | `phase-content-dungeon-complete` | 25+ |
| 3 | `2026-04-27-content-layer3-craft-quest-plan.md` | `phase-content-craft-quest-complete` | 35+ |
| 4 | `2026-04-28-content-layer4-skills-plan.md` | `phase-content-skills-complete` | 50+ |
| 5 | `2026-04-29-content-layer5-story-plan.md` | `phase-content-story-complete` | 15+ |

각 Layer plan 은 **이전 Layer 가 완료된 상태에서 시작**. 의존 순서 준수.

---

## 9. 알려진 리스크

| 리스크 | 완화 |
| --- | --- |
| 데이터 양 폭발 → 게임 로딩 느려짐 | 모든 카탈로그가 const array. 빌드 타임 정적. 런타임 cost 무시 가능. |
| 6 tier rarity 색상 일관성 | 모든 색상은 `--forge-rarity-*` 토큰. `theme-modern-dark-gold.css` 에 일괄 정의. |
| Stage 단위 save 마이그레이션 | 진행 중 save 는 stage 1 으로 리셋. 사용자 안내 메시지 표시. |
| 32 액티브 스킬 균형 | 초기에는 데미지 배수 위주로 단순 정의. 게임 #2 도착 시까지 균형 조정 보류. |
| 스토리 텍스트 길이 통일 | spec 에 "3-5줄" 명시. plan 단계에서 character count 기준 (예: 100-200자) 추가. |
| Phaser BattleScene 변경 → 기존 E2E 깨짐 | Layer 2 plan 에서 E2E 갱신 task 명시 포함. |
| 기존 save 의 마이그레이션 실패 | gameStore 의 `loadFromSave` 함수에 모든 신규 필드 기본값 주입. 단위 테스트로 검증. |

---

## 10. 기각된 대안

| 대안 | 기각 사유 |
| --- | --- |
| 5 mechanic 동시 한 plan | scope 폭발, 검증 불가능. Layer 분할로 단계 검증. |
| 데이터를 외부 JSON 파일로 분리 | 빌드 타임 import 가 더 안전, 타입 검증 가능. const array 유지. |
| Mythic tier 합성 가능 (5개 → 6 tier) | 인플레이션 진행 끝점 필요. mythic 은 final-realm 한정 drop. |
| 스킬 수동 발동 (UI 버튼) | 게임 자동 전투 컨셉과 충돌. 자동 쿨다운 발동만. |
| 일일/주간 퀘스트 시스템 | 시간 시스템 구축 부담. 단발 퀘스트만. 일일/주간은 미래 phase. |
| 스킬 트리 / 강화 | 1차 도입 단계 — 트리는 미래. |
| 스토리 분기 (선택지) | idle 게임 컨셉 — 단방향 텍스트만. |

---

## 11. 성공 기준 (전체)

- [ ] 모든 5 Layer plan 작성 완료
- [ ] 각 Layer 가 자기 phase tag 부착됨
- [ ] 전체 Vitest count 200+ (현재 145 → +55 신규 데이터·로직 검증)
- [ ] 전체 typecheck / lint / circular 0 exit
- [ ] iPhone 14 E2E smoke 통과 (Dungeon 진입 + 스킬 발동 + 퀘스트 완료 + 스토리 표시)
- [ ] CLAUDE.md 의 "현재 단계" 섹션이 phase-content-* tag 들로 업데이트됨

---

## 12. 오픈 질문 / 보류

- 캐릭터별 스킬 구체 정의는 plan 단계에서 — character 16 × 2 액티브 = 32 스킬 명세 필요.
- region 별 고유 몬스터·장비 구체 정의도 plan 단계에서 — Layer 1 plan 이 5 region × 5 종 명세.
- 보스 placeholder 30 개 모두 채울지 vs 초기 ~20 개 + 나머지 future — 현재 스펙은 "전부 채움" 가정.
- Layer 4 (스킬) 의 균형은 첫 release 후 조정 예정. 1 차는 단순 데미지 배수 위주.

---

## 13. 참고 자료

- [forge-ui-opus 재설계 스펙](./2026-04-22-forge-ui-opus-redesign-spec.md) — 본 스펙이 의존하는 UI 인프라
- [CLAUDE.md](../../../CLAUDE.md) — "3의 규칙", 단방향 의존성, StartGame 계약
- [`games/inflation-rpg/src/types.ts`](../../../games/inflation-rpg/src/types.ts) — 데이터 모델
- [`games/inflation-rpg/src/data/maps.ts`](../../../games/inflation-rpg/src/data/maps.ts) — 120 area + bossId placeholder
- [`games/inflation-rpg/src/data/regions.ts`](../../../games/inflation-rpg/src/data/regions.ts) — 9 region 정의
