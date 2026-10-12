/**
 * Rune Spire: Abyss Deckbuilder
 * Core Game Data Definitions
 */

const HEROES_DATA = {
  ironclad: {
    id: "ironclad",
    name: "铁壁誓卫",
    title: "深渊守护者",
    hp: 80,
    maxHp: 80,
    energy: 3,
    maxEnergy: 3,
    color: "#e63946",
    glow: "rgba(230, 57, 70, 0.4)",
    desc: "擅长钢铁重铠与狂暴重击，拥有极高生存能力与盾牌反伤战术。",
    relic: "blood_stone",
    deck: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "bash", "enrage"
    ]
  },
  rogue: {
    id: "rogue",
    name: "影刃猎手",
    title: "潜影毒刃",
    hp: 70,
    maxHp: 70,
    energy: 3,
    maxEnergy: 3,
    color: "#2a9d8f",
    glow: "rgba(42, 157, 143, 0.4)",
    desc: "擅长飞刀连舞与致命毒素侵蚀，过牌迅速，出招致命灵动。",
    relic: "snake_fangs",
    deck: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "poison_blade", "blade_dance"
    ]
  },
  mage: {
    id: "mage",
    name: "奥术贤者",
    title: "元素支配者",
    hp: 65,
    maxHp: 65,
    energy: 3,
    maxEnergy: 3,
    color: "#8338ec",
    glow: "rgba(131, 56, 236, 0.4)",
    desc: "掌控烈焰爆裂与寒霜冰界，法术连锁爆发惊人，毁天灭地。",
    relic: "arcane_battery",
    deck: [
      "missile", "missile", "missile", "missile",
      "frost_shield", "frost_shield", "frost_shield", "frost_shield",
      "fire_blast", "focus"
    ]
  }
};

