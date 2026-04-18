# Inflation RPG Faithful Clone — 설계 스펙

**날짜**: 2026-04-18  
**대상**: `games/inflation-rpg` 전면 재작성  
**상태**: 승인됨

---

## 1. 목표

원작 Inflation RPG(Tatsuki Sasaki, 모바일 v1.34)의 핵심 메카닉을 최대한 충실하게 재현한다.
기존 `games/inflation-rpg`(4클래스 한국 테마 이식본)를 이 설계로 교체한다.

### 범위에 포함

- 배틀 포인트(BP) 시스템 (30 시작, 조우·패배·보스 BP 규칙 전부)
- 캐릭터 16종 (한국 민속 테마 유지, 4종 → 16종으로 확장)
- 스탯 5종 (HP·ATK·DEF·AGI·LUC) + SP 배분 팝업
- 장비 인벤토리 (weapon×10 + armor×10 + accessory×3, 런 간 영구 계승)
- 월드맵 14개 구역 + 보스 구역 BP 보상
- 베이스 어빌리티 (보스 처치마다 +1, 최대 Lv.18)
- 하드모드 (Lv.100,000 해금, 경험치×10·골드×5·패배 페널티 강화)
- 저장/불러오기 (런 간 메타 상태 영구 보존)

### 범위에 미포함

- 멀티플레이어, 랭킹
- 인앱결제, 광고
- 원작 픽셀 아트 에셋 (직접 제작 또는 이모지·SVG 대체)

---

## 2. 기술 아키텍처

### 렌더링 전략: React 쉘 + Phaser 전투 아일랜드

```
React (모든 화면)
  ├── MainMenu
  ├── ClassSelect      ← 16캐릭터 4×4 그리드
  ├── WorldMap         ← CSS 노드 맵
  ├── StatAlloc        ← 레벨업 팝업 (전투 중 오버레이)
  ├── Inventory
  ├── Shop
  └── GameOver

Battle.tsx            ← Phaser.Game mount/unmount (전투 시에만)
  └── BattleScene.ts  ← 전투 로직·애니메이션 (Phaser)
```

전투 화면을 제외한 모든 화면은 React + CSS로 구현한다.
Phaser는 `Battle.tsx`가 마운트될 때만 인스턴스를 생성하고, 전투 종료 시 `game.destroy(true)`로 해제한다.

### 디렉토리 구조

```
games/inflation-rpg/src/
├── startGame.ts              ← ForgeGameInstance 진입점 (React root 마운트)
├── App.tsx                   ← 화면 라우터 (useState 기반)
├── store/
│   └── gameStore.ts          ← Zustand (RunState + MetaState)
├── screens/
│   ├── MainMenu.tsx
│   ├── ClassSelect.tsx
│   ├── WorldMap.tsx
│   ├── Battle.tsx            ← Phaser 캔버스 컨테이너
│   ├── StatAlloc.tsx         ← 스탯 배분 팝업
│   ├── Inventory.tsx
│   ├── Shop.tsx
│   └── GameOver.tsx
├── battle/
│   ├── BattleGame.ts         ← Phaser.Game 팩토리
│   └── BattleScene.ts        ← 전투 씬
├── systems/                  ← 순수 로직 (UI 의존성 없음)
│   ├── bp.ts                 ← BP 증감 규칙
│   ├── stats.ts              ← 스탯 계산 (기본값·SP·장비 배율)
│   ├── equipment.ts          ← 슬롯 관리, 드롭 로직
│   ├── experience.ts         ← 레벨업, SP 부여
│   └── progression.ts        ← 베이스 어빌리티, 하드모드 해금
├── data/
│   ├── characters.ts         ← 16종 정의
│   ├── monsters.ts
│   ├── equipment.ts
│   ├── maps.ts               ← 14개 구역
│   └── bosses.ts
└── styles/
    └── game.css              ← CSS 커스텀 프로퍼티 + 공통 스타일
```

### @forge/core 연동

구현 코드는 "3의 규칙"에 따라 게임 #2가 같은 코드를 필요로 하기 전까지 `games/inflation-rpg` 내부에 유지한다.  
단, 아래 **타입·계약**은 `@forge/core`에 추가한다:

