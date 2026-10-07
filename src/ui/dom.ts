type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;

/** Tiny hyperscript helper. `on*` attrs become listeners; `class`/`style` are passed through. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Only touch the DOM when the value actually changes. */
export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}
export function toggleClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}
export function setWidth(el: HTMLElement, ratio: number): void {
  const w = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  if (el.style.width !== w) el.style.width = w;
}

export interface Panel {
  id: string;
  /** Rebuild the panel's DOM only when this string changes. */
  signature(): string;
  build(): HTMLElement;
  /** Cheap per-frame refresh of numbers / enabled states. */
  update(): void;
}
