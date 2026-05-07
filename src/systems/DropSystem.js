import { ITEMS, RARITIES } from '../data/items.js';

const RARITY_WEIGHTS = {
  Common: 60, Uncommon: 25, Rare: 10, Epic: 4, Legendary: 1, Mythic: 0,
};

// Returns an item or null
export function rollDrop(heroIds, diffGuar, fortuneStat) {
  // Fortune stat (0-10) shifts weights up by up to 2 rarity tiers
  const fortShift = Math.floor(fortuneStat / 3.5); // 0,1,2

  const rarities = [...RARITIES];
  const weights = rarities.map((r, i) => {
    const shifted = Math.min(i + fortShift, rarities.length - 1);
    return RARITY_WEIGHTS[rarities[shifted]] ?? 0;
  });

  // Apply guaranteed floor
  const guarIndex = RARITIES.indexOf(diffGuar);
  for (let i = 0; i < guarIndex; i++) weights[i] = 0;

  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  let chosenRarity = RARITIES[0];
  for (let i = 0; i < rarities.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { chosenRarity = rarities[i]; break; }
  }

  // Filter items eligible for this hero squad
  const pool = ITEMS.filter(item => {
    if (item.rar !== chosenRarity) return false;
    if (item.hero === null) return true;
    return heroIds.includes(item.hero);
  });

  if (pool.length === 0) {
    // Fallback to any item of that rarity
    const fallback = ITEMS.filter(i => i.rar === chosenRarity);
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function waveCompletionRewards(waveNum, diff) {
  const goldBase = diff.gw + waveNum * 5;
  const gold = Math.round(goldBase * (0.9 + Math.random() * 0.2));
  const xp   = 20 + waveNum * 8;
  return { gold, xp };
}
