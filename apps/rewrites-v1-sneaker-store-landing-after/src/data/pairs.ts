export type SizeChip = {
  size: string;
  available: boolean;
};

export type StockStatus = 'in-stock' | 'low' | 'sold-out';

export interface Pair {
  id: string; // "01".."12"
  name: string;
  colorway: string;
  price: number;
  stock: number;
  sizes: SizeChip[];
}

const STANDARD_RUN = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'];
const EXTENDED_RUN = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'];

function run(sizes: string[], unavailable: string[] = []): SizeChip[] {
  return sizes.map((size) => ({ size, available: !unavailable.includes(size) }));
}

export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'sold-out';
  if (stock <= 2) return 'low';
  return 'in-stock';
}

export const PAIRS: Pair[] = [
  {
    id: '01',
    name: 'Trail Marshal',
    colorway: 'Olive/Clay',
    price: 184,
    stock: 6,
    sizes: run(STANDARD_RUN, ['7', '13']),
  },
  {
    id: '02',
    name: 'Low Cut Sentinel',
    colorway: 'Cream/Navy',
    price: 172,
    stock: 2,
    sizes: run(STANDARD_RUN, ['7', '7.5', '8', '9.5', '10', '10.5', '11', '11.5', '12', '13']),
  },
  {
    id: '03',
    name: 'Highline Wedge',
    colorway: 'Charcoal/Bone',
    price: 196,
    stock: 0,
    sizes: run(STANDARD_RUN, STANDARD_RUN),
  },
  {
    id: '04',
    name: 'Court Runner',
    colorway: 'Bone/Rust',
    price: 158,
    stock: 8,
    sizes: run(STANDARD_RUN, ['7']),
  },
  {
    id: '05',
    name: 'Long Distance Field Marshal',
    colorway: 'Moss/Bone',
    price: 204,
    stock: 3,
    sizes: run(STANDARD_RUN, ['7', '7.5', '8', '8.5', '9', '11.5', '12', '13']),
  },
  {
    id: '06',
    name: 'Vector Trainer',
    colorway: 'Slate/Cream',
    price: 168,
    stock: 5,
    sizes: run(STANDARD_RUN, ['8', '13']),
  },
  {
    id: '07',
    name: 'Deck Shoe Seven',
    colorway: 'Navy/Bone',
    price: 1240,
    stock: 1,
    sizes: run(STANDARD_RUN, ['7', '7.5', '8', '8.5', '9.5', '10', '10.5', '11', '12', '13']),
  },
  {
    id: '08',
    name: 'Ridge Walker',
    colorway: 'Rust/Charcoal',
    price: 188,
    stock: 0,
    sizes: run(STANDARD_RUN, STANDARD_RUN),
  },
  {
    id: '09',
    name: 'Apex Cross',
    colorway: 'Bone/Olive',
    price: 176,
    stock: 9,
    sizes: run(EXTENDED_RUN, ['6', '13']),
  },
  {
    id: '10',
    name: 'Switchback',
    colorway: 'Clay/Navy',
    price: 164,
    stock: 4,
    sizes: run(STANDARD_RUN, ['7', '7.5', '12']),
  },
  {
    id: '11',
    name: 'Counter Runner',
    colorway: 'Charcoal/Rust',
    price: 192,
    stock: 2,
    sizes: run(STANDARD_RUN, ['7', '7.5', '8', '8.5', '9', '9.5', '10.5', '11.5', '12', '13']),
  },
  {
    id: '12',
    name: 'Night Shift',
    colorway: 'Bone/Slate',
    price: 180,
    stock: 6,
    sizes: run(STANDARD_RUN, ['7', '9.5']),
  },
];

export const CHECKLIST = [
  'Box code cross-checked against manifest',
  'Stitching + glue line inspected under loupe',
  'Insole stamp + date code verified',
  'Weight matched to reference pair, +/- 2g',
  'Hardware, eyelets + lace lock checked',
  'Colourway batch confirmed against release sheet',
  'Final walk-through, boxed + labelled by hand',
];

export const STEPS = [
  {
    number: '01',
    title: 'Authenticated in-shop',
    detail: 'Every pair clears our 7-point check on the counter before it is listed. No stock room, no drop-shipping.',
  },
  {
    number: '02',
    title: 'Photographed on the actual pair',
    detail: 'The photo on the shelf is the pair in the box. What you see Thursday is what ships Thursday.',
  },
  {
    number: '03',
    title: 'Shipped same day',
    detail: 'Orders leave the Crosstown counter the afternoon they land. No warehouse queue, no six-week wait.',
  },
];

export const FOUNDER_NOTE = `I started SIDESTEP because I was tired of paying full price for pairs that turned out to be wrong, or waiting six weeks for something that was supposed to ship same day. Now every pair that reaches the shelf has been through our own 7-point check on the counter, photographed as-is, and boxed by someone who checked the stitching themselves. One drop a week, twelve pairs, no restock games.`;

export const FOOTER_LINKS = {
  shop: [
    { label: "This week's shelf", href: '#shelf' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Authentication', href: '#proof' },
  ],
  info: [
    { label: 'Shipping', href: '#how-it-works' },
    { label: 'Returns', href: '#proof' },
    { label: 'Contact', href: '#join' },
  ],
};
