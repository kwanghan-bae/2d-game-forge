import type { NpcEntity, RealmId } from '../types';
import { NPC_TEMPLATES } from '../data/npcs';
import { SeededRng } from '../cycle/SeededRng';

export function tickNpc(npc: NpcEntity): void {
  if (!npc.isAlive) return;
  npc.age += npc.ageRate;
  if (!isAliveAge(npc.age, npc.kind)) {
    npc.isAlive = false;
  }
}

const MAX_AGE_BY_KIND: Record<NpcEntity['kind'], number> = {
  rival: 100,
  mentor: 100,
  friend: 90,
  family_parent: 80,
  family_spouse: 95,
  family_child: 70,
};

export function isAliveAge(age: number, kind: NpcEntity['kind']): boolean {
  return age < (MAX_AGE_BY_KIND[kind] ?? 80);
}

export interface SpawnOpts {
  realmId: RealmId;
  seed: number;
}

let nextInstanceId = 1;

export function spawnNpc(kind: NpcEntity['kind'], opts: SpawnOpts): NpcEntity | null {
  const tmpl = NPC_TEMPLATES.find(t => t.kind === kind);
  if (!tmpl) return null;
  const rng = new SeededRng(opts.seed);
  const name = tmpl.candidateNames[rng.int(tmpl.candidateNames.length)];
  const emoji = tmpl.emojis[rng.int(tmpl.emojis.length)];
  return {
    instanceId: `npc_${nextInstanceId++}_${opts.seed}`,
    kind,
    nameKR: name ?? tmpl.candidateNames[0] ?? '',
    emoji: emoji ?? tmpl.emojis[0] ?? '',
    age: tmpl.initialAge,
    ageRate: tmpl.ageRate,
    isAlive: true,
    bornChapter: tmpl.spawnChapter === 'any' ? '어린시절' : tmpl.spawnChapter,
    relationship: 50,
    zoneRealmId: opts.realmId,
    personalityDim: tmpl.personalityDim,
  };
}
