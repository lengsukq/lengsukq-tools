    /* Derived stats: move speed, passives, dash charges, orbiters and drones. */
    NeonCore.define(NeonSurvivorGame, class {
      recalculateMoveSpeed() {
        // The formula lives in simulation/speed.js so the host, the host's
        // simulation of a remote ally and the guest's prediction all agree.
        // 等级移速成长：每级+6，最多+120；全局硬上限385（推进器/破限叠加也不超）
        PilotSpeed.recalculate(this.player);
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

      recalculateDashStats(pilot = this.player) {
        // Parametrised so a remote ally gets the SAME derived dash stats as
        // the host's own pilot. Without this the guest's HUD showed a
        // hardcoded 95 slash damage, no combo and no aegis/fire/cryo badges,
        // because those fields only ever existed on the host's player object.
        const du = pilot.dashUpgrades || {};

        // 1. Max charges: 3 base + dash_charge
        const baseCharges = window.NeonShips?.get(pilot.shipId)?.baseStats.dashCharges || 3;
        pilot.maxDashCharges = Math.min(9, baseCharges + (du.dash_charge || 0));
        pilot.dashCharges = Math.min(pilot.maxDashCharges, pilot.dashCharges);

        // 2. Recharge cooldown: reduced by haste and dash_charge
        const chargeHaste = (du.dash_charge || 0) * 0.12;
        pilot.dashRechargeTime = Math.max(0.9, 2.2 / (1 + chargeHaste));

        // 3. Slash Damage
        const dmgLvl = du.dash_dmg || 0;
        const dmgBoost = 1.0 + dmgLvl * 0.6 + (dmgLvl >= 5 ? 0.6 : 0);
        // Shared level growth (+3% / level) is applied exactly once in dealDamage().
        // Dash mastery, passives and limit breaks remain separate sources of power.
        const dashBreaks = (pilot.limitBreaks || {}).dash_dmg || 0;
        pilot.dashSlashDmg = Math.round(95 * pilot.dmgMultiplier * dmgBoost * Math.pow(1.25, dashBreaks));
        pilot.dashAlwaysCrit = dmgLvl >= 5;

        // 4. Slash Width & Invulnerability
        const areaLvl = du.dash_area || 0;
        pilot.dashSlashWidth = (18 + areaLvl * 10) * pilot.areaMultiplier;
        pilot.dashInvulnBonus = Math.min(0.08, areaLvl * 0.02);

        // 5. Blast Nova
        const blastLvl = du.dash_blast || 0;
        pilot.hasDashBlast = blastLvl > 0;
        pilot.dashBlastDamage = blastLvl > 0 ? Math.round((140 + (blastLvl - 1) * 70) * pilot.dmgMultiplier * Math.pow(1.3, (pilot.limitBreaks || {}).dash_blast || 0)) : 0;
        pilot.dashBlastRadius = (110 + (blastLvl - 1) * 35) * pilot.areaMultiplier;

        // 6. Fire Trail
        const fireLvl = du.dash_fire || 0;
        pilot.hasFireTrail = fireLvl > 0;
        pilot.fireTrailDuration = 2.2 + fireLvl * 0.4;
        pilot.fireTrailDamage = fireLvl > 0 ? Math.round((55 + (fireLvl - 1) * 30) * pilot.dmgMultiplier * Math.pow(1.25, (pilot.limitBreaks || {}).dash_fire || 0)) : 0;

        // 7. Cryo Freeze
        const cryoLvl = du.dash_cryo || 0;
        pilot.hasDashCryo = cryoLvl > 0;
        pilot.dashCryoDuration = 2.0 + cryoLvl * 0.5 + ((pilot.limitBreaks || {}).dash_cryo || 0) * 0.5;

        // 8. Phase Aegis Aura (时空相位无敌光环)
        const aegisLvl = du.dash_aegis || 0;
        pilot.hasAegis = aegisLvl > 0;
        if (aegisLvl > 0) {
          const damages = [0, 55, 75, 100, 130, 165];
          const radii = [45, 55, 65, 80, 95, 110];
          const breaks = (pilot.limitBreaks || {}).dash_aegis || 0;
          pilot.aegisDuration = NEON_AEGIS_DURATIONS[Math.min(aegisLvl, 6) - 1] || 0.15;
          // Infinite limit breaks must not evolve into a full-screen passive kill aura.
          pilot.aegisDamage = Math.round((damages[Math.min(aegisLvl, 6) - 1] || 0) * pilot.dmgMultiplier * Math.min(3, Math.pow(1.25, breaks)));
          pilot.aegisRadius = radii[Math.min(aegisLvl, 6) - 1] * pilot.areaMultiplier * Math.min(1.7, Math.pow(1.1, breaks));
          pilot.hasAegisBurst = aegisLvl >= 6;
        } else {
          pilot.aegisDuration = 0;
          pilot.aegisDamage = 0;
          pilot.aegisRadius = 0;
          pilot.hasAegisBurst = false;
        }
      }

      /** Build one pilot's orbiters. Takes the pilot so the host can build an
       *  ally's too -- a remote pilot has no client running this. */
      syncOrbiters(pilot = this.player) {
        const lvl = pilot.weapons?.orbit || 0;
        const list = pilot.orbiters || (pilot.orbiters = []);
        list.length = 0;
        const count = lvl <= 0 ? 0
          : 2 + (lvl >= 3 ? 1 : 0) + (lvl >= 5 ? 2 : 0) + Math.min(2, pilot.extraProjectiles || 0);
        for (let i = 0; i < count; i++) {
          list.push({
            angle: (i / count) * Math.PI * 2,
            distance: (85 + (lvl >= 3 ? 20 : 0)) * pilot.areaMultiplier,
            radius: 9 * pilot.areaMultiplier,
            damage: 28 * pilot.dmgMultiplier * (1 + (lvl - 1) * 0.35),
            color: '#00ffaa',
            // Replicated, so a guest draws them around the right ship.
            centerX: pilot.x,
            centerY: pilot.y
          });
        }
        // Keep the aggregate the renderer and the wire read consistent with the
        // pilots, so it is never stale for even one frame.
        this.refreshPilotEntities();
      }

      /** Build one pilot's companion drones. See syncOrbiters. */
      syncDrones(pilot = this.player) {
        const lvl = pilot.weapons?.drones || 0;
        const list = pilot.companionDrones || (pilot.companionDrones = []);
        list.length = 0;
        const count = lvl <= 0 ? 0 : Math.min(5, 1 + lvl);
        for (let i = 0; i < count; i++) {
          list.push({
            angle: (i / count) * Math.PI * 2,
            orbitDist: 52 * pilot.areaMultiplier,
            shootTimer: i * 0.1,
            shootInterval: Math.max(0.24, 0.58 - lvl * 0.07),
            damage: 22 * pilot.dmgMultiplier * (1 + (lvl - 1) * 0.3)
          });
        }
        this.refreshPilotEntities();
      }
    });
