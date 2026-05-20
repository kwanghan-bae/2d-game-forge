import type { HeroEntity } from './HeroEntity';
import { JOBS, type Job, type JobMilestone } from '../data/jobs';

/**
 * Picks the best-matching job at a given age milestone based on hero personality.
 * Returns the qualifying job with the largest personality magnitude (most aligned).
 * Falls back to an unconditional job if available; otherwise null.
 */
export const JobSystem = {
  evaluate(hero: HeroEntity, milestone: JobMilestone): Job | null {
    const candidates = JOBS.filter(j => j.milestone === milestone);
    let best: { job: Job; score: number } | null = null;
    let fallback: Job | null = null;

    for (const job of candidates) {
      if (job.requiredPersonality === null) {
        fallback = job;
        continue;
      }
      const val = hero.personality.get(job.requiredPersonality.dim);
      const dir = Math.sign(job.requiredPersonality.min);
      if (dir > 0 && val < job.requiredPersonality.min) continue;
      if (dir < 0 && val > job.requiredPersonality.min) continue;
      const score = Math.abs(val);
      if (!best || score > best.score) best = { job, score };
    }

    return best?.job ?? fallback ?? null;
  },
};
