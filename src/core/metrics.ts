import type { Condition, MetricKey } from '../data/types';
import type { GameState } from './state';

export function metric(s: GameState, key: MetricKey): number {
  switch (key) {
    case 'maxDepth':
      return s.maxDepth;
    case 'bestDepth':
      return s.bestDepth;
    case 'logsFound':
      return s.logs.length;
    default:
      return s.stats[key];
  }
}

export const meets = (s: GameState, c: Condition): boolean => metric(s, c.metric) >= c.gte;
