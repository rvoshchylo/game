import { ACHIEVEMENTS } from '../../data/achievements';
import type { Ctx } from '../context';
import { metric } from '../metrics';

export function checkAchievements(ctx: Ctx): void {
  const s = ctx.s;
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (metric(s, a.metric) >= a.threshold) {
      s.achievements.push(a.id);
      s.shards += a.rewardShards;
      s.stats.shardsEarned += a.rewardShards;
      ctx.bus.emit('achievement', { id: a.id, name: a.name });
    }
  }
}
