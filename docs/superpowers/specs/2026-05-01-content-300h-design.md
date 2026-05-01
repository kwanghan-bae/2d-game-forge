# 2026-05-01 — Content 300h Design Spec (inflation-rpg)

## 한 줄 요약

inflation-rpg 가 한 사람이 처음 켜서 끝까지 단순 진행만 해도 **300시간** 이상
플레이 가능한 게임이 되도록 컨텐츠/시스템/페이싱을 재설계한다. 핵심은 **던전 하강
컨셉 + 7층 메타 케이크 + D2 식 수식어 + 무한 강화 + Ascension prestige** 의 결합.

## 배경

- 현재 게임: 캐릭터 16, 스킬 32, 장비 41, 몬스터 61, 보스 109, 구역 120 × 5-10 stage
- 메타 천장: baseAbility 18, soulGrade 9, 합성 6 tier — 60h 이내에 닿음
- 엔드게임: 하드모드 (×10 exp) 단일축 — 신선함 부족
- 빌드 다양성: 캐릭당 active skill 2 고정 — 빌드 선택 없음

목표 플레이어 프로필 = **(C) 컴플리션형**. 처음부터 끝까지 단순 진행만 해도 300h.
라이브 운영·이벤트가 아닌 **메인 컨텐츠 자체** 의 길이로 채운다.

장르 정체성 = "한 판 한 판 빨리 끝나는 단발성. 매 런마다 메타가 누적되어 다음 런이
더 강해진다. 더 깊은 곳으로 갈 수 있게 되고, 새 스킬·아이템을 얻어 또 강해진다."
**inflation rpg 정통 루프** 를 기반으로, 깊이·다양성·페이싱을 확장한다.

## 핵심 설계 선택

1. **던전 하강 컨셉** — 마을 hub + 20 던전 입구. 각 던전 = 수직 floor list.
2. **테마 = 던전** — 20 던전이 곧 20 테마. 시작 시 무작위 추첨 (해금 풀 내).
3. **7층 메타 케이크** — Run / Char Lv / Soul·BaseAb / Job Tree / 강화 / Ascension / 유물.
4. **BP 균등 소모** — 절약 메커니즘 없음, 단 몬스터 lv 비례 소모.
5. **단일 화폐** — 차원 간섭력 (DR) + 강화석 소모재. 21 화폐 제거.
6. **무한 강화** — 100% 성공, 등급별 곡선 다름, 무한.
7. **D2 식 수식어** — 장비 인스턴스마다 1~4 수식어, 강화 시 마그니튜드 ↑.
8. **3 시작 캐릭터** (화랑·무당·초의), 각 4 분기 ~100 노드 트리. 추후 13명 확장.
9. **광고 = 영구** — 모든 광고 시청은 영구 효과 유물 부여. 시간 투자 = 강화.
10. **Asc Tier 무한** — 선형 power ×(1 + 0.1·N), Tier 30+ 도 진행 가능.

## 1. 메타 케이크 7층

| 층 | 이름 | 단위 | 캡 | Asc Reset |
|---|---|---|---|---|
| 1 | Run | level / SP / gold | 런 종료 시 자동 | n/a |
| 2 | Character Level | charLevels[id] | 무한 (소프트 200) | ✓ reset |
| 3 | Soul Grade + Base Ability | grade 0-9, baseAb 1-18 | (기존) | ✓ reset |
| 4 | Job Tree | 분기 노드 / 캐릭 ~100 노드 | JP 누적 | 보존 |
| 5 | 장비 강화 | 강화 lv 0 → ∞ | 무한 | 보존 (장착·보관함) |
| 6 | Ascension | Tier 0 → ∞ | 무한 | n/a |
| 7 | 유물 (Relic) | stack count / equipped Mythic | 유물별 | 보존 |

## 2. 던전 시스템 + 테마

### 2.1 마을 hub 구조

메인 화면 = 마을. 마을에 던전 입구 + 모든 시설 노출. (자세한 hub UI 디자인은
별도 spec 으로 보류 — Section 3 deferred 참조.)

### 2.2 20 던전 카탈로그

| # | 던전 | 해금 |
|---|---|---|
| 1 | 평야 | 시작 |
| 2 | 깊은숲 | 시작 |
| 3 | 산악 | 시작 |
| 4 | 동해 | 보스 5 |
| 5 | 화산 | 보스 10 |
| 6 | 저승 | 보스 15 |
| 7 | 천상계 | 보스 20 |
| 8 | 혼돈 | Asc 1 |
| 9 | 마왕성 | 하드 해금 |
| 10 | 빙결설원 | Asc 2 |
| 11 | 사막유적 | Asc 3 |
| 12 | 늪지대 | Asc 4 |
| 13 | 천공섬 | Asc 5 |
| 14 | 결정동굴 | Asc 6 |
| 15 | 환영도시 | Asc 7 |
| 16 | 시간미궁 | Asc 8 |
| 17 | 별의바다 | Asc 9 |
| 18 | 용족영지 | Asc 10 |
| 19 | 영원공허 | Asc 15 |
| 20 | 태초혼돈 | Asc 20 |

