import { MapDef, NpcDef, WarpDef } from './types';

const OVERWORLD_ROWS = [
  "################################",
  "#.............==...............#",
  "#..RRRRRFF....==....FFRRR......#",
  "#..WWWWW......==....WWWWW......#",
  "#..WWWWW......==....WWWWW......#",
  "#..WWWWW......==....WWWWW......#",
  "#..WWDWW......==....WWDWW......#",
  "#.............==...............#",
  "#............N==...............#",
  "#.============================.#",
  "#.............==...............#",
  "#..#,#,,#.#.##==..#,,,,,.#..##.#",
  "#...,,,,.##...==...,,,,,..~~.#.#",
  "#...#,#,......==...,,,#,..~~...#",
  "#.#.,##,#...#.==...,,,,,.#.....#",
  "#...#........#==......#.##...#.#",
  "#.============================.#",
  "#.............==...............#",
  "#.......,...g.==g..g....,g.g,..#",
  "#.g...........==.....g......g,.#",
  "#.....g...g...==,.,g.,..,.,.,..#",
  "#.,.....,...,.==,....gg........#",
  "#...,,...,..,.==...,g.......,..#",
  "#.g......,g..g==,..,......,gg..#",
  "#...g.....g...==...............#",
  "#.............CC...............#",
  "#.############################.#",
  "################################",
];

const SHOP_ROWS = [
  "WWWWWWWWW",
  "WfffffffW",
  "WfKKKKKfW",
  "WfffffffW",
  "WfffffffW",
  "WfffffffW",
  "WWWWXWWWW",
];

const ELDER_ROWS = [
  "WWWWWWWWW",
  "WfffffffW",
  "WfffffffW",
  "WfffffffW",
  "WfffffffW",
  "WfffffffW",
  "WWWWXWWWW",
];

const CRYPT_ROWS = [
  "WWWWWWWWWWWWWWWWW",
  "WWWWWWfffffWWWWWW",
  "WWWWWWfffffWWWWWW",
  "WWWfffffffffffWWW",
  "WWWfffffffffffWWW",
  "WWWfffWWWWWfffWWW",
  "WWWfffWWWWWfffWWW",
  "WWWfffWWWWWfffWWW",
  "WWWfffWWWWWfffWWW",
  "WWWfffffffffffWWW",
  "WWWfffffffffffWWW",
  "WWWfffffffffffWWW",
  "WWWWWWWWfWWWWWWWW",
  "WWWWWWWWfWWWWWWWW",
  "WWWWWWWWfWWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWfffWWWWWWW",
  "WWWWWWWWXWWWWWWWW",
];

// Legend char -> tile sprite id. 'D'/'C'/'X' are also warp trigger tiles (walkable).
const OVERWORLD_LEGEND: Record<string, string> = {
  '.': 'grass', ',': 'tall_grass', '#': 'tree', '=': 'path', '~': 'water',
  F: 'flower', R: 'roof', W: 'wall', D: 'door', g: 'gravestone', C: 'path', N: 'sign',
};
const INTERIOR_LEGEND: Record<string, string> = {
  W: 'wall', f: 'floor', K: 'counter', X: 'door',
};
const CRYPT_LEGEND: Record<string, string> = {
  W: 'crypt_wall', f: 'crypt_floor', X: 'crypt_floor',
};

const BLOCKED_TILES = new Set(['tree', 'water', 'wall', 'roof', 'crypt_wall', 'counter', 'sign']);
export function isTileBlocked(tileId: string): boolean {
  return BLOCKED_TILES.has(tileId);
}

function buildTiles(rows: string[], legend: Record<string, string>): string[][] {
  return rows.map((row) => row.split('').map((ch) => legend[ch] ?? 'grass'));
}

function findChar(rows: string[], ch: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push({ x, y });
  });
  return out;
}

function buildEncounterTiles(rows: string[], chars: string[]): Set<string> {
  const set = new Set<string>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (chars.includes(row[x])) set.add(`${x},${y}`);
  });
  return set;
}

const overworldNpcs: NpcDef[] = [
  { id: 'villager1', x: 9, y: 7, dir: 'down', paletteKey: 'villager', lines: [
    'Vampires have been bolder since the mist rolled in.',
    'Stay on the path after dark, hunter.',
  ] },
  { id: 'villager2', x: 19, y: 7, dir: 'down', paletteKey: 'villager', lines: [
    'The graveyard gates creak open on their own some nights.',
    'My grandmother swore she saw a countess among the stones.',
  ] },
  { id: 'rival', x: 19, y: 10, dir: 'down', paletteKey: 'rival', lines: [
    "Heh. Another fledgling hunter with a mutt at their heel.",
    "Get stronger out there. I want a real challenge someday.",
  ] },
  { id: 'sign1', x: 13, y: 8, dir: 'down', paletteKey: 'villager', lines: [
    'Village square. Mart to the east, Elder\'s hut to the west.',
    'The crypt lies south, past the graveyard. Enter at your own risk.',
  ] },
];

