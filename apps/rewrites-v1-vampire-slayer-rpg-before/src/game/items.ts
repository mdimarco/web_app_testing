import { ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: 'Potion', description: 'Restores 30 HP to one thrall.', price: 15, kind: 'heal', power: 30 },
  superPotion: { id: 'superPotion', name: 'Super Potion', description: 'Restores 65 HP to one thrall.', price: 40, kind: 'heal', power: 65 },
  elixir: { id: 'elixir', name: 'Elixir', description: 'Fully restores one thrall.', price: 90, kind: 'heal', power: 9999 },
  holyVial: { id: 'holyVial', name: 'Holy Vial', description: 'Thrown at a weakened vampire to seal it.', price: 25, kind: 'capture', power: 1 },
  greaterVial: { id: 'greaterVial', name: 'Greater Vial', description: 'A stronger seal, more likely to succeed.', price: 60, kind: 'capture', power: 1.6 },
};
