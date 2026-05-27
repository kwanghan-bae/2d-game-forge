# Cycle 256 비평 (Story Writer) — Emotional Peak 의 역경제 + NPC 사망 종류 오결합 + EternalCodex 의 narrative slot

새 100-cycle 의 1/100. 직전 100-cycle (cycle 156-255) 의 narrative 19 cycle 은 *claim narration cluster* 에 집중됐다 — pool 12→20, sub-pool by realm, tone tag, weighted pick, tier prefix, narrative chain 4 분할. cycle 156 critic 의 세 권고 모두 회수. **claim 쪽은 saturated.**

본 cycle 은 zoom-out. claim 이 ambient 비트 (12 분 idle 의 알림 줄) 인 반면 *eternal hero 의 emotional peak* — 자연사 / 회춘 / NPC 사망 / realm 진입 — 의 pool 두께가 *역경제* 상태인 게 본 cycle 의 큰 발견이다. claim 1 회 = 20 base × 6 realm × 5 tier × 5 tone variant, *자연사 1 회* = 1 줄 hardcoded. 매 saga 의 클라이맥스가 가장 얇다.

## narrative health

| 축 | 점수 | 근거 |
|---|---|---|
| variance (variant 풀 두께) | 6/10 | claim 풀은 saturated (20 + sub-pool + tone). battle/drop/levelUp pool 6-8 variant + ageTone × 4 × realmTone × 4 으로 *ambient* 두께는 충분. **emotional peak 4 곳은 정반대** — `forDeath` 5 cause 각 *정확히 1 줄 hardcoded* (NarrativeGenerator.ts:75-94), `REJUVENATION_VARIANTS` 5 줄 (narrationVariants.ts:103-109), `NPC_DEATH_VARIANTS` 3 줄, `FAMILY_EVENT_VARIANTS` 2 줄/type. pool size 가 *감정 무게의 역순* — 알림 줄이 가장 두껍고 클라이맥스가 가장 얇다 |
| 톤 일관성 (realm/season/persona) | 5/10 | ageTone 6 단 × realmTone 4 종 합성으로 ambient 어휘는 정합. 그러나 (a) `forDeath` 5 cause 가 *ageTone/realmTone 미적용* — 영원한 영웅의 70+ 자연사를 80세에 맞아도 `${age}세에 안식을 맞아 잠들었다` 단일 줄, 천공/혼돈/황천 어디서 죽어도 *realm 후크 0*. (b) `NPC_DEATH_VARIANTS` 3 줄 *각각 NPC kind 가정* (멘토/라이벌/행인) 인데 callsite 는 `forNpcDeath({ age, realm })` 만 전달 — kind 없이 seed % 3 으로 random pick → **rival 사망 시 1/3 확률 "멘토가 침대에서 일어나지 못했다"** deterministic 출력. 캐릭터 일관성 깨짐. (c) tone tag 가 claim 풀에만 부착, saga 의 emotional peak 풀엔 0 |
| 감정 곡선 (boredom → climax) | 4/10 | cycle 156 의 8/10 (claim 만 평가) → 본 cycle zoom-out 시 4/10. 영원한 영웅의 saga = 100 회 claim ambient + 5-10 회 회춘 + 1 회 자연사 의 곡선이어야 하는데 *climax 풀이 ambient 풀의 1/4*. 12 분 시청에서 1-2 회 발생하는 회춘/자연사가 알림 줄에 그대로 흘러간다. SagaBookModal 에 *재생 #N* gold marker (line 95-103) 가 시각적 강조는 하지만 **narrativeText 자체는 단일 형식** — UI 가 강조해도 텍스트가 닫혀 있어 두 번째 회춘부터 식상 |
| 세계관 정합 (eternal hero + 6 realm) | 5/10 | 6 realm 의 진입 narration 은 5 variant × 6 realm = 30 줄로 두께 충분 + 어휘 분리도 좋음 (sea 의 *짠 공기 갈매기* vs underworld 의 *그림자가 자신의 그림자를 가졌다* — 같은 영웅이 두 realm 에 들어가는 첫 비트가 명확히 다름). 그러나 (a) chaos/heaven realm 에서 *죽으면* 같은 자연사 1 줄. (b) NPC 4 종 (rival/mentor/friend/family) 중 family 의 spawn/grow/death 3 비트만 잡혀 있고, mentor 가 영웅보다 1.5× 빨리 늙어 *영웅보다 먼저 죽는* eternal hero × 인간 NPC 의 핵심 비대칭이 saga 텍스트로 안 보임 (mentor 사망 narration 의 *세월의 차* 톤 0). NPC 가 narrative 캐릭터로 살아있다기보다 *encounter 알림 dispenser* 에 가까움 |

