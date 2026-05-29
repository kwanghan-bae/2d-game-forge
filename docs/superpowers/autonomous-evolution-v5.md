# 자율진화 게임 개발 프로토콜 v5

## v4 에서 배운 것

v4 는 11 페르소나 + 5 Phase 를 명시했으나, 실행 시 오케스트레이터가 Phase A-C
를 통째로 건너뛰고 "혼자 기획 → 혼자 구현 → 혼자 검증" 루프로 102 사이클을
돌렸다. 결과: 코드는 늘어났으나 **사용되지 않는 데이터 파일** 과 **표면적 VFX**
만 쌓임. 실제 게임 품질 향상 속도가 둔화됨.

**근본 원인**: 서브에이전트 dispatch 를 "권장" 이 아닌 **gate** 로 강제하지 않았다.

---

## v5 핵심 변경

| 항목 | v4 | v5 |
|------|----|----|
| Phase 수 | 5 (A-E) | 3 (평가→구현→검증) |
| 에이전트 수 | 11 | 5 (필수 3 + 선택 2) |
| 강제 메커니즘 | 텍스트 규칙 | **파일 게이트** (파일 없으면 진행 불가) |
| 합의 Phase | 4인 교차 코멘트 | **제거** (비현실적) |
| 사이클 비용 | 높음 (전원 dispatch) | 중간 (3 필수 dispatch) |
| 미사용 코드 방지 | 없음 | **통합 증명 필수** 룰 |

---

## 아키텍처

```
오케스트레이터 (이 Claude 세션)
  │
  │ Phase 1: 평가 ──── 3 에이전트 병렬 dispatch (필수)
  │   ├─ game-critic     → cycle-N-critic.md (5축 점수 + 약점 TOP3)
  │   ├─ level-designer  → cycle-N-level.md  (밸런스/곡선 진단)
  │   └─ story-writer    → cycle-N-story.md  (서사 진단)
  │
  │ ★ GATE: 3 파일 모두 존재해야 Phase 2 진입
  │
  │ Phase 2: 기획 + 구현 ──── 오케스트레이터 주도
  │   ├─ 3 평가 결과 종합 → 이번 사이클 작업 결정
  │   ├─ 구현 (직접 or task agent)
  │   └─ 선택: ui-ux-designer / qa-engineer dispatch (필요 시)
  │
  │ Phase 3: 검증
  │   ├─ typecheck + lint + test + circular
  │   ├─ 통합 증명: 새 코드가 실제 UI/게임에서 호출됨을 증명
  │   └─ RESUME.md + cycle-N-result.md 작성
```

---

## 페르소나 7종 (전원 필수)

| # | 역할 | 에이전트 타입 | 핵심 책임 |
|---|------|-------------|----------|
| 1 | 게임비평가 | `game-critic` | 5축 비평, 약점 TOP 3, 표류 경보 |
| 2 | 레벨디자이너 | `level-designer` | 밸런스 곡선, 수치 진단, 난이도 |
| 3 | 스토리작가 | `story-writer` | 서사 일관성, 감정 곡선, 톤 |
| 4 | UI/UX 디자이너 | `ui-ux-designer` | 레이아웃, 접근성, 화면 흐름 |
| 5 | QA 엔지니어 | `qa-engineer` | 회귀 위험, 테스트 계획, 검증 |
| 6 | 게임기획자 | `game-planner` | PRD 작성, 우선순위 결정, 합의 |
| 7 | 에셋조사관 | `asset-investigator` | CC0/CC-BY 에셋 탐색, 라이선스 |

평가 사이클(매 3사이클)에서 **7 에이전트 전원** dispatch.

---

## 사이클 구조

### Phase 1: 평가 (7 에이전트 병렬) — 매 3사이클마다

**평가 주기**: 사이클 N 에서 N % 3 == 0 일 때 Phase 1 실행.
나머지 사이클은 직전 평가 결과를 재사용 (Phase 2 직행).

오케스트레이터는 `task` 도구로 7 에이전트를 **동시** dispatch:
- `game-critic` → cycle-N-critic.md
- `level-designer` → cycle-N-level.md
- `story-writer` → cycle-N-story.md
- `ui-ux-designer` → cycle-N-ui.md
- `qa-engineer` → cycle-N-qa.md
- `game-planner` → cycle-N-prd.md (평가 종합 + PRD)
- `asset-investigator` → cycle-N-assets.md

각 에이전트에게 주입할 컨텍스트:

```
- RESUME.md 전문
- 직전 cycle result (있으면)
- 관련 소스 파일 경로 목록
```

**출력 게이트**: 7 파일 모두 생성 완료 후에만 Phase 2 진입.

**재사용 규칙**: 평가 사이클이 아닌 경우, 직전 평가의 약점 목록 중
아직 미처리된 항목을 순서대로 작업.

### Phase 2: 기획 + 구현

오케스트레이터가 평가 결과들을 읽고:

1. **작업 결정**: 에이전트 합의 약점 중 최우선 1개 선택 (다수 에이전트 지적 우선)
2. **통합 원칙 적용**: "데이터만 추가" 금지 — 반드시 플레이어에게 보이는 변화
3. **구현**: 직접 코드 작성 (복잡하면 `general-purpose` agent dispatch)

