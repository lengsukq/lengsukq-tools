/**
 * Rune Spire: Abyss Deckbuilder
 * Combat & Spire Progression Engine
 */

let _data;
if (typeof module !== "undefined" && module.exports) {
  _data = require("./data.js");
} else {
  _data = window.RuneSpireData;
}
const { HEROES_DATA, CARDS_DATA, RELICS_DATA, ENEMIES_DATA, EVENTS_DATA } = _data;

class RuneSpireEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.hero = null;
    this.relics = [];
    this.deck = [];
    this.gold = 100;
    this.floor = 1;
    this.map = [];
    this.currentNode = null;
    this.combat = null;
    this.instanceCounter = 1;
    this.stats = {
      enemiesKilled: 0,
      elitesKilled: 0,
      maxSingleDamage: 0,
      cardsPlayed: 0
    };
  }

  createCardInstance(cardId, upgraded = false) {
    const proto = CARDS_DATA[cardId];
    if (!proto) throw new Error("Unknown card id: " + cardId);
    return {
      instanceId: this.instanceCounter++,
      id: cardId,
      upgraded: Boolean(upgraded),
      name: upgraded ? (proto.upgraded?.name || proto.name + "+") : proto.name,
      type: proto.type,
      cost: upgraded && proto.upgraded?.cost !== undefined ? proto.upgraded.cost : proto.cost,
      rarity: proto.rarity,
      hero: proto.hero,
      exhaust: Boolean(proto.exhaust)
    };
  }

  getCardDetails(cardInstance) {
    const proto = CARDS_DATA[cardInstance.id];
    if (!proto) return null;
    const up = cardInstance.upgraded && proto.upgraded ? proto.upgraded : null;

    return {
      ...cardInstance,
      desc: up?.desc || proto.desc,
      damage: up?.damage !== undefined ? up.damage : (proto.damage || 0),
      block: up?.block !== undefined ? up.block : (proto.block || 0),
      vuln: up?.vuln !== undefined ? up.vuln : (proto.vuln || 0),
      weak: up?.weak !== undefined ? up.weak : (proto.weak || 0),
      str: up?.str !== undefined ? up.str : (proto.str || 0),
      poison: up?.poison !== undefined ? up.poison : (proto.poison || 0),
      burn: up?.burn !== undefined ? up.burn : (proto.burn || 0),
      draw: up?.draw !== undefined ? up.draw : (proto.draw || 0),
      heal: up?.heal !== undefined ? up.heal : (proto.heal || 0),
      proto
    };
  }

  initHero(heroId) {
    const proto = HEROES_DATA[heroId];
    if (!proto) throw new Error("Unknown hero: " + heroId);

    this.reset();
    this.hero = {
      id: heroId,
      name: proto.name,
      title: proto.title,
      hp: proto.hp,
      maxHp: proto.maxHp,
      energy: proto.energy,
      maxEnergy: proto.maxEnergy,
      block: 0,
      strength: 0,
      dexterity: 0,
      vulnerable: 0,
      weak: 0,
      poison: 0,
      burn: 0,
      thorns: 0,
      barricade: false,
      powers: {
        noxiousCloud: 0,
        thousandCuts: 0
      }
    };

    this.deck = proto.deck.map(cid => this.createCardInstance(cid, false));
    this.addRelic(proto.relic);
    this.generateMap();
    return this.hero;
  }

  hasRelic(relicId) {
    return this.relics.includes(relicId);
  }

  addRelic(relicId) {
    if (!this.relics.includes(relicId)) {
      this.relics.push(relicId);
      if (relicId === "energy_core") {
        this.hero.maxEnergy += 1;
      }
    }
  }

  generateMap() {
    this.map = [];
    const totalFloors = 15;

    for (let f = 1; f <= totalFloors; f++) {
      let nodeTypes;
      if (f === 1) {
        nodeTypes = ["monster"];
      } else if (f === totalFloors) {
        nodeTypes = ["boss"];
      } else if (f === 6 || f === 14) {
        nodeTypes = ["campfire"];
      } else if (f === 8) {
        nodeTypes = ["shop"];
      } else if (f === 11 || f === 12) {
        nodeTypes = ["elite", "campfire"];
      } else {
        const pool = ["monster", "monster", "event", "campfire", "shop"];
        nodeTypes = [
          pool[Math.floor(Math.random() * pool.length)],
          pool[Math.floor(Math.random() * pool.length)]
        ];
        if (nodeTypes[0] === nodeTypes[1] && Math.random() > 0.4) {
          nodeTypes[1] = pool[(pool.indexOf(nodeTypes[0]) + 1) % pool.length];
        }
      }

      const row = nodeTypes.map((type, idx) => ({
        id: "node_" + f + "_" + idx,
        floor: f,
        type,
        completed: false
      }));
      this.map.push(row);
    }
  }
  startCombat(enemyId) {
    let enemyProto = ENEMIES_DATA[enemyId];
    if (!enemyProto) {
      if (this.floor === 15) enemyProto = ENEMIES_DATA.boss_void;
      else if (this.floor >= 10 && Math.random() > 0.5) enemyProto = ENEMIES_DATA.hellhound;
      else if (this.floor >= 5) enemyProto = ENEMIES_DATA.assassin;
      else enemyProto = ENEMIES_DATA.bat;
    }

    const enemy = {
      id: enemyProto.id,
      name: enemyProto.name,
      hp: enemyProto.hp,
      maxHp: enemyProto.maxHp,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
      poison: 0,
      burn: 0,
      thorns: enemyProto.id === "treant" ? 3 : 0,
      isBoss: Boolean(enemyProto.isBoss),
      isElite: Boolean(enemyProto.isElite),
      patternIndex: 0,
      phase: 1,
      currentIntent: null,
      proto: enemyProto
    };

    this.hero.block = 0;
    this.hero.strength = 0;
    this.hero.dexterity = 0;
    this.hero.vulnerable = 0;
    this.hero.weak = 0;
    this.hero.poison = 0;
     this.hero.burn = 0;
    this.hero.thorns = 0;
    this.hero.barricade = false;
    this.hero.powers = {
      noxiousCloud: 0,
      thousandCuts: 0
    };

    if (this.hasRelic("titan_cuirass")) {
      this.hero.block += 10;
    }

    const drawPile = this.shuffle(this.deck.slice());

    this.combat = {
      turn: 0,
      status: "player_turn",
      hand: [],
      drawPile,
      discardPile: [],
      exhaustPile: [],
      enemy,
      playedThisTurn: [],
      attacksPlayedThisTurn: 0,
      hasPlayedSkillThisTurn: false,
      firstTurn: true
    };

    this.updateEnemyIntent();
    this.startPlayerTurn();
    return this.combat;
  }

  shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  drawCards(count) {
    const { hand, drawPile, discardPile } = this.combat;
    for (let i = 0; i < count; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length === 0) break;
        drawPile.push(...this.shuffle(discardPile));
        discardPile.length = 0;
      }
      if (drawPile.length > 0 && hand.length < 10) {
        hand.push(drawPile.pop());
      }
    }
  }

  startPlayerTurn() {
    this.combat.turn += 1;
    this.combat.status = "player_turn";
    this.combat.playedThisTurn = [];
    this.combat.attacksPlayedThisTurn = 0;
    this.combat.hasPlayedSkillThisTurn = false;

    this.hero.energy = this.hero.maxEnergy;

    if (!this.hero.barricade) {
      this.hero.block = 0;
    }

    if (this.hero.powers.noxiousCloud > 0) {
      this.combat.enemy.poison += this.hero.powers.noxiousCloud;
    }

    let drawCount = 5;
    if (this.combat.firstTurn) {
      if (this.hasRelic("snake_fangs")) drawCount += 2;
      this.combat.firstTurn = false;
    }

    this.drawCards(drawCount);
  }

  calculateCardDamage(cardInstance) {
    const details = this.getCardDetails(cardInstance);
    if (!details) return 0;
    let base = details.damage || 0;

    if (details.proto.scaleWithBlock) {
      base = this.hero.block;
    }
    if (details.proto.scaleWithAttacks) {
      base = details.damage * (this.combat ? this.combat.attacksPlayedThisTurn : 0);
    }

    let dmg = base + (this.hero.strength || 0);

    if (this.hasRelic("whetstone") && details.type === "attack") {
      dmg += 3;
    }

    if (this.hero.weak > 0) {
      dmg = Math.floor(dmg * 0.75);
    }

    if (this.combat && this.combat.enemy && this.combat.enemy.vulnerable > 0) {
      dmg = Math.floor(dmg * 1.5);
    }

    if (details.proto.doubleIfVuln && this.combat?.enemy?.vulnerable > 0) {
      dmg = Math.floor(dmg * 2);
    }

    return Math.max(0, dmg);
  }

  calculateCardBlock(cardInstance) {
    const details = this.getCardDetails(cardInstance);
    if (!details) return 0;
    let blk = (details.block || 0) + (this.hero.dexterity || 0);
    return Math.max(0, blk);
  }
  playCard(handIndex) {
    if (!this.combat || this.combat.status !== "player_turn") {
      return { success: false, reason: "NOT_PLAYER_TURN" };
    }

    const card = this.combat.hand[handIndex];
    if (!card) return { success: false, reason: "INVALID_CARD" };

    const details = this.getCardDetails(card);
    if (this.hero.energy < details.cost) {
      return { success: false, reason: "NOT_ENOUGH_ENERGY" };
    }

    this.hero.energy -= details.cost;

    if (details.type === "skill" && !this.combat.hasPlayedSkillThisTurn) {
      this.combat.hasPlayedSkillThisTurn = true;
      if (this.hasRelic("the_lens") || this.hasRelic("arcane_battery")) {
        this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 1);
      }
    }

    const enemy = this.combat.enemy;
    let damageDealt = 0;
    let blockGained = 0;
    let logMsg = "hit";

    if (details.block > 0) {
      blockGained = this.calculateCardBlock(card);
      this.hero.block += blockGained;
    }

    if (details.type === "attack") {
      this.combat.attacksPlayedThisTurn += 1;
      let dmg = this.calculateCardDamage(card);

      if (details.proto.shatterBlock) {
        enemy.block = 0;
      }

      if (dmg > 0) {
        damageDealt = dmg;
        let actualDmgToHp = Math.max(0, dmg - enemy.block);
        enemy.block = Math.max(0, enemy.block - dmg);
        enemy.hp = Math.max(0, enemy.hp - actualDmgToHp);

        if (dmg > this.stats.maxSingleDamage) {
          this.stats.maxSingleDamage = dmg;
        }

        if (details.proto.lifesteal && actualDmgToHp > 0) {
          this.healPlayer(actualDmgToHp);
        }

        if (enemy.thorns > 0 && actualDmgToHp > 0) {
          this.applyDamageToHero(enemy.thorns);
        }
      }
    }

    if (details.vuln > 0) enemy.vulnerable += details.vuln;
    if (details.weak > 0) enemy.weak += details.weak;
    if (details.str > 0) this.hero.strength += details.str;

    if (details.poison > 0) {
      let p = details.poison;
      if (this.hasRelic("serpent_eye")) p += 2;
      enemy.poison += p;
    }

    if (details.burn > 0) enemy.burn += details.burn;

    if (details.draw > 0) this.drawCards(details.draw);

    if (details.heal > 0) this.healPlayer(details.heal);

    if (details.proto.multiplier && enemy.poison > 0) {
      enemy.poison *= details.proto.multiplier;
    }

    if (details.proto.mult && enemy.burn > 0) {
      const extra = enemy.burn * details.proto.mult;
      let actualHpDmg = Math.max(0, extra - enemy.block);
      enemy.block = Math.max(0, enemy.block - extra);
      enemy.hp = Math.max(0, enemy.hp - actualHpDmg);
      damageDealt += extra;
    }

    if (details.proto.selfDmg) {
      this.applyDamageToHero(details.proto.selfDmg, true);
    }

    if (details.proto.count) {
      for (let k = 0; k < details.proto.count; k++) {
        if (this.combat.hand.length < 10) {
          this.combat.hand.push(this.createCardInstance("shiv", card.upgraded));
        }
      }
    }

    if (details.proto.grantBarricade) this.hero.barricade = true;
    if (details.proto.poisonTurn) this.hero.powers.noxiousCloud += details.proto.poisonTurn;
    if (details.proto.cutDmg) this.hero.powers.thousandCuts += details.proto.cutDmg;
    if (details.proto.thorns) this.hero.thorns += details.proto.thorns;

    if (this.hero.powers.thousandCuts > 0) {
      let cutDmg = this.hero.powers.thousandCuts;
      let actualCut = Math.max(0, cutDmg - enemy.block);
      enemy.block = Math.max(0, enemy.block - cutDmg);
      enemy.hp = Math.max(0, enemy.hp - actualCut);
      damageDealt += cutDmg;
    }

    this.stats.cardsPlayed += 1;
    this.combat.playedThisTurn.push(card);

    this.combat.hand.splice(handIndex, 1);
    if (details.exhaust) {
      this.combat.exhaustPile.push(card);
    } else {
      this.combat.discardPile.push(card);
    }

    if (enemy.hp <= 0) {
      return this.handleCombatVictory();
    }

    if (this.hero.hp <= 0) {
      this.combat.status = "defeat";
      return { success: true, status: "defeat", message: "HERO_DEFEATED" };
    }

    return {
      success: true,
      status: "player_turn",
      damageDealt,
      blockGained,
      logMsg
    };
  }

  applyDamageToHero(dmg, ignoreBlock = false) {
    if (ignoreBlock) {
      this.hero.hp = Math.max(0, this.hero.hp - dmg);
      return;
    }
    let actual = Math.max(0, dmg - this.hero.block);
    this.hero.block = Math.max(0, this.hero.block - dmg);
    this.hero.hp = Math.max(0, this.hero.hp - actual);
  }

  endPlayerTurn() {
    if (!this.combat || this.combat.status !== "player_turn") {
      return { success: false, reason: "NOT_PLAYER_TURN" };
    }

    this.combat.discardPile.push(...this.combat.hand);
    this.combat.hand = [];

    if (this.hero.poison > 0) {
      this.applyDamageToHero(this.hero.poison, true);
      this.hero.poison -= 1;
    }
    if (this.hero.burn > 0) {
      this.applyDamageToHero(this.hero.burn, true);
      this.hero.burn -= 1;
    }

    if (this.hero.vulnerable > 0) this.hero.vulnerable -= 1;
    if (this.hero.weak > 0) this.hero.weak -= 1;

    if (this.hero.hp <= 0) {
      this.combat.status = "defeat";
      return { success: true, status: "defeat" };
    }

    this.combat.status = "enemy_turn";
    return this.executeEnemyTurn();
  }
  updateEnemyIntent() {
    const enemy = this.combat.enemy;
    const proto = enemy.proto;

    if (enemy.isBoss && enemy.phase === 1 && enemy.hp <= enemy.maxHp / 2) {
      enemy.phase = 2;
      enemy.patternIndex = 0;
      enemy.strength += 4;
      enemy.block += 15;
    }

    const list = (enemy.isBoss && enemy.phase === 2)
      ? proto.patternPhase2
      : proto.pattern;

    const patternItem = list[enemy.patternIndex % list.length];
    enemy.currentIntent = { ...patternItem };

    if (patternItem.value) {
      let dmg = patternItem.value + enemy.strength;
      if (enemy.weak > 0) dmg = Math.floor(dmg * 0.75);
      if (this.hero.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
      enemy.currentIntent.predictedDamage = Math.max(0, dmg);
    }
  }


  executeEnemyTurn() {
    const enemy = this.combat.enemy;
    const intent = enemy.currentIntent;
    let enemyLog = enemy.name + " 施展了【" + (intent.label || "行动") + "】!";

    enemy.block = 0;

    if (intent.block) {
      enemy.block += intent.block;
    }

    if (intent.str) {
      enemy.strength += intent.str;
    }

    if (intent.cleanDebuff) {
      enemy.vulnerable = 0;
      enemy.weak = 0;
    }

    if (intent.predictedDamage !== undefined) {
      let hits = intent.hits || 1;
      for (let h = 0; h < hits; h++) {
        let singleDmg = intent.predictedDamage;
        this.applyDamageToHero(singleDmg);

        if (this.hasRelic("thorn_cloak")) {
          let thornActual = Math.max(0, 3 - enemy.block);
          enemy.block = Math.max(0, enemy.block - 3);
          enemy.hp = Math.max(0, enemy.hp - thornActual);
        }

        if (this.hero.thorns > 0) {
          let thAct = Math.max(0, this.hero.thorns - enemy.block);
          enemy.block = Math.max(0, enemy.block - this.hero.thorns);
          enemy.hp = Math.max(0, enemy.hp - thAct);
        }
      }
    }

    if (intent.poison) {
      this.hero.poison += intent.poison;
    }
    if (intent.burn) {
      this.hero.burn += intent.burn;
    }
    if (intent.vuln) {
      this.hero.vulnerable += intent.vuln;
    }
    if (intent.weak) {
      this.hero.weak += intent.weak;
    }

    if (enemy.poison > 0) {
      let poisonActual = Math.max(0, enemy.poison - enemy.block);
      enemy.block = Math.max(0, enemy.block - enemy.poison);
      enemy.hp = Math.max(0, enemy.hp - poisonActual);
      enemy.poison -= 1;
    }

    if (enemy.burn > 0) {
      let burnActual = Math.max(0, enemy.burn - enemy.block);
      enemy.block = Math.max(0, enemy.block - enemy.burn);
      enemy.hp = Math.max(0, enemy.hp - burnActual);
      enemy.burn -= 1;
    }

    if (enemy.vulnerable > 0) enemy.vulnerable -= 1;
    if (enemy.weak > 0) enemy.weak -= 1;

    if (enemy.hp <= 0) {
      return this.handleCombatVictory();
    }
    if (this.hero.hp <= 0) {
      this.combat.status = "defeat";
      return { success: true, status: "defeat", enemyLog };
    }

    enemy.patternIndex += 1;
    this.updateEnemyIntent();

    this.startPlayerTurn();
    return { success: true, status: "player_turn", enemyLog };
  }


  handleCombatVictory() {
    this.combat.status = "victory";
    const enemy = this.combat.enemy;

    if (enemy.isBoss) {
      this.stats.enemiesKilled += 1;
      return { success: true, status: "victory_spire_clear" };
    }

    if (enemy.isElite) {
      this.stats.elitesKilled += 1;
    }
    this.stats.enemiesKilled += 1;

    if (this.hasRelic("blood_stone")) {
      this.healPlayer(6);
    }

    let goldDrop = enemy.isElite ? 45 : 20;
    goldDrop += Math.floor(Math.random() * 10);
    if (this.hasRelic("golden_dice")) {
      goldDrop = Math.floor(goldDrop * 1.5);
    }
    this.gold += goldDrop;

    const cardRewards = this.generateCardRewards();

    let relicReward = null;
    if (enemy.isElite) {
      relicReward = this.getRandomUnownedRelic();
      if (relicReward) {
        this.addRelic(relicReward.id);
      }
    }

    return {
      success: true,
      status: "victory",
      goldDrop,
      cardRewards,
      relicReward
    };
  }


  generateCardRewards() {
    const heroId = this.hero.id;
    const pool = Object.values(CARDS_DATA).filter(c =>
      c.rarity !== "token" && (c.hero === "any" || c.hero === heroId)
    );

    const rewards = [];
    const chosenIds = new Set();

    while (rewards.length < 3 && chosenIds.size < pool.length) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (!chosenIds.has(candidate.id)) {
        chosenIds.add(candidate.id);
        const shouldUpgrade = Math.random() < 0.2;
        rewards.push(this.createCardInstance(candidate.id, shouldUpgrade));
      }
    }
    return rewards;
  }


  getRandomUnownedRelic() {
    const unowned = Object.values(RELICS_DATA).filter(r => !this.hasRelic(r.id));
    if (unowned.length === 0) return null;
    return unowned[Math.floor(Math.random() * unowned.length)];
  }


  healPlayer(amount) {
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + amount);
  }


  upgradeCard(instanceId) {
    const card = this.deck.find(c => c.instanceId === instanceId);
    if (!card || card.upgraded) return false;
    card.upgraded = true;
    const proto = CARDS_DATA[card.id];
    card.name = proto.upgraded?.name || proto.name + "+";
    if (proto.upgraded?.cost !== undefined) {
      card.cost = proto.upgraded.cost;
    }
    return true;
  }


  removeCard(instanceId) {
    const idx = this.deck.findIndex(c => c.instanceId === instanceId);
    if (idx !== -1) {
      this.deck.splice(idx, 1);
      return true;
    }
    return false;
  }


  advanceFloor() {
    if (this.floor < 15) {
      this.floor += 1;
      return this.floor;
    }
    return 15;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RuneSpireEngine };
}