## 약점 TOP 3

1. **Emotional-peak pool 의 역경제 (NarrativeGenerator.ts:75-94 + narrationVariants.ts:103-109,341-345,347-361)** — claim narration 이 20+ × tier × tone × realm 으로 saturated 인 반면 saga 의 4 클라이맥스 (`forDeath`/`rejuvenation`/`npcDeath`/`familyEvent`) 가 1-5 줄로 정체. 정량 비교: claim 1 회 노출 시 600+ variation 후보, 자연사 1 회 노출 시 **1 variant 후보** (분기 없음). 영원한 영웅의 정체성 = 무한 saga + 회춘 + 자연사 cycle 인데 그 cycle 의 가장 큰 비트가 가장 얇다. cycle 156-255 의 narrative 19 cycle 중 *claim* 쪽 회수 7-8 cycle, peak pool 신규 줄 추가 0. *pool inflation 회피* 의 옳은 원칙이 *peak pool 도 그대로* 의 잘못된 일관성을 낳음. 해결 방향: `forDeath` cause 별 3-5 variant + ageTone/realmTone 합성 적용 (다른 event 와 동일 composition). 자연사 풀이 가장 우선 — 영웅의 *한 saga 종결 비트* 라 매 saga 마다 1 회 노출.

2. **`forNpcDeath` 의 kind 미전달 → rival/mentor/passerby 텍스트 oblivious random pick (CycleControllerV2.ts:550,831,1334 + narrationVariants.ts:341-345)** — `NPC_DEATH_VARIANTS` 3 줄이 각각 *특정 NPC kind 를 단정* (`'멘토가 침대에서 일어나지 못했다'` / `'라이벌의 마지막 칼은 자신의 것이었다'` / `'행인의 부고를 멀리서 들었다'`). 그러나 callsite 의 `forNpcDeath({ age, realm }, seed)` 는 kind 인자를 안 받음 (`NarrativeGenerator.ts:66` 시그니처에 kind 부재). seed % 3 으로 random pick → **rival 이 죽었는데 narration 은 1/3 확률 "멘토가 침대에서..."**, mentor 가 죽었는데 1/3 확률 "라이벌의 마지막 칼이 자신의 것이었다". 캐릭터 정체성 완전 붕괴, deterministic + 재현 가능. 본 cycle 의 *유일한 명백한 bug*. SagaBookModal 의 인연 필터로 묶어 보면 같은 인물 이름이 멘토/라이벌 화법 사이를 흔드는 게 시각적으로 즉시 보임. 해결 방향: `forNpcEncounter` 와 동일하게 kind 인자 추가 (`forNpcDeath({ age, kind, realm }, seed)`) + 3 줄 → `Record<'mentor'|'rival'|'friend'|'family_parent'|'family_spouse'|'family_child', 2-3 variant>` 분기. *세월의 차* 톤 (mentor 가 영웅보다 먼저 늙어 죽는 비대칭) 도 mentor variant 에 끼워넣기.

