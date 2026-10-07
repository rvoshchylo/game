import type { Sfx } from '../audio/sfx';
import type { GameEngine } from '../core/engine';
import type { Modal } from './modal';
import type { Toasts } from './toast';

export interface UiActions {
  exportSave(): string;
  importSave(text: string): string | null;
  hardReset(): void;
  saveNow(): void;
}

export interface UiContext {
  engine: GameEngine;
  sfx: Sfx;
  modal: Modal;
  toasts: Toasts;
  actions: UiActions;
}
