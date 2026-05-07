export const HEROES = {
  AXIOM: {
    id:'AXIOM', name:'AXIOM', title:'Combat Android', icon:'🤖', color:'#22d3ee',
    origin:'Future Tech',
    lore:'A decommissioned military android reactivated by The Breach. Cold precision, unstoppable force.',
    stats:{ Power:8, Resilience:6, Mana:7, Range:7, Haste:9, Fortune:3 },
    paths:['Overcharge','Fortress','Network'],
    pc:['#ef4444','#3b82f6','#f59e0b'],
    pathDesc:['Glass cannon — more damage, less HP','Tanky grids — structures absorb punishment','Grid synergy — anchors boost everything nearby'],
    A:{ name:'Power Node',       emoji:'⚡',  cost:80,  desc:'Nearby Strikers attack 40% faster' },
    C:{ name:'Targeting Beacon', emoji:'🎯',  cost:40,  desc:'Marks enemies — +50% damage taken from Strikers' },
    S:{ name:'Plasma Cannon',    emoji:'🔫',  cost:60,  desc:'High single-target dmg, 3× vs marked enemies',  dmg:35, range:180, rate:1.2 },
    S2:{ name:'Ion Cannon',      emoji:'💥',  cost:110, desc:'AoE burst, 4× vs marked enemies',               dmg:55, range:200, rate:0.65, tier:2 },
  },
  LYRA: {
    id:'LYRA', name:'LYRA', title:'Void Witch', icon:'🔮', color:'#a855f7',
    origin:'Void Magic',
    lore:'A dimensional exile who bends space itself. The void between realities bends to her will.',
    stats:{ Power:9, Resilience:4, Mana:10, Range:8, Haste:6, Fortune:5 },
    paths:['Collapse','Weave','Resonance'],
    pc:['#8b5cf6','#ec4899','#06b6d4'],
    pathDesc:['Maximum AoE — gravity pulls enemies together','Mana efficiency — stretch every resource further','Cross-hero amplification — empowers allies'],
    A:{ name:'Mana Bloom',    emoji:'🌸', cost:90, desc:'Nearby structures cost 25% less mana to place' },
    C:{ name:'Gravity Well',  emoji:'🌀', cost:45, desc:'Pulls and slows enemies, groups them for AoE' },
    S:{ name:'Arcane Pylon',  emoji:'⚗️', cost:65, desc:'AoE magic damage, 2× to slowed enemies', dmg:25, range:160, rate:0.8 },
    S2:{ name:'Arcane Vortex',emoji:'🌪️', cost:120, desc:'Persistent AoE zone, 3× to slowed', dmg:28, range:180, rate:0.55, tier:2 },
  },
  GRAK: {
    id:'GRAK', name:'GRAK', title:'Stone Age Berserker', icon:'🦴', color:'#f97316',
    origin:'Prehistoric Primal',
    lore:'Dragged through The Breach from 40,000 BC. He has never stopped fighting. He never will.',
    stats:{ Power:10, Resilience:10, Mana:5, Range:4, Haste:4, Fortune:4 },
    paths:['Berserker','Fortress','Totem'],
    pc:['#ef4444','#78716c','#84cc16'],
    pathDesc:['Pure aggression — destroy everything fast','Walls of bone — slows and blocks the path','Spirit totems — sustained poison devastation'],
    A:{ name:'Tremor Field', emoji:'🗿', cost:70, desc:'Slows all enemies in zone by 35%' },
    C:{ name:'Venom Pit',    emoji:'🐊', cost:35, desc:'Poisons enemies for 8 damage per second' },
    S:{ name:'Bone Totem',   emoji:'💀', cost:55, desc:'AoE ground slam, 2× damage to poisoned enemies', dmg:30, range:140, rate:0.7 },
    S2:{ name:'Mega Totem',  emoji:'☠️', cost:110, desc:'Massive AoE + stun, 3× to poisoned enemies', dmg:52, range:170, rate:0.50, tier:2 },
  },
  NOVA: {
    id:'NOVA', name:'NOVA', title:'Quantum Physicist', icon:'⚛️', color:'#a3e635',
    origin:'Experimental Tech',
    lore:'She accidentally tore The Breach open during a quantum experiment. Now she weaponizes her mistake.',
    stats:{ Power:7, Resilience:5, Mana:8, Range:9, Haste:7, Fortune:8 },
    paths:['Paradox','Collapse','Probability'],
    pc:['#84cc16','#06b6d4','#f59e0b'],
    pathDesc:['Timeline chaos — loop enemies backward','Dimensional collapse — concentrate enemy density','Fortune maximizer — loot and probability stacking'],
    A:{ name:'Quantum Bubble', emoji:'🫧', cost:85, desc:'20% chance enemies randomly skip their movement' },
    C:{ name:'Time Fracture',  emoji:'⏰', cost:50, desc:'Slows enemies 50%, Strikers deal 2× inside zone' },
    S:{ name:'Wormhole',       emoji:'🕳️', cost:70, desc:'Teleports enemies 25% back on path + deals damage', dmg:20, range:210, rate:0.6 },
    S2:{ name:'Quantum Rift',  emoji:'🌌', cost:115, desc:'Large pushback + 3× inside fractures', dmg:32, range:220, rate:0.50, tier:2 },
  },
  ZARA: {
    id:'ZARA', name:'ZARA', title:'Primal Shaman', icon:'🐍', color:'#34d399',
    origin:'Prehistoric Spirit',
    lore:'A shaman whose bond with ancient spirits only grew stronger when The Breach tore time open.',
    stats:{ Power:6, Resilience:7, Mana:8, Range:7, Haste:5, Fortune:9 },
    paths:['Pack Leader','Venom','Spirit'],
    pc:['#10b981','#84cc16','#06b6d4'],
    pathDesc:['Wolf packs — coordinated summon attacks','Venom stacking — dissolve enemies over time','Spirit communion — passive battlefield buffs'],
    A:{ name:'Spirit Mist',  emoji:'🌿', cost:75, desc:'Reduces enemy armor by 40% in zone' },
    C:{ name:'Venom Field',  emoji:'🧪', cost:40, desc:'Stacking poison, 5 dmg/sec per stack (up to 5)' },
    S:{ name:'Spirit Wolf',  emoji:'🐺', cost:65, desc:'Summons a wolf that attacks nearby enemies, bonus vs poisoned', dmg:22, range:160, rate:1.0 },
    S2:{ name:'Alpha Wolf',  emoji:'🐺', cost:115, desc:'3× vs poisoned, spawns 2 pup wolves', dmg:38, range:190, rate:0.75, tier:2 },
  },
  ECLIPSE: {
    id:'ECLIPSE', name:'ECLIPSE', title:'Shadow Mage', icon:'🌑', color:'#f43f5e',
    origin:'Void Shadow Magic',
    lore:'Born in the exact shadow of The Breach itself. Eclipse commands the darkness between dimensions.',
    stats:{ Power:9, Resilience:5, Mana:7, Range:8, Haste:8, Fortune:6 },
    paths:['Umbral','Void','Recursion'],
    pc:['#e11d48','#7c3aed','#475569'],
    pathDesc:['Shadow clone ambush — multiply your Strikers','Void unraveling — strip enemy defenses completely','Recursive darkness — exponential stacking debuffs'],
    A:{ name:'Null Zone',     emoji:'⬛', cost:80, desc:'Disables enemy abilities, +20% damage from all sources' },
    C:{ name:'Shadow Veil',   emoji:'👁️', cost:45, desc:'Marks enemies for instant execution below 25% HP' },
    S:{ name:'Shadow Spike',  emoji:'🗡️', cost:60, desc:'High damage, executes marked enemies at <25% HP', dmg:40, range:185, rate:1.0 },
    S2:{ name:'Shadow Storm', emoji:'⚡', cost:120, desc:'Chain execute — spreads to all marked enemies', dmg:52, range:210, rate:0.65, tier:2 },
  },
};

