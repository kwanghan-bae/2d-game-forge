# Content Expansion Layer 4 — Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Content Expansion 스펙](../specs/2026-04-25-content-expansion-spec.md) 의 **Layer 4 (스킬 시스템)** 구현. 클래스 16 × 액티브 2 + 패시브 1 = 32 액티브 + 16 패시브.

**Architecture:** `ActiveSkill` 인터페이스 → 32 스킬 정의 → `Character.activeSkills` 추가 → `BattleScene` 의 쿨다운 기반 자동 발동 + vfx → ClassSelect 미리보기 + Inventory 스킬 탭.

**Tech Stack:** TypeScript 5.6, React 19, Phaser 3.90, Zustand 5, Vitest 4.

**Prerequisite:** Layer 1-3 완료. Layer 4 는 가장 큰 코드 변경 — 32 스킬 데이터 + BattleScene 발동 로직.

---

## File Structure

### 신규
```
games/inflation-rpg/src/
├── data/skills.ts              # 32 액티브 스킬 정의
├── data/skills.test.ts         # 단위 테스트
└── battle/SkillSystem.ts       # 쿨다운/발동/효과 로직 (BattleScene 에서 사용)
```

### 수정
```
games/inflation-rpg/src/
├── types.ts                    # ActiveSkill 인터페이스 + Character.activeSkills
├── data/characters.ts          # 16 캐릭터에 activeSkills 2 추가
├── battle/BattleScene.ts       # SkillSystem 통합
├── screens/ClassSelect.tsx     # 스킬 미리보기
└── screens/Inventory.tsx       # 스킬 탭
```

---

## Task L4-1: ActiveSkill 인터페이스 + Character 확장

**Files:**
- Modify: `games/inflation-rpg/src/types.ts`

- [ ] **Step 1: ActiveSkill 추가**

```typescript
export type ActiveSkillType = 'multi_hit' | 'aoe' | 'heal' | 'buff' | 'execute';

export interface ActiveSkill {
  id: string;
  nameKR: string;
  description: string;
  cooldownSec: number;
  effect: {
    type: ActiveSkillType;
    multiplier?: number;
    targets?: number;
    healPercent?: number;
    buffStat?: StatKey;
    buffPercent?: number;
    buffDurationSec?: number;
    executeThreshold?: number;
  };
  vfxEmoji: string;
}
```

- [ ] **Step 2: Character 에 activeSkills 추가**

```typescript
export interface Character {
  id: string;
  nameKR: string;
  emoji: string;
  statFocus: string;
  statMultipliers: Record<StatKey, number>;
  passiveSkill: PassiveSkill;
  unlockSoulGrade: number;
  activeSkills: [ActiveSkill, ActiveSkill];  // 신규: 정확히 2개
}
```

- [ ] **Step 3: typecheck (FAIL 예상 — characters.ts 누락 필드)**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: characters.ts 의 16 캐릭터가 activeSkills 누락으로 실패. 다음 task 에서 fix.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/types.ts
git commit -m "feat(game-inflation-rpg): add ActiveSkill interface and Character.activeSkills"
```

---

## Task L4-2: skills.ts — 32 액티브 스킬 정의

**Files:**
- Create: `games/inflation-rpg/src/data/skills.ts`

- [ ] **Step 1: 32 스킬 작성 (16 캐릭터 × 2)**

각 캐릭터의 컨셉에 맞춰 액티브 2개. 캐릭터 ID 는 characters.ts 참조.

먼저 characters.ts 의 16 캐릭터 ID 확인:
```bash
grep -oE "id: '[a-z0-9-]+'" games/inflation-rpg/src/data/characters.ts | head -16
```

각 캐릭터 ID 에 대해 스킬 2개. 예시 (실제 캐릭터 ID 따라 적용):

```typescript
import type { ActiveSkill } from '../types';

