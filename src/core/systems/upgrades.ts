import { upgradeById } from '../../data/upgrades';
import type { UpgradeDefinition, UpgradeId } from '../../data/types';
import type { Ctx } from '../context';
import { upgradeCost } from '../formulas';
import type { GameState } from '../state';

export const costOf = (s: GameState, u: UpgradeDefinition): number => upgradeCost(u.baseCost, u.growth, s.upgrades[u.id]);

export const isMaxed = (s: GameState, u: UpgradeDefinition): boolean => u.max !== undefined && s.upgrades[u.id] >= u.max;

export const upgradeVisible = (s: GameState, u: UpgradeDefinition): boolean => u.flag === null || s.flags.includes(u.flag);

export function buyUpgrade(ctx: Ctx, id: UpgradeId): boolean {
  const s = ctx.s;
  const u = upgradeById(id);
  if (!upgradeVisible(s, u) || isMaxed(s, u)) return false;
  const cost = costOf(s, u);
  if (s.scrap < cost) return false;
  s.scrap -= cost;
  s.upgrades[id]++;
  const before = ctx.stats.maxIntegrity;
  ctx.invalidate();
  if (id === 'plating') s.integrity += ctx.stats.maxIntegrity - before;
  ctx.bus.emit('upgradeBought', { id, level: s.upgrades[id] });
  return true;
}
