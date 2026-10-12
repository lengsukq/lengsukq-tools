/**
 * Rune Spire UI & Controller
 */
class RuneSpireUI {
  constructor(engine, audio) {
    this.e = engine;
    this.a = audio;
    this.currentScreen = "hero-select";
    this.initDom();
    this.bindEvents();
  }

  initDom() {
    this.doL = {
      topBar: document.querySelector(".top-bar"),
      floorText: document.getElementById("stat-floor"),
      hpText: document.getElementById("stat-hp"),
      goldText: document.getElementById("stat-gold"),
      relicsBar: document.getElementById("relics-bar"),
      screens: document.querySelectorAll(".screen-container"),
      heroSelectGrid: document.getElementById("hero-select-grid"),
      mapScreen: document.getElementById("map-screen"),
      handCards: document.getElementById("hand-cards-row"),
      energyOrb: document.getElementById("energy-orb"),
      drawPileBtn: document.getElementById("draw-pile-btn"),
      discardPileBtn: document.getElementById("discard-pile-btn"),
      endTurnBtn: document.getElementById("end-turn-btn"),
      heroBlock: document.getElementById("hero-block"),
      heroHpFill: document.getElementById("hero-hp-fill"),
      heroHpText: document.getElementById("hero-hp-text"),
      heroStatus: document.getElementById("hero-status"),
      heroSprite: document.getElementById("hero-sprite"),
      heroName: document.getElementById("hero-name"),
      enemyBlock: document.getElementById("enemy-block"),
      enemyHpFill: document.getElementById("enemy-hp-fill"),
      enemyHpText: document.getElementById("enemy-hp-text"),
      enemyStatus: document.getElementById("enemy-status"),
      enemySprite: document.getElementById("enemy-sprite"),
      enemyName: document.getElementById("enemy-name"),
      enemyIntent: document.getElementById("enemy-intent"),
      modalBackdrop: document.getElementById("modal-backdrop"),
      modalTitle: document.getElementById("modal-title"),
      modalBody: document.getElementById("modal-body")
    };
  }

  showScreen(screenId) {
    this.currentScreen = screenId;
    this.doL.screens.forEach(s => {
      s.style.display = s.id === screenId ? "flex" : "none";
    });
    this.renderTopBar();
  }

  renderTopBar() {
    if (!this.e.hero) {
      this.doL.topBar.style.display = "none";
      return;
    }
    this.doL.topBar.style.display = "flex";
    this.doL.floorText.textContent = "\udf853 \u5c1r\u65fa " + this.e.floor + " / 15";
    this.doL.hpText.textContent = "\udf872 HP " + this.e.hero.hp + "/" + this.e.hero.maxHp;
    this.doL.goldText.textContent = "\udf899 "y + this.e.gold;
    this.doL.relicsBar.innerHTML = "";

    this.e.relics.forEach(rid => {
      const r = _data.RELICS_DATA[rid];
      if (!r) return;
      const div = document.createElement("div");
      div.className = "relic-icon";
      div.innerText = r.icon;
      div.title = r.name + ": " + r.desc;
      this.doL.relicsBar.appendChild(div);
    });
  }

