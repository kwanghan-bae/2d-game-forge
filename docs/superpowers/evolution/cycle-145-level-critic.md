# Cycle 145 비평 (Level Designer)

cycle 131-144 의 N5 manual claim + claimerTier + SeasonalModifier 6 의
컨텐츠 소모율 평가. 신규 sim 측정 없이 cycle 100 / 120 baseline 인용.

페르소나 룰 (`.claude/agents/level-designer.md`): inflation 정체성 (1 →
수십만+ 폭발) 사수 / headless sim 우선 (본 cycle 은 sim-impact 0 변경이라
baseline 인용) / 수치는 셀 단위 (`param: old → new`).

## 곡선 health (sim 미측정, cycle 100 / 116 / 120 baseline 인용)

| 지표 | 분포 (인용) | 정상 범위 | 판정 |
|---|---|---|---|
| maxLevel p50 | 6.92M (cycle 100 STATUS) | 1 → 수십만+ 폭발 유지 | OK |
| maxLevel p90 | 6.98M (cycle 17 atk-boost 측정) | p50 ×1.01-1.5 | OK (변동 미세) |
| realm_unlocked rate | ≥ 80% (cycle 100+ 유지) | ≥ 80% | OK |
| hero_died rate | 5-20% 범위 (V3-H 이후 안정) | 5-20% | OK |
| saga_pages p50 | ≥ 12 (cycle 100 milestone) | ≥ 12 | OK |
| organic 균열석 / 시즌 | 90 (boss kill 1 × max 3/cycle × ~30 cycle) | — | baseline |
| seasonToken max / 시즌 | 13 (5 achievement 1+2+2+3+5) | — | 신규 axis |
| seasonToken → 균열석 환산 | 1.3 / 시즌 (10:1 환전 비율) | — | 신규 axis |
| 신규 axis 기여도 | **1.44%** (1.3 / 90) | 3-5% (healthy 보조 axis) | **미달** |

곡선 자체는 cycle 131-144 가 sim-impact 0 인 UI/system/narrative/VFX 위주라
정체성 위배 0. atk/hp/MAX_ARRIVALS/fieldLevelRange 어느 field 도 mutation
없음. cycle 17 atk-bound 봉인 invariant 보존. cycle 129 catalog 주석에 명시된
"`atk/hp/MAX_ARRIVALS/fieldLevelRange` 어느 field 도 mutation 0" 의 hard
invariant 가 cycle 137 의 6 번째 modifier 추가 시점에도 유지됨 — 회귀 0.

다만 **seasonToken axis 의 기여도가 보조 axis 의 healthy 범위 (3-5%) 미달**.
다음 섹션 outlier 1 로 별도 호출.

## 봉인 / outlier

- **achievementsCatalog.ts 주석 산술 오류 (산술 정상 1.44% 인데 14% 로 기재)**
  — `achievementsCatalog.ts` line 21:
    > cycle 116 organic 90/시즌 대비 ~14% 보조 axis.
  - 실제 산술: 13 token × (1 균열석 / 10 token) = **1.3 균열석/시즌**.
  - 1.3 / 90 = **1.44%** (한 자릿수 백분율 미만).
  - "14%" 는 13 token / 90 균열석 의 unit 혼동 결과 (token 단위와 균열석 단위
    1:10 환산 안 함). PRD §F3 의 "plausible" claim 도 같은 오류 상속 가능성.
  - 영향: 차기 cycle 의 균열석 inflation 위험 평가 시 10× 과대 baseline.
- **claimerTier `전설` 1000 경계 = sentinel** —
  - 5 achievement 중 hard 4 / moderate 1 (cycle 128 catalog 주석 분석).
  - max rate (5/시즌 풀 달성, 비현실적 ceiling) 가정: 1000 / 5 = 200 시즌 ×
    30 일 = 6000 일 = **16.4 년**.
  - realistic rate (1-2 claim/시즌, hard 4 의 자연 도달 빈도): 500-1000 시즌
    = **40-80 년**. 평생 도달 불가.
  - 4 단계 마스터 (200) 도 max 3.3 년 / realistic 8-16 년. UI 의 상위 2 tier
    가 사실상 dead surface.
