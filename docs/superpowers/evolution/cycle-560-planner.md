# Cycle 560 Planner — Batch C561-C600 Mechanic Breakdown

category: system

## 설계 원칙

현재 EncounterEngine 은 3,192 줄, 70+ ATK mul, 72+ EXP mul, 67+ gold mul 을 보유한다.
C561-C600 은 **더 이상 수치 승수를 추가하지 않는다**. 대신 다음에 집중한다:

- **State toggle** — on/off 모드 전환으로 플레이 패턴 분기
- **Choice gate** — 플레이어(또는 AI 성격계) 선택에 따른 비가역 분기
- **Unlock flag** — 조건 충족 시 새로운 encounter 경로 해금
- **Mode switch** — 기존 수치의 해석 방식 자체를 변경

---

## Batch 1: Event Encounters (C561-C570)

비전투 이벤트 선택지 — 기존 `moral_choice` 를 확장하여 encounter 자체가 선택/결과 분기를 갖는 시스템.

| ID | Name | Description | Modifies |
|----|------|-------------|----------|
| C561 | **Wandering Merchant** | 비전투 encounter. 3가지 상품(HP회복/ATK임시/Gold투자) 중 하나만 선택 가능. 선택하지 않으면 merchant 호감도가 쌓여 다음 출현 시 할인율 적용. 기존 village shop 과 달리 자동 구매가 아닌 **선택 게이트**. | `resolveEncounter` — 새 branch `kind === 'merchant'`. village shop 자동구매 로직 대체 아님, 병렬 경로. |
| C562 | **Crossroads Fork** | 2갈래 길 선택 encounter. A = 위험(다음 3전투 danger zone 강제) B = 안전(다음 3전투 enemy HP -30%). 선택은 `crossroadState` enum(`'danger'|'safe'|null`)으로 3전투 후 자동 해제. 수치 mul 추가 없이 기존 danger/weaken 메커니즘 재사용. | `resolveEncounter` 진입 시 `crossroadState` 확인 → isDangerZone / enemyWeakenMul override. |
| C563 | **Trapped Chest** | 열기(gold 획득 + 30% 확률 curse) vs 무시. Curse = `trappedCursed` flag on → 다음 5전투 모든 heal 무효. heal 수치 자체를 건드리지 않고 `if (trappedCursed) skip heal` guard. | `hero.heal()` 호출부에 guard 추가. 새 mul 아님, boolean flag. |
| C564 | **Old Hermit** | 비전투 NPC. personality 'merciful' ≥ 3 이면 지혜 전수(다음 prestige threshold -20 감소), < 3 이면 거부. 조건부 unlock. 기존 prestige threshold 계산에 `hermitWisdom` offset 반영. | `getPrestigeThreshold()` 에 offset 반영. 새 mul 아님, additive const offset. |
| C565 | **Mirage Oasis** | 방문 시 `mirageState` toggle on. 이후 10전투 동안 적 HP가 화면에 표시되지 않음(UI fog). 실제 수치 변경 없음 — 순수 정보 차단 메커니즘. AI sim 에서는 영향 zero(UI only). | UI layer 전용. EncounterEngine 은 `mirageActive` flag emit만 담당. |
| C566 | **Gambler's Den** | Gold 의 50% 를 배팅. 50/50 확률로 ×2 또는 ×0. 기존 gold mul 과 다르게 **절대값 도박** — mul chain 밖에서 gold 직접 set. `hero.gold = betResult`. | `resolveEncounter` — gold 직접 조작. mul pipeline 우회. |
| C567 | **Memory Fragment** | 비전투. 이전 run 에서 가장 높은 combo streak 기록을 읽어 현재 comboStreak 에 10% 가산(floor). cross-run state read. `legacyMaxCombo` 필드 필요. | `comboStreak` 초기값에 legacy offset. 새 mul 아님, 초기값 변경. |
| C568 | **Spirit Pact** | 2지선다: (A) ATK +20% 영구 but HP regen 영구 비활성화, (B) HP regen ×2 영구 but ATK -10% 영구. **비가역 선택** — `spiritPact: 'atk' | 'regen' | null`. 한 run 에 1회만 발동. | 기존 ATK/regen 계산 분기. 새 상수 아님, 모드 flag. |
| C569 | **Omen Reading** | 다음 boss 전투의 결과를 미리 알려줌(승리 가능 vs 패배 예상). `omenState` flag → boss encounter 시 flee 선택지 활성화. 기존 boss 전투 강제 진입을 조건부 회피로 변경. | `resolveEncounter` boss path 에 `omenFlee` guard 추가. |
| C570 | **Festival Crowd** | 비전투. 현재 prestige count × 10 gold 를 즉시 획득. 대신 다음 5전투 enemy ATK +50%. `festivalDebuff` counter. 기존 enemyAtk 계산에 flag-driven override(mul 추가 아님, 기존 `atkMul` 변수 재사용). | `enemyAtk` 계산부 — festivalDebuff > 0 일 때 atkMul 변수에 +0.5 (새 export const 불요, inline). |

