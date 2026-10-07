import { expeditionById, EXPEDITIONS, stanceById } from '../../data/probes';
import type { ExpeditionDefinition } from '../../data/types';
import type { Ctx } from '../context';
import { scrapReward } from '../formulas';
import { meets } from '../metrics';
import { nextRandom } from '../rng';
import { newUid, type GameState, type ProbeOutcome, type ProbeRun } from '../state';
import { pickHiddenLog, discoverLog } from './discovery';
import { gainScrap, gainShards } from './economy';
import { grantItem, randomDroppable, rollRarity } from './equipment';

export const probeCost = (s: GameState, d: ExpeditionDefinition): number => Math.ceil(d.costMul * scrapReward(s.maxDepth) * 10);

export const probeUnlocked = (s: GameState, d: ExpeditionDefinition): boolean =>
  'flag' in d.unlock ? s.flags.includes(d.unlock.flag) : meets(s, d.unlock);

export const probeRisk = (s: GameState, d: ExpeditionDefinition, stanceId: string): number =>
  Math.min(0.95, d.risk * stanceById(stanceId).riskMul * Math.pow(0.9, s.upgrades.hull));

export const probeEndsAt = (p: ProbeRun): number => p.startedAt + p.durationMs;

export function launchProbe(ctx: Ctx, destId: string, stanceId: string): boolean {
  const s = ctx.s;
  const dest = expeditionById(destId);
  const stance = stanceById(stanceId);
  if (!s.flags.includes('probes') || !probeUnlocked(s, dest)) return false;
  if (s.probes.length >= ctx.stats.probeSlots) {
    ctx.bus.emit('error', { text: 'All probe slots are busy' });
    return false;
  }
  const cost = probeCost(s, dest);
  if (s.scrap < cost) return false;

  const risk = probeRisk(s, dest, stanceId);
  const success = nextRandom(s) >= risk;
  const mul = stance.rewardMul;
  const depthScale = 1 + s.maxDepth / 20;
  const r = dest.rewards;
  let item: ProbeOutcome['item'] = null;
  if (success && r.itemChance > 0 && nextRandom(s) < Math.min(1, r.itemChance * mul)) {
    item = { defId: randomDroppable(ctx), rarity: rollRarity(ctx, r.minRarity) };
  }
  const logId = success && nextRandom(s) < r.logChance ? pickHiddenLog(ctx) : null;
  const outcome: ProbeOutcome = {
    success,
    scrap: success ? Math.round(r.scrapKills * scrapReward(s.maxDepth) * mul * ctx.stats.scrapMul) : 0,
    shards: Math.round(r.shards * mul * depthScale * (success ? 1 : 0.2)),
    item,
    logId,
  };
  s.scrap -= cost;
  s.stats.probesSent++;
  s.probes.push({
    uid: newUid(s),
    destId,
    stanceId,
    startedAt: ctx.now,
    durationMs: Math.round(dest.duration * 1000 * ctx.stats.probeTimeMul),
    cost,
    risk,
    outcome,
    notified: false,
  });
  return true;
}

export function tickProbes(ctx: Ctx): void {
  for (const p of ctx.s.probes) {
    if (!p.notified && ctx.now >= probeEndsAt(p)) {
      p.notified = true;
      ctx.bus.emit('probeDone', { probe: p });
    }
  }
}

export function collectProbe(ctx: Ctx, uid: string): boolean {
  const s = ctx.s;
  const p = s.probes.find((x) => x.uid === uid);
  if (!p || ctx.now < probeEndsAt(p)) return false;
  s.probes = s.probes.filter((x) => x.uid !== uid);
  const o = p.outcome;
  gainScrap(ctx, o.scrap);
  gainShards(ctx, o.shards, () => 0);
  if (o.item) grantItem(ctx, o.item.defId, o.item.rarity, 'probe');
  if (o.logId) discoverLog(ctx, o.logId);
  ctx.bus.emit('probeCollected', { probe: p });
  return true;
}

export const availableExpeditions = (s: GameState): ExpeditionDefinition[] => EXPEDITIONS.filter((d) => probeUnlocked(s, d));
