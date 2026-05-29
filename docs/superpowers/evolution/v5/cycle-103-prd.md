# Cycles 103-105 PRD — Inflation Identity Restoration

## 개요

3인 평가에서 공통 지적된 핵심 약점: **"inflation이라는 이름에도 불구하고 숫자가 선형 성장하며, 기존 데이터가 유령 상태"**. 이 3-cycle 묶음은 게임의 정체성인 "폭발적 수치 성장"을 실제 플레이어 경험으로 복원한다.

---

## Cycle 103 — inflationCurve Wire (AutoBattleController 선형→파워곡선)

category: balance

### 한 줄
AutoBattleController의 선형 공식을 inflationCurve.ts의 6개 power-law 함수로 교체하여 진정한 inflation 곡선을 구현한다.

### 평가 핀포인트
- 게임비평가: "Inflation 시각적 부재 — 숫자 크기 스케일링 없음" (몰입 3/10의 핵심 원인)
- 레벨디자이너: "inflationCurve.ts 정의한 6개 파워곡선을 AutoBattleController가 전혀 사용하지 않음. 전투가 선형"
- 스토리작가: (직접 관련 없음, 간접적으로 "감정곡선 평탄"의 시스템적 원인)

### 기능 요구사항

#### F1. AutoBattleController 공식 교체
- **목적**: inflationCurve.ts가 50+ cycle 전 정의됐으나 미사용. v5 규칙 "데이터만 추가 금지"의 정반대 — 이미 있는 데이터를 연결해야 한다.
- **동작**:
  1. `heroAttack()` Line 188: `heroAtkBase + heroLv * 2` → `heroAtkAtLevel(heroAtkBase, heroLv)`
  2. `enemyAttack()` Line 201: `heroLv * 3` → `enemyAtkAtLevel(BASE_EATK, heroLv, bossMul)`
  3. `spawnEnemy()` Line 172: `enemyLevel * 20` → `enemyHpAtLevel(BASE_EHP, heroLv, bossMul)`
  4. Level-up HP: Line 243-244 `heroHpMax * 0.05` → `heroHpMaxAtLevel(hpBase, newLv) - heroHpMaxAtLevel(hpBase, oldLv)`
  5. `expRequiredForLevel()` Line 302-304: `10 * lv^1.3` → `expRequiredForLevel(BASE_REQ, lv)` from inflationCurve
  6. Kill EXP Line 218: `heroLv * 10 * expMul` → `expGainForKill(BASE_GAIN, heroLv) * expMul`
- **수용 기준**:
  - `import { heroAtkAtLevel, heroHpMaxAtLevel, enemyHpAtLevel, enemyAtkAtLevel, expGainForKill, expRequiredForLevel } from './inflationCurve'` 가 AutoBattleController.ts에 존재
  - 기존 선형 공식 (`heroLv * 2`, `heroLv * 3`, `enemyLevel * 20`, `heroHpMax * 0.05`, `10 * lv^1.3`, `heroLv * 10`) 이 모두 제거됨
  - AutoBattleController.test.ts 기존 테스트 통과 (숫자 조정 허용)
  - 50-cycle sim 에서 heroLv 이전 baseline 대비 성장률 Δ 측정 가능 (inflation 가속 확인)
- **반대 기준 (NOT this)**:
  - inflationCurve.ts 의 CURVE 상수 변경 금지 (이미 Sim-G 로 튜닝됨)
  - BattleScene (Phaser 렌더) 는 이 cycle에서 미수정 — AutoBattleController만 대상

#### F2. BASE 상수 추출
- **목적**: heroAtkBase 등은 loadout에서 오지만 enemy 쪽 base 값은 현재 magic number. 상수화 필요.
- **동작**:
  1. `const BASE_EHP = 20` (기존 `enemyLevel * 20`의 20)
  2. `const BASE_EATK = 3` (기존 `heroLv * 3`의 3)
  3. `const BASE_GAIN = 10` (기존 `heroLv * 10`의 10)
  4. `const BASE_REQ = 10` (기존 `10 * lv^1.3`의 10)
  5. 모두 파일 상단 또는 별도 `battleConstants.ts`에 위치
