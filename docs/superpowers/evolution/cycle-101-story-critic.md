# Cycle 101 비평 (Story Writer) — Realm-Specific Narrative Tone PRD

PRD 가 cycle 2 story-critic 의 "hook 만 있고 sustain 없음" 진단을 정조준한 것은 정확하다. 그러나 6 realm × 4 variant 의 어휘 자체를 뜯어보면 *cliche 위험 / 톤 동질화 / ageTone 과의 합성 충돌* 세 측면에서 손볼 곳이 있다. 아래는 어휘 단위 비평 + 합성 시뮬레이션 + 개선 제안.

## realm 어휘 health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (4 variant suffix 풀 두께) | 5/10 | ageTone 도 4 variant 라 mirror 원칙은 맞음. 그러나 ageTone 은 prefix 영역이라 한 문장에 1 회만 등장, realm 은 한 realm 체류 중 매 line append → 회전 인지 더 빠름 |
| 톤 일관성 (realm 간 차별화) | 6/10 | sea/volcano/underworld/chaos 는 강한 특유 어휘. **base/heaven 은 약함** — heaven 의 "빛/구름" 이 levelUp catalog 의 "성장의 빛" "빛난다" 와 의미 중첩 |
| ageTone 합성 정합 | 7/10 | append vs replace 영역 분리로 josa 충돌은 없음. 그러나 *의미 충돌* (청춘 + 황천, 황혼 + 차가운 손) 미점검 |
| 세계관 정합 | 8/10 | 6 realm 의 spec 진입 line (REALM_ENTER_VARIANTS) 톤과 일치. 진입 line 어휘를 그대로 mirror 한 점은 좋음 |

## realm 별 어휘 비평

### base ("들판" / "바람에 흔들리며" / "흙냄새 속에서")

- **cliche 위험: 낮음**. base 는 의도적으로 평범한 톤이 맞음 — chaos/heaven 대비 contrast 가 narrative 의 기준선.
- **동질화 위험: 낮음**. v1-v3 셋 다 시각/촉각/후각 다른 감각 — 좋은 분배.
- **톤 충돌: 없음**. 단 v0 (원문) 비중이 너무 큼. base realm 의 0-30% age 구간이 saga 의 첫 1-2 분 → 첫인상 어휘인데 seed=0 시 어휘 0. variant 0 = 원문 정책이 backward compat 필요는 맞지만, **base 만 v0 을 "들판 너머로" 같은 약-realm 어휘로 바꾸는 것** 권장 (Section §개선 참조).

### sea ("파도 곁에서" / "심해의 침묵 속" / "갯바람을 가르며")

- **cliche 위험: 낮음**. "심해의 침묵" 은 약간 시적이지만 inflation-rpg 의 6 tier saint/saga 톤과 정합.
- **동질화 위험: 중간**. 셋 다 "물 + 공간" frame. **수면 아래(심해) / 수면 위(파도/갯바람) 분리**는 되지만 "파도" 와 "갯바람" 은 둘 다 표면 어휘라 misroll 시 인접 line 에서 회전이 빠르게 느껴짐.
- **톤 충돌: 낮음**. levelUp "벽을 넘었다" + sea "심해의 침묵 속" → 무난. battle "쓰러뜨렸다" + sea "파도 곁에서" → 무난.

### volcano ("용암의 열기 속" / "검은 재 위에서" / "붉은 빛을 받으며")

- **cliche 위험: 낮음**. 셋 다 진입 line 의 어휘를 정직하게 mirror.
- **동질화 위험: 중간**. **"용암 / 재 / 붉은 빛" — 셋 다 시각 어휘에 치우침**. 청각 (예: "쇳소리 너머") 이나 후각 (예: "유황 냄새 속") variant 가 1 개라도 있으면 감각 분배 향상.
- **톤 충돌: 낮음**. 단 levelUp "성장의 빛이 일었다" + volcano "붉은 빛을 받으며" → **두 "빛"** 충돌. seed misroll 시 한 줄에 빛 2 회 — Section §개선 의 v3 swap 후보.

### underworld ("황천의 그림자 속" / "차가운 손 사이" / "꺼진 빛 너머에서")

