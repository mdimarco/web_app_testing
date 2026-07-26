import { Move, SpeciesDef } from './types';

export const MOVES: Record<string, Move> = {
  bite: { id: 'bite', name: 'Bite', type: 'physical', power: 35, accuracy: 100, category: 'damage', description: 'A sharp bite.' },
  wingSlash: { id: 'wingSlash', name: 'Wing Slash', type: 'physical', power: 35, accuracy: 100, category: 'damage', description: 'Slashes with a wing edge.' },
  peck: { id: 'peck', name: 'Peck', type: 'physical', power: 30, accuracy: 100, category: 'damage', description: 'A quick jabbing peck.' },
  clawRake: { id: 'clawRake', name: 'Claw Rake', type: 'physical', power: 45, accuracy: 95, category: 'damage', description: 'Rakes with sharp claws.' },
  rendingBite: { id: 'rendingBite', name: 'Rending Bite', type: 'physical', power: 50, accuracy: 90, category: 'damage', description: 'A vicious tearing bite.' },
  rottenBite: { id: 'rottenBite', name: 'Rotten Bite', type: 'physical', power: 35, accuracy: 100, category: 'damage', description: 'A festering bite.' },
  swordSlash: { id: 'swordSlash', name: 'Sword Slash', type: 'physical', power: 45, accuracy: 100, category: 'damage', description: 'A trained blade strike.' },
  shieldBash: { id: 'shieldBash', name: 'Shield Bash', type: 'physical', power: 35, accuracy: 100, category: 'damage', description: 'Bashes with a heavy shield.' },
  skyDive: { id: 'skyDive', name: 'Sky Dive', type: 'physical', power: 50, accuracy: 90, category: 'damage', description: 'Dives from great height.' },
  stakeThrust: { id: 'stakeThrust', name: 'Stake Thrust', type: 'physical', power: 50, accuracy: 95, category: 'damage', description: 'A driven wooden stake.' },

  howlingFang: { id: 'howlingFang', name: 'Howling Fang', type: 'beast', power: 45, accuracy: 100, category: 'damage', description: 'A fang strike backed by a howl.' },
  feralCharge: { id: 'feralCharge', name: 'Feral Charge', type: 'beast', power: 55, accuracy: 90, category: 'damage', description: 'A reckless full-body charge.' },
  sonicScreech: { id: 'sonicScreech', name: 'Sonic Screech', type: 'beast', power: 40, accuracy: 100, category: 'damage', description: 'A disorienting shriek.' },
  nightDive: { id: 'nightDive', name: 'Night Dive', type: 'beast', power: 45, accuracy: 95, category: 'damage', description: 'Swoops from the dark sky.' },
  wingGust: { id: 'wingGust', name: 'Wing Gust', type: 'beast', power: 40, accuracy: 100, category: 'damage', description: 'A buffeting wind of wingbeats.' },
  screech: { id: 'screech', name: 'Screech', type: 'beast', power: 0, accuracy: 100, category: 'debuffDef', description: "Lowers the foe's defense." },
  howl: { id: 'howl', name: 'Howl', type: 'beast', power: 0, accuracy: 100, category: 'buffAtk', description: "Raises the user's attack." },

  shadowClaw: { id: 'shadowClaw', name: 'Shadow Claw', type: 'dark', power: 45, accuracy: 100, category: 'damage', description: 'Claws wreathed in shadow.' },
  shadowBite: { id: 'shadowBite', name: 'Shadow Bite', type: 'dark', power: 40, accuracy: 100, category: 'damage', description: 'A bite laced with dark power.' },
  nightCurse: { id: 'nightCurse', name: 'Night Curse', type: 'dark', power: 55, accuracy: 95, category: 'damage', description: 'A curse drawn from the void.' },
  bloodDrain: { id: 'bloodDrain', name: 'Blood Drain', type: 'dark', power: 40, accuracy: 100, category: 'drain', description: 'Drains blood to heal the user.' },
  infect: { id: 'infect', name: 'Infect', type: 'dark', power: 40, accuracy: 95, category: 'damage', description: 'A festering dark touch.' },
  chillingTouch: { id: 'chillingTouch', name: 'Chilling Touch', type: 'dark', power: 40, accuracy: 100, category: 'damage', description: 'An icy grasp from beyond.' },
  boneRattle: { id: 'boneRattle', name: 'Bone Rattle', type: 'dark', power: 40, accuracy: 100, category: 'damage', description: 'Rattles ancient bones with dread force.' },
  bewitch: { id: 'bewitch', name: 'Bewitch', type: 'dark', power: 0, accuracy: 100, category: 'debuffAtk', description: "Lowers the foe's attack." },
  fearGaze: { id: 'fearGaze', name: 'Fear Gaze', type: 'dark', power: 0, accuracy: 100, category: 'debuffAtk', description: "A terrifying stare lowers the foe's attack." },

  radiantBeam: { id: 'radiantBeam', name: 'Radiant Beam', type: 'holy', power: 45, accuracy: 100, category: 'damage', description: 'A beam of pure light.' },
  holySmite: { id: 'holySmite', name: 'Holy Smite', type: 'holy', power: 55, accuracy: 95, category: 'damage', description: 'Smites the foe with holy force.' },
  bless: { id: 'bless', name: 'Bless', type: 'holy', power: 0, accuracy: 100, category: 'buffAtk', description: "Raises the user's attack with a blessing." },

  guardUp: { id: 'guardUp', name: 'Guard Up', type: 'physical', power: 0, accuracy: 100, category: 'guard', description: 'Braces to halve incoming damage this turn.' },
};

