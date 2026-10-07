import type { ExpeditionReport, ModuleInst } from './state';

/** Everything presentation layers may react to. Core never imports render/ui/audio. */
export interface GameEvents {
  launched: { tier: number };
  phase: { phase: string };
  choiceNeeded: Record<string, never>;
  fightStart: { enemies: { defId: string; elite: boolean; boss: boolean }[] };
  moduleFire: { uid: string; defId: string; hits: { index: number; dmg: number }[] };
  enemyAttack: { index: number };
  robotHit: { dmg: number; absorbed: number };
  enemyDie: { index: number; defId: string };
  toll: { dmg: number };
  bossPhase: Record<string, never>;
  fightEnd: { won: boolean };
  loot: { scrap: number; copper: number; stored: boolean };
  blueprint: { defId: string };
  core: Record<string, never>;
  heal: { amount: number };
  eventStart: { eventId: string };
  eventResult: { key: string };
  breakdown: Record<string, never>;
  returned: { report: ExpeditionReport };
  unlock: { flag: string };
  combo: { id: string };
  lore: { index: number };
  crafted: { module: ModuleInst };
  merged: { module: ModuleInst };
  built: { id: string; level: number };
  rigChanged: Record<string, never>;
  error: { key: string };
}

export type EventName = keyof GameEvents;
type Handler<K extends EventName> = (payload: GameEvents[K]) => void;

export class EventBus {
  private handlers: { [K in EventName]?: Handler<K>[] } = {};

  on<K extends EventName>(name: K, fn: Handler<K>): () => void {
    const list = (this.handlers[name] ??= []) as Handler<K>[];
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends EventName>(name: K, payload: GameEvents[K]): void {
    const list = this.handlers[name] as Handler<K>[] | undefined;
    if (list) for (const fn of list) fn(payload);
  }
}
