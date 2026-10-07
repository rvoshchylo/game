import { buildingVisible, canAfford, nextBuildCost } from '../../core/camp';
import { storageCap } from '../../core/expedition';
import { BUILDINGS } from '../../data/buildings';
import { UNLOCKS } from '../../data/unlocks';
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
    const root = h('div', { class: 'panel-inner' }, h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Camp'), h('div', { class: 'desc' }, 'Every building opens a new way to play. Upgrades change what you can do, not just numbers.'), this.capEl));
    for (const b of BUILDINGS) {
      if (!buildingVisible(s, b.id)) continue;
      const lvl = s.buildings[b.id] ?? 0;
      const cost = nextBuildCost(s, b.id);
      const btn = h('button', { class: 'btn buy', onclick: () => this.ui.engine.dispatch({ type: 'build', id: b.id }) }, cost ? `${lvl ? 'Upgrade' : 'Build'} · ${costText(cost)}` : 'MAX');
      if (cost) this.btns.push({ id: b.id, el: btn });
      else btn.disabled = true;
      root.append(
        h(
          'div',
          { class: `card ${lvl ? '' : 'site'}` },
          h('div', { class: 'row' }, sprite('onebit', b.icon, 2), h('div', { class: 'grow' }, h('div', { class: 'card-title' }, b.name, ' ', h('span', { class: 'lvl' }, lvl ? `Lv ${lvl}/${b.levels.length}` : 'construction site')), h('div', { class: 'desc' }, b.description))),
          lvl ? h('div', { class: 'sub' }, `Now: ${b.levels[lvl - 1].text}`) : null,
          cost ? h('div', { class: 'desc' }, `Next: ${b.levels[lvl].text}`) : null,
          h('div', { class: 'row end' }, btn),
        ),
      );
    }
    const hidden = BUILDINGS.filter((b) => !buildingVisible(s, b.id)).length;
    if (hidden) {
      const next = UNLOCKS.find((u) => !s.flags.includes(u.flag) && BUILDINGS.some((b) => b.flag === u.flag));
      root.append(h('div', { class: 'card faint' }, `▒▒ ${hidden} more site${hidden > 1 ? 's' : ''} to discover.${next ? ' Keep sending the robot out.' : ''}`));
    }
    return root;
  }

  update(): void {
    const s = this.ui.engine.state;
    for (const b of this.btns) setDisabled(b.el, !canAfford(s, nextBuildCost(s, b.id) ?? {}));
    if (this.capEl) {
      const cap = storageCap(this.ui.engine);
      setText(this.capEl, `Storage: ${Math.floor(s.scrap)}/${cap.scrap} scrap · ${s.copper}/${cap.copper} copper`);
    }
  }
}