3. **회춘/자연사 narration 의 `ageTone`/`realmTone` composition 누락 (narrationVariants.ts:530-532,548-549 + NarrativeGenerator.ts:46-48,75-94)** — battle/levelUp/drop/shrine/moralChoice/skill/job/realmEnter/npcEncounter 모두 `pick → ageTone → realmTone` 3-step composition (narrationVariants.ts:484-556). 그러나 `rejuvenation` 은 `NarrationVariants.rejuvenation(opts, seed)` 가 `pick(REJUVENATION_VARIANTS, ...)` 만 호출, ageTone/realmTone 0. `forDeath` 는 더 심해서 NarrationVariants 자체를 거치지 않고 string template literal 5 줄. 결과: 70세 자연사를 천공에서 맞아도, 85세 자연사를 황천에서 맞아도 동일 1 줄. ageTone 의 *마지막* 단계 (70+ "한 생애의 끝에 / 만년의 햇살에 / 마지막 호흡으로") 가 정확히 자연사 narration 에 필요한데 정작 자연사가 ageTone 을 안 거침 — 가장 잘 맞는 prefix 가 가장 안 쓰이는 곳에 있음. 해결 방향: `NarrationVariants.rejuvenation` + `NarrationVariants.death` 두 method 에 `pick → ageTone → realmTone` composition 적용. peak event 가 ambient event 와 *동일 composition pipeline* 공유 → 톤 일관성 회수.

## 차기 narrative 제안

### 1. **`forDeath` 자연사 pool 1 → 5 + ageTone/realmTone composition (약점 #1 + #3 묶음 회수)**

scope = `NarrativeGenerator.ts` 의 `forDeath` 가 NarrationVariants 의 신규 method 를 호출하도록 lift. 5 cause 중 *자연사* 만 우선 (다른 4 cause 는 transient — 자연사가 매 saga 의 영구 종결 비트). pool 5 줄 모두 *70+ 의 마지막 비트* 톤. ageTone 의 70+ 분기 (`마지막 호흡으로`) 가 자연스럽게 prefix 합성.

예시 변형 (실제 텍스트, NARRATION_VARIANTS 에 추가):

```ts
// 신규 NATURAL_DEATH_VARIANTS — 매 saga 마다 1 회 노출이라 pool 5 면 충분
const NATURAL_DEATH_VARIANTS: Array<(c: { age: number }) => string> = [
  (c) => `${c.age}세에 안식을 맞아 잠들었다.`,                    // legacy 1 줄 유지 (seed=0 fixture 보존)
  (c) => `${c.age}세에 마지막 숨이 가지런해졌다.`,
  (c) => `${c.age}세에 한 생애의 페이지가 조용히 닫혔다.`,
  (c) => `${c.age}세에 영웅은 눈을 감았다 — 다음 영웅은 아직 태어나지 않았다.`,
  (c) => `${c.age}세에 시간이 비로소 영웅의 어깨에서 손을 뗐다.`,
];

// NarrationVariants 에 method 추가
naturalDeath(ctx: { age: number; realm?: RealmId | null }, seed = 0): string {
  const out = pick(NATURAL_DEATH_VARIANTS, { age: ctx.age }, seed);
  const aged = ageTone(out, ctx.age, seed);        // 70+ 분기로 "마지막 호흡으로" 자연 prefix
  return realmTone(aged, ctx.realm, seed);          // realm 어휘 suffix
}
```

realmTone composition 시 자연 출력: `"85세 마지막 호흡으로 한 생애의 페이지가 조용히 닫혔다. 빛의 다리 위."` (heaven), `"73세 한 생애의 끝에 영웅은 눈을 감았다 — 다음 영웅은 아직 태어나지 않았다. 혼돈의 중심에서."` (chaos). 같은 자연사가 6 realm × 4 ageTone × 5 variant = 120 variation. claim 풀과 같은 economy.

근거: 매 saga 의 종결이 영원한 영웅 컨셉의 가장 큰 비트. 영웅의 *다음 영웅은 아직 태어나지 않았다* 변형은 V3 의 무한 saga + 회춘 사이의 진짜 휴지부를 텍스트로 인장. pool 5 + composition 으로 *얇은 peak 의 가장 큰 surface* 회수.

### 2. **`forNpcDeath` kind-aware 분기 + `forFamilyEvent` 의 family 6 kind 확장 (약점 #2 회수 + family 풀 살리기)**

scope = `forNpcDeath` 시그니처에 kind 추가, `NPC_DEATH_VARIANTS` → `Record<NpcKind, variants[]>`. 같은 spec 안에서 family 의 spouse/parent 사망 비트도 추가 (현재 family event 는 marriage/child_born/child_grown 만 잡혀 있고 *family death* 가 NPC death 풀에 통합 안 됨 — mentor/rival 어휘로 잘못 노출).

