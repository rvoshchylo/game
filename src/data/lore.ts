export const LORE: string[] = [
  'UNIT 7 REACTIVATED. SURFACE CONTACT: NONE. DIRECTIVE: DESCEND.',
  'Other drills lie in the walls here. Their cores are cold. Mine is not.',
  'The Bell was built to warn the miners. It never stopped ringing after they left.',
  'Rust is only iron remembering the air.',
  'Probe 3 transmitted for eleven seconds after the collapse. It was singing.',
  'Below the strata there is a heat that is not fire. It calls the drills home.',
];

export const COMBOS: { id: string; name: string; text: string }[] = [
  { id: 'thermal_loop', name: 'Thermal Loop', text: 'A Cooler touching two or more weapons.' },
  { id: 'bastion', name: 'Bastion', text: 'Plates in two or more corners of the grid.' },
  { id: 'power_grid', name: 'Power Grid', text: 'A Battery touching three or more modules.' },
  { id: 'containment', name: 'Containment', text: 'A Reactor whose every neighbour also touches a Cooler.' },
];
