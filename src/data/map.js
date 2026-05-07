// DD1-inspired map layout.
// Two natural chokepoints:
//   LEFT  ~(310, 390): Gates A + D converge here
//   RIGHT ~(920, 375): Gates B + C converge here
// A tower near either chokepoint covers 2 gates simultaneously.
// Center area (~560-640, 360): all 4 paths converge.

export const GAME_W = 1280;
export const GAME_H = 720;
export const CRYSTAL = { x: 640, y: 360 };

// Min pixel clearance from any path segment for tower placement
export const PLACEMENT_CLEARANCE = 52;

// Pixel radius for waypoint arrival detection
export const WAYPOINT_REACH = 14;

// Tower visual/logic radius
export const TOWER_RADIUS = 22;

export const GATES = [
  {
    id: 'A', label: 'GATE α', color: 0x22d3ee, hexStr: '#22d3ee',
    x: 80, y: 80,
    waypoints: [
      { x: 80,  y: 80  },
      { x: 150, y: 80  },
      { x: 230, y: 140 },
      { x: 270, y: 240 },
      { x: 300, y: 340 },
      { x: 320, y: 395 },  // ← LEFT CHOKEPOINT
      { x: 420, y: 370 },
      { x: 530, y: 360 },
      { x: 640, y: 360 },
    ],
  },
  {
    id: 'B', label: 'GATE β', color: 0xa855f7, hexStr: '#a855f7',
    x: 1200, y: 80,
    waypoints: [
      { x: 1200, y: 80  },
      { x: 1130, y: 80  },
      { x: 1050, y: 140 },
      { x: 1010, y: 240 },
      { x: 980,  y: 340 },
      { x: 960,  y: 380 },  // ← RIGHT CHOKEPOINT
      { x: 860,  y: 368 },
      { x: 750,  y: 360 },
      { x: 640,  y: 360 },
    ],
  },
  {
    id: 'C', label: 'GATE γ', color: 0xf97316, hexStr: '#f97316',
    x: 1200, y: 640,
    waypoints: [
      { x: 1200, y: 640 },
      { x: 1130, y: 640 },
      { x: 1040, y: 580 },
      { x: 1000, y: 490 },
      { x: 970,  y: 410 },
      { x: 940,  y: 372 },  // ← RIGHT CHOKEPOINT
      { x: 840,  y: 365 },
      { x: 740,  y: 360 },
      { x: 640,  y: 360 },
    ],
  },
  {
    id: 'D', label: 'GATE δ', color: 0x34d399, hexStr: '#34d399',
    x: 80, y: 640,
    waypoints: [
      { x: 80,  y: 640 },
      { x: 150, y: 640 },
      { x: 240, y: 580 },
      { x: 280, y: 490 },
      { x: 310, y: 410 },
      { x: 325, y: 382 },  // ← LEFT CHOKEPOINT
      { x: 430, y: 370 },
      { x: 540, y: 362 },
      { x: 640, y: 360 },
    ],
  },
];

// Decorative pillar positions (visual only, placed away from paths)
export const PILLARS = [
  { x: 200, y: 360 }, { x: 400, y: 180 }, { x: 400, y: 540 },
  { x: 880, y: 180 }, { x: 880, y: 540 }, { x: 1080, y: 360 },
  { x: 640, y: 180 }, { x: 640, y: 540 },
];