// 캐릭터 ID 별 액티브 스킬 (32개)
export const SKILLS: Record<string, [ActiveSkill, ActiveSkill]> = {
  warrior: [
    { id: 'warrior-strike', nameKR: '강타', description: '단일 대상 강력한 일격',
      cooldownSec: 5, effect: { type: 'multi_hit', multiplier: 3, targets: 1 }, vfxEmoji: '💥' },
    { id: 'warrior-shield', nameKR: '방패막기', description: '방어력 일시 증가',
      cooldownSec: 8, effect: { type: 'buff', buffStat: 'def', buffPercent: 30, buffDurationSec: 5 }, vfxEmoji: '🛡️' },
  ],
  thief: [
    { id: 'thief-poison', nameKR: '독칼', description: '연속 3회 공격',
      cooldownSec: 6, effect: { type: 'multi_hit', multiplier: 1.5, targets: 3 }, vfxEmoji: '🗡️' },
    { id: 'thief-stealth', nameKR: '은신', description: '회피율 100% 3초',
      cooldownSec: 10, effect: { type: 'buff', buffStat: 'agi', buffPercent: 100, buffDurationSec: 3 }, vfxEmoji: '👤' },
  ],
  archer: [
    { id: 'archer-multi', nameKR: '연발사격', description: '5연발 화살',
      cooldownSec: 7, effect: { type: 'multi_hit', multiplier: 1, targets: 5 }, vfxEmoji: '🏹' },
    { id: 'archer-snipe', nameKR: '저격', description: 'HP 30% 이하 즉사',
      cooldownSec: 12, effect: { type: 'execute', executeThreshold: 0.3 }, vfxEmoji: '🎯' },
  ],
  mage: [
    { id: 'mage-fireball', nameKR: '화염구', description: '범위 폭발',
      cooldownSec: 6, effect: { type: 'aoe', multiplier: 2.5, targets: 3 }, vfxEmoji: '🔥' },
    { id: 'mage-shield', nameKR: '마력방벽', description: 'HP 30% 회복',
      cooldownSec: 15, effect: { type: 'heal', healPercent: 30 }, vfxEmoji: '💧' },
  ],
  // … 나머지 12 캐릭터의 스킬도 동일 패턴
  // (실제 작성 시 16 캐릭터 모두 채움)
};

export function getSkillsForCharacter(charId: string): [ActiveSkill, ActiveSkill] | null {
  return SKILLS[charId] ?? null;
}

export function getAllSkills(): ActiveSkill[] {
  return Object.values(SKILLS).flat();
}
```

**중요**: 16 캐릭터 ID 모두 커버. characters.ts 의 캐릭터 컨셉에 맞춰 nameKR + effect 결정. 캐릭터별 컨셉 정보가 필요하면 characters.ts 의 statFocus / passiveSkill 참고.

- [ ] **Step 2: 단위 테스트 — skills.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { CHARACTERS } from './characters';
import { SKILLS, getSkillsForCharacter } from './skills';

describe('skills', () => {
  it('every character has 2 active skills', () => {
    for (const char of CHARACTERS) {
      const skills = getSkillsForCharacter(char.id);
      expect(skills, `${char.id} skills`).not.toBeNull();
      expect(skills).toHaveLength(2);
    }
  });

  it('all skill IDs are unique', () => {
    const allSkills = Object.values(SKILLS).flat();
    const ids = allSkills.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every skill has cooldown > 0', () => {
    const allSkills = Object.values(SKILLS).flat();
    for (const s of allSkills) {
      expect(s.cooldownSec, `${s.id}`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test data/skills
```

Expected: 모두 통과.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/data/skills.ts \
        games/inflation-rpg/src/data/skills.test.ts
git commit -m "feat(game-inflation-rpg): add 32 active skills (16 characters × 2)"
```

---

## Task L4-3: characters.ts — 각 캐릭터에 activeSkills 추가

**Files:**
- Modify: `games/inflation-rpg/src/data/characters.ts`

- [ ] **Step 1: 각 character entry 에 activeSkills 추가**

기존 character 정의에 `activeSkills` 필드 추가. SKILLS 맵에서 lookup 또는 직접 inline:

```typescript
import { SKILLS } from './skills';
// ...

{
  id: 'warrior',
  // ... 기존 필드
  activeSkills: SKILLS.warrior,
},
```

이를 16 캐릭터 모두에 적용.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
```

Expected: 0 exit (모든 16 캐릭터가 activeSkills 보유).

- [ ] **Step 3: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test
```

Expected: 132+ passed.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/data/characters.ts
git commit -m "feat(game-inflation-rpg): wire activeSkills into 16 characters"
```

---

## Task L4-4: SkillSystem.ts — 쿨다운/발동/효과 로직

**Files:**
- Create: `games/inflation-rpg/src/battle/SkillSystem.ts`
- Create: `games/inflation-rpg/src/battle/SkillSystem.test.ts`

- [ ] **Step 1: SkillSystem 작성**

