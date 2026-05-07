import { ITEMS } from '../data/items.js';

const PICKUP_R  = 42;
const LIFETIME  = 28000;

export function createGroundDrop(enemy) {
  const r = Math.random();
  const base = { x: enemy.x + (Math.random() - 0.5) * 26, y: enemy.y + (Math.random() - 0.5) * 26, lifetime: LIFETIME, uid: (Math.random() * 1e9) | 0 };
  if (r < 0.15) return null;
  if (r < 0.38) return { ...base, type: 'mana',  value: 22 };
  if (r < 0.94) return { ...base, type: 'gold',  value: Math.max(1, Math.round((enemy.gold || 5) * (0.25 + Math.random() * 0.35))) };
  return { ...base, type: 'item', item: ITEMS[Math.floor(Math.random() * ITEMS.length)] };
}

export function tickDrops(drops, hero, delta) {
  const picked = [], remaining = [];
  for (const d of drops) {
    d.lifetime -= delta;
    if (d.lifetime <= 0) continue;
    if (!hero.dead) {
      const dx = d.x - hero.x, dy = d.y - hero.y;
      if (dx * dx + dy * dy <= PICKUP_R * PICKUP_R) { picked.push(d); continue; }
    }
    remaining.push(d);
  }
  return { picked, remaining };
}