```ts
// packages/2d-core/src/ 에 추가
export interface IStatSystem {
  calcFinalStat(base: number, spPoints: number, percentMult: number, charMult: number, baseAbilityMult: number): number
  calcDamageReduction(def: number): number   // DEF / (DEF + 500)
  calcCritChance(agi: number, luc: number): number
}

export interface IBattlePointSystem {
  onEncounter(current: number): number       // -1
  onDefeat(current: number, isHard: boolean): number  // -3 또는 -5
  onBossKill(current: number, reward: number): number // +reward
}

export interface IProgressionSystem {
  isHardModeUnlocked(bestRunLevel: number): boolean   // >= 100_000
  calcBaseAbilityMult(level: number): number          // 1 + level * 0.05
  onBossKill(bossId: string, killed: string[], maxLevel: number): string[]
}

export interface CharacterClassBase {
  id: string
  nameKR: string
  statMultipliers: Record<'hp' | 'atk' | 'def' | 'agi' | 'luc', number>
  unlockSoulGrade: number
}

// 세이브 스키마 (기존 createSaveEnvelopeSchema 사용)
export const runSaveSchema = createSaveEnvelopeSchema<MetaState>(metaStateSchema)
```

---

## 3. 상태 관리

### Zustand store 구조

```ts
// 런마다 리셋
interface RunState {
  characterId: string
  level: number
  bp: number                    // 시작: 30
  statPoints: number            // 미배분 SP
  stats: {
    hp: number; atk: number; def: number; agi: number; luc: number
    allocated: { hp: number; atk: number; def: number; agi: number; luc: number }
  }
  currentArea: string
  isHardMode: boolean
  monstersDefeated: number
}

// 런 간 영구 보존 → localStorage (createSaveEnvelopeSchema)
interface MetaState {
  inventory: {
    weapons: Equipment[]        // max 10
    armors: Equipment[]         // max 10
    accessories: Equipment[]    // max 3
  }
  baseAbilityLevel: number      // 0~18
  soulGrade: number             // 캐릭터 해금 기준
  hardModeUnlocked: boolean
  characterLevels: Record<string, number>
  bestRunLevel: number
  normalBossesKilled: string[]      // 베이스어빌리티용 (Set은 JSON 직렬화 불가)
  hardBossesKilled: string[]
}
```

---

## 4. 핵심 메카닉 명세

### 4-1. 배틀 포인트 (BP)

| 이벤트 | BP 변화 | 비고 |
|---|---|---|
| 런 시작 | +30 | 고정 |
| 몬스터 조우 | -1 | |
| 전투 패배 (노멀) | -2 추가 | 총 -3 |
| 전투 패배 (하드) | -4 추가 | 총 -5 |
| 보스 처치 | +xBP | 구역마다 다름 |
| BP링 악세사리 | +1~+7 | 장착 시 런 내 유효 |
| BP == 0 | 런 종료 | GameOver 화면 |

### 4-2. 스탯 시스템

레벨업마다 **4 SP** 지급. 스탯별 기본값과 SP당 증가량:

| 스탯 | 기본값 | SP당 증가 | 역할 |
|---|---|---|---|
| HP | 100 | +5 | 생존력 |
| ATK | 10 | +3 | 기본 공격력 |
| DEF | 10 | +3 | 피해 감소 (감쇠 적용) |
| AGI | 5 | +2 | 콤보·크리티컬 확률 |
| LUC | 5 | +2 | 드롭율·골드·크리티컬율 |

**최종 스탯 계산**:
```
finalATK = (baseATK + spATK) × weaponPercentMult × baseAbilityMult × charMult
damageReduction = DEF / (DEF + 500)   // 감쇠 상수 500
critChance = 0.05 + (AGI × 0.001) + (LUC × 0.0005)
expRequired(lv) = floor(100 × lv^1.8)
```

### 4-3. 장비 시스템

- **슬롯 한도**: weapon 10, armor 10, accessory 3
- 한도 도달 시 해당 슬롯 드롭 중단 (원작 동일)
- 희귀도: common / rare / epic / legendary
- **고정값(flat) vs %값(percent)**: 후반부로 갈수록 % 장비가 압도적 유리
- 런 종료 시 모든 장비는 MetaState.inventory에 보존

### 4-4. 전투 흐름

```
구역 선택 → BP -1
  → 몬스터 스폰 (구역 레벨 범위 내 랜덤)
  → 자동 전투 루프:
      공격 계산 → 크리/콤보 판정 → 피해 적용
      경험치 획득 → 레벨업 시 StatAlloc 팝업
  → 승리: 골드·장비 드롭, WorldMap 복귀
  → 패배: BP 추가 감소, HP 전액 회복, WorldMap 복귀
```

