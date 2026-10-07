import { h } from './dom';

export type ToastKind = 'info' | 'unlock' | 'loot' | 'danger' | 'lore';

export class Toasts {
  private root = h('div', { class: 'toasts', 'aria-live': 'polite' });

  constructor(parent: HTMLElement) {
    parent.append(this.root);
  }

  show(text: string, kind: ToastKind = 'info', ms = 3600): void {
    const el = h('div', { class: `toast toast-${kind}` }, text);
    this.root.append(el);
    while (this.root.children.length > 4) this.root.firstElementChild?.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, ms);
  }
}
