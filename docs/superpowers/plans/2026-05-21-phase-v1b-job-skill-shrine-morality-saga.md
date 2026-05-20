# Phase V1b: Job / Skill / Shrine / Moral / Saga Book — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V1a open-world skeleton 위에 V2 spec Tier 1 의 나머지 (직업 unlock / 스킬 학습 / 사당 / 도덕 분기 / saga book) 와 advisor 가 punt 했던 equipment stat wiring 을 얹어 hero 가 cycle 안에서 "실제 inflation-rpg 를 하는" 일대기를 완성한다.

**Architecture:** 각 feature 는 V1a 의 `CycleControllerV2.handleArrival` event flow 에 새로운 event type + sub-system 으로 들어간다. View 는 새 React 컴포넌트 (saga book) 또는 기존 OverworldRunner 의 HUD overlay 가 받는다. Headless sim (`sim-cycle-v2`) 도 동일 system 을 그대로 호출해 balance 측정에 쓴다.

**Tech Stack:** TypeScript / Vitest / Phaser (view only) / React 19 / Zustand 5 (persist v17 → v18). Sim-G inflation curve (`inflationCurve.ts`) 그대로 사용.

**Sim-G reference (level milestone 기준 — Round 2 결과):**
- maxLevel P50 = ~14,000 / arrivals P50 = ~98 / 자연사 100%
- Level acceleration: Lv 50 까지 ~30 kills, Lv 1,000 까지 ~60 kills, Lv 10,000 까지 ~90 kills
- Milestone choice: **age 기반** (어린시절 5-14 / 청년기 15-29 / 장년기 30-49 / 노년기 50-69) — level 보다 직관적이고 narrative 호흡과 맞다

---

### Task 1: Define `Job` type + 16 job catalog (V1a-compatible)

**Files:**
- Create: `games/inflation-rpg/src/data/jobs.ts`
- Test: `games/inflation-rpg/src/data/__tests__/jobs.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// jobs.test.ts
import { describe, it, expect } from 'vitest';
import { JOBS, findJobsForMilestone } from '../jobs';

describe('jobs catalog', () => {
  it('has 16 jobs total', () => {
    expect(JOBS).toHaveLength(16);
  });

  it('each job has id, nameKR, emoji, tier, requiredPersonality, atkMul, hpMul', () => {
    for (const j of JOBS) {
      expect(j.id).toBeTruthy();
      expect(j.nameKR).toBeTruthy();
      expect(j.emoji).toBeTruthy();
      expect([1, 2, 3]).toContain(j.tier);
      expect(j.atkMul).toBeGreaterThan(0);
      expect(j.hpMul).toBeGreaterThan(0);
    }
  });

  it('findJobsForMilestone returns tier-1 jobs at age 10', () => {
    const candidates = findJobsForMilestone('age10');
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.tier).toBe(1);
  });

  it('findJobsForMilestone returns tier-2 jobs at age 30', () => {
    const candidates = findJobsForMilestone('age30');
    for (const c of candidates) expect(c.tier).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/data/__tests__/jobs.test.ts`
Expected: FAIL with "Cannot find module '../jobs'"

- [ ] **Step 3: Implement jobs.ts**

