    /* XP curve, upgrade candidates, rarity rolls and limit breaks. */
    NeonCore.define(NeonSurvivorGame, class {
      calcXpNeeded(level) {
        // Balanced roguelite curve: steady, meaningful progression
        // Lv 1: 25, Lv 2: 50, Lv 3: 80, Lv 5: 160, Lv 8: 320, Lv 10: 460, Lv 15: 890, Lv 20: 1420
        return Math.floor(25 + level * 18 + Math.pow(level, 1.45) * 8);
      }

      gainXP(amount) {
        // Magnet upgrade bonus XP multiplier
        // A corrupted/overflowing drop must never stall the RAF thread in
        // an unbounded level-up loop or create hundreds of upgrade dialogs.
        if (!Number.isFinite(amount) || amount <= 0) return;
        const xpBonus = 1 + Math.min(5, Math.max(0, this.player.passives?.magnet || 0)) * .15;
        if (!Number.isFinite(this.player.xpNeeded) || this.player.xpNeeded <= 0)
          this.player.xpNeeded = this.calcXpNeeded(Math.max(1, this.player.level || 1));
        const need = Math.max(1, Number.isFinite(this.player.xpNeeded) ? this.player.xpNeeded :
          this.calcXpNeeded(Math.max(1, this.player.level || 1)));
        const earned = Math.min(Math.round(amount * xpBonus), Math.max(300, need * 3));
        if (!Number.isFinite(this.player.xp) || this.player.xp < 0) this.player.xp = 0;
        this.player.xp = Math.min(this.player.xp + earned, need * 8);
        this.player.crystals++;

        let shouldLevelUp = false;
        let levelUps = 0;
        while (levelUps < 8 && Number.isFinite(this.player.xpNeeded) &&
          this.player.xpNeeded > 0 && this.player.xp >= this.player.xpNeeded) {
          this.player.xp -= this.player.xpNeeded;
          this.player.level++;
          levelUps++;
          this.player.xpNeeded = this.calcXpNeeded(this.player.level);
          this.pendingLevelUps = (this.pendingLevelUps || 0) + 1;
          shouldLevelUp = true;
        }
        // One authoritative LAN team level, regardless of which pilot collected XP.
        window.NeonLanExperience?.synchronizeLevel(this);
        // 裸等级成长：升级即刷新移速（含硬上限）与冲刺斩等级项
        if (shouldLevelUp) {
          this.recalculateMoveSpeed();
          this.recalculateDashStats();
        }
        if (shouldLevelUp && this.state === 'playing') {
          this.triggerLevelUp();
        }
        this.updateHUD();
      }

      getUpgradeChoiceCount() {
        // Standard / Ascension I-II: five, III-IV: four, V-VI: three.
        return this.difficulty >= 5 ? 3 : this.difficulty >= 3 ? 4 : 5;
      }

      getUpgradeCatalog(player = this.player) {
        // Each playable ship may register its own complete upgrade deck.
        // The original ship retains the exact historical card table.
        return window.NeonShips?.upgradeCatalogFor(player) || UPGRADES_DB;
      }

      isUpgradeAvailableFor(player, upgrade, banished = null) {
        if (!upgrade || banished?.has(upgrade.id)) return false;
        if (window.NeonShips?.canEquipUpgrade) {
          return window.NeonShips.canEquipUpgrade(player, upgrade, this.difficulty);
        }
        const field = upgrade.type === 'weapon' ? 'weapons' :
          upgrade.type === 'passive' ? 'passives' :
            upgrade.type === 'dash' ? 'dashUpgrades' : null;
        if (!field) return false;
        const loadout = player[field] || {};
        const level = loadout[upgrade.id] || 0;
        if (level >= upgrade.maxLvl) return false;
        if (level > 0) return true;
        const limits = this.getUpgradeSlotLimits(player);
        return Object.keys(loadout).length <
          (upgrade.type === 'weapon' ? limits.weapons :
            upgrade.type === 'passive' ? limits.passives : limits.warp);
      }

      // Co-op upgrade selection uses the SAME upgrade definitions and cards as
      // solo mode, while authority to validate choices stays on the host.
      getCoopUpgradeDefinition(id, player = this.player) {
        return (this.getUpgradeCatalog?.(player) || UPGRADES_DB)
          .find(upgrade => upgrade.id === id) || null;
      }

      getCoopUpgradeChoices(ally) {
        const catalog = this.getUpgradeCatalog(ally);
        const eligible = catalog.filter(upgrade =>
          this.isUpgradeAvailableFor(ally, upgrade));
        const choices = window.NeonUpgradeRarity?.pickForPilot(
          eligible, this.getUpgradeChoiceCount(), this.difficulty, ally, catalog) ||
          [...eligible].sort(() => Math.random() - 0.5).slice(0, this.getUpgradeChoiceCount());
        ally.legendaryPityId = choices.find(upgrade => upgrade.pityGuaranteed)?.id || null;
        return choices.map(upgrade => upgrade.id);
      }

      getLimitBreakChoices(count = this.getUpgradeChoiceCount()) {
        const equippedList = [
          ...Object.keys(this.player.weapons).map(id => ({ id, type: 'weapon' })),
          ...Object.keys(this.player.passives).map(id => ({ id, type: 'passive' }))
        ];

        // Include Riftblade-exclusive dash limit breaks only for Riftblade
        if (this.player.shipId === 'riftblade') {
          equippedList.push({ id: 'dash_dmg', type: 'dash' });
          if (this.player.hasAegis || (this.player.dashUpgrades && this.player.dashUpgrades['dash_aegis'])) {
            equippedList.push({ id: 'dash_aegis', type: 'dash' });
          }
          if (this.player.hasDashBlast || (this.player.dashUpgrades && this.player.dashUpgrades['dash_blast'])) {
            equippedList.push({ id: 'dash_blast', type: 'dash' });
          }
          if (this.player.hasFireTrail || (this.player.dashUpgrades && this.player.dashUpgrades['dash_fire'])) {
            equippedList.push({ id: 'dash_fire', type: 'dash' });
          }
          if (this.player.hasDashCryo || (this.player.dashUpgrades && this.player.dashUpgrades['dash_cryo'])) {
            equippedList.push({ id: 'dash_cryo', type: 'dash' });
          }
        }

        const shuffled = equippedList.filter(item => !this.banishedUpgrades?.has(item.id)).sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, count);

        const activeCatalog = this.getUpgradeCatalog(this.player);
        return picked.map(item => {
          const def = activeCatalog.find(u => u.id === item.id) || UPGRADES_DB.find(u => u.id === item.id);
          const currentLb = (this.player.limitBreaks && this.player.limitBreaks[item.id]) || 0;
          const nextLb = currentLb + 1;

          let statDesc = '';
          if (item.type === 'weapon') {
            if (item.id === 'missiles') {
              statDesc = `蜂巢超载：重型聚合弹+1枚，裂变子弹伤害+25%，全弹爆炸半径+15%！`;
            } else {
              statDesc = `全弹道伤害 +12%，弹速/范围/攻速全面超频！`;
            }
          } else if (item.type === 'dash') {
            if (item.id === 'dash_aegis') {
              statDesc = `时空光环伤害 +25%、范围 +10%，防护时间不超过0.40秒！`;
            } else if (item.id === 'dash_dmg') {
              statDesc = `折跃斩切割伤害 +25%（可无限叠加），暴击伤害 +20%！`;
            } else if (item.id === 'dash_blast') {
              statDesc = `落点爆轰伤害 +30%，超新星冲击半径 +15%！`;
            } else if (item.id === 'dash_fire') {
              statDesc = `等离子火墙伤害 +25%，燃烧持续时间 +0.5秒！`;
            } else if (item.id === 'dash_cryo') {
              statDesc = `冰霜冻结时间 +0.5秒，冰霜易伤加成 +15%！`;
            } else {
              statDesc = `折跃充能速度 +15%，机动航速全面提升！`;
            }
          } else {
            if (item.id === 'armor') {
              statDesc = `最大生命 +12，瞬间抢修回复 35 点生命！`;
            } else if (item.id === 'power') {
              statDesc = `强核超聚变：全局总伤害额外 +6%！`;
            } else if (item.id === 'haste') {
              statDesc = `超频晶振：全武器冷却额外缩减 -3%！`;
            } else if (item.id === 'crit') {
              statDesc = `弱点死局：暴击率 +2%，暴击伤害 +15%！`;
            } else if (item.id === 'area') {
              statDesc = `空间扩张：全域攻击范围与弹体尺寸 +6%！`;
            } else if (item.id === 'thruster') {
              statDesc = `曲率航行：移动速度 +5%，冲刺恢复加速 +5%！`;
            } else if (item.id === 'multishot') {
              statDesc = `火控超频：全武器伤害 +5%，不再无限增加弹药数量！`;
            } else {
              statDesc = `引力坍缩：核心拾取范围 +15%，伤害 +5%！`;
            }
          }

          return {
            id: item.id,
            type: 'limit_break',
            subType: item.type,
            name: `${def ? def.name : item.id}【超频破限】`,
            icon: def ? def.icon : '⚡',
            rarity: 'legendary',
            desc: `战力破限过载！超越常规上限的无限潜能强化！`,
            statText: [statDesc],
            lbCount: nextLb
          };
        });
      }

      nextEndlessUpgradeChoices() {
        const pool = (this.levelupEligible || []).filter(u =>
          !this.banishedUpgrades?.has(u.id) && !this.upgradeSession?.picked.has(u.id) &&
          this.isUpgradeAvailableFor(this.player, u));
        const alternatives = pool.filter(u => !(this.currentUpgradeChoices || []).some(chosen => chosen.id === u.id));
        const count = this.getUpgradeChoiceCount();
        const pityActive = this.player.level >= (window.NeonUpgradeRarity?.PITY_LEVEL || 10) &&
          !window.NeonUpgradeRarity?.hasLegendary(this.player, UPGRADES_DB);
        // Reroll should not accidentally exclude the only remaining legendary.
        const candidates = alternatives.length >= count &&
          (!pityActive || alternatives.some(card => card.rarity === 'legendary'))
          ? alternatives : pool;
        if (!candidates.length) return this.getLimitBreakChoices();
        const result = window.NeonUpgradeRarity?.pickForPilot(
          candidates, count, this.difficulty, this.player, UPGRADES_DB) ||
          window.NeonRogueEndless.pickUpgrades(candidates, count, Math.random, this.difficulty);
        if (result.length < count) {
          for (const option of this.getLimitBreakChoices(count)) {
            if (result.length >= count) break;
            if (!result.some(item => item.id === option.id)) result.push(option);
          }
        }
        return result;
      }
    });