### 4-5. 베이스 어빌리티

- 보스 처치(첫 번째 처치만) → 전 캐릭터 공통 베이스 어빌리티 Lv.+1
- 노멀 9보스 + 하드 9보스 = 최대 Lv.18
- 효과: `baseAbilityMult = 1 + level × 0.05` (Lv.18 → ×1.9)

### 4-6. 하드모드

- 해금 조건: `MetaState.bestRunLevel >= 100_000`
- 경험치 ×10, 골드 ×5
- 패배 페널티: BP -5 (노멀 -3)
- 별도 베이스 어빌리티 트랙 (+9 추가)

---

## 5. 데이터: 캐릭터 16종

| 그룹 | 캐릭터 | 특화 | 해금 |
|---|---|---|---|
| 기본 (4) | 화랑, 무당, 초의, 검객 | 균형형 | 처음부터 |
| 공격 (4) | 착호갑사, 도사, 야차, 궁수 | ATK·크리 | 영혼등급 2~4 |
| 방어 (4) | 의녀, 장수, 승병, 거사 | HP·DEF | 영혼등급 3~5 |
| 특수 (4) | 천관, 용녀, 귀신, 선인 | LUC·특수효과 | 영혼등급 6~9 |

---

## 6. 데이터: 월드맵 14개 구역

| 구역 | 권장 레벨 | 보스 | BP 보상 |
|---|---|---|---|
| 마을 입구 | 1~50 | — | — |
| 주막 거리 | 30~200 | — | — |
| 도깨비 고개 | 100~500 | 도깨비 대장 | +3 |
| 백두 관문 | 500~2K | 관문 수호신 | +3 |
| 금강산 기슭 | 1K~5K | — | — |
| 용궁 어귀 | 3K~10K | 해신 | +4 |
| 흑룡 소굴 | 8K~30K | 흑룡 | +5 |
| 저승 입구 | 20K~80K | 저승사자 | +5 |
| 천상계 | 60K~200K | 옥황상제 | +6 |
| 혼돈의 땅 | 150K~500K | 혼돈신 | +6 |
| 시간의 틈 | 400K~1M | — | — |
| 하드전용 구역 × 3 | (하드모드) | 하드보스 × 3 | +4~+6 |
| 최종 구역 | 500K+ | 최종보스 | +8 |

---

## 7. UI 설계

- **테마**: 다크 (#0f0f14 배경, #f0c060 강조색)
- **아이콘**: Lucide React (UI 버튼·탭) + 이모지 (아이템·몬스터)
- **폰트**: 시스템 폰트 (`'Apple SD Gothic Neo', 'Noto Sans KR'`)
- **레이아웃**: 모바일 우선 (360~430px 폭 기준), CSS Grid/Flexbox

---

## 8. 테스트 전략

| 레이어 | 도구 | 대상 |
|---|---|---|
| 순수 로직 | Vitest | `systems/` 전체 — BP, 스탯, 장비, 레벨업, 하드모드 |
| React UI | Vitest + Testing Library | ClassSelect, Inventory, StatAlloc |
| 세이브/로드 | Vitest | MetaState 직렬화·역직렬화 |
| E2E | Playwright | 런 완주 1회 (캐릭터 선택 → 전투 3회 → 게임오버) |

`systems/`는 UI 의존성 없이 순수 함수로 설계한다. 이후 게임 #2가 같은 시스템을 필요로 할 때 `@forge/core`로 코드 이동만으로 승격 가능하도록 인터페이스를 먼저 `@forge/core`에 정의한다.

---

## 9. 마이그레이션 계획

기존 `games/inflation-rpg` 코드를 교체한다.

1. 기존 `src/game/` 전체 삭제
2. 위 디렉토리 구조로 새 파일 스캐폴드
3. 기존 `ClassData.ts`의 4종 클래스 데이터를 새 `data/characters.ts`로 이전 후 12종 추가
4. 기존 `BattleScene.ts`의 전투 로직을 `systems/` + `battle/BattleScene.ts`으로 분리 재작성
5. `startGame.ts`: `Phaser.Game` 직접 생성 → React root 마운트로 교체
6. `@forge/core`에 인터페이스 추가
7. 테스트 작성 후 Playwright E2E 통과 확인
