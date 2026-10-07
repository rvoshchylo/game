import type Phaser from 'phaser';

// Procedural pixel art. Every sprite is ASCII-authored so it stays in one coherent
// 1-bit-plus-accent style and can be swapped for a CC0 pack later by key.

const PALETTE: Record<string, number> = {
  o: 0x120d0b, // outline
  w: 0xf2e9dc, // light (tinted for enemies)
  l: 0xb8aea3, // mid
  d: 0x6e6259, // dark
  r: 0xe0702a, // rust accent
  R: 0x8a3f1c, // dark rust
  g: 0x9b8f86, // steel
  G: 0x5a514c, // dark steel
  y: 0xffd166, // heat / eye
  c: 0x7fd6c2, // shard
  e: 0x2a1d17, // enemy eye socket
};

function paint(scene: Phaser.Scene, key: string, art: string[]): void {
  if (scene.textures.exists(key)) return;
  const h = art.length;
  const w = Math.max(...art.map((r) => r.length));
  const g = scene.add.graphics();
  art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PALETTE[row[x]];
      if (col === undefined) continue;
      g.fillStyle(col, 1);
      g.fillRect(x, y, 1, 1);
    }
  });
  g.generateTexture(key, w, h);
  g.destroy();
}

const AUTOMATON = [
  '................',
  '....oooooo......',
  '...oGggggGo.....',
  '...oGgyygGo.....',
  '...oGggggGo.....',
  '....oooooo......',
  '..ooRrrrrRoo....',
  '.oRrrrrrrrrRooo.',
  '.oRrGrrrrGrRggo.',
  '.oRrrrrrrrrRooo.',
  '..oRrrrrrrRo....',
  '..oGGoooGGo.....',
  '..oGo...oGo.....',
  '..oGo...oGo.....',
  '.ooGGo.ooGGo....',
  '.ooooo.ooooo....',
];

const DRILL = [
  'ooo.......',
  'oggoo.....',
  'ogGggoo...',
  'oggGgggoo.',
  'oggGgggoo.',
  'ogGggoo...',
  'oggoo.....',
  'ooo.......',
];

const MITE = [
  '................',
  '................',
  '................',
  '................',
  '......oooo......',
  '....oowwwwoo....',
  '...owwlwwlwwo...',
  '..owwwwwwwwwwo..',
  '..oweewwwweewo..',
  '..owwwlwwlwwwo..',
  '...owwwwwwwwo...',
  '..ooolooooloooo.',
  '.o..o..o.o..o..o',
  '.o..o..o.o..o..o',
  '................',
  '................',
];

const CRAWLER = [
  '................',
  '................',
  '................',
  '................',
  '.....ooooo......',
  '...oowwwwwoo....',
  '..owwlwwwlwwoo..',
  '.owweewwwwwwwwo.',
  '.owwwwwlwwwlwwo.',
  'owwlwwwwwwwwwwwo',
  'owwwwlwwwlwwwwwo',
  'oddddddddddddddo',
  '.oooooooooooooo.',
  '................',
  '................',
  '................',
];

const WISP = [
  '.......o........',
  '......owo.......',
  '....oowwwoo.....',
  '...owwlllwwo....',
  '..owwleeelwwo...',
  '.o.owllllwwo.o..',
  'owo.owwwwwo.owo.',
  '.o...owwwo...o..',
  '......owo.......',
  '.....oo.oo......',
  '....o.....o.....',
  '.....oo.oo......',
  '.......o........',
  '................',
  '................',
  '................',
];

const GOLEM = [
  '................',
  '.....oooooo.....',
  '....owwwwwwo....',
  '....owewwewo....',
  '....owwllwwo....',
  '..ooooooooooo...',
  '.owwwlwwwwlwwo..',
  'owwwwwwlwwwwwwo.',
  'owlwwwwwwwwwlwo.',
  'owwoowwwwwoowwo.',
  'oddo.owwwo.oddo.',
  '.oo..owwwo..oo..',
  '.....owdwo......',
  '....oodooddo....',
  '....oooooooo....',
  '................',
];

