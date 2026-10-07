import type { SlotId, UpgradeId } from '../data/types';

/** Every player intent. Future: logged with timestamps for server-side replay validation. */
export type Command =
  | { type: 'tap'; nx: number; ny: number }
  | { type: 'tapSignal' }
  | { type: 'vent' }
  | { type: 'setMode'; mode: 'push' | 'hold' }
  | { type: 'ascend' }
  | { type: 'challengeWarden' }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'equip'; uid: string; slot: SlotId }
  | { type: 'unequip'; slot: SlotId }
  | { type: 'salvage'; uid: string }
  | { type: 'forge' }
  | { type: 'launchProbe'; destId: string; stanceId: string }
  | { type: 'collectProbe'; uid: string }
  | { type: 'collapse'; doctrineId: string }
  | { type: 'buyMemory'; id: string }
  | { type: 'setHeirloom'; uid: string | null };
