import { place, build, checkCombos, checkUnlocks, craft, merge, salvage, setAutopilot, tickCamp, unplace } from './camp';
import type { Command } from './commands';
import type { Ctx } from './context';
import { EventBus } from './events';
import { choose, eventChoice, launch, recall, tickExpedition } from './expedition';
import { computeRig, type RigStats } from './grid';
import type { GameState } from './state';

export const TICK = 0.1;
export const OFFLINE_STEP = 0.25;
export const OFFLINE_CAP_HOURS = 8;

export interface OfflineReport {
  elapsedSec: number;
  countedSec: number;
  capped: boolean;
  expeditions: number;
  scrap: number;
  copper: number;
  cores: number;
  breakdowns: number;
  journal: string[];
  clockAnomaly: boolean;
}

/**
 * The whole game, headless. Render/UI/audio only read `state`, listen to `bus`
 * and call `dispatch`. Runs in Node for tests, simulation and offline catch-up.
 */
export class GameEngine implements Ctx {
  readonly bus = new EventBus();
  rig: RigStats;
  now: number;
  interactive = true;

  constructor(
    public s: GameState,
    now: number,
  ) {
    this.now = now;
    this.rig = computeRig(s);
    this.s.robot.hp = Math.min(this.s.robot.hp, this.rig.maxHp);
    checkUnlocks(this);
    checkCombos(this);
  }

  get state(): GameState {
    return this.s;
  }

  invalidate(): void {
    this.rig = computeRig(this.s);
    const r = this.s.robot;
    r.hp = Math.min(r.hp, this.rig.maxHp);
    r.shield = Math.min(r.shield, this.rig.shieldMax);
    checkCombos(this);
    this.bus.emit('rigChanged', {});
  }

  tick(dt: number, now: number): void {
    this.now = now;
    tickCamp(this, dt);
    tickExpedition(this, dt);
    checkUnlocks(this);
    this.s.timestamps.lastTick = now;
  }

  /** Time away is simulated with the exact same rules, just faster and without a player. */
  catchUp(now: number): OfflineReport {
    const s = this.s;
    const elapsedMs = now - s.timestamps.lastTick;
    const report: OfflineReport = {
      elapsedSec: Math.max(0, elapsedMs / 1000),
      countedSec: 0,
      capped: false,
      expeditions: 0,
      scrap: 0,
      copper: 0,
      cores: 0,
      breakdowns: 0,
      journal: [],
      clockAnomaly: false,
    };
    if (elapsedMs < 0) {
      s.stats.clockAnomalies++;
      report.clockAnomaly = true;
      s.timestamps.lastTick = now;
      return report;
    }
    const cap = OFFLINE_CAP_HOURS * 3600;
    const sec = Math.min(elapsedMs / 1000, cap);
    report.countedSec = sec;
    report.capped = elapsedMs / 1000 > cap;
    const before = { scrap: s.stats.scrapEarned, copper: s.stats.copperEarned, cores: s.cores, exp: s.stats.expeditions, br: s.stats.breakdowns, j: s.journal.length, last: s.journal[s.journal.length - 1] };
    const wasInteractive = this.interactive;
    this.interactive = false;
    const start = s.timestamps.lastTick;
    for (let t = 0; t < sec; t += OFFLINE_STEP) this.tick(Math.min(OFFLINE_STEP, sec - t), start + (t + OFFLINE_STEP) * 1000);
    this.interactive = wasInteractive;
    s.timestamps.lastTick = now;
    this.now = now;
    report.scrap = s.stats.scrapEarned - before.scrap;
    report.copper = s.stats.copperEarned - before.copper;
    report.cores = s.cores - before.cores;
    report.expeditions = s.stats.expeditions - before.exp;
    report.breakdowns = s.stats.breakdowns - before.br;
    const idx = s.journal.lastIndexOf(before.last!);
    report.journal = s.journal.slice(idx + 1).map((j) => j.text);
    return report;
  }

  dispatch(cmd: Command): boolean {
    let ok = true;
    switch (cmd.type) {
      case 'launch':
        ok = launch(this, cmd.tier);
        break;
      case 'recall':
        recall(this);
        break;
      case 'choose':
        ok = choose(this, cmd.index);
        break;
      case 'eventChoice':
        ok = eventChoice(this, cmd.index);
        break;
      case 'place':
        ok = place(this, cmd.uid, { x: cmd.x, y: cmd.y, rot: cmd.rot });
        break;
      case 'unplace':
        ok = unplace(this, cmd.uid);
        break;
      case 'craft':
        ok = craft(this, cmd.defId);
        break;
      case 'merge':
        ok = merge(this, cmd.uid);
        break;
      case 'salvage':
        ok = salvage(this, cmd.uid);
        break;
      case 'build':
        ok = build(this, cmd.id);
        break;
      case 'setAutopilot':
        ok = setAutopilot(this, cmd.patch);
        break;
    }
    checkUnlocks(this);
    return ok;
  }
}
