import { echoesFor, ECHO_RESONANCE, nextEchoDepth } from '../../core/formulas';
import { collapseReward } from '../../core/systems/prestige';
import { DOCTRINES, MEMORIES } from '../../data/memories';
import { pct } from '../../utils/format';
import type { UiContext } from '../context';
import { h, setDisabled, setText, toggleClass, type Panel } from '../dom';

export class CollapsePanel implements Panel {
  id = 'collapse';
  private doctrine = 'none';
  private gainEl!: HTMLElement;
  private nextEl!: HTMLElement;
  private echoEl!: HTMLElement;
  private collapseBtn!: HTMLButtonElement;
  private doctrineBtns: { id: string; el: HTMLButtonElement }[] = [];
  private memBtns: { id: string; cost: number; el: HTMLButtonElement }[] = [];

  constructor(private ui: UiContext) {}

  private get eng() {
    return this.ui.engine;
  }

  signature(): string {
    return [this.eng.state.memories.join(','), this.eng.state.stats.collapses].join('|');
  }

  build(): HTMLElement {
    const s = this.eng.state;
    this.doctrine = s.doctrine;
    this.gainEl = h('b', { class: 'big' });
    this.nextEl = h('div', { class: 'sub' });
    this.echoEl = h('div', { class: 'sub' });
    this.collapseBtn = h('button', { class: 'btn danger wide', onclick: () => this.confirm() }, 'Let the shaft COLLAPSE');
    this.doctrineBtns = DOCTRINES.map((d) => ({
      id: d.id,
      el: h('button', { class: 'choice', onclick: () => (this.doctrine = d.id) }, h('div', { class: 'card-title' }, d.name), h('div', { class: 'desc' }, d.description)),
    }));
    this.memBtns = [];
    const memCards = MEMORIES.map((m) => {
      const owned = s.memories.includes(m.id);
      const btn = h('button', { class: 'btn', onclick: () => this.eng.dispatch({ type: 'buyMemory', id: m.id }) }, owned ? 'Remembered' : `${m.cost} ✦`);
      if (!owned) this.memBtns.push({ id: m.id, cost: m.cost, el: btn });
      else btn.disabled = true;
      return h('div', { class: `card row ${owned ? 'owned' : ''}` }, h('div', { class: 'grow' }, h('div', { class: 'card-title' }, m.name), h('div', { class: 'desc' }, m.description)), btn);
    });

    return h(
      'div',
      { class: 'panel-inner' },
      h(
        'div',
        { class: 'card collapse-card' },
        h('div', { class: 'card-title' }, 'Collapse'),
        h('div', { class: 'desc' }, 'Bring the shaft down on yourself. You lose depth, Scrap, upgrades, modules and 90% of Shards. You keep Echoes, Memories, Logs and everything you have learned.'),
        h('div', { class: 'row' }, h('div', { class: 'grow' }, 'Echoes if you collapse now: ', this.gainEl, this.nextEl, this.echoEl)),
        h('div', { class: 'card-title' }, 'Next run doctrine'),
        h('div', { class: 'choices' }, ...this.doctrineBtns.map((d) => d.el)),
        this.collapseBtn,
      ),
      h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Memories'), h('div', { class: 'desc' }, `Unspent Echoes resonate: +${pct(ECHO_RESONANCE)} damage each. Remembering spends them.`)),
      ...memCards,
    );
  }

  update(): void {
    const s = this.eng.state;
    const gain = collapseReward(this.eng);
    setText(this.gainEl, `+${gain} ✦`);
    const nd = nextEchoDepth(s.maxDepth, s.runWardens, this.eng.stats.echoMul);
    setText(this.nextEl, `Run best depth ${s.maxDepth}. Next Echo at depth ${nd} (+${echoesFor(nd, s.runWardens, this.eng.stats.echoMul) - gain}).`);
    setText(this.echoEl, `You hold ${s.echoes} ✦ → resonance ×${this.eng.stats.resonance.toFixed(2)} damage.`);
    setDisabled(this.collapseBtn, gain <= 0 && s.stats.collapses > 0);
    for (const d of this.doctrineBtns) toggleClass(d.el, 'on', d.id === this.doctrine);
    for (const m of this.memBtns) setDisabled(m.el, s.echoes < m.cost);
  }

  private confirm(): void {
    const gain = collapseReward(this.eng);
    const doctrine = DOCTRINES.find((d) => d.id === this.doctrine)!;
    const probes = this.eng.state.probes.length;
    const body = h(
      'div',
      {},
      h('p', {}, `You will gain ${gain} Echoes and begin again at the top of the shaft under the ${doctrine.name}.`),
      probes ? h('p', { class: 'danger-text' }, `${probes} probe(s) in flight will be lost.`) : null,
      h('p', { class: 'desc' }, 'This cannot be undone.'),
    );
    this.ui.modal.open('Collapse the shaft?', body, [
      h('button', { class: 'btn ghost', onclick: () => this.ui.modal.close() }, 'Not yet'),
      h('button', {
        class: 'btn danger',
        onclick: () => {
          this.ui.modal.close();
          this.eng.dispatch({ type: 'collapse', doctrineId: this.doctrine });
          this.ui.actions.saveNow();
        },
      }, 'COLLAPSE'),
    ]);
  }
}
