import type { EventBus } from './events';
import type { GameState } from './state';
import type { Stats } from './stats';

/** What every system receives. Implemented by GameEngine. */
export interface Ctx {
  s: GameState;
  bus: EventBus;
  stats: Stats;
  /** Wall-clock ms (injected; never read from Date inside core). */
  now: number;
  invalidate(): void;
}
