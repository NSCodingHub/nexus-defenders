import { HEROES, BONDS } from '../data/heroes.js';
import { upgradeMult, tickUpgrade } from './TowerSystem.js';

// ─── stat helpers ────────────────────────────────────────────────────────────

export function getBonuses(heroId, abilityNodes) {
  const nodes = abilityNodes[heroId] || [];
  return nodes.reduce((acc, n) => ({ ...acc, ...n.bonus }), {});
}

export function effDmg(base, upgTier, powerStat, bonuses) {
  return base * upgradeMult(upgTier) * (1 + (powerStat - 5) * 0.08) * (bonuses.dmgMult || 1);
}

export function effRange(base, upgTier, rangeStat, bonuses) {
  return base * upgradeMult(upgTier) * (1 + (rangeStat - 5) * 0.06) * (bonuses.rangeMult || 1);
}

export function effRate(baseRate, upgTier, hasteStat, bonuses) {
  // rate = shots/sec; higher is faster
  return baseRate * upgradeMult(upgTier) * (1 + (hasteStat - 5) * 0.06) * (bonuses.rateMult || 1);
}

// ─── bond detection ──────────────────────────────────────────────────────────

export function activeBonds(squadIds) {
  return BONDS.filter(b => b.heroes.every(h => squadIds.includes(h)));
}

// ─── damage number pool (returned for the scene to render) ───────────────────

export function processTick(state, delta) {
  const { towers, enemies, squad, heroStats, abilityNodes, diff, bonds } = state;
  const results = { killed: [], dmgNums: [], crystalHit: 0 };

  // Tick upgrade timers (also handled in GameScene update — CombatSystem skips to avoid double-tick)


  // Enemy movement + crystal hit
  enemies.forEach(enemy => {
    if (enemy.dead) return;
    moveEnemy(enemy, delta, diff);

    if (enemy.atCrystal) {
      results.crystalHit += enemy.def.dmg;
      enemy.dead = true;
    }
  });

  // Soft separation between enemies
  separateEnemies(enemies);

  // Conduit effects on enemies
  towers.filter(t => t.active && t.type === 'C').forEach(conduit => {
    const hero    = HEROES[conduit.heroId];
    const stats   = heroStats[conduit.heroId];
    const bonuses = getBonuses(conduit.heroId, abilityNodes);
    const rangeBase = conduit.def.cost; // range encoded via a formula in GameScene

    enemies.forEach(enemy => {
      if (enemy.dead) return;
      const dx = enemy.x - conduit.x;
      const dy = enemy.y - conduit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rng = effRange(120, conduit.upgTier, stats.Range, bonuses);
      if (dist <= rng) {
        applyConduitEffect(conduit.heroId, enemy, delta, bonuses);
      }
    });
  });

  // Anchor auras
  towers.filter(t => t.active && t.type === 'A').forEach(anchor => {
    // Anchors boost nearby Strikers — handled at Striker fire time via anchorAura bonus
    // Anchor HP passive regen (Living Anchor item not yet wired — placeholder)
  });

  // Striker attacks
  towers.filter(t => t.active && (t.type === 'S' || t.type === 'S2')).forEach(striker => {
    const hero    = HEROES[striker.heroId];
    const def     = striker.def;
    const stats   = heroStats[striker.heroId];
    const bonuses = getBonuses(striker.heroId, abilityNodes);

    const ratePerSec = effRate(def.rate, striker.upgTier, stats.Haste, bonuses);
    striker.shotCooldown -= delta;
    if (striker.shotCooldown > 0) return;
    striker.shotCooldown = 1000 / ratePerSec;

    const range = effRange(def.range, striker.upgTier, stats.Range, bonuses);

    // Find target — prioritise furthest along path
    const inRange = enemies.filter(e => !e.dead && dist2(e, striker) <= range * range);
    if (inRange.length === 0) return;

    inRange.sort((a, b) => b.pathProgress - a.pathProgress);
    const target = inRange[0];

    let dmg = effDmg(def.dmg, striker.upgTier, stats.Power, bonuses);

    // Marked / conduit combos
    if (target.marked && striker.heroId === 'AXIOM') {
      dmg *= (bonuses.markedMult || 3);
    }
    if (target.slowed && (striker.heroId === 'LYRA')) {
      dmg *= 2;
    }
    if (target.poisoned && striker.heroId === 'GRAK') {
      dmg *= (bonuses.poisonMult || 2);
    }
    if (target.inFracture && striker.heroId === 'NOVA') {
      dmg *= 2;
    }
    if (target.poisoned && striker.heroId === 'ZARA') {
      dmg *= 1.5;
    }
    if (target.marked && striker.heroId === 'ECLIPSE') {
      dmg *= (bonuses.markedBoost || 1);
      // Execute
      const execThresh = bonuses.execThresh || 0.25;
      if (target.hp / target.maxHp <= execThresh) {
        dmg = target.hp + 1;
      }
    }

    // Bond effects
    bonds.forEach(b => {
      if (b.id === 'iron_age' && striker.heroId === 'AXIOM' && target.slowed) dmg *= 1.4;
      if (b.id === 'event_horizon' && striker.heroId === 'NOVA' && target.inWell) dmg *= 1.5;
    });

    // Anchor aura check
    const nearbyAnchorBoost = towers
      .filter(t => t.active && t.type === 'A' && t.heroId === striker.heroId && dist2(t, striker) <= 150 * 150)
      .reduce((acc, a) => acc * (getBonuses(a.heroId, abilityNodes).anchorAura || 1.25), 1);
    dmg *= nearbyAnchorBoost;

    applyDamage(target, dmg, results);

    // Cascade protocol (AXIOM Epic)
    if (bonuses.cascadeBonus && target.dead) {
      const nextTarget = inRange.find(e => !e.dead);
      if (nextTarget) applyDamage(nextTarget, dmg * 0.5, results);
    }

    // Cursed Ground bond: venom spreads on death
    if (target.dead && bonds.find(b => b.id === 'cursed_ground')) {
      enemies.forEach(e => {
        if (!e.dead && dist2(e, target) <= 60 * 60) {
          e.venomStacks = (e.venomStacks || 0) + 2;
          e.poisoned = true;
        }
      });
    }
  });

  // Poison tick
  enemies.forEach(enemy => {
    if (enemy.dead || !enemy.poisoned) return;
    const tickDmg = (enemy.venomStacks || 1) * 5 * (delta / 1000);
    applyDamage(enemy, tickDmg, results);
  });

  // Collect dead
  enemies.forEach(e => { if (e.dead && !e.counted) { e.counted = true; results.killed.push(e); } });

  return results;
}

