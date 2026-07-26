import { HALF_SPRITES, TILE_SPRITES } from './spriteData';

export type Palette = Record<string, string>;
export interface SpriteDef {
  rows: string[]; // full-width rows (16 chars each)
  palette: Palette;
}

function mirrorRows(rows: string[]): string[] {
  return rows.map((r) => r + r.split('').reverse().join(''));
}

// ---- Palettes ----
export const PALETTES: Record<string, Palette> = {
  player: { k: '#141010', h: '#4b2e83', s: '#e3b088', x: '#141010', c: '#6b3f2a', b: '#241a14', y: '#d1a23a', T: '#4a2a1c', o: '#2b2018' },
  elder: { k: '#141010', h: '#c9c2b0', s: '#d9a878', x: '#141010', c: '#7a6b4a', b: '#3a3226', y: '#b8a24a', T: '#5a4f36', o: '#3a2f22' },
  shopkeeper: { k: '#141010', h: '#5a3826', s: '#e0ac82', x: '#141010', c: '#3a5a4a', b: '#2a2a2a', y: '#c0392b', T: '#284838', o: '#2a2018' },
  rival: { k: '#0c0c0c', h: '#8a1f1f', s: '#e3b088', x: '#0c0c0c', c: '#2a2a3a', b: '#1a1a1a', y: '#8a1f1f', T: '#1c1c28', o: '#151515' },
  villager: { k: '#141010', h: '#3a2a1e', s: '#d9a878', x: '#141010', c: '#4a5a6b', b: '#2a2a2a', y: '#9a8a5a', T: '#33404a', o: '#221f1c' },

  hellhound: { k: '#140d0a', f: '#c9622c', n: '#4a2416', y: '#ffdd55', e: '#ffdd55', D: '#7a3418', o: '#3a1c10' },
  bat: { k: '#0a0713', z: '#241a38', f: '#3d2f5c', e: '#cfc4e0', y: '#ffe066', x: '#140e20', n: '#f2ecff' },
  owl: { k: '#241c14', f: '#8a7860', e: '#f5e9d0', y: '#ffd23f', x: '#1a1410', n: '#e08a3c', D: '#5c4d3a', t: '#caa24a' },
  werewolf: { k: '#120d09', F: '#4a3d33', f: '#8a715c', e: '#cbb499', y: '#ffd23f', n: '#241c14', t: '#e8e0d0' },
  ghoul: { k: '#0d0f08', G: '#5c6b4a', x: '#120f0a', n: '#2a2418' },
  fledgling: { k: '#0d0710', h: '#241028', v: '#d8cfe0', x: '#c81e3a', n: '#f5f0ff', P: '#3d1f4d', w: '#efe6f2', R: '#8a1030', o: '#1c1420' },
  wraith: { k: '#100c1c', P: '#3a3050', e: '#bfe6ff' },
  skeleton: { k: '#100f12', n: '#e9e2cf', x: '#141014', C: '#7a8088' },
  countess: { k: '#0a0610', h: '#1c0f22', v: '#e0d5ea', x: '#c81e3a', n: '#f5f0ff', P: '#2a1030', R: '#8a1030' },
  guardian: { k: '#241c10', w: '#e8e2c8', e: '#241c10', x: '#241c10', y: '#ffdf7a', W: '#b9a25a' },
  griffin: { k: '#1c1610', w: '#f0ece0', y: '#ffd23f', x: '#1a1410', n: '#e08a3c', F: '#8a6a3c', f: '#c9a565' },
  dracula: { k: '#0a0610', h: '#120a16', v: '#d9cfe6', x: '#ff2a4a', n: '#f5f0ff', P: '#2a1030', w: '#efe6f2', R: '#7a0f22' },

  grass: { g: '#4f7a3d', G: '#3f6530' },
  tall_grass: { g: '#3f6530', G: '#2f4f24' },
  path: { t: '#c9a86a', T: '#a8895a' },
  water: { q: '#3b6ea5', Q: '#2a5480' },
  tree: { k: '#14100a', G: '#2f5f2a', g: '#4a8a3f', T: '#5c3a22' },
  flower: { g: '#4f7a3d', G: '#3f6530', r: '#c94a4a', w: '#f2ecdf' },
  wall: { C: '#8a8f94', c: '#767b80' },
  roof: { R: '#8a3a34', r: '#742e29' },
  door: { k: '#14100a', T: '#5c3a22', y: '#d1a23a' },
  floor: { t: '#b89768', T: '#9c7e52' },
  fence: { T: '#7a5a34' },
  gravestone: { c: '#9a9d9f', C: '#7b7e80', k: '#141414' },
  crypt_wall: { C: '#565a5e', k: '#0f1113', o: '#3a2e20', R: '#8a2020' },
  crypt_floor: { C: '#4a4e52', c: '#3d4144' },
  counter: { t: '#b89768', T: '#8a6c44' },
  sign: { T: '#7a5a34', k: '#141010' },
};

const halfCache = new Map<string, string[]>();
export function getHalfSprite(name: string): SpriteDef {
  let rows = halfCache.get(name);
  if (!rows) {
    rows = mirrorRows(HALF_SPRITES[name]);
    halfCache.set(name, rows);
  }
  return { rows, palette: PALETTES[name] };
}

export function getTileSprite(name: string): SpriteDef {
  return { rows: TILE_SPRITES[name], palette: PALETTES[name] };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  dx: number,
  dy: number,
  pixelSize: number,
  flipX = false
) {
  const { rows, palette } = def;
  const w = rows[0].length;
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < w; rx++) {
      const ch = row[rx];
      if (ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      const cx = flipX ? w - 1 - rx : rx;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(dx + cx * pixelSize), Math.round(dy + ry * pixelSize), pixelSize, pixelSize);
    }
  }
}