예시 변형 (실제 텍스트):

```ts
const NPC_DEATH_VARIANTS_BY_KIND: Record<NpcEntity['kind'], Array<(c: { age: number }) => string>> = {
  mentor: [
    (c) => `${c.age}세에 멘토가 침대에서 일어나지 못했다 — 한 시대가 끝났다.`,           // legacy 보존
    (c) => `${c.age}세에 멘토의 마지막 가르침은 침묵이었다.`,
    (c) => `${c.age}세에 멘토가 먼저 간 길을 영웅은 더 오래 걷는다.`,                    // 세월의 차 핵심 비트
  ],
  rival: [
    (c) => `${c.age}세에 라이벌의 마지막 칼은 자신의 것이었다 — 둘 다 살아남지 못했다.`,  // legacy 보존
    (c) => `${c.age}세에 라이벌이 먼저 쓰러졌다 — 영웅은 칼을 거두지 않았다.`,
    (c) => `${c.age}세에 라이벌의 빈자리가 가장 큰 적이 되었다.`,
  ],
  friend: [
    (c) => `${c.age}세에 친구의 부고가 짧은 편지로 도착했다.`,
    (c) => `${c.age}세에 친구가 떠난 마을을 영웅은 다시 지나치지 않았다.`,
  ],
  family_parent: [
    (c) => `${c.age}세에 부모가 떠났다 — 영웅은 처음으로 어린 시절이 끝났다고 느꼈다.`,
    (c) => `${c.age}세에 부모의 손이 마지막으로 자신의 손을 놓았다.`,
  ],
  family_spouse: [
    (c) => `${c.age}세에 반려자가 먼저 잠들었다 — 영웅은 자신의 회춘이 처음으로 죄스러웠다.`,  // eternal hero × 인간 비대칭 핵심
    (c) => `${c.age}세에 반려자의 자리가 빈 침대를 영웅은 오래 떠나지 못했다.`,
  ],
  family_child: [
    (c) => `${c.age}세에 자식이 영웅보다 먼저 늙어 떠났다.`,                              // 회춘 영웅의 가장 큰 비극
    (c) => `${c.age}세에 자식의 무덤 앞에서 영웅은 처음으로 자신의 나이를 잊었다.`,
  ],
  passerby: [
    (c) => `${c.age}세에 행인의 부고를 멀리서 들었다 — 이름은 끝내 몰랐다.`,             // legacy 보존
  ],
};
```

callsite 3 곳 (CycleControllerV2.ts:550,831,1334) 에 `kind: npc.kind` 인자 추가. seed % 분기 안에서 random.

근거: bug 회수 + V3 의 *eternal hero × 인간 NPC 의 시간 비대칭* 이 처음으로 텍스트로 surface. family_spouse 사망 시 *영웅의 회춘이 죄스럽다* 한 줄이 가장 강한 비트 — 회춘 시스템 자체의 narrative meaning 을 NPC 죽음을 통해 역조명. eternal hero 컨셉이 *기쁨* 이 아니라 *대가* 라는 V3 의 짙은 톤 회수.

### 3. **EternalCodex 의 page-unlock narrative slot 예약 (mega-phase carry-over 와 동기)**

scope = *데이터 정의 0*, **slot reservation only**. EternalCodex (web-researcher invention, cycle 156 carry-over) 가 mega-phase 로 진입할 때 narrative 측 spec 의 사전 정합 메모.

현재 V3 가 가진 *영원한 영웅의 위업이 영구* 라는 약속의 narrative surface = SagaBookModal 의 *재생 #N* gold marker (1 곳). EternalCodex 의 *영원의 장 페이지 unlock* 은 새 약속 ("당신이 이룬 것은 사라지지 않는다, 다만 세계의 바람만 달라진다") 의 직접 surface 가 될 후보. 본 cycle 에서 *데이터 도입 0* (3의 규칙 — codex 자체가 미빌드, narrative 만 선제 도입 금지) 이지만 mega-phase 진입 시 narrative slot 의 컨벤션 예약:

