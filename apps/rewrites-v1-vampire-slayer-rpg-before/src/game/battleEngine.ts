import { MonsterInstance, Move, MonType } from './types';
import { SPECIES, computeStats, xpToNext, MOVES } from './monsters';

export function createMonster(speciesId: string, level: number, uid: string): MonsterInstance {
  const stats = computeStats(speciesId, level);
  return {
    uid,
    speciesId,
    level,
    xp: 0,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    atkMod: 0,
    defMod: 0,
  };
}

export function statMultiplier(mod: number): number {
  // each stage is +/- 20%, clamped
  const clamped = Math.max(-4, Math.min(4, mod));
  return 1 + clamped * 0.2;
}

export function liveStats(m: MonsterInstance) {
  const base = computeStats(m.speciesId, m.level);
  return {
    maxHp: base.maxHp,
    atk: Math.max(1, Math.round(base.atk * statMultiplier(m.atkMod))),
    def: Math.max(1, Math.round(base.def * statMultiplier(m.defMod))),
    spd: base.spd,
  };
}

const TYPE_CHART: Record<string, Partial<Record<MonType, number>>> = {
  holy: { dark: 2, beast: 0.5 },
  dark: { beast: 2, holy: 0.5 },
  beast: { holy: 2, dark: 0.5 },
  physical: {},
};

export function typeMultiplier(moveType: MonType, defType: MonType): number {
  if (moveType === 'physical') return 1;
  const row = TYPE_CHART[moveType];
  return row[defType] ?? 1;
}

export interface DamageResult {
  damage: number;
  effectiveness: 'super' | 'weak' | 'normal';
  crit: boolean;
}

export function calcDamage(move: Move, attacker: MonsterInstance, defender: MonsterInstance): DamageResult {
  const atkStats = liveStats(attacker);
  const defStats = liveStats(defender);
  const levelFactor = 1 + attacker.level * 0.035;
  const mult = typeMultiplier(move.type, SPECIES[defender.speciesId].type);
  const crit = Math.random() < 0.06;
  let base = move.power * (atkStats.atk / Math.max(1, defStats.def)) * 0.55;
  base *= levelFactor;
  base *= mult;
  if (crit) base *= 1.5;
  base *= 0.9 + Math.random() * 0.2;
  const damage = Math.max(1, Math.round(base));
  return { damage, effectiveness: mult > 1 ? 'super' : mult < 1 ? 'weak' : 'normal', crit };
}

export function grantXp(m: MonsterInstance, amount: number): { leveledUp: boolean; newLevel: number } {
  m.xp += amount;
  let leveledUp = false;
  while (m.xp >= xpToNext(m.level) && m.level < 60) {
    m.xp -= xpToNext(m.level);
    m.level += 1;
    const stats = computeStats(m.speciesId, m.level);
    const diff = stats.maxHp - m.maxHp;
    m.maxHp = stats.maxHp;
    m.hp = Math.min(m.maxHp, m.hp + diff);
    leveledUp = true;
  }
  return { leveledUp, newLevel: m.level };
}

export function captureChance(target: MonsterInstance, vialPower: number): number {
  const species = SPECIES[target.speciesId];
  const hpPct = target.hp / target.maxHp;
  const base = 0.28 + (1 - hpPct) * 0.55;
  const difficultyPenalty = 1 / species.catchDifficulty;
  const chance = base * vialPower * difficultyPenalty;
  return Math.max(0.03, Math.min(0.95, chance));
}

export function getMove(id: string): Move {
  return MOVES[id];
}