const overworldWarps: WarpDef[] = [
  { x: 5, y: 6, toMap: 'elder', toX: 4, toY: 5 },
  { x: 22, y: 6, toMap: 'shop', toX: 4, toY: 5 },
  { x: 14, y: 25, toMap: 'crypt', toX: 8, toY: 20 },
  { x: 15, y: 25, toMap: 'crypt', toX: 8, toY: 20 },
];

const overworldEncounterTable = [
  // forest (y 10-16)
  { speciesId: 'bat', min: 2, max: 4, weight: 5, yMin: 10, yMax: 16 },
  { speciesId: 'owl', min: 2, max: 4, weight: 4, yMin: 10, yMax: 16 },
  { speciesId: 'werewolf', min: 4, max: 6, weight: 2, yMin: 10, yMax: 16 },
  // graveyard (y 17-25)
  { speciesId: 'ghoul', min: 4, max: 6, weight: 5, yMin: 17, yMax: 25 },
  { speciesId: 'fledgling', min: 4, max: 6, weight: 4, yMin: 17, yMax: 25 },
  { speciesId: 'wraith', min: 5, max: 7, weight: 3, yMin: 17, yMax: 25 },
  { speciesId: 'skeleton', min: 5, max: 7, weight: 3, yMin: 17, yMax: 25 },
  { speciesId: 'countess', min: 7, max: 9, weight: 1, yMin: 17, yMax: 25 },
];

const shopNpcs: NpcDef[] = [
  { id: 'shopkeeper', x: 4, y: 1, dir: 'down', paletteKey: 'shopkeeper', shop: true, lines: ['Welcome to the Mart! Take a look at my wares.'] },
];
const shopWarps: WarpDef[] = [{ x: 4, y: 6, toMap: 'overworld', toX: 5, toY: 7 }];

const elderNpcs: NpcDef[] = [
  { id: 'elder', x: 4, y: 3, dir: 'down', paletteKey: 'elder', healer: true, lines: [
    'Welcome, young hunter. Rest here and your thralls will recover.',
    'The old families say Dracula stirs again in the crypt below.',
  ] },
];
const elderWarps: WarpDef[] = [{ x: 4, y: 6, toMap: 'overworld', toX: 5, toY: 7 }];

const cryptNpcs: NpcDef[] = [
  { id: 'dracula', x: 8, y: 2, dir: 'down', paletteKey: 'dracula', lines: ['DRACULA blocks your path!'] },
];
const cryptWarps: WarpDef[] = [{ x: 8, y: 21, toMap: 'overworld', toX: 15, toY: 24 }];
const cryptEncounterTable = [
  { speciesId: 'ghoul', min: 6, max: 8, weight: 4, yMin: 0, yMax: 22 },
  { speciesId: 'fledgling', min: 6, max: 8, weight: 4, yMin: 0, yMax: 22 },
  { speciesId: 'wraith', min: 7, max: 9, weight: 3, yMin: 0, yMax: 22 },
  { speciesId: 'skeleton', min: 7, max: 9, weight: 3, yMin: 0, yMax: 22 },
  { speciesId: 'countess', min: 9, max: 11, weight: 1, yMin: 0, yMax: 22 },
];

export const MAPS: Record<string, MapDef> = {
  overworld: {
    id: 'overworld',
    width: OVERWORLD_ROWS[0].length,
    height: OVERWORLD_ROWS.length,
    tiles: buildTiles(OVERWORLD_ROWS, OVERWORLD_LEGEND),
    encounterTiles: buildEncounterTiles(OVERWORLD_ROWS, [',']),
    encounterTable: overworldEncounterTable as any,
    npcs: overworldNpcs,
    warps: overworldWarps,
  },
  shop: {
    id: 'shop',
    width: SHOP_ROWS[0].length,
    height: SHOP_ROWS.length,
    tiles: buildTiles(SHOP_ROWS, INTERIOR_LEGEND),
    encounterTiles: new Set(),
    encounterTable: [],
    npcs: shopNpcs,
    warps: shopWarps,
  },
  elder: {
    id: 'elder',
    width: ELDER_ROWS[0].length,
    height: ELDER_ROWS.length,
    tiles: buildTiles(ELDER_ROWS, INTERIOR_LEGEND),
    encounterTiles: new Set(),
    encounterTable: [],
    npcs: elderNpcs,
    warps: elderWarps,
  },
  crypt: {
    id: 'crypt',
    width: CRYPT_ROWS[0].length,
    height: CRYPT_ROWS.length,
    tiles: buildTiles(CRYPT_ROWS, CRYPT_LEGEND),
    encounterTiles: buildEncounterTiles(CRYPT_ROWS, ['f']),
    encounterTable: cryptEncounterTable as any,
    npcs: cryptNpcs,
    warps: cryptWarps,
  },
};

export function findWarp(mapId: string, x: number, y: number): WarpDef | undefined {
  return MAPS[mapId].warps.find((w) => w.x === x && w.y === y);
}

export function findNpc(mapId: string, x: number, y: number): NpcDef | undefined {
  return MAPS[mapId].npcs.find((n) => n.x === x && n.y === y);
}

export function tileAt(mapId: string, x: number, y: number): string {
  const map = MAPS[mapId];
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return 'tree';
  return map.tiles[y][x];
}
