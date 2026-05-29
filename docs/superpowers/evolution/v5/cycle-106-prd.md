# Cycles 106-108 PRD — Sound Bootstrap · BattleScene Extract · VictoryQuotes Wire

category: sound → system → narrative

## 한 줄

Era 5 에서 유일하게 0 예산인 sound 를 최초 wire 하고, 1200 줄 임계에 접근한 BattleScene 을 선제 분할하며, integration backlog 1순위 victoryQuotes 를 cycle-end 화면에 노출한다.

## 평가 핀포인트

- 게임비평가: BGM 성숙도 0/3 — 플레이 30초 내 "무음 게임" 인상. victoryQuotes 미노출로 cycle 종료가 감정 없는 숫자 리포트.
- 스토리작가: victoryQuotes 30+ age 방치. 7개 유령 서사 중 idleMusings 만 wired (C104). 나머지 6개 중 victoryQuotes 가 가장 high-impact (cycle 종료 = 감정 정점).
- 레벨디자이너: BattleScene 1110 lines → 1200 제한 임박. 새 기능 추가 불가 상태. encounter logic 분리 필수.

## 카테고리 균형 검증 (룰 9)

| Cycle | Category | 검증 |
|-------|----------|------|
| 104 | narrative | — |
| 105 | visual | — |
| **106** | **sound** | narrative→visual→sound: 3연속 아님 ✓ |
| **107** | **system** | visual→sound→system: 3연속 아님 ✓ |
| **108** | **narrative** | sound→system→narrative: 3연속 아님 ✓ |

Era 5 budget 변화: sound 0→1, system 1→2, narrative 1→2.

---

## Cycle 106 — BGM First Wire (Sound Bootstrap)

category: sound

### 한 줄
placeholder BGM track 을 실제 Howler.js (또는 Web Audio) loop 으로 재생하여 sound maturity 를 0→1 로 끌어올린다.

### 기능 요구사항

#### F1. AudioManager 싱글턴 + MainMenu BGM loop

- **목적**: era 5 에서 sound 예산 0. 비주얼 성숙도 BGM(0) 이 전체 26/30 의 유일한 0점 영역. "무음 게임" 인상이 30초 내 이탈 원인.
- **동작**:
  1. `games/inflation-rpg/src/audio/AudioManager.ts` 신규 생성
  2. Howler.js 또는 native `Audio` API wrapper — `playBGM(trackId)`, `stopBGM()`, `setVolume(0-1)`, `mute()`
  3. MainMenu mount 시 `playBGM('main-theme')` 호출
  4. BattleScene 진입 시 `playBGM('battle')` 으로 crossfade (300ms)
  5. 파일 미존재 시 silent fallback (console.warn only, crash 금지)
  6. localStorage `audio_muted` key 로 mute 상태 persist
- **수용 기준**:
  - `AudioManager.ts` 파일 존재 + export `playBGM`, `stopBGM`, `setVolume`, `mute`
  - MainMenu 진입 시 `<audio>` element 또는 Howler instance 생성 확인 (Playwright: `page.evaluate(() => document.querySelectorAll('audio').length) >= 1` 또는 AudioManager.isPlaying === true)
  - 파일 404 시 에러 throw 없음 (unit test: mock fetch reject → no unhandled error)
  - mute toggle 후 reload → mute 상태 유지 (localStorage 검증)
- **반대 기준 (NOT this)**:
  - 실제 음원 작곡/편곡 아님 — CC0 placeholder (Kenney 등) 또는 빈 파일로도 통과
  - SFX (hit sound, level-up chime) 는 이 cycle 범위 밖
  - 볼륨 슬라이더 UI 는 backlog

#### F2. Mute 버튼 (MainMenu 우상단)

- **목적**: sound 가 존재하면 끌 수 있어야 한다. 최소 UX.
- **동작**:
  1. MainMenu 우상단에 🔊/🔇 토글 아이콘 (16×16)
  2. 클릭 시 `AudioManager.mute()` 호출 + 아이콘 교체
  3. 상태는 AudioManager 내부 + localStorage 동기화
- **수용 기준**:
  - 뮤트 버튼 DOM element 존재 (`[data-testid="mute-toggle"]`)
  - 클릭 후 aria-label 변경 (muted ↔ unmuted)
  - Playwright: 클릭 2회 후 원래 상태 복귀 확인

### Integration proof path

