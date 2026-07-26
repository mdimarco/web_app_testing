export type MonType = 'physical' | 'holy' | 'dark' | 'beast';

export type MoveCategory = 'damage' | 'drain' | 'buffAtk' | 'debuffAtk' | 'debuffDef' | 'guard' | 'heal';

export interface Move {
  id: string;
  name: string;
  type: MonType;
  power: number; // 0 for status moves
  accuracy: number; // 0-100
  category: MoveCategory;
  description: string;
}

export interface SpeciesDef {
  id: string;
  name: string;
  type: MonType;
  sprite: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  moves: string[]; // move ids, fixed moveset of 4
  xpYield: number;
  catchDifficulty: number; // higher = harder to catch (1 = easy, 3 = very hard)
  flavor: string;
  catchable: boolean;
}

export interface MonsterInstance {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atkMod: number; // temporary battle stat stage modifiers, reset each battle
  defMod: number;
  nickname?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: 'heal' | 'capture';
  power: number; // heal amount or capture multiplier
}

export interface InventoryEntry {
  itemId: string;
  count: number;
}

export type Direction = 'down' | 'up' | 'left' | 'right';

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  paletteKey: string;
  lines: string[];
  shop?: boolean;
  healer?: boolean;
}

export interface WarpDef {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
}

export interface MapDef {
  id: string;
  width: number;
  height: number;
  tiles: string[][]; // tile ids, row-major
  encounterTiles: Set<string>; // "x,y" keys where wild encounters can trigger
  encounterTable: { speciesId: string; min: number; max: number; weight: number }[];
  npcs: NpcDef[];
  warps: WarpDef[];
  music?: string;
}