const CARDS_DATA = {
  // === 基础卡牌 ===
  strike: {
    id: "strike",
    name: "打击",
    type: "attack",
    cost: 1,
    rarity: "common",
    hero: "any",
    desc: "造成 {damage} 点物理伤害。",
    damage: 6,
    upgraded: {
      name: "打击+",
      desc: "造成 {damage} 点物理伤害。",
      damage: 9
    }
  },
  defend: {
    id: "defend",
    name: "防御",
    type: "skill",
    cost: 1,
    rarity: "common",
    hero: "any",
    desc: "获得 {block} 点护盾。",
    block: 5,
    upgraded: {
      name: "防御+",
      desc: "获得 {block} 点护盾。",
      block: 8
    }
  },
  bash: {
    id: "bash",
    name: "痛击",
    type: "attack",
    cost: 2,
    rarity: "common",
    hero: "ironclad",
    desc: "造成 {damage} 点伤害，施加 {vuln} 层易伤。",
    damage: 8,
    vuln: 2,
    upgraded: {
      name: "痛击+",
      desc: "造成 {damage} 点伤害，施加 {vuln} 层易伤。",
      damage: 10,
      vuln: 3
    }
  },
  enrage: {
    id: "enrage",
    name: "怒意激荡",
    type: "skill",
    cost: 1,
    rarity: "common",
    hero: "ironclad",
    desc: "获得 {str} 点力量，抽 1 张牌。",
    str: 2,
    draw: 1,
    upgraded: {
      name: "怒意激荡+",
      desc: "获得 {str} 点力量，抽 2 张牌。",
      str: 3,
      draw: 2
    }
  },
  poison_blade: {
    id: "poison_blade",
    name: "淬毒短刃",
    type: "attack",
    cost: 1,
    rarity: "common",
    hero: "rogue",
    desc: "造成 {damage} 点伤害，施加 {poison} 层中毒。",
    damage: 4,
    poison: 4,
    upgraded: {
      name: "淬毒短刃+",
      desc: "造成 {damage} 点伤害，施加 {poison} 层中毒。",
      damage: 6,
      poison: 6
    }
  },
  blade_dance: {
    id: "blade_dance",
    name: "刃舞",
    type: "skill",
    cost: 1,
    rarity: "common",
    hero: "rogue",
    desc: "将 {count} 张 0费【飞刀】加入手牌。",
    count: 3,
    upgraded: {
      name: "刃舞+",
      desc: "将 {count} 张 0费【飞刀】加入手牌。",
      count: 4
    }
  },
  shiv: {
    id: "shiv",
    name: "飞刀",
    type: "attack",
    cost: 0,
    rarity: "token",
    hero: "rogue",
    exhaust: true,
    desc: "造成 {damage} 点伤害。消耗。",
    damage: 4,
    upgraded: {
      name: "飞刀+",
      desc: "造成 {damage} 点伤害。消耗。",
      damage: 6
    }
  },
  missile: {
    id: "missile",
    name: "奥术飞弹",
    type: "attack",
    cost: 1,
    rarity: "common",
    hero: "mage",
    desc: "发射能量飞弹，造成 {damage} 点魔法伤害。",
    damage: 7,
    upgraded: {
      name: "奥术飞弹+",
      desc: "造成 {damage} 点魔法伤害。",
      damage: 10
    }
  },
  frost_shield: {
    id: "frost_shield",
    name: "寒霜屏障",
    type: "skill",
    cost: 1,
    rarity: "common",
    hero: "mage",
    desc: "获得 {block} 点护盾。",
    block: 6,
    upgraded: {
      name: "寒霜屏障+",
      desc: "获得 {block} 点护盾。",
      block: 9
    }
  },
  fire_blast: {
    id: "fire_blast",
    name: "烈焰冲击",
    type: "attack",
    cost: 2,
    rarity: "common",
    hero: "mage",
    desc: "造成 {damage} 点伤害，施加 {burn} 层灼烧。",
    damage: 12,
    burn: 3,
    upgraded: {
      name: "烈焰冲击+",
      desc: "造成 {damage} 点伤害，施加 {burn} 层灼烧。",
      damage: 16,
      burn: 5
    }
  },
  focus: {
    id: "focus",
    name: "聚精会神",
    type: "skill",
    cost: 1,
    rarity: "common",
    hero: "mage",
    desc: "抽取 2 张牌，下回合获得 1 点额外能量。",
    draw: 2,
    nextEnergy: 1,
    upgraded: {
      name: "聚精会神+",
      cost: 0,
      desc: "抽取 2 张牌，下回合获得 1 点额外能量。",
      draw: 2,
      nextEnergy: 1
    }
  },

  // === 铁壁誓卫 进阶卡牌 ===
  shield_slam: {
    id: "shield_slam",
    name: "盾牌猛击",
    type: "attack",
    cost: 2,
    rarity: "rare",
    hero: "ironclad",
    desc: "造成等同于当前护盾值的物理伤害！",
    scaleWithBlock: true,
    upgraded: {
      name: "盾牌猛击+",
      cost: 1,
      desc: "造成等同于当前护盾值的物理伤害！",
      scaleWithBlock: true
    }
  },
  cleave: {
    id: "cleave",
    name: "顺劈重斩",
    type: "attack",
    cost: 1,
    rarity: "uncommon",
    hero: "ironclad",
    desc: "造成 {damage} 点伤害，施加 {weak} 层虚弱。",
    damage: 9,
    weak: 1,
    upgraded: {
      name: "顺劈重斩+",
      desc: "造成 {damage} 点伤害，施加 {weak} 层虚弱。",
      damage: 13,
      weak: 2
    }
  },
  barricade: {
    id: "barricade",
    name: "固若金汤",
    type: "power",
    cost: 2,
    rarity: "rare",
    hero: "ironclad",
    desc: "能力：护盾在回合开始时不再清除。",
    grantBarricade: true,
    upgraded: {
      name: "固若金汤+",
      cost: 1,
      desc: "能力：护盾在回合开始时不再清除。",
      grantBarricade: true
    }
  },
  berserk: {
    id: "berserk",
    name: "狂战之血",
    type: "skill",
    cost: 1,
    rarity: "uncommon",
    hero: "ironclad",
    desc: "失去 {selfDmg} 生命，获得 {str} 点力量并抽 {draw} 张牌。",
    selfDmg: 4,
    str: 3,
    draw: 1,
    upgraded: {
      name: "狂战之血+",
      desc: "失去 {selfDmg} 生命，获得 {str} 点力量并抽 {draw} 张牌。",
      selfDmg: 3,
      str: 4,
      draw: 2
    }
  },
  iron_storm: {
    id: "iron_storm",
    name: "重装堡垒",
    type: "skill",
    cost: 1,
    rarity: "uncommon",
    hero: "ironclad",
    desc: "获得 {block} 点护盾。",
    block: 12,
    upgraded: {
      name: "重装堡垒+",
      desc: "获得 {block} 点护盾。",
      block: 16
    }
  },
  blood_reaper: {
    id: "blood_reaper",
    name: "鲜血收割",
    type: "attack",
    cost: 2,
    rarity: "rare",
    hero: "ironclad",
    desc: "造成 {damage} 点伤害，造成伤害的未格挡部分等额回复生命。",
    damage: 9,
    lifesteal: true,
    upgraded: {
      name: "鲜血收割+",
      desc: "造成 {damage} 点伤害，造成伤害的未格挡部分等额回复生命。",
      damage: 13,
      lifesteal: true
    }
  },

  // === 影刃猎手 进阶卡牌 ===
  catalyst: {
    id: "catalyst",
    name: "剧毒催化",
    type: "skill",
    cost: 1,
    rarity: "rare",
    hero: "rogue",
    desc: "使敌方现有的中毒层数翻倍！",
    multiplier: 2,
    upgraded: {
      name: "剧毒催化+",
      desc: "使敌方现有的中毒层数变为 3 倍！",
      multiplier: 3
    }
  },
  noxious_cloud: {
    id: "noxious_cloud",
    name: "致命毒雾",
    type: "power",
    cost: 1,
    rarity: "rare",
    hero: "rogue",
    desc: "能力：每回合开始时对敌方施加 {poison} 层中毒。",
    poisonTurn: 3,
    upgraded: {
      name: "致命毒雾+",
      desc: "能力：每回合开始时对敌方施加 {poison} 层中毒。",
      poisonTurn: 5
    }
  },
  thousand_cuts: {
    id: "thousand_cuts",
    name: "千刃凌迟",
    type: "power",
    cost: 2,
    rarity: "rare",
    hero: "rogue",
    desc: "能力：本场战斗每次打出一张牌，对敌方追加 {cutDmg} 点伤害。",
    cutDmg: 2,
    upgraded: {
      name: "千刃凌迟+",
      desc: "能力：本场战斗每次打出一张牌，对敌方追加 {cutDmg} 点伤害。",
      cutDmg: 3
    }
  },
  blur: {
    id: "blur",
    name: "残影闪步",
    type: "skill",
    cost: 1,
    rarity: "uncommon",
    hero: "rogue",
    desc: "获得 {block} 点护盾，下回合不清除护盾。",
    block: 7,
    retainBlock: 1,
    upgraded: {
      name: "残影闪步+",
      desc: "获得 {block} 点护盾，下回合不清除护盾。",
      block: 10,
      retainBlock: 1
    }
  },
  finisher: {
    id: "finisher",
    name: "绝命终结",
    type: "attack",
    cost: 1,
    rarity: "uncommon",
    hero: "rogue",
    desc: "本回合每打出过一张攻击牌，造成 {damage} 点物理伤害。",
    damage: 6,
    scaleWithAttacks: true,
    upgraded: {
      name: "绝命终结+",
      desc: "本回合每打出过一张攻击牌，造成 {damage} 点物理伤害。",
      damage: 9,
      scaleWithAttacks: true
    }
  },
  adrenaline: {
    id: "adrenaline",
    name: "肾上腺素",
    type: "skill",
    cost: 0,
    rarity: "rare",
    hero: "rogue",
    exhaust: true,
    desc: "获得 {energy} 点能量，抽 2 张牌。消耗。",
    energy: 1,
    draw: 2,
    upgraded: {
      name: "肾上腺素+",
      desc: "获得 {energy} 点能量，抽 2 张牌。消耗。",
      energy: 2,
      draw: 2
    }
  },

  // === 奥术贤者 进阶卡牌 ===
  blizzard: {
    id: "blizzard",
    name: "深寒冰暴",
    type: "skill",
    cost: 1,
    rarity: "uncommon",
    hero: "mage",
    desc: "获得 {block} 点护盾，施加 {weak} 层虚弱。",
    block: 8,
    weak: 2,
    upgraded: {
      name: "深寒冰暴+",
      desc: "获得 {block} 点护盾，施加 {weak} 层虚弱。",
      block: 11,
      weak: 3
    }
  },
  overclock: {
    id: "overclock",
    name: "超频共鸣",
    type: "skill",
    cost: 0,
    rarity: "uncommon",
    hero: "mage",
    desc: "抽取 {draw} 张牌，受到 {selfDmg} 点能量反噬伤害。",
    draw: 3,
    selfDmg: 3,
    upgraded: {
      name: "超频共鸣+",
      desc: "抽取 {draw} 张牌，受到 {selfDmg} 点能量反噬伤害。",
      draw: 4,
      selfDmg: 2
    }
  },
  chain_lightning: {
    id: "chain_lightning",
    name: "连锁闪电",
    type: "attack",
    cost: 1,
    rarity: "uncommon",
    hero: "mage",
    desc: "造成 {damage} 点雷电伤害。若敌方有易伤，则伤害翻倍！",
    damage: 9,
    doubleIfVuln: true,
    upgraded: {
      name: "连锁闪电+",
      desc: "造成 {damage} 点雷电伤害。若敌方有易伤，则伤害翻倍！",
      damage: 13,
      doubleIfVuln: true
    }
  },
  pyroclasm: {
    id: "pyroclasm",
    name: "烈焰聚爆",
    type: "attack",
    cost: 2,
    rarity: "rare",
    hero: "mage",
    desc: "引爆敌方身上的灼烧，造成 [灼烧层数 x {mult}] 额外伤害！",
    mult: 3,
    upgraded: {
      name: "烈焰聚爆+",
      desc: "引爆敌方身上的灼烧，造成 [灼烧层数 x {mult}] 额外伤害！",
      mult: 4
    }
  },
  glacial_armor: {
    id: "glacial_armor",
    name: "极寒之躯",
    type: "power",
    cost: 1,
    rarity: "rare",
    hero: "mage",
    desc: "能力：受到物理伤害时，反击 {thorns} 点冰霜伤害。",
    thorns: 4,
    upgraded: {
      name: "极寒之躯+",
      desc: "能力：受到物理伤害时，反击 {thorns} 点冰霜伤害。",
      thorns: 6
    }
  },
  meteor_impact: {
    id: "meteor_impact",
    name: "终焉星陨",
    type: "attack",
    cost: 3,
    rarity: "rare",
    hero: "mage",
    desc: "召唤陨石造成 {damage} 点毁灭伤害，施加 {burn} 层灼烧。",
    damage: 30,
    burn: 5,
    upgraded: {
      name: "终焉星陨+",
      desc: "召唤陨石造成 {damage} 点毁灭伤害，施加 {burn} 层灼烧。",
      damage: 40,
      burn: 7
    }
  },

  // === 通用/中立卡牌 ===
  divine_light: {
    id: "divine_light",
    name: "神圣甘霖",
    type: "skill",
    cost: 1,
    rarity: "uncommon",
    hero: "any",
    exhaust: true,
    desc: "恢复 {heal} 点生命值。消耗。",
    heal: 7,
    upgraded: {
      name: "神圣甘霖+",
      desc: "恢复 {heal} 点生命值。消耗。",
      heal: 11
    }
  },
  armor_break: {
    id: "armor_break",
    name: "破甲重掷",
    type: "attack",
    cost: 1,
    rarity: "uncommon",
    hero: "any",
    desc: "造成 {damage} 点伤害，并击碎敌方所有护盾！",
    damage: 7,
    shatterBlock: true,
    upgraded: {
      name: "破甲重掷+",
      desc: "造成 {damage} 点伤害，并击碎敌方所有护盾！",
      damage: 11,
      shatterBlock: true
    }
  },
  weakening_ray: {
    id: "weakening_ray",
    name: "衰弱射线",
    type: "skill",
    cost: 0,
    rarity: "uncommon",
    hero: "any",
    exhaust: true,
    desc: "施加 {turns} 层虚弱与 {turns} 层易伤。消耗。",
    turns: 2,
    upgraded: {
      name: "衰弱射线+",
      desc: "施加 {turns} 层虚弱与 {turns} 层易伤。消耗。",
      turns: 3
    }
  }
};

