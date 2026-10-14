    /* Derived stats: move speed, passives, dash charges, orbiters and drones. */
    NeonCore.define(NeonSurvivorGame, class {
      recalculateMoveSpeed() {
        // 等级移速成长：每级+6，最多+120；全局硬上限385（推进器/破限叠加也不超）
        const LEVEL_SPEED_CAP = 120;
        const TOTAL_SPEED_CAP = 385;
        const p = this.player.passives || {};
        const levelBonus = Math.min(LEVEL_SPEED_CAP, (this.player.level - 1) * 6);
        const thrusterMult = 1.0 + (p.thruster || 0) * 0.12;
        const lbBonus = ((this.player.limitBreaks && this.player.limitBreaks.thruster) || 0) * 5;
        const shipSpeed = window.NeonShips?.get?.(this.player.shipId)?.baseStats.speed || 240;
        this.player.baseSpeed = Math.min(TOTAL_SPEED_CAP,
          Math.round(shipSpeed * thrusterMult + levelBonus + lbBonus));
      }

      recalculatePassives() {
        const p = this.player.passives || {};
        const stats = window.NeonShips?.get?.(this.player.shipId)?.baseStats;
        // Unified Base Attack Power: scales with Power core + Arsenal/Passive/Warp progression + Limit Breaks
        const weapLevels = Object.values(this.player.weapons || {}).reduce((acc, v) => acc + (v || 0), 0);
        const extraWeap = Math.max(0, weapLevels - 1);
        const dashLevels = Object.values(this.player.dashUpgrades || {}).reduce((acc, v) => acc + (v || 0), 0);
        const nonPowerPassives = Object.entries(p).reduce((acc, [k, v]) => acc + (k === 'power' ? 0 : (v || 0)), 0);
        const lb = this.player.limitBreaks || {};
        let lbDmgBonus = 0;
        for (const [id, count] of Object.entries(lb)) {
          if (!count) continue;
          if (this.player.weapons && this.player.weapons[id]) lbDmgBonus += count * 0.12;
          else if (id === 'power') lbDmgBonus += count * 0.06;
          else if (!['dash_aegis', 'dash_dmg', 'dash_blast', 'dash_fire', 'dash_cryo', 'armor', 'haste', 'crit', 'area', 'thruster'].includes(id)) {
            lbDmgBonus += count * 0.05;
          }
        }
        const isClassShip = this.player.shipId === 'astra' || this.player.shipId === 'phantom';
        const arsenalSynergy = isClassShip
          ? (extraWeap * 0.06 + nonPowerPassives * 0.05 + dashLevels * 0.06)
          : (extraWeap * 0.04 + nonPowerPassives * 0.03 + dashLevels * 0.04);
        this.player.dmgMultiplier = 1.0 + (p.power || 0) * 0.18 + arsenalSynergy + lbDmgBonus;
        this.player._arsenalInDmgMult = true;
        // Haste
        this.player.cdrMultiplier = Math.max(0.35, 1.0 - (p.haste || 0) * 0.1);
        // Thruster + 等级成长统一收口（含硬上限）
        this.recalculateMoveSpeed();
        // Magnet
        this.player.magnetRadius = 120 * (1.0 + (p.magnet || 0) * 0.5);
        // Armor
        const armorLvl = p.armor || 0;
        const baseMaxHp = (stats?.hp || 100) + armorLvl * 35;
        this.player.maxHp = this.endlessMode && window.NeonRogueRelics?.owns(this, 'glass_reactor')
          ? Math.max(30, Math.round(baseMaxHp * 0.75))
          : baseMaxHp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp);
        this.player.regen = (stats?.regen ?? 0.8) + armorLvl * 1.8;
        this.player.hasCheatDeath = armorLvl >= 5 ||
          (this.player.shipId === 'phantom' && (p.death_reversal || 0) > 0);
        // Crit
        const critLvl = p.crit || 0;
        this.player.critRate = 0.08 + critLvl * 0.12;
        this.player.critDmg = 1.5 + critLvl * 0.35;
        // Area
        this.player.areaMultiplier = 1.0 + (p.area || 0) * 0.25;
        // Multishot
        const multiLvl = p.multishot || 0;
        // Bounded projectile growth; the legendary payoff is its separate starfield salvo.
        this.player.extraProjectiles = [0, 1, 1, 2, 2, 3][Math.min(5, multiLvl)] || 0;

        this.recalculateDashStats();
      }

      recalculateDashStats() {
        const du = this.player.dashUpgrades || {};

        // 1. Max charges: 3 base + dash_charge
        const baseCharges = window.NeonShips?.get(this.player.shipId)?.baseStats.dashCharges || 3;
        this.player.maxDashCharges = Math.min(9, baseCharges + (du.dash_charge || 0));
        this.player.dashCharges = Math.min(this.player.maxDashCharges, this.player.dashCharges);

        // 2. Recharge cooldown: reduced by haste and dash_charge
        const chargeHaste = (du.dash_charge || 0) * 0.12;
        this.player.dashRechargeTime = Math.max(0.9, 2.2 / (1 + chargeHaste));

        // 3. Slash Damage
        const dmgLvl = du.dash_dmg || 0;
        const dmgBoost = 1.0 + dmgLvl * 0.6 + (dmgLvl >= 5 ? 0.6 : 0);
        // Shared level growth (+3% / level) is applied exactly once in dealDamage().
        // Dash mastery, passives and limit breaks remain separate sources of power.
        const dashBreaks = (this.player.limitBreaks || {}).dash_dmg || 0;
        this.player.dashSlashDmg = Math.round(95 * this.player.dmgMultiplier * dmgBoost * Math.pow(1.25, dashBreaks));
        this.player.dashAlwaysCrit = dmgLvl >= 5;

        // 4. Slash Width & Invulnerability
        const areaLvl = du.dash_area || 0;
        this.player.dashSlashWidth = (18 + areaLvl * 10) * this.player.areaMultiplier;
        this.player.dashInvulnBonus = Math.min(0.08, areaLvl * 0.02);

        // 5. Blast Nova
        const blastLvl = du.dash_blast || 0;
        this.player.hasDashBlast = blastLvl > 0;
        this.player.dashBlastDamage = blastLvl > 0 ? Math.round((140 + (blastLvl - 1) * 70) * this.player.dmgMultiplier * Math.pow(1.3, (this.player.limitBreaks || {}).dash_blast || 0)) : 0;
        this.player.dashBlastRadius = (110 + (blastLvl - 1) * 35) * this.player.areaMultiplier;

        // 6. Fire Trail
        const fireLvl = du.dash_fire || 0;
        this.player.hasFireTrail = fireLvl > 0;
        this.player.fireTrailDuration = 2.2 + fireLvl * 0.4;
        this.player.fireTrailDamage = fireLvl > 0 ? Math.round((55 + (fireLvl - 1) * 30) * this.player.dmgMultiplier * Math.pow(1.25, (this.player.limitBreaks || {}).dash_fire || 0)) : 0;

        // 7. Cryo Freeze
        const cryoLvl = du.dash_cryo || 0;
        this.player.hasDashCryo = cryoLvl > 0;
        this.player.dashCryoDuration = 2.0 + cryoLvl * 0.5 + ((this.player.limitBreaks || {}).dash_cryo || 0) * 0.5;

        // 8. Phase Aegis Aura (时空相位无敌光环)
        const aegisLvl = du.dash_aegis || 0;
        this.player.hasAegis = aegisLvl > 0;
        if (aegisLvl > 0) {
          const damages = [0, 55, 75, 100, 130, 165];
          const radii = [45, 55, 65, 80, 95, 110];
          const breaks = (this.player.limitBreaks || {}).dash_aegis || 0;
          this.player.aegisDuration = NEON_AEGIS_DURATIONS[Math.min(aegisLvl, 6) - 1] || 0.15;
          // Infinite limit breaks must not evolve into a full-screen passive kill aura.
          this.player.aegisDamage = Math.round((damages[Math.min(aegisLvl, 6) - 1] || 0) * this.player.dmgMultiplier * Math.min(3, Math.pow(1.25, breaks)));
          this.player.aegisRadius = radii[Math.min(aegisLvl, 6) - 1] * this.player.areaMultiplier * Math.min(1.7, Math.pow(1.1, breaks));
          this.player.hasAegisBurst = aegisLvl >= 6;
        } else {
          this.player.aegisDuration = 0;
          this.player.aegisDamage = 0;
          this.player.aegisRadius = 0;
          this.player.hasAegisBurst = false;
        }
      }

      syncOrbiters() {
        const lvl = this.player.weapons.orbit || 0;
        if (lvl <= 0) return;
        const count = 2 + (lvl >= 3 ? 1 : 0) + (lvl >= 5 ? 2 : 0) + Math.min(2, this.player.extraProjectiles || 0);
        this.orbiters = [];
        for (let i = 0; i < count; i++) {
          this.orbiters.push({
            angle: (i / count) * Math.PI * 2,
            distance: (85 + (lvl >= 3 ? 20 : 0)) * this.player.areaMultiplier,
            radius: 9 * this.player.areaMultiplier,
            damage: 28 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35),
            color: '#00ffaa'
          });
        }
      }

      syncDrones() {
        const lvl = this.player.weapons.drones || 0;
        if (lvl <= 0) return;
        const count = Math.min(5, 1 + lvl);
        this.companionDrones = [];
        for (let i = 0; i < count; i++) {
          this.companionDrones.push({
            angle: (i / count) * Math.PI * 2,
            orbitDist: 52 * this.player.areaMultiplier,
            shootTimer: i * 0.1,
            shootInterval: Math.max(0.24, 0.58 - lvl * 0.07),
            damage: 22 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.3)
          });
        }
      }
    });
