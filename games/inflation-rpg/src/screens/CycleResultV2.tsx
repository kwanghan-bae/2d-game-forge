import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import type { CycleCombatStats } from '../overworld/cycleSliceV2';
import { InflationCurveChart } from './InflationCurveChart';
import { useGameStore } from '../store/gameStore';
import { getVictoryQuote } from '../data/victoryQuotes';

interface Props {
  onBackToMenu: () => void;
}

export function CycleResultV2({ onBackToMenu }: Props) {
  const saga = useCycleStoreV2(s => s.lastSaga);
  const combatStats = useCycleStoreV2(s => s.lastCycleStats);
  const reset = useCycleStoreV2(s => s.reset);
  const characterId = useGameStore(s => s.run.characterId);
  const victoryQuote = characterId ? getVictoryQuote(characterId) : null;

  if (!saga) {
    return <div style={{ padding: 24, color: '#eee' }}>결과가 없습니다.</div>;
  }

  const handleBack = () => {
    reset();
    onBackToMenu();
  };

  const allEvents = saga.chapters.flatMap(c => c.events);

  return (
    <div data-testid="cycle-result-v2" style={{ padding: 24, color: '#eee', maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 4 }}>일대기 종료</h2>
      <p data-testid="result-hero-name" style={{ marginTop: 0, fontSize: 16, opacity: 0.85 }}>
        {saga.hero.name} — {saga.hero.cause}
      </p>
      {victoryQuote && (
        <p data-testid="victory-quote" style={{ fontSize: 13, fontStyle: 'italic', color: '#ffd700', borderLeft: '3px solid #ffd700', paddingLeft: 10, margin: '12px 0', opacity: 0.9 }}>
          &ldquo;{victoryQuote}&rdquo;
        </p>
      )}

      <div data-testid="result-final-stats" style={{ background:'#111827', padding:12, borderRadius:6, marginTop:16, fontSize:13 }}>
        <div>최종 나이: {saga.hero.finalAge}세</div>
        <div>최종 직업: {saga.hero.finalJob}</div>
        <div>최종 레벨: {saga.hero.finalLevel}</div>
        <div style={{marginTop:6, fontSize:12, opacity:0.7}}>
          도덕성: 선 {saga.hero.finalPersonality.moral} / 신중 {saga.hero.finalPersonality.prudent} /
          영웅 {saga.hero.finalPersonality.heroic} / 자비 {saga.hero.finalPersonality.merciful} /
          신앙 {saga.hero.finalPersonality.pious}
        </div>
      </div>

      {combatStats && <CombatStatsPanel stats={combatStats} />}

      <div data-testid="result-curve-section" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8, fontSize: 14 }}>인플레이션 곡선</h3>
        <InflationCurveChart history={saga.levelHistory ?? []} />
      </div>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>일대기</h3>
      <div data-testid="result-narrative-list" style={{ maxHeight: 320, overflowY: 'auto', background:'#1c1917', padding:12, borderRadius:6, fontSize:13, lineHeight:1.7 }}>
        {saga.chapters.map(chapter => (
          <div key={chapter.name} style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 4, opacity:0.7, fontStyle:'italic' }}>— {chapter.name} —</h4>
            {chapter.events.length === 0 ? (
              <div style={{ opacity:0.4, fontSize:12 }}>이 시기는 평온했다.</div>
            ) : chapter.events.map((ev, i) => (
              <div key={i} style={{ marginBottom: 4 }}>{ev.narrativeText}</div>
            ))}
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: 11, opacity:0.5, textAlign:'center' }}>
        총 사건 수: {allEvents.length}
      </p>

      <div style={{ textAlign:'center', marginTop: 20 }}>
        <button type="button" onClick={handleBack} style={{
          padding: '10px 24px',
          background:'#fbbf24', color:'#0f172a',
          border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold',
        }}>
          메인 메뉴로
        </button>
      </div>
    </div>
  );
}

function CombatStatsPanel({ stats }: { stats: CycleCombatStats }) {
  return (
    <div data-testid="result-combat-stats" style={{
      background: '#1e293b', padding: 12, borderRadius: 6, marginTop: 12, fontSize: 13,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px',
    }}>
      <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', marginBottom: 4, fontSize: 14, color: '#fbbf24' }}>
        ⚔ 전투 기록
      </div>
      <div>💀 처치: {stats.kills}</div>
      <div>👑 보스: {stats.bossKills}</div>
      <div>📦 드랍: {stats.drops}</div>
      <div>⭐ 최고 레벨: {stats.maxLevel}</div>
      <div style={{ gridColumn: '1 / -1' }}>💰 획득 골드: {stats.goldEarned}</div>
    </div>
  );
}