### 2.3 던전 floor 구조 (20 던전 모두 동일 골격)

```
Floor 1–4:    일반 (low level)
Floor 5:      Mini-boss        — 1차 나침반 드랍, 강화석 1~3
Floor 6–9:    일반
Floor 10:     Major-boss       — 2차 나침반 드랍, 시그니처 epic 장비, 강화석 5~10
Floor 11–14:  일반
Floor 15:     Sub-boss
Floor 16–19:  일반
Floor 20:     Sub-boss
Floor 21–24:  일반
Floor 25:     Sub-boss
Floor 26–29:  일반
Floor 30:     ★ Final boss     — 1회 영구 보상 (mythic 장비 / "정복자" 칭호)
                                  + 매번 화폐 박스, 강화석 50~100
Floor 31~∞:   심층 (procedural — 동일 풀 + level multiplier ↑, 화폐 무한 farming)
```

총 던전 named floor = 20 × 30 = 600. 데이터 row 작업 (floor 1개 = 배경 + 몹 풀
ID + level multiplier + 보스 ID 의 3-5 줄 데이터).

### 2.4 던전 선택 흐름

기본 = 무작위. 차원 나침반 보유 시 자유 선택.

```
[기본]
  마을 → 던전 입장 버튼 → 해금 풀에서 랜덤 1개 추첨

[차원 나침반 1차 보유]
  추첨 가중치 ×3 (해당 던전이 더 자주 뜸)

[차원 나침반 2차 보유]
  자유 선택 가능 (해당 던전만)

[범우주 나침반 — 모든 mini-boss 첫 처치 시]
  모든 던전 자유 선택
```

### 2.5 BP 비례 소모

```
encounter cost = ceil(log10(monsterLevel)) + 1
defeat cost    = 2 × encounter cost

예:
  Lv 1     → -1 / -2  (1전투 -3)
  Lv 100   → -3 / -6  (1전투 -9)
  Lv 10k   → -5 / -10 (1전투 -15)
  Lv 1M    → -7 / -14 (1전투 -21)
```

깊은 floor = BP 무게감 ↑ → 유물·소켓이 후반에도 가치 유지.

### 2.6 런 사이클

```
런 시작:
  1. 마을 → 던전 입장 버튼
  2. 해금 풀에서 추첨 또는 자유 선택 (나침반 보유 시)
  3. BP = 30 + 메타 보너스 (유물 + Asc + 트리 + 악세)
  4. Floor 1 부터 자동 하강

매 floor:
  - 몬스터 N마리 자동 조우
  - 1-shot 가능하면 즉시 처치 (encounter cost 만 소모)
  - 1-shot 불가능하면 진짜 전투 (encounter + defeat cost)
  - Boss floor: 보스 1 + 처치 시 BP +reward

종료 조건:
  - HP 0 (사망): 캐릭터 lvl +1, 인벤토리·DR·강화석 보존
  - BP 0: 자동 retreat. 보상 정산
  - 자발적 retreat: 언제든
```

## 3. 마을 Hub (deferred)

별도 spec 으로 작성 — 모든 시설의 진입점 UI/UX 통합 디자인. 본 spec 의 Section 4
~ 11 시설 합의 후 통합 조망 단계에서 처리.

진입할 시설 목록 (이 spec 에서 전제로 하는 것):
- 던전 입구
- 강화소 (Section 5)
- 직업소 (Section 4)
- Ascension 제단 (Section 6)
- 보물고 (유물 — Section 7)
- 상점 + 합성소 (장비 — Section 8)
- 인벤토리 + 차원보관함 (Section 5)
- 캐릭터 영입소 (Section 4 — soulGrade 해금)

## 4. 직업 트리 (메타 4층)

### 4.1 시작 캐릭터 3종

| 캐릭터 | 정체성 | stat 강조 |
|---|---|---|
| 화랑 ⚔️ | 균형 전사 — 근접 빠른 한방 | AGI·ATK |
| 무당 🌸 | 운명·저주·강령 마법사 | LUC·HP |
| 초의 🛡️ | 탱커 — 받아치는 철벽 | HP·DEF |

13명 추가 캐릭터 컨셉 (검객/착호갑사/도사/야차/궁수/의녀/장수/승병/거사/천관/
용녀/귀신/선인) 은 보존되지만 본 spec 에서는 미구현. Asc Tier·이벤트 마일스톤
보상으로 점진 추가 — 별도 spec 으로 다룰 것.

### 4.2 캐릭터당 트리 — 4 분기 × ~25 노드 = 100 노드

