# Cycle 961 Planner — C962-C964 Roadmap

## Layer Rotation

| Cycle | Layer | Focus |
|-------|-------|-------|
| C962 | system | DurationBuffTracker migration batch (complex side-effects) |
| C963 | structure | MidGameEventResolver decomposition |
| C964 | balance+collab | Multiplicative ATK stacking invariant + collab review |

---

## Baseline (post-C961)

- EncounterEngine: ~2720 LOC
- BuffCatalog: 68 entries
- Tests: 2458 passing
- Manual `*Remaining` fields: 17 (complex side-effect group)
- MidGameEventResolver: 12+ events, sequential if/else-if ordering
- Veteran's Challenge: shipped (EXP×1.80 / ATK×0.70 for 6 fights)
- ATK buffs: stack multiplicatively (no cap invariant exists)

---

## C962 — System: Duration Migration Batch (Complex Group)

### 목적
17개 남은 manual `*Remaining` 필드 중 **side-effect coupling이 낮은 5개**를 DurationBuffTracker로 이관한다. 나머지 12개는 coupling map 문서화만 수행.

### 왜 지금?
- 3 cycle 연속 (C953, C956, C958) 마이그레이션이 진행됨 → 관성 유지가 비용 최소.
- 복잡 그룹을 먼저 분류해야 C963 구조 분해 시 dependency가 명확해진다.

### 산출물
1. 5개 필드 migration (tick-order 테스트 포함)
2. 나머지 12개의 **coupling map** (`docs/` 내 markdown): 각 필드 → 의존하는 event/buff 목록
3. 기존 2458 테스트 regression 0

### 수용 기준
- `*Remaining` grep count: baseline 17 대비 Δ ≤ −5 (즉 ≤ 12)
- 신규 tick-order unit test ≥ 5개 추가
- 전체 테스트 green (2458+ passing)

### 리스크
- 복잡 필드 오분류 시 runtime regression → coupling map 선행 필수
- tick-order bug는 integration test로만 잡힘 → 반드시 multi-tick scenario test 포함

---

## C963 — Structure: MidGameEventResolver Decomposition

### 목적
12+ event의 순차 if/else-if 체인을 **priority-sorted EventHandler[] 패턴**으로 리팩터. 순서 의존성을 명시적 priority 숫자로 전환.

### 왜 지금?
- 12개 이벤트 도달 → 순서 버그 리스크가 선형 증가 중.
- C962에서 coupling map이 나오면 어떤 이벤트가 다른 이벤트에 의존하는지 명확.
- EE 2720 LOC 중 MidGameEventResolver 비중이 ~400 LOC → 분리하면 EE가 2300 LOC 수준으로 감소.

### 산출물
1. `MidGameEventResolver` → `EventHandler` interface + priority registry 패턴 전환
2. 각 handler는 독립 파일 (≤ 80 LOC each)
3. Integration test: priority 순서 검증 (handler A before B 가 보장됨을 assert)
4. EE LOC gate: ≤ 2400 LOC (Δ ≤ −320 from baseline 2720)

### 수용 기준
- `MidGameEventResolver` 본체 ≤ 60 LOC (dispatch loop + registry만)
- Handler 파일 각각 ≤ 80 LOC
- Priority collision test 1개 (같은 priority 등록 시 throw)
- 전체 테스트 green + 기존 event 동작 변경 없음 (snapshot test)

### 리스크
- 순서 의존성 중 "A의 side-effect가 B의 조건"인 경우 priority만으로 불충분 → depends-on 선언 필요 여부 C962 coupling map에서 판단
- Over-engineering 경고: handler가 12개면 simple sorted array로 충분. plugin registry나 DI는 YAGNI.

---

## C964 — Balance + Collab: ATK Multiplicative Stacking Invariant

### 목적
ATK 버프가 무한 multiplicative stacking되는 현 구조에 **soft cap invariant**를 도입하고, 시뮬레이션으로 검증한다.

### 왜 지금?
- Veteran's Challenge (ATK×0.70) 같은 debuff 이벤트가 의미를 가지려면 ATK 범위가 예측 가능해야 함.
- 68개 buff 중 ATK multiplier가 몇 개인지 정리 안 됨 → catalog audit 필요.
- Balance layer가 C958 이후 3 cycle 비었음 → rotation 의무.

### 산출물
1. ATK multiplier audit: BuffCatalog 68개 중 ATK-affecting 목록 + 최대 이론치 계산
2. Soft cap 공식 도입: `effectiveATK = base × min(totalMult, capCurve(level))` — capCurve는 log-linear
3. Invariant test: "어떤 buff 조합이든 effectiveATK ≤ base × 50 at level 500"
4. 3-seed sim (seeds 1024, 2048, 4096) 50-cycle 각각 실행 → ATK p99 측정

### 수용 기준 (Δ-from-baseline)
- ATK p99: baseline (현재 sim, cap 없음) 대비 Δ ≤ −20% (cap이 실제로 작동함을 증명)
- DPS variance (stddev/mean): baseline 대비 Δ ≤ −0.10 (분산 감소)
- 기존 테스트 regression 0
- Veteran's Challenge의 ATK×0.70 debuff가 cap 이후에도 체감됨 (pre/post diff ≥ 15%)

### Collab 요소
- Level Designer: capCurve 상수 (기울기, 절편) 제안 요청
- Critic: "cap이 플레이어 파워 판타지를 해치는가?" 평가 요청
- Story: Veteran's Challenge narrative가 cap과 충돌하지 않는지 확인

### 리스크
- Cap이 너무 공격적이면 idle progression 느낌 훼손 → log-linear (급격하지 않은) 선택 이유
- Sim parity 검증 필요: cap 로직이 sim driver에도 반영되어야 측정 유효

---

## Backlog (NOT this round)

| Item | 이유 |
|------|------|
| 나머지 12개 복잡 migration | C962에서 map만 작성, 실제 이관은 다음 system layer |
| 신규 이벤트 추가 (13번째+) | 12개로 mid-game density 충분 — critic 피드백 대기 |
| EE 추가 분할 (Combat/Loot/Event) | C963에서 MidGame만 분리, 나머지는 LOC 재측정 후 판단 |
| DEF/HP buff cap | ATK cap 검증 후 동일 패턴 적용 — 순차 진행 |
| UI/VFX polish | 3 cycle 연속 system/structure였으므로 C965+ 고려 |

---

## 컨셉 가드 체크

- "1 → 수십만 레벨 폭발, 자율 진화하는 idle hero sim"
- C962: 내부 정리 → 자율 진화 속도 유지
- C963: 구조 분해 → 이벤트 확장성 확보 (idle sim의 이벤트 다양성)
- C964: ATK cap → 레벨 폭발의 의미 있는 스케일링 보장 (무한 ATK면 레벨이 무의미)

모두 컨셉 정합. 신규 시스템(PvP, 멀티 등) 없음. ✓

---

## 의존성 그래프

```
C962 (coupling map) ──→ C963 (decomposition uses map)
                    ──→ C964 (ATK audit references catalog)
```

C963과 C964는 독립 병렬 가능하나, C962의 coupling map이 양쪽 입력이므로 **C962 완료 후** C963/C964 착수.
