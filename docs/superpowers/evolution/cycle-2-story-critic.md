# Cycle 2 비평 (Story Writer)

50-cycle V3 sim (`/tmp/cycle-2-sim/`, main HEAD `ac061d1`) 의 c2048 / c2073 md 와 50 cycle 전수 jsonl, `narrationVariants.ts` (288 lines, 15 generator), `NarrativeGenerator.ts` (89 lines) 정독 후 평가한다.

전체 50 cycle event 분포 (jsonl 집계):

| event type | total | per cycle 평균 | per cycle 최대 |
|---|---|---|---|
| level_up | 39,984,092 | 799,682 | (변동) |
| moral_choice | 2,747 | 54.9 | 56 (c2048) |
| skill_learned | 444 | 8.9 | 9 |
| realm_unlocked | 397 | 7.94 | (5 distinct realms) |
| sightseeing_arrived | 298 | 5.96 | — |
| trial_resolved | 230 | 4.6 | 5 |
| realm_entered | 163 | 3.26 | — |
| season_changed | 149 | 2.98 | 3 distinct |
| job_unlocked | 100 | 2 | 2 |
| chapter_transition | 100 | 2 | 2 |
| shrine_visited | 72 | 1.44 | 2 |
| npc_encounter | 37 | 0.74 | 23 (c2048) |
| meditation_done | 21 | 0.42 | — |
| npc_died | 4 | 0.08 | 2 (c2048) |
| family_event | 2 | 0.04 | — |
| **rejuvenation** | **0** | **0** | **0** |
| **hero_died** | **0** | **0** | **0** |

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 5/10 | Cycle 1 의 +30+4+9 = 43 variant 보강은 realm/season/NPC 축에서 명백한 효과 (c2073 에 5 distinct realm + 3 season + family_event 첫 발화 확인). 그러나 levelUpBatch 6 variant 가 c2048 단독에서 **467 발사 / 평균 한 문장 78회 반복** (`"미친 듯이 강해졌다 — LV X → Y"` 88회 단순 count). cycle 1 critic 의 "압도적 절반이 같은 6 문장" 진단이 **완화 0**. moralChoice 의 `spare_enemy` 가 50 cycle 1739/2747 = 63% 점령, c2048 안에서만 49회 동일 nameKR — variance 보강이 levelUp + moral 두 hot path 를 손대지 않았다. |
| 톤 일관성 (realm/season/personality) | 6/10 | Cycle 1 의 핵심 약점이었던 realm/season hook 부재 가 F2 로 해결 — c2073 에서 `(10세) 발 밑이 뜨거워졌다 — 화산의 입구다.` / `(19세) 발이 구름을 디뎠다 — 천공의 영토에 도달했다.` 처럼 톤 전환 line 이 chapter 경계 역할. 그러나 **realm 진입 후의 모든 battle/levelUp narration 은 여전히 base 톤** — 화산 진입 line 1줄 직후에도 `(10세) 10세에 늑대를 압도했다.` 같은 들판 어휘가 그대로. 즉 hook 은 있고 sustain 이 없음. personality (c2048 pious:7/merciful:10) 가 narrator 의 frame 에 0% 영향 — frame 5 variant 가 caste-agnostic. |
| 감정 곡선 (boredom → climax) | 3/10 | climax 후보 4개 (`rejuvenation` / `hero_died` / `trial_resolved` 시련 / `family_event`) 의 발화 비율: 0% / 0% / 100% (5/5 c2048 — 그러나 모두 한 줄 `"6세에 시련을 이겨냈다 — LV +3"` 동일 텍스트) / 2 event 만. 50 cycle 어디서도 회춘 비트가 안 터졌다 — max_arrivals 500 timeout 종료 + eternal hero 의 회춘 trigger 가 death 의존이라 hero_died 0 인 한 회춘도 0. c2073 의 마지막 줄 `(37세) 37세에 4290단계 연속 성장. LV 844531에 도달했다.` 가 climax 가 아니라 fade-out 으로 끝난다 — 800k+ 레벨에서도 같은 batch variant 한 문장. **인플레가 narrator vocabulary 에 0% 반영**. |
| 세계관 정합 | 6/10 | realm 6종 톤 catalog 가 살아있고, season prefix 가 realm 별로 변하는 (`바다 위로 여름이 내렸다` / `용암 위로 가을이 들어찼다`) 디테일은 V3-DEF 세계관 핀을 narrator 가 처음으로 잡았다. 그러나 sightseeing landmark (`별빛 들판에서 잠시 멈춰섰다` / `신성한 숲에서 잠시 멈춰섰다`) 이 6회 발사 — landmark name 만 노출되고 narrator voice 가 들어가지 않음. NPC 첫 조우 3 variant 가 c2048 의 23 encounter 중 mentor 1회 + rival 1회만 발화 (`forNpcEncounter` 가 첫 조우만 narrate 하므로 의도된 단일성) — 나머지 21 encounter 는 narrative 0 line. eternal hero 의 회춘 catalog 5 variant 가 활용 0 — variant 풀은 있되 sim 의 종료 모델이 climax 발화를 차단. |