화랑 예시:
```
                    [화랑 시작 노드]
                    /     |    |    \
              [검술]  [창술]  [체술]  [무영]
              근접     원거리   균형     암살
              단일     관통    AoE      크리
                |       |       |        |
              ~25 nd  ~25 nd  ~25 nd   ~25 nd
                |       |       |        |
              ULT:    ULT:    ULT:     ULT:
              일섬   천공무   진명     무영살
```

각 분기 끝 = ULT skill (분기마다 다름). 빌드 = "어떤 분기 들어가서 얼마나
깊이 찍었나" 조합.

무당 분기: 저주 / 축복 / 점복 / 강령
초의 분기: 방어 / 반격 / 분노 / 수호

총 노드 카탈로그 = 3 × 100 = 300 노드. 데이터 작업.

### 4.3 노드 종류

| 종류 | JP 비용 | 효과 |
|---|---|---|
| Common | 1 | stat % +5 |
| Uncommon | 2 | 다른 stat % +10 / 패시브 효과 1개 |
| Rare | 3 | 스킬 강화 (cd/dmg/target) |
| Epic | 5 | 새 active 효과 / 더 큰 passive |
| Legendary | 10 | ULT skill unlock |
| Mythic | 15 | 캐릭터 정체성 핵심 boost |

### 4.4 JP (Job Point) 획득

그 캐릭터로 **첫 1회 처치** 만 카운트. 반복 grind 무의미.

| 액션 | JP |
|---|---|
| 일반 보스 (~108종) | +1 |
| Mini-boss (60종) | +2 |
| Major-boss (60종) | +3 |
| Sub-boss (60종) | +2 |
| Final-boss (20종) | +5 |
| 캐릭터 lv 50/100/200/500/1000 | +3 / +5 / +10 / +15 / +20 |

캐릭터당 누적 가능 ~ 400 JP. 100 노드 만렙 ~ 300 JP → 충분히 도달 가능.

### 4.5 Reset

```
reset_cost (DR) = 찍은 노드 수 × 500
```

| 찍은 노드 | 비용 (DR) |
|---|---|
| 10 | 5K |
| 50 | 25K |
| 100 | 50K |

DR 시간당 후반 수억 대비 매우 저렴. 자주 실험 가능.

## 5. 장비 강화 시스템 (메타 5층)

### 5.1 핵심 원리

1. 모든 장비 강화 가능
2. **100% 성공** (실패·파괴 없음)
3. 무한 (lv 0 → ∞)
4. 등급별 곡선 다름
5. Asc reset 무관 (장착·보관함만)

### 5.2 등급별 강화 곡선

장비의 모든 stat (flat & percent) 에 동일 multiplier 적용:

| 등급 | lv N multiplier | lv 100 | lv 1000 |
|---|---|---|---|
| common | × (1 + 0.05·N) | ×6 | ×51 |
| uncommon | × (1 + 0.07·N) | ×8 | ×71 |
| rare | × (1 + 0.10·N) | ×11 | ×101 |
| epic | × (1 + 0.15·N) | ×16 | ×151 |
| legendary | × (1 + 0.22·N) | ×23 | ×221 |
| mythic | × (1 + 0.32·N) | ×33 | ×321 |

### 5.3 강화 비용

```
lv N → N+1 비용:
  강화석 = ceil((N+1)² / 5) × rarityMult
  DR     = (N+1)³ × 100 × rarityMult

rarityMult:
  common × 1.0
  uncommon × 1.5
  rare × 2.5
  epic × 4
  legendary × 8
  mythic × 16
```

mythic 강화 = 비싸지만 곡선이 압도적이라 후반 정답. common 강화 = 가성비
높지만 곡선 평탄. 양쪽 모두 의미 있는 선택.

### 5.4 장비 보관 정책

| 분류 | Asc 보존 |
|---|---|
| 장착 슬롯 (최대 10) | ✓ |
| 차원보관함 (IAP, 최대 3) | ✓ |
| 그 외 인벤토리 | ✗ (사라짐) |

차원보관함 = 캐시 IAP 아이템. "아카식 레코드" 등 명명. 영구 보관소.

### 5.5 수식어 magnitude 와의 관계

장비의 strength 변화는 두 축으로 자란다:

1. base stat × 등급 multiplier (Section 5.2 곡선)
2. 수식어 magnitude (Section 8 — drop 시 굴린 수식어가 강화 lv 당 점진 증가)

고정된 마일스톤 보너스 (lv 100/500/1000 에 갑자기 활성되는 효과) 는 사용하지 않는다.
"강화하면 수식어가 점점 자란다" 는 연속 곡선만 사용. 강화의 매력 = 매 lv 당 측정
가능한 진척이 있고, 그것이 수식어와 base stat 양쪽에 동시 반영되는 데서 온다.

## 6. Ascension (메타 6층)

### 6.1 진입 조건

