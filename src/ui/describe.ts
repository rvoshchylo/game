import type { Condition, MetricKey } from '../data/types';

const METRIC_LABEL: Record<MetricKey, (n: number) => string> = {
  maxDepth: (n) => `reach depth ${n}`,
  bestDepth: (n) => `reach depth ${n} in any run`,
  totalScrap: (n) => `earn ${n} scrap`,
  fracturesHit: (n) => `strike ${n} fractures`,
  retreats: (n) => `retreat ${n} time${n > 1 ? 's' : ''}`,
  itemsFound: (n) => `find ${n} module${n > 1 ? 's' : ''}`,
  ventsUsed: (n) => `vent ${n} time${n > 1 ? 's' : ''}`,
  probesSent: (n) => `send ${n} probe${n > 1 ? 's' : ''}`,
  wardens: (n) => `break ${n} Warden${n > 1 ? 's' : ''}`,
  collapses: (n) => `collapse ${n} time${n > 1 ? 's' : ''}`,
  logsFound: (n) => `recover ${n} Echo Log${n > 1 ? 's' : ''}`,
  kills: (n) => `destroy ${n} things`,
  shardsEarned: (n) => `earn ${n} shards`,
  countersTolled: () => `answer the Bell`,
  signalsTapped: (n) => `answer ${n} signal${n > 1 ? 's' : ''}`,
  itemsForged: (n) => `forge ${n} module${n > 1 ? 's' : ''}`,
};

export const describeCondition = (c: Condition): string => METRIC_LABEL[c.metric](c.gte);
