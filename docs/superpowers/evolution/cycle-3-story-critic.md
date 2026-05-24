# Cycle 3 비평 (Story Writer)

3-seed multi-cycle sim (`/tmp/cycle-3-sim-s4096/`, seed family 4096-4145, 50 cycle, main HEAD `ced7631`) 의 c4096/c4121 md + 50 cycle 전수 jsonl, `narrationVariants.ts` (288 lines, 15 generator), `NarrativeGenerator.ts` (89 lines), `scripts/sim-cycle-v2.ts` renderer 정독 후 평가한다. Cycle 2 (single seed 2048) 와 multi-seed 비교가 핵심 신호.

전체 50 cycle event 분포 (cycle 2 와 직접 비교):

| event type | cycle 2 (seed 2048) | cycle 3 (seed 4096 family) | Δ |
|---|---|---|---|
| level_up | 39,984,092 | 40,402,011 | +1% |
| moral_choice | 2,747 | 2,691 | -2% |
| skill_learned | 444 | 463 | +4% |
| realm_unlocked | 397 | 412 | +4% |
| realm_entered | 163 | 172 | +6% |
| season_changed | 149 | 149 | 0 |
| npc_encounter | 37 | 43 | +16% |
| npc_died | 4 | 4 | 0 |
| family_event | 2 | 2 | 0 |
| **rejuvenation** | **0** | **0** | **0** |
| **hero_died** | **0** | **0** | **0** |
| moral spare_enemy 비중 | **63.3%** | **70.4%** | **+7.1pt 악화** |

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 4/10 | Cycle 2 의 5/10 에서 **-1 downgrade**. variant 풀은 cycle 2 이후 **0 줄 변경** (`narrationVariants.ts` 의 마지막 커밋 `79951dc` = F3 wire, cycle 2 보강안 미적용) — 다른 seed 가족으로 옮기니 spare_enemy 비중이 63.3% → 70.4% 로 더 saturate. c4096 단독 51/61 = 83.6%, c4121 46/56 = 82.1%, c4145 54/63 = 85.7% — 사실상 moralChoice line 의 **8 줄 중 7 줄이 같은 텍스트**. MORAL_VARIANTS 5 frame 으로 5등분해도 한 frame 평균 10회 반복. seed family 가 달라져도 단조로움이 더 깊어진다는 건 random variance 가 아니라 systemic — `PERSONALITY_ENCOUNTERS` 의 spare_enemy weighting 자체가 dominant. |
| 톤 일관성 (realm/season/personality) | 5/10 | Cycle 2 의 6/10 에서 **-1 downgrade — 새 버그 두 개로**: (1) **이중 괄호 버그** — c4096 25 줄 / c4121 7 줄이 `- (15세) (15세) 시야 끝에서...` 형태로 age prefix 가 두 번 찍힌다. 원인은 `scripts/sim-cycle-v2.ts:330` 의 `lines.push(\`- (\${e.age}세) \${e.narrativeText}\`)` 가 모든 saga event 에 prepend, 그런데 realm/season/npc/family 4 축 25 variant 가 `narrationVariants.ts:126-234` 에서 이미 `(\${c.age}세) ...` 로 시작. 톤 hook 의 첫인상이 깨진 prefix 로 망가진다. (2) **NPC encounter 의 "첫 조우" 톤 위반** — c4096 에서 같은 rival NPC instance `npc_1_954104` 가 age 15-20 사이 19 회 narrate. 변형 텍스트는 `"라이벌의 첫 칼이 자신의 어깨를 스쳤다 — 그가 더 빨랐다"` 같은 **첫 조우 전용 어휘** — 그게 한 cycle 안에서 6 회 반복 발사된다. `CycleControllerV2.ts:388` 의 encounter trigger 가 alive NPC 중 20% chance 로 매 arrival 발화 + 첫 조우 필터 부재. realm/season hook variant 자체의 다양성은 cycle 2 평가 유지 (sea/volcano/heaven/chaos 톤 변별력 OK). |
| 감정 곡선 (boredom → climax) | 3/10 | Cycle 2 와 동률. 50 cycle 도합 **rejuvenation 0 / hero_died 0** — cycle 2 와 정확히 같다. `recordRejuvenation` (CycleControllerV2.ts:441) 가 `cycleSliceV2.rejuvenateHero` 에서만 호출되는데, sim 50 cycle 전부 `max_arrivals` 종료 → 회춘 trigger 미발화. 게임의 정체성 — "eternal hero 가 회춘하며 무한 saga 를 쓴다" — 이 multi-seed sim 에서도 narrator 의식에 한 줄 안 들어옴. c4121 의 마지막 줄 `(37세) 37세에 4290단계 연속 성장. LV 829888에 도달했다` 가 climax 가 아니라 fade-out 으로 끝나는 패턴 — 50 seed 전수 동일. levelUpBatch 6 variant 의 인플레-무차별 어휘도 cycle 2 진단 그대로 carry-over (c4096 의 LV 1 → LV 828k 까지 batch variant 6 문장 cycle 반복, 465 발사). |
| 세계관 정합 | 6/10 | Cycle 2 와 동률. realm 6 catalog 살아있음 (c4096 에서 base→sea→volcano→underworld 4 distinct 진입, c4121 에서 4 distinct), season prefix realm-flavor (`죽음의 강 위로 여름이 내렸다`) 디테일 유지. **다만 새 부채 추가** — 이중 괄호 버그가 realm/season/npc 진입 line 의 첫인상을 깨트림 (c4096 의 sea 첫 진입 `(6세) (6세) 짠 공기가 폐를 가득 채웠다` — 톤이 시작도 전에 표기 오류로 부서짐). NPC re-encounter 19 회 narrate 가 라이벌의 "첫 칼" 어휘를 매 회 반복 → 같은 라이벌이 6회 "처음" 칼을 휘두르는 시간 모순. 세계관은 catalog 가 살았지만 wire 가 톤을 부수고 있다. |

