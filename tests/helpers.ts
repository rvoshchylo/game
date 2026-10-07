import { GameEngine, TICK } from '../src/core/engine';
import { createInitialState, type GameState } from '../src/core/state';

export const T0 = 1_700_000_000_000;

export function makeEngine(mut?: (s: GameState) => void): GameEngine {
  const s = createInitialState(T0, 42);
  mut?.(s);
  return new GameEngine(s, T0);
}

export function run(eng: GameEngine, seconds: number, onTick?: () => void): void {
  for (let t = 0; t < seconds; t += TICK) {
    onTick?.();
    eng.tick(TICK, eng.now + TICK * 1000);
  }
}