```
Asc Tier N 진입:
  - 최소 N+2개 던전의 final boss (floor 30) 처치 누적
    Tier 1 = 3개, Tier 18 = 20개 (모든 던전), Tier 18+ = 균열석 비용만
  - + 누적 차원 균열석 N² 개
```

### 6.2 Reset / Persist 정책

| 분류 | 항목 | Reset | 보존 |
|---|---|---|---|
| 런 | charLevels (캐릭터별 메타) | ✓ | |
| 런 | gold | ✓ | |
| 런 | normalBossesKilled / hardBossesKilled | ✓ | |
| 런 | baseAbilityLevel | ✓ | |
| 캐릭터 | soulGrade → 0 (재해금 필요) | ✓ | |
| 장비 | 일반 인벤토리 (장착·보관함 외) | ✓ | |
| 장비 | 장착 + 차원보관함 (강화 lv 포함) | | ✓ |
| 메타 | 유물 모든 종류 | | ✓ |
| 메타 | 직업 트리 진척도 | | ✓ |
| 메타 | 차원 나침반 | | ✓ |
| 메타 | 던전 final boss 1회 보상 | | ✓ |
| 메타 | Asc Tier + Points | | ✓ |
| 화폐 | DR | ✓ (지불 후) | |

### 6.3 보상 곡선

```
Tier N 달성:
  + Asc Tier +1
  + Asc Points = N (지출 가능, 영구 stat 노드 분배)
  + 전역 power multiplier ×(1 + 0.1·N)
    Tier 30 = ×4, Tier 50 = ×6, Tier 100 = ×11

마일스톤 보상:
  Tier 1   — Mythic 슬롯 1개 해금
  Tier 5   — Mythic 슬롯 3개, Mythic 유물 1개
  Tier 10  — Mythic 슬롯 5개, "무한 인장"
  Tier 15  — "차원 항해사", 19번 던전 해금
  Tier 20  — "진리의 빛", 20번 던전 해금
  Tier 25  — Asc Points 부스트 ×2
  Tier 30  — "초월" 모드 (이후 모든 효과 ×1.05/Tier)
```

### 6.4 Asc Tree (영구 stat 노드)

AP 로 구매. 계정 단위 영구 효과.

| 노드 | 효과 | 최대 |
|---|---|---|
| HP +5% | flat | 10 |
| ATK +5% | flat | 10 |
| DEF +5% | flat | 10 |
| 골드 드랍 +10% | flat | 5 |
| BP 시작값 +1 | flat | 5 |
| SP /lvl +1 | flat | 4 |
| 던전 화폐 +10% | flat | 5 |
| 크리 데미지 +20% | flat | 5 |
| 어센션 가속 (다음 Asc 균열석 비용 -10%) | flat | 9 |
| 잠재력 개방 (캐릭터 stat multiplier +5%) | flat | 10 |

## 7. 유물 시스템 (메타 7층, BM 통합)

### 7.1 누적 유물 (Stackable)

자동 활성. 모두 영구. 광고 시청 = +1 stack.

| 유물 | 효과 | 캡 |
|---|---|---|
| 전사의 깃발 | BP 최대 +1 | ∞ |
| 도깨비 부적 | 전투 BP 무소모 +0.1% | 50% |
| 황금 동전 | 골드 +1% | ∞ |
| 영혼 진주 | 캐릭터 XP +1% | ∞ |
| 시간 모래 | DR 드랍 +1% | ∞ |
| 운명 주사위 | LUC +1% | 100% |
| 월광 부적 | 모든 stat +0.5% | 200% |
| 명궁의 화살 | 크리율 +0.05% | 25% |
| 망자의 동전 | 사망 시 손실 무효화 | n/a |
| 명운의 깃털 | 첫 사망 시 1회 부활 | 5/런 |

### 7.2 Mythic 유물 (Equipped)

슬롯 5개 (Asc Tier 진행에 따라 1→5 확장). 보유 ≠ 활성. 장착 시 적용. 비-스택.

| Mythic 유물 | 효과 | 획득 |
|---|---|---|
| 화염 왕좌 | 모든 데미지 ×1.5 | 화산 final boss |
| 시간의 모래시계 | 스킬 쿨다운 -30% | 시간 final boss |
| 천 년의 약속 | HP +100% | 천상 final boss |
| 영혼의 진리 | 캐릭터 XP ×3 | Asc Tier 5 |
| 무한의 인장 | 모든 메타 진행 ×2 | Asc Tier 10 |
| 운명의 저울 | 크리 데미지 ×2 | 모든 final boss 처치 |
| 차원 항해사 | 던전 화폐 모든 종 동시 드랍 (50%) | Asc Tier 15 |
| 진리의 빛 | 모든 효과 +25% | Asc Tier 20 |
| ... 총 ~30개 | (각 final + 주요 milestone) | |

### 7.3 차원 나침반 (Compass)

