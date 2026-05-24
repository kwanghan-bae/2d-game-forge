# Cycle 1 비평 (Game Critic)

대상: main HEAD `964456b` (V3-H Depth+Polish 머지 + autonomous-evolution 부트스트랩 직후).
입력: `/tmp/cycle-1-sim/summary.json` (50 cycle aggregate), `c1024.md` (1224 줄 narrative, 828,090 stamped events), `STATUS-2026-05-24.md`, EncounterEngine·CycleControllerV2·narrationVariants·NarrativeGenerator 코드.

## 점수

| 축 | 점수 | 근거 |
|---|---|---|
| 흥행성 | 6/10 | 첫 5세 ~50 events 안에 LV 1 → 87 폭발이 깔리고, 5세에 키메라 군주·뼈의 왕 같은 절정 적이 자연스럽게 섞여 inflation-rpg 정체성의 hook 은 강하게 살아 있다. 그러나 50 cycle 중 49 가 `max_arrivals=500` 으로 자른 인공 타이머 종료 — "끝났다"의 카타르시스가 없다. 30분 시연 후 누군가에게 "끝까지 가봐"라 추천할 만한 마지막 비트가 없다. |
| 재미 | 4/10 | `skillsLearned: 21/21 in all 50 cycles` — 50 cycle **전부**가 동일 21 skill을 학습한다 (deterministic, p50=p90=21). build 분기 = 0. `jobsUnlocked: mage 23 / paladin 11 / priest 13 / assassin 2 / ranger 1` 도 46% mage 편향. decision space 가 거의 닫혀 있다. moralChoice 평균 79회 중 `c1024` 의 분포는 거의 전부 "쓰러진 적을 처형" — merciful 음수 lock-in (EncounterEngine.ts L80, `sparing = current >= 0` 이지만 -3 drift 한 번이면 영원히 음수). variance 가 사라진 자리에 batch level-up "X단계 폭풍 성장" 메시지가 1224 줄을 채운다. |
| 몰입성 | 4/10 | V3-DEF 가 도입한 NPC 4종/EternalSaga/realm 전환의 narrative 가 1224줄짜리 대표 cycle 에 **0회** 등장한다. grep 으로 확인됨: `npc_encounter`/`npc_died`/`family_event` 가 `events.push` 만 되고 `recordToStore` 호출이 없어 saga 에 영영 안 새겨진다 (CycleControllerV2.ts L344/L351/L316/L321). V3-H 의 `hero_died` dead path 와 **완전히 동일한 패턴의 부채**가 V3-DEF 단계에서 새로 자라남. 결혼·자식·라이벌이 spawn 되지만 영웅의 일대기에는 단 한 줄도 등장하지 않으니 "eternal hero 의 연속성" 정체성이 narrative 차원에서 깨져 있다. 같은 cycle 에서 시즌은 2 줄, 시련은 5 줄로 미세하지만 살아 있다 — 코드와 narrative 의 wire 가 끊긴 부분만 골라서 빠진 셈. |
| 플레이 타임 | 6/10 | maxLevel avg 800,866 / p50 829,189 / p90 849,225 / max 869,422 — 50 cycle 의 분산이 좁고 (max/min ≈ 1.42) 모든 cycle 이 max_arrivals 로 잘려 곡선이 직선처럼 보인다. spec 의 "1만 시간 곡선"·"수십만 레벨 폭발" 정체성 기준에서 800k 는 적정 자릿수지만, p50 과 p90 의 거리 (20k = 2.4%) 가 너무 작아 "어떤 cycle 은 폭발하고 어떤 cycle 은 정체된다"는 variance 가 없다. shrine 1.38 회 / 500 arrival = 0.28% 노출도 feedback density 를 깎는다. content density 는 충분 (8 적 종류 + 9 장비 + 21 skill + 4 season + trial + sightseeing + meditation), 다만 모든 cycle 이 같은 깊이를 같은 속도로 본다. |

## 약점 TOP 3

1. **NPC saga dead path — V3-DEF 가 emit 하는 4 종 NPC event 가 모두 SagaRecorder 바깥에서 사라짐** — `CycleControllerV2.handleArrival` 의 `events.push({ type: 'npc_encounter' / 'npc_died' / 'family_event' ... })` 가 `recordToStore` 호출 없이 returned events array 에만 존재. 1224 줄 narrative 에 NPC 단어 등장 0회 (grep `npc|NPC|결혼|자식` = 0). spawn 코드 (T20)는 작동해서 store 에 NPC 가 쌓이지만 영웅의 일대기에는 라이벌·멘토·결혼·자식·NPC 사망이 영영 기록되지 않는다. STATUS L158 의 "Controller purity drift V3-E/F" 와 같은 뿌리. V3-H 가 `hero_died` dead path 를 회수한 직후, V3-DEF 가 심어둔 새 dead path 가 노출. **해결 방향**: NPC event 4종 모두 `recordToStore` + `NarrativeGenerator.forNpcEncounter/forNpcDeath/forFamilyEvent` 추가 + SagaTypes 의 `SagaEventType` 에 등록.