const RELICS_DATA = {
  blood_stone: {
    id: "blood_stone",
    name: "鲜血圣石",
    icon: "🩸",
    desc: "每场战斗获胜时，恢复 6 点生命值。"
  },
  snake_fangs: {
    id: "snake_fangs",
    name: "灵蛇毒牙",
    icon: "🐍",
    desc: "战斗开始第一回合，额外抽取 2 张手牌。"
  },
  arcane_battery: {
    id: "arcane_battery",
    name: "魔能透镜",
    icon: "🔮",
    desc: "每回合打出的第一张技能牌返还 1 点能量。"
  },
  titan_cuirass: {
    id: "titan_cuirass",
    name: "泰坦胸甲",
    icon: "🛡️",
    desc: "战斗开始时，自动获得 10 点护盾。"
  },
  whetstone: {
    id: "whetstone",
    name: "锋锐磨刀石",
    icon: "🗡️",
    desc: "所有攻击卡牌造成的伤害额外 +3。"
  },
  energy_core: {
    id: "energy_core",
    name: "奥术魔核",
    icon: "⚡",
    desc: "最大能量上限 +1 (每回合初始 4 点能量)。"
  },
  golden_dice: {
    id: "golden_dice",
    name: "贪婪黄金骰",
    icon: "🪙",
    desc: "战斗获得的金币提升 50%，黑市商店消费立减 30%。"
  },
  thorn_cloak: {
    id: "thorn_cloak",
    name: "棘刺斗篷",
    icon: "🦔",
    desc: "受到物理攻击时，反击 3 点伤害。"
  },
  serpent_eye: {
    id: "serpent_eye",
    name: "翠绿蛇目",
    icon: "👁️",
    desc: "所有施加的中毒层数额外 +2。"
  }
};

