# Cycle 2 PRD — "Inflation 곡선 복원"

## 카테고리: Balance

## 목표

경험치 획득 공식을 수정하여 "고레벨에서 폭발적으로 빨라지는 성장"을
복원한다. 이것은 inflation RPG 장르의 핵심 정체성이다.

## 반대 기준 (NOT this)

- ❌ 패시브 스킬 개별화 (별도 cycle)
- ❌ 보스 hpMult 재조정
- ❌ 새 콘텐츠/시스템 추가
- ❌ 비주얼 변경

## 현재 문제

```
expGain = floor(level × 10)           → O(level^1.0)
expRequired = floor(100 × level^1.8)  → O(level^1.8)
비율 = 0.1 / level^0.8               → 레벨↑ = 성장↓ (역inflation!)
```

레벨 10: ~6킬/레벨업, 레벨 1000: ~160킬/레벨업, 레벨 100000: ~6300킬/레벨업.
이것은 inflation이 아니라 deflation이다.

## 수정안

```
expGain = floor(10 × level^2.0)
```

검증:
- 비율 = `(10 × level^2.0) / (100 × level^1.8)` = `0.1 × level^0.2`
- 레벨 10: 0.1 × 10^0.2 ≈ 0.16 → ~6킬/레벨업 (초반 동일)
- 레벨 100: 0.1 × 100^0.2 ≈ 0.25 → ~4킬
- 레벨 1000: 0.1 × 1000^0.2 ≈ 0.40 → ~2.5킬
- 레벨 10000: 0.1 × 10000^0.2 ≈ 0.63 → ~1.6킬
- 레벨 100000: 0.1 × 100000^0.2 ≈ 1.0 → 거의 매킬 레벨업

## 구현

### F1. experience gain formula 변경

파일: `src/battle/BattleScene.ts` line 305
```typescript
// Before:
const expGain = Math.floor(run.level * 10);
// After:
const expGain = Math.floor(10 * Math.pow(run.level, 2.0));
```

### F2. Sim 검증

기존 sim smoke test가 `reaches inflation territory` assertion을 가지고 있다.
해당 테스트가 여전히 통과하는지 확인. (더 빠르게 inflation territory에 도달해야 함)

## 영향 범위

- `src/battle/BattleScene.ts` — expGain 공식 1줄
- 기존 sim/e2e 테스트 회귀 검증 필요

## 리스크

1. 초반(레벨 1-10) 경험이 너무 빨라질 수 있음 → 동일 (10×1^2=10, 기존도 1×10=10)
2. 극고레벨에서 오버플로우 → level 100000일 때 10×100000^2 = 1×10^11 → JS number safe range 내
3. 하드모드 10x 곱하기와의 시너지 → 너무 빨라질 수 있으나, 이것이 inflation의 쾌감

## 성공 기준

- [ ] expGain 공식 변경
- [ ] 기존 1609 vitest 통과
- [ ] sim smoke test 통과 (inflation territory 도달)
- [ ] typecheck + lint clean
