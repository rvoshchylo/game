import { ACHIEVEMENTS } from '../../data/achievements';
import { ITEMS } from '../../data/items';
import { LOGS } from '../../data/logs';
import { formatNumber } from '../../utils/format';
import type { UiContext } from '../context';
import { h, type Panel } from '../dom';

export class CodexPanel implements Panel {
  id = 'codex';
  constructor(private ui: UiContext) {}

  signature(): string {
    const s = this.ui.engine.state;
    return [s.logs.length, s.codex.length, s.achievements.length, Math.floor(this.ui.engine.now / 5000)].join('|');
  }

  build(): HTMLElement {
    const s = this.ui.engine.state;
    const st = s.stats;
    return h(
      'div',
      { class: 'panel-inner' },
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Echo Logs (${s.logs.length}/${LOGS.length})`),
        ...LOGS.map((l) => (s.logs.includes(l.id) ? h('div', { class: 'log' }, l.text) : h('div', { class: 'log unknown' }, '▒▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒▒▒▒ ▒▒'))),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Modules (${s.codex.length}/${ITEMS.length})`),
        h('div', { class: 'codex-grid' }, ...ITEMS.map((i) => h('div', { class: `codex-item ${s.codex.includes(i.id) ? '' : 'unknown'}` }, s.codex.includes(i.id) ? i.name : '???'))),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Achievements (${s.achievements.length}/${ACHIEVEMENTS.length})`),
        ...ACHIEVEMENTS.map((a) => h('div', { class: `ach ${s.achievements.includes(a.id) ? 'done' : ''}` }, s.achievements.includes(a.id) ? '✔ ' : '· ', h('b', {}, a.name), ` — ${a.description}`)),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, 'Records'),
        h(
          'div',
          { class: 'desc' },
          `Best depth ${s.bestDepth} · Wardens ${st.wardens} · Collapses ${st.collapses} · Destroyed ${formatNumber(st.kills)} · Fractures ${formatNumber(st.fracturesHit)} · Scrap earned ${formatNumber(st.totalScrap)} · Echoes earned ${formatNumber(st.echoesEarned)}`,
        ),
      ),
    );
  }

  update(): void {}
}