const ENEMIES_DATA = {
  // 浅层深渊 (Floor 1-4)
  bat: {
    id: "bat",
    name: "洞穴血蝠",
    hp: 26,
    maxHp: 26,
    icon: "🦇",
    color: "#9d4edd",
    pattern: [
      { type: "attack", value: 6, label: "扑击" },
      { type: "attack_drain", value: 5, label: "吸血撕咬" },
      { type: "debuff", weak: 1, label: "刺耳尖啸" }
    ]
  },
  goblin: {
    id: "goblin",
    name: "哥布林先锋",
    hp: 35,
    maxHp: 35,
    icon: "👺",
    color: "#588157",
    pattern: [
      { type: "defend", block: 8, label: "木盾格挡" },
      { type: "attack", value: 9, label: "突刺" },
      { type: "buff", str: 2, label: "战吼鼓舞" }
    ]
  },
  slime: {
    id: "slime",
    name: "剧毒软泥怪",
    hp: 32,
    maxHp: 32,
    icon: "🟢",
    color: "#06d6a0",
    pattern: [
      { type: "attack_poison", value: 4, poison: 3, label: "喷射腐蚀酸液" },
      { type: "attack", value: 8, label: "重击" },
      { type: "defend", block: 7, label: "凝固塑形" }
    ]
  },

  // 中层裂隙 (Floor 5-9)
  assassin: {
    id: "assassin",
    name: "深渊幽影刺客",
    hp: 54,
    maxHp: 54,
    icon: "🥷",
    color: "#6c757d",
    pattern: [
      { type: "buff", str: 2, block: 6, label: "阴影蓄势" },
      { type: "attack_multi", value: 6, hits: 2, label: "双刃连斩 (6x2)" },
      { type: "attack", value: 10, vuln: 1, label: "破绽突刺" }
    ]
  },
  gargoyle: {
    id: "gargoyle",
    name: "岩石石像鬼",
    hp: 64,
    maxHp: 64,
    icon: "🗿",
    color: "#495057",
    pattern: [
      { type: "defend", block: 14, label: "石肤硬化" },
      { type: "attack", value: 13, label: "巨石重击" },
      { type: "debuff", vuln: 2, label: "石化凝视" }
    ]
  },
  treant: {
    id: "treant",
    name: "腐化远古树精",
    hp: 72,
    maxHp: 72,
    icon: "🪵",
    color: "#3a5a40",
    pattern: [
      { type: "attack", value: 9, label: "粗壮根须抽打" },
      { type: "debuff_poison", poison: 5, block: 10, label: "剧毒瘴气" },
      { type: "attack", value: 14, label: "古树碾压" }
    ]
  },

  // 深渊回廊 精英 (Floor 10-14)
  hellhound: {
    id: "hellhound",
    name: "【精英】狱火狂獒",
    hp: 88,
    maxHp: 88,
    isElite: true,
    icon: "🐕‍🦺",
    color: "#d90429",
    pattern: [
      { type: "buff", str: 3, label: "炼狱咆哮 (+3力量)" },
      { type: "attack_multi", value: 8, hits: 2, label: "裂骨狂咬 (8x2)" },
      { type: "attack_burn", value: 15, burn: 4, label: "炽热火柱 (15伤+4灼烧)" }
    ]
  },
  fallen_mage: {
    id: "fallen_mage",
    name: "【精英】堕落大导师",
    hp: 95,
    maxHp: 95,
    isElite: true,
    icon: "🧙",
    color: "#7209b7",
    pattern: [
      { type: "defend", block: 20, label: "极光护罩 (20护盾)" },
      { type: "attack_multi", value: 5, hits: 3, label: "三重飞弹 (5x3)" },
      { type: "debuff", vuln: 2, weak: 2, label: "双重诅咒" }
    ]
  },

  // 终极 Boss (Floor 15)
  boss_void: {
    id: "boss_void",
    name: "【深渊之核】虚空支配者 · 奈萨里斯",
    hp: 200,
    maxHp: 200,
    isBoss: true,
    icon: "👁️‍🗨️",
    color: "#3f37c9",
    phase: 1,
    patternPhase1: [
      { type: "attack", value: 15, label: "暗渊重碾" },
      { type: "defend", block: 22, cleanDebuff: true, label: "虚空护盾 (22护盾+净化)" },
      { type: "debuff", vuln: 2, weak: 2, label: "深渊凝视" }
    ],
    patternPhase2: [
      { type: "attack_multi", value: 9, hits: 3, label: "狂暴裂隙斩 (9x3)" },
      { type: "attack", value: 24, weak: 1, label: "终焉震荡" },
      { type: "attack_drain", value: 14, label: "虚空吞噬" }
    ]
  }
};

