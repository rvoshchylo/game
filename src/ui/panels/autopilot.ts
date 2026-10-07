import { nodeLabel } from '../../core/expedition';
import type { Autopilot } from '../../core/state';
import type { UiContext } from '../context';
import { h, type Panel } from '../dom';
import { NODE_ICON, sprite } from '../sprites';

/** Radio Tower: the rules the robot follows when you are not choosing for it. */
export class AutopilotPanel implements Panel {
  id = 'autopilot';
  constructor(private ui: UiContext) {}

  signature(): string {
    const s = this.ui.engine.state;
    return JSON.stringify(s.autopilot) + s.buildings.radio;
  }

  private set(patch: Partial<Autopilot>): void {
    this.ui.engine.dispatch({ type: 'setAutopilot', patch });
  }

  build(): HTMLElement {
    const s = this.ui.engine.state;
    const ap = s.autopilot;
    const radio = s.buildings.radio ?? 0;
    const root = h('div', { class: 'panel-inner' });
    root.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, 'Autopilot'),
        h('div', { class: 'desc' }, 'When you do not choose a path within a few seconds — or while you are away — the robot decides by these rules. It always takes a Rest when below 50% hull.'),
        radio ? null : h('div', { class: 'hint' }, 'Build a Radio Tower to edit the rules. Until then the robot uses the defaults below.'),
      ),
    );
    const list = h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Path priority'));
    ap.priority.forEach((t, i) => {
      const move = (d: number) => {
        const p = [...ap.priority];
        const j = i + d;
        if (j < 0 || j >= p.length) return;
        [p[i], p[j]] = [p[j], p[i]];
        this.set({ priority: p });
      };
      list.append(
        h(
          'div',
          { class: 'prio-row' },
          h('b', {}, `${i + 1}.`),
          sprite('onebit', NODE_ICON[t], 2),
          h('span', { class: 'grow' }, nodeLabel(t)),
          h('button', { class: 'btn ghost icon', disabled: !radio || i === 0, 'aria-label': 'Move up', onclick: () => move(-1) }, '▲'),
          h('button', { class: 'btn ghost icon', disabled: !radio || i === ap.priority.length - 1, 'aria-label': 'Move down', onclick: () => move(1) }, '▼'),
        ),
      );
    });
    root.append(list);

    const slider = (label: string, value: number, min: number, max: number, enabled: boolean, onChange: (v: number) => void, fmt: (v: number) => string) => {
      const out = h('b', {}, fmt(value));
      const input = h('input', { type: 'range', min, max, step: 5, disabled: !enabled }) as HTMLInputElement;
      input.value = String(value);
      input.addEventListener('input', () => (out.textContent = fmt(Number(input.value))));
      input.addEventListener('change', () => onChange(Number(input.value)));
      return h('label', { class: 'setting col-setting' }, h('span', {}, label, ' ', out), input);
    };
    const toggle = (label: string, value: boolean, enabled: boolean, onChange: (v: boolean) => void) => {
      const input = h('input', { type: 'checkbox', disabled: !enabled }) as HTMLInputElement;
      input.checked = value;
      input.addEventListener('change', () => onChange(input.checked));
      return h('label', { class: 'setting' }, input, ' ', label);
    };
    root.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, 'Return rules'),
        slider('Head home when hull drops below', ap.returnHpPct, 0, 80, radio >= 1, (v) => this.set({ returnHpPct: v }), (v) => `${v}%`),
        toggle('Head home when the cargo is full', ap.returnWhenFull, radio >= 1, (v) => this.set({ returnWhenFull: v })),
        radio >= 2
          ? slider('Skip elites when hull is below', ap.avoidEliteHpPct, 0, 100, true, (v) => this.set({ avoidEliteHpPct: v }), (v) => (v ? `${v}%` : 'off'))
          : h('div', { class: 'hint' }, '▒▒ Radio Tower 2: avoid elites when hurt.'),
        radio >= 3
          ? toggle('Relaunch automatically when repaired', ap.relaunch, true, (v) => this.set({ relaunch: v }))
          : h('div', { class: 'hint' }, '▒▒ Radio Tower 3: automatic relaunch.'),
      ),
    );
    return root;
  }

  update(): void {}
}