```
audio/AudioManager.ts (export playBGM/stopBGM)
  → scenes/MainMenu.tsx (import & call on mount)
  → scenes/BattleScene.ts (import & crossfade on scene enter)
  → Player hears BGM → sound maturity 0→1
```

### 성공 지표
- 비주얼 성숙도 BGM: 0 → 1 (+1)
- Era 5 sound budget: 0 → 1
- Silent fallback: 파일 부재 시에도 게임 정상 동작

---

## Cycle 107 — BattleScene Encounter Extract

category: system

### 한 줄
BattleScene.ts 에서 encounter/spawn 로직 (~250 lines) 을 `EncounterEngine.ts` 로 추출하여 1110→~860 lines 로 축소, 1200 제한 대비 headroom 확보.

### 기능 요구사항

#### F1. EncounterEngine 추출

- **목적**: BattleScene 1110 lines → 1200 limit 까지 90 lines 여유. 새 기능 (C108 victoryQuotes 등) 추가 불가 상태. encounter spawn/despawn/boss-check 로직 분리로 ~250 lines 절감.
- **동작**:
  1. `games/inflation-rpg/src/battle/EncounterEngine.ts` 신규 생성
  2. BattleScene 에서 다음 메서드 이동:
     - `spawnEnemy()` + 관련 helper
     - `checkBossCondition()`
     - `handleEnemyDeath()`
     - `getEnemyPool()` (region-based enemy selection)
  3. EncounterEngine 은 순수 로직 클래스 (Phaser 의존 없음). BattleScene 은 렌더 + EncounterEngine 호출만 담당.
  4. BattleScene 에서 `this.encounter = new EncounterEngine(config)` 으로 위임
  5. 기존 public API (외부에서 호출하는 메서드) 시그니처 변경 금지
- **수용 기준**:
  - BattleScene.ts line count ≤ 900 (현재 1110 대비 Δ ≥ -200)
  - EncounterEngine.ts 존재 + export class EncounterEngine
  - 기존 BattleScene 관련 테스트 전체 통과 (behavioral 변경 없음)
  - `pnpm typecheck` PASS
  - `pnpm circular` baseline 유지 (새 순환 의존 0)
- **반대 기준 (NOT this)**:
  - Phaser Scene 분할 아님 — 로직 추출만 (렌더는 BattleScene 잔류)
  - 기능 추가 아님 — 순수 refactor
  - AutoBattleController 리팩터 아님 (별도 파일, 이미 분리됨)

#### F2. EncounterEngine unit test suite

- **목적**: 추출된 로직의 독립 테스트 가능성 확보. BattleScene 통합 테스트 의존도 감소.
- **동작**:
  1. `EncounterEngine.test.ts` 신규
  2. 최소 케이스: (a) spawnEnemy 호출 시 올바른 enemy 반환, (b) boss condition threshold, (c) enemy pool region 매핑
  3. Phaser mock 불필요 (순수 로직)
- **수용 기준**:
  - EncounterEngine.test.ts 존재 + ≥ 3 test cases
  - `pnpm test` 전체 통과

### Integration proof path

```
BattleScene.ts (render + delegate)
  → EncounterEngine.ts (spawn/boss/death logic)
  → AutoBattleController.ts (combat math)
  → 기존 플레이 경험 동일, 파일 구조만 개선
```

### 성공 지표
- BattleScene line count: 1110 → ≤900 (Δ ≥ -200)
- 새 파일: EncounterEngine.ts + EncounterEngine.test.ts
- Regression: 0 (기존 테스트 전체 통과)

---

## Cycle 108 — VictoryQuotes Wire to Cycle-End Screen

category: narrative

### 한 줄
integration backlog 1순위 victoryQuotes (age 30+) 를 cycle 종료 화면에 표시하여 유령 서사 → 플레이어 가시 서사로 전환한다.

### 기능 요구사항

#### F1. Cycle-End Screen victoryQuote 표시

- **목적**: victoryQuotes.ts 가 30+ cycle 방치. cycle 종료 = 감정 정점인데 현재 숫자 리포트만 표시. 한 줄 명언이 감정 마무리 역할.
- **동작**:
  1. cycle 종료 화면 (CycleEndModal 또는 동등) 에 quote 영역 추가
  2. `getVictoryQuote(heroId, cycleResult)` 호출 — heroId + 결과(자연사/강제종료/목표달성) 에 따른 quote 선택
  3. 표시 위치: 레벨/점수 아래, 폰트 italic, 1-2줄
  4. quote 가 null/undefined 시 영역 숨김 (graceful fallback)
  5. heroId 불일치 시 generic quote pool 에서 fallback 선택