- **cliche 위험: 중간**. "황천 / 차가운 손 / 꺼진 빛" 셋 다 한국 RPG 황천 트로프 직설. 이는 의도된 정합 (REALM_ENTER_VARIANTS 와 동일 톤) 이지만 **idle 12 분 노출 시 약간 무거움**. 영웅이 underworld 에서 levelUp 한다는 긍정 비트가 "차가운 손 사이" 로 마무리되면 *영원회춘 idle hero* 의 hopeful 톤과 약한 마찰.
- **동질화 위험: 높음**. **셋 다 "어둠 + 죽음 + 차가움"** 한 frame. underworld 는 가장 sustain 이 필요한 realm 중 하나인데 (sea/volcano 다음 도달률) variant 4 가 다 비슷.
- **톤 충돌: 중간**. ageMatureTone 의 "단련된 의지로" + underworld "꺼진 빛 너머에서" → 정합. 그러나 **ageYoungAdultTone "15세 청춘에" + underworld "황천의 그림자 속"** → 청춘과 황천의 음양 충돌 — 비유로 살릴 수 있지만 misroll 시 어색.

### heaven ("빛의 다리 위" / "구름의 결 사이" / "별빛 가루를 밟으며")

- **cliche 위험: 높음**. "빛의 다리 / 구름의 결 / 별빛 가루" 셋 다 표준 천공 트로프. 이게 진입 line (1 회) 으로는 효과적이나, **battle/levelUp/drop 매 line append 되면 saccharine** 위험.
- **동질화 위험: 매우 높음**. **3 variant 모두 "빛 + 위/사이/밟다" 위치격 어휘**. heaven 은 saga 후반부 도달률 ~20% 라 idle 사용자가 마침내 도달했을 때 강한 인상이 필요한데 catalog 가 가장 단조.
- **톤 충돌: 높음**. **levelUp catalog 의 "성장의 빛이 일었다" + heaven "빛의 다리 위"** = 빛 중첩. drop catalog 의 "빛났다" + heaven "별빛 가루를 밟으며" = 빛 중첩 2. **heaven 은 빛 어휘 1 개로 줄이고 다른 감각 (소리: "찬송의 음 사이") 도입 권장**.

### chaos ("혼돈의 중심에서" / "시간을 잊은 곳" / "경계가 흐려진 자리에서")

- **cliche 위험: 낮음**. chaos 는 도달률 5-10% 의 endgame 이라 강한 어휘가 적절.
- **동질화 위험: 중간**. 셋 다 "추상 + 인지 와해" frame. 그러나 chaos 는 *추상* 자체가 톤이라 의도적 동질화로 볼 수 있음.
- **톤 충돌: 매우 낮음**. ageFinalTone 의 "마지막 호흡으로" + chaos "경계가 흐려진 자리에서" = PRD 의 비고 §3 예시처럼 강한 시너지. **최고의 합성 쌍**.

## ageTone × realmTone 합성 시뮬레이션

5 risk case 를 손으로 굴려본다 (catalog seed 가정).

1. **`"5세에 늑대를 압도했다."` + ageYoung v2 + sea v1** → `"유년의 어느 날 늑대를 압도했다. 파도 곁에서."` — 자연스러움 9/10. PRD 의 design 의도 그대로 작동.

2. **`"15세에 도끼가 빛났다."` + ageYoungAdult v1 + underworld v1** → `"15세 청춘에 도끼가 빛났다. 황천의 그림자 속."` — 자연스러움 5/10. **청춘 vs 황천 의미 충돌**. saga 의 dramatic irony 로 살릴 수도 있으나 12 분 반복 시 어색.

3. **`"55세에 한 단계 더 강해졌다."` + ageElder v2 + underworld v2** → `"55세 황혼 무렵 한 단계 더 강해졌다. 차가운 손 사이."` — 자연스러움 4/10. **황혼 + 차가운 손** = 죽음 imagery 이중 누적. levelUp 의 *긍정 비트* 가 우울 어휘로 마감됨.

