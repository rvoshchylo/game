import { BUILDINGS } from '../data/buildings';
import { BOSSES, ENEMIES } from '../data/enemies';
import { EVENTS } from '../data/events';
import { MODULES } from '../data/modules';
import { STRATA } from '../data/strata';

export interface ContentBundle {
  modules: typeof MODULES;
  enemies: typeof ENEMIES;
  bosses: typeof BOSSES;
  strata: typeof STRATA;
  buildings: typeof BUILDINGS;
  events: typeof EVENTS;
}

/** Where content definitions come from. Local = bundled; Remote = live-ops / seasonal content. */
export interface GameRepository {
  loadContent(): Promise<ContentBundle>;
}

export class LocalGameRepository implements GameRepository {
  async loadContent(): Promise<ContentBundle> {
    return { modules: MODULES, enemies: ENEMIES, bosses: BOSSES, strata: STRATA, buildings: BUILDINGS, events: EVENTS };
  }
}

export class RemoteGameRepository implements GameRepository {
  constructor(private baseUrl: string) {}
  async loadContent(): Promise<ContentBundle> {
    const res = await fetch(`${this.baseUrl}/content.json`);
    if (!res.ok) throw new Error(`Content fetch failed: ${res.status}`);
    return (await res.json()) as ContentBundle;
  }
}
