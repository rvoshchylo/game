import { enemyById } from '../../data/enemies';
import { zoneForDepth } from '../../data/zones';
import type { Ctx } from '../context';
import * as F from '../formulas';
import { isBossAt } from './progression';
import { gainScrap } from './economy';

export interface OfflineReport {
  elapsedSec: number;
  countedSec: number;
  capped: boolean;
  kills: number;
  scrap: number;
  farmDepth: number;
  depthLost: number;
  probesReady: number;
  clockAnomaly: boolean;
}

interface Averages {
  hp: number;
  scrap: number;
  incomingDps: number;
}

export function averagesAt(ctx: Ctx, depth: number): Averages {
  const zone = zoneForDepth(depth);
  const pool = zone.enemies.map(enemyById).filter((e) => e.minDepth <= depth);
  const total = pool.reduce((t, e) => t + e.weight, 0);
  let hp = 0;
  let scrap = 0;
  let dps = 0;
  for (const e of pool) {
    const w = e.weight / total;
    hp += w * F.enemyHp(depth) * e.hpMul * ctx.stats.enemyHpMul;
    scrap += w * F.scrapReward(depth) * e.scrapMul * ctx.stats.scrapMul;
    dps += w * ((F.enemyDamage(depth) * e.atkMul) / e.attackInterval);
  }
  return { hp, scrap, incomingDps: dps };
}

/** Can the drill alone hold this depth without falling? */
export function sustainable(ctx: Ctx, depth: number): boolean {
  const dps = ctx.stats.autoDps;
  if (dps <= 0) return false;
  const a = averagesAt(ctx, depth);
  const ttk = a.hp / dps;
  const netLoss = (a.incomingDps - ctx.stats.regen) * ttk;
  return netLoss < ctx.stats.maxIntegrity * 0.8;
}

/**
 * Idle progress for time away. Farms (never pushes) at the deepest sustainable depth,
 * at OFFLINE_EFFICIENCY. Probes are wall-clock based and finish on their own.
 */
export function applyOffline(ctx: Ctx, elapsedMs: number): OfflineReport {
  const s = ctx.s;
  const report: OfflineReport = {
    elapsedSec: Math.max(0, elapsedMs / 1000),
    countedSec: 0,
    capped: false,
    kills: 0,
    scrap: 0,
    farmDepth: s.depth,
    depthLost: 0,
    probesReady: 0,
    clockAnomaly: false,
  };
  if (elapsedMs < 0) {
    s.stats.clockAnomalies++;
    report.clockAnomaly = true;
    return report;
  }
  const capSec = ctx.stats.offlineCapHours * 3600;
  const sec = Math.min(elapsedMs / 1000, capSec);
  report.countedSec = sec;
  report.capped = elapsedMs / 1000 > capSec;

  let d = s.depth;
  if (isBossAt(s, d)) d--;
  if (ctx.stats.autoDps > 0) while (d > 1 && !sustainable(ctx, d)) d--;
  report.farmDepth = d;
  report.depthLost = s.depth - d;
  if (d !== s.depth) {
    s.depth = d;
    s.kills = 0;
    s.mode = 'hold';
    s.enemy = null;
    s.spawnDelay = F.SPAWN_DELAY;
  }

  if (ctx.stats.autoDps > 0 && sustainable(ctx, d)) {
    const a = averagesAt(ctx, d);
    const kills = Math.floor((sec * ctx.stats.autoDps * F.OFFLINE_EFFICIENCY) / a.hp);
    const scrap = kills * a.scrap;
    gainScrap(ctx, scrap);
    s.stats.kills += kills;
    report.kills = kills;
    report.scrap = scrap;
  }
  s.integrity = ctx.stats.maxIntegrity;
  report.probesReady = s.probes.filter((p) => !p.notified && ctx.now >= p.startedAt + p.durationMs).length;
  return report;
}
