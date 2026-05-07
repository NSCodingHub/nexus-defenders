export const ENEMY_TYPES = [
  { id:'scout',   name:'Breach Scout',  emoji:'👾', bHp:80,   spd:90,  dmg:8,   gold:8,   xp:10,  elite:false, boss:false, aggroRange:160, attackRange:32, meleeDmgVsHero:6,  attackRate:1.5 },
  { id:'warrior', name:'Void Warrior',  emoji:'👹', bHp:200,  spd:60,  dmg:15,  gold:15,  xp:20,  elite:false, boss:false, aggroRange:170, attackRange:38, meleeDmgVsHero:12, attackRate:0.8 },
  { id:'swarm',   name:'Nano Swarm',    emoji:'🦟', bHp:40,   spd:130, dmg:4,   gold:5,   xp:8,   elite:false, boss:false, aggroRange:130, attackRange:24, meleeDmgVsHero:3,  attackRate:3.0 },
  { id:'brute',   name:'Rift Brute',    emoji:'🐉', bHp:500,  spd:36,  dmg:30,  gold:30,  xp:40,  elite:false, boss:false, aggroRange:200, attackRange:50, meleeDmgVsHero:22, attackRate:0.5 },
  { id:'elite',   name:'Breach Elite',  emoji:'💀', bHp:400,  spd:78,  dmg:25,  gold:50,  xp:60,  elite:true,  boss:false, aggroRange:260, attackRange:44, meleeDmgVsHero:18, attackRate:1.0 },
  { id:'boss',    name:'BREACH TITAN',  emoji:'🔥', bHp:2000, spd:24,  dmg:100, gold:200, xp:300, elite:false, boss:true,  aggroRange:999, attackRange:80, meleeDmgVsHero:40, attackRate:0.4 },
];
// speed is in pixels/second