4. **`"35세에 칼을 익혔다."` + ageMature v3 + heaven v1** → `"35세 단련된 의지로 칼을 익혔다. 빛의 다리 위."` — 자연스러움 7/10. tone 정합. 단 saga 안에 levelUp "성장의 빛" 직후 등장 시 빛 중첩.

5. **`"75세에 검을 손에 넣었다."` + ageFinal v3 + chaos v3** → `"75세 마지막 호흡으로 검을 손에 넣었다. 경계가 흐려진 자리에서."` — 자연스러움 10/10. **이 합성이 PRD 의 hero design 의도와 가장 정합**. eternal hero / 회춘 / endgame chaos 의 시너지.

**핀포인트**: ageTone × realmTone 합성 *전반* 은 작동한다. 그러나 **age elder/final + underworld** 와 **age young + underworld/heaven** 에 음양 충돌 spot 있다. PRD 가 R3 (composition order regression) 만 mitigation 으로 명시하고 **R4 의미 충돌 미언급** — 이게 진짜 risk.

## 4 variant 의 충분성 평가

PRD 가 ageTone mirror 로 4 variant 잡은 것은 architecture 일관성 관점에서 옳다. 그러나 *narrative 다양성* 관점에서는 **4 variant 가 부족**.

근거:
- ageTone 은 한 saga 안에서 age tier 가 점진 이동 (5 → 12 → 29 → 49 → 69 → 70+) → 한 tier 의 4 variant 가 노출되는 *기간* 짧음. tier 6 × variant 4 = 24 prefix 가 한 saga 에 분산.
- realm 은 한 realm 체류 길이가 idle 12 분 중 ~2-4 분. 그동안 battle/levelUp/drop 매 line 마다 같은 realm 의 4 suffix 만 회전 → 같은 어휘 ~30-60 회 노출 가능.
- 즉 ageTone 의 4 = saga 전체 분산, realmTone 의 4 = 한 segment 집중 → 같은 4 라도 *밀도* 다름.

**권장: realm 별 5-6 variant (v0 원문 포함)**. 즉 catalog 당 v0 (backward compat) + v1-v4/v5 (신규). 5 variant 시 1 realm 체류 동안 1 suffix 가 ~10-15 회 등장 (50 battle 가정 시) — 인지 한계 안.

## 약점 TOP 3

1. **heaven 의 빛 어휘 중첩** — `narrationVariants.ts` line 32 (levelUp "성장의 빛"), 52 (drop "빛났다"), 60 (shrineHealed "성스러운 빛") 가 이미 빛 어휘를 다량 보유. PRD 의 heaven realmTone v1-v3 셋 다 빛 어휘 → misroll 시 한 line 빛 2 회. 해결 = heaven v2 또는 v3 을 청각 어휘 (예: "찬송의 음 사이") 또는 정적 어휘 (예: "고요한 천공에서") 로 교체.
2. **underworld 의 음울 동질화 + age 톤 충돌** — underworld v1-v3 셋 다 죽음/차가움 frame. ageElder/ageFinal 의 "황혼/마지막 호흡" 과 의미 누적, ageYoungAdult 의 "청춘/한창" 과 음양 충돌. 해결 = v3 ("꺼진 빛 너머에서") 을 *중립* 어휘 (예: "흙 아래 길에서") 로 교체해 5-12세 hero 가 underworld 진입 시 톤 정합.
3. **base realm 의 variant 0 = 원문 정책 손실** — base 가 0-30% age 구간 (saga 의 첫 1-2 분, 가장 첫인상) 인데 v0 원문 = backward compat 라 어휘 0. *base 만* v0 을 약-realm 어휘 ("들판 한가운데서") 로 채우면 첫인상 강화. seed=0 의 backward compat 은 다른 5 realm 으로 cover 가능.

## 개선 제안

### 어휘 추가 후보 (cycle 102+ 의 v4-v5 확장)

- **base v4**: "흙바닥을 디디며" (촉각)
- **sea v4**: "물비린내 너머" (후각)
- **sea v5**: "조류의 흐름을 거슬러" (운동감)
- **volcano v4**: "유황 냄새 속에서" (후각)
- **volcano v5**: "쇳소리 너머에서" (청각)
- **underworld v4**: "흙 아래 길에서" (중립 — age 충돌 완화용)
- **heaven v2 swap**: 기존 "구름의 결 사이" → **"찬송의 음 사이"** (청각, 빛 어휘 회피)
- **heaven v4**: "고요한 천공에서" (정적)
- **chaos v4**: "기억이 흩어진 자리에서" (인지 어휘 유지하면서 spatial 어휘 회피)