2. **Build 결정성 — 50 cycle 전부 동일 21 skill 학습, 직업 46% mage 편향** — `skillsLearnedCount` 에 21 종 모두 정확히 50/50. `jobUnlocks: avg 2 / p50 2 / p90 2` (deterministic). 의미 있는 분기가 player 의 선택이든 trait 든 시드든 어디서도 들어가지 않는다. SkillLearningSystem 이 모든 milestone level 에서 학습 가능 skill 을 전부 풀고 있을 가능성이 높다 (모든 cycle 이 5세에 LV 87 까지 가서 21 skill 의 milestone 을 다 통과). 재미의 "decision space" 가 0 으로 lock 된다. 같은 영웅이 매 cycle 똑같은 build 를 쌓으면 "Eternal Hero 의 연속성" 도 의미를 잃는다 (변화 없는 영원 = 정체). **해결 방향**: skill milestone 을 chapter / job-tree / personality 분기로 게이팅 — 한 cycle 에서 21 중 6~10 학습이 자연 상한이 되도록.

3. **인공 타이머 종료 — 49/50 cycle 이 `max_arrivals=500` cap 으로 강제 종결** — V3 spec 의 "eternal hero, idle sponsor, 자연사 후 회춘" 정체성과 정면 충돌. cycle 이 자연사·전사·영광스러운죽음 으로 끝나야 메타 누적 (rejuvenation count, EternalSaga era key `재생 #N`) 이 의미가 살지만, 현실은 사이클이 시간 다 차서 잘린다. `endCauses: max_arrivals 49 / 전사 1` — 전사조차 50 cycle 중 1 회. V3-H 의 death penalty -10% + auto-rejuv 5년이 작동할 기회 자체가 거의 없는 상태. **해결 방향**: maxArrivals cap 을 raise (1500~2000) + age 가 자연사 chapter (장년기·노년기) 에 들어가도 sim 이 안 끊기게 + chapter 별 적정 사망률 (V3 spec §6) 의 curve fit.

## 강점 (다음에도 유지)

- **첫 5세 hook**: 1 → 87 폭발이 50 events 안에 깔리며 "키메라 군주·뼈의 왕·세라핌" 같은 절정 적이 어린 시절에 자연스럽게 섞임. inflation-rpg 정체성을 narrative 가 즉시 알린다.
- **levelUp batch 6 variant**: c1024 의 80% 가 "한계를 돌파했다 / X단계의 비약 / LV A → B 폭풍 성장 / 미친 듯이 강해졌다 / N단계 연속 성장" — 6개로 1200 줄을 못 메우지만 "단조" 인상은 사이즈 자체에서 감춰진다. 이대로 두고 variant 수 자체보다 다른 event 의 dead path 회수가 우선.
- **V3-H Bug C fix 의 sim 측정 가능성**: realm_unlocked 98% — sim 이 진행을 측정할 수 있게 된 첫 cycle. balance sweep 의 토대가 살아 있다.
- **trial / sightseeing / meditation / season**: V3-H 가 새로 심은 4 event 모두 narrative 에 (드물지만) 등장. dead path 아님 — wire 가 잘 박힘.

## 표류 경보

- **`max_arrivals 49/50` 인공 종료가 "eternal hero" 정체성을 갉아먹는다**. V3 spec 의 컨셉 = 영웅이 자연사하고 sponsor 가 회춘시키고 다시 cycle — 시간이 다 차서 잘리는 cycle 이 49 면 회춘 marker (`재생 #N`) 의 의미가 0. 50-cycle sim 의 50 회 회춘이 일어나야 EternalSaga 의 `재생 #N` era key 가 차곡차곡 쌓이는데, 실측은 그 흐름이 거의 없다. inflation 곡선을 더 높이는 V3-G balance pass 전에 sim cap 부터 raise + chapter 별 사망률 curve 부터 spec 화 필요.
- **Controller purity drift V3-E/F 가 NPC dead path 의 뿌리**. STATUS L158 이 이미 기록한 부채. V3-H 가 controller 안에서 `useGameStore.setState` 를 호출하는 패턴을 그대로 따랐고 (season transition), 그 결과 "controller 안에서 state 만 mutate 하고 saga 는 따로" 라는 분리가 굳어지는 중. V3-G 또는 별도 refactor 에서 purity 재정립 결정이 미뤄질수록, 새 event 가 추가될 때마다 saga dead path 가 자랄 risk.
- **컨셉 정합성 자체는 표류 아님**. 1 → 800k 폭발, idle 의 죄책감 없음 (auto-resume), eternal hero 의 연속성 자체는 코드에 박혀 있다. 위 두 항목은 *정체성을 사이드에서 깎는* 표류일 뿐, 게임이 다른 게임이 되어가는 신호는 아직 없다.