## 약점 TOP 3 (Cycle 3 신규 finding 우선)

1. **이중 괄호 prefix 버그 — c4096 25 줄 / c4121 7 줄에서 톤 hook 첫 인상 파괴** — `scripts/sim-cycle-v2.ts:330` 가 모든 saga event 에 `- (${age}세) ` 를 prepend. 그런데 cycle 1 F2/F3 가 realm/season/npc/family 4 축 25 variant (`narrationVariants.ts:126-234`) 에 `(${c.age}세) ...` prefix 를 박았다 → 충돌. 결과: c4096 의 sea 첫 진입 `(6세) (6세) 짠 공기가 폐를 가득 채웠다`, c4121 의 spring 첫 전환 `(5세) (5세) 계절이 바뀌었다 — 들판 위로 봄이 왔다` 처럼 톤 hook 의 가장 임팩트 있어야 할 첫 줄이 표기 오류로 시작. realm/season/npc/family 4 generator 가 narrator 의 "분위기 전환 비트" 인데, 분위기 전환 25 줄 중 25 줄이 깨진 prefix. **해결 방향**: `narrationVariants.ts` 의 REALM_ENTER_VARIANTS / SEASON_CHANGE_VARIANTS / NPC_ENCOUNTER_VARIANTS / NPC_DEATH_VARIANTS / FAMILY_EVENT_VARIANTS 5 catalog 의 모든 변형 줄에서 leading `(${c.age}세) ` 를 제거 (renderer 가 박는 prefix 와 통일). 25 줄 trim 작업 + NarrativeGenerator.test.ts 의 `"N세 포함"` assertion 4 건 조정. (대체 fix: renderer 가 이 5 type 만 prefix skip — 그러나 saga record type 분기가 복잡해지므로 trim 쪽이 깔끔하다.)

2. **NPC encounter 의 "첫 조우" 톤 위반 — 같은 NPC 가 한 cycle 안에서 6 회 "처음" 만난다** — c4096 의 rival NPC `npc_1_954104` 가 age 15-20 사이 19 회 narrate, 변형 텍스트는 `"시야 끝에서 같은 표정의 그림자가 나타났다 — 라이벌이었다"` / `"라이벌의 첫 칼이 자신의 어깨를 스쳤다 — 그가 더 빨랐다"` 같은 **첫 조우 전용 어휘** 만 3 variant. 19 발사 중 약 6 회씩 같은 텍스트 + 모두 첫 조우 톤 → 같은 라이벌이 6 회 "처음" 칼을 휘두른다. cycle 2 critic 이 "첫 조우만 narrate 하므로 의도된 단일성" 으로 오해했던 부분의 실체 — `CycleControllerV2.ts:388` 의 `if (candidates.length > 0 && this.rng.chance(0.2))` 는 첫 조우 필터 없음, 매 arrival 발화. **해결 방향**: (a) `CycleControllerV2` 가 NPC instance 의 `narratedEncounterCount` 를 추적, 0→1 (첫 조우) 와 ≥1 (재회) 두 분기로 generator 호출. (b) `NPC_ENCOUNTER_VARIANTS` 를 `first` / `recurring` 두 sub-branch 로 split — recurring 은 `"오래된 라이벌이 다시 길을 막았다 — 이번엔 그가 침묵했다"` 같은 변화된 톤. 같은 19 회 발사가 첫 1 회는 첫조우 톤, 18 회는 변주 톤으로 분기되어 시간 모순이 사라진다.

