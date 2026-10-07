import type { SaveData } from '../save/schema';

export interface SaveService {
  load(): unknown | null;
  save(data: SaveData): void;
  clear(): void;
}

const KEY = 'rustheart.save';
const BACKUP = 'rustheart.save.bak';

/** localStorage with a rolling backup of the previous good save. */
export class LocalSaveService implements SaveService {
  constructor(private storage: Storage = window.localStorage) {}

  load(): unknown | null {
    for (const key of [KEY, BACKUP]) {
      try {
        const raw = this.storage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch {
        // fall through to backup
      }
    }
    return null;
  }

  save(data: SaveData): void {
    try {
      const prev = this.storage.getItem(KEY);
      if (prev) this.storage.setItem(BACKUP, prev);
      this.storage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  clear(): void {
    this.storage.removeItem(KEY);
    this.storage.removeItem(BACKUP);
  }
}

/** Future: account-bound saves with conflict resolution (newest lastSaved wins, user can choose). */
export class CloudSaveService implements SaveService {
  load(): unknown | null {
    throw new Error('CloudSaveService is not available in the single-player build');
  }
  save(): void {
    throw new Error('CloudSaveService is not available in the single-player build');
  }
  clear(): void {}
}
