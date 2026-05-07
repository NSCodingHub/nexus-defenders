import { HEROES } from '../data/heroes.js';
import { GAME_W, GAME_H } from '../data/map.js';

const PLAY_W  = GAME_W - 200;
const MARGIN  = 22;
const HUD_H   = 80;
const RESPAWN = 8000;

export function createHero(heroId) {
  const c = HEROES[heroId].heroCombat;
  return {
    id: heroId,
    x: PLAY_W / 2, y: (GAME_H - HUD_H) / 2,
    hp: c.maxHP, maxHp: c.maxHP,
    mana: c.maxMana * 0.5, maxMana: c.maxMana,
    dead: false, respawnTimer: 0,
    attackCooldown: 0,
    abilityCooldowns: [0, 0, 0, 0],
    facing: 0,
    kbVx: 0, kbVy: 0,
    buffDmgMult: 1, buffDmgTimer: 0,
    buffRateMult: 1, buffRateTimer: 0,
    invincible: false, invincibleTimer: 0,
    speedBoost: 1, speedBoostTimer: 0,
  };
}

export function tickHero(hero, keys, cursorX, cursorY, delta, inputMode) {
  const dt = delta / 1000;
  const c  = HEROES[hero.id].heroCombat;
  const abilities = HEROES[hero.id].heroAbilities;
  const out = { projectiles: [], swings: [], abilityEffects: [], respawned: false };

  // ── respawn ──────────────────────────────────────────────────────────────
  if (hero.dead) {
    hero.respawnTimer -= delta;
    if (hero.respawnTimer <= 0) {
      hero.dead = false;
      hero.hp   = hero.maxHp;
      hero.mana = hero.maxMana * 0.5;
      hero.x    = PLAY_W / 2;
      hero.y    = (GAME_H - HUD_H) / 2;
      hero.kbVx = hero.kbVy = 0;
      out.respawned = true;
    }
    return out;
  }

  // ── buff / status timers ─────────────────────────────────────────────────
  _decTimer(hero, 'buffDmgTimer',    delta, () => hero.buffDmgMult  = 1);
  _decTimer(hero, 'buffRateTimer',   delta, () => hero.buffRateMult = 1);
  _decTimer(hero, 'invincibleTimer', delta, () => hero.invincible   = false);
  _decTimer(hero, 'speedBoostTimer', delta, () => hero.speedBoost   = 1);

  // ── mana regen ───────────────────────────────────────────────────────────
  hero.mana = Math.min(hero.maxMana, hero.mana + c.manaRegen * dt);

  // ── ability cooldowns ────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    if (hero.abilityCooldowns[i] > 0)
      hero.abilityCooldowns[i] = Math.max(0, hero.abilityCooldowns[i] - delta);
  }

  // ── movement ─────────────────────────────────────────────────────────────
  let mvx = 0, mvy = 0;
  if (inputMode === 'move') {
    if (keys.up)    mvy -= 1;
    if (keys.down)  mvy += 1;
    if (keys.left)  mvx -= 1;
    if (keys.right) mvx += 1;
    if (mvx !== 0 && mvy !== 0) { mvx /= Math.SQRT2; mvy /= Math.SQRT2; }
  }
  const spd = c.moveSpeed * hero.speedBoost;
  hero.x += (mvx * spd + hero.kbVx) * dt;
  hero.y += (mvy * spd + hero.kbVy) * dt;
  hero.kbVx *= Math.pow(0.02, dt);
  hero.kbVy *= Math.pow(0.02, dt);
  hero.x = Math.max(MARGIN, Math.min(PLAY_W - MARGIN, hero.x));
  hero.y = Math.max(MARGIN, Math.min(GAME_H - HUD_H - MARGIN, hero.y));

  // ── facing ───────────────────────────────────────────────────────────────
  const fdx = cursorX - hero.x;
  const fdy = cursorY - hero.y;
  if (Math.abs(fdx) > 2 || Math.abs(fdy) > 2) hero.facing = Math.atan2(fdy, fdx);

  // ── primary attack ────────────────────────────────────────────────────────
  hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
  if (keys.attack && hero.attackCooldown <= 0 && inputMode === 'move') {
    const rate = c.attackRate * hero.buffRateMult;
    hero.attackCooldown = 1000 / rate;
    const dmg = c.attackDmg * hero.buffDmgMult;
    const flen = Math.sqrt(fdx * fdx + fdy * fdy) || 1;

    if (c.attackType === 'ranged') {
      out.projectiles.push({
        uid: uid(), x: hero.x, y: hero.y,
        vx: (fdx / flen) * c.projectileSpeed,
        vy: (fdy / flen) * c.projectileSpeed,
        dmg, maxRange: c.attackRange + 80, traveled: 0,
        color: c.attackColor, radius: 5,
      });
    } else {
      out.swings.push({
        uid: uid(),
        cx: hero.x + Math.cos(hero.facing) * c.attackRange * 0.55,
        cy: hero.y + Math.sin(hero.facing) * c.attackRange * 0.55,
        radius: c.attackRange * 0.75,
        dmg,
        facing: hero.facing, arcAngle: Math.PI * 0.8,
        heroX: hero.x, heroY: hero.y,
      });
    }
  }

  // ── abilities ─────────────────────────────────────────────────────────────
  ['q','e','r','f'].forEach((k, i) => {
    if (!keys[k]) return;
    const ab = abilities[i];
    if (!ab || hero.abilityCooldowns[i] > 0 || hero.mana < ab.manaCost) return;

    hero.mana -= ab.manaCost;
    hero.abilityCooldowns[i] = ab.cooldown * 1000;

    // Immediate hero-side effects
    switch (ab.effect) {
      case 'dash': {
        const dist = ab.dashDist || 160;
        if (ab.atCursor) {
          hero.x = Math.max(MARGIN, Math.min(PLAY_W - MARGIN, cursorX));
          hero.y = Math.max(MARGIN, Math.min(GAME_H - HUD_H - MARGIN, cursorY));
        } else {
          hero.x = Math.max(MARGIN, Math.min(PLAY_W - MARGIN, hero.x + Math.cos(hero.facing) * dist));
          hero.y = Math.max(MARGIN, Math.min(GAME_H - HUD_H - MARGIN, hero.y + Math.sin(hero.facing) * dist));
        }
        hero.invincible = true; hero.invincibleTimer = 200;
        break;
      }
      case 'speed_boost': {
        const bdist = ab.dashDist || 150;
        hero.x = Math.max(MARGIN, Math.min(PLAY_W - MARGIN, hero.x + Math.cos(hero.facing) * bdist));
        hero.y = Math.max(MARGIN, Math.min(GAME_H - HUD_H - MARGIN, hero.y + Math.sin(hero.facing) * bdist));
        hero.speedBoost = ab.speedMult || 1.8;
        hero.speedBoostTimer = (ab.speedDuration || 2) * 1000;
        hero.invincible = true; hero.invincibleTimer = 300;
        break;
      }
      case 'buff_dmg':
        hero.buffDmgMult = ab.buffMult || 1.5;
        hero.buffDmgTimer = (ab.buffDuration || 4) * 1000;
        break;
      case 'buff_rate':
        hero.buffRateMult = ab.buffMult || 2;
        hero.buffRateTimer = (ab.buffDuration || 4) * 1000;
        break;
      case 'heal':
        hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * (ab.healPct || 0.4));
        break;
    }

    out.abilityEffects.push({ ...ab, type: ab.effect, heroX: hero.x, heroY: hero.y, cursorX, cursorY });
  });

  return out;
}

function _decTimer(obj, field, delta, onExpire) {
  if (obj[field] > 0) {
    obj[field] -= delta;
    if (obj[field] <= 0) { obj[field] = 0; onExpire(); }
  }
}

function uid() { return (Math.random() * 1e9) | 0; }
