import { itemById } from '../../data/items';
import { EXPEDITIONS, expeditionById, STANCES, stanceById } from '../../data/probes';
import type { ExpeditionDefinition } from '../../data/types';
import { probeCost, probeEndsAt, probeRisk, probeUnlocked } from '../../core/systems/probes';
import { formatDuration, formatNumber, pct } from '../../utils/format';
import type { UiContext } from '../context';
import { describeCondition } from '../describe';
import { h, setDisabled, setText, setWidth, toggleClass, type Panel } from '../dom';

export class ProbesPanel implements Panel {
  id = 'probes';
  private stance: Record<string, string> = {};
  private active: { uid: string; bar: HTMLElement; time: HTMLElement; btn: HTMLButtonElement }[] = [];
  private launchers: { d: ExpeditionDefinition; btn: HTMLButtonElement; risk: HTMLElement; cost: HTMLElement; stanceBtns: HTMLButtonElement[] }[] = [];
  private slotsEl: HTMLElement | null = null;

  constructor(private ui: UiContext) {}

  private get eng() {
    return this.ui.engine;
  }

  signature(): string {
    const s = this.eng.state;
    return [s.probes.map((p) => p.uid).join(','), EXPEDITIONS.filter((d) => probeUnlocked(s, d)).length, this.eng.stats.probeSlots].join('|');
  }

  build(): HTMLElement {
    const s = this.eng.state;
    const root = h('div', { class: 'panel-inner' });
    this.active = [];
    this.launchers = [];
    this.slotsEl = h('span', { class: 'lvl' });
    root.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Probes ', this.slotsEl), h('div', { class: 'desc' }, 'Probes work in real time — even while you are away. Their fate is sealed the moment they launch.')));

    for (const p of s.probes) {
      const d = expeditionById(p.destId);
      const bar = h('div', { class: 'fill' });
      const time = h('div', { class: 'sub' });
      const btn = h('button', { class: 'btn', onclick: () => this.collect(p.uid) }, 'Collect');
      root.append(
        h('div', { class: 'card row' }, h('div', { class: 'grow' }, h('div', { class: 'card-title' }, `${d.name} · ${stanceById(p.stanceId).name}`), h('div', { class: 'bar' }, bar), time), btn),
      );
      this.active.push({ uid: p.uid, bar, time, btn });
    }

    for (const d of EXPEDITIONS) {
      if (!probeUnlocked(s, d)) {
        const c = 'flag' in d.unlock ? 'unknown' : describeCondition(d.unlock);
        root.append(h('div', { class: 'card faint' }, h('div', { class: 'card-title' }, '▒▒ Unmapped fissure'), h('div', { class: 'hint' }, c)));
        continue;
      }
      this.stance[d.id] ??= 'standard';
      const stanceBtns = STANCES.map((st) =>
        h('button', { class: 'seg', onclick: () => (this.stance[d.id] = st.id) }, st.name),
      );
      const risk = h('span', {});
      const cost = h('span', {});
      const btn = h('button', { class: 'btn', onclick: () => this.eng.dispatch({ type: 'launchProbe', destId: d.id, stanceId: this.stance[d.id] }) }, 'Launch');
      const r = d.rewards;
      const rewards = [
        r.scrapKills ? 'Scrap' : '',
        `${r.shards}+ ◆`,
        r.itemChance ? `${pct(r.itemChance)} module${r.minRarity !== 'common' ? ` (${r.minRarity}+)` : ''}` : '',
        r.logChance ? 'Echo Logs' : '',
      ].filter(Boolean);
      root.append(
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'card-title' }, d.name),
          h('div', { class: 'desc' }, d.description),
          h('div', { class: 'sub' }, `⏱ ${formatDuration(d.duration * this.eng.stats.probeTimeMul)} · `, risk, ' · ', rewards.join(' · ')),
          h('div', { class: 'row' }, h('div', { class: 'segmented grow' }, ...stanceBtns), h('div', { class: 'col' }, cost, btn)),
        ),
      );
      this.launchers.push({ d, btn, risk, cost, stanceBtns });
    }
    return root;
  }

  private collect(uid: string): void {
    const p = this.eng.state.probes.find((x) => x.uid === uid);
    if (!p) return;
    if (this.eng.dispatch({ type: 'collectProbe', uid })) {
      const o = p.outcome;
      const parts = [o.scrap ? `+${formatNumber(o.scrap)} scrap` : '', o.shards ? `+${o.shards} ◆` : '', o.item ? itemById(o.item.defId).name : '', o.logId ? 'an Echo Log' : ''].filter(Boolean);
      this.ui.toasts.show(o.success ? `Probe returned: ${parts.join(', ')}` : `Probe lost in the dark. Telemetry salvaged: ${parts.join(', ') || 'nothing'}`, o.success ? 'loot' : 'danger');
    }
  }

  update(): void {
    const s = this.eng.state;
    const now = this.eng.now;
    if (this.slotsEl) setText(this.slotsEl, `${s.probes.length}/${this.eng.stats.probeSlots} slots`);
    for (const a of this.active) {
      const p = s.probes.find((x) => x.uid === a.uid);
      if (!p) continue;
      const end = probeEndsAt(p);
      const left = Math.max(0, end - now);
      setWidth(a.bar, 1 - left / p.durationMs);
      setText(a.time, left > 0 ? `${formatDuration(left / 1000)} left · risk ${pct(p.risk)}` : 'Returned — collect it!');
      setDisabled(a.btn, left > 0);
    }
    for (const l of this.launchers) {
      const cost = probeCost(s, l.d);
      setText(l.cost, `${formatNumber(cost)} ⚙`);
      setText(l.risk, `risk ${pct(probeRisk(s, l.d, this.stance[l.d.id]))}`);
      setDisabled(l.btn, s.scrap < cost || s.probes.length >= this.eng.stats.probeSlots);
      l.stanceBtns.forEach((b, i) => toggleClass(b, 'on', STANCES[i].id === this.stance[l.d.id]));
    }
  }
}
