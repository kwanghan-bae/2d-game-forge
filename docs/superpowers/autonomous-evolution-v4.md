# 자율진화 게임 개발 프로토콜 v4

## 목표

100 사이클 동안 **완전 자율**로 게임을 진화시킨다.
시스템 + 비주얼 + 사운드 모두 "진짜 게임" 수준 도달이 종료 조건.

---

## 아키텍처: 오케스트레이터 + 서브에이전트

```
메인 (오케스트레이터) ─── context 최소 유지
  │  역할: RESUME 읽기 → dispatch → 결과 수집 → 판단 → 커밋
  │
  ├─ Opus 4.6 (3x)  ← 판단: 비평가, 기획자, 아트디렉터
  ├─ Sonnet 4.6 (1x) ← 분석: QA, 레벨, 스토리, UI/UX, 사운드
  └─ Haiku 4.5 (0.33x) ← 실행: 에셋조사, 웹리서치, 테크아티스트
```

- 서브에이전트 = stateless (이번 사이클 맥락만 주입)
- 문서 = 외부 메모리 (RESUME.md가 context 대체)
- 사용자 개입 = 0 (Cycle 0에서 모든 취향 확정 완료)

---

## 페르소나 11종

| # | 역할 | 모델 | 핵심 책임 |
|---|------|------|----------|
| 1 | 게임기획자 | Opus | PRD, 우선순위, 합의 조율 |
| 2 | QA | Sonnet | 테스트 계획, 회귀 검증 |
| 3 | UI/UX | Sonnet | 레이아웃, 터치 UX, 와이어프레임 |
| 4 | 게임비평가 | Opus | 5축 비평 (흥행/재미/몰입/플타/비주얼) |
| 5 | 스토리작가 | Sonnet | 서사·톤 비평 + 제안 |
| 6 | 레벨디자이너 | Sonnet | 밸런스, 곡선, 소모량 |
| 7 | 웹리서처 | Haiku | 시장동향, 유사게임, 인벤션 |
| 8 | 에셋 조사관 | Haiku | CC0/CC-BY 탐색, URL+라이선스 |
| 9 | 아트 디렉터 | Opus | 비주얼 톤 통일, VETO권, 스타일 가이드 |
| 10 | 테크 아티스트 | Haiku | atlas/animation/particle 통합, 성능 |
| 11 | 사운드 디자이너 | Sonnet | 타이밍, 레이어링, 루프 설계 |

---

## 사이클 구조 (5 Phase, 매 사이클 필수)

### A. 평가 (비평가 + 레벨 + 스토리 + 아트디렉터)

- 5축 진단 → 약점 TOP 3 출력
- 비주얼 성숙도 스코어 갱신
- 출력: `cycle-N-critic.md`

### B. 기획 (기획자 + 리서처 + 에셋조사관)

- Phase A 기반 PRD 작성 (반대기준 NOT this 필수)
- 에셋 필요 시: URL + 라이선스 + 다운로드 커맨드 포함
- 출력: `cycle-N-prd.md`

### C. 합의 (최소 4인 교차 코멘트)

- 아트디렉터 + 비평가/레벨 + QA + 기획자
- 기획자가 코멘트 반영 → PRD 확정

### D. 구현 (오케스트레이터 + 보조 dispatch)

- 코드 구현 + 테크아티스트(에셋 통합) + QA(테스트)
- ASSET_REGISTRY.md 업데이트 (에셋 추가 시)

### E. 검증 & 기록

- 머지 가드: typecheck + lint + test + circular
- 판정: PASS / PARTIAL / FAIL
- RESUME.md 갱신 + `cycle-N-result.md` 작성
- 출력: `cycle-N-result.md` (≤500단어)

---

## 강제 룰

### 프로세스

1. Phase A 스킵 금지
2. Phase C 교차 4인 필수
3. **카테고리 연속 3회 제한** (4연속 시 강제 pivot)
4. carry-over **3사이클 만료** (재평가 → 폐기 or 강제 진입)
5. balance/system은 **sim Δ-from-baseline** 수용 기준 필수

### 비주얼 강제

6. **비주얼 예산 ≥ 20%** (10사이클 체크, 미달 시 다음 5사이클 강제)
7. 시스템 3개 연속 → 비주얼/사운드 1개 강제 삽입
8. Placeholder **30사이클 수명** (초과 시 P0 교체)
9. 비주얼 점수 < 5/10 → 새 시스템 추가 금지

### 기술 부채

10. **"기존 것이다" 면죄부 금지** — 기존 부채도 carry-over 큐에 등록하고 수명 룰 적용
11. 알려진 부채(circular dep 등)도 **30사이클 내 해결 의무** (나이 추적)
12. 머지 가드에서 "기존이라 OK" 판정 금지 — 매번 나이+1 카운트, 수명 초과 시 P0

### 에셋 일관성

13. 소스 family 최대 2개 (Cycle 0 확정분)
14. 동일 pixel density 강제 (STYLE_GUIDE 기준)
15. 에셋 조사 = 반드시 **통합까지** (URL만으로 종료 금지)
16. VFX 동시 3레이어 상한 (노이즈 방지)

---

## 세션 재개

### RESUME.md (유일한 상태 파일, 매 사이클 덮어쓰기)

```markdown
# RESUME
- Cycle: 42 | Era: 2 | Target: 100
- Vitest: 1620 | E2E: 62 | Persist: v26
- Last commit: a3f7bc2
- Phase: DONE → next cycle 43, Phase A
- Category lock: visual×2 → 다음 visual 제외
- Visual maturity: 12/30
- Carry-over: [1] 배경parallax(age2) [2] token재조정(age1)
- Budget: visual 8/20(40%) sys 5/20 narr 4/20
```

### 재개 절차

1. `RESUME.md` 읽기
2. 중단된 Phase 판별 (result.md 없으면 구현중 끊김)
3. 해당 Phase부터 이어서 진행

---

## 문서 수명

| 나이 | 보존 | 삭제 |
|------|------|------|
| ± 5사이클 | 전체 | - |
| 6~25사이클 | prd + result만 | critic, research, test-plan 등 |
| 25+ | era-summary 1파일로 압축 | 개별 파일 전부 |

매 25사이클 → era summary 생성.
매 10사이클 → dashboard 갱신 (성숙도 + 카테고리 분포).

---

## Cycle 0: 부트스트랩 (사용자와 확정)

사이클 루프 진입 전 확정 사항:
1. 아트 스타일 (pixel 16×16? 32×32?)
2. 색상 팔레트 (primary 4 + realm accent)
3. 에셋 소스 family (Kenney + ?)
4. 우선순위 (Juice first vs Sprite first)
5. STYLE_GUIDE.md / RESUME.md / ASSET_REGISTRY.md 생성

**Cycle 0 완료 후 사용자 개입 0. 100사이클 완전 자율.**

---

## 비주얼 성숙도 (0-3 × 10영역 = 30점 만점)

캐릭터 | 몬스터 | 이펙트 | 배경 | 아이콘 | 전환 | 폰트 | BGM | SFX | 색상

- 목표: 100사이클 종료 시 합계 ≥ 20/30
- 10사이클마다 최저축 미개선 → 해당 축 강제 우선순위

---

## 사용법

```
# 새 시작
이 프로토콜(autonomous-evolution-v4.md)로 자율진화 시작. Cycle 0 부트스트랩.

# 이어서
이 프로토콜로 자율진화 이어간다. RESUME.md 읽고 재개.
```
