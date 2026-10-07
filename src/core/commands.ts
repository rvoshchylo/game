import type { Autopilot } from './state';

/** Every player intent. Future: logged with timestamps for server-side replay validation. */
export type Command =
  | { type: 'launch'; tier: number }
  | { type: 'recall' }
  | { type: 'choose'; index: number }
  | { type: 'eventChoice'; index: number }
  | { type: 'place'; uid: string; x: number; y: number; rot: number }
  | { type: 'unplace'; uid: string }
  | { type: 'craft'; defId: string }
  | { type: 'merge'; uid: string }
  | { type: 'salvage'; uid: string }
  | { type: 'build'; id: string }
  | { type: 'setAutopilot'; patch: Partial<Autopilot> };
