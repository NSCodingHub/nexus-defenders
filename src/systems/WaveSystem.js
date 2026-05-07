import { ENEMY_TYPES } from '../data/enemies.js';
import { GATES } from '../data/map.js';

// Returns array of spawn events: { gateId, typeId, delay, laneOff }
export function buildWave(waveNum, diff) {
  const { hm, sm, cm, br } = diff;
  const eliteAllowed = (hm >= 1.5);   // hard+
  const isBossWave   = (waveNum === 10);

  const events = [];

  if (isBossWave) {
    // Boss spawns from all gates simultaneously, flanked by brutes
    GATES.forEach((gate, gi) => {
      events.push({ gateId: gate.id, typeId: 'boss', delay: gi * 800, laneOff: 0 });
      events.push({ gateId: gate.id, typeId: 'brute', delay: gi * 800 + 400, laneOff: 12 });
      events.push({ gateId: gate.id, typeId: 'brute', delay: gi * 800 + 400, laneOff: -12 });
    });
    return events;
  }

  // Normal waves — pick pool based on wave number
  const pool = selectPool(waveNum, eliteAllowed);
  const baseCount = Math.round((4 + waveNum * 2) * cm);

  const gateList = GATES.map(g => g.id);

  for (let i = 0; i < baseCount; i++) {
    const typeId = pool[i % pool.length];
    const gateId = gateList[i % gateList.length];
    const laneOff = (i % 3 === 1) ? 10 : (i % 3 === 2) ? -10 : 0;
    events.push({ gateId, typeId, delay: i * 500, laneOff });
  }

  // Add boss-rate-driven elite squad
  if (eliteAllowed && Math.random() < br) {
    const eliteCount = 2 + Math.floor(waveNum / 3);
    for (let i = 0; i < eliteCount; i++) {
      const gateId = gateList[Math.floor(Math.random() * gateList.length)];
      events.push({ gateId, typeId: 'elite', delay: 2000 + i * 800, laneOff: (i % 2) * 14 - 7 });
    }
  }

  return events.sort((a, b) => a.delay - b.delay);
}

function selectPool(waveNum, eliteAllowed) {
  if (waveNum <= 2)  return ['scout', 'scout', 'scout', 'swarm'];
  if (waveNum <= 4)  return ['scout', 'warrior', 'swarm'];
  if (waveNum <= 6)  return ['warrior', 'swarm', 'brute'];
  if (waveNum <= 8)  return ['warrior', 'brute', eliteAllowed ? 'elite' : 'warrior'];
  return ['brute', eliteAllowed ? 'elite' : 'brute', 'warrior'];
}

export function scaleEnemy(type, waveNum, diff) {
  const base = ENEMY_TYPES.find(e => e.id === type);
  const { hm, sm } = diff;
  const waveMult = 1 + (waveNum - 1) * 0.12;
  return {
    ...base,
    hp:    Math.round(base.bHp * hm * waveMult),
    maxHp: Math.round(base.bHp * hm * waveMult),
    spd:   base.spd * sm,
  };
}
