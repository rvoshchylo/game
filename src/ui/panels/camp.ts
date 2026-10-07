import { buildingVisible, canAfford, nextBuildCost } from '../../core/camp';
import { storageCap } from '../../core/expedition';
import { BUILDINGS } from '../../data/buildings';
import { t } from '../../i18n';
import type { UiContext } from '../context';
import { h, setDisabled, setText, type Panel } from '../dom';
import { sprite } from '../sprites';
import { costText } from './rig';

export class CampPanel implements Panel {
  id = 'camp';
  private btns: { id: string; el: HTMLButtonElement }[] = [];
  private capEl: HTMLElement | null = null;

  constructor(private ui: UiContext) {}

  signature(): string {
    const s = this.ui.engine.state;
    return [JSON.stringify(s.buildings), s.flags.join(',')].join('|');
  }

  build(): HTMLElement {
    const s = this.ui.engine.state;
    this.btns = [];
    this.capEl = h('div', { class: 'sub' });
    const root = h('div', { class: 'panel-inner' }, h('div', { class: 'card' }, h('div', { class: 'card-title' }, t('camp.title')), h('div', { class: 'desc' }, t('camp.desc')), this.capEl));
    for (const b of BUILDINGS) {
      if (!buildingVisible(s, b.id)) continue;
      const lvl = s.buildings[b.id] ?? 0;
      const cost = nextBuildCost(s, b.id);
      const btn = h('button', { class: 'btn buy', onclick: () => this.ui.engine.dispatch({ type: 'build', id: b.id }) }, cost ? t(lvl ? 'camp.upgrade' : 'camp.build', { cost: costText(cost) }) : t('camp.max'));
      if (cost) this.btns.push({ id: b.id, el: btn });
      else btn.disabled = true;
      root.append(
        h(
          'div',
          { class: `card ${lvl ? '' : 'site'}` },
          h('div', { class: 'row' }, sprite('onebit', b.icon, 2), h('div', { class: 'grow' }, h('div', { class: 'card-title' }, t(`bld.${b.id}.name`), ' ', h('span', { class: 'lvl' }, lvl ? t('camp.lvl', { l: lvl, m: b.levels.length }) : t('camp.site'))), h('div', { class: 'desc' }, t(`bld.${b.id}.desc`)))),
          lvl ? h('div', { class: 'sub' }, t('camp.now', { t: t(`bld.${b.id}.l${lvl}`) })) : null,
          cost ? h('div', { class: 'desc' }, t('camp.next', { t: t(`bld.${b.id}.l${lvl + 1}`) })) : null,
          h('div', { class: 'row end' }, btn),
        ),
      );
    }
    const hidden = BUILDINGS.filter((b) => !buildingVisible(s, b.id)).length;
    if (hidden) root.append(h('div', { class: 'card faint' }, t('camp.hidden', { n: hidden })));
    return root;
  }

  update(): void {
    const s = this.ui.engine.state;
    for (const b of this.btns) setDisabled(b.el, !canAfford(s, nextBuildCost(s, b.id) ?? {}));
    if (this.capEl) {
      const cap = storageCap(this.ui.engine);
      setText(this.capEl, t('camp.storage', { s: Math.floor(s.scrap), sc: cap.scrap, c: s.copper, cc: cap.copper }));
    }
  }
}
