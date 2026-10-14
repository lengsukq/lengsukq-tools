    /* Adaptive difficulty and wave scaling inputs. */
    NeonCore.define(NeonSurvivorGame, class {
      getAdaptiveScaling() {
        let weaponLevels = 0;
        for (const lvl of Object.values(this.player.weapons)) weaponLevels += lvl;
        let passiveLevels = 0;
        for (const lvl of Object.values(this.player.passives)) passiveLevels += lvl;
        const totalLb = this.player.totalLimitBreaks || 0;

        // Player potency (Level + Weapon tiers + Passives + Limit breaks)
        // 等级/攻击加成对怪血的反哺已压平：玩家变强不再大幅推高怪血
        const potency = (this.player.level - 1) * 0.04
                      + (weaponLevels - 1) * 0.05
                      + passiveLevels * 0.03
                      + totalLb * 0.08
                      + (this.player.dmgMultiplier - 1.0) * 0.15;

        // "时间越到后面 越难才对"：后期间隙与怪物硬度随时间平滑阶梯攀升（已放缓）
        const timeMin = this.survivalTime / 60;
        const timeEscalation = 1.0 + timeMin * 0.15 + Math.pow(Math.max(0, timeMin - 3.5), 1.20) * 0.10;

        return timeEscalation * (1.0 + Math.max(0, potency));
      }

      getLevelDmgMult() {
        // 等级基础攻击：每级 +3%（底薪），武器强化仍是大头，避免数值膨胀
        // Lv10约+27%，Lv20约+57%，Lv30约+87%
        return 1.0 + (this.player.level - 1) * 0.03;
      }

      getNormalEnemyCount() {
        let count = 0;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.isBoss && !e.isElite) count++;
        }
        return count;
      }

      getActiveSpawnPilot() {
        // While the host is down, enemies must keep spawning around the
        // surviving guest. Otherwise the last-stand challenge becomes empty.
        if (this.player.downed && (this.lanCoop?.allies?.size || 0) > 1) {
          const survivor = [...this.lanCoop.allies.values()].find(p =>
            !p.disconnected && p.hp > 0 && !p.downed);
          if (survivor) return survivor;
        }
        if (this.player.downed && this.lanCoop?.ally?.hp > 0 &&
            !this.lanCoop.ally.downed) return this.lanCoop.ally;
        return this.player;
      }
    });