const EVENTS_DATA = [
  {
    id: "shrine",
    title: "古老无名神龛",
    icon: "⛩️",
    desc: "在嶙峋怪石的阴影处，耸立着一座散发微弱微光的古老神龛。铭文记载着牺牲与神眷。",
    choices: [
      { text: "虔诚祈祷 (恢复 20% 生命值)", effect: "heal_20" },
      { text: "献祭精血 (失去 10 生命，获得 1 件稀有遗物)", effect: "sacrifice_relic" },
      { text: "拾取残烛 (获得 35 金币)", effect: "gold_35" }
    ]
  },
  {
    id: "blacksmith",
    title: "深渊流浪铁匠",
    icon: "⚒️",
    desc: "一位身披重甲的铁匠正在熔岩池旁挥动铁锤。他瞥了你一眼，冷冷道：“交出金币，为你淬火。”",
    choices: [
      { text: "支付 40 金币：升级牌库中 2 张卡牌", cost: 40, effect: "upgrade_2" },
      { text: "请教招式：获得 1 点永久力量，失去 6 生命", effect: "gain_str_loss_hp" },
      { text: "婉言谢绝：离开", effect: "leave" }
    ]
  },
  {
    id: "gambler",
    title: "虚空阴影赌徒",
    icon: "🎲",
    desc: "一个隐藏在兜帽下的阴影掏出了旋转的骰子：“要来赌一把命运吗？深渊里最不缺的就是胆魄。”",
    choices: [
      { text: "孤注一掷：赌上 30 金币 (50% 赢取 80 金币)", effect: "gamble" },
      { text: "购买古老卷轴：支付 30 金币，获得 1 张强力卡牌", cost: 30, effect: "buy_card" },
      { text: "转身离开", effect: "leave" }
    ]
  }
];

const STATUS_DESCRIPTIONS = {
  strength: "【力量】：每层使所有攻击卡牌造成的伤害 +1。",
  dexterity: "【敏捷】：每层使获得的护盾值 +1。",
  block: "【护盾】：抵挡受到的直接伤害。若无壁垒，回合开始时自动消散。",
  vulnerable: "【易伤】：受到的伤害提升 50%（每回合结束衰减 1 层）。",
  weak: "【虚弱】：造成的攻击伤害降低 25%（每回合结束衰减 1 层）。",
  poison: "【中毒】：回合结束时受到等同于层数的直接伤害，随后层数 -1。",
  burn: "【灼烧】：回合结束时受到等同于层数的烈焰伤害，随后层数 -1。",
  thorns: "【荆棘】：受到攻击时，对攻击者立即反击等量物理伤害。",
  barricade: "【壁垒】：回合开始时护盾不会清零。"
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    HEROES_DATA,
    CARDS_DATA,
    RELICS_DATA,
    ENEMIES_DATA,
    EVENTS_DATA,
    STATUS_DESCRIPTIONS
  };
}