---

## Batch 2: Ascension Paths (C571-C580)

Prestige 10 이후 빌드 분기 — 한 번 선택하면 해당 run 동안 유지되는 **path mode**.

| ID | Name | Description | Modifies |
|----|------|-------------|----------|
| C571 | **Ascension Gate** | Prestige 10 도달 시 `ascension_path_offered` event emit. 3개 path 중 하나 선택 필수. 선택 전까지 전투 불가(stagger). `ascensionPath: 'warlord' | 'sage' | 'merchant' | null`. | Prestige handler — path 선택 전 `hero.staggered = true` set. |
| C572 | **Warlord Path** | ATK 계산 모드 변경: 기존 모든 ATK mul 합산 결과에 `Math.pow(result, 1.1)` 적용. 대신 모든 gold 획득 -50% flat. 수치 추가 아님 — 기존 파이프라인의 **지수 변환**. | ATK 최종 계산 단계에 power transform. gold 획득 시 `*= 0.5` (기존 GREED_MODE 패턴 재사용). |
| C573 | **Sage Path** | EXP 획득을 **복리 모드**로 전환: 레벨업 시 남은 exp 가 다음 레벨 요구량의 10% 로 carry-over (기존은 0). 대신 crit 확률 영구 0. | `hero.gainExp()` 호출 후 잔여 exp carry 로직. `CRIT_CHANCE` → 0 override flag. |
| C574 | **Merchant Path** | Gold 가 **직접 exp 로 전환**: 매 전투 종료 시 gold 의 1% 가 exp 로 자동 변환. 대신 village shop/forge 이용 불가. 기존 village 분기에 `merchantPathBlock` guard. | village encounter 내 shop/forge 분기에 guard. 전투 종료 시 gold→exp 변환 (신규 mul 아님, direct transfer). |
| C575 | **Path Synergy Unlock** | 3회 연속 prestige 를 같은 path 로 선택하면 `pathMastery` flag on. 해당 path 의 불이익 50% 경감. state toggle — `pathMasteryCount` counter. | 기존 path penalty 적용부에 `if (pathMastery) penalty *= 0.5` guard. |
| C576 | **Path Shift (Betrayal)** | Prestige 15+ 에서 path 변경 가능. 대가: 현재 run 의 모든 permanent ATK bonus 리셋. `pathShiftUsed` flag — run 당 1회. | Prestige handler — path enum 교체 + permanent bonus 초기화. |
| C577 | **Warlord Rage Mode** | Warlord path 전용. HP 50% 이하 시 `rageMode` toggle on → 매 hit 마다 HP -1% but ATK 누적 +5% (cap 없음, 사망 시 리셋). 기존 berserker 와 다르게 **누적형**. | Combat loop 내 HP 감소 + ATK 누적. 기존 BERSERKER 상수 재사용 안 함, 별도 state. |
| C578 | **Sage Meditation** | Sage path 전용. 전투 없이 5 encounter 연속 village/shrine 방문 시 `meditationComplete` → 다음 전투 exp ×10 (1회). 패턴 인식 메커니즘. | `nonCombatStreak` counter. 달성 시 1회 exp burst flag. 새 mul const 불요. |
| C579 | **Merchant Caravan** | Merchant path 전용. Gold 1000 이상 보유 시 자동으로 `caravanActive` — 이동 속도(encounter 간격) 2배. sim 에서는 encounter frequency 변경. | `resolveEncounter` 호출 빈도를 controller 가 `caravanActive` 에 따라 조절. Engine 은 flag emit. |
| C580 | **Ascension Prestige Bonus** | Path 선택 후 매 prestige 마다 해당 path 의 primary stat 에 flat +1 영구 (warlord=ATK, sage=level start, merchant=gold start). 기존 prestige bonus 와 **별도 채널** — 독립 counter. | Prestige handler — `ascensionPrestigeBonus` 누적. 기존 PRESTIGE_STAT_BONUS 와 별개. |