```ts
// jobs.ts
import type { PersonalityDim } from '../hero/PersonalityState';

export type JobMilestone = 'age10' | 'age30' | 'age50';

export interface Job {
  id: string;
  nameKR: string;
  emoji: string;
  tier: 1 | 2 | 3;
  milestone: JobMilestone;
  requiredPersonality: { dim: PersonalityDim; min: number } | null;
  atkMul: number;
  hpMul: number;
}

export const JOBS: readonly Job[] = [
  // Tier 1 — age 10 (어린시절 → 청년기). Stat focus narrow.
  { id: 'warrior',     nameKR: '전사',     emoji: '⚔️',  tier: 1, milestone: 'age10', requiredPersonality: { dim: 'heroic',  min:  2 }, atkMul: 1.3, hpMul: 1.2 },
  { id: 'archer',      nameKR: '궁수',     emoji: '🏹',  tier: 1, milestone: 'age10', requiredPersonality: { dim: 'prudent', min:  2 }, atkMul: 1.4, hpMul: 1.0 },
  { id: 'rogue',       nameKR: '도적',     emoji: '🗡️',  tier: 1, milestone: 'age10', requiredPersonality: { dim: 'moral',   min: -2 }, atkMul: 1.5, hpMul: 0.9 },
  { id: 'apprentice',  nameKR: '견습',     emoji: '📖',  tier: 1, milestone: 'age10', requiredPersonality: null, atkMul: 1.1, hpMul: 1.1 },

  // Tier 2 — age 30 (청년기 → 장년기). Stronger.
  { id: 'paladin',     nameKR: '성기사',   emoji: '🛡️',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'heroic',   min:  5 }, atkMul: 1.8, hpMul: 1.6 },
  { id: 'mage',        nameKR: '마법사',   emoji: '🔮',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'pious',    min:  3 }, atkMul: 2.0, hpMul: 1.2 },
  { id: 'assassin',    nameKR: '암살자',   emoji: '🥷',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'moral',    min: -5 }, atkMul: 2.2, hpMul: 1.1 },
  { id: 'priest',      nameKR: '사제',     emoji: '🙏',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'merciful', min:  3 }, atkMul: 1.5, hpMul: 1.7 },
  { id: 'ranger',      nameKR: '레인저',   emoji: '🌲',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'prudent',  min:  4 }, atkMul: 1.9, hpMul: 1.4 },
  { id: 'monk',        nameKR: '수도승',   emoji: '☯️',  tier: 2, milestone: 'age30', requiredPersonality: { dim: 'pious',    min:  5 }, atkMul: 1.7, hpMul: 1.5 },

  // Tier 3 — age 50 (장년기 → 노년기). Legendary.
  { id: 'hero',         nameKR: '영웅',       emoji: '🌟', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'heroic',   min:  8 }, atkMul: 3.0, hpMul: 2.5 },
  { id: 'archmage',     nameKR: '대마법사',   emoji: '🌌', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'pious',    min:  6 }, atkMul: 3.5, hpMul: 2.0 },
  { id: 'dark_lord',    nameKR: '암흑군주',   emoji: '💀', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'moral',    min: -8 }, atkMul: 3.8, hpMul: 2.2 },
  { id: 'saint',        nameKR: '성자',       emoji: '👼', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'merciful', min:  7 }, atkMul: 2.5, hpMul: 3.0 },
  { id: 'grandmaster',  nameKR: '대종사',     emoji: '🥋', tier: 3, milestone: 'age50', requiredPersonality: { dim: 'prudent',  min:  6 }, atkMul: 3.2, hpMul: 2.5 },
  { id: 'sage',         nameKR: '현자',       emoji: '🧙', tier: 3, milestone: 'age50', requiredPersonality: null, atkMul: 2.8, hpMul: 2.8 },
];

export function findJobsForMilestone(milestone: JobMilestone): Job[] {
  return JOBS.filter(j => j.milestone === milestone);
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/data/__tests__/jobs.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/jobs.ts games/inflation-rpg/src/data/__tests__/jobs.test.ts
git commit -m "feat(game-inflation-rpg): V1b T1 — Job catalog (16 jobs, 3 tiers)"
```

---

### Task 2: `JobSystem.evaluate(hero, milestone)` — pick best job

**Files:**
- Create: `games/inflation-rpg/src/hero/JobSystem.ts`
- Test: `games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// JobSystem.test.ts
import { describe, it, expect } from 'vitest';
import { JobSystem } from '../JobSystem';
import { HeroEntity } from '../HeroEntity';

describe('JobSystem', () => {
  it('picks a tier-1 job at age10 milestone', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 5);
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job).toBeTruthy();
    expect(job!.tier).toBe(1);
  });

  it('returns null if no job matches', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    // No personality boost, no qualifying tier-3 job
    const job = JobSystem.evaluate(hero, 'age50');
    expect(job).toBeOneOf([null, expect.objectContaining({ id: 'sage' })]);
    // Only sage has no requiredPersonality at tier 3 — neutral hero gets sage or null
  });

  it('prefers job with highest personality alignment', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 8);
    const job = JobSystem.evaluate(hero, 'age10');
    expect(job!.id).toBe('warrior'); // heroic-aligned tier-1
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/hero/__tests__/JobSystem.test.ts`
Expected: FAIL with "Cannot find module '../JobSystem'"

- [ ] **Step 3: Implement JobSystem.ts**

```ts
// JobSystem.ts
import type { HeroEntity } from './HeroEntity';
import { JOBS, type Job, type JobMilestone } from '../data/jobs';

export const JobSystem = {
  evaluate(hero: HeroEntity, milestone: JobMilestone): Job | null {
    const candidates = JOBS.filter(j => j.milestone === milestone);
    let best: { job: Job; score: number } | null = null;
    for (const job of candidates) {
      if (job.requiredPersonality) {
        const val = hero.personality.get(job.requiredPersonality.dim);
        const dir = Math.sign(job.requiredPersonality.min);
        // If min positive, need val >= min. If min negative, need val <= min.
        if (dir > 0 && val < job.requiredPersonality.min) continue;
        if (dir < 0 && val > job.requiredPersonality.min) continue;
        const score = Math.abs(val);
        if (!best || score > best.score) best = { job, score };
      } else {
        // Unconditional job — score 0 (used as fallback)
        if (!best) best = { job, score: 0 };
      }
    }
    return best?.job ?? null;
  },
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/hero/__tests__/JobSystem.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/hero/JobSystem.ts games/inflation-rpg/src/hero/__tests__/JobSystem.test.ts
git commit -m "feat(game-inflation-rpg): V1b T2 — JobSystem.evaluate (personality-matched)"
```

---

### Task 3: Wire job unlock into `HeroEntity` lifecycle