3. **spare_enemy moral choice 의 multi-seed 회귀 — 63% → 70.4% 악화** — Cycle 2 의 진단이 단일 seed (2048) 였는데, multi-seed (4096 family) 에서 더 saturate. 사실상 PERSONALITY_ENCOUNTERS 의 spare_enemy weighting (또는 trigger frequency) 자체가 dominant 한 systemic 약점이다 — seed variance 가 아니다. 게다가 cycle 2 critic 의 caste-tag frame 보강안 (pious 우세 시 `"기도의 결과였다"` 등) 이 **0 줄 적용** — narrationVariants.ts 마지막 커밋이 cycle 1 머지 (79951dc). c4145 의 54/63 = 85.7% 단일 cycle 점령. **해결 방향**: cycle 2 critic 의 caste-tag frame 안을 그대로 채택하되, **추가로 root cause 도 본다** — `PersonalityEncounter` 의 spare_enemy weight (또는 battle_won 후 trigger 확률) 가 `merciful` 우세 시 self-reinforce 하는 feedback loop 인지 검증. 단순 텍스트 보강만으로는 70% 발사 의 한 cycle 내 변주 한계가 있다.

## 차기 narrative 제안

- **NPC encounter 의 first vs recurring 분기 — `forNpcEncounter(opts, isFirst)`**: 트리거 = `CycleControllerV2.ts:388` 에 NPC instance 별 `narratedEncounterCount` 추적, 0→1 vs ≥1 분기. 같은 19 회 발사가 첫 1 회 + 18 회 recurring 로 갈리면 시간 모순 해소 + 라이벌과의 "오래된 관계" 톤 비트가 새로 생긴다. 실제 텍스트 예시 (`NPC_ENCOUNTER_VARIANTS.rival.recurring` 신설, 3 variant):
  - `(17세) 오래된 라이벌이 다시 길을 막았다 — 이번엔 그가 먼저 시선을 떨궜다.`
  - `(19세) 라이벌의 칼이 또 한 번 스쳤다, 같은 자리는 아니었다.`
  - `(20세) 둘은 말없이 지나쳤다 — 다음번엔 칼을 들기로 했다.`

(Cycle 2 critic 의 다른 3 제안 — idle-trigger 회춘 비트 / LV 자릿수별 batch 톤 / personality-tagged moralChoice frame — 은 **여전히 미적용 상태로 carry-over**. 본 cycle 3 critic 은 새 finding 1 개만 추가하고, 미적용 3 안은 cycle 4 backlog 로 명시적 carry-over.)

## carry-over 미해결 (cycle 2 → cycle 3 0 변경)

- **rejuvenation 0 발화** — `narrationVariants.ts:104-111` 의 5 variant 카탈로그가 cycle 1 머지 이후 **50+50 = 100 cycle 어디서도 발화 0회**. eternal hero 정체성의 dead path.
- **levelUpBatch 인플레-무차별** — LV 1 → 828k 사이 batch variant 6 문장 cycle 반복. cycle 3 c4096 의 batch 줄 465 발사 / c4121 465 발사 — cycle 2 와 동일 밀도.
- **moralChoice frame 의 caste 무시** — c4096 (사제 / pious:6 / merciful:10) 의 51 회 spare_enemy narrate 가 c4121 (사제 / pious:6 / merciful:10) 와 동일 텍스트. caste/personality 가 frame 0 영향.

## 표류 경보

- **eternal hero 컨셉이 cycle 1 머지 이후 100 cycle 째 narrative 0% 구현** — Cycle 1 / Cycle 2 / Cycle 3 모두 rejuvenation 0 발화. V3-H 의 hero_died dead path 회수 패턴 (활성화 후 발견) 과 동일 — trigger 조건이 너무 좁아 catalog 가 영구 dead. cycle 4 가 이걸 손대지 않으면 spec 의 eternal hero pivot 이 narrator 레벨에서 영구 dead path 로 굳는다.
- **variant 풀 변경 0 줄 / cycle 2 critic 의 4 제안 0 채택** — narrationVariants.ts 의 마지막 커밋이 cycle 1 (79951dc). cycle 2 critic 이 텍스트 변형 예시 3 개를 제시했는데 그대로 stale. cycle 3 가 또 새 텍스트 dump 만 하면 cycle 4 에서도 같은 stale 반복. **메타-경보**: critic output 의 텍스트 변형 제안이 자동으로 backlog 화 되는 메커니즘이 없다 — `cycle-N-backlog.md` 에 명시적 carry-over 안 하면 다음 cycle 도 같은 진단.