### 안 어울리는 어휘 reject 또는 교체

- **heaven v1 "빛의 다리 위"**: levelUp/drop/shrineHealed 의 빛 어휘와 중첩 — 유지하되 misroll 빈도 측정 필요. Section §개선 §1 의 catalog 빛 중첩 방지 unit test 추가 권장.
- **heaven v2 "구름의 결 사이"** → "찬송의 음 사이" swap 권장.
- **underworld v2 "차가운 손 사이"**: 톤이 너무 강함. levelUp/skill 의 긍정 비트와 매번 충돌. **유지하되 levelUp/skill 채널에서만 variant 2 skip** (channel-aware variant filter) 검토 — 또는 v2 을 "잊혀진 길 위에서" 로 교체.

### variant 수 권장

- **F1 stage**: PRD 안대로 6 realm × 4 variant 우선 ship (ageTone mirror, scope 통제).
- **cycle 102 backlog**: 6 realm × 5-6 variant 로 확장 + heaven/underworld 의 swap. **권장 final = 6 realm × 5 variant (v0 + v1-v4)** — sustain 인지 한계와 catalog 유지 비용 사이의 sweet spot.

### 톤 충돌 mitigation 권장

- PRD §리스크 §R3 옆에 **R4 의미 충돌 위험** 추가:
  > underworld realm v1/v2 (황천/차가운 손) 가 levelUp/skill 의 *긍정* 비트와 합성 시 톤 마찰 발생. F1 unit test 의 18 case 중 3 case 는 underworld × levelUp combo 강제 — 합성 결과를 사람 (story-critic 페르소나) 이 inspect 해 PRD 반려/통과 결정.
- **channel-aware variant filter** 검토: realmTone(text, realm, seed, **channel**) 시그니처로 확장해 levelUp/skill 채널에서 underworld v2 skip. 단 scope 증가 → cycle 102 backlog.

## 차기 narrative 제안 (cycle 102+, F1 이후)

- **realm transition micro-beat**: realm 진입 line 직후 첫 battle/levelUp 의 realmTone variant 를 *고정 v0 (원문)* 으로 1-2 line 동안 유지 — 진입 line 의 강한 어휘를 *흡수할 시간* 부여. variant filter rule = "realm 진입 후 ≤ 2 saga line 은 variant 0 강제". 사용자의 인지 부담 완화 + 진입 line dramatic weight 보존.

  예시 — sea 진입 직후:
  ```
  "33세에 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다."
  "33세 무르익은 시기에 늑대를 압도했다."       ← variant 0 (1줄차)
  "33세 무르익은 시기에 도끼가 빛났다."         ← variant 0 (2줄차)
  "33세 무르익은 시기에 한 단계 더 강해졌다. 파도 곁에서."  ← variant 1+ (3줄차~)
  ```

- **boss-fight realmTone amplify**: 1차/2차 처치 같은 climax beat 에서 realmTone variant 를 *가장 강한 어휘* (v3 또는 신규 v5) 로 강제 lock. seed-driven random 이 climax 의 dramatic weight 를 희석하는 위험 mitigation.

  예시:
  ```
  "67세 황혼 무렵 화염 거인의 숨이 끊어졌다. 검은 재 위에서."  ← v2 강제 (climax marker)
  ```

## 표류 경보

- **realm 톤 위반 위험: 낮음**. PRD 어휘는 REALM_ENTER_VARIANTS (이미 ship) 톤 mirror 라 세계관 정합.
- **eternal hero 컨셉 위반 위험: 없음**. narrative-only, lifecycle 무관.
- **caveat**: heaven 의 saccharine 위험 — *eternal hero idle sponsor* 의 톤이 종교 트로프로 기울 수 있음. F1 ship 후 saga 로그 sampling 으로 사람 검수 권장.