### Phase 3: 검증

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm circular
```

**통합 증명** (v5 신규 룰):
- 새로 작성한 코드/데이터가 실제로 호출되는 경로를 1줄로 기술
- 예: "regionLore.ts → WorldMapScreen.tsx L45 에서 getRegionLore() 호출"
- 호출 경로 없으면 **FAIL** 판정 → 통합 코드 추가 후 재검증

결과 기록:
- `cycle-N-result.md` (≤ 300단어)
- `RESUME.md` 갱신

---

## 강제 룰

### 프로세스

1. **Phase 1 스킵 금지** — 3 에이전트 dispatch 없이 Phase 2 진입 불가
2. **카테고리 연속 3회 제한** (동일 카테고리 4연속 금지)
3. **통합 증명 필수** — "export 했지만 아무도 import 안 함" = FAIL
4. carry-over **5사이클 만료** (재평가 → 폐기 or 강제 진입)

### 비주얼

5. **비주얼 예산 ≥ 20%** (10사이클 단위 체크)
6. 시스템 3연속 → 비주얼/사운드 강제 삽입
7. Placeholder **20사이클 수명** (v4: 30 → 단축)

### 기술 부채

8. 알려진 부채 **20사이클 내 해결** (나이 추적)
9. 머지 가드 실패 = 해당 사이클 FAIL (기존이라 OK 금지)

### 품질

10. **Dead code 금지** — 호출자 없는 export 는 같은 사이클에 통합 or 삭제
11. **테스트는 행동 검증** — "함수가 존재한다" 수준의 테스트 금지
12. BattleScene.ts **1200줄 상한** — 초과 시 extract 의무

---

## 카테고리 정의 (5종)

| 카테고리 | 범위 |
|---------|------|
| visual | 스프라이트, 이펙트, 전환, 색상, 레이아웃, 아이콘, 폰트 |
| balance | 수치, 곡선, 난이도, 보상, 경제 |
| system | 새 메카닉, 리팩터, 성능, 인프라 |
| narrative | 스토리, 대사, 세계관, 캐릭터 개성, 텍스트 |
| sound | BGM, SFX, 타이밍, 레이어링 |

---

## RESUME.md 형식

```markdown
# RESUME — v5
- Cycle: N | Target: 200
- Vitest: XXXX | E2E: XX | Persist: vXX
- Last commit: SHA
- Phase: DONE → next cycle N+1
- Category budget (this era): visual X | balance X | system X | narrative X | sound X
- Category lock: [최근 2개]
- Visual maturity: XX/30
- Carry-over: [항목(age)]
- Debt: [항목(age)]
- Integration backlog: [통합 안 된 기존 데이터 파일 목록]
```

### Integration backlog (v5 신규)

v4 시절 만들어놓고 통합 안 된 파일 목록을 추적한다:
- 통합 완료 시 제거
- **10사이클 미통합** → 삭제 대상

---

## 비주얼 성숙도

캐릭터 | 몬스터 | 이펙트 | 배경 | 아이콘 | 전환 | 폰트 | BGM | SFX | 색상

- 0: placeholder / 없음
- 1: 기능적 (동작하지만 조악)
- 2: 양산형 (시판 게임 하위 50%)
- 3: 우수 (시판 게임 상위 50%)

---

## 문서 수명

| 나이 | 보존 | 삭제 |
|------|------|------|
| ± 5사이클 | 전체 | - |
| 6~20사이클 | result만 | critic, level, story |
| 20+ | era-summary로 압축 | 개별 전부 |

매 20사이클 → era summary.
매 10사이클 → dashboard (성숙도 + 카테고리 분포 + 통합 현황).

---

## 세션 재개

```
이 프로토콜(autonomous-evolution-v5.md)로 자율진화 이어간다.
```

재개 절차:
1. `docs/superpowers/evolution/v5/RESUME.md` 읽기
2. 중단된 Phase 판별
3. 해당 Phase부터 이어서 (Phase 1 미완료면 에이전트 재dispatch)

---

## Cycle 0: 부트스트랩

v4에서 이미 확정된 사항 계승:
- 아트 스타일: 32×32 pixel
- 에셋 소스: Kenney + OpenGameArt (CC0/CC-BY)
- 팔레트: dark-gold 테마
- 우선순위: Integration-first (있는 것 통합 > 새로 만들기)

v5 추가 확정:
- Integration backlog 초기 목록 작성 (v4 잔여물 조사)
- RESUME.md v5 형식으로 마이그레이션
- `docs/superpowers/evolution/v5/` 디렉토리 생성

---

## v4 → v5 마이그레이션

1. v4 cycle 결과물 (`evolution/v4/`) 보존 (읽기 전용)
2. v5 는 `evolution/v5/` 에 새로 시작
3. Cycle 번호는 v4 이어서 (103~)
4. RESUME.md 는 v5 형식으로 새로 작성
5. Integration backlog: v4 시절 미통합 파일 전수 조사 후 등록

---

## 사용법

```
# 새 시작 (v4 마이그레이션 포함)
이 프로토콜(autonomous-evolution-v5.md)로 자율진화 시작. Cycle 0 부트스트랩.

# 이어서
이 프로토콜(autonomous-evolution-v5.md)로 자율진화 이어간다.
```
