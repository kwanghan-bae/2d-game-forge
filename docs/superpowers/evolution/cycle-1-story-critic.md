# Cycle 1 비평 (Story Writer)

50-cycle V3 sim (`/tmp/cycle-1-sim/`) 의 c1024 / c1049 narrative 와 `narrationVariants.ts` (153 lines, 10 variant 풀), `personalityEncounters.ts` (4 landmark × 2 분기), `NarrativeGenerator.ts` 정독 후 평가한다.

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 4/10 | battle/levelUp/drop 은 5~8 variant 로 무난. 그러나 levelUp + levelUpBatch 가 한 cycle 에 **수백 번** 발사돼 6 variant 가 즉시 소진된다. moral choice 의 raw text 는 catalog 8 종(`personalityEncounters` 4×2)뿐이라 한 cycle 80 발사 중 같은 문장이 50회 이상 반복. season transition 은 **변주 0** — `"계절이 바뀌었다 — 여름"` 한 줄 hard-code (`OverworldRunner` 추정). |
| 톤 일관성 (realm/season/personality) | 3/10 | realm 별 톤 차이가 **0**. base/sea/volcano/underworld/heaven/chaos 어디에 있든 모든 narration 이 `"N세에 X를 처치했다"` 동일 톤. enemyNameKR 만 갈리고 narrator 의 시선·문체는 그대로. personality 9 pious 인데 narrator 가 신앙적 frame 을 절대 쓰지 않음 — choice 문장 자체에만 신앙 어휘가 들어가고 그 외 800줄은 무차별. |
| 감정 곡선 (boredom → climax) | 2/10 | c1024 는 500 arrivals × 평균 2.5 line ≈ 1225 줄 평탄선. levelUp "X단계 폭풍 성장" 이 매 줄마다 터져 **climax 감각이 인플레만큼 즉시 dead**. 시련(사망 후 +3 LV) 5회는 의례적 한 줄. 13세 청년기 / 30세 성인기 같은 **chapter boundary 가 narrator 의식에 없다** — `## 어린시절 (5-14세)` 헤더만 분할기로 작동. realm 첫 진입 / 보스 처치 / job unlock 의 비트가 동일 톤 한 줄에 묻힘. |
| 세계관 정합 | 5/10 | 어린시절 헤더 + age 표기 + "재생 #N" + 시련 LV+3 등 골격은 살아있다. realmTransitions 이 `EternalSaga.ts` 에 기록되지만 **narrative 에 한 줄도 나타나지 않음** (50 cycle 중 0건 — 거의 base 밖 진출 못 했기 때문 + narrator hook 부재 양쪽). 회춘 (`forRejuvenation`) catalog 는 5 variant 있지만 c1024/c1049 둘 다 발화 0회 — death 가 max_arrivals 49건이라 회춘 trigger 자체가 거의 안 옴. |

## 약점 TOP 3

1. **levelUp/levelUpBatch 의 변주 고갈** — `narrationVariants.ts` L26-44. 한 cycle 에 levelUp 류가 수백 발 터지는데 variant 6 종 × seed 모듈로 → 같은 문장이 cycle 내 50회+ 반복 (`"미친 듯이 강해졌다 — LV X → Y"` 가 c1024 에서만 12회 확인). idle 12분 시청 중 **압도적 절반의 텍스트가 같은 6 문장의 반복**. 해결 방향: variant 를 15+ 로 확장하고, **level 구간별 (≤1000 / 1k-1M / 1M+) 톤 분리** — 초반엔 "발끝까지 떨렸다", 1M+ 엔 "차원이 들썩였다" 같은 격차.

2. **realm/season hook 의 narrator 부재** — `NarrativeGenerator.ts` 에 `forRealmEnter` / `forSeasonChange` 가 아예 없음. season 은 `OverworldRunner` 가 직접 한 줄을 적어 SagaRecorder 우회. realm transition 은 saga state 에만 기록될 뿐 narrative line 0. 결과: 영웅이 sea→volcano→heaven 으로 가도 narrative 톤이 base 들판과 동일. 해결 방향: `forRealmEnter(realm, age)` + `forSeasonChange(season, age, realm)` 2 generator 추가 + realm 별 5 variant — base/sea/volcano/underworld/heaven/chaos 각 첫 진입 문장이 톤을 잡는다.

