import type { EventBus } from './events';
import type { RigStats } from './grid';
import type { GameState } from './state';

/** What every system receives. Implemented by GameEngine. */
export interface Ctx {
  s: GameState;
  bus: EventBus;
  rig: RigStats;
  /** Wall-clock ms (injected; never read from Date inside core). */
  now: number;
  /** True when a player is watching and can make choices; false during offline catch-up. */
  interactive: boolean;
  invalidate(): void;
}