export const ABILITY_NODES = {
  AXIOM:[
    { lvl:5,  name:'Overclocked Barrels', desc:'+20% Striker attack rate',          bonus:{ strikerRate:1.20 } },
    { lvl:10, name:'Network Protocol',    desc:'Anchors grant nearby Strikers +25% dmg', bonus:{ anchorAura:1.25 } },
    { lvl:15, name:'Plasma Overload',     desc:'Marked enemy multiplier 3→4×',      bonus:{ markedMult:4 } },
    { lvl:20, name:'Fortress Grid',       desc:'Structure HP +50%',                 bonus:{ structHP:1.50 } },
  ],
  LYRA:[
    { lvl:5,  name:'Mana Resonance',  desc:'All structure costs -15%',           bonus:{ manaCost:0.85 } },
    { lvl:10, name:'Gravity Amplify', desc:'Gravity Wells slow 70% (was 50%)',   bonus:{ slowAmt:0.70 } },
    { lvl:15, name:'Void Torrent',    desc:'AoE radius +30%',                    bonus:{ aoeRadius:1.30 } },
    { lvl:20, name:'Ley Lines',       desc:'Conduit range +40%',                 bonus:{ conduitRange:1.40 } },
  ],
  GRAK:[
    { lvl:5,  name:'Primal Fury',  desc:'Poisoned enemy mult 2→2.5×',           bonus:{ poisonMult:2.5 } },
    { lvl:10, name:'Bone Wall',    desc:'Anchor HP +30%',                        bonus:{ anchorHP:1.30 } },
    { lvl:15, name:'Venom Storm',  desc:'Poison dmg/sec 8→14',                  bonus:{ poisonRate:14 } },
    { lvl:20, name:'Earthquake',   desc:'Striker AoE radius +50%',              bonus:{ strikerAoe:1.50 } },
  ],
  NOVA:[
    { lvl:5,  name:'Quantum Flux',   desc:'Wormhole pushback 25→38%',           bonus:{ wormholeBack:0.38 } },
    { lvl:10, name:'Time Dilation',  desc:'Time Fracture slow 50→68%',          bonus:{ timeSlow:0.68 } },
    { lvl:15, name:'Phase Cascade',  desc:'Quantum Bubble chance 20→32%',       bonus:{ bubbleChance:0.32 } },
    { lvl:20, name:'Paradox Engine', desc:'Wormhole deals 2× inside fractures', bonus:{ paradoxEngine:true } },
  ],
  ZARA:[
    { lvl:5,  name:'Wolf Pack',     desc:'Spirit Wolf attacks 25% faster',      bonus:{ wolfRate:1.25 } },
    { lvl:10, name:'Venom Mastery', desc:'Venom stack cap 5→8',                 bonus:{ venomCap:8 } },
    { lvl:15, name:'Spirit Bond',   desc:'Spirit Mist armor shred 40→60%',      bonus:{ armorShred:0.60 } },
    { lvl:20, name:'Alpha Howl',    desc:'Wolf kills spread 2 venom stacks',    bonus:{ alphaHowl:true } },
  ],
  ECLIPSE:[
    { lvl:5,  name:'Shadow Step',    desc:'Execute threshold 25→33% HP',        bonus:{ execThresh:0.33 } },
    { lvl:10, name:'Void Embrace',   desc:'Null Zone damage boost 20→35%',      bonus:{ nullBoost:1.35 } },
    { lvl:15, name:'Dark Recursion', desc:'Marked enemies take 2× from Strikers', bonus:{ markedBoost:2.0 } },
    { lvl:20, name:'Umbral Form',    desc:'Shadow Spikes pierce all marked in range', bonus:{ shadowPierce:true } },
  ],
};

export const BONDS = [
  { id:'iron_age',      heroes:['GRAK','AXIOM'],   color:'#f97316', name:'Iron Age',      desc:'AXIOM Strikers +40% dmg vs GRAK-slowed enemies' },
  { id:'event_horizon', heroes:['LYRA','NOVA'],    color:'#06b6d4', name:'Event Horizon', desc:'NOVA Strikers 1.5× inside LYRA Gravity Wells' },
  { id:'cursed_ground', heroes:['ZARA','ECLIPSE'], color:'#a855f7', name:'Cursed Ground', desc:'Poison spreads to adjacent enemies on death' },
];

export const STAT_COLORS = {
  Power:'#ef4444', Resilience:'#3b82f6', Mana:'#60a5fa',
  Range:'#a855f7', Haste:'#f59e0b',     Fortune:'#34d399',
};

export const STRUCTURE_HP = { A:420, C:200, S:310, S2:500 };
export const UPGRADE_COSTS = [30, 70, 130, 210, 320, 460]; // gold per upgrade tier (6 total)
export const UPGRADE_BUILD_TIMES = [0, 2000, 4000, 6000, 8000, 10000]; // ms during combat (0=instant)
