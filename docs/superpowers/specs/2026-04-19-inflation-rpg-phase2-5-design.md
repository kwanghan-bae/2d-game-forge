# Inflation RPG Phase 2.5 — 게임 완성도 설계

## 목표

이미 동작하는 Phase 2 클론 위에 두 가지 결정적 UX 결함을 수정한다:
새로고침하면 사라지는 런 상태, 그리고 아무 구역이나 바로 진입할 수 있는 레벨 게이팅 부재.

## 아키텍처

변경 파일 5개, 신규 파일 0개. 기존 구조 그대로 확장.

| 파일 | 변경 내용 |
|------|-----------|
| `src/store/gameStore.ts` | `partialize`에 `run` 추가, `abandonRun()` 액션 추가 |
| `src/screens/MainMenu.tsx` | 활성 런 감지 → "이어하기 / 새로 시작" 분기 표시 |
| `src/types.ts` | 변경 없음 (`MapArea.levelRange[0]`이 기존에 존재) |
| `src/data/maps.ts` | 변경 없음 (기존 `levelRange[0]` 값이 진입 최솟값으로 사용) |
| `src/screens/WorldMap.tsx` | `run.level >= area.levelRange[0]` 분기로 잠금/해제 렌더링 |

**전투**: 자동 방식 유지 (Phase 2 그대로).

---

## 1. Run Persistence

### Store 변경 (`gameStore.ts`)

`partialize`를 `run`도 포함하도록 확장:

```ts
// 변경 전
partialize: (state) => ({ meta: state.meta })

// 변경 후
partialize: (state) => ({ meta: state.meta, run: state.run })
```

새 액션 `abandonRun()` 추가:

```ts
abandonRun: () => set({ run: INITIAL_RUN, screen: 'main-menu' }),
```

기존 `endRun()`은 변경 없음 — 이미 `run`을 `INITIAL_RUN`으로 리셋하고 `GameOver`로 전환한다.

### MainMenu 변경 (`MainMenu.tsx`)

`run.characterId !== ''`이면 활성 런이 존재한다.

**활성 런 있을 때:**
```
[런 이어하기]          ← setScreen('world-map')
[새로 시작]            ← abandonRun() → setScreen('class-select')
```

**활성 런 없을 때 (기존):**
```
[게임 시작]            ← setScreen('class-select')
[인벤토리]
```

확인 모달 없음 — "새로 시작"은 즉시 `abandonRun()` 후 클래스 선택으로 이동. Inflation RPG 장르에서 런 포기는 흔한 행동이며 GameOver 화면이 별도로 존재한다.

---

## 2. 레벨 게이팅

### 레벨 기준

`MapArea.levelRange` 의 첫 번째 값이 그 구역의 진입 최솟값이다. 신규 필드 불필요.

| 구역 | levelRange[0] (진입 최솟값) |
|------|--------------------------|
| 마을 입구 | 1 |
| 주막 거리 | 30 |
| 도깨비 고개 | 100 |
| 백두 관문 | 500 |
| 금강산 기슭 | 1,000 |
| 용궁 어귀 | 3,000 |
| 흑룡 소굴 | 8,000 |
| 저승 입구 | 20,000 |
| 천상계 | 60,000 |
| 혼돈의 땅 | 150,000 |
| 시간의 틈 | 400,000 |
| 최종 구역 | 500,000 |
| 심연 (하드) | 100 (+ isHardMode) |
| 공허 (하드) | 5,000 (+ isHardMode) |

### WorldMap 변경 (`WorldMap.tsx`)

각 구역 버튼 렌더링 시 `isLocked` 계산:

```ts
const isLocked = run.level < area.levelRange[0];
```

**잠긴 구역:**
- 버튼 `opacity: 0.4`, `cursor: 'default'`
- `onClick` 없음 (또는 클릭 시 아무 일 없음)
- 오른쪽에 `"Lv.X 필요"` 빨간 텍스트 표시
- 구역 이름과 이모지는 그대로 표시

**열린 구역 (기존 동작 유지):**
- `onAreaClick(area.id)` → BP 차감 → 배틀로 이동

토스트/팝업 없음 — 표시 자체로 충분.

---

## 테스트 전략

| 대상 | 검증 방법 |
|------|----------|
| Run persist | `localStorage`에 `run` 포함되는지 확인 + 새로고침 후 WorldMap 상태 유지 |
| abandonRun | `run.characterId === ''` 리셋 확인 |
| 레벨 게이팅 | 레벨 1 런에서 고레벨 구역 버튼 비활성 확인 |
| 이어하기 버튼 | 활성 런 있을 때만 표시 확인 |

모든 테스트는 Vitest + `@testing-library/react`. 기존 test 패턴 그대로.

---

## 제외 범위

- 전투 인터랙션 변경 없음 (자동 유지)
- 런 요약 화면 없음 (향후 Phase 2.6 후보)
- `MapArea` 타입 구조 변경 없음