자동 활성. 던전 자유 선택용. 던전당 1차 (가중치 ×3) + 2차 (직접 선택) 총 40개.

### 7.4 BM 흐름

광고 1회 = ₩100 가치. IAP 패키지:
- ₩1,100 — 유물 100개 일괄 (광고 100회 효과, 약 80분 절약)
- ₩5,500 — 광고 제거 패스 (월간) — 시청 즉시 보상 자동
- ₩11,000 — 유물 묶음 + Mythic 1개

미과금 플레이어도 시간 투자 (광고 시청) 으로 도달 가능. 헬시 freemium.

## 8. 장비 수식어 (Modifier) 시스템

### 8.1 핵심 원리

1. 각 장비 인스턴스에 1~4 수식어 부착 (등급 비례, drop 시 무작위 굴림)
2. 강화 lv ↑ 시 수식어 마그니튜드 점진 증가
3. Reroll 가능 (DR + 강화석 비용)
4. Asc reset 영구 보존

### 8.2 수식어 슬롯

| 등급 | 슬롯 |
|---|---|
| common | 1 |
| uncommon | 1 |
| rare | 2 |
| epic | 2 |
| legendary | 3 |
| mythic | 4 |

### 8.3 수식어 풀 (~40개)

전체 풀은 카테고리별 분류. 슬롯별 풀 (무기/방어구/악세) 다름.

**공격형** (무기·악세 풀, 8개): 크리티컬 / 크리데미지 / 관통 / 마법공격 /
화염피해 / 냉기피해 / 번개피해 / 신성피해

**상태이상** (무기·악세 풀, 8개): 중독 / 기절 / 동결 / 약화 / 둔화 / 출혈 /
침묵 / 공포

**유틸** (모든 슬롯, 6개): 흡혈 / SP 흡수 / 골드부스트 / 경험치부스트 /
화폐부스트 / 행운

**방어형** (방어구·악세 풀, 6개): 회피 / 반사 / 가시 / 방어막 / 재생 / 면역

**특수/희귀** (mythic·legendary 가중, 6개): 즉사 / 시간 정지 / 광기 / 분노 /
영혼 흡수 / 검은 노래

총 34개 — 카탈로그 작성 시 확장 가능 (~40개 목표).

각 수식어의 시작 magnitude + 강화당 증가량은 Section 11 의 숫자 디자인에서
구체화.

### 8.4 굴림 규칙

- **Drop 시**: 등급에 맞는 슬롯 수만큼 풀에서 무작위 굴림 (중복 없음)
- **합성 시 (3→1)**: 새 등급 해당하는 새 수식어 굴림 (이전 수식어 사라짐)
- **Reroll**: 슬롯 1개 또는 전체. 강화 lv 보존.

```
Reroll 비용:
  슬롯 1개:    DR 25M + 강화석 250
  전체:        DR 100M + 강화석 1,000
N번째 reroll 시 ×1.5N (스팸 방지)
```

### 8.5 빌드 시너지 (D2 식)

| 빌드 컨셉 | 스킬 + 수식어 + 유물 조합 |
|---|---|
| 화랑 검술 폭딜 | 화랑 일섬 ULT + 크리데미지 + 광기 + 운명의 저울 Mythic |
| 화랑 화염 폭격 | 화랑 진명 ULT + 화염피해×3 + 마법공격 + 화염 왕좌 Mythic |
| 무당 저주 봉쇄 | 무당 강령 ULT + 중독 + 기절 + 약화 + 둔화 |
| 무당 즉사 | 무당 점복 ULT + 즉사 + 검은 노래 + 운명의 저울 Mythic |
| 초의 흡혈 탱커 | 초의 불괴 ULT + 흡혈 + 가시 + 재생 + 방어막 |

### 8.6 전투 시스템 추가 작업

신규 처리 필요:
- 도트 (중독/출혈)
- CC (기절/동결/공포)
- 디버프 stack (약화/둔화)
- 보호막
- 반사 (받은 dmg → 적용)
- 처치 시 트리거 (영혼 흡수)
- HP 비례 트리거 (광기)
- 누적 stack (분노)

기존 전투 코드에 effect-pipeline 추가. 한 번 구축하면 40 수식어 어느 것이든
처리.

## 9. 컨텐츠 카탈로그 분량 (재정리)