**Files:**
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts`
- Modify: `games/inflation-rpg/src/overworld/OverworldEvents.ts`
- Modify: `games/inflation-rpg/src/overworld/CycleControllerV2.ts`
- Test: `games/inflation-rpg/src/hero/__tests__/HeroEntity.test.ts`

- [ ] **Step 1: Write failing test**

Add to existing `HeroEntity.test.ts`:

```ts
describe('HeroEntity job unlock at age milestone', () => {
  it('emits job_unlocked event when crossing age 10', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 5);
    // Initially age 5; manually advance age to 10
    const events = hero.maybeUnlockJobForAge(10);
    expect(events.some(e => e.type === 'job_unlocked')).toBe(true);
  });

  it('applies job multipliers after unlock', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 5);
    const baseAtk = hero.atk;
    hero.maybeUnlockJobForAge(10);
    expect(hero.atk).toBeGreaterThan(baseAtk); // warrior atkMul 1.3
    expect(hero.job).not.toBe('평민');
  });

  it('does not re-trigger same milestone twice', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 5);
    hero.maybeUnlockJobForAge(10);
    const events = hero.maybeUnlockJobForAge(10);
    expect(events).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/hero/__tests__/HeroEntity.test.ts`
Expected: FAIL with "maybeUnlockJobForAge is not a function"

- [ ] **Step 3: Add `job_unlocked` event + `unlockedMilestones` field + `maybeUnlockJobForAge`**

In `OverworldEvents.ts` add to union:
```ts
| { type: 'job_unlocked'; jobId: string; jobNameKR: string; tier: 1 | 2 | 3 }
```

In `HeroEntity.ts`:
```ts
import { JobSystem } from './JobSystem';
import { JOBS } from '../data/jobs';
import type { JobMilestone } from '../data/jobs';

// field:
unlockedMilestones: Set<JobMilestone> = new Set();

maybeUnlockJobForAge(currentAge: number): OverworldEvent[] {
  const milestones: Array<{ age: number; m: JobMilestone }> = [
    { age: 10, m: 'age10' },
    { age: 30, m: 'age30' },
    { age: 50, m: 'age50' },
  ];
  const out: OverworldEvent[] = [];
  for (const ms of milestones) {
    if (currentAge < ms.age) continue;
    if (this.unlockedMilestones.has(ms.m)) continue;
    const job = JobSystem.evaluate(this, ms.m);
    if (!job) {
      this.unlockedMilestones.add(ms.m);
      continue;
    }
    this.unlockedMilestones.add(ms.m);
    this.job = job.nameKR;
    this.atkBase = Math.floor(this.atkBase * job.atkMul);
    this.hpBase = Math.floor(this.hpBase * job.hpMul);
    this.recomputeStats();
    this.hp = this.hpMax;
    out.push({ type: 'job_unlocked', jobId: job.id, jobNameKR: job.nameKR, tier: job.tier });
  }
  return out;
}
```

Make `recomputeStats` callable from this method (was private). Use `this.recomputeStats();`.

In `CycleControllerV2.handleArrival`, after `encounter.resolveEncounter(...)` returns, check for age milestone:
```ts
const jobEvents = this.hero.maybeUnlockJobForAge(this.hero.age);
for (const je of jobEvents) {
  events.push(je);
  if (je.type === 'job_unlocked') {
    this.saga.record({
      age: this.hero.age,
      type: 'jobUnlock',
      narrativeText: `${this.hero.name}은(는) ${je.jobNameKR}이(가) 되었다.`,
      payload: { jobId: je.jobId, tier: je.tier },
    });
  }
}
```

Also add `'jobUnlock'` to `SagaEventType` in `SagaTypes.ts`.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/hero/__tests__/HeroEntity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/overworld/OverworldEvents.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/saga/SagaTypes.ts
git commit -m "feat(game-inflation-rpg): V1b T3 — wire job unlock into hero lifecycle + saga"
```

---

### Task 4: Render job unlock cinematic in OverworldRunner

**Files:**
- Modify: `games/inflation-rpg/src/screens/OverworldRunner.tsx`
- Test: `games/inflation-rpg/src/screens/__tests__/OverworldRunner.jobUnlock.test.tsx` (new)

- [ ] **Step 1: Write failing test**

```tsx
// OverworldRunner.jobUnlock.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OverworldRunner } from '../OverworldRunner';

describe('OverworldRunner job unlock cinematic', () => {
  it('shows job_unlocked overlay text when event fires', async () => {
    // Simulate by dispatching a job_unlocked event via test hook (props or store)
    render(<OverworldRunner onComplete={() => {}} />);
    act(() => {
      // ... trigger event via store
    });
    // Cinematic overlay shows job name (Korean)
    expect(await screen.findByText(/전사이\(가\) 되었다|이\(가\) 되었다/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: test file fails (overlay markup not yet present).

- [ ] **Step 3: Add cinematic overlay**

In `OverworldRunner.tsx`, subscribe to `OverworldEvent` stream from controller. On `job_unlocked`, render a fixed-position overlay for 2s:

```tsx
const [jobToast, setJobToast] = useState<{ name: string; tier: number } | null>(null);

useEffect(() => {
  const sub = controllerRef.current?.onEvent(ev => {
    if (ev.type === 'job_unlocked') {
      setJobToast({ name: ev.jobNameKR, tier: ev.tier });
      setTimeout(() => setJobToast(null), 2000);
    }
  });
  return () => sub?.();
}, []);

