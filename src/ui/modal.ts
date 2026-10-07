import { h } from './dom';

export class Modal {
  private root = h('div', { class: 'modal-backdrop hidden', role: 'dialog', 'aria-modal': 'true' });
  private onClose: (() => void) | null = null;
  private reopenFn: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** `reopen` rebuilds the same dialog (used after a language switch). */
  open(title: string, body: HTMLElement, actions: HTMLElement[] = [], onClose?: () => void, reopen?: () => void): void {
    this.onClose = onClose ?? null;
    this.reopenFn = reopen ?? null;
    this.root.replaceChildren(
      h(
        'div',
        { class: 'modal' },
        h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { class: 'btn ghost icon', 'aria-label': '✕', onclick: () => this.close() }, '✕')),
        h('div', { class: 'modal-body' }, body),
        actions.length ? h('div', { class: 'modal-actions' }, ...actions) : null,
      ),
    );
    this.root.classList.remove('hidden');
  }

  /** Rebuild the open dialog without firing its onClose. */
  get reopen(): (() => void) | null {
    const fn = this.reopenFn;
    if (!fn || !this.isOpen) return null;
    return () => {
      this.onClose = null;
      this.close();
      fn();
    };
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.root.replaceChildren();
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }
}
