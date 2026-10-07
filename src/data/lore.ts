/** Number of echo logs (texts live in the i18n dictionaries: lore.0 … lore.N-1). */
export const LORE_COUNT = 6;
export const LORE = Array.from({ length: LORE_COUNT }, (_, i) => i);

/** Named rig combos (texts: combo.<id>.name / combo.<id>.text). */
export const COMBOS: { id: string }[] = [{ id: 'thermal_loop' }, { id: 'bastion' }, { id: 'power_grid' }, { id: 'containment' }];