- **수용 기준**:
  - Magic number 0개 (리터럴 숫자가 공식에 직접 등장하지 않음)
  - typecheck PASS
- **반대 기준 (NOT this)**:
  - 새 밸런스 시스템 설계 아님 — 단순 상수 추출

### Integration proof path
```
inflationCurve.ts (export 6 functions)
  → AutoBattleController.ts (import & call in heroAttack/enemyAttack/spawnEnemy/levelUp/expReq)
    → CycleControllerV2.ts (uses AutoBattleController)
      → OverworldScene.ts (drives game loop)
        → Player sees exponential growth in battle
```

### 성공 지표
- Lv1→Lv50 구간: heroAtk 가 lv^1.0 곡선을 따름 (기존 선형 대비 lv50에서 ~2.5배 차이)
- Lv30+ 자연사 발생: enemy ATK lv^0.8 vs hero HP lv^0.7 → 점진적 위험 증가
- EXP 가속: expGain lv^1.8 / expReq lv^1.2 → net gain lv^0.6 가속

---

## Cycle 104 — Idle Musing Ticker (유령 서사 → 메인화면 배선)

category: narrative

### 한 줄
getIdleMusing()을 MainMenu에 15초 fade ticker로 표시하여 7개 유령 서사 중 첫 번째를 플레이어에게 노출한다.

### 평가 핀포인트
- 게임비평가: "7개 narrative 함수 런타임 미연결 (ROI=0)" — 몰입 3/10의 직접 원인
- 스토리작가: "idleMusings를 메인화면에 15초 fade ticker로 표시 — 즉시 몰입 상승"
- 레벨디자이너: (직접 관련 없음)

### 기능 요구사항

#### F1. MainMenu idle musing ticker
- **목적**: idleMusings.ts가 cycle 80대에 작성됐으나 UI caller가 0. v5 "가시성 규칙" 충족.
- **동작**:
  1. MainMenu.tsx에 하단 영역(y ~540)에 italic 텍스트 영역 추가
  2. 15초 interval로 `getIdleMusing(activeCharacterId)` 호출
  3. CSS/Phaser tween: 1초 fadeIn → 13초 hold → 1초 fadeOut → 다음 musing
  4. 캐릭터 미선택 시 표시하지 않음 (null guard)
  5. 컴포넌트 unmount 시 interval cleanup
- **수용 기준**:
  - `import { getIdleMusing } from '../data/idleMusings'` 가 MainMenu 파일에 존재
  - 메인화면 진입 후 15초 이내 musing 텍스트 최소 1회 표시
  - 3회 연속 동일 문구 미출현 (3개 중 랜덤이므로 확률적 통과)
  - Playwright smoke: 메인화면 15초 대기 후 musing 텍스트 DOM 존재 확인
- **반대 기준 (NOT this)**:
  - 새 musing 데이터 추가 금지 — 기존 16캐릭터 × 3문구 = 48개 활용
  - 복잡한 타이핑 애니메이션 불필요 — 단순 fade 충분

### Integration proof path
```
idleMusings.ts (export getIdleMusing)
  → MainMenu.tsx (import & call on 15s interval)
    → Player sees character personality text on main screen
```

### 성공 지표
- 유령 서사 함수 수: 7 → 6 (1개 연결)
- 몰입 점수 예상 상승: 3→4 (서사 존재감)
- Integration backlog age 감소: idleMusings 20+ → 0

---

## Cycle 105 — Damage Text Inflation Scaling (14px 고정 → 자릿수 비례)

category: UI

### 한 줄
showFloatingDamage의 fontSize를 데미지 자릿수에 비례하여 스케일링, inflation 체감을 시각적으로 전달한다.

### 평가 핀포인트
- 게임비평가: "데미지 14px 고정, 숫자 크기 스케일링 없음" — inflation 정체성 시각적 부재
- 레벨디자이너: (cycle 103 파워곡선 적용 후 큰 숫자가 실제로 나오므로 시각 피드백 필수)
- 스토리작가: (직접 관련 없음)

