# Cycle 103 — QA 테스트 품질 평가 및 회귀 위험 분석

## 1. 테스트 품질 평가

### 1.1 카테고리별 테스트 분류

| 카테고리 | 테스트 수 (추정) | 품질 등급 | 비고 |
|---|---|---|---|
| **VFX "phantom" 테스트** | ~60 (battle/*.test.ts 중 14개 파일) | ❌ F (무효) | 소스 파일 없음, 하드코딩 상수만 검증 |
| **data catalog 테스트** | ~400+ | ⚠️ C (존재 확인) | 실제 데이터 import 하나, 구조/길이만 확인 |
| **AutoBattleController** | ~30 | ✅ A (행위 검증) | 이벤트 시퀀스, 결정론, 경계값 확인 |
| **resolver / hpScaling** | ~20 | ✅ A (행위 검증) | 순수 함수, fixture 기반, 스냅샷 회귀 |
| **sim-cycle-v2 통합** | ~12 | ✅ A (행위+상태 carry) | 체인드 sim, 결정론, 파일 I/O 검증 |
| **store migration** | ~40 | ✅ B (구조적) | 마이그레이션 체인 검증, 실제 state shape |
| **overworld/cycle** | ~80 | ✅ B | CycleControllerV2 행위 + milestone 검증 |
| **systems (balance)** | ~100 | ⚠️ B- | 일부는 실 함수 테스트, 일부는 로컬 재구현 |
| **E2E (Playwright)** | 7 spec (60 tests) | ✅ B | golden path + 마이그레이션 + spend modal |

### 1.2 핵심 문제: "Phantom 테스트" 패턴

**확정 grep query:**
```bash
grep -rL "import.*from '\.\." games/inflation-rpg/src/battle/*.test.ts
```
**결과: 15/18 파일이 소스 모듈을 import하지 않는다.**

이 파일들은 다음 패턴을 따른다:
```typescript
// confetti.test.ts — 소스 파일 confetti.ts 존재하지 않음
it('final boss has more confetti (30 vs 12)', () => {
  const finalCount = 30;      // ← 하드코딩
  const normalCount = 12;     // ← 하드코딩
  expect(finalCount).toBeGreaterThan(normalCount); // ← 항상 pass
});
```

**진단:** 이 테스트들은 BattleScene.ts(1140줄)에 inline된 VFX 로직의 "의도 문서화"일 뿐, 실제 구현과 연결되지 않는다. BattleScene이 confetti 개수를 50으로 변경해도 테스트는 통과한다. **테스트 카운트를 부풀리지만 회귀 방어력은 0이다.**

### 1.3 진짜 행위 테스트 비율 추정

- 총 1817 vitest 중 **유효 행위 테스트: ~1200** (66%)
- **무효/phantom/존재확인: ~600** (34%)
- 진정한 회귀 방어 능력이 있는 테스트: **~800** (44%)

---

## 2. TOP 3 회귀 위험

### RISK-1: inflationCurve.ts ↔ AutoBattleController.ts 이중 경로 (CRITICAL)

**확정 grep query:**
```bash
grep -n "expRequiredForLevel" games/inflation-rpg/src/cycle/AutoBattleController.ts
```
**결과:**
- L237: `while (this.state.heroExp >= this.expRequiredForLevel(this.state.heroLv))`
- L302: `private expRequiredForLevel(lv) { return Math.floor(10 * Math.pow(lv, 1.3)); }` ← **자체 구현 (placeholder)**

**대조:**
```bash
grep -n "k_req" games/inflation-rpg/src/cycle/inflationCurve.ts
```
- `k_req: 1.2` + `expRequiredForLevel(baseReq, level) = baseReq * lv^1.2`

**위험:** AutoBattleController는 `10 * lv^1.3`을 사용하고, HeroEntity/EncounterEngine은 `inflationCurve.ts`의 `baseReq * lv^1.2`를 사용한다. **두 시스템이 다른 경험치 곡선으로 동작 중**이다. inflationCurve를 연결하면:
- 기존 AutoBattleController 테스트 30개 중 레벨 도달 검증 케이스(`lv ≥ 5 within 100 rounds`)가 깨질 가능성 높다
- sim-cycle-v2 smoke test의 `maxLevel` 기대값이 변경됨
- balance-milestones.test.ts의 sweep 결과가 시프트됨

### RISK-2: BattleScene.ts 1140줄 무방어 상태

**확정 grep query:**
```bash
grep -rn "BattleScene" games/inflation-rpg/src --include="*.test.*"
```
**결과: 스냅샷 참조 1건 (resolver 설명 문자열)만 존재. BattleScene 자체에 대한 단위 테스트 0건.**

BattleScene.ts는 VFX, 전투 로직, UI 업데이트, 사운드가 결합된 1140줄 God Class이다. 추출된 `resolver.ts`와 `SkillSystem.ts`만 테스트된다. 나머지 ~800줄(confetti, breathing, tint, particle, spawn animation)은 phantom 테스트가 "커버"하는 척하지만 실제로는 무방어다.

### RISK-3: sim 측정 ↔ 실 게임 괴리 (Sim-Real Parity)

**확정 grep query:**
```bash
grep -n "heroAtkBase\|enemyLevel\|Math.max(10, enemyLevel" games/inflation-rpg/src/cycle/AutoBattleController.ts
```
**결과 (L172, L188, L201):**
- 적 HP: `Math.max(10, enemyLevel * 20)` — AutoBattleController 자체 linear
- 영웅 ATK: `heroAtkBase + heroLv * 2` — AutoBattleController 자체 linear
- 적 ATK: `heroLv * 3` — AutoBattleController 자체 linear

**대조 (inflationCurve.ts):**
- 적 HP: `baseHp * lv^1.0` (exponential form but k=1, linear)
- 영웅 ATK: `atkBase * lv^1.0` (exponential)
- 적 ATK: `baseAtk * lv^0.8` (sub-linear!)

sim의 밸런스 측정과 실 게임의 EncounterEngine/HeroEntity가 사용하는 공식이 다르다. **sim에서 밸런스 OK 판정을 받아도 실 게임에서는 다른 곡선을 탄다.**

---

## 3. 데드 코드 / 고아 Export 분석

### inflationCurve.ts exports 중 AutoBattleController 미사용

| Export | HeroEntity 사용 | EncounterEngine 사용 | AutoBattleController 사용 |
|---|---|---|---|
| `heroAtkAtLevel` | ✅ | ❌ | ❌ (자체 `heroAtkBase + lv*2`) |
| `heroHpMaxAtLevel` | ✅ | ❌ | ❌ (고정 hpMax) |
| `enemyHpAtLevel` | ❌ | ✅ | ❌ (자체 `lv*20`) |
| `enemyAtkAtLevel` | ❌ | ✅ | ❌ (자체 `lv*3`) |
| `expGainForKill` | ❌ | ✅ | ❌ (자체 `lv*10*expMul`) |
| `expRequiredForLevel` | ✅ | ❌ | ❌ (자체 `10*lv^1.3`) |

**결론:** inflationCurve.ts는 Overworld path에서만 사용되고, AutoBattleController(headless sim path)는 **모든 공식을 자체 하드코딩으로 재구현**한다.

### Phantom VFX 테스트 파일 (소스 없음)

```
src/battle/confetti.test.ts          — confetti.ts 없음
src/battle/levelUpVfx.test.ts        — levelUpVfx.ts 없음
src/battle/critDamageVfx.test.ts     — critDamageVfx.ts 없음
src/battle/heroBreathing.test.ts     — heroBreathing.ts 없음
src/battle/ambientParticle.test.ts   — ambientParticle.ts 없음
src/battle/enemyBob.test.ts          — enemyBob.ts 없음
src/battle/spawnAnimation.test.ts    — spawnAnimation.ts 없음
src/battle/bossTint.test.ts          — bossTint.ts 없음
src/battle/victoryFanfare.test.ts    — victoryFanfare.ts 없음
src/battle/floorChime.test.ts        — floorChime.ts 없음
src/battle/floatingReward.test.ts    — floatingReward.ts 없음
src/battle/deathParticle.test.ts     — deathParticle.ts 없음
src/battle/bossEntrance.test.ts      — bossEntrance.ts 없음
src/battle/battleTimer.test.ts       — battleTimer.ts 없음
```

이 14개 파일은 **BattleScene.ts에 인라인된 VFX 파라미터의 "설계 노트"**다. 소스 추출이 이루어지지 않은 상태에서 테스트만 존재한다.

---

## 4. 다음 구현 전 권장 테스트 추가

### P0: inflationCurve 연결 전 계약 테스트

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F1.1 | inflationCurve.expRequiredForLevel 단독 검증 (lv 1-100 스냅샷) | unit | 기존 곡선 pinned | `src/cycle/__tests__/inflationCurve.test.ts` |
| F1.2 | AutoBattleController 연결 후 lv progression 변경 검증 | unit | lv 도달 속도 ±20% 이내 유지 OR 명시적 갱신 | same |
| F1.3 | sim-cycle-v2 chained maxLevel 스냅샷 | integration | maxLevel p50 pinned ± tolerance | `scripts/__tests__/sim-curve-parity.test.ts` |

### P1: BattleScene VFX 추출 + 실 연결

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F2.1 | confetti config export 후 import 검증 | unit | `getConfettiConfig('boss').count === 30` | `src/battle/confetti.test.ts` (리팩터) |
| F2.2 | BattleScene → resolver 위임 회귀 | unit | resolver output과 BattleScene 내 계산 일치 | `src/battle/BattleScene.test.ts` |

### P2: Sim-Real Parity 강제

| ID | 케이스 | type | 기대 결과 | 파일 |
|---|---|---|---|---|
| F3.1 | AutoBattleController.spawnEnemy가 inflationCurve.enemyHpAtLevel 사용 확인 | unit | 동일 레벨에서 동일 HP 산출 | `src/cycle/__tests__/AutoBattleController.test.ts` |
| F3.2 | heroAttack가 inflationCurve.heroAtkAtLevel 사용 확인 | unit | 동일 atkBase/lv에서 동일 데미지 | same |
| F3.3 | 50-cycle headless sim vs EncounterEngine 경험치 커브 ±5% | integration | parity assertion | `scripts/__tests__/sim-real-parity.test.ts` |

---

## 5. 검증 명령

```bash
# 전체 vitest
pnpm --filter @forge/game-inflation-rpg test

# AutoBattleController 단독
pnpm --filter @forge/game-inflation-rpg test -- --grep "AutoBattleController"

# balance-milestones (느림, 120s timeout)
pnpm --filter @forge/game-inflation-rpg test -- --grep "balance milestones"

# sim smoke
pnpm --filter @forge/game-inflation-rpg test -- --grep "sim-cycle-v2"

# E2E
pnpm --filter @forge/game-inflation-rpg e2e

# typecheck + lint
pnpm typecheck && pnpm lint
```

---

## 6. 통과 기준

- vitest pass rate: 100% (phantom 테스트 포함 — 현재 기준선 유지)
- E2E: 7 spec 전체 pass
- inflationCurve 연결 시: AutoBattleController 기존 테스트의 **명시적 갱신** 필수 (silent break 금지)
- Sim-Real parity: 새 F3.3 테스트 추가 후 maxLevel 편차 ≤ 5%

---

## 7. 요약 판정

| 항목 | 현재 상태 | 리스크 |
|---|---|---|
| 테스트 수 | 1817 ✅ | 부풀려짐 (34% phantom) |
| 진짜 행위 테스트 | ~800 ⚠️ | 핵심 경로 일부만 방어 |
| BattleScene 방어 | 0 ❌ | God Class 1140줄 무방어 |
| Sim-Real 곡선 동기화 | ❌ | 두 시스템 다른 수식 사용 |
| inflationCurve 연결 준비도 | ❌ | 연결 시 ~5-10 테스트 fail 예상 |
