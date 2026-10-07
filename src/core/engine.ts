import type { Command } from './commands';
import type { Ctx } from './context';
import { EventBus } from './events';
import type { GameState } from './state';
import { computeStats, type Stats } from './stats';
import { checkAchievements } from './systems/achievements';
import { tap, tickCombat, vent } from './systems/combat';
import { tapSignal, tickSignals } from './systems/discovery';
import { equip, forge, salvage, unequip } from './systems/equipment';
import { applyOffline, type OfflineReport } from './systems/offline';
import { buyMemory, collapse, setHeirloom } from './systems/prestige';
import { collectProbe, launchProbe, tickProbes } from './systems/probes';
import { ascend, challengeWarden, checkUnlocks, setMode, tickPushReflex } from './systems/progression';
import { buyUpgrade } from './systems/upgrades';

export const TICK = 0.1;

/**
 * The whole game, headless. Render/UI/audio only read `state`, listen to `bus`
 * and call `dispatch`. Runs in Node for tests, simulation and (future) server validation.
 */
export class GameEngine implements Ctx {
  readonly bus = new EventBus();
  stats: Stats;
  now: number;
  private achievementTimer = 0;

  constructor(
    public s: GameState,
    now: number,
  ) {
    this.now = now;
    this.stats = computeStats(s);
    checkUnlocks(this);
  }

  get state(): GameState {
    return this.s;
  }

  invalidate(): void {
    this.stats = computeStats(this.s);
    this.s.integrity = Math.min(this.s.integrity, this.stats.maxIntegrity);
  }

  tick(dt: number, now: number): void {
    this.now = now;
    tickCombat(this, dt);
    tickSignals(this, dt);
    tickProbes(this);
    tickPushReflex(this, dt);
    checkUnlocks(this);
    this.achievementTimer += dt;
    if (this.achievementTimer >= 1) {
      this.achievementTimer = 0;
      checkAchievements(this);
    }
    this.s.timestamps.lastTick = now;
  }

  /** Simulate time away from the game (closed tab, hidden tab, offline). */
  catchUp(now: number): OfflineReport {
    this.now = now;
    const report = applyOffline(this, now - this.s.timestamps.lastTick);
    this.s.timestamps.lastTick = now;
    checkUnlocks(this);
    return report;
  }

  dispatch(cmd: Command): boolean {
    let ok = true;
    switch (cmd.type) {
      case 'tap':
        tap(this, cmd.nx, cmd.ny);
        break;
      case 'tapSignal':
        tapSignal(this);
        break;
      case 'vent':
        ok = vent(this);
        break;
      case 'setMode':
        setMode(this, cmd.mode);
        break;
      case 'ascend':
        ascend(this);
        break;
      case 'challengeWarden':
        ok = challengeWarden(this);
        break;
      case 'buyUpgrade':
        ok = buyUpgrade(this, cmd.id);
        break;
      case 'equip':
        ok = equip(this, cmd.uid, cmd.slot);
        break;
      case 'unequip':
        ok = unequip(this, cmd.slot);
        break;
      case 'salvage':
        ok = salvage(this, cmd.uid);
        break;
      case 'forge':
        ok = forge(this);
        break;
      case 'launchProbe':
        ok = launchProbe(this, cmd.destId, cmd.stanceId);
        break;
      case 'collectProbe':
        ok = collectProbe(this, cmd.uid);
        break;
      case 'collapse':
        ok = collapse(this, cmd.doctrineId) >= 0;
        break;
      case 'buyMemory':
        ok = buyMemory(this, cmd.id);
        break;
      case 'setHeirloom':
        ok = setHeirloom(this, cmd.uid);
        break;
    }
    checkUnlocks(this);
    return ok;
  }
}
