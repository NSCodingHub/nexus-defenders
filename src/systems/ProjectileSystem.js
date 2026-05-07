export function tickProjectiles(projectiles, enemies, delta) {
  const dt = delta / 1000;
  const killed = [], dmgNums = [], remaining = [];

  for (const p of projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.traveled += Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;

    if (p.traveled > p.maxRange) continue;

    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy <= (p.radius + 10) ** 2) {
        e.hp -= p.dmg;
        dmgNums.push({ x: e.x, y: e.y - 14, val: Math.round(p.dmg), critical: p.dmg > 40 });
        if (p.poison) {
          e.poisoned = true;
          e.venomStacks = Math.min((e.venomStacks || 0) + (p.venomStacks || 3), 8);
        }
        if (e.hp <= 0) { e.hp = 0; e.dead = true; if (!e.counted) { e.counted = true; killed.push(e); } }
        hit = true;
        if (!p.pierce) break;
      }
    }
    if (!hit) remaining.push(p);
  }

  return { remaining, killed, dmgNums };
}
