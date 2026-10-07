import type Phaser from 'phaser';

// Procedural pixel art for the hero robot and the Warden (no fitting CC0 sprite exists).
// Everything else comes from the Kenney CC0 sheets loaded in BootScene.

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

const SHARD = ['.oo.', 'occo', 'occo', '.oo.'];

export function generateTextures(scene: Phaser.Scene): void {
  paint(scene, 'automaton', AUTOMATON);
  paint(scene, 'drill', DRILL);
  paint(scene, 'enemy_bell', BELL);
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