| 항목 | 현재 | 목표 | 추가 |
|---|---|---|---|
| 던전 (테마) | 9 | 20 | +11 |
| 던전 named floor | 120 area | 600 floor | 데이터 row +480 |
| 던전 심층 floor | n/a | ∞ procedural | 0 |
| 몬스터 종류 | 61 | ~200 (테마당 10) | +140 |
| Boss (mini/major/sub/final) | 109 | 200 (60+60+60+20) | +90 |
| 캐릭터 | 16 | 3 (시작) + 13 (보존) | -13 (단계적) |
| 액티브 스킬 | 32 | 3 × 4 분기 ULT = 12 + 분기 내 강화 | 카탈로그 구조 변경 |
| 직업 트리 노드 | 0 | 300 (3 × 100) | +300 |
| 장비 카탈로그 | 41 | ~80 (60 일반 + 20 던전 시그니처) | +39 |
| 장비 수식어 풀 | 0 | 40 | +40 |
| 유물 — 누적 | 0 | 10 | +10 |
| 유물 — Mythic | 0 | 30 | +30 |
| 유물 — 나침반 | 0 | 40 | +40 |
| Asc Tree 노드 | 0 | 10 종류 | +10 |
| 화폐 | 1 (gold) + BP | 1 (DR) + 강화석 + BP | 단순화 |

## 10. 페이싱 곡선 — 300h Milestone

### 10.1 누적 시간별 상태

| 시점 | 평균 런 길이 | 메인 활동 | 주요 milestone |
|---|---|---|---|
| 0~1h | 5분 | 첫 5 런, 튜토리얼, 첫 보스 | 화랑 lv 30, 첫 강화석 |
| 1~5h | 8분 | 시작 3 던전 탐험 | 모든 시작 던전 floor 5+, soulGrade 2 |
| 5~15h | 10분 | 동해/화산 해금 | floor 10 major-boss × 2, 1차 나침반 |
| 15~30h | 12분 | 첫 자유 선택, 강화 lv 50+ | soulGrade 5, 화랑 트리 1 분기 만렙 |
| 30~50h | 15분 | 5 던전 final 도전 | floor 30 final 1~2개, 균열석 누적 |
| 50~80h | 20분 | **첫 Ascension Tier 1** | Asc 1, Mythic 슬롯 1, 첫 Mythic 유물 |
| 80~120h | 25분 | Asc 1 → 5, 무당 본격 | Asc 5, 시작 던전 final 모두, 슬롯 3 |
| 120~180h | 30분 | 9 final 도전, 강화 lv 200+ | Asc 10, 슬롯 5, final 70% |
| 180~250h | 40분 | 18~20 final 도전 | Asc 15, 19/20 던전 해금 |
| 250~300h | 50분 | 20번째 final 처치, 트리 만렙 | Asc 20, 모든 final 처치, 트리 만렙 |
| 300h+ | 커스텀 | 강화 lv 1000+, Asc 30+, 무한 심층 | 무한 자기 도전 |

### 10.2 첫 1시간 retention 곡선

| 분 | 이벤트 |
|---|---|
| 0~3 | 튜토리얼, 화랑 선택, 마을 도착 |
| 3~5 | 평야 던전 첫 입장, floor 1~3 클리어 |
| 5~10 | 첫 강화 (lv 1→5), 사망, 캐릭터 lv +1 |
| 10~15 | 두 번째 런, floor 5 mini-boss, 1차 나침반 |
| 15~25 | 세 번째 런, 깊은숲 던전, 첫 epic 장비 |
| 25~40 | 광고 1번 시청 → 유물 첫 획득 |
| 40~60 | 5번째 런, soulGrade 2, 무당 해금 |

### 10.3 광고 시청 페이싱

300h = 광고 ~2,000회 가능 (시간당 평균 7회).

| 누적 광고 | stack 합 | BP 효과 |
|---|---|---|
| 100 | 100 | BP 130 |
| 500 | 500 | BP 530 |
| 2000 | 2000 | BP 2030 |

## 11. 숫자 디자인 / 인플레이션 곡선

### 11.1 핵심 원리

상대 진척률 일정, 절대 숫자 폭발. 1시간당 강화 횟수는 시간이 지날수록 **늘어나야**
(10 → 100 → 10,000 → 1,000,000), 한 번의 강화 의미는 **비슷하게** 유지.

### 11.2 5 핵심 curve

#### Curve 1 — Floor depth → Monster level

```
L(F) = floor 1~10:    F (1~10)
L(F) = floor 11~30:   F²/5         (floor 30 = level 180)
L(F) = floor 31~100:  F³/1000      (floor 100 = level 1000)
L(F) = floor 100+:    L(100) × 2^((F-100)/30)  (지수 가속)
                        floor 200 = level ~10k
                        floor 500 = level ~100k
                        floor 1000 = level ~1M
```

#### Curve 2 — Monster HP/ATK at level L

```
HP(L)  = 100 × 1.4^L
ATK(L) = 10 × 1.3^L
DEF(L) = 10 × 1.25^L
EXP(L) = 50 × 1.45^L
DR(L)  = 1 × 1.5^L
```

#### Curve 3 — Player power 합성 (예: ATK)

