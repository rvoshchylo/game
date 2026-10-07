const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 10) return sign + (Math.round(n * 10) / 10).toString();
  if (n < 1000) return sign + Math.floor(n).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  if (tier >= SUFFIXES.length - 1 && n >= 1e36) return sign + n.toExponential(2).replace('+', '');
  const scaled = n / Math.pow(1000, tier);
  return sign + (scaled < 100 ? scaled.toFixed(scaled < 10 ? 2 : 1) : Math.floor(scaled).toString()) + SUFFIXES[tier];
}

export function formatDuration(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export const pct = (v: number): string => `${Math.round(v * 100)}%`;