const WORM = [
  '................',
  '................',
  '................',
  '.......ooo......',
  '......owwwo.....',
  '.....owewewo....',
  '.....owwwwwo....',
  '......owlwo.....',
  '.....owwwwo.....',
  '....owwlwo......',
  '...owwwwo.......',
  '...owlwwoo......',
  '....owwwwwoo....',
  '.....ooolllwo...',
  '........ooooo...',
  '................',
];

const BELL = [
  '...........oo...........',
  '..........owwo..........',
  '..........oddo..........',
  '........oooooooo........',
  '.......owwwwwwwwo.......',
  '......owwlwwwwlwwo......',
  '.....owwwwwwwwwwwwo.....',
  '.....owlwwweewwwlwo.....',
  '.....owwwwwwwwwwwwo.....',
  '....owwwwwlwwlwwwwwo....',
  '....owwlwwwwwwwwlwwo....',
  '....owwwwwwwwwwwwwwo....',
  '...owwwwwlwwwwlwwwwwo...',
  '...owwlwwwwwwwwwwlwwo...',
  '...owwwwwwwwwwwwwwwwo...',
  '..owwwwwlwwwwwwlwwwwwo..',
  '..owwlwwwwwwwwwwwwlwwo..',
  '.owwwwwwwwwwwwwwwwwwwwo.',
  '.oddddddddddddddddddddo.',
  'oooooooooooooooooooooooo',
  '..........owwo..........',
  '..........owwo..........',
  '...........oo...........',
  '........................',
];

const FRACTURE = [
  '....o....',
  '...oyo...',
  '..oywyo..',
  '.oywwwyo.',
  'oywwwwwyo',
  '.oywwwyo.',
  '..oywyo..',
  '...oyo...',
  '....o....',
];

const SIGNAL = [
  '....ooo....',
  '...occco...',
  '..oc...co..',
  '.oc.ccc.co.',
  'oc.c...c.co',
  'oc.c.c.c.co',
  'oc.c...c.co',
  '.oc.ccc.co.',
  '..oc...co..',
  '...occco...',
  '....ooo....',
];

const SHARD = ['.oo.', 'occo', 'occo', '.oo.'];

export const SHAPE_KEY: Record<string, string> = {
  mite: 'enemy_mite',
  crawler: 'enemy_crawler',
  wisp: 'enemy_wisp',
  golem: 'enemy_golem',
  worm: 'enemy_worm',
  bell: 'enemy_bell',
};

export function generateTextures(scene: Phaser.Scene): void {
  paint(scene, 'automaton', AUTOMATON);
  paint(scene, 'drill', DRILL);
  paint(scene, 'enemy_mite', MITE);
  paint(scene, 'enemy_crawler', CRAWLER);
  paint(scene, 'enemy_wisp', WISP);
  paint(scene, 'enemy_golem', GOLEM);
  paint(scene, 'enemy_worm', WORM);
  paint(scene, 'enemy_bell', BELL);
  paint(scene, 'fracture', FRACTURE);
  paint(scene, 'signal', SIGNAL);
  paint(scene, 'shard', SHARD);

  if (!scene.textures.exists('px')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('px', 2, 2);
    g.clear();
    g.lineStyle(2, 0xffffff, 1).strokeCircle(16, 16, 14);
    g.generateTexture('ring', 32, 32);
    g.destroy();
  }
}

/** A tileable rock texture in the stratum's palette. */
export function generateRock(scene: Phaser.Scene, key: string, palette: { bg: number; rock: number; rockLight: number }): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  const W = 64;
  g.fillStyle(palette.bg, 1).fillRect(0, 0, W, W);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const w = 2 + Math.floor(rnd() * 8);
    const h = 1 + Math.floor(rnd() * 3);
    const x = Math.floor(rnd() * (W - w));
    const y = Math.floor(rnd() * (W - h));
    g.fillStyle(rnd() < 0.75 ? palette.rock : palette.rockLight, 1).fillRect(x, y, w, h);
  }
  g.generateTexture(key, W, W);
  g.destroy();
}