---

## Batch 3: Challenge Modifiers (C581-C590)

자발적 난이도 토글 — 활성화하면 보상 증가. "위험/보상 교환" 이 아닌 "규칙 변경".

| ID | Name | Description | Modifies |
|----|------|-------------|----------|
| C581 | **Modifier Slot System** | 최대 3개 modifier 동시 활성화 가능. `activeModifiers: Set<ModifierId>` (max size 3). Village 에서만 교체 가능. UI toggle. | 새 state field. 모든 C582-C590 은 이 set 멤버십으로 활성 여부 판단. |
| C582 | **Glass Cannon** | Modifier. HP max 를 현재의 50% 로 고정(일시). 대신 모든 전투 종료 시 exp ×1.5. 기존 exp mul 에 추가하는 게 아니라, `if (glassCannon) expGain = Math.floor(expGain * 1.5)` 단일 적용. | `expGain` 최종 계산 후 post-modifier. 기존 mul chain 과 별도 layer. |
| C583 | **Pacifist Run** | Modifier. 적을 죽이지 않음(전투 자동 flee). 대신 village/shrine 방문 exp 5배. 전투 encounter 자체를 skip 하는 **mode switch**. | `resolveEncounter` enemy/boss path 를 조기 return. shrine/village exp 계산에 ×5 (기존 mul 아님, modifier layer). |
| C584 | **Iron Will** | Modifier. 모든 healing 비활성화(regen, village heal, crit heal 전부). 대신 사망 시 death penalty 없음(레벨 유지). | heal 호출부에 `if (ironWill) return` guard. death penalty 분기에 guard. |
| C585 | **Speed Demon** | Modifier. Encounter 해결 속도 2배(sim: 같은 시간에 2× encounters). 대신 적 ATK 2배. 기존 적 ATK 계산에 modifier flag 기반 `*= 2`. | Controller encounter frequency + enemyAtk 계산. 기존 상수 재사용 아님, modifier guard. |
| C586 | **Lone Wolf** | Modifier. Companion 비활성화(C241), village 방문 불가(자동 skip). 대신 momentum cap 제거(기존 20 → 무제한). 기존 MOMENTUM_CAP 을 override. | `MOMENTUM_CAP` 참조부에 `if (loneWolf) Infinity` 분기. village encounter 자동 skip. |
| C587 | **Cursed Gold** | Modifier. Gold 획득 시 동일량 만큼 적 HP 가 다음 전투에 추가됨. "gold = 적 강화 연료" mode. 기존 gold 수치를 건드리지 않고 `cursedGoldBuffer` state 로 enemy HP 에 가산. | enemyHp 계산에 `+ cursedGoldBuffer` 가산 후 buffer 리셋. |
| C588 | **No Crit** | Modifier. Critical hit 완전 비활성화. 대신 모든 hit 가 base damage +30% flat. 기존 crit 분기를 skip 하고 damage 에 1.3 적용. | Combat loop crit 분기에 modifier guard. damage 계산에 flat 1.3. |
| C589 | **Boss Rush** | Modifier. 모든 enemy encounter 가 boss 로 교체됨. Elite/danger/goblin spawn 비활성화. 순수 boss 연전. 기존 `isBoss` 판정을 강제 true. | `resolveEncounter` — `kind` override to 'boss' when modifier active. |
| C590 | **Minimalist** | Modifier. Relic slot 0 개, synergy 비활성화, sacrifice 비활성화. 대신 base ATK/HP 가 1.5배 시작. "단순 스탯 vs 복잡 시스템" trade-off. | Relic/synergy/sacrifice 분기에 guard. hero 초기 stat 에 1.5× (constructor level). |

---

## Batch 4: Legacy & Meta (C591-C600)

Cross-run 진행, epoch reset, 메타 프로그레션.