- **수용 기준**:
  - `import { getVictoryQuote } from '../data/victoryQuotes'` 가 cycle-end 관련 파일에 존재
  - cycle 종료 시 quote 텍스트 DOM 노출 확인 (Playwright: `[data-testid="victory-quote"]` 존재 + text content length > 0)
  - heroId mismatch 시 crash 없음 (unit test: 존재하지 않는 ID → generic fallback)
  - 3회 cycle 종료 시 ≥ 2 서로 다른 quote 출현 (랜덤성 확인)
- **반대 기준 (NOT this)**:
  - 새 quote 데이터 작성 아님 — 기존 victoryQuotes.ts 데이터 활용
  - cycle-end 화면 레이아웃 대폭 변경 아님 — quote 한 줄 추가만
  - characterBackstories ID 수정은 이 cycle 범위 밖

#### F2. victoryQuotes ID 호환 검증 + fallback

- **목적**: characterBackstories 는 wrong IDs 로 삭제 대상. victoryQuotes 도 같은 문제가 있을 수 있음. 사전 검증 + fallback 보장.
- **동작**:
  1. victoryQuotes.ts 의 heroId 목록 vs 실제 hero registry ID 비교
  2. 불일치 ID 발견 시: (a) 매핑 테이블로 수정 가능하면 수정, (b) 불가능하면 해당 entry 를 generic pool 로 이동
  3. getVictoryQuote 에 `fallbackToGeneric` 로직 내장
- **수용 기준**:
  - getVictoryQuote(invalidId) 호출 시 non-null string 반환 (generic fallback)
  - victoryQuotes.ts 의 모든 ID 가 hero registry 에 존재하거나 generic pool 처리됨
  - unit test: 유효 ID → specific quote, 무효 ID → generic quote

### Integration proof path

```
victoryQuotes.ts (export getVictoryQuote)
  → CycleEndModal.tsx (import & call on cycle end)
  → Player sees emotional quote at cycle conclusion
  → Integration backlog: victoryQuotes age 30+ → 0
```

### 성공 지표
- Integration backlog victoryQuotes: age 30+ → 0 (wired)
- 유령 서사 함수 잔여: 6 → 5 (-1)
- Cycle-end 감정 밀도: 숫자 only → 숫자 + 한 줄 quote

---

## 우선순위 요약

| 순위 | Cycle | Category | 핵심 | 근거 |
|------|-------|----------|------|------|
| 1 | 106 | sound | AudioManager + BGM wire | era 5 유일 0-budget, 3인 무음 지적 |
| 2 | 107 | system | BattleScene extract | 1200 limit 임박, 신규 기능 차단 상태 |
| 3 | 108 | narrative | victoryQuotes wire | integration backlog #1, age 30+ |

## 우선순위 외 backlog

- regionLore → world map tooltips (integration backlog #2, age 15+) — cycle 109+ 후보
- characterBackstories ID 수정 or 삭제 (age 31, structural debt)
- SFX layer (hit/levelup/milestone chime) — sound maturity 1→2 는 cycle 110+
- BattleScene 추가 분할 (render layer extract) — 107 이후 필요 시
- BGM 볼륨 슬라이더 설정 UI — sound 가 안정화된 후

## 비고

- **의존성**: Cycle 108 은 Cycle 107 에 약의존 (BattleScene 축소 후 cycle-end 쪽 수정 여유 확보). 단 직접 block 은 아님.
- **리스크**: Cycle 106 sound — Howler.js 추가 시 bundle size +30KB. 대안으로 native Audio API 사용 시 0KB 추가. executor 재량.
- **리스크**: Cycle 107 extract — Phaser lifecycle hook 이 BattleScene method 를 직접 호출하는 경우 시그니처 유지 필수. 사전 grep 으로 external caller 확인 의무.
- **컨셉 가드**: 3개 모두 "기존 자산 연결" (sound placeholder, encounter logic, victoryQuotes data). 새 게임 시스템 추가 아님. idle hero sim 정체성 유지.
- **characterBackstories**: wrong IDs 문제는 이번 3-cycle 에서 미처리. victoryQuotes wire (C108) 시 ID 검증 패턴을 확립하면 characterBackstories 처리의 템플릿이 됨. cycle 109+ 에서 삭제 or 수정 결정.
