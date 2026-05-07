import { GATES, PLACEMENT_CLEARANCE, TOWER_RADIUS } from '../data/map.js';
import { HEROES, STRUCTURE_HP, UPGRADE_COSTS, UPGRADE_BUILD_TIMES } from '../data/heroes.js';

// Returns true if (x,y) is too close to any gate path
export function isClearOfPaths(x, y) {
  for (const gate of GATES) {
    const wps = gate.waypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      if (distToSegment(x, y, wps[i], wps[i + 1]) < PLACEMENT_CLEARANCE) return false;
    }
  }
  return true;
}

// Returns true if (x,y) doesn't overlap any existing tower
export function isClearOfTowers(x, y, towers) {
  for (const t of towers) {
    const dx = t.x - x;
    const dy = t.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < TOWER_RADIUS * 2.2) return false;
  }
  return true;
}

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - a.x) * dx + (py - a.y) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

export function buildTower(heroId, structType, x, y, uid) {
  const hero = HEROES[heroId];
  const def = hero[structType];
  const hp  = STRUCTURE_HP[structType];
  return {
    uid,
    heroId,
    type: structType,
    x, y,
    def,
    hp,
    maxHp: hp,
    upgTier: 0,           // 0 = base, 1-6 = upgraded
    upgBuilding: false,   // true while upgrade timer is running
    upgProgress: 0,       // ms elapsed toward current upgrade
    shotCooldown: 0,      // ms until next shot (Strikers only)
    active: true,
  };
}

export function startUpgrade(tower) {
  if (tower.upgTier >= 6 || tower.upgBuilding) return false;
  const cost = UPGRADE_COSTS[tower.upgTier];
  tower.upgBuilding = true;
  tower.upgProgress = 0;
  return cost;
}

// Call every tick delta (ms); returns true when upgrade finishes
export function tickUpgrade(tower, delta) {
  if (!tower.upgBuilding) return false;
  const needed = UPGRADE_BUILD_TIMES[tower.upgTier] || 0;
  tower.upgProgress += delta;
  if (tower.upgProgress >= needed) {
    tower.upgBuilding = false;
    tower.upgProgress = 0;
    tower.upgTier++;
    return true;
  }
  return false;
}

export function upgradeMult(tier) {
  // Each tier adds 15% damage / HP multiplicatively
  return Math.pow(1.15, tier);
}
