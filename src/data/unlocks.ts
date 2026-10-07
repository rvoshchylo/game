import type { UnlockRule } from './types';

export const UNLOCKS: UnlockRule[] = [
  { flag: 'forks', metric: 'expeditions', gte: 1, message: 'The shaft branches. From now on you choose the path at every fork.' },
  { flag: 'storage', metric: 'expeditions', gte: 1, message: 'Loot is piling up. A Storage site is marked at camp.' },
  { flag: 'dock', metric: 'expeditions', gte: 2, message: 'The robot limps home. A Repair Dock site is marked at camp.' },
  { flag: 'dock', metric: 'breakdowns', gte: 1, message: 'The robot limps home. A Repair Dock site is marked at camp.' },
  { flag: 'forge', metric: 'modulesCrafted', gte: 3, message: 'Spare modules rattle in the Workshop. A Forge site is marked at camp.' },
  { flag: 'radio', metric: 'expeditions', gte: 4, message: 'You could teach the robot to choose for itself. A Radio Tower site is marked at camp.' },
];
