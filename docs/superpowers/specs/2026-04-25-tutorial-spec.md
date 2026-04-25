# 설계 스펙: Phase 4c Tutorial

> **상태**: Draft, 2026-04-25
> **결정권자**: kwanghan-bae
> **결정**: T1=A (핵심 흐름 7 단계), T2=S2 (메인메뉴 1회 자동 + "다시" 버튼)

## 0. 요약

inflation-rpg 신규 유저 온보딩. Content Expansion 후 콘텐츠 폭발(61 몬스터 / 109 보스 / 던전 / 32 스킬 / 28 퀘스트 / 합성) 로 학습 부담 증가 → 7 단계 오버레이 가이드.

## 1. 7 단계 흐름

| Step | 화면 | 안내 |
| --- | --- | --- |
| 1 | main-menu | "환영한다. 이제 너의 모험이 시작된다. '시작'을 눌러라." |
| 2 | class-select | "16 클래스 중 하나를 골라라. 각 클래스는 고유 패시브 + 액티브 스킬 2개를 가진다." |
| 3 | world-map / region-map | "조선 평야부터 시작한다. 첫 area '마을 입구'를 클릭." |
| 4 | dungeon | "던전은 5-10 stage 로 구성된다. 마지막 stage 는 보스. 자동 전투니 지켜만 봐도 된다." |
| 5 | inventory | "전투에서 얻은 장비는 여기서 장착한다. 같은 장비 3개로 합성해 다음 등급으로 올릴 수 있다." |
| 6 | (region-map) | "퀘스트는 region 마다 3-5개. 처치/수집 목표 달성 시 보상 수령." |
| 7 | (any) | "기본은 끝났다. 사망 시 stage 1 부터 다시. BP 모이면 다음 region 해금." |

## 2. 데이터 모델

### 2.1. `TutorialStep` 인터페이스 (types.ts)

```typescript
export interface TutorialStep {
  id: string;
  screen: Screen;       // 어느 화면에서 표시
  textKR: string;
  ctaKR: string;        // "다음" / "시작" 등 버튼 라벨
}
```

### 2.2. `MetaState` 확장

```typescript
export interface MetaState {
  // ... 기존
  tutorialDone: boolean;
  tutorialStep: number;  // 0-based current step (-1 = 비활성)
}
```

기본값: `tutorialDone: false`, `tutorialStep: -1`.

### 2.3. `data/tutorial.ts`

7 step 정의 + helper:
```typescript
export const TUTORIAL_STEPS: TutorialStep[];
export function getTutorialStep(index: number): TutorialStep | undefined;
```

## 3. UI

### 3.1. `TutorialOverlay` 컴포넌트

`components/TutorialOverlay.tsx`:
- fixed inset 0, `rgba(0,0,0,0.85)` backdrop, z-index 300
- 중앙 ForgePanel + textKR + "다음" / "건너뛰기" 두 ForgeButton
- 현재 step 의 `screen` 이 활성 screen 과 일치할 때만 렌더 (다른 화면에서는 hidden)

### 3.2. 활성 조건

App.tsx 또는 root 레벨에서:
```tsx
const meta = useGameStore(s => s.meta);
const screen = useGameStore(s => s.screen);
const currentStep = TUTORIAL_STEPS[meta.tutorialStep];
const showTutorial = !meta.tutorialDone && currentStep && currentStep.screen === screen;
```

### 3.3. 메인 메뉴 자동 시작

MainMenu mount 시:
- `meta.tutorialDone === false && meta.tutorialStep === -1` → `setTutorialStep(0)` 자동 호출

### 3.4. "튜토리얼 다시" 버튼

MainMenu 에 추가 — 클릭 시 `tutorialDone=false`, `tutorialStep=0`.

## 4. 액션 (gameStore)

```typescript
setTutorialStep: (index: number) => void;     // -1 비활성
advanceTutorial: () => void;                  // step++; 마지막이면 done=true, step=-1
skipTutorial: () => void;                     // done=true, step=-1
restartTutorial: () => void;                  // done=false, step=0
```

## 5. Save 마이그레이션

기존 save 의 `MetaState` 가 `tutorialDone/tutorialStep` 누락 시 기본값 주입:
```typescript
tutorialDone: meta.tutorialDone ?? false,
tutorialStep: meta.tutorialStep ?? -1,
```

## 6. 성공 기준

- [ ] 새 게임 시작 → MainMenu 자동 진입 시 step 1 모달 표시
- [ ] "다음" 클릭 시 step++ → 화면 전환에 따라 다음 step 모달 표시
- [ ] "건너뛰기" 클릭 시 즉시 done=true 처리
- [ ] 7 step 완주 시 done=true
- [ ] MainMenu 의 "튜토리얼 다시" 버튼이 done=false 로 reset
- [ ] 기존 save 호환 (마이그레이션 default 주입)
- [ ] 단위 테스트 ≥ 5 (TutorialOverlay 렌더링, advanceTutorial, skipTutorial, restartTutorial, 자동 시작)

## 7. 알려진 리스크

| 리스크 | 완화 |
| --- | --- |
| 화면 전환 시 모달이 이전 화면 step 으로 잠시 보임 | screen 일치 체크로 즉시 hide. 새 screen 의 step 도달 시 다시 표시. |
| 사용자가 step 3 던전 진입 안 하면 진행 막힘 | 각 step 의 "다음" 은 클릭만 하면 advanceTutorial. 다음 화면 전환은 게임 로직에 맡김. |
| 액션 trigger 강제 (e.g., area 클릭 강제) — 시간 부족 | 1차 도입은 "다음" 버튼만. 액션 trigger 는 미래 enhancement. |

## 8. 기각된 대안

| 대안 | 기각 사유 |
| --- | --- |
| 인터랙티브 강제 (특정 버튼만 클릭 가능) | 구현 복잡. 1차 도입은 단순. |
| Tooltip 화살표 가리키기 | 모바일 화면 좁아 시각적 혼란. modal 통일. |
| 30 step 상세 가이드 | 학습 곡선 강요. 7 step 으로 핵심만. |

## 9. 구현 분할

- T1: types.ts 확장 (TutorialStep, MetaState)
- T2: data/tutorial.ts (7 steps)
- T3: gameStore actions + 마이그레이션
- T4: TutorialOverlay.tsx + 테스트
- T5: App.tsx 마운트 + screen 체크
- T6: MainMenu 자동 시작 + "다시" 버튼
- T7: 단위 테스트
- T8: 통합 검증 + tag

8 task. Phase tag: `phase-4c-tutorial-complete`.