- **page-unlock 비트** 1 회 노출 = peak event (자연사/회춘 급). 본 cycle 약점 #1 의 *peak pool 두께 5 + composition* 컨벤션을 그대로 따라 도입. pool 1 줄 hardcoded 금지.
- **tone tag 부착** — 영원의 장 = `ode/hymn` (천상 톤), 계절의 장 = realm 별 (sea=elegy / volcano=tragedy 의 toned variant pool 패턴 reuse). cycle 165-181 의 toned pool 패턴이 이미 정착.
- **새 motif 도입 금지** — 신/하늘/별/페이지/책장 컨셉 안에서 (이미 claim narration 12 motif 가 codex 컨셉과 직접 정합). 새 트로프 (고대 도서관, 수정구, 룬, 마법사회 등) 도입 시 V3 정합 깨짐.

예시 변형 (실제 텍스트, *codex mega-phase 진입 시 도입 후보*):

```ts
// EternalCodex page-unlock 비트 — 영원의 장
const ETERNAL_CODEX_UNLOCK_VARIANTS: Array<(c: { age: number; pageNameKR: string }) => string> = [
  (c) => `${c.age}세에 영원의 장에 새 페이지가 새겨졌다 — "${c.pageNameKR}".`,
  (c) => `${c.age}세에 ${c.pageNameKR}의 페이지가 영원으로 닫혔다 — 다시는 지워지지 않는다.`,
  (c) => `${c.age}세에 신은 ${c.pageNameKR}을 영원의 장에 옮겨 적었다.`,
];
```

근거: EternalCodex 의 *수학적 영구 multiplier* 는 마케팅 약속의 *수치* 면이고, *narrative page-unlock* 은 마케팅 약속의 *정서* 면. 두 면이 같은 wire 안에서 도착하지 않으면 사용자는 multiplier 만 보고 page 의 *의미* 를 모름. 본 cycle 에서 narrative slot 만 예약 → mega-phase 진입 시 narrative critic 의 *재발견 비용* 0.

## 표류 경보

- **Emotional-peak pool 의 역경제** (약점 #1): 100 cycle 누적 invariant. cycle 156-255 의 narrative 19 cycle 모두 claim 쪽 보강. peak 풀 (death/rejuvenation/npcDeath/family) 신규 줄 0. 본 cycle 에서 회수 안 하면 다음 100-cycle 도 claim 만 보강될 위험. 약점 #1 + 제안 #1 우선.
- **`forNpcDeath` kind 미전달 bug** (약점 #2): rival 의 죽음이 1/3 확률로 멘토 화법으로 출력되는 deterministic + 재현 가능 캐릭터 일관성 깨짐. cycle 156 critic 이 잡지 못한 V3-D 시점부터의 누적 부채. 1 sub-spec 안에서 fix 가능.
- **`forDeath` + `forRejuvenation` 의 composition 누락** (약점 #3): ageTone 의 70+ 분기 (`마지막 호흡으로`) 가 정작 자연사에 안 붙음 — *가장 잘 맞는 prefix 가 가장 안 쓰이는 곳에 있음*. composition pipeline 의 *예외* 가 정확히 emotional peak 에 있는 역설.
- **NPC 가 narrative 캐릭터 아닌 *알림 dispenser***: NPC encounter/death 가 narration 만 emit + 전투/buff 영향 0 (controller wire 확인). 사용자 질문 "buff 디스펜서인가 서사적 캐릭터인가" 의 답은 *둘 다 아님* — narration 트리거. mentor 가 영웅보다 1.5× 빨리 늙어 *영웅보다 먼저 죽는* eternal hero × 인간 NPC 비대칭이 spec 안에는 있는데 narration 텍스트는 그 비대칭을 0 표현. 제안 #2 의 family_spouse / family_child variant 가 첫 회수 비트.
- **EternalCodex slot 미예약**: mega-phase 진입 시 narrative spec 가 *수치 spec 후 발견* 될 위험. cycle 256 의 제안 #3 으로 사전 컨벤션 박제 → 진입 시 narrative critic round-trip 1 회 절약.
- **새 트로프 도입 없음 (정합 유지)**: 제안 1-3 모두 V3 컨셉 안 (신/하늘/페이지/eternal hero/realm 6 + NPC 6 kind). 새 캐릭터/판타지 트로프 도입 0 — persona 절대 금지 준수.
