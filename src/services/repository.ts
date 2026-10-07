import { BOSSES, CHARACTERS, ENEMIES, META, PASSIVES, WEAPONS } from '../run/data';

export interface ContentBundle {
  weapons: typeof WEAPONS;
  passives: typeof PASSIVES;
  enemies: typeof ENEMIES;
  bosses: typeof BOSSES;
  characters: typeof CHARACTERS;
  meta: typeof META;
}

/** Where content definitions come from. Local = bundled; Remote = live-ops / seasonal content. */
export interface GameRepository {
  loadContent(): Promise<ContentBundle>;
}

export class LocalGameRepository implements GameRepository {
  async loadContent(): Promise<ContentBundle> {
    return { weapons: WEAPONS, passives: PASSIVES, enemies: ENEMIES, bosses: BOSSES, characters: CHARACTERS, meta: META };
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