### 기능 요구사항

#### F1. 자릿수 기반 fontSize 스케일링
- **목적**: cycle 103에서 power-law 적용 후 lv50에서 데미지가 수천~수만에 도달. 14px 고정은 "숫자가 커졌다"는 쾌감을 전달하지 못함.
- **동작**:
  1. `showFloatingDamage()` (BattleScene.ts:1062) 수정
  2. fontSize 공식: `basePx + Math.min(maxBonus, Math.floor(Math.log10(amount)) * step)`
     - basePx = 14, step = 3, maxBonus = 18 → 범위 14px ~ 32px
     - 크리티컬: basePx = 20, step = 3, maxBonus = 16 → 범위 20px ~ 36px
  3. 1M+ 데미지 시 추가 시각: color를 gold(`#ffd700`)로 전환
  4. 기존 K/M 축약 표시는 유지
- **수용 기준**:
  - 데미지 1 → fontSize 14px, 데미지 10,000 → fontSize 26px, 데미지 1,000,000 → fontSize 32px (비크리티컬 기준)
  - 크리티컬 데미지 1,000,000 → fontSize 36px + gold color
  - `Math.log10` 사용으로 자릿수 비례 확인
  - 기존 crit scale punch 애니메이션 유지 (삭제 금지)
- **반대 기준 (NOT this)**:
  - 파티클 이펙트 추가 아님 — fontSize + color 변경만
  - formatNumber 유틸 (cycle 102)과 무관 — 표시 축약은 기존 로직 유지

### Integration proof path
```
BattleScene.ts showFloatingDamage()
  → heroAttack() calls showFloatingDamage(totalEnemyDmg, crit)
    → Phaser text object renders with dynamic fontSize
      → Player sees bigger numbers = bigger text (inflation dopamine)
```

### 성공 지표
- fontSize 범위: 고정 14px → 동적 14-32px (비크리)
- inflation 체감: lv1 작은 숫자 → lv50 큰 숫자 = 큰 텍스트 (시각적 성장)
- 비주얼 성숙도: 폰트 영역 1→2 (+1)

---

## 우선순위 요약

| 순위 | Cycle | 카테고리 | 핵심 | 근거 |
|------|-------|----------|------|------|
| 1 | 103 | balance | inflationCurve wire | 3인 모두 지적, 게임 정체성 직결, age 50+ |
| 2 | 104 | narrative | idle musing ticker | 2인 지적, v5 가시성 규칙, 1줄 wire |
| 3 | 105 | UI | damage text scaling | critic 지적, cycle 103 의존 (큰 숫자 필요) |

## 카테고리 검증 (룰 9)
- Cycle 101: visual (enemy bobbing)
- Cycle 102: system (number format utility)
- Cycle 103: **balance** ← visual/system 아님 ✓
- Cycle 104: **narrative** ← 3연속 아님 ✓
- Cycle 105: **UI** ← 3연속 아님 ✓

## 우선순위 외 backlog
- characterBackstories.ts 삭제 또는 ID 수정 (age 31, 스토리작가 지적)
- victoryQuotes/regionLore/bossLastWords UI wire (cycle 106+ 후보)
- 캐릭터 초상화 에셋 추가 (비주얼 4/10 대응, 에셋 작업이므로 별도 era)
- BattleScene의 resolver도 inflationCurve wire 필요 (cycle 103은 AutoBattleController만)

## 비고
- **의존성**: Cycle 105는 Cycle 103에 의존 (파워곡선 없이 큰 숫자가 안 나오므로 스케일링 의미 없음)
- **리스크**: Cycle 103 파워곡선 적용 시 기존 테스트 숫자가 대폭 변경됨. 테스트 assertion 업데이트 필수.
- **컨셉 가드**: 3개 모두 "1→수십만 레벨 폭발" 정체성 강화. 새 시스템 추가 아닌 기존 자산 연결.