export const SPECIES: Record<string, SpeciesDef> = {
  hellhound: {
    id: 'hellhound', name: 'Hellhound Pup', type: 'beast', sprite: 'hellhound',
    baseHp: 38, baseAtk: 13, baseDef: 9, baseSpd: 12,
    moves: ['bite', 'howlingFang', 'feralCharge', 'guardUp'],
    xpYield: 40, catchDifficulty: 1, catchable: false,
    flavor: 'A loyal ember-eyed pup bonded to hunters for generations.',
  },
  bat: {
    id: 'bat', name: 'Bat Swarm', type: 'beast', sprite: 'bat',
    baseHp: 26, baseAtk: 11, baseDef: 6, baseSpd: 16,
    moves: ['bite', 'wingSlash', 'sonicScreech', 'bloodDrain'],
    xpYield: 22, catchDifficulty: 1, catchable: true,
    flavor: 'A chittering knot of bats that moves as one creature.',
  },
  owl: {
    id: 'owl', name: 'Moon Owl', type: 'beast', sprite: 'owl',
    baseHp: 28, baseAtk: 12, baseDef: 8, baseSpd: 14,
    moves: ['peck', 'nightDive', 'screech', 'wingGust'],
    xpYield: 25, catchDifficulty: 1, catchable: true,
    flavor: 'Silent wings carry this watcher between the graveyard yews.',
  },
  werewolf: {
    id: 'werewolf', name: 'Werewolf', type: 'beast', sprite: 'werewolf',
    baseHp: 44, baseAtk: 17, baseDef: 11, baseSpd: 13,
    moves: ['clawRake', 'feralCharge', 'howl', 'rendingBite'],
    xpYield: 55, catchDifficulty: 2, catchable: true,
    flavor: 'Cursed to change with the moon, it hunts the forest paths.',
  },
  ghoul: {
    id: 'ghoul', name: 'Ghoul', type: 'dark', sprite: 'ghoul',
    baseHp: 34, baseAtk: 13, baseDef: 10, baseSpd: 7,
    moves: ['rottenBite', 'shadowClaw', 'infect', 'guardUp'],
    xpYield: 30, catchDifficulty: 1, catchable: true,
    flavor: 'A grave-dweller that shambles toward the scent of the living.',
  },
  fledgling: {
    id: 'fledgling', name: 'Vampire Fledgling', type: 'dark', sprite: 'fledgling',
    baseHp: 32, baseAtk: 14, baseDef: 9, baseSpd: 13,
    moves: ['bite', 'shadowBite', 'bloodDrain', 'nightCurse'],
    xpYield: 34, catchDifficulty: 2, catchable: true,
    flavor: 'Newly turned and reckless, still learning the old powers.',
  },
  wraith: {
    id: 'wraith', name: 'Wraith', type: 'dark', sprite: 'wraith',
    baseHp: 30, baseAtk: 15, baseDef: 8, baseSpd: 15,
    moves: ['chillingTouch', 'fearGaze', 'nightCurse', 'guardUp'],
    xpYield: 36, catchDifficulty: 2, catchable: true,
    flavor: 'A restless soul that drifts above the crypt floors.',
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton Knight', type: 'dark', sprite: 'skeleton',
    baseHp: 40, baseAtk: 15, baseDef: 15, baseSpd: 6,
    moves: ['swordSlash', 'shieldBash', 'boneRattle', 'guardUp'],
    xpYield: 42, catchDifficulty: 2, catchable: true,
    flavor: 'An ancient guardian bound by oath to defend its tomb.',
  },
  countess: {
    id: 'countess', name: 'Vampire Countess', type: 'dark', sprite: 'countess',
    baseHp: 46, baseAtk: 19, baseDef: 13, baseSpd: 16,
    moves: ['shadowBite', 'nightCurse', 'bloodDrain', 'bewitch'],
    xpYield: 70, catchDifficulty: 3, catchable: true,
    flavor: 'A noble bloodline elder, rarely seen and rarely spared.',
  },
  guardian: {
    id: 'guardian', name: 'Church Guardian', type: 'holy', sprite: 'guardian',
    baseHp: 42, baseAtk: 15, baseDef: 16, baseSpd: 8,
    moves: ['radiantBeam', 'holySmite', 'bless', 'guardUp'],
    xpYield: 50, catchDifficulty: 2, catchable: true,
    flavor: 'An animate suit of consecrated armor guarding sacred ground.',
  },
  griffin: {
    id: 'griffin', name: 'Blessed Griffin', type: 'holy', sprite: 'griffin',
    baseHp: 40, baseAtk: 18, baseDef: 13, baseSpd: 17,
    moves: ['radiantBeam', 'holySmite', 'skyDive', 'bless'],
    xpYield: 65, catchDifficulty: 3, catchable: true,
    flavor: 'A rare and majestic creature said to nest atop the chapel spire.',
  },
  dracula: {
    id: 'dracula', name: 'Dracula', type: 'dark', sprite: 'dracula',
    baseHp: 90, baseAtk: 22, baseDef: 16, baseSpd: 15,
    moves: ['shadowBite', 'nightCurse', 'bloodDrain', 'bewitch'],
    xpYield: 200, catchDifficulty: 99, catchable: false,
    flavor: 'The ancient lord of the crypt. Ends all who come unprepared.',
  },
};

export function statAt(base: number, level: number, growth: number): number {
  return Math.floor(base + growth * (level - 1));
}

export function computeStats(speciesId: string, level: number) {
  const s = SPECIES[speciesId];
  return {
    maxHp: statAt(s.baseHp, level, 4.2),
    atk: statAt(s.baseAtk, level, 1.6),
    def: statAt(s.baseDef, level, 1.3),
    spd: statAt(s.baseSpd, level, 1.1),
  };
}

export function xpToNext(level: number): number {
  return 18 + level * 22;
}
