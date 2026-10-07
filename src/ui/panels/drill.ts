import * as F from '../../core/formulas';
import { costOf, isMaxed, upgradeVisible } from '../../core/systems/upgrades';
import { bossById } from '../../data/bosses';
import { UNLOCKS } from '../../data/unlocks';
import { UPGRADES } from '../../data/upgrades';
import type { UpgradeDefinition } from '../../data/types';
import { zoneForDepth } from '../../data/zones';
import { formatNumber, pct } from '../../utils/format';
import type { UiContext } from '../context';
import { describeCondition } from '../describe';
import { h, setDisabled, setText, type Panel } from '../dom';

export class DrillPanel implements Panel {
  id = 'drill';
  private rows: { u: UpgradeDefinition; lvl: HTMLElement; val: HTMLElement; btn: HTMLButtonElement }[] = [];

  constructor(private ui: UiContext) {}

  private get s() {
    return this.ui.engine.state;
  }

  signature(): string {
    const s = this.s;
    return [UPGRADES.filter((u) => upgradeVisible(s, u)).map((u) => u.id).join(','), s.flags.length, s.flags.includes('warden'), s.codex.includes('clapper_core')].join('|');
  }

  private preview(u: UpgradeDefinition): string {
    const s = this.s;
    const st = this.ui.engine.stats;
    const l = s.upgrades[u.id];
    switch (u.id) {
      case 'servo':
        return `Strike ${formatNumber(st.strike)} → ${formatNumber((st.strike / F.strikeDamage(l)) * F.strikeDamage(l + 1))}${(l + 1) % 10 === 0 ? '  ★×2' : ''}`;
      case 'motor':
        return l === 0
          ? `Auto ${formatNumber(F.autoDps(1) * st.autoMul * st.resonance)}/s`
          : `Auto ${formatNumber(st.autoDps)}/s → ${formatNumber((st.autoDps / F.autoDps(l)) * F.autoDps(l + 1))}/s${(l + 1) % 10 === 0 ? '  ★×2' : ''}`;
      case 'plating':
        return `Integrity ${formatNumber(st.maxIntegrity)} → ${formatNumber((st.maxIntegrity / F.maxIntegrity(l)) * F.maxIntegrity(l + 1))}`;
      case 'exchanger':
        return `Vent ${st.ventDuration.toFixed(1)}s → ${(st.ventDuration + 0.5).toFixed(1)}s`;
      case 'hopper':
        return `Offline cap ${F.offlineCapHours(l)}h → ${F.offlineCapHours(l + 1)}h`;
      case 'hull':
        return `Probe risk ×${Math.pow(0.9, l).toFixed(2)} → ×${Math.pow(0.9, l + 1).toFixed(2)}`;
    }
  }

  build(): HTMLElement {
    const s = this.s;
    this.rows = [];
    const root = h('div', { class: 'panel-inner' });

    // What's next — the game is bigger than it looks.
    const locked = UNLOCKS.filter((r) => !s.flags.includes(r.flag) && r.hint);
    const seen = new Set<string>();
    const upcoming = locked.filter((r) => (seen.has(r.flag) ? false : (seen.add(r.flag), true))).slice(0, 2);
    if (upcoming.length) {
      root.append(
        h(
          'div',
          { class: 'card faint' },
          h('div', { class: 'card-title' }, '▒▒ Faint signals'),
          ...upcoming.map((r) => h('div', { class: 'hint' }, `${r.hint} — ${describeCondition(r.when[0])}`)),
        ),
      );
    }

    if (s.flags.includes('warden')) root.append(this.wardenCard());

    for (const u of UPGRADES) {
      if (!upgradeVisible(s, u)) continue;
      const lvl = h('span', { class: 'lvl' });
      const val = h('div', { class: 'sub' });
      const btn = h('button', { class: 'btn buy', onclick: () => this.ui.engine.dispatch({ type: 'buyUpgrade', id: u.id }) });
      root.append(h('div', { class: 'card row' }, h('div', { class: 'grow' }, h('div', { class: 'card-title' }, u.name, ' ', lvl), h('div', { class: 'desc' }, u.description), val), btn));
      this.rows.push({ u, lvl, val, btn });
    }
    return root;
  }

  private wardenCard(): HTMLElement {
    const s = this.s;
    const zone = zoneForDepth(s.depth);
    const b = bossById(zone.bossId);
    const next = Math.ceil((s.depth + 1) / zone.bossEvery) * zone.bossEvery;
    const known = s.codex.includes(b.firstKillItem);
    return h(
      'div',
      { class: 'card warden' },
      h('div', { class: 'card-title' }, `⚠ Warden at depth ${next}: ${b.name}`),
      h('div', { class: 'tags' }, ...b.tags.map((t) => h('span', { class: 'tag' }, t))),
      h('ul', { class: 'phases' }, ...b.phases.map((p) => h('li', {}, h('b', {}, `${p.name} (${pct(p.below)}↓): `), p.description))),
      h('div', { class: 'desc' }, `Shaft holds ${b.timer}s. Each toll: −${pct(b.tollDamagePct)} Integrity.`),
      h('div', { class: 'desc' }, `First-kill reward: ${known ? 'Clapper Core (claimed)' : '??? (a core unlike any other)'}`),
    );
  }

  update(): void {
    const s = this.s;
    for (const r of this.rows) {
      const maxed = isMaxed(s, r.u);
      const cost = costOf(s, r.u);
      setText(r.lvl, `Lv ${s.upgrades[r.u.id]}${r.u.max ? `/${r.u.max}` : ''}`);
      setText(r.val, maxed ? 'MAX' : this.preview(r.u));
      setText(r.btn, maxed ? 'MAX' : `${formatNumber(cost)} ⚙`);
      setDisabled(r.btn, maxed || s.scrap < cost);
    }
  }
}
