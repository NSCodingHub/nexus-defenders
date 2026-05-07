export const RARITIES = ['Common','Uncommon','Rare','Epic','Legendary','Mythic'];
export const RARITY_COLORS = {
  Common:'#9ca3af', Uncommon:'#4ade80', Rare:'#60a5fa',
  Epic:'#c084fc', Legendary:'#fb923c', Mythic:'#f43f5e',
};
export const RARITY_GLOW = {
  Common:'none', Uncommon:'0 0 8px #4ade8066', Rare:'0 0 10px #60a5fa66',
  Epic:'0 0 12px #c084fc66', Legendary:'0 0 16px #fb923c88', Mythic:'0 0 20px #f43f5eaa',
};

export const ITEMS = [
  { id:'c1', name:'Cracked Power Cell',   rar:'Common',    slot:'Weapon', hero:null,      desc:'+5% Striker damage' },
  { id:'c2', name:'Worn Plating',         rar:'Common',    slot:'Armor',  hero:null,      desc:'+8% Structure HP' },
  { id:'c3', name:'Frayed Conduit Wire',  rar:'Common',    slot:'Relic',  hero:null,      desc:'Conduits cost 5% less mana' },
  { id:'c4', name:'Loose Wiring',         rar:'Common',    slot:'Sigil',  hero:null,      desc:'+3% Anchor pulse frequency' },
  { id:'u1', name:'Charged Capacitor',    rar:'Uncommon',  slot:'Weapon', hero:null,      desc:'Every 3 hits: next attack deals +20% damage' },
  { id:'u2', name:'Resonant Casing',      rar:'Uncommon',  slot:'Relic',  hero:null,      desc:'Anchor range +15% per nearby allied structure' },
  { id:'u3', name:'Hardened Shell',       rar:'Uncommon',  slot:'Armor',  hero:null,      desc:'Structures below 30% HP take 20% less damage' },
  { id:'u4', name:'Mana Weave',           rar:'Uncommon',  slot:'Sigil',  hero:null,      desc:'Conduits cost 10% less per Conduit on field' },
  { id:'r1', name:'Feedback Loop',        rar:'Rare',      slot:'Weapon', hero:null,      desc:'Striker kills reduce Anchor cooldown by 0.5s' },
  { id:'r2', name:'Overextended Grid',    rar:'Rare',      slot:'Relic',  hero:null,      desc:'Anchor zones stack their bonuses instead of cancelling' },
  { id:'r3', name:'Brittle Foundations',  rar:'Rare',      slot:'Armor',  hero:null,      desc:'-20% Structure HP but Strikers deal +35% damage' },
  { id:'r4', name:"Fortune's Edge",       rar:'Rare',      slot:'Sigil',  hero:null,      desc:'Each equipped item grants +3% Fortune stat' },
  { id:'e1', name:'Cascade Protocol',     rar:'Epic',      slot:'Weapon', hero:null,      desc:'Striker kills trigger one bonus instant shot at nearest enemy' },
  { id:'e2', name:'Living Anchor',        rar:'Epic',      slot:'Relic',  hero:null,      desc:'Anchors passively regenerate HP of all nearby structures' },
  { id:'e3', name:'Deep Conduit',         rar:'Epic',      slot:'Sigil',  hero:null,      desc:'Conduit debuffs apply double stacks on repeat enemy pass' },
  { id:'l1', name:'Overclock Chip',       rar:'Legendary', slot:'Relic',  hero:'AXIOM',   desc:'Overclock Protocol triggers every wave, duration scales with Power' },
  { id:'l2', name:'Gravity Codex',        rar:'Legendary', slot:'Relic',  hero:'LYRA',    desc:'Gravity Wells hold enemies in place 1.5s, scales with Mana stat' },
  { id:'l3', name:'Primal Resonance',     rar:'Legendary', slot:'Relic',  hero:'GRAK',    desc:'Rooted enemies crack the ground — permanently slows the area' },
  { id:'l4', name:'Fractured Timeline',   rar:'Legendary', slot:'Relic',  hero:'NOVA',    desc:'Time-slow zones reset enemy HP to entry value when they exit' },
  { id:'l5', name:'Alpha Pack',           rar:'Legendary', slot:'Relic',  hero:'ZARA',    desc:'Spirit Wolves gain bonus HP from Resilience and respawn once per wave' },
  { id:'l6', name:'Umbral Recursion',     rar:'Legendary', slot:'Relic',  hero:'ECLIPSE', desc:'Destroyed Shadow Clones leave behind a persistent Null Zone' },
  { id:'m1', name:'The Overcurrent',      rar:'Mythic',    slot:'Sigil',  hero:'AXIOM',   desc:"AXIOM's Overcharge and Network paths both activate simultaneously" },
  { id:'m2', name:'Void Absolute',        rar:'Mythic',    slot:'Sigil',  hero:'LYRA',    desc:"All of Lyra's structure types share the same upgrade level" },
  { id:'m3', name:'Eternal Totem',        rar:'Mythic',    slot:'Sigil',  hero:'GRAK',    desc:'Fortress path Anchors cannot be destroyed — only temporarily disabled' },
  { id:'m4', name:'The Living Formula',   rar:'Mythic',    slot:'Sigil',  hero:'NOVA',    desc:'Each stat point invested passively boosts ALL other stats by 0.5%' },
  { id:'m5', name:'Serpent Ascendant',    rar:'Mythic',    slot:'Sigil',  hero:'ZARA',    desc:'Venom stacks have no cap — all excess converts to burst damage on death' },
  { id:'m6', name:'Null Genesis',         rar:'Mythic',    slot:'Sigil',  hero:'ECLIPSE', desc:'Shadow Clones mirror your full Striker layout at 60% power' },
];
