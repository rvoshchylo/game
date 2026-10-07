import { GameEngine, TICK } from '../src/core/engine';
import { createInitialState, type GameState } from '../src/core/state';

export const T0 = 1_700_000_000_000;

export function makeEngine(mut?: (s: GameState) => void): GameEngine {
  const s = createInitialState(T0, 42);
  mut?.(s);
  return new GameEngine(s, T0);
}

export function run(eng: GameEngine, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += TICK) {
    each?.();
    eng.tick(TICK, eng.now + TICK * 1000);
  }
}

/** Run until the robot is back at camp (or the time limit). */
export function runExpedition(eng: GameEngine, limit = 900): void {
  for (let t = 0; t < limit && eng.state.exp; t += TICK) eng.tick(TICK, eng.now + TICK * 1000);
}
