import { ENEMIES, BOSSES } from '../../data/enemies';
import { COMBOS, LORE } from '../../data/lore';
import { MODULES } from '../../data/modules';
import { formatNumber } from '../../utils/format';
import type { UiContext } from '../context';
import { h, type Panel } from '../dom';
import { sprite } from '../sprites';

export class JournalPanel implements Panel {
  id = 'journal';
  constructor(private ui: UiContext) {}

  signature(): string {
    const s = this.ui.engine.state;
    return [s.journal.length, s.journal[s.journal.length - 1]?.t, s.combos.length, s.lore, s.seenEnemies.length].join('|');
  }

  build(): HTMLElement {
    const s = this.ui.engine.state;
    const st = s.stats;
    const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return h(
      'div',
      { class: 'panel-inner' },
      h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Journal'), ...[...s.journal].reverse().slice(0, 40).map((j) => h('div', { class: 'log' }, h('span', { class: 'lvl' }, time(j.t)), ' ', j.text))),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Bestiary (${s.seenEnemies.length}/${ENEMIES.length + BOSSES.length})`),
        h(
          'div',
          { class: 'codex-grid' },
          ...ENEMIES.map((e) => h('div', { class: `codex-item ${s.seenEnemies.includes(e.id) ? '' : 'unknown'}` }, s.seenEnemies.includes(e.id) ? sprite('tiny', e.frame, 2) : null, s.seenEnemies.includes(e.id) ? e.name : '???')),
          ...BOSSES.map((b) => h('div', { class: `codex-item ${s.seenEnemies.includes(b.id) ? '' : 'unknown'}` }, s.seenEnemies.includes(b.id) ? b.name : '??? (Warden)')),
        ),
      ),
      h('div', { class: 'card' }, h('div', { class: 'card-title' }, `Echo logs (${s.lore}/${LORE.length})`), ...LORE.map((l, i) => h('div', { class: `log ${i < s.lore ? '' : 'unknown'}` }, i < s.lore ? l : '▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒▒▒'))),
      h('div', { class: 'card' }, h('div', { class: 'card-title' }, `Combos (${s.combos.length}/${COMBOS.length})`), ...COMBOS.map((c) => h('div', { class: `log ${s.combos.includes(c.id) ? '' : 'unknown'}` }, s.combos.includes(c.id) ? `${c.name} — ${c.text}` : '▒▒▒ a combination not yet found'))),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, 'Records'),
        h(
          'div',
          { class: 'desc' },
          `Expeditions ${st.expeditions} · Breakdowns ${st.breakdowns} · Fights won ${st.fightsWon} · Elites ${st.elitesWon} · Wardens ${st.bossesWon} · Blueprints ${s.blueprints.length}/${MODULES.length} · Modules crafted ${st.modulesCrafted} · Merges ${st.merges} · Scrap hauled ${formatNumber(st.scrapEarned)} · Copper hauled ${formatNumber(st.copperEarned)}`,
        ),
      ),
    );
  }

  update(): void {}
}
