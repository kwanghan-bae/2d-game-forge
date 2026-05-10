// games/inflation-rpg/tools/balance-sweep-cli.ts
import { writeFileSync } from 'node:fs';
import { runSweep } from './balance-sweep';

const rows = runSweep();
const md: string[] = [];
md.push('# Balance Sweep — 자동 생성');
md.push('');
md.push('> spec `2026-05-01-content-300h-design.md` Section 10.1 / 11.2 vs simulator 측정.');
md.push('');
md.push('| 시점 (h) | 기대 floor | 측정 floor | 클리어 시간 (s) | ±20% 통과 | 절벽 |');
md.push('|---|---|---|---|---|---|');
for (const r of rows) {
  const cliffs = r.cliffsDetected.length === 0 ? '0' : r.cliffsDetected.join(', ');
  const t = Number.isFinite(r.clearTimeAtExpected) ? r.clearTimeAtExpected.toFixed(1) : '∞';
  md.push(`| ${r.hours} | ${r.expectedFloor} | ${r.measuredFloor} | ${t} | ${r.withinTolerance ? '✅' : '❌'} | ${cliffs} |`);
}
md.push('');
md.push('## 통과 기준');
md.push('');
md.push('- **(i)** 모든 row 의 `±20% 통과` 가 ✅.');
md.push('- **(ii)** 모든 row 의 `절벽` 이 0.');
md.push('- **(iii)** TODO-a~d 처리 (별도 검증).');
md.push('');

const out = process.argv[2] ?? 'balance-sweep-out.md';
writeFileSync(out, md.join('\n'));
console.log(`wrote ${out} (${rows.length} rows)`);
