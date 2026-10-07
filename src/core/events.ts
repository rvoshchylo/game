import type { ItemInstance, ProbeRun } from './state';

/** Everything presentation layers may react to. Core never imports render/ui/audio. */
export interface GameEvents {
  strike: { dmg: number; nx: number; ny: number };
  fractureHit: { dmg: number; nx: number; ny: number; chain: number; governed: boolean; shards: number };
  fractureSpawn: { nx: number; ny: number; life: number };
  fractureExpire: Record<string, never>;
  autoDamage: { dmg: number };
  enemySpawn: { defId: string; isBoss: boolean };
  enemyKilled: { defId: string; isBoss: boolean; scrap: number };
  enemyFled: { defId: string };
  enemyAttack: { dmg: number };
  tollWarn: Record<string, never>;
  toll: { dmg: number };
  counterToll: Record<string, never>;
  bossPhase: { index: number; name: string; description: string };
  bossDefeated: { bossId: string; firstKill: boolean };
  bossFailed: { reason: 'timer' | 'integrity' };
  depthChanged: { depth: number; dir: 1 | -1 };
  retreat: { depth: number };
  ventStart: { duration: number };
  ventEnd: Record<string, never>;
  heatFull: Record<string, never>;
  unlock: { flag: string; message: string };
  itemFound: { item: ItemInstance; source: 'drop' | 'forge' | 'boss' | 'probe' | 'signal' };
  probeDone: { probe: ProbeRun };
  probeCollected: { probe: ProbeRun };
  signalSpawn: { nx: number; ny: number };
  signalExpire: Record<string, never>;
  signalResult: { text: string };
  logFound: { id: string };
  achievement: { id: string; name: string };
  collapsed: { echoes: number };
  upgradeBought: { id: string; level: number };
  error: { text: string };
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