## 약점 TOP 3

1. **eternal hero 컨셉의 climax 4종이 50 cycle 모두 발화 안 함** — `rejuvenation` / `hero_died` / `family_event` 가 jsonl 전수 집계에서 각 0 / 0 / 2 회. eternal hero idle 의 "회춘" 비트 — 페르소나의 정체성 그 자체 — 가 narrator 의식에 한 줄도 안 들어옴. c2073 의 37세 LV 844531 에서 timeout 으로 sim 이 끝나면 마지막 줄이 `"4290단계 연속 성장. LV 844531에 도달했다"` — climax 0, fade-out 으로 종료. 원인: max_arrivals 500 + trial_resolved 가 +3 LV 시련으로 hero_died 회피 + 회춘 trigger 가 hero_died 의존. 해결 방향: (a) 회춘 trigger 를 death 가 아닌 **age >= 30 + 누적 saga arrivals >= 200** 같은 idle-friendly 조건으로 확장, 또는 (b) chapter_transition 2회를 narrator hook 으로 격상해 "한 시대가 끝났다" 같은 climax line 을 강제 발사 (현재 chapter_transition 은 jsonl event 만 기록되고 md 에는 sightseeing 만 노출 — narrator 우회).

2. **levelUpBatch 6 variant 의 인플레-무차별 어휘 — 800k LV 에서도 들판 톤** — c2073 의 LV 1 → LV 844531 동안 batch variant 가 동일 6 문장 cycle 반복. 4290 단계 batch (c2073 마지막) 가 `"4290단계 연속 성장. LV 844531에 도달했다"` 로 LV 5 → 10 의 `"5단계 폭풍 성장"` 과 통사 구조 100% 동일. 게임 이름이 **inflation-rpg** 인데 narrator 의 vocabulary 가 인플레를 인정하지 않는다. cycle 1 critic 의 동일 진단이 그대로 carry-over. 해결 방향: LEVELUP_BATCH_VARIANTS 를 **3 tier 로 분기** — `≤999` 신체적 ("팔이 굵어졌다 / 호흡이 깊어졌다"), `1k-1M` 추상적 ("법칙이 굽어졌다 / 격이 한 단 올랐다"), `1M+` 우주적 ("차원이 영웅 쪽으로 기울었다 / 별이 새 자리를 잡았다"). 6×3 = 18 distinct variant 로 같은 80회 발사가 변주 평균 4.4회로 떨어진다.

3. **moralChoice 의 spare_enemy 단일점령 + caste-agnostic frame** — 50 cycle 2747 moral choice 중 spare_enemy 1739 = 63%. c2048 단독에서 49/56 = 87.5%. raw nameKR `"쓰러진 적을 살려보내며 자비가 깊어졌다"` 가 c2048 안에서 49회 발생, MORAL_VARIANTS 5 frame 으로 5등분 해도 한 frame 평균 9.8회 반복. 게다가 c2048 (사제 / pious:7) 와 c2049 (다른 caste) 가 같은 텍스트 — caste/personality 가 narrator 의 frame 에 0 영향. 해결 방향: (a) nameKR 자체에 **3 variant** 부여 (`PERSONALITY_ENCOUNTERS` 의 `spare_enemy.nameKR` 가 catalog 8 → 24 distinct text), (b) MORAL_VARIANTS 에 **caste-tag frame** 추가 — pious 가 우세할 땐 `"기도의 결과였다 — 쓰러진 적을 살려보냈다"`, merciful saturate (≥10) 일 땐 `"이미 정해진 손이었다 — 적을 살려보냈다"`. 같은 49회 발사가 변주 8 frame × 3 nameKR = 24 distinct 로 떨어진다.

