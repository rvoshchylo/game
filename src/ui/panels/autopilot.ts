import { nodeLabel } from '../../core/expedition';
import type { Autopilot } from '../../core/state';
import { t } from '../../i18n';
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
        h('div', { class: 'card-title' }, t('ap.title')),
        h('div', { class: 'desc' }, t('ap.desc')),
        radio ? null : h('div', { class: 'hint' }, t('ap.needRadio')),
      ),
    );
    const list = h('div', { class: 'card' }, h('div', { class: 'card-title' }, t('ap.priority')));
    ap.priority.forEach((tp, i) => {
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
          sprite('onebit', NODE_ICON[tp], 2),
          h('span', { class: 'grow' }, nodeLabel(tp)),
          h('button', { class: 'btn ghost icon', disabled: !radio || i === 0, 'aria-label': t('ap.up'), onclick: () => move(-1) }, '▲'),
          h('button', { class: 'btn ghost icon', disabled: !radio || i === ap.priority.length - 1, 'aria-label': t('ap.down'), onclick: () => move(1) }, '▼'),
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
        h('div', { class: 'card-title' }, t('ap.rules')),
        slider(t('ap.returnHp'), ap.returnHpPct, 0, 80, radio >= 1, (v) => this.set({ returnHpPct: v }), (v) => `${v}%`),
        toggle(t('ap.returnFull'), ap.returnWhenFull, radio >= 1, (v) => this.set({ returnWhenFull: v })),
        radio >= 2
          ? slider(t('ap.avoidElite'), ap.avoidEliteHpPct, 0, 100, true, (v) => this.set({ avoidEliteHpPct: v }), (v) => (v ? `${v}%` : t('ap.off')))
          : h('div', { class: 'hint' }, t('ap.locked2')),
        radio >= 3
          ? toggle(t('ap.relaunch'), ap.relaunch, true, (v) => this.set({ relaunch: v }))
          : h('div', { class: 'hint' }, t('ap.locked3')),
      ),
    );
    return root;
  }

  update(): void {}
}