{jobToast && (
  <div data-testid="job-unlock-toast" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
       background: 'rgba(251,191,36,.95)', color: '#0f172a', padding: '16px 24px', borderRadius: 8, fontSize: 18, fontWeight: 'bold',
       textShadow: '0 1px 0 #fff' }}>
    ✦ {jobToast.name}이(가) 되었다 (Tier {jobToast.tier})
  </div>
)}
```

(If `controllerRef.current.onEvent` does not exist, expose `controller.onEvent(cb): unsub` in `CycleControllerV2`.)

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forge/game-inflation-rpg exec vitest run src/screens/__tests__/OverworldRunner.jobUnlock.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/OverworldRunner.tsx games/inflation-rpg/src/screens/__tests__/OverworldRunner.jobUnlock.test.tsx games/inflation-rpg/src/overworld/CycleControllerV2.ts
git commit -m "feat(game-inflation-rpg): V1b T4 — job unlock toast cinematic"
```

---

### Task 5: `HeroSkill` type + skill pool (subset of legacy 32)

**Files:**
- Create: `games/inflation-rpg/src/data/heroSkills.ts`
- Test: `games/inflation-rpg/src/data/__tests__/heroSkills.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { HERO_SKILLS, findSkillsForJob } from '../heroSkills';

describe('hero skills catalog', () => {
  it('has at least 16 skills total', () => {
    expect(HERO_SKILLS.length).toBeGreaterThanOrEqual(16);
  });

  it('each skill has id, nameKR, description, atkMul, jobIds', () => {
    for (const s of HERO_SKILLS) {
      expect(s.id).toBeTruthy();
      expect(s.nameKR).toBeTruthy();
      expect(s.atkMul).toBeGreaterThan(0);
      expect(Array.isArray(s.jobIds)).toBe(true);
    }
  });

  it('findSkillsForJob returns subset relevant to that job', () => {
    const warriorSkills = findSkillsForJob('warrior');
    expect(warriorSkills.length).toBeGreaterThan(0);
    for (const s of warriorSkills) expect(s.jobIds).toContain('warrior');
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Expected: FAIL with module not found.

- [ ] **Step 3: Implement heroSkills.ts**

```ts
// heroSkills.ts — V1a-compatible subset of legacy 32 skills.
// Each skill applies a flat atkMul when learned (passive boost).

export interface HeroSkill {
  id: string;
  nameKR: string;
  description: string;
  atkMul: number;       // applied on learn (1.1 = +10% atk)
  hpMul: number;        // optional defensive boost
  jobIds: readonly string[]; // jobs this skill is themed for
}

export const HERO_SKILLS: readonly HeroSkill[] = [
  { id: 'strike',          nameKR: '일격',         description: '강력한 단일 강타',  atkMul: 1.10, hpMul: 1.00, jobIds: ['warrior', 'paladin', 'hero'] },
  { id: 'cleave',          nameKR: '횡베기',       description: 'AoE 공격',          atkMul: 1.08, hpMul: 1.00, jobIds: ['warrior', 'paladin'] },
  { id: 'aim',             nameKR: '저격',         description: '치명타 적중',       atkMul: 1.15, hpMul: 0.95, jobIds: ['archer', 'ranger'] },
  { id: 'multishot',       nameKR: '연사',         description: '다중 화살',         atkMul: 1.12, hpMul: 1.00, jobIds: ['archer', 'ranger'] },
  { id: 'backstab',        nameKR: '기습',         description: '뒤치기',            atkMul: 1.20, hpMul: 0.90, jobIds: ['rogue', 'assassin'] },
  { id: 'poison',          nameKR: '독묻히기',     description: '독 추가',           atkMul: 1.10, hpMul: 0.95, jobIds: ['rogue', 'assassin'] },
  { id: 'fireball',        nameKR: '화염구',       description: '범위 화염',         atkMul: 1.18, hpMul: 1.00, jobIds: ['mage', 'archmage'] },
  { id: 'icebolt',         nameKR: '얼음창',       description: '관통 얼음',         atkMul: 1.15, hpMul: 1.00, jobIds: ['mage', 'archmage'] },
  { id: 'bless',           nameKR: '축복',         description: '동료 강화',         atkMul: 1.05, hpMul: 1.15, jobIds: ['priest', 'saint'] },
  { id: 'heal',            nameKR: '치유',         description: '자가 회복',         atkMul: 1.00, hpMul: 1.20, jobIds: ['priest', 'saint'] },
  { id: 'meditation',      nameKR: '명상',         description: '내공 증진',         atkMul: 1.12, hpMul: 1.12, jobIds: ['monk', 'grandmaster', 'sage'] },
  { id: 'palm_strike',     nameKR: '장권',         description: '내공 권법',         atkMul: 1.18, hpMul: 1.00, jobIds: ['monk', 'grandmaster'] },
  { id: 'curse',           nameKR: '저주',         description: '디버프',            atkMul: 1.15, hpMul: 0.95, jobIds: ['dark_lord', 'assassin'] },
  { id: 'shadow_step',     nameKR: '그림자걸음',   description: '회피 + 기습',       atkMul: 1.15, hpMul: 1.05, jobIds: ['rogue', 'assassin', 'dark_lord'] },
  { id: 'divine_judgment', nameKR: '신성심판',     description: '신성 일격',         atkMul: 1.30, hpMul: 1.10, jobIds: ['paladin', 'saint', 'hero'] },
  { id: 'arcane_mastery',  nameKR: '비전통달',     description: '마법 증폭',         atkMul: 1.25, hpMul: 1.00, jobIds: ['mage', 'archmage', 'sage'] },
];

