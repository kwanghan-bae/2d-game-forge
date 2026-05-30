# Cycle 736 Collaboration Record

## Critic Assessment — 26/40 (+1 from C732)

| 축 | 점수 | 변화 |
|---|---|---|
| 흥행성 | 6 | = |
| 재미 | 6 | = |
| 몰입성 | 7 | +1 (Night/Weather/Destination badges) |
| 플레이타임 | 7 | = |

### Top 3 Priorities
1. **Mid-game Event Injection** — prestige tier별 exclusive event 부재. 재미+1, 플레이타임+1.
2. **Trait→Route Explanation UI** — DestinationResolver reason 필드 + badge. 몰입성+1.
3. **Event 발생 빈도 상향** — 현재 ~21%, 10x speed 시 결정 빈도 희소.

## Planner Proposals

| Cycle | Layer | Target |
|---|---|---|
| C737 | system | Storm + Snow weather types |
| C738 | balance | Wandering Healer + Echo Shrine (mid-game events) |
| C739 | UI/UX | TraitInfluenceBadge (route reason 표시) |

## Level Designer Analysis

### Critical Finding: Difficulty Gate (C734) is Dead Code
- `landmarkToCandidate()` hardcodes difficulty: boss=3, enemy=1
- Gate condition `c.difficulty > heroLevel × 1.5` only fires at heroLevel=1
- Gate never activates in normal gameplay (heroLevel ≥ 2 → threshold ≥ 3 → boss 3 passes)
- **Fix needed**: difficulty should reflect realm fieldLevelRange

### Night Cycle
- Code: NIGHT_CYCLE_INTERVAL=20, NIGHT_DURATION=5 (uptime 25%, net +25% EXP)
- Recommend: interval 20→25 (20% uptime), DMG 1.5→1.6

### Mid-Game Event Priority
- Storm Warning (night 연계, passive→active) > Equipment Fragment > Bounty Board

## Consensus (C737-C739)

| Cycle | Layer | 확정 내용 |
|---|---|---|
| C737 | system | Fix landmark difficulty pipeline (realm-based difficulty so gate works) |
| C738 | balance | Night interval 20→25 + enemy DMG 1.5→1.6 |
| C739 | UI/UX | TraitInfluenceBadge (resolver returns influencingTraits) |

### 합의 근거
- **C737**: Level-designer 핵심 발견 — C734 difficulty gate가 사문화 상태.
  Realm fieldLevelRange 기반 difficulty 파이프라인이 선행되어야 gate 의미 있음.
- **C738**: Night EXP +25% 과도 (sea→volcano 전이 15% 앞당김). 간단 상수 조정.
- **C739**: Critic #2 + Planner 일치. DestinationResolver에 reason 추적 추가.

### Deferred
- Storm/Snow weather: C740+ (system slot)
- Mid-game event pool expansion (Healer/Echo): C741+ (balance slot)
- Event 빈도 상향: C742+ 이후 논의