```typescript
import type { ActiveSkill } from '../types';

export interface SkillState {
  cooldownsMs: Map<string, number>; // skillId -> next-fire-time-ms
}

export function createSkillState(): SkillState {
  return { cooldownsMs: new Map() };
}

export function isSkillReady(state: SkillState, skill: ActiveSkill, nowMs: number): boolean {
  const next = state.cooldownsMs.get(skill.id) ?? 0;
  return nowMs >= next;
}

export function fireSkill(
  state: SkillState,
  skill: ActiveSkill,
  nowMs: number,
): void {
  state.cooldownsMs.set(skill.id, nowMs + skill.cooldownSec * 1000);
}

export interface SkillEffectResult {
  damage?: number;
  heal?: number;
  buff?: { stat: string; percent: number; durationMs: number };
  execute?: boolean;
  vfxEmoji: string;
}

/**
 * Compute the effect of firing a skill given current player state.
 * Returns the resulting damage/heal/buff for BattleScene to apply.
 */
export function computeSkillEffect(
  skill: ActiveSkill,
  playerAtk: number,
  playerHpMax: number,
  enemyHp: number,
  enemyHpMax: number,
): SkillEffectResult {
  const eff = skill.effect;
  const result: SkillEffectResult = { vfxEmoji: skill.vfxEmoji };

  if (eff.type === 'multi_hit' || eff.type === 'aoe') {
    const mult = eff.multiplier ?? 1;
    const targets = eff.targets ?? 1;
    result.damage = Math.floor(playerAtk * mult * targets);
  } else if (eff.type === 'heal') {
    result.heal = Math.floor(playerHpMax * (eff.healPercent ?? 0) / 100);
  } else if (eff.type === 'buff') {
    result.buff = {
      stat: eff.buffStat ?? 'atk',
      percent: eff.buffPercent ?? 0,
      durationMs: (eff.buffDurationSec ?? 0) * 1000,
    };
  } else if (eff.type === 'execute') {
    const threshold = eff.executeThreshold ?? 0;
    if (enemyHp / enemyHpMax <= threshold) {
      result.execute = true;
      result.damage = enemyHp; // 즉사
    } else {
      result.damage = Math.floor(playerAtk * 1.5);
    }
  }

  return result;
}
```

- [ ] **Step 2: 단위 테스트**

```typescript
import { describe, it, expect } from 'vitest';
import {
  createSkillState, isSkillReady, fireSkill, computeSkillEffect
} from './SkillSystem';
import type { ActiveSkill } from '../types';

const strike: ActiveSkill = {
  id: 'test-strike', nameKR: '강타', description: 'test',
  cooldownSec: 5, effect: { type: 'multi_hit', multiplier: 3, targets: 1 }, vfxEmoji: '💥',
};

describe('SkillSystem', () => {
  it('isSkillReady returns true initially', () => {
    const state = createSkillState();
    expect(isSkillReady(state, strike, 0)).toBe(true);
  });

  it('fireSkill sets cooldown', () => {
    const state = createSkillState();
    fireSkill(state, strike, 1000);
    expect(isSkillReady(state, strike, 2000)).toBe(false);
    expect(isSkillReady(state, strike, 6500)).toBe(true);
  });

  it('multi_hit damage = atk * mult * targets', () => {
    const result = computeSkillEffect(strike, 100, 1000, 500, 1000);
    expect(result.damage).toBe(300);
  });

  it('heal returns percent of max HP', () => {
    const heal: ActiveSkill = {
      id: 'h', nameKR: '회복', description: '',
      cooldownSec: 10, effect: { type: 'heal', healPercent: 30 }, vfxEmoji: '💧',
    };
    const result = computeSkillEffect(heal, 100, 1000, 500, 1000);
    expect(result.heal).toBe(300);
  });

  it('execute insta-kills below threshold', () => {
    const exec: ActiveSkill = {
      id: 'e', nameKR: '저격', description: '',
      cooldownSec: 10, effect: { type: 'execute', executeThreshold: 0.3 }, vfxEmoji: '🎯',
    };
    const r1 = computeSkillEffect(exec, 100, 1000, 200, 1000); // 20% HP
    expect(r1.execute).toBe(true);
    expect(r1.damage).toBe(200);
    const r2 = computeSkillEffect(exec, 100, 1000, 800, 1000); // 80% HP
    expect(r2.execute).toBeUndefined();
  });
});
```

- [ ] **Step 3: 테스트**

```bash
pnpm --filter @forge/game-inflation-rpg test battle/SkillSystem
```

Expected: 모두 통과.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/SkillSystem.ts \
        games/inflation-rpg/src/battle/SkillSystem.test.ts
git commit -m "feat(game-inflation-rpg): add SkillSystem (cooldown + effect computation)"
```

---

## Task L4-5: BattleScene 의 SkillSystem 통합

**Files:**
- Modify: `games/inflation-rpg/src/battle/BattleScene.ts`

- [ ] **Step 1: SkillSystem state init**

BattleScene.create() 또는 init() 에:
```typescript
import { createSkillState, isSkillReady, fireSkill, computeSkillEffect } from './SkillSystem';
// ...