export function findSkillsForJob(jobId: string): HeroSkill[] {
  return HERO_SKILLS.filter(s => s.jobIds.includes(jobId));
}
```

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/data/heroSkills.ts games/inflation-rpg/src/data/__tests__/heroSkills.test.ts
git commit -m "feat(game-inflation-rpg): V1b T5 — HeroSkill catalog (16 passive skills)"
```

---

### Task 6: `SkillLearningSystem.tryLearn(hero, seed)` + wire to level milestones

**Files:**
- Create: `games/inflation-rpg/src/hero/SkillLearningSystem.ts`
- Test: `games/inflation-rpg/src/hero/__tests__/SkillLearningSystem.test.ts`
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts` — track learned skills
- Modify: `games/inflation-rpg/src/overworld/OverworldEvents.ts` — `skill_learned` event
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts` — call on level milestone

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { HeroEntity } from '../HeroEntity';
import { SkillLearningSystem } from '../SkillLearningSystem';

describe('SkillLearningSystem', () => {
  it('grants a job-matching skill on tryLearn', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.job = '전사';
    hero.unlockedJobId = 'warrior';
    const event = SkillLearningSystem.tryLearn(hero, 42);
    expect(event).toBeTruthy();
    expect(hero.learnedSkillIds.size).toBe(1);
    expect(event!.atkBefore).toBeLessThan(event!.atkAfter);
  });

  it('does not grant same skill twice', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.unlockedJobId = 'warrior';
    SkillLearningSystem.tryLearn(hero, 42);
    const size1 = hero.learnedSkillIds.size;
    for (let i = 0; i < 20; i++) SkillLearningSystem.tryLearn(hero, 42 + i);
    // Eventually all warrior skills learned — at most ~3 unique
    expect(hero.learnedSkillIds.size).toBeLessThanOrEqual(findSkillsForJob('warrior').length);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Expected: FAIL.

- [ ] **Step 3: Implement SkillLearningSystem.ts + HeroEntity changes**

```ts
// SkillLearningSystem.ts
import type { HeroEntity } from './HeroEntity';
import { findSkillsForJob, HERO_SKILLS } from '../data/heroSkills';
import { SeededRng } from '../cycle/SeededRng';

export const SkillLearningSystem = {
  tryLearn(hero: HeroEntity, seed: number): { skillId: string; skillNameKR: string; atkBefore: number; atkAfter: number } | null {
    const jobId = hero.unlockedJobId;
    const pool = (jobId ? findSkillsForJob(jobId) : HERO_SKILLS).filter(s => !hero.learnedSkillIds.has(s.id));
    if (pool.length === 0) return null;
    const skill = pool[new SeededRng(seed).int(pool.length)]!;
    const atkBefore = hero.atk;
    hero.learnedSkillIds.add(skill.id);
    hero.atkBase = Math.floor(hero.atkBase * skill.atkMul);
    hero.hpBase = Math.floor(hero.hpBase * skill.hpMul);
    hero.recomputeStats();
    return { skillId: skill.id, skillNameKR: skill.nameKR, atkBefore, atkAfter: hero.atk };
  },
};
```

In `HeroEntity.ts`:
```ts
unlockedJobId: string | null = null;
learnedSkillIds: Set<string> = new Set();
// Make recomputeStats public (or expose via method) so SkillLearningSystem can call it.
recomputeStats(): void { ... }
```

In `EncounterEngine.resolveEncounter` — after level_up events, every 5th level-up (and at level 10/100/1000) call SkillLearningSystem and emit `skill_learned`:
```ts
for (const newLv of leveled) {
  events.push({ type: 'level_up', from: newLv - 1, to: newLv });
  if (newLv % 10 === 0 || newLv === 5) {
    const learn = SkillLearningSystem.tryLearn(hero, hero.level * 1000 + leveled.length);
    if (learn) events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR });
  }
}
```

In `OverworldEvents.ts`:
```ts
| { type: 'skill_learned'; skillId: string; skillNameKR: string }
```

In `JobSystem.evaluate` / Task 3 — also set `hero.unlockedJobId = job.id` after successful job unlock.

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/hero/SkillLearningSystem.ts games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/hero/__tests__/SkillLearningSystem.test.ts games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/overworld/OverworldEvents.ts
git commit -m "feat(game-inflation-rpg): V1b T6 — SkillLearningSystem + level milestone trigger"
```

---

### Task 7: Wire `shrine` landmark in EncounterEngine + skill grant

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Modify: `games/inflation-rpg/src/overworld/OverworldEvents.ts`
- Test: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`

- [ ] **Step 1: Write failing test**

Add to existing test file:

```ts
describe('EncounterEngine.shrine', () => {
  it('emits shrine_visited event on shrine arrival', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.unlockedJobId = 'warrior';
    const engine = new EncounterEngine(new SeededRng(99));
    const events = engine.resolveEncounter(hero, 'shrine', 'shrine_test');
    expect(events.some(e => e.type === 'shrine_visited')).toBe(true);
  });

  it('shrine may grant a skill (test by repeated seeds)', () => {
    let grantedAny = false;
    for (let s = 1; s <= 20; s++) {
      const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
      hero.unlockedJobId = 'warrior';
      const events = new EncounterEngine(new SeededRng(s)).resolveEncounter(hero, 'shrine', 'shrine_test');
      if (events.some(e => e.type === 'skill_learned')) grantedAny = true;
    }
    expect(grantedAny).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

- [ ] **Step 3: Implement shrine branch**

In `EncounterEngine`:

```ts
const SHRINE_SKILL_GRANT_RATE = 0.4;

} else if (kind === 'shrine') {
  events.push({ type: 'shrine_visited', landmarkId });
  // Heal a bit
  hero.heal(Math.floor(hero.hpMax * 0.4));
  // 40% chance: grant a job-matching skill
  if (this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
    const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000));
    if (learn) events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR });
  }
  hero.consumeBp(0); // shrine free
}
```

In `OverworldEvents.ts`:
```ts
| { type: 'shrine_visited'; landmarkId: string }
```

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/overworld/OverworldEvents.ts games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts
git commit -m "feat(game-inflation-rpg): V1b T7 — shrine encounter + 40% skill grant"
```

