import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onCycleEnd: () => void;
}

// Lazy-load Phaser only on the client + only when this component mounts. This
// avoids server-rendering issues with the dev-shell.
async function bootPhaser(
  container: HTMLDivElement,
  onEvent: (e: import('../overworld/OverworldEvents').OverworldEvent) => void,
  hero: import('../hero/HeroEntity').HeroEntity,
  ai: import('../decisionAI/HeroDecisionAI').HeroDecisionAI,
  seed: number,
): Promise<{ destroy: () => void }> {
  const [Phaser, { OverworldScene, GRID_W, GRID_H }] = await Promise.all([
    import('phaser'),
    import('../overworld/OverworldScene'),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: GRID_W * 32,
    height: GRID_H * 32,
    backgroundColor: '#0a0e1a',
    scene: OverworldScene,
    physics: { default: 'arcade' },
  });
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent });
  return { destroy: () => game.destroy(true) };
}

export function OverworldRunner({ onCycleEnd }: Props) {
  const status = useCycleStoreV2(s => s.status);
  const controller = useCycleStoreV2(s => s.controller);
  const endCycle = useCycleStoreV2(s => s.endCycle);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setHudTick] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (status !== 'running' || !controller || !containerRef.current) return;
    let destroy: (() => void) | null = null;
    endedRef.current = false;

    bootPhaser(
      containerRef.current,
      (event) => {
        if (event.type === 'arrived_at') {
          controller.handleArrival(event.landmarkKind, event.landmarkId);
          setHudTick(n => n + 1);
        }
        if ((event.type === 'cycle_ended' || event.type === 'hero_died') && !endedRef.current) {
          endedRef.current = true;
          endCycle();
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
    ).then(g => { destroy = g.destroy; });

    return () => { destroy?.(); };
  }, [status, controller, onCycleEnd, endCycle]);

  if (status === 'idle' || !controller) {
    return <div style={{ padding: 24, color: '#eee' }}>사이클이 시작되지 않았습니다.</div>;
  }

  const hero = controller.getHero();

  return (
    <div data-testid="overworld-runner">
      <div data-testid="overworld-hud" style={hudStyle}>
        <span data-testid="hud-name">{hero.emoji} {hero.name}</span>
        <span data-testid="hud-age">{hero.age}세 · {hero.chapter}</span>
        <span>{hero.job} · LV {hero.level}</span>
        <span>HP {hero.hp}/{hero.hpMax}</span>
        <span data-testid="hud-bp">BP {hero.bp}/{hero.bpMax}</span>
      </div>
      <div ref={containerRef} style={{ background: '#0a0e1a', display: 'flex', justifyContent: 'center', paddingTop: 8 }} />
      <button onClick={() => { endCycle(); onCycleEnd(); }} style={abandonBtnStyle}>
        포기 (cycle 종료)
      </button>
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '8px 16px',
  background: '#1f2937',
  color: '#cbd5e1',
  fontSize: 13,
  borderBottom: '1px solid #334155',
  flexWrap: 'wrap',
};

const abandonBtnStyle: React.CSSProperties = {
  margin: '12px auto',
  display: 'block',
  padding: '8px 16px',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};