- **SeasonalModifier axis diversity 봉인** —
  - 6 modifier 의 type 분포: `traitWeightMul` 4 (volcano-fire / npc-encounter
    boost / legendary-buff-card / underworld-shadow), `narrative_weight` 1
    (chaos-elegy), `cosmetic` 1 (field-spring).
  - 30-day rotation × 6 modifier = 180일 (6 개월) 1 full cycle.
  - player-felt 변동의 67% (4/6) 가 단일 axis (trait 추첨 가중).
  - cycle 137 의 6 번째 추가 (`underworld-shadow-trait-boost`) 가 axis 편향
    가속. 6 month 후 같은 axis 반복 → saturation.

## 약점 TOP 3 (밸런스)

1. **claimerTier `전설` 경계가 sentinel 화** — 1000 claim 도달 = max 16.4 년
   / realistic 40-80 년. tier 5 단계 중 최고 1 단계가 평생 dead UI. 4 단계
   마스터 (200) 도 max 3.3 년 sentinel 후보.
   - 제안: `claimerTier.ts:9` **`if (count >= 1000) return '전설'` → `if (count >= 300) return '전설'`**.
   - 이유: log-scale 격차 ×4-5 유지 (10/50/200/300 또는 10/40/150/400). max
     rate 5 년 / realistic 25-50 년 도달 가능. 정체성 (long-term 충성도) 보존
     하면서 dead surface 해소.
2. **seasonToken 환전 비율이 organic 균열석 대비 sub-margin** —
   - 1.44% 보조 axis = manual claim UX 의 effort/reward 비대칭.
   - PRD §F3 의 "retention 의 유료 곡선" 의도 미달 (1/10 수준).
   - 제안 A: `tokenToCrack` **`10:1 → 5:1`** (1.3 → 2.6 균열석/시즌, **2.9%**).
   - 제안 B: 5 starter reward 합 **`13 → 25`** (예: 5/3/3/3/11 spread).
   - 둘 중 하나만 채택. 균열석 inflation 위험 0 (manual claim 게이트 + 시즌
     reset 유지).
   - 이유: cycle 116 organic 90 의 3-5% 가 보조 axis 의 healthy 범위.
3. **SeasonalModifier 의 axis 67% trait 편향** — 6 modifier 의 axis 분포
   4/1/1. cycle 137 의 추가가 saturation 가속.
   - 제안: 다음 2 cycle 의 modifier 추가를 **`narrative_weight` 1 +
     `cosmetic` 1** 으로 고정. catalog **6 → 8** (axis 분포 4/2/2).
   - 이유: 30-day rotation 의 player-felt 변동을 trait 외 axis 로 분산.
     cycle 17 봉인 invariant (`atk/hp/MAX_ARRIVALS/fieldLevelRange` 불변)
     보존 — 새 axis 추가 없이 기존 5 axis 내에서.

## 차기 cycle 수치 제안표

| param | 현재 | 제안 | 이유 |
|---|---|---|---|
| `claimerTier` 전설 경계 | 1000 | **300** | sentinel 화 해소, max rate 5 년 도달 |
| `claimerTier` 마스터 경계 | 200 | (유지) | 3.3 년 max — 충성도 axis 로 healthy |
| seasonToken → 균열석 환전 | 10:1 | **5:1** | 보조 axis 기여도 1.44% → 2.9% |
| 5 starter reward 합 | 13 | **25 (5/3/3/3/11)** | 환전 비율 유지 시 동등 효과 — 환전과 둘 중 하나만 |
| SeasonalModifier catalog | 6 | **8 (narrative+1 / cosmetic+1)** | axis 4/1/1 → 4/2/2 |
| `aging-master-10` 임계 | 10 | **7** | 60+ cycle → 40+ cycle, p50 도달 가능 영역 |
| `inflation-flash-100x` 임계 | 3 회 / cycle | (측정 후) | 미측정 — sim 1 회 cost 후 |

