import { SLOTS, itemInstance } from '../../core/stats';
import { isEquipped, looseItems, slotAvailable, slotKind } from '../../core/systems/equipment';
import { FORGE_COST, INVENTORY_CAP, itemById, SALVAGE_VALUE } from '../../data/items';
import type { SlotId } from '../../data/types';
import { RARITY_CSS } from '../../config/constants';
import type { ItemInstance } from '../../core/state';
import { formatNumber, pct } from '../../utils/format';
import type { UiContext } from '../context';
import { h, setDisabled, setText, type Panel } from '../dom';

const SLOT_LABEL: Record<SlotId, string> = { core: 'CORE', module1: 'MODULE I', module2: 'MODULE II', utility: 'UTILITY', utility2: 'UTILITY II' };

export function effectLines(defId: string): string {
  return itemById(defId).description;
}

export class RigPanel implements Panel {
  id = 'rig';
  private forgeBtn: HTMLButtonElement | null = null;
  private statsEl: HTMLElement | null = null;

  constructor(private ui: UiContext) {}

  private get eng() {
    return this.ui.engine;
  }

  signature(): string {
    const s = this.eng.state;
    return [s.inventory.map((i) => i.uid).join(','), SLOTS.map((sl) => s.equipped[sl]).join(','), s.flags.includes('forge'), s.heirloomUid, this.eng.stats.grants.size].join('|');
  }

  private itemCard(item: ItemInstance | undefined, label: string, onClick: () => void): HTMLElement {
    if (!item) return h('button', { class: 'item empty', onclick: onClick }, h('div', { class: 'slot-label' }, label), h('div', { class: 'item-name' }, '— empty —'));
    const def = itemById(item.defId);
    const heir = this.eng.state.heirloomUid === item.uid;
    return h(
      'button',
      { class: `item r-${item.rarity}`, onclick: onClick },
      h('div', { class: 'slot-label' }, label, heir ? ' · ♥ heirloom' : ''),
      h('div', { class: 'item-name', style: `color:${RARITY_CSS[item.rarity]}` }, def.name),
      h('div', { class: 'item-meta' }, `${item.rarity} · ${def.archetype}`),
      h('div', { class: 'desc' }, def.description),
    );
  }

  build(): HTMLElement {
    const s = this.eng.state;
    const root = h('div', { class: 'panel-inner' });
    const slots = h('div', { class: 'slots' });
    for (const sl of SLOTS) {
      if (!slotAvailable(this.eng, sl)) continue;
      slots.append(this.itemCard(itemInstance(s, s.equipped[sl]), SLOT_LABEL[sl], () => this.openSlot(sl)));
    }
    this.statsEl = h('div', { class: 'build-stats' });
    root.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Rig'), slots, this.statsEl));

    if (s.flags.includes('forge')) {
      this.forgeBtn = h('button', { class: 'btn', onclick: () => this.eng.dispatch({ type: 'forge' }) });
      root.append(h('div', { class: 'card row' }, h('div', { class: 'grow' }, h('div', { class: 'card-title' }, 'Forge'), h('div', { class: 'desc' }, 'Melt Shards into a random module.')), this.forgeBtn));
    } else this.forgeBtn = null;

    const loose = looseItems(this.eng);
    root.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, `Salvage bay (${loose.length}/${INVENTORY_CAP})`),
        loose.length ? h('div', { class: 'inventory' }, ...loose.map((i) => this.itemCard(i, itemById(i.defId).slot.toUpperCase(), () => this.openItem(i)))) : h('div', { class: 'desc' }, 'Nothing spare. Modules drop from depth 3+, Wardens, Probes and the Forge.'),
      ),
    );
    return root;
  }

  update(): void {
    const s = this.eng.state;
    const st = this.eng.stats;
    if (this.forgeBtn) {
      setText(this.forgeBtn, `${FORGE_COST} ◆`);
      setDisabled(this.forgeBtn, s.shards < FORGE_COST);
    }
    if (this.statsEl) {
      const parts = [
        `Strike ${formatNumber(st.strike)}`,
        `Auto ${formatNumber(st.autoDps)}/s`,
        `Integrity ${formatNumber(st.maxIntegrity)}`,
        `Regen ${formatNumber(st.regen)}/s`,
        `Shards/fracture ${st.fractureShards.toFixed(2)}`,
      ];
      if (st.governorChance > 0) parts.push(`Governor ${pct(st.governorChance)}`);
      if (st.scrapMul !== 1) parts.push(`Scrap ×${st.scrapMul.toFixed(2)}`);
      if (st.resonance > 1) parts.push(`Resonance ×${st.resonance.toFixed(2)}`);
      setText(this.statsEl, parts.join(' · '));
    }
  }

  private openSlot(slot: SlotId): void {
    const s = this.eng.state;
    const kind = slotKind(slot);
    const options = s.inventory.filter((i) => itemById(i.defId).slot === kind && s.equipped[slot] !== i.uid);
    const body = h('div', { class: 'inventory' });
    if (!options.length) body.append(h('div', { class: 'desc' }, `No spare ${kind} items.`));
    for (const i of options) {
      body.append(
        this.itemCard(i, isEquipped(this.eng, i.uid) ? 'equipped elsewhere' : 'tap to equip', () => {
          this.eng.dispatch({ type: 'equip', uid: i.uid, slot });
          this.ui.modal.close();
        }),
      );
    }
    const actions: HTMLElement[] = [];
    if (slot !== 'core' && s.equipped[slot]) {
      actions.push(
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            this.eng.dispatch({ type: 'unequip', slot });
            this.ui.modal.close();
          },
        }, 'Unequip'),
      );
    }
    this.ui.modal.open(`${SLOT_LABEL[slot]}`, body, actions);
  }

  private openItem(item: ItemInstance): void {
    const def = itemById(item.defId);
    const slots = SLOTS.filter((sl) => slotKind(sl) === def.slot && slotAvailable(this.eng, sl));
    const actions: HTMLElement[] = slots.map((sl) =>
      h('button', {
        class: 'btn',
        onclick: () => {
          this.eng.dispatch({ type: 'equip', uid: item.uid, slot: sl });
          this.ui.modal.close();
        },
      }, `Equip → ${SLOT_LABEL[sl]}`),
    );
    if (this.eng.stats.grants.has('heirloom')) {
      const isHeir = this.eng.state.heirloomUid === item.uid;
      actions.push(
        h('button', {
          class: 'btn ghost',
          onclick: () => {
            this.eng.dispatch({ type: 'setHeirloom', uid: isHeir ? null : item.uid });
            this.ui.modal.close();
          },
        }, isHeir ? 'Remove heirloom' : '♥ Make heirloom'),
      );
    }
    if (item.defId !== 'piston_bit') {
      actions.push(
        h('button', {
          class: 'btn danger',
          onclick: () => {
            this.eng.dispatch({ type: 'salvage', uid: item.uid });
            this.ui.modal.close();
          },
        }, `Salvage +${SALVAGE_VALUE[item.rarity]} ◆`),
      );
    }
    this.ui.modal.open(def.name, h('div', {}, this.itemCard(item, def.slot.toUpperCase(), () => undefined)), actions);
  }
}