3. **moral choice 의 문장 재사용 + caste 무관** — `personalityEncounters.ts` 의 nameKR 8개가 catalog 전부. cycle 당 80회 발사인데 raw 문장이 8 → 한 문장이 평균 10회 반복. moralChoice variant 풀 (`MORAL_VARIANTS` 5종) 은 frame 만 바꾸지 핵심 문장은 그대로. 게다가 c1024 의 mage / c1049 의 priest 가 같은 "쓰러진 적을 처형하여 잔혹함이 굳어졌다" 텍스트를 동일 빈도로 부른다 — caste 분포 imbalance (mage 23 / paladin 11 / priest 13 / assassin 2 / ranger 1) 가 narrative 색채로 전혀 안 새어나옴. 해결 방향: 각 PERSONALITY_ENCOUNTERS 항목에 **3-4 variant nameKR** 를 두고, job-tag 가 있을 땐 priest 가 행인 도울 때 "사제는 행인의 손에 성수를 건넸다" 처럼 frame 가산.

## 차기 narrative 제안

- **realm 첫 진입 비트 — `forRealmEnter`**: 트리거 = `SagaEvent realm_unlocked` 의 narrativeText slot. 톤 = realm 별 단편 한 줄. 결과 = SagaBookModal 의 "여정" filter 에서 chapter 경계가 시각적으로도 살아남. 실제 텍스트 예시:
  - `(13세) 바다 안개가 발치까지 올라왔다. 영웅은 처음으로 짠 공기를 들이마셨다 — 심해의 문이 열렸다.`
  - `(21세) 발 밑이 붉게 갈라졌다. 용암의 입김이 갑옷을 핥았다 — 화산의 영역.`
  - `(34세) 발 디딘 곳에 잿빛 강이 흘렀다. 죽은 자의 속삭임이 귓가에 닿았다 — 명계의 문턱.`

- **levelUp 구간별 톤 — `LEVELUP_VARIANTS` 분기**: 트리거 = newLevel 의 자릿수. ≤999 = 신체적 ("팔에 힘이 들었다"), 1k-999k = 추상적 ("법칙이 한 단 굽혀졌다"), 1M+ = 우주적 ("차원이 영웅 쪽으로 기울었다"). 결과 = 인플레가 narrator 의 vocabulary 로도 드러남. 실제 텍스트 예시:
  - `(5세, LV 87) 5세에 어깨가 단단해지는 것을 느꼈다. (LV 87)`
  - `(12세, LV 22,378) 12세에 한 단 더 깊은 경지가 펼쳐졌다. (LV 22,378)`
  - `(25세, LV 1,240,000) 25세에 세계의 결이 영웅 쪽으로 굽었다. (LV 1.24M)`

- **회춘 직후 첫 줄 — `forPostRejuvenationFirstAct`**: 트리거 = rejuvenation 직후 첫 battle/levelUp/moralChoice 1건만. 한 cycle 1회 한정. 톤 = "되돌아온 시간에서 처음 한 일". 결과 = max_arrivals 종료가 절대 다수인 50 cycle 에서도 회춘이 발생할 땐 narrative climax 가 생긴다. 실제 텍스트 예시:
  - `(28세) 되돌아온 손끝이 처음 닿은 것은 고블린의 갑옷이었다. 28세에 고블린을 처치했다.`
  - `(35세) 다시 젊어진 영혼은 행인의 손을 잡았다. 35세에 길 위 행인을 도와 영혼이 정화되었다.`

## 표류 경보

- realm 톤 위반은 **현재 거의 모든 line** 이 base 톤으로 작성되어 있다는 점에서 이미 임계. eternal hero 컨셉 자체는 깨지지 않았으나 (max_arrivals 종료 / 시련 LV+3 으로 죽음을 회피하는 구조는 유지), **"무한 saga 의 각 챕터는 톤이 달라야 한다"** 는 원칙이 narrator 레벨에서 아예 구현 안 됨 — Cycle 2 가 손대지 않으면 V3-H 가 시각적으로 잡은 realm 차이가 텍스트로 흩어진다.
