import { UNLOCKS } from '../../data/unlocks';
import { zoneForDepth } from '../../data/zones';
import type { Ctx } from '../context';
import { isBossDepth, SPAWN_DELAY } from '../formulas';
import { meets } from '../metrics';
import { checkDepthLogs } from './discovery';
import type { GameState } from '../state';

/** A Warden depth that has not been broken yet this run. */
export const isBossAt = (s: GameState, depth: number): boolean =>
  isBossDepth(depth, zoneForDepth(depth).bossEvery) && !s.clearedWardens.includes(depth);

/** The Warden waits for a deliberate challenge — push never walks into it. */
export function canChallenge(ctx: Ctx): boolean {
  const s = ctx.s;
  return isBossAt(s, s.depth + 1) && s.kills >= ctx.stats.killsPerDepth && !s.enemy?.isBoss;
}

export function advance(ctx: Ctx): void {
  const s = ctx.s;
  s.depth++;
  s.kills = 0;
  s.maxDepth = Math.max(s.maxDepth, s.depth);
  s.bestDepth = Math.max(s.bestDepth, s.depth);
  s.stats.maxDepth = s.maxDepth;
  s.stats.bestDepth = s.bestDepth;
  if (s.enemy) {
    s.enemy = null;
    s.spawnDelay = SPAWN_DELAY;
  }
  ctx.bus.emit('depthChanged', { depth: s.depth, dir: 1 });
  checkDepthLogs(ctx);
}

export function onKillProgress(ctx: Ctx): void {
  const s = ctx.s;
  s.kills++;
  if (s.mode === 'push' && s.kills >= ctx.stats.killsPerDepth && !isBossAt(s, s.depth + 1)) advance(ctx);
}

export function setMode(ctx: Ctx, mode: 'push' | 'hold'): void {
  const s = ctx.s;
  s.mode = mode;
  s.pushReflexTimer = 0;
  if (mode === 'push' && s.kills >= ctx.stats.killsPerDepth && !isBossAt(s, s.depth + 1) && !s.enemy?.isBoss) advance(ctx);
}

export function ascend(ctx: Ctx): void {
  const s = ctx.s;
  if (s.depth <= 1) return;
  s.depth--;
  if (isBossAt(s, s.depth)) s.depth--;
  s.kills = 0;
  s.mode = 'hold';
  s.enemy = null;
  s.spawnDelay = SPAWN_DELAY;
  ctx.bus.emit('depthChanged', { depth: s.depth, dir: -1 });
}

export function challengeWarden(ctx: Ctx): boolean {
  if (!canChallenge(ctx)) return false;
  advance(ctx);
  return true;
}

export function checkUnlocks(ctx: Ctx): void {
  const s = ctx.s;
  for (const rule of UNLOCKS) {
    if (s.flags.includes(rule.flag)) continue;
    if (rule.when.every((c) => meets(s, c))) {
      s.flags.push(rule.flag);
      ctx.bus.emit('unlock', { flag: rule.flag, message: rule.message });
    }
  }
}

export function tickPushReflex(ctx: Ctx, dt: number): void {
  const s = ctx.s;
  if (s.pushReflexTimer <= 0) return;
  s.pushReflexTimer -= dt;
  if (s.pushReflexTimer <= 0) setMode(ctx, 'push');
}