function applyDamage(enemy, dmg, results) {
  if (enemy.dead) return;
  enemy.hp -= dmg;
  results.dmgNums.push({ x: enemy.x, y: enemy.y - 14, val: Math.round(dmg), critical: dmg > 40 });
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.dead = true;
  }
}

function applyConduitEffect(heroId, enemy, delta, bonuses) {
  const dt = delta / 1000;
  if (heroId === 'AXIOM') {
    enemy.marked = true;
  } else if (heroId === 'LYRA') {
    enemy.slowed = true;
    enemy.slowFactor = Math.max(enemy.slowFactor || 1, bonuses.slowAmt ? (1 - bonuses.slowAmt) : 0.5);
  } else if (heroId === 'GRAK') {
    enemy.poisoned = true;
    enemy.hp -= 8 * dt;
    enemy.venomStacks = Math.min((enemy.venomStacks || 0) + dt * 0.5, bonuses.venomCap || 5);
  } else if (heroId === 'NOVA') {
    enemy.inFracture = true;
    enemy.slowFactor = Math.max(enemy.slowFactor || 1, bonuses.timeSlow ? (1 - bonuses.timeSlow) : 0.5);
  } else if (heroId === 'ZARA') {
    enemy.poisoned = true;
    const capRate = bonuses.venomCap ? bonuses.venomCap : 5;
    enemy.venomStacks = Math.min((enemy.venomStacks || 0) + dt * 0.8, capRate);
  } else if (heroId === 'ECLIPSE') {
    enemy.marked = true;
  }
}

function moveEnemy(enemy, delta, diff) {
  const dt = delta / 1000;
  const wps = enemy.waypoints;
  if (!wps || enemy.waypointIndex >= wps.length) {
    enemy.atCrystal = true;
    return;
  }

  const target = wps[enemy.waypointIndex];
  const dx = target.x + (enemy.laneOff || 0) * Math.sign(target.y - (wps[enemy.waypointIndex - 1]?.y ?? target.y) || 1) - enemy.x;
  const dy = target.y - (enemy.laneOff || 0) * Math.sign(target.x - (wps[enemy.waypointIndex - 1]?.x ?? target.x) || 1) - enemy.y;

  // Simpler: just go to waypoint directly; laneOff is applied at spawn
  const tx = target.x;
  const ty = target.y;
  const ex = tx - enemy.x;
  const ey = ty - enemy.y;
  const dist = Math.sqrt(ex * ex + ey * ey);

  let speed = enemy.spd * diff.sm;
  if (enemy.slowFactor) speed *= (1 - enemy.slowFactor + 1); // slowFactor=0.5 means half speed
  // Correct: slowFactor is the reduced speed fraction directly
  if (enemy.slowFactor !== undefined) speed = enemy.spd * diff.sm * enemy.slowFactor;

  if (dist < 14) {
    enemy.waypointIndex++;
    if (enemy.waypointIndex >= wps.length) enemy.atCrystal = true;
    return;
  }

  const nx = ex / dist;
  const ny = ey / dist;
  enemy.x += nx * speed * dt;
  enemy.y += ny * speed * dt;
  enemy.pathProgress = enemy.waypointIndex / wps.length + (1 - dist / 500) / wps.length;

  // Decay temporary debuffs each frame
  if (enemy.slowed)     enemy.slowed = false;       // re-applied by conduit zone if still in range
  if (enemy.inFracture) enemy.inFracture = false;
}

function separateEnemies(enemies) {
  const PUSH_DIST = 18;
  const PUSH_FORCE = 0.4;
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < PUSH_DIST && d > 0.01) {
        const f = PUSH_FORCE * (1 - d / PUSH_DIST);
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * f;
        a.y -= ny * f;
        b.x += nx * f;
        b.y += ny * f;
      }
    }
  }
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
