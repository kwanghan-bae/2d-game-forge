const PREFIXES = ['', 'K', 'M', 'B', 'T'];

function lettersForBucket(b: number): string {
  // bucket 0..25 = 'aa'..'az'
  // bucket 26..51 = 'ba'..'bz' (first letter advances each 26 buckets)
  const second = b % 26;
  const first = Math.floor(b / 26);
  const a = String.fromCharCode(97 + first);
  const c = String.fromCharCode(97 + second);
  return a + c;
}

function precision3(n: number): string {
  // 3 significant figures, no trailing zeros padded weirdly:
  //   1.23, 12.3, 123 (no decimal if >=100)
  if (n >= 100) return Math.floor(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Math.floor(n).toString();

  // Determine 1000-power tier.
  // tier 1 = K (1e3), tier 2 = M (1e6), ..., tier 4 = T (1e12)
  // tier 5..30 = aa..az (1e15..1e81 in steps of 1e3)
  // tier 31..56 = ba..bz, etc.
  const tier = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, tier);

  if (tier <= 4) return precision3(scaled) + PREFIXES[tier];
  const bucket = tier - 5; // 0-indexed bucket for letter pairs
  return precision3(scaled) + lettersForBucket(bucket);
}
