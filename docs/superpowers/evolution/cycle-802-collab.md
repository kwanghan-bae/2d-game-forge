# Cycle 802 Collaboration Record

## Participants
- **Critic**: 게임 비평가
- **Level Designer**: 레벨 디자이너
- **Planner**: 게임 기획자

## Critic Score: 22/40 (±0 from C799)
| Axis | Score | Note |
|------|-------|------|
| 흥행성 | 6/10 | 이벤트 다양성 충분하나 구조적 동질성 (N fights × multiplier) |
| 재미 | 5/10 | Gold Crucible = 거절 함정, Astral Paradox = 무조건 수락. 의미있는 선택 30% |
| 몰입성 | 5/10 | 이벤트 서사와 배율 변경 1:1 대응. 시각/청각 피드백 부재 |
| 플레이타임 | 6/10 | fight 400+ 이후 신규 자극 부재. Event Momentum이 밀도만 보완 |

## Critic Top 3 Priorities
1. **Gold Crucible EV 재설계**: flat 50 → ratio 기반 (12% ATK mul, 10 fights) + gold cost를 "즉시 소각" → "10 fights 동안 gold 획득 0"으로 전환
2. **Decline path 보상 체계**: decline에 전략적 가치 부여 (declineStack → 희귀 이벤트 강제 출현)
3. **무료 이벤트에 mild cost 부과**: Blacksmith/Fairy/Healer/Echo/Inspiration에 1-axis tradeoff

## Critic Key Insight
> "점수를 +3 올리려면: 모든 이벤트에 decline에도 실질적 보상을 부여하라. decline path 전략이 존재하면 재미/몰입/플레이타임 3축 동시 상승."

## Level Designer Findings
- 300-450 bracket: 밀도 적정(~4.7 fights/event) 이나 **300-349 에 Titan 1종만 신규** = 신선도 공백
- Gold Crucible: flat +50 ATK은 inflation 곡선 미추적 (fight 500+ 에서 무의미)
- 15-fight duration: archetype 차별화는 좋으나 overlap 과다 (3-4개 다른 event 발생)
- 누락 archetype: HP 투자형, Combo 소비형, Multi-phase

### Level Designer Recommendations
1. **Crimson Tithe** (gate 325, 2.5%): HP 25% 소비 → EXP×1.8 + lifesteal 8%, 6 fights. 사망 시 combo 전멸
2. **Gold Crucible 스케일링 개선**: flat 50 삭제 → `ATK_RATE: 0.12` (burned gold 비례). Duration 15→12
3. **Momentum Harvest** (gate 280, 2%): combo 30+ 시 combo를 gold+EXP로 전환. 조건부 archetype 신규

## Planner Recommendation: Option A (content + extraction 병행)

### C803 [system]
- WeatherSubsystem 추출 (~400-500 lines out, EncounterEngine ≤ 1700)
- ConditionalEvent archetype (조건부 이벤트 2개 — HP predicate, combo predicate)
- Event cooldown infrastructure

### C804 [structure]
- EventHUD panel (active event 표시)
- EventRegistry refactor (single source-of-truth)
- Event feedback VFX hooks

### C805 [balance + collab]
- Survival Event: Siege Mode
- Decision tension pass (pick rate distribution tuning)
- Weather RNG guardrails (pity/anti-streak)

## Consensus (adopted for C803-C805)

### Merged priorities from all 3 agents:
1. **Gold Crucible → ratio 기반 전환** (critic + level designer 합의) — C803 system
2. **Crimson Tithe (gate 325) HP 투자형** (level designer 제안, critic "HP cost = meaningful decision" 지지) — C803 system
3. **Decline path value** (declineStack mechanic) — C804 structure (EventRegistry 에 통합)
4. **Weather extraction** — C804 structure (planner recommendation)
5. **Decision tension pass** — C805 balance

### Adjusted 3-cycle plan:
- **C803 [system]**: Gold Crucible ratio 전환 + Crimson Tithe 신규 event
- **C804 [structure]**: DeclineStack system + WeatherSubsystem extraction
- **C805 [balance + collab]**: Decision tension (pick rate balance) + weather guardrails + next collab

## Carry-over
- Multi-phase event archetype (deferred — needs UI support first)
- Momentum Harvest (combo 소비형) — deferred to C806+
- EventHUD panel — deferred to post-extraction
