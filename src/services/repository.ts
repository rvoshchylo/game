import { ACHIEVEMENTS } from '../data/achievements';
import { BOSSES } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { EXPEDITIONS } from '../data/probes';
import { UPGRADES } from '../data/upgrades';
import { ZONES } from '../data/zones';

export interface ContentBundle {
  enemies: typeof ENEMIES;
  bosses: typeof BOSSES;
  items: typeof ITEMS;
  upgrades: typeof UPGRADES;
  zones: typeof ZONES;
  expeditions: typeof EXPEDITIONS;
  achievements: typeof ACHIEVEMENTS;
}

/** Where content definitions come from. Local = bundled; Remote = live-ops / seasonal content. */
export interface GameRepository {
  loadContent(): Promise<ContentBundle>;
}

export class LocalGameRepository implements GameRepository {
  async loadContent(): Promise<ContentBundle> {
    return { enemies: ENEMIES, bosses: BOSSES, items: ITEMS, upgrades: UPGRADES, zones: ZONES, expeditions: EXPEDITIONS, achievements: ACHIEVEMENTS };
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
