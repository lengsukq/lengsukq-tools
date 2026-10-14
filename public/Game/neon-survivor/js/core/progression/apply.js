    /* Applying a chosen upgrade or limit break to a pilot. */
    NeonCore.define(NeonSurvivorGame, class {
      applyUpgrade(upg) {
        // Class-specific actions are provided by ship plugins; returning true
        // means the hook already applied the card and its side effects.
        if (window.NeonShips?.runAbility?.(this.player, 'onUpgrade', this, upg) === true) {
          this.recalculatePassives();
          this.renderWeaponsHUD();
          return;
        }
        if (upg.type === 'dash') {
          if (!this.player.dashUpgrades) this.player.dashUpgrades = {};
          this.player.dashUpgrades[upg.id] = (this.player.dashUpgrades[upg.id] || 0) + 1;
          this.recalculatePassives();
        } else if (upg.type === 'weapon') {
          this.player.weapons[upg.id] = (this.player.weapons[upg.id] || 0) + 1;
          this.recalculatePassives();
          if (upg.id === 'orbit' || this.player.weapons.orbit) this.syncOrbiters();
          if (upg.id === 'drones' || this.player.weapons.drones) this.syncDrones();
        } else {
          this.player.passives[upg.id] = (this.player.passives[upg.id] || 0) + 1;
          this.recalculatePassives();
          if (this.player.weapons.orbit) this.syncOrbiters();
          if (this.player.weapons.drones) this.syncDrones();
        }
        this.renderWeaponsHUD();
      }

      applyLimitBreak(upg) {
        if (!this.player.limitBreaks) this.player.limitBreaks = {};
        this.player.limitBreaks[upg.id] = (this.player.limitBreaks[upg.id] || 0) + 1;
        this.player.totalLimitBreaks = (this.player.totalLimitBreaks || 0) + 1;

        if (upg.subType === 'weapon') {
          this.player.dmgMultiplier += 0.12;
          this.player.areaMultiplier += 0.03;
          if (upg.id === 'missiles') {
            this.player.missileLb = (this.player.missileLb || 0) + 1;
          }
        } else {
          if (upg.id === 'dash_aegis') {
            // Applied centrally by recalculateDashStats; duration is intentionally capped.
          } else if (upg.id === 'dash_dmg') {
            this.player.dashSlashDmg = Math.round((this.player.dashSlashDmg || 95) * 1.25);
            this.player.dashSlashDmgMult = (this.player.dashSlashDmgMult || 1.0) + 0.25;
          } else if (upg.id === 'dash_blast') {
            this.player.dashBlastDamage = Math.round((this.player.dashBlastDamage || 140) * 1.30);
            this.player.dashBlastRadius = Math.round((this.player.dashBlastRadius || 110) * 1.15);
          } else if (upg.id === 'dash_fire') {
            this.player.fireTrailDamage = Math.round((this.player.fireTrailDamage || 60) * 1.25);
            this.player.fireTrailDuration += 0.5;
          } else if (upg.id === 'dash_cryo') {
            this.player.dashCryoDuration += 0.5;
          } else if (upg.id === 'armor') {
            this.player.maxHp += 12;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
          } else if (upg.id === 'power') {
            this.player.dmgMultiplier += 0.06;
          } else if (upg.id === 'haste') {
            this.player.cdrMultiplier = Math.max(0.18, this.player.cdrMultiplier * 0.97);
          } else if (upg.id === 'crit') {
            this.player.critRate = Math.min(0.95, this.player.critRate + 0.02);
            this.player.critDmg += 0.15;
          } else if (upg.id === 'area') {
            this.player.areaMultiplier += 0.06;
          } else if (upg.id === 'thruster') {
            // 破限移速走统一公式，防止绕过硬上限
            this.recalculateMoveSpeed();
          } else {
            this.player.dmgMultiplier += 0.05;
          }
        }

        this.sound.playLevelUp();
        this.screenShake = 10;
        this.texts.push({
          x: this.player.x,
          y: this.player.y - 35,
          text: `⚡ ${upg.name} +${upg.lbCount}!`,
          color: '#ffea00',
          size: 20,
          life: 2.0,
          maxLife: 2.0
        });

        this.recalculateDashStats();
        this.renderWeaponsHUD();
      }
    });
