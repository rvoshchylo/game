import type { Ctx } from '../context';

export function gainScrap(ctx: Ctx, amount: number): void {
  if (amount <= 0) return;
  ctx.s.scrap += amount;
  ctx.s.stats.totalScrap += amount;
}

/** Fractional shards resolve as a chance for one more (e.g. 2.35 → 2 + 35% for a 3rd). */
export function gainShards(ctx: Ctx, amount: number, roll: () => number): number {
  if (amount <= 0) return 0;
  let n = Math.floor(amount);
  if (roll() < amount - n) n++;
  ctx.s.shards += n;
  ctx.s.stats.shardsEarned += n;
  return n;
}

export function addHeat(ctx: Ctx, amount: number): void {
  const s = ctx.s;
  if (!s.flags.includes('heat') || amount <= 0 || s.ventTime > 0) return;
  const before = s.heat;
  s.heat = Math.min(100, s.heat + amount);
  if (before < 100 && s.heat >= 100) ctx.bus.emit('heatFull', {});
}
