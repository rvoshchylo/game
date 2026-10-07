import type { AchievementDefinition } from './types';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_blood', name: 'First Turn', description: 'Destroy 10 things.', metric: 'kills', threshold: 10, rewardShards: 2 },
  { id: 'cracksman', name: 'Cracksman', description: 'Strike 100 fractures.', metric: 'fracturesHit', threshold: 100, rewardShards: 10 },
  { id: 'deeper', name: 'Deeper Still', description: 'Reach depth 8.', metric: 'bestDepth', threshold: 8, rewardShards: 5 },
  { id: 'bellbreaker', name: 'Bellbreaker', description: 'Defeat a Warden.', metric: 'wardens', threshold: 1, rewardShards: 15 },
  { id: 'vented', name: 'Pressure Release', description: 'Vent 10 times.', metric: 'ventsUsed', threshold: 10, rewardShards: 5 },
  { id: 'courier', name: 'Courier', description: 'Send 5 probes.', metric: 'probesSent', threshold: 5, rewardShards: 8 },
  { id: 'listener', name: 'Listener', description: 'Answer 3 strange signals.', metric: 'signalsTapped', threshold: 3, rewardShards: 6 },
  { id: 'counter', name: 'Counter-Toll', description: 'Silence the Bell mid-toll.', metric: 'countersTolled', threshold: 1, rewardShards: 10 },
  { id: 'collapse1', name: 'Remember', description: 'Collapse the shaft once.', metric: 'collapses', threshold: 1, rewardShards: 0 },
  { id: 'depth25', name: 'Rust in Your Joints', description: 'Reach depth 25.', metric: 'bestDepth', threshold: 25, rewardShards: 25 },
  { id: 'smith', name: 'Smith', description: 'Forge 10 modules.', metric: 'itemsForged', threshold: 10, rewardShards: 10 },
];