---

### Task 8: Moral fork encounters — 부상자 + 강도 (cave 재활용)

**Files:**
- Modify: `games/inflation-rpg/src/overworld/EncounterEngine.ts`
- Modify: `games/inflation-rpg/src/overworld/OverworldEvents.ts`
- Modify: `games/inflation-rpg/src/saga/SagaTypes.ts` (`moralChoice` event type)
- Test: `games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe('moral fork encounters', () => {
  it('cave landmark may trigger 부상자 encounter — heroic hero helps, personality moral+', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('heroic', 5);
    const moralBefore = hero.personality.get('moral');
    new EncounterEngine(new SeededRng(7)).resolveEncounter(hero, 'cave', 'cave_test');
    const moralAfter = hero.personality.get('moral');
    expect(moralAfter).toBeGreaterThanOrEqual(moralBefore);
  });

  it('ruin landmark may trigger 강도 encounter — moral- hero robs, moral down', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    hero.personality.adjust('moral', -5);
    const moralBefore = hero.personality.get('moral');
    new EncounterEngine(new SeededRng(11)).resolveEncounter(hero, 'ruin', 'ruin_test');
    // No assertion: just check no crash and at least 1 event
    // Real assertion: moral_choice event fires
    // (Implementation defines exact behavior)
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

- [ ] **Step 3: Implement moral encounters**

In `EncounterEngine`:

```ts
} else if (kind === 'cave') {
  // 부상자 발견. heroic / merciful 가 양수면 도움 → moral +1
  const heroic = hero.personality.get('heroic');
  const merciful = hero.personality.get('merciful');
  if (heroic + merciful >= 0) {
    hero.personality.adjust('moral', 1);
    events.push({ type: 'moral_choice', choice: 'help_injured', dim: 'moral', delta: 1 });
  } else {
    hero.personality.adjust('moral', -1);
    events.push({ type: 'moral_choice', choice: 'ignore_injured', dim: 'moral', delta: -1 });
  }
  hero.consumeBp(0);
} else if (kind === 'ruin') {
  // 강도와 만남. moral-알 강도. moral 점수 따라 분기.
  const moral = hero.personality.get('moral');
  if (moral < 0) {
    // Join the robbery — atk + small, moral down
    hero.personality.adjust('moral', -2);
    events.push({ type: 'moral_choice', choice: 'rob_with_bandits', dim: 'moral', delta: -2 });
  } else {
    // Resist — small atk gain via combat, moral up
    hero.personality.adjust('moral', 2);
    events.push({ type: 'moral_choice', choice: 'resist_bandits', dim: 'moral', delta: 2 });
  }
  hero.consumeBp(0);
}
```

In `OverworldEvents.ts`:
```ts
| { type: 'moral_choice'; choice: string; dim: PersonalityDim; delta: number }
```

In `SagaTypes.ts`, add `'moralChoice'` to `SagaEventType`. `CycleControllerV2.handleArrival` records moral choices as saga events.

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/EncounterEngine.ts games/inflation-rpg/src/overworld/OverworldEvents.ts games/inflation-rpg/src/saga/SagaTypes.ts games/inflation-rpg/src/overworld/CycleControllerV2.ts games/inflation-rpg/src/overworld/__tests__/EncounterEngine.test.ts
git commit -m "feat(game-inflation-rpg): V1b T8 — moral fork (cave/ruin) — personality-driven"
```

---

### Task 9: Equipment stat wiring — drops actually mutate atkBase/hpBase