private skillState = createSkillState();
private activeSkills: ActiveSkill[] = [];

// create() 시:
const character = CHARACTERS.find(c => c.id === run.characterId);
this.activeSkills = character?.activeSkills ?? [];
```

- [ ] **Step 2: update() 에서 쿨다운 체크 + 발동**

```typescript
update(time: number, delta: number) {
  // 기존 update 로직 …

  // 스킬 발동
  for (const skill of this.activeSkills) {
    if (isSkillReady(this.skillState, skill, time)) {
      const result = computeSkillEffect(
        skill,
        this.playerAtk,
        this.playerHpMax,
        this.enemyHp,
        this.enemyHpMax,
      );
      this.applySkillResult(result);
      fireSkill(this.skillState, skill, time);
    }
  }
}

private applySkillResult(result: SkillEffectResult) {
  if (result.damage) this.enemyHp = Math.max(0, this.enemyHp - result.damage);
  if (result.heal) this.playerHp = Math.min(this.playerHpMax, this.playerHp + result.heal);
  if (result.buff) {
    // 버프 일시 적용 (간단히 deltaTime 기반 timer)
  }
  // VFX: emoji 텍스트 화면에 잠시 표시
  this.showVfxEmoji(result.vfxEmoji);
}

private showVfxEmoji(emoji: string) {
  const text = this.add.text(180, 250, emoji, { fontSize: '40px' });
  this.tweens.add({
    targets: text,
    y: 200,
    alpha: 0,
    duration: 800,
    onComplete: () => text.destroy(),
  });
}
```

- [ ] **Step 3: typecheck + test**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck && pnpm --filter @forge/game-inflation-rpg test
```

Expected: 0 exit, 132+ passed.

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/battle/BattleScene.ts
git commit -m "feat(game-inflation-rpg): wire SkillSystem into BattleScene auto-fire"
```

---

## Task L4-6: ClassSelect 스킬 미리보기

**Files:**
- Modify: `games/inflation-rpg/src/screens/ClassSelect.tsx`

- [ ] **Step 1: 캐릭터 선택 시 액티브 스킬 표시**

기존 캐릭터 카드 내부에 activeSkills 표시:
```tsx
<div style={{ marginTop: 6, fontSize: 11 }}>
  {char.activeSkills.map(s => (
    <div key={s.id}>
      <span style={{ color: 'var(--forge-accent)' }}>{s.vfxEmoji} {s.nameKR}</span>
      <span style={{ color: 'var(--forge-text-secondary)', marginLeft: 4 }}>
        ({s.cooldownSec}s)
      </span>
    </div>
  ))}
</div>
```

- [ ] **Step 2: typecheck + test**

Expected: 0 exit, 132+ passed.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/ClassSelect.tsx
git commit -m "feat(game-inflation-rpg): show active skills in ClassSelect preview"
```

---

## Task L4-7: Inventory 스킬 탭

**Files:**
- Modify: `games/inflation-rpg/src/screens/Inventory.tsx`

- [ ] **Step 1: 스킬 탭 추가 — 현재 캐릭터의 액티브 + 패시브**

기존 인벤 탭 옆에 "스킬" 탭. 현재 캐릭터의 정보 표시:
```tsx
const char = CHARACTERS.find(c => c.id === run.characterId);
// 패시브 + 액티브 2 표시
```

- [ ] **Step 2: typecheck + test**

Expected: 0 exit, 132+ passed.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/src/screens/Inventory.tsx
git commit -m "feat(game-inflation-rpg): add skills tab to Inventory"
```

---

## Task L4-8: 통합 검증 + Phase tag

- [ ] **Step 1: 전체 검증**

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm circular
pnpm --filter @forge/game-inflation-rpg build:web
```

Expected: 모두 0 exit, 145+ passed (스킬 테스트 추가).

- [ ] **Step 2: 정량 검증**

```bash
echo "Skills: $(grep -c "id:" games/inflation-rpg/src/data/skills.ts)"
# Expected: 32+
```

- [ ] **Step 3: Phase tag**

```bash
git tag phase-content-skills-complete
```

---

## 요약

Layer 4 완료 시:
- 32 액티브 스킬 (16 캐릭터 × 2)
- BattleScene 자동 쿨다운 발동 + vfxEmoji
- ClassSelect 미리보기, Inventory 스킬 탭
- 패시브는 기존 유지 (Layer 4 변경 없음)

다음: Layer 5 (스토리) — `2026-04-29-content-layer5-story-plan.md`.

**End of Layer 4 plan. Total tasks: 8.**