```
ATK_final =
  base_atk(110)
  × (1 + sp_atk × 0.03)              // 런 SP 분배
  × (1 + char_meta_lv × 0.02)        // 메타 캐릭터 lv
  × (1 + 0.1 × ascTier)              // Ascension Tier
  × (1 + 0.05 × ascTreeATK)          // Asc Tree 노드 (max 10)
  × (1 + 0.1 × jobTreeATK)           // Job Tree 노드
  × (1 + relicGoldStack × 0.01)      // 유물 스택
  × (1 + 0.5 × baseAbility)          // baseAbility (max 18)
  + equipmentATK                     // 장비 (강화 lv 곡선 적용)
```

각 축이 곱·합 혼합. 모든 메타 누적이 직접 power 로 변환.

#### Curve 4 — 강화 비용 vs 보상

| 누적 시간 | 평균 floor | 평균 monster lv | 시간당 DR | 시간당 강화 가능 lv 합 |
|---|---|---|---|---|
| 5h | 8 | 8 | 1K | 5 lv |
| 30h | 25 | 60 | 100K | 30 lv |
| 80h | 60 | 500 | 5M | 100 lv |
| 200h | 200 | 5K | 50G | 500 lv |
| 300h | 500 | 50K | 5T | 5K lv |
| 500h | 1500 | 50M | 5×10²⁵ | 50K lv |

#### Curve 5 — Asc 비용

```
Asc Tier N 진입 비용 균열석 = N²
  N=1 → 1
  N=10 → 100
  N=20 → 400
  N=30 → 900

균열석 드랍률:
  Mini-boss        = 1
  Major-boss       = 5
  Sub-boss         = 3
  Final-boss       = 20
  심층 floor       = floor / 50 per 클리어
```

### 11.3 UI 숫자 표기 — 알파벳

| 범위 | 표기 | 예 |
|---|---|---|
| < 10³ | 그대로 | 999 |
| 10³ ~ 10⁶ | K | 1.23K |
| 10⁶ ~ 10⁹ | M | 45.7M |
| 10⁹ ~ 10¹² | B | 8.9B |
| 10¹² ~ 10¹⁵ | T | 1.5T |
| 10¹⁵ ~ 10¹⁸ | aa | 2.5aa |
| 10¹⁸ ~ 10²¹ | ab | 7.8ab |
| ... | ad ~ az, ba ~ bz, ... | 무한 |

```ts
formatNumber(1500)        → "1.50K"
formatNumber(50_000_000)  → "50.0M"
formatNumber(1.23e15)     → "1.23aa"
formatNumber(9.99e84)     → "9.99ba"
```

전 게임 모든 큰 수에 적용 (DR / 강화석 / EXP / 데미지 / HP / 장비 stat 등).
던전 floor·강화 lv·Asc Tier 같은 작은 정수는 그대로.

## 12. 추후 작업 — 보존 메모

### 12.1 마을 hub UI/UX (Section 3 deferred)

본 spec 의 다른 모든 section 합의 후 통합 조망. 별도 spec 작성.

### 12.2 캐릭터 13명 확장

검객 / 착호갑사 / 도사 / 야차 / 궁수 / 의녀 / 장수 / 승병 / 거사 / 천관 / 용녀
/ 귀신 / 선인 — 컨셉 보존. Asc Tier 마일스톤 / 신규 던전 / 이벤트 보상으로 점진
추가. 각 캐릭터 본격 디자인 시 ULT + 트리 분기 + 정체성 만들기.

### 12.3 온라인 stretch

유저 충분히 모이면 검토:
- 길드 시스템
- 공성전 (최소 리소스)
- 길드 대항전
- 거래 시스템
- PvP

baseline = 싱글 (본 spec). 온라인 = stretch.

## 13. 구현 영향 — 수정 필요 파일 (예상)

### 13.1 데이터
- `src/data/regions.ts` → `dungeons.ts` (재구성, 20 던전)
- `src/data/maps.ts` → `floors.ts` (600 named floor + 무한 심층)
- `src/data/monsters.ts` (확장, ~200 종)
- `src/data/bosses.ts` (재정렬, ~200 보스)
- `src/data/characters.ts` (3 시작 캐릭터로 축소, 트리 데이터 신설)
- `src/data/skills.ts` (분기별 ULT 구조)
- `src/data/equipment.ts` (~80 장비)
- `src/data/modifiers.ts` (신규, 40 수식어 풀)
- `src/data/relics.ts` (신규, 누적 + Mythic + 나침반)
- `src/data/ascension.ts` (신규)
- `src/data/jobtree.ts` (신규, 300 노드)

### 13.2 시스템
- `src/systems/bp.ts` (BP 비례 소모 — 몬스터 lv 기반)
- `src/systems/enhance.ts` (신규 — 강화 lv 곡선, 비용)
- `src/systems/modifiers.ts` (신규 — 수식어 굴림, reroll, magnitude)
- `src/systems/effects.ts` (신규 — effect-pipeline: 도트/CC/디버프/반사 등)
- `src/systems/relics.ts` (신규 — 누적 + Mythic 슬롯)
- `src/systems/ascension.ts` (신규 — reset/persist, Tier 진입)
- `src/systems/jobtree.ts` (신규 — JP, 노드 활성, reset)
- `src/systems/format.ts` (신규 — 알파벳 숫자 표기)
- `src/systems/experience.ts` (curve 보정)
- `src/systems/stats.ts` (Player power 합성 통합)