권장 채택 (cycle 146-150 분배): **약점 1 + 2 + 3 만**. 4-6 은 carry-over.

## 컨텐츠 소모 예상

- **achievement 5 starter 의 시즌별 소진율** —
  - `npc-collect-4-uniques` (moderate, 2-3 cycle) — 시즌 (~30 cycle) 안
    10 회+ 가능. 단 *cumulative* trigger 라 시즌 reset 미설계 시 평생 1 회.
  - `lv-10m-in-3-cycles` (hard, p10-20 sustained 3 cycle rolling) — 시즌당
    1-2 회. organic.
  - `realm-conquest-6` (hard, 단일 cycle 6 realm) — Tier-gate 정상 진행
    시즌당 0-1 회.
  - `aging-master-10` (cumulative, 60+ cycle 단일 realm) — 시즌당 0 회 다수.
    임계 7 제안 (40+ cycle, 시즌 1 회 가능).
  - `inflation-flash-100x` (미측정) — cycle 132+ telemetry 후 재조정 PRD 명시.
  - 운영 결정 필요: cumulative trigger 2 개 (`npc-collect-4-uniques`,
    `aging-master-10`) 시즌 reset 여부. 평생 1 회 claim 이면 token 7/시즌 +
    영구 손실.
- **claimerTier 5 단계 도달 시간 (max rate 5/시즌 기준)** —
  - 신참 → 노련 (10): 2 시즌 = **2 개월**. healthy onboarding.
  - 노련 → 숙련 (50): 8 시즌 = **8 개월** (1 시즌 후 8 시즌). healthy.
  - 숙련 → 마스터 (200): 30 시즌 = **2.5 년** (max). realistic 5-10 년.
  - 마스터 → 전설 (1000): 160 시즌 = **13 년** (max). realistic 40-80 년.
    **dead**.
- **SeasonalModifier rotation cohort** —
  - 6 modifier × 30 일 = 180 일 = 6 개월 full cycle. cohort retention 으로
    6 개월은 short — 1 년 차 user 가 같은 axis 2 회 경험.
  - 8 modifier 채택 시 = 240 일 = 8 개월. 12 = 1 년 (ideal).
  - 다음 2 cycle 에서 cosmetic / narrative 추가 → 8 modifier 도달. cycle
    150 ± 12 modifier 도달.

## 표류 경보

- inflation 정체성 (1 → 수십만+ 폭발 곡선) **위배 없음**. cycle 131-144 모두
  sim-impact 0 의 UI / system / narrative / VFX 작업. atk/hp/MAX_ARRIVALS/
  fieldLevelRange invariant 회귀 0.
- 레벨 cap / 평탄화 시도 **없음**.
- maxLevel p50 6.92M baseline 변동 없음 (cycle 137 의 6 번째 modifier 추가
  도 axis 5 종 내).
- 단, `claimerTier` 의 `1000` sentinel 은 정체성 위배는 아니나 *기능 dead
  surface* — UI 측면 표류로 분류. 약점 TOP 1 에서 해소.
- achievementsCatalog 주석의 산술 오류 (1.44% → 14%) 는 PRD 수치 검증 회로의
  dead spot — 후속 cycle PRD 작성 시 advisor §Gap 4 의 산술충돌 사전 검증
  룰 재적용 권고.
- **신규 sim 측정 cost 회피** — 본 평가는 cycle 100/116/120 STATUS baseline
  인용으로 갈음. cycle 132+ telemetry (`inflation-flash-100x` 임계 조정) 와
  cycle 146 의 약점 적용 후 1 회 50-cycle sim 권장.

## 한 줄

곡선 health OK, sim-impact 0 cycle 14 회 연속이라 inflation 정체성 보존.
하지만 manual claim axis 의 reward 곡선이 보조 axis (1.44%) 미만으로 미달 +
claimerTier 1 단계가 sentinel + SeasonalModifier axis 67% trait 편향. 위 3
약점 모두 *현 invariant 보존* 으로 해소 가능 (`전설 1000 → 300`, `환전 10:1
→ 5:1`, `catalog 6 → 8 narrative+cosmetic`).