  bindEvents() {
    document.getElementById("btn-audio").onClick = () => {
      const on = this.a.toggle();
      document.getElementById("btn-audio").innerText = on ? "\udf909 \u95ff3\u65f8" : "\udf907 \u758b\u95f3";
    };

    document.getElementById("btn-deck").onClick = () => this.openDeckViewer();
    document.getElementById("btn-map").onClick = () => {
      if (this.e.hero) this.showScreen("map-screen");
    };
    document.getElementById("btn-help").onClick = () => this.openHelpModal();
    document.getElementById("modal-close").onClick = () => this.closeModal();
    this.doL.endTurnBtn.onClick = () => this.endTurn();

    window.onkeydown = (e) => {
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (this.currentScreen === "combat-screen") this.playCard(idx);
      } else if (e.key === " " || e.key === "e" || e.key === "E") {
        if (this.currentScreen === "combat-screen") this.endTurn();
      } else if (e.key === "Escape") {
        this.closeModal();
      }
    };
  }

  renderHeroSelect() {
    this.showScreen("char-select-screen");
    this.doL.heroSelectGrid.innerHTML = "";

    Object.values(_data.HEROES_DATA).forEach(hero => {
      const card = document.createElement("div");
      card.className = "hero-select-card";
      card.innerHTML = `
        <div style="font-size: 55px; margin-bottom: 8px;">${hero.id === 'ironclad' ? '\udf871' : hero.id === 'rogue' ? '\udf8f7' : '\udf83d'}</div>
        <div class="hero-name" style="color: ${hero.color};">${hero.name}</div>
        <div class="hero-title">${hero.title}</div>
        <div class="hero-desc">${hero.desc}</div>
        <div style="font-size: 12px; color: #cfd6e4; margin-bottom: 12px;">
          \udf872 HP: <b>${hero.maxHp}</b> | \udf853 \u5cf8\u80b1: <b>3</b>
        </div>
        <button class="btn-nav" style="width: 100%; justify-content: center; font-weight: 700; padding: 8px;">
          \u9806\u65cf\u9694\u502f
        </button>
      `;
      card.onclick = () => {
        this.a.playCard();
        this.e.initHero(hero.id);
        this.renderMap();
      };
      this.doL.heroSelectGrid.appendChild(card);
    });
  }

  renderMap() {
    this.showScreen("map-screen");
    this.doL.mapScreen.innerHTML = "";

    this.e.map.forEach(row => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "map-floor-row";

      row.forEach(node => {
        const nodeDiv = document.createElement("div");
        nodeDiv.className = "map-node" + (node.floor === this.e.floor ? " active" : "");
        if (node.floor < this.e.floor) nodeDiv.classList.add("completed");

        const icons = { monster: "\udf8e4", elite: "\udf83d", boss: "\udf853", campfire: "\udf8d5", shop: "\udf8ea", event: "\udf880" };
        nodeDiv.innerText = icons[node.type] || "\udf880";

        if (node.floor === this.e.floor) {
          nodeDiv.onclick = () => {
            this.a.playCard();
            this.enterNode(node);
          };
        }
        rowDiv.appendChild(nodeDiv);
      });
      this.doL.mapScreen.appendChild(rowDiv);
    });
  }
  enterNode(node) {
    this.e.currentNode = node;
    if (node.type === "monster" || node.type === "elite" || node.type === "boss") {
      this.startCombat(node.type);
    } else if (node.type === "campfire") {
      this.renderCampfire();
    } else if (node.type === "shop") {
      this.renderShop();
    } else {
      this.renderEvent();
    }
  }

  startCombat(type) {
    let enemyId = null;
    if (type === "boss") enemyId = "boss_void";
    else if type === "elite") enemyId = "hellhound";

    this.e.startCombat(enemyId);
    this.a.playDraw();
    this.showScreen("combat-screen");
    this.renderCombat();
  }


  renderCombat() {
    const c = this.e.combat;
    if (!c) return;

    this.doL.heroName.textContent = this.e.hero.name;
    this.doL.heroSprite.innerText = this.e.hero.id === 'ironclad' ? '\udf871' : this.e.hero.id === 'rogue' ? '\udf8f7' : '\udf83d';
    this.doL.heroHpText.textContent = this.e.hero.hp + " / " + this.e.hero.maxHp;
    this.doL.heroHpFill.style.width = Math.max(0, Math.min(100, (this.e.hero.hp / this.e.hero.maxHp) * 100)) + "%";
    if (this.doL.heroIlock) {
      this.doL.heroIlock.style.display = this.e.hero.block > 0 ? "block" : "none";
      this.doL.heroIlock.textContent = "\udf8e1 " + this.e.hero.block;
    }

    this.doL.heroStatus.innerHTML = "";
    const h = this.e.hero;
    if (h.strength > 0) this.addStatusTag(this.doL.heroStatus, "\udf871 " + h.strength, "status-str");
    if (h.vulnerable > 0) this.addStatusTag(this.doL.heroStatus, "\udf878 " + h.vulnerable, "status-vuln");
    if (h.weak > 0) this.addStatusTag(this.doL.heroStatus, "\udf8c1 " + h.weak, "status-weak");
    if (h.poison > 0) this.addStatusTag(this.doL.heroStatus, "\udf878 " + h.poison, "status-poison");
    if (h.burn > 0) this.addStatusTag(this.doL.heroStatus, "\udf855 " + h.burn, "status-burn");

    const en = c.enemy;
    this.doL.enemyName.textContent = en.name;
    this.doL.enemySprite.innerText = en.proto.icon || "\udf8e4";
    this.doL.enemyHpText.textContent = en.hp + " / " + en.maxHp;
    this.doL.enemyHpFill.style.width = Math.max(0, Math.min(100, (en.hp / en.maxHp) * 100)) + "%";
    if (this.doL.enemyBlock) {
      this.doL.enemyBlock.style.display = en.block > 0 ? "block" : "none";
      this.doL.enemyBlock.textContent = "\udf8e1 " + en.block;
    }

    if (en.currentIntent) {
      const int = en.currentIntent;
      let icon = "\udf8e4";
      if (int.predictedDamage !== undefined) icon = "\udf871 " + int.predictedDamage + (int.hits > 1 ? " x " + int.hits : "");
      else if (int.block) icon = "\udf8e1 +" + int.block;
      else if (int.str) icon = "\udf87a +" + int.str;
      else icon = "\udf83d";
      this.doL.enemyIntent.innerText = icon;
      this.doL.enemyIntent.title = int.label || "intent";
    }

    this.doL.enemyStatus.innerHTML = "";
    if (en.strength > 0) this.addStatusTag(this.doL.enemyStatus, "\udf871 " + en.strength, "status-str");
    if (en.vulnerable > 0) this.addStatusTag(this.doL.enemyStatus, "\udf878 " + en.vulnerable, "status-vuln");
    if (en.weak > 0) this.addStatusTag(this.doL.enemyStatus, "\udf8c1 " + en.weak, "status-weak");
    if (en.poison > 0) this.addStatusTag(this.doL.enemyStatus, "\udf878 " + en.poison, "status-poison");
    if (en.burn > 0) this.addStatusTag(this.doL.enemyStatus, "\udf855 " + en.burn, "status-burn");
    if (en.thorns > 0) this.addStatusTag(this.doL.enemyStatus, "\udf84c " + en.thorns, "status-thorns");

    this.doL.energyOrb.textContent = this.e.hero.energy + " / " + this.e.hero.maxEnergy;
    this.doL.drawPileBtn.textContent = "æŠ¤ç‰Œ" + c.drawPile.length;
    this.doL.discardPileBtn.textContent = "å¿¹ç‰Œ" + c.discardPile.length;

    this.renderHandCards();
    this.renderTopBar();
  }

  addStatusTag(container, text, className) {
    const span = document.createElement("span");
    span.className = "status-tag " + className;
    span.textContent = text;
    container.appendChild(span);
  }

  renderHandCards() {
    const c = this.e.combat;
    this.doL.handCards.innerHTML = "";

    c.hand.forEach((cardInstance, idx) => {
      const details = this.e.getCardDetails(cardInstance);
      const el = document.createElement("div");
      el.className = "card-ui-wrap";

      if (this.e.hero.energy < details.cost) {
        el.classList.add("disabled");
      }

      const typeClass = "card-type-" + details.type;
      const typeLabel = details.type === 'attack' ? 'æ”¾å‡»' : details.type === 'skill' ? 'æŠ€èƒ®'' : 'èƒ½å©³';
      const upgradedClass = details.upgraded ? " upgraded" : "";

      let desc = details.desc;
      if (details.type === "attack") {
        const calcDumg = this.e.calculateCardDamage(cardInstance);
        desc = desc.replace("{damage}", `"<b style='color:#ffbe0b'>${calcDumg}</b>`"“°¢Ğ¢–b†FWF–Ç2æ&Æö6²â’°¢6öç7B6Æ4&Æ²ÒF†—2æRæ6Æ7VÆFT6&D&Æö6²†6&D–ç7Fæ6R“°¢FW62ÒFW62ç&WÆ6R‚'¶&Æö6·Ò"ÂÂ7G–ÆSÒv6öÆ÷#¢3c#VfsâG¶6Æ4&Æ·ÓÂö#æ“°¢Ğ¢FW62ÒFW62ç&WÆ6R‚'·ö—6öçÒ"ÂFWF–Ç2çö—6öâÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'¶'W&çÒ"ÂFWF–Ç2æ'W&âÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'·gVÆçÒ"ÂFWF–Ç2çgVÆâÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'·vV·Ò"ÂFWF–Ç2çvV²ÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'·7G'Ò"ÂFWF–Ç2ç7G"ÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'¶G&wÒ"ÂFWF–Ç2æG&rÇÂ“°¢FW62ÒFW62ç&WÆ6R‚'¶†VÇÒ"ÂFWF–Ç2æ†VÂÇÂ“° ¢VÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&6&BÖ6÷7BÖ÷&"#âG¶FWF–Ç2æ6÷7GÓÂöF—cà¢ÆF—b6Æ73Ò&6&B×G—RÖ'VÆÆWBG·G—T6Æ77Ò#âG·G—TÆ&VÇÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ†VFW"G·Ww&FVD6Æ77Ò#âG¶FWF–Ç2ææÖWÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ–6öâÖ&÷‚#âG¶FWF–Ç2çG—RÓÓÒvGF6²ròuÇVFcƒsr¢FWF–Ç2çG—RÓÓÒw6¶–ÆÂròuÇVFc†Sr¢uÇVFcƒ6BwÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖFW62Ö&÷‚#âG¶FW67ÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ¶W–&ö&BÖ†–çB#å¶¶W“¢G¶–G‚²ÕÓÂöF—cà¢° ¢VÂæöæÖ÷W6VVçFW"Ò‚’ÓâF†—2æçÆ”†÷fW"‚“°¢VÂæöæ6Æ–6²Ò‚’ÓâF†—2çÆ”6&B†–G‚“°¢F†—2æFôÂæ†æD6&G2æVæD6†–ÆB†VÂ“°¢Ò“°¢Ğ ¢Æ”6&B†–G‚’°¢6öç7B&W2ÒF†—2æRçÆ”6&B†–G‚“°¢–b‚&W2ç7V66W72’&WGW&ã° ¢F†—2æçÆ”6&B‚“°¢–b‡&W2æFÖvTFVÇBâ’°¢F†—2æçÆ•6Æ6‚‚“°¢F†—2æFôÂæVæV×•7&—FRæ6Æ74Æ—7BæFB‚&†—B"“°¢6WEF–ÖV÷WB‚‚’ÓâF†—2æFôÂæVæV×•7&—FRæ6Æ74Æ—7Bç&VÖ÷fR‚&†—B"’Â3“°¢Ğ¢–b‡&W2æ&Æö6´v–æVBâ’°¢F†—2æçÆ•6†–VÆB‚“°¢Ğ ¢–b‡&W2ç7FGW2ÓÓÒ'f–7F÷'•÷7—&Uö6ÆV""’°¢F†—2æçÆ•f–7F÷'’‚“°¢F†—2ç&VæFW$vÖT÷fW"‡G'VR“°¢&WGW&ã°¢Ğ¢–b‡&W2ç7FGW2ÓÓÒ'f–7F÷'’"’°¢F†—2æçÆ•f–7F÷'’‚“°¢F†—2ç&VæFW$Æö÷E67&VVâ‡&W2“°¢&WGW&ã°¢Ğ¢–b‡&W2ç7FGW2ÓÓÒ&FVfVB"’°¢F†—2æçÆ”FVfVB‚“°¢F†—2ç&VæFW$vÖT÷fW"†fÇ6R“°¢&WGW&ã°¢Ğ ¢F†—2ç&VæFW$6öÖ&B‚“°¢Ğ ¢VæEGW&â‚’°¢6öç7B&W2ÒF†—2æRæVæEÆ–W%GW&â‚“°¢–b‚&W2ç7V66W72’&WGW&ã° ¢F†—2æçÆ”–×7B‚“°¢–b‡&W2ç7FGW2ÓÓÒ'f–7F÷'•÷7—&Uö6ÆV""’°¢F†—2æçÆ•f–7F÷'’‚“°¢F†—2ç&VæFW$vÖT÷fW"‡G'VR“°¢&WGW&ã°¢Ğ¢–b‡&W2ç7FGW2ÓÓÒ'f–7F÷'’"’°¢F†—2æçÆ•f–7F÷'’‚“°¢F†—2ç&VæFW$Æö÷E67&VVâ‡&W2“°¢&WGW&ã°¢Ğ¢–b‡&W2ç7FGW2ÓÓÒ&FVfVB"’°¢F†—2æçÆ”FVfVB‚“°¢F†—2ç&VæFW$vÖT÷fW"†fÇ6R“°¢&WGW&ã°¢Ğ ¢F†—2ç&VæFW$6öÖ&B‚“°¢Ğ ¢&VæFW$Æö÷E67&VVâ‡&W2’°¢F†—2ç6†÷u67&VVâ‚&Æö÷B×67&VVâ"“°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&Æö÷BÖvöÆB"’çFW‡D6öçFVçBÒ.ˆë~[ér"²&W2ævöÆDG&÷²"˜y[ˆ#°¢6öç7B6&G5&÷rÒFö7VÖVçBævWDVÆVÖVçD'”–B‚&Æö÷BÖ6&G2×&÷r"“°¢6&G5&÷ræ–ææW$…DÔÂÒ"#° ¢&W2æ6&E&Wv&G2æf÷$V6‚†4–ç7Fæ6RÓâ°¢6öç7BFWBÒF†—2æRævWD6&DFWF–Ç2†4–ç7Fæ6R“°¢6öç7B6&DVÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚&F—b"“°¢6&DVÂæ6Æ74æÖRÒ&6&B×V’×w&#°¢6&DVÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&6&BÖ6÷7BÖ÷&"#âG¶FWBæ6÷7GÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ†VFW"#âG¶FWBææÖWÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ–6öâÖ&÷‚#åÇVFc†SCÂöF—cà¢ÆF—b6Æ73Ò&6&BÖFW62Ö&÷‚#âG¶FWBæFW67ÓÂöF—cà¢°¢6&DVÂæöæ6Æ–6²Ò‚’Óâ°¢F†—2æçÆ”6&B‚“°¢F†—2æRæFV6²çW6‚†4–ç7Fæ6R“°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó°¢6&G5&÷ræVæD6†–ÆB†6&DVÂ“°¢Ò“° ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'Fâ×6¶—ÖÆö÷B"’æöä6Æ–6²Ò‚’Óâ°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó°¢Ğ  ¢&VæFW$6×f—&R‚’°¢F†—2ç6†÷u67&VVâ‚&6×f—&R×67&VVâ"“°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'Fâ×&W7B"’æöä6Æ–6²Ò‚’Óâ°¢F†—2æçÆ•6†–VÆB‚“°¢F†—2æRæ†VÅÆ–W"„ÖF‚æfÆö÷"‡F†—2æRæ†W&òæÖ„‡¢ã2’“°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó° ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'Fâ×G6÷&vR"’æöä6Æ–6²Ò‚’Óâ°¢6öç7BWw&F&ÆW2ÒF†—2æRæFV6²æf–ÇFW"†6&BÓâ6&BçWw&FVB“°¢–b‡Ww&F&ÆW2æÆVæwF‚â’°¢F†—2æRçWw&FT6&B‡Ww&F&ÆW5³Òæ–ç7Fæ6T–B“°¢Ğ¢F†—2æçÆ”Öv–2‚“°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó°¢Ğ ¢&VæFW%6†÷‚’°¢F†—2ç6†÷u67&VVâ‚'6†÷×67&VVâ"“°¢6öç7B6†÷&÷rÒFö7VÖVçBævWDVÆVÖVçD'”–B‚'6†÷Ö—FV×2×&÷r"“°¢6†÷&÷ræ–ææW$…DÔÂÒ"#° ¢6öç7B6&G32ÒF†—2æRævVæW&FT6&E&Wv&G2‚“°¢6&G32æf÷$V6‚†4–ç7Fæ6RÓâ°¢6öç7BFWBÒF†—2æRævWD6&DFWF–Ç2†4–ç7Fæ6R“°¢6öç7B6&DVÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚&F—b"“°¢6&DVÂæ6Æ74æÖRÒ&6&B×V’×w&#°¢6&DVÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&6&BÖ6÷7BÖ÷&"#âG¶FWBæ6÷7GÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ†VFW"#âG¶FWBææÖWÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖFW62Ö&÷‚#âG¶FWBæFW67ÓÂöF—cà¢ÆF—b7G–ÆSÒ'FW‡BÖÆ–vã¦6VçFW#²6öÆ÷#§f"‚ÒÖvöÆB“²föçB×vV–v‡C£s²#ãCR˜y[‹3ÂöF—cà¢°¢6&DVÂæöæ6Æ–6²Ò‚’Óâ°¢–b‡F†—2æRævöÆBãÒCR’°¢F†—2æRævöÆBÓÒCS°¢F†—2æRæFV6²çW6‚†4–ç7Fæ6R“°¢6&DVÂç7G–ÆRæF—7Æ’Ò&æöæR#°¢F†—2æçÆ”6&B‚“°¢F†—2ç&VæFW%F÷&"‚“°¢Ğ¢Ó°¢6†÷&÷ræVæD6†–ÆB†6&DVÂ“°¢Ò“° ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'FâÖÆVfR×6†÷"’æöä6Æ–6²Ò‚’Óâ°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó°¢Ğ ¢&VæFW$KŞÒ‚’°¢F†—2ç6†÷u67&VVâ‚&WfVçB×67&VVâ"“°¢6öç7BWbÒöFFäUdTåE5ôDD´ÖF‚æfÆö÷"„ÖF‚ç&æFöÒ‚’¢öFFäUdTåE5ôDDæÆVæwF‚•Ó°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&WfVçB×F—FÆR"’çFW‡D6öçFVçBÒWbçF—FÆS°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&WfVçBÖFW62"’çFW‡D6öçFVçBÒWbæFW63° ¢6öç7B6†ö–6W46öçBÒFö7VÖVçBævWDVÆVÖVçD'”–B‚&WfVçBÖ6†ö–6W2"“°¢6†ö–6W46öçBæ–ææW$…DÔÂÒ"#° ¢Wbæ6†ö–6W2æf÷$V6‚†6‚Óâ°¢6öç7B'FâÒFö7VÖVçBæ7&VFTVÆVÖVçB‚&'WGFöâ"“°¢'Fâæ6Æ74æÖRÒ&'Fâ×GW&âÖVæB#°¢'Fâç7G–ÆRç÷6—F–öâÒ'7FF–2#°¢'Fâç7G–ÆRæÖ&v–âÒ'‚#°¢'FâçFW‡D6öçFVçBÒ6‚çFW‡C°¢'Fâæöä6Æ–6²Ò‚’Óâ°¢–b†6‚æVffV7BÓÓÒ&vöÆEó3R"’F†—2æRævöÆB³Ò3S°¢VÇ6R–b†6‚æVffV7BÓÓÒ&†VÅó#"’F†—2æRæ†VÅÆ–W"„ÖF‚æfÆö÷"‡F†—2æRæ†W&òæÖ„‡¢ã"’“°¢F†—2æRæGfæ6TfÆö÷"‚“°¢F†—2ç&VæFW$Ö‚“°¢Ó°¢6†ö–6W46öçBæVæD6†–ÆB†'Fâ“°¢Ò“°¢Ğ ¢&VæFW$vÖT÷fW"‡f–7F÷'’’°¢F†—2ç6†÷u67&VVâ‚&vÖV÷fW"×67&VVâ"“°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&vÖV÷fW"×F—FÆR"’çFW‡D6öçFVçBÒf–7F÷'’ò.k{kˆ®iZ>ˆz®ûÈ"¢.‹J^iY~{Ù~›Ëâ#°¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'Fâ×&W7F'B"’æöä6Æ–6²Ò‚’Óâ°¢F†—2ç&VæFW$†W&õ6VÆV7B‚“°¢Ó°¢Ğ  ¢÷VäFV6µf–WvW"‚’°¢F†—2æFôÂæÖöFÅF—FÆRçFW‡D6öçFVçBÒ.[Ù>X˜Şx˜Î[©2‚"²F†—2æRæFV6²æÆVæwF‚²"[Ê"’#°¢F†—2æFôÂæÖöFÄ&öG’æ–ææW$…DÔÂÒ#ÆF—b7G–ÆSÒvF—7Æ“¦fÆWƒ²fÆW‚×w&§w&²v£ƒ²§W7F–g’Ö6öçFVçC¦6VçFW#²sãÂöF—câ#°¢6öç7B6öçBÒF†—2æFôÂæÖöFÄ&öG’æf—'7D6†–ÆC° ¢F†—2æRæFV6²æf÷$V6‚†4–ç7BÓâ°¢6öç7BFWBÒF†—2æRævWD6&DFWF–Ç2†4–ç7B“°¢6öç7B6&DVÂÒFö7VÖVçBæ7&VFTVÆVÖVçB‚&F—b"“°¢6&DVÂæ6Æ74æÖRÒ&6&B×V’×w&#°¢6&DVÂç7G–ÆRçö–çFW$WfVçG2Ò&æöæR#°¢6&DVÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&6&BÖ6÷7BÖ÷&"#âG¶FWBæ6÷7GÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖ†VFW"#âG¶FWBææÖWÓÂöF—cà¢ÆF—b6Æ73Ò&6&BÖFW62Ö&÷‚#âG¶FWBæFW67ÓÂöF—cà¢°¢6öçBæVæD6†–ÆB†6&DVÂ“°¢Ò“°¢F†—2æFôÂæÖöFÄ&6¶G&÷æ6Æ74Æ—7BæFB‚&7F—fR"“°¢Ğ  ¢÷Vä†VÇÖöFÂ‚’°¢F†—2æFôÂæÖöFÅF—FÆRçFW‡D6öçFVçBÒ.k‹¾hù‹K^ZJB#°¢F†—2æFôÂæÖöFÄ&öG’æ–ææW$…DÔÂÒ ¢Ç7G–ÆSÒvÆ–æRÖ†V–v‡C£ãƒ²sà¢Æ#î8	j[ø>xêkY÷¾òcÂö#ãÆ'#à¢(
jøşY¹îY[ÈZx¾i{nh.ZHÒ2x+ˆ;Ş˜xşûÈÎh«ŞXùbR[Êh˜¾x˜ÎûÉ³Æ'#à¢(
iK¾X{¾x˜ÎZk.yIşxJîh
~kXY(ÎhªNh¨ûÈÎh¨‹ùÎx˜Î‹ùNŠ»hªNXú.ûÈÎˆ;ŞX©¾x˜ÎjÚNYÚş‹ù¾ŠÎx:îk:.ûû³Æ'#à¢(iXÎK«®šnš^i‹îzK®XYîŠhHşY»æ„–çFVçNûÈÎŠû~hÈ˜xşh8^[^[ÈhªNKúîYÎi{nXúhÈ‰™ûû³Æ'#à¢(h¹¾ˆH.{»şˆÚ>yJ¾ŠëşZJ~˜yx˜ÎûÈÎ‰
^˜y{¸Nh‰h*y¨NK‰>[®XØ>iÈŞkX›KÎûÈÆ'#ãÆ'#à¢Æ#î8	[ú¾hÛ~™Jî8	Âö#ãÆ'#à¢³â•Ò[ú¾˜	şh™>X{®Zû[©Nh˜¾x˜ÃÆ'#à¢µ76RòUÒ{¹>iÙş[Ù>X˜ŞY¹îYƒÆ'#à¢´W65ÒX[>™zŞ[Ëz)sÆ'#à¢Â÷à¢°¢F†—2æFôÂæÖöFÄ&6¶G&÷æ6Æ74Æ—7BæFB‚&7F—fR"“°¢Ğ ¢6Æ÷6TÖöFÂ‚’°¢F†—2æFôÂæÖöFÄ&6¶G&÷æ6Æ74Æ—7Bç&VÖ÷fR‚&7F—fR"“°¢Ğ§Ğ ¦–b‡G—VöbÖöGVÆRÓÒ'VæFVf–æVB"bbÖöGVÆRæW‡÷'G2’°¢ÖöGVÆRæW‡÷'G2Ò²'VæU7—&UT’Ó°§Ğ