import { DROPPABLE_ITEMS } from '../../data/items';
import { LOGS, SIGNAL_OUTCOMES } from '../../data/logs';
import type { Ctx } from '../context';
import { scrapReward } from '../formulas';
import { nextRandom, randRange, weightedPick } from '../rng';
import { gainScrap, gainShards } from './economy';
import { grantItem, rollRarity } from './equipment';

export function discoverLog(ctx: Ctx, id: string): void {
  if (ctx.s.logs.includes(id)) return;
  ctx.s.logs.push(id);
  ctx.bus.emit('logFound', { id });
}

/** A log that is only found off the beaten path (probes, rare creatures). */
export function pickHiddenLog(ctx: Ctx): string | null {
  const pool = LOGS.filter((l) => l.depth === undefined && !ctx.s.logs.includes(l.id) && l.id !== 'log_counter' && l.id !== 'log_collapse');
  if (!pool.length) return null;
  return pool[Math.floor(nextRandom(ctx.s) * pool.length)].id;
}

export function checkDepthLogs(ctx: Ctx): void {
  for (const l of LOGS) if (l.depth !== undefined && l.depth <= ctx.s.depth && !ctx.s.logs.includes(l.id)) discoverLog(ctx, l.id);
}

export function tickSignals(ctx: Ctx, dt: number): void {
  const s = ctx.s;
  if (!s.flags.includes('signals')) return;
  if (s.signal) {
    s.signal.life -= dt;
    if (s.signal.life <= 0) {
      s.signal = null;
      ctx.bus.emit('signalExpire', {});
    }
    return;
  }
  s.nextSignalIn -= dt * ctx.stats.signalMul;
  if (s.nextSignalIn <= 0) {
    s.signal = { nx: randRange(s, 0.08, 0.92), ny: randRange(s, 0.12, 0.55), life: 10 };
    s.nextSignalIn = randRange(s, 180, 360);
    ctx.bus.emit('signalSpawn', { nx: s.signal.nx, ny: s.signal.ny });
  }
}

export function tapSignal(ctx: Ctx): void {
  const s = ctx.s;
  if (!s.signal) return;
  s.signal = null;
  s.stats.signalsTapped++;
  const outcome = weightedPick(s, SIGNAL_OUTCOMES, (o) => o.weight);
  let text = '';
  switch (outcome.id) {
    case 'cache': {
      const amount = 30 * scrapReward(s.depth) * ctx.stats.scrapMul;
      gainScrap(ctx, amount);
      text = `A buried cache: +${Math.round(amount)} Scrap`;
      break;
    }
    case 'vein': {
      const n = gainShards(ctx, 5 + Math.floor(s.depth / 2), () => nextRandom(s));
      text = `A shard vein: +${n} Shards`;
      break;
    }
    case 'ghost':
      s.ghostFractures += 10;
      text = 'Ghost Fractures: the next 10 fractures strike twice as hard';
      break;
    case 'module': {
      const def = DROPPABLE_ITEMS[Math.floor(nextRandom(s) * DROPPABLE_ITEMS.length)];
      const item = grantItem(ctx, def.id, rollRarity(ctx, 'rare'), 'signal');
      text = item ? 'Something was waiting in the signal…' : 'A module — but your rig is full. Salvaged.';
      break;
    }
  }
  ctx.bus.emit('signalResult', { text });
}