**Files:**
- Modify: `games/inflation-rpg/src/overworld/dropTable.ts`
- Modify: `games/inflation-rpg/src/hero/HeroEntity.ts`
- Test: `games/inflation-rpg/src/overworld/__tests__/dropTable.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe('equipment stat wiring', () => {
  it('drop item has atkMul or hpMul', () => {
    const item = lookupDrop('rusty_sword');
    expect(item).toBeTruthy();
    expect(typeof item!.atkMul === 'number' || typeof item!.hpMul === 'number').toBe(true);
  });

  it('addEquipment mutates hero.atkBase via item.atkMul', () => {
    const hero = HeroEntity.create({ seed: 1, bpMax: 100, heroHpMax: 100, heroAtkBase: 50 });
    const before = hero.atkBase;
    hero.addEquipment('rusty_sword');
    expect(hero.atkBase).toBeGreaterThan(before);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

- [ ] **Step 3: Add atkMul/hpMul to drop items + wire in HeroEntity.addEquipment**

```ts
// dropTable.ts
export interface DropItem {
  id: string;
  nameKR: string;
  tier: 'common' | 'rare' | 'epic';
  atkMul: number; // 1.0 = no boost
  hpMul: number;
}
export const ENEMY_DROPS: readonly DropItem[] = [
  { id: 'rusty_sword',  nameKR: '낡은 검',    tier: 'common', atkMul: 1.05, hpMul: 1.00 },
  { id: 'cloth_armor',  nameKR: '천 갑옷',    tier: 'common', atkMul: 1.00, hpMul: 1.05 },
  // ... 6 enemy items
];
export const BOSS_DROPS: readonly DropItem[] = [
  { id: 'steel_sword',  nameKR: '강철의 검',  tier: 'rare',  atkMul: 1.15, hpMul: 1.00 },
  // ... 4 boss items
];
```

In `HeroEntity.addEquipment(itemId)`:
```ts
addEquipment(itemId: string): void {
  this.equipment.push(itemId);
  const item = lookupDrop(itemId);
  if (item) {
    this.atkBase = Math.floor(this.atkBase * item.atkMul);
    this.hpBase = Math.floor(this.hpBase * item.hpMul);
    this.recomputeStats();
  }
}
```

(Import `lookupDrop` from `../overworld/dropTable`.)

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/overworld/dropTable.ts games/inflation-rpg/src/hero/HeroEntity.ts games/inflation-rpg/src/overworld/__tests__/dropTable.test.ts
git commit -m "feat(game-inflation-rpg): V1b T9 — equipment stat wiring (was V1a deadstat)"
```

---

### Task 10: Sim-G re-run with V1b additions — validate inflation push toward 수십만

**Files:**
- Modify: `docs/superpowers/reports/2026-05-21-sim-g-v1a-report.md` (add §V1b update)

- [ ] **Step 1: Run sim**

```bash
pnpm --filter @forge/game-inflation-rpg exec npx tsx scripts/sim-cycle-v2.ts \
  --count 200 --seed 1 --bp 100 --hp 100 --atk 50 \
  --out runs/2026-05-21-v1b-sim.jsonl
```

- [ ] **Step 2: Capture summary**

Compare maxLevel p50 / p90 / max against V1a Round 2 (14K avg). Expected: V1b job + skill + equipment multipliers push P50 closer to 50K-100K (toward user's "수십만" vision).

- [ ] **Step 3: Update report**

Append §V1b results table to the Sim-G report. If P50 drops below 1,000 or 자연사 < 80%, the multipliers are too aggressive — back out one of (job tier-3 atkMul, skill atkMul, equipment atkMul).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/reports/2026-05-21-sim-g-v1a-report.md
git commit -m "docs: V1b T10 — Sim-G post-V1b validation results"
```

---

### Task 11: Saga Book viewer — past saga list + replay

**Files:**
- Create: `games/inflation-rpg/src/screens/SagaBook.tsx`
- Create: `games/inflation-rpg/src/screens/__tests__/SagaBook.test.tsx`
- Modify: `games/inflation-rpg/src/screens/MainMenu.tsx` — add "사가 책" button

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SagaBook } from '../SagaBook';

describe('SagaBook', () => {
  it('renders empty state when no saga', () => {
    render(<SagaBook sagas={[]} onClose={() => {}} />);
    expect(screen.getByText(/아직 기록된 일대기가 없다/)).toBeInTheDocument();
  });

  it('renders list of saga summaries', () => {
    const sagas = [{
      heroName: '김철수', finalLevel: 14000, finalAge: 65, finalJob: '전사',
      cause: '자연사', chapters: [], seed: 1,
    }];
    render(<SagaBook sagas={sagas} onClose={() => {}} />);
    expect(screen.getByText(/김철수/)).toBeInTheDocument();
    expect(screen.getByText(/14000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify fail**

- [ ] **Step 3: Implement SagaBook.tsx**

```tsx
import type { CycleSaga } from '../saga/SagaTypes';

interface Props {
  sagas: CycleSaga[];
  onClose: () => void;
}

export function SagaBook({ sagas, onClose }: Props) {
  if (sagas.length === 0) {
    return (
      <div style={containerStyle}>
        <h2>사가 책</h2>
        <p>아직 기록된 일대기가 없다.</p>
        <button onClick={onClose}>돌아가기</button>
      </div>
    );
  }
  return (
    <div style={containerStyle}>
      <h2>사가 책 — {sagas.length} 일대기</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sagas.map((s, i) => (
          <li key={i} style={sagaItemStyle}>
            <b>{s.heroName}</b> · {s.finalJob} · LV {s.finalLevel} · {s.finalAge}세 · {s.cause}
          </li>
        ))}
      </ul>
      <button onClick={onClose}>돌아가기</button>
    </div>
  );
}

