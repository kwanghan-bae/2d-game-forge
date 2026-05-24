# Cycle 1 웹리서치 (Web Researcher)

조사 일자: 2026-05-24 (접속 일자 표기는 본문 링크 옆에 별도 명기)
대상: V3-H Depth+Polish 머지 직후 (`964456b`) — `cycle-1-critic.md` / `cycle-1-story-critic.md` / `cycle-1-level-critic.md` 가 공통으로 짚은 3 약점에 대한 산업 best practice 정찰.

## 조사 주제

직전 Phase A 평가가 가리킨 3 카테고리.

1. **결정론적 build / 모든 cycle 동일 21 skill / Tier 2 mage 46% 편향** — idle hero sim 에서 build variance 를 어떻게 보장하는가. (cycle-1-critic 약점 #2, cycle-1-level-critic 약점 #1·#2)
2. **realm 톤 부재 / levelUp 6 variant 가 cycle 당 수백 회 발사로 즉시 고갈 / 50 cycle 중 전사 1** — auto/idle narrative 의 variance 와 climax 비트는 어떻게 만드는가. (cycle-1-story-critic 약점 #1·#2, cycle-1-critic 약점 #3)
3. **eternal hero 의 realm/age/saga 표현** — 영웅이 죽지 않고 회춘하며 무한 saga 를 쓰는 컨셉을 narrator 가 어떻게 따라가는가. (cycle-1-critic 표류 경보 — eternal hero 정체성)

## 유사 컨셉 게임 (5 개)

### 1. Path of Achra (Steam, 2024 정식 출시, 99% overwhelmingly positive · 600+ reviews)

- **핵심 mechanic**: 턴제 hardcore-roguelike. 캐릭터를 **Culture / Class / God 3 축**으로 짓고, run 중에 24 종 power 와 장비로 synergy 를 누적해 "broken build sandbox" 를 의도적으로 허용.
- **잘 된 점**:
  - 3 prong 조합 × 24 옵션의 곱셈으로 매 run 이 다른 archetype 이라는 평가. ([Rogueliker 리뷰, 접속 2026-05-24](https://rogueliker.com/path-of-achra-review/))
  - 점진적 언락 — 첫 run 은 좁고, 진행할수록 새 옵션이 풀려 build space 가 시간을 거쳐 펼쳐지는 구조. (위 동일 출처, 접속 2026-05-24)
  - 추가 특화 — "특정 class 에 충분히 투자하면 specialise route 와 bonus 가 더 열린다" 는 명시 인용. (위 동일 출처, 접속 2026-05-24)
- **잘 안 된 점**:
  - overworld 분기 표기가 직관적이지 않다는 community 지적 — branching 이 시스템에는 있는데 UI 가 못 살린다는 비판. ([Steam Community Discussions, 접속 2026-05-24](https://steamcommunity.com/app/2128270/discussions/0/3821910883989299224/))
- **inflation-rpg 적용 가능성**: inflation-rpg 의 skill catalog 가 cycle 당 21/21 모두 학습되는 봉인은 "선택 축이 한 줄짜리 milestone (`learn at LV X`)" 이라 그렇다. Path of Achra 처럼 **personality dim × job tag × realm-tag 3 축** 으로 skill 의 prerequisite 를 펴면, 같은 cycle 안에서 학습 가능 풀이 자연히 6~10 으로 줄고 cycle 간 build 가 갈라진다. 그대로 베끼지 말고 "축의 곱셈으로 cycle 간 build 가 자연 분기" 라는 원칙만 가져온다.

### 2. Caves of Qud (Steam, Overwhelmingly Positive)

- **핵심 mechanic**: 매 world 마다 6 명 sultan 의 procedural 역사를 생성. 1~5 대 sultan 은 절차적, 6 대 Resheph 은 고정. 각 sultan 은 17 종 event type 에서 8 개를 뽑아 10~22 개 chapter 의 역사를 가짐. state machine + replacement grammar + 40,000 단어 corpus.
- **잘 된 점**:
  - "역사 → 인과 합리화" 의 역순 — 사건을 먼저 뽑고 인과는 나중에 텍스트로 덧붙임. 결과적으로 한 sultan 의 일대기가 매번 새 mythic biography 처럼 읽힘. ([Caves of Qud Wiki — Sultan histories, 접속 2026-05-24](https://wiki.cavesofqud.com/wiki/Sultan_histories))
  - corpus 양 자체가 무기 — 40,000 단어가 replacement rule 로 재조합돼 "diction 을 codify 하고 procedurally repackage". ([Grinblat 2017 — Subverting Historical Cause & Effect, PCGW Proceedings, 접속 2026-05-24](https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf))
  - sultan 의 lore 가 world 의 location 으로 영속화 — 역사 event 가 새 지도 지점·이름을 만들어 narrative 가 시스템 상태로 남음. (Caves of Qud Wiki, 접속 2026-05-24)
- **잘 안 된 점**:
  - story-mode 와 classic 의 분리 / 일부 user 가 history 가 매 game 무작위인지 헷갈려함 — 즉 procedural 깊이가 player 에게 잘 안 보이는 UX 빈틈. ([Steam Discussion — Is lore/sultan history randomized?, 접속 2026-05-24](https://steamcommunity.com/app/333640/discussions/0/4624727344207160308/))
- **inflation-rpg 적용 가능성**: EternalSaga 의 era key (`재생 #N`) 가 현재는 카운터일 뿐 lore 가 없다. Qud 의 sultan-history 방식을 줄여서 — **회춘 사이 한 cycle 을 "1 대 영웅의 한 chapter" 로 보고, 17 type 같은 event-pool 에서 N 개를 뽑아 chapter heading + closing 두 줄을 procedural 로 조립**. SagaBookModal 에서 cycle 마다 chapter 가 다른 표제를 갖게 된다. 카피 금지 — Qud 의 사망 후 재구성과 달리, inflation-rpg 는 살아있는 영웅의 회춘 사이를 chapter 로 본다.

### 3. Wildermyth (Steam, procedural narrative tactical RPG)

- **핵심 mechanic**: 5 chapter 의 procedural tactical RPG. **chapter 시작·종료는 hand-written bespoke 텍스트**, 중간 event 는 character 의 personality + hook (= side-quest tag) 의 곱으로 분기. 캐릭터가 retire 하면 Legacy pool 로 옮겨져 다음 campaign 에서 재등장.
- **잘 된 점**:
  - **bespoke 양 끝 + procedural 가운데** 라는 chapter 구조 — chapter boundary 의 카타르시스를 손글씨가 잡고, 중간은 절차로 채워 분량을 감당. ([RPG Site Review, 접속 2026-05-24](https://www.rpgsite.net/review/12107-wildermyth-review))
  - personality stat 이 "누가 말하느냐 / 무엇을 말하느냐 둘 다 modify" 하는 이중 역할 — 같은 event 라도 화자의 성격으로 frame 자체가 바뀜. ([Steam Discussion — Personality vs Hooks, 접속 2026-05-24](https://steamcommunity.com/app/763890/discussions/0/4241812037674029611/))
  - Legacy 시스템이 "이전 영웅이 다음 영웅의 세계에 살아남는" 메타 누적 — eternal hero 와 직접 닮은 축. ([RPGamer Review, 접속 2026-05-24](https://rpgamer.com/review/wildermyth-review/))
- **잘 안 된 점**:
  - 다회차 시 reviewer 들이 "패턴이 보인다 / 캐릭터를 알고리즘에 먹이는 attribute 묶음으로 본다" 며 절차적 한계 노출 보고. ([Vice Review, 접속 2026-05-24](https://www.vice.com/en/article/pkbz78/wildermyth-review))
- **inflation-rpg 적용 가능성**: V3 narrator 가 personality (9 pious 등) 를 catalog 8 종 raw 문장에 묻어버리는 현재 약점 (story-critic #3) 의 정확한 대척점. Wildermyth 의 **personality-as-frame** 모델을 narrator 차원에 도입 — `forBattle(enemy, age, personality, job)` 처럼 personality 가 문장 frame 의 modifier 로 들어가 6 variant 가 personality dim 만큼 곱해진다. Legacy 시스템은 EternalSaga 의 era key 와 wire 가 이미 비슷 — chapter 양 끝 hand-written 만 더 채우면 된다.

### 4. Hero Generations (Steam, turn-based generational roguelike)

- **핵심 mechanic**: "5분짜리 Civ" — 영웅의 한 step = 한 year. 수명 50~125 년. 죽기 전에 mate 를 찾고 자식이 다음 영웅이 됨. mate 의 trait 가 자식에게 유전.
- **잘 된 점**:
  - **한 영웅 = 짧고 가속된 일대기**라는 frame 자체가 narrative climax 의 비트를 짜준다 — 죽음·계승이 정해진 시간 안에 강제로 일어남. ([Steam — Hero Generations, 접속 2026-05-24](https://store.steampowered.com/app/295590))
  - 2000 년 lineage 라는 메타 곡선이 짧은 1 life 와 분리된 두 축으로 동시에 진행. (동일 출처, 접속 2026-05-24)
  - mate trait 유전 — 영웅 간 연속성이 "다음 영웅의 stat" 으로 system 에 박힘. ([Hero Generations Fandom Wiki, 접속 2026-05-24](https://hero-generations.fandom.com/wiki/Hero_Generations))
- **잘 안 된 점**:
  - 단일 hero life 의 narrative 가 짧고 시스템 위주여서 "감정 곡선" 자체는 짧음 — climax 가 메타 (lineage) 에 있고 인스턴스 (1 life) 에 약함.
- **inflation-rpg 적용 가능성**: inflation-rpg 의 회춘은 "같은 영웅이 다시 젊어진다" 라 Hero Generations 의 계승과 다르지만, **age → era milestone 의 강제 비트** 는 그대로 쓸 만하다. 13세 (사춘기) / 30세 (성인) / 50세 (장년) / 70세 (자연사 임박) 같은 chapter boundary 가 narrator 에 hook (현재 헤더만 있고 narrator 무자각) 으로 박혀야 levelUp 6 variant 의 단조 인상이 깨진다.

### 5. Loop Hero (Steam, "Overwhelmingly Positive")

- **핵심 mechanic**: 영웅이 자동으로 loop 를 돌고, 플레이어는 tile/card 를 배치해 biome 을 짓는다. **chapter 별 boss** 가 map 완성 게이지를 채워 spawn. campfire 가 "유일한 안전지대" 로 chapter 의 호흡을 잡음.
- **잘 된 점**:
  - **자동 전투 + 플레이어의 환경 디자인** 분리 — auto-battle 게임에서 플레이어의 의사결정 슬롯을 narrative 외곽(환경)에 둠. ([Loop Hero Wiki — Campfire, 접속 2026-05-24](https://loophero.fandom.com/wiki/Campfire_(tile)))
  - **chapter boss 가 map 완성 게이지로 trigger** — 자연사·전사 같은 인스턴스 종료에 의지하지 않고 "환경이 차서 endboss 가 나타나는" 명시적 chapter 종료. ([PC Gamer — Loop Hero boss guide, 접속 2026-05-24](https://www.pcgamer.com/loop-hero-boss-secret-first-rewards/))
  - 영웅의 기억 회복이 환경 복원과 동일 시스템 — narrative 와 mechanic 이 같은 곡선. ([Kotaku Review, 접속 2026-05-24](https://kotaku.com/loop-hero-is-a-wonderful-new-rpg-about-overcoming-despa-1846409109))
- **잘 안 된 점**:
  - 동일 tile 의 flavor text 가 한정적 — 수십 시간 후 같은 biome card 의 문장 반복이 보고됨 (community discussion 다수, 단 specific 인용 가능한 thread 는 search 미인덱싱).
- **inflation-rpg 적용 가능성**: cycle-1-critic 약점 #3 의 "49/50 cycle 이 max_arrivals 타이머 종료" 문제의 가장 가까운 해법. Loop Hero 처럼 **realm 별 chapter 게이지가 차면 chapter boss 가 등장 → 처치 또는 패배가 chapter 종결** 의 게임 디자인을 V3 에 이식하면, max_arrivals 인공 종료가 아니라 "다음 realm chapter 가 풀린 직후" 같은 자연 비트가 cycle 단위에 박힌다. 카피 금지 — Loop Hero 의 retreat 메커니즘은 player 의 manual 입력이 핵심, V3 는 hands-off 라 게이지 trigger 만 빌리고 retreat 는 빌리지 않는다.

## 트렌드 / 패턴

- **"Bespoke 양 끝 + Procedural 가운데" 의 chapter 구조** — Wildermyth (2021), Caves of Qud (2024 정식) 같은 procedural narrative 게임이 공통으로 채택. chapter boundary 만 hand-written, 중간은 절차로 채워 변동성과 카타르시스를 분리. ([RPG Site, 접속 2026-05-24](https://www.rpgsite.net/review/12107-wildermyth-review))
- **"Build sandbox" 의 3 prong 축** — Path of Achra (2024) 가 "최근 1년 새 한 cult 카테고리에서 가장 큰 인기" — race/class/god 3 축의 곱셈으로 build variance 를 강제하는 모델. 99% positive 600+ reviews 의 검증. ([Backloggd — Path of Achra, 접속 2026-05-24](https://backloggd.com/games/path-of-achra/))
- **"Lineage / Legacy" 의 메타 누적** — Wildermyth Legacy pool, Hero Generations mate trait 유전 — 영웅 단위 narrative 와 가문 단위 narrative 를 두 곡선으로 분리. inflation-rpg 의 EternalSaga era key 가 이 위치를 차지할 수 있음.
- **NGU Idle 의 progression curve = "exponential ×exponential"** — incremental 정상 패턴: rebirth cycle 마다 cap 이 풀려 skill saturation 이 cycle 단위로 게이팅됨. inflation-rpg 의 SHRINE_SKILL_GRANT_RATE 0.48 이 이 게이팅 부재의 직접 표현. ([SteamReview — NGU Idle 분석, 접속 2026-05-24](https://steamreview.info/review/2663903))
- **안티-트렌드 신호 1**: NGU Idle 의 "feature unlock 직후 며칠~몇 주 못 쓰는 mechanic" — incremental 의 비판 받는 패턴. inflation-rpg 가 새 skill/job 을 풀 때 즉시 의미 있는 effect 가 묻어와야 안티-패턴 회피. ([NGU Idle Steam Reviews 다수, 접속 2026-05-24](https://store.steampowered.com/app/1147690/NGU_IDLE/))

## 인스피레이션 → invention (3 → 1)

- **inspiration 1 (build variance)**: Path of Achra 의 **Culture × Class × God 3 축 × 24 option** — 축의 곱셈으로 cycle 간 build 가 자연 분기. ([Rogueliker, 접속 2026-05-24](https://rogueliker.com/path-of-achra-review/))
- **inspiration 2 (narrative variance / chapter tone)**: Wildermyth 의 **personality-as-frame** + **bespoke chapter 양 끝 / procedural 중간** — 화자 성격이 같은 event 의 문장 frame 자체를 바꾸고, chapter 양 끝만 손글씨로 카타르시스를 잡음. ([RPG Site, 접속 2026-05-24](https://www.rpgsite.net/review/12107-wildermyth-review))
- **inspiration 3 (eternal hero 의 chapter 비트)**: Loop Hero 의 **chapter boss = map 완성 게이지 trigger** — 자연사·전사·타이머 같은 인스턴스 종료가 아니라 환경 시스템이 차면 chapter 가 자연 종결. ([PC Gamer, 접속 2026-05-24](https://www.pcgamer.com/loop-hero-boss-secret-first-rewards/))

**invention (단일 통합 제안 — "Realm Chapter Narrator")**:

inflation-rpg 의 V3 회춘 cycle 안에 **realm 단위 sub-chapter** 를 도입한다. 한 cycle 은 base → sea → volcano → ... 의 realm 진입 순서로 N 개 chapter 로 쪼개진다. 각 chapter 는

1. **Bespoke realm-enter hand-written 한 줄** (`forRealmEnter`, realm 별 5 variant — story-critic 의 제안과 일치),
2. **Procedural 중간 — personality × job-tag × realm-tag 3 축으로 modifier 된 narrator**. levelUp · battle · moralChoice 의 6 variant 는 그대로 두되, 화자 frame 이 (personality.pious, job.priest, realm.heaven) 같은 tag 조합으로 prefix/suffix 가 갈리도록 wrap. Caves of Qud 의 replacement grammar 처럼 작은 corpus 도 곱셈으로 부풀린다.
3. **Realm chapter 게이지** — realm 안에서 N 적 처치 또는 milestone level 도달 시 chapter boss arrival 이 deterministic 하게 trigger 되고, 처치 시 `forRealmClear` 의 hand-written closing. Loop Hero 의 map 게이지 = inflation-rpg 의 realm-arrival 게이지.

부수 효과: ① skill milestone 의 prerequisite 에 realm-tag 가 들어가 21/21 학습이 자연 약화 (level-critic #2 해법 변형). ② realm 톤 부재 (story-critic #2) 가 forRealmEnter/Clear 의 hand-written + realm-tag modifier 두 축으로 해소. ③ max_arrivals 인공 종료 (critic #3) 가 chapter boss trigger 로 대체 가능 — 자연사가 안 와도 chapter clear 라는 catarsis 비트가 cycle 안에 N 회 발생.

## 안티-패턴 경고

- **Pay-to-Skip / FOMO 이벤트**: 인플레이션 곡선이 정체성인 게임에서 "skip token" 은 곡선 자체를 부정. NGU Idle 의 rebirth 게이팅이 진행을 늦추지만 skip 을 팔지 않는 점이 cult 평가의 기둥. ([SteamReview — NGU Idle, 접속 2026-05-24](https://steamreview.info/review/2663903)) inflation-rpg 도 광고 stub / 균열석은 buff 측이지 skip 이어선 안 된다.
- **일반 RPG 30-50 lv cap 의 milestone 디자인 답습**: Hero Generations 가 "5분 Civ" 라는 frame 으로 짧은 인스턴스를 정당화하듯, inflation-rpg 도 "1 → 수십만 레벨 폭발" frame 을 narrator 가 따라가야 한다. levelUp variant 가 일반 RPG 어휘 ("강해졌다", "성장했다") 만 쓰면 frame 위반. story-critic #1 의 "구간별 톤 분리" (≤999 신체적 / 1k-999k 추상적 / 1M+ 우주적) 가 이 frame 의 narrative 차원 정합화.
- **Procedural-only 의 차가운 인상**: Wildermyth 의 다회차 reviewer 가 보고한 "캐릭터가 알고리즘에 먹이는 attribute 묶음" 느낌. ([Vice, 접속 2026-05-24](https://www.vice.com/en/article/pkbz78/wildermyth-review)) 모든 chapter 양 끝까지 절차로만 채우면 빠지는 함정 — invention 의 1 (bespoke hand-written 한 줄) 을 빼면 inflation-rpg 도 같은 차가움.

## 참고 링크

- [Rogueliker — Path of Achra Review](https://rogueliker.com/path-of-achra-review/) — 접속 2026-05-24
- [Backloggd — Path of Achra](https://backloggd.com/games/path-of-achra/) — 접속 2026-05-24
- [Steam Community — Path of Achra Discussions (Minimalist Builds)](https://steamcommunity.com/app/2128270/discussions/0/3821910883989299224/) — 접속 2026-05-24
- [Caves of Qud Wiki — Sultan histories](https://wiki.cavesofqud.com/wiki/Sultan_histories) — 접속 2026-05-24
- [Grinblat 2017 — Subverting Historical Cause & Effect: Generation of Mythic Biographies in Caves of Qud (PCGW)](https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf) — 접속 2026-05-24
- [Steam Community — Caves of Qud lore/sultan history randomized?](https://steamcommunity.com/app/333640/discussions/0/4624727344207160308/) — 접속 2026-05-24
- [RPG Site — Wildermyth Review](https://www.rpgsite.net/review/12107-wildermyth-review) — 접속 2026-05-24
- [RPGamer — Wildermyth Review](https://rpgamer.com/review/wildermyth-review/) — 접속 2026-05-24
- [Vice — Wildermyth Embraces Storytelling Traditions in a Procedural Narrative](https://www.vice.com/en/article/pkbz78/wildermyth-review) — 접속 2026-05-24
- [Steam Community — Wildermyth Personality Stats vs Hooks](https://steamcommunity.com/app/763890/discussions/0/4241812037674029611/) — 접속 2026-05-24
- [Steam — Hero Generations](https://store.steampowered.com/app/295590) — 접속 2026-05-24
- [Hero Generations Fandom Wiki](https://hero-generations.fandom.com/wiki/Hero_Generations) — 접속 2026-05-24
- [Loop Hero Wiki — Campfire (tile)](https://loophero.fandom.com/wiki/Campfire_(tile)) — 접속 2026-05-24
- [PC Gamer — Loop Hero boss guide](https://www.pcgamer.com/loop-hero-boss-secret-first-rewards/) — 접속 2026-05-24
- [Kotaku — Loop Hero Review](https://kotaku.com/loop-hero-is-a-wonderful-new-rpg-about-overcoming-despa-1846409109) — 접속 2026-05-24
- [SteamReview — NGU Idle 분석](https://steamreview.info/review/2663903) — 접속 2026-05-24
- [Steam — NGU IDLE](https://store.steampowered.com/app/1147690/NGU_IDLE/) — 접속 2026-05-24