## 차기 narrative 제안

- **idle-trigger 회춘 비트 — `forIdleRejuvenation`**: 트리거 = sim 중 hero age ≥ 30 AND saga arrivals % 100 == 0 (한 cycle 평균 5회). 또는 chapter_transition 직후 강제 1회. eternal hero 가 죽지 않고도 "한 시대가 끝나며 다음 영혼이 깨어난다" 라는 비트를 갖는다. 톤 = 회상적 + 첫 호흡. 실제 텍스트 예시:
  - `(30세) 영웅은 잠시 눈을 감았다 — 다시 떴을 때 어깨가 가벼웠다. 재생 #1 (시간의 무게가 30년 줄었다).`
  - `(37세) 햇살이 어제와 다른 각도로 닿았다. 영웅은 그것을 다시 사는 자만의 감각이라 불렀다 — 재생 #2.`
  - `(45세) 아무도 부르지 않았는데 자신의 옛 이름이 들렸다. 그것이 신호였다 — 재생 #3.`

- **LV 자릿수별 batch 톤 — `LEVELUP_BATCH_VARIANTS` 분기**: 트리거 = `toLevel` 의 자릿수. 같은 80회 발사가 18 distinct variant + 자릿수 톤 시그널로 분산. 실제 텍스트 예시 (각 tier 한 줄):
  - `(5세, LV 87) 5세에 87 단계 폭풍 성장 — 팔에 처음 힘이 들었다.` (≤999)
  - `(15세, LV 30,536) 15세에 30536 까지 격이 굽어졌다 — 법칙이 한 단 양보했다.` (1k-999k)
  - `(35세, LV 844,531) 35세에 LV 844531 — 차원이 영웅 쪽으로 기울었다, 별이 새 자리를 잡았다.` (1M+ 임계 직전)

- **personality-tagged moralChoice frame — `MORAL_VARIANTS` 의 caste branch**: 트리거 = moralChoice 시점의 personality 우세 dim (pious ≥ 7 / merciful ≥ 10 / heroic ≤ -3). caste 가 narrator 의 frame 으로 새어나온다. 실제 텍스트 예시:
  - `(15세) 사제의 손이 먼저 움직였다 — 쓰러진 적을 살려보내며 자비가 깊어졌다.` (pious 우세)
  - `(20세) 이미 정해진 손이었다. 쓰러진 적을 살려보내며 자비가 깊어졌다.` (merciful saturate ≥10)
  - `(28세) 영웅은 망설이지 않았다. 한 번도 망설인 적이 없었다 — 쓰러진 적을 살려보내며 자비가 깊어졌다.` (heroic 음수 = 냉정한 frame)

## 표류 경보

- **eternal hero 컨셉 자체가 narrative 에 0% 구현됨** — 50 cycle 전부에서 `rejuvenation` 이벤트 0회. 게임의 정체성 — "영웅은 죽지 않고 회춘하며 무한 saga 를 쓴다" — 이 50 cycle 도합 39,984,092 level_up event 의 어느 한 줄에도 나타나지 않는다. NarrativeGenerator 의 `forRejuvenation` catalog 5 variant 가 cycle 1 머지 이후 **단 한 번도 발화 안 됨**. Cycle 3 가 이걸 손대지 않으면 spec 의 eternal hero pivot 이 narrator 레벨에서 영구 dead path 가 된다. V3-H 의 hero_died dead path 회수 패턴 (cycle 1 F3) 과 동일한 진단 — trigger 조건이 너무 좁아서 실제로 한 번도 안 발사되는 catalog.