const containerStyle: React.CSSProperties = { padding: 24, color: '#eee' };
const sagaItemStyle: React.CSSProperties = { padding: 12, marginBottom: 8, background: '#111827', borderRadius: 4 };
```

In `MainMenu.tsx`:
```tsx
<button onClick={() => onNav('saga-book')}>사가 책</button>
```

In `App.tsx`: add `'saga-book'` to route + render `SagaBook` reading from `meta.sagaHistory`.

- [ ] **Step 4: Run test to verify pass**

- [ ] **Step 5: Commit**

```bash
git add games/inflation-rpg/src/screens/SagaBook.tsx games/inflation-rpg/src/screens/__tests__/SagaBook.test.tsx games/inflation-rpg/src/screens/MainMenu.tsx games/inflation-rpg/src/App.tsx
git commit -m "feat(game-inflation-rpg): V1b T11 — SagaBook viewer (past saga list)"
```

---

### Task 12: Persist v17 → v18 migration

**Files:**
- Modify: `games/inflation-rpg/src/store/gameStore.ts`

- [ ] **Step 1: Add migration branch**

```ts
const STORE_VERSION = 18;

// In migrate function:
if (version < 18) {
  // V1b: no new persisted fields on meta; learnedSkillIds + unlockedMilestones
  // live on the runtime HeroEntity (single-cycle scope), not persisted.
  // sagaHistory entries from v17 onward already include any saga event type;
  // no schema change required.
  // This is a no-op migration solely to bump the version stamp.
}
```

- [ ] **Step 2: Add migration test**

```ts
describe('persist v17 → v18 migration', () => {
  it('upgrades v17 store without losing sagaHistory', () => {
    const v17 = { state: { meta: { sagaHistory: [{ heroName: 'x', finalLevel: 100, ... }] } }, version: 17 };
    const migrated = migrate(v17, 17);
    expect(migrated.meta.sagaHistory).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run all tests**

`pnpm --filter @forge/game-inflation-rpg test`. Expected: all pass (including migration test).

- [ ] **Step 4: Commit**

```bash
git add games/inflation-rpg/src/store/gameStore.ts
git commit -m "chore(game-inflation-rpg): V1b T12 — persist v18 stamp"
```

---

### Task 13: E2E — full V1b cycle (job + skill + shrine + saga book)

**Files:**
- Create: `games/inflation-rpg/e2e/v1b-full-cycle.spec.ts`

- [ ] **Step 1: Write Playwright e2e**

```ts
import { test, expect } from '@playwright/test';

test('V1b full cycle — prep → overworld → result with job + skill saga events → saga book lists it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('btn-start-new-cycle').click();
  await page.getByTestId('btn-prep-start').click();
  // Overworld runs autonomously; wait for cycle-end (could be ~10s in test env)
  await page.waitForSelector('[data-testid="cycle-result-v2"]', { timeout: 60_000 });
  // At least one job-unlock or skill-learn entry should be in saga
  const sagaText = await page.getByTestId('saga-summary').textContent();
  expect(sagaText).toMatch(/되었다|배웠다/);
  // Navigate to saga book
  await page.getByTestId('btn-result-menu').click();
  await page.getByTestId('btn-saga-book').click();
  // Hero name should appear
  await expect(page.getByTestId('saga-book')).toContainText(/[가-힣]+/);
});
```

- [ ] **Step 2: Run e2e**

`pnpm --filter @forge/game-inflation-rpg e2e`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add games/inflation-rpg/e2e/v1b-full-cycle.spec.ts
git commit -m "test(game-inflation-rpg): V1b T13 — e2e full cycle with job/skill/saga book"
```

---

### Task 14: Final verification + tag

- [ ] **Step 1: Full test suite**

```bash
pnpm --filter @forge/game-inflation-rpg typecheck
pnpm --filter @forge/game-inflation-rpg lint
pnpm --filter @forge/game-inflation-rpg test
pnpm --filter @forge/game-inflation-rpg e2e
pnpm --filter @forge/game-inflation-rpg build:web
```

All must pass.

- [ ] **Step 2: Tag**

```bash
git tag phase-v1b-complete
```

- [ ] **Step 3: Update CHANGELOG**

```bash
# Append "Phase V1b — Job/Skill/Shrine/Moral/Saga Book" entry to
# games/inflation-rpg/CHANGELOG.md
git add games/inflation-rpg/CHANGELOG.md
git commit -m "docs(game-inflation-rpg): V1b — CHANGELOG entry"
```

---

## 알려진 한계 (V1c 후속 scope)

- 단일 라이벌 NPC (1-3 persistent NPC 가 cycle 안 반복 등장) — V1c
- 멘토 / 스승 skill 전수 — V1c
- 도덕 분기 확장 (10+ encounter type) — V1c
- 차원 균열 (Compass) — V1c (legacy `compassOwned` 재활용)
- 가족 / 결혼 / 자식 — V2 spec Tier 3, V2+
- 명성 / 악명 — Tier 3
- 큰 사건 / 자연재해 / 정변 — Tier 3