| ID | Name | Description | Modifies |
|----|------|-------------|----------|
| C591 | **Legacy Vault** | Run 종료 시 `legacyVault` object 에 저장: maxLevel, maxCombo, totalGold, totalPrestige. 다음 run 시작 시 읽기 가능. EncounterEngine constructor 에 `legacyData` injection. | Constructor — legacy data 주입 인터페이스. 기존 state init 에 legacy offset 반영. |
| C592 | **Epoch System** | 10회 run 완료 = 1 epoch. Epoch 전환 시 **모든 legacy bonus 리셋** + epoch-level permanent token 1개 획득. `epochCount` field. | 별도 `EpochManager` 또는 engine 외부 state. Engine 은 `epochBonus` 만 읽음. |
| C593 | **Epoch Token: Starting Path** | Epoch token 사용처 #1. 게임 시작 시 ascension path 를 즉시 선택 가능(prestige 10 불요). `epochStartPath` flag. | Ascension gate 조건 분기에 epoch token guard. |
| C594 | **Epoch Token: Modifier Slot+1** | Epoch token 사용처 #2. Modifier slot 3 → 4. `epochModifierSlot` flag. | `activeModifiers` set max size 에 epoch bonus 반영. |
| C595 | **Legacy Echo** | 이전 run 의 ascension path 선택이 다음 run 에 ghost buff 제공: 다른 path 선택 시 이전 path 의 이점 20% 잔류. `legacyPathEcho` field. | Path penalty/bonus 계산에 echo offset. |
| C596 | **Cross-Run Relic Memory** | 이전 run 에서 ★★ relic 을 보유한 채 종료하면, 다음 run 에서 해당 relic 의 **base 버전**(★) 을 시작 시 장착. `legacyRelic` field. | Relic system init — legacy relic pre-equip. |
| C597 | **Death Journal** | 매 사망 원인/위치를 `deathJournal[]` 에 기록. 같은 landmark 에서 3회 사망 시 해당 landmark 자동 회피(pathfinding 우회). | Pathfinding layer — `deathJournal` 참조 avoidance. Engine 은 journal write 만 담당. |
| C598 | **Legacy Combo Seed** | `legacyMaxCombo` 의 10% 를 다음 run 의 comboStreak 초기값으로 부여(C567 확장). Epoch reset 시 초기화. | `comboStreak` 초기값 — constructor 에서 legacy 계산. |
| C599 | **Meta Achievement** | Cross-run 누적 업적: epoch 3 달성, 모든 path 1회 이상 선택, modifier 10종 중 5종 사용 등. 각 업적 달성 시 `metaAchievement` bitmask 에 기록. 보상: cosmetic + run 시작 gold +100 per achievement. | Run 시작 시 gold 초기값에 achievement count × 100. |
| C600 | **Eternal Reset** | Epoch 5 달성 시 선택 가능. 모든 meta progress 리셋 → `eternalResetCount` +1. 유일한 보상: run 시작 시 표시되는 "Eternal ★" 마커 + 적 체력 영구 -5% per reset (cap -25%). 최종 meta-loop 완결. | `eternalResetCount` — enemy HP 계산에 -5% per count (cap). 모든 legacy/epoch/achievement 초기화. |

---

## 구현 가이드라인

1. **새 export const 최소화** — 각 mechanic 은 가급적 inline literal 또는 기존 상수 재사용.
2. **State field 추가 시** private field + getter 패턴 유지 (기존 패턴 준수).
3. **Event type 추가** — `OverworldEvents.ts` 에 새 union member 등록. Batch 1 은 최소 4개 신규 type 예상.
4. **Testing** — 각 mechanic 은 unit test 1개 이상. `__tests__/` 디렉토리 활용.
5. **Sim driver 반영** — state-changing mechanic 은 sim driver 에서 choice 를 deterministic (seed-based) 로 처리.

---

## 위험 요소

- **파일 크기**: 3,192줄 → C600 완료 시 ~3,800줄 예상. C570 완료 후 파일 분리 검토 (EventEncounterResolver, AscensionPathManager 등).
- **State explosion**: private field 이미 100+ 개. Batch 4 의 cross-run state 는 별도 `LegacyState` interface 로 분리 권장.
- **Sim parity**: Event encounter 의 "선택" 을 sim 에서 어떻게 처리할지 — personality 기반 deterministic choice 가 기본 방침.

---

## 요약

| Batch | 핵심 패턴 | 신규 mul 수 | 신규 state flag 수 |
|-------|-----------|-------------|-------------------|
| C561-C570 Event Encounters | Choice gate, boolean curse, mode flag | 0 | ~12 |
| C571-C580 Ascension Paths | Path enum, mode switch, pipeline transform | 0 | ~8 |
| C581-C590 Challenge Modifiers | Modifier set, guard pattern, override | 0 | ~10 (1 Set + flags) |
| C591-C600 Legacy & Meta | Cross-run injection, epoch counter, bitmask | 0 | ~10 (external state) |

**총 신규 multiplier 상수: 0개. 총 신규 state-changing 메커니즘: 40개.**
