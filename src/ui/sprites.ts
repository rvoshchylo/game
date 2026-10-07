import { ONEBIT_COLS, ONEBIT_URL, TINY_COLS, TINY_URL } from '../config/constants';
import { h } from './dom';

/** A Kenney sheet frame as a crisp CSS sprite (`scale` × 16px). */
export function sprite(sheet: 'onebit' | 'tiny', frame: number, scale = 2, extraClass = ''): HTMLElement {
  const cols = sheet === 'onebit' ? ONEBIT_COLS : TINY_COLS;
  const rows = sheet === 'onebit' ? 22 : 11;
  const url = sheet === 'onebit' ? ONEBIT_URL : TINY_URL;
  const x = (frame % cols) * 16 * scale;
  const y = Math.floor(frame / cols) * 16 * scale;
  const size = 16 * scale;
  return h('span', {
    class: `sprite ${extraClass}`,
    style: `width:${size}px;height:${size}px;background-image:url(${url});background-size:${cols * size}px ${rows * size}px;background-position:-${x}px -${y}px`,
  });
}

export const RES_ICON = { scrap: 829, copper: 237, cores: 524, blueprint: 768 } as const;
export const NODE_ICON: Record<string, number> = { fight: 425, elite: 577, cache: 390, rest: 529, event: 674, boss: 141 };
