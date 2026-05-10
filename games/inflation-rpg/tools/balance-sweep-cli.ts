// games/inflation-rpg/tools/balance-sweep-cli.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { runSweep } from './balance-sweep';

const SENTINEL = '<!-- AUTO-GENERATED ABOVE / MANUAL ANALYSIS BELOW — preserved across re-runs -->';

const rows = runSweep();
const md: string[] = [];
md.push('# Balance Sweep — 자동 생성');
md.push('');
md.push('> spec `2026-05-01-content-300h-design.md` Section 10.1 / 11.2 vs simulator 측정.');
md.push('');
md.push('| 시점 (h) | 기대 floor | 측정 floor | 클리어 시간 (s) | ≥기대 통과 | 절벽 |');
md.push('|---|---|---|---|---|---|');
for (const r of rows) {
  const cliffs = r.cliffsDetected.length === 0 ? '0' : r.cliffsDetected.join(', ');
  const t = Number.isFinite(r.clearTimeAtExpected) ? r.clearTimeAtExpected.toFixed(1) : '∞';
  md.push(`| ${r.hours} | ${r.expectedFloor} | ${r.measuredFloor} | ${t} | ${r.withinTolerance ? '✅' : '❌'} | ${cliffs} |`);
}
md.push('');
md.push('## 통과 기준');
md.push('');
md.push('- **(i)** 모든 row 의 `measuredFloor ≥ expectedFloor` 가 ✅.');
md.push('- **(ii)** 모든 row 의 `절벽` 이 0.');
md.push('- **(iii)** TODO-a~d 처리 (별도 검증).');
md.push('');
md.push(SENTINEL);
md.push('');

const out = process.argv[2] ?? 'balance-sweep-out.md';

// Preserve any manual analysis section below the sentinel from a previous run.
let manualSection = '';
try {
  const existing = readFileSync(out, 'utf-8');
  const idx = existing.indexOf(SENTINEL);
  if (idx !== -1) {
    manualSection = existing.slice(idx + SENTINEL.length);
  }
} catch {
  // 신규 파일 — manual section 없음.
}

writeFileSync(out, md.join('\n') + manualSection);
console.log(`wrote ${out} (${rows.length} rows)`);
