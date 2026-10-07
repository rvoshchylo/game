import { BOSSES, ENEMIES } from '../../data/enemies';
import { COMBOS, LORE_COUNT } from '../../data/lore';
import { MODULES } from '../../data/modules';
import type { JournalEntry } from '../../core/state';
import { t } from '../../i18n';
import { formatNumber } from '../../utils/format';
import type { UiContext } from '../context';
import { h, type Panel } from '../dom';
import { sprite } from '../sprites';

export const journalText = (j: JournalEntry): string => (j.k ? t(j.k, j.p) : (j.text ?? ''));

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
    const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return h(
      'div',
      { class: 'panel-inner' },
      h('div', { class: 'card' }, h('div', { class: 'card-title' }, t('jr.title')), ...[...s.journal].reverse().slice(0, 40).map((j) => h('div', { class: 'log' }, h('span', { class: 'lvl' }, time(j.t)), ' ', journalText(j)))),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, t('jr.bestiary', { n: s.seenEnemies.length, m: ENEMIES.length + BOSSES.length })),
        h(
          'div',
          { class: 'codex-grid' },
          ...ENEMIES.map((e) => {
            const seen = s.seenEnemies.includes(e.id);
            return h('div', { class: `codex-item ${seen ? '' : 'unknown'}` }, seen ? sprite('tiny', e.frame, 2) : null, seen ? t(`enemy.${e.id}`) : '???');
          }),
          ...BOSSES.map((b) => h('div', { class: `codex-item ${s.seenEnemies.includes(b.id) ? '' : 'unknown'}` }, s.seenEnemies.includes(b.id) ? t(`boss.${b.id}.name`) : t('jr.unknownWarden'))),
        ),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, t('jr.lore', { n: s.lore, m: LORE_COUNT })),
        ...Array.from({ length: LORE_COUNT }, (_, i) => h('div', { class: `log ${i < s.lore ? '' : 'unknown'}` }, i < s.lore ? t(`lore.${i}`) : '▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒▒▒')),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, t('jr.combos', { n: s.combos.length, m: COMBOS.length })),
        ...COMBOS.map((c) => h('div', { class: `log ${s.combos.includes(c.id) ? '' : 'unknown'}` }, s.combos.includes(c.id) ? `${t(`combo.${c.id}.name`)} — ${t(`combo.${c.id}.text`)}` : t('jr.comboUnknown'))),
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, t('jr.records')),
        h(
          'div',
          { class: 'desc' },
          t('jr.recordsText', {
            e: st.expeditions,
            b: st.breakdowns,
            f: st.fightsWon,
            el: st.elitesWon,
            w: st.bossesWon,
            bp: s.blueprints.length,
            bpm: MODULES.length,
            mc: st.modulesCrafted,
            mg: st.merges,
            s: formatNumber(st.scrapEarned),
            c: formatNumber(st.copperEarned),
          }),
        ),
      ),
    );
  }

  update(): void {}
}
