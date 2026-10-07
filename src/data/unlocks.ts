import type { UnlockRule } from './types';

export const UNLOCKS: UnlockRule[] = [
  { flag: 'forks', metric: 'expeditions', gte: 1 },
  { flag: 'storage', metric: 'expeditions', gte: 1 },
  { flag: 'dock', metric: 'expeditions', gte: 2 },
  { flag: 'dock', metric: 'breakdowns', gte: 1 },
  { flag: 'forge', metric: 'modulesCrafted', gte: 3 },
  { flag: 'radio', metric: 'expeditions', gte: 4 },
];