### 13.3 화면
- `src/screens/MainMenu.tsx` → 마을 hub 화면 (deferred)
- `src/screens/WorldMap.tsx` → 던전 입구 화면
- `src/screens/RegionMap.tsx` → 던전 내부 (수직 floor 진입)
- `src/screens/Battle.tsx` (effect-pipeline 통합)
- `src/screens/Inventory.tsx` (강화 lv 표시, 수식어 표시)
- `src/screens/Shop.tsx` (강화소 / reroll 부스 통합)
- `src/screens/Quests.tsx` (JP 마일스톤 표시 통합)
- 신규: `src/screens/Vault.tsx` (보물고 — 유물)
- 신규: `src/screens/JobTree.tsx`
- 신규: `src/screens/Ascension.tsx`
- 신규: `src/screens/Enhance.tsx`

### 13.4 store / state
- `src/store/gameStore.ts` (MetaState 확장: dr, enhanceStones, relics, jobTree,
  ascension, modifiers, equipped/storage 분리)
- `src/types.ts` (모든 신규 타입)

## 14. 마일스톤 / 단계

이 spec 은 단일 구현으로 다 끝낼 규모가 아니다. 단계 분해:

- **Phase A**: 핵심 인프라
  - 단일 화폐 (DR/강화석) 구조
  - 알파벳 숫자 표기
  - BP 비례 소모
- **Phase B**: 던전 시스템 재편
  - 마을 hub (간단 ver.)
  - 20 던전 데이터 + 600 named floor + 심층
  - 던전 선택 (랜덤 + 나침반)
- **Phase C**: 강화 시스템
  - 등급별 곡선
  - 강화소 UI
- **Phase D**: 수식어 + 효과 시스템
  - effect-pipeline (전투 코드)
  - modifier 풀 + 굴림 + reroll
- **Phase E**: 메타 시스템 1
  - 유물 (누적 + Mythic + 나침반)
  - 광고 인프라 (Phase 5 sound 처럼 일단 stub OK)
- **Phase F**: 메타 시스템 2
  - 직업 트리 (300 노드)
  - 3 캐릭터 정체성 재정비
- **Phase G**: Ascension
  - reset/persist
  - Asc Tree
- **Phase H**: 컨텐츠 카탈로그 채우기
  - 200 몬스터, 200 보스, 80 장비, 40 수식어 데이터
- **Phase I**: 페이싱 / 숫자 검증
  - 시뮬레이션 (스프레드시트)
  - 곡선 fine-tuning
- **Phase J**: 마을 hub 통합 spec + 구현

각 Phase 는 독립 spec 으로 작성 후 plan 으로 분해 (writing-plans skill).

## 15. 비목표 (out-of-scope)

본 spec 에서 다루지 않음:
- 온라인 / PvP / 길드
- 13명 추가 캐릭터 본격 구현
- 라이브 운영 / 시즌 이벤트
- 마을 hub UI 본격 디자인 (별도 spec)
- 광고 SDK 통합 자체 (Phase 5 monetization spec 참조)
- 다국어 (i18n)

## 16. 위험 / 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 600 floor 데이터 작업량 | 큼 | floor = 데이터 row 3-5 줄 + 배경/몬스터 ID. 자동 생성 스크립트 가능 |
| effect-pipeline 전투 복잡도 | 중 | 카테고리별 단계적 도입 (도트 → CC → 디버프 → ...) |
| 인플레이션 곡선 균형 | 큼 | 스프레드시트 시뮬레이션 + 플레이테스트. 곡선 상수 1~2 줄 변경으로 조정 |
| 수식어 + 강화 lv 조합 폭발 | 중 | 수식어 magnitude 도 강화 곡선 따라가면 자연 균형 |
| 캐릭터 16 → 3 reduction = backward break | 중 | 현재 phase-2 의 16 캐릭터 데이터는 보존하되 unlock 잠금. 추후 점진 활성 |
| BP scaling = 기존 BP UI 변경 | 작 | 표기 + 계산 함수만 변경, 기본 게임 흐름 동일 |

## 17. 측정 지표 (post-launch)

- 1시간 retention: ≥ 60% (튜토리얼 끝까지)
- 1일 retention: ≥ 40%
- 7일 retention: ≥ 20%
- 평균 첫 광고 시청까지 시간: ≤ 30분
- 평균 첫 Asc 도달 시간: 50~80h
- 누적 300h 도달 비율 (헤비유저): ≥ 5%
- IAP 전환율: 5~10%
- ARPDAU: 메인 KPI (Phase 5 spec 참조)
