    /* Kill rewards, loot and gem compaction. */
    NeonCore.define(NeonSurvivorGame, class {
      onEnemyKilled(enemy, source = 'combat') {
        this.kills++;
        if (this.endlessMode) window.NeonRogueEndless?.onKill(this, enemy, source);
        // A dash can kill dozens of enemies in the same simulation frame.
        // Rate-limit sound nodes; never rate-limit kills, XP or loot rewards.
        this.playCombatSound('explosion', () =>
          this.sound.playExplosion(enemy.isBoss ? 'large' : 'small'),
          enemy.isBoss ? 2 : 1);
        this.screenShake = Math.max(this.screenShake, enemy.isBoss ? 15 : 2.5);

        // Boss-Minion Linkage hooks
        if (enemy.type === 'nexus_pylon') {
          if (this.currentBoss && this.currentBoss.type === 'boss_nexus' && !this.currentBoss.dead) {
            this.dealDamage(this.currentBoss, 700);
            this.sound.playNuke();
            this.shockwaves.push({
              x: enemy.x,
              y: enemy.y,
              radius: 10,
              maxRadius: 200,
              alpha: 1,
              color: '#00f3ff'
            });
            this.texts.push({
              x: enemy.x,
              y: enemy.y - 25,
              text: '⚡ 信标过载反噬！雷暴极核受创！',
              color: '#00f3ff',
              size: 16,
              life: 1.8,
              maxLife: 1.8
            });
          }
        } else if (enemy.type === 'shield_drone') {
          const aliveDrones = this.enemies.filter(e => e !== enemy && e.type === 'shield_drone' && !e.dead);
          if (aliveDrones.length === 0 && this.currentBoss && this.currentBoss.type === 'boss_carrier') {
            this.currentBoss.hasShield = false;
            this.currentBoss.stunTimer = 4.0;
            this.sound.playExplosion('large');
            this.screenShake = 16;
            this.shockwaves.push({
              x: this.currentBoss.x,
              y: this.currentBoss.y,
              radius: 15,
              maxRadius: 260,
              alpha: 1,
              color: '#ff007f'
            });
            this.texts.push({
              x: this.currentBoss.x,
              y: this.currentBoss.y - 35,
              text: '💥 护盾全面瓦解！母舰核心过载瘫痪！',
              color: '#ffaa00',
              size: 18,
              life: 2.0,
              maxLife: 2.0
            });
          }
        }

        // Spawn death particles with strict cap
        if (this.particles.length < (this.fxLow ? 20 : 60)) {
          const count = enemy.isBoss ? 18 : 4;
          for (let i = 0; i < count; i++) {
            const spd = Math.random() * 140 + 30;
            const a = Math.random() * Math.PI * 2;
            this.particles.push({
              type: 'spark',
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              radius: Math.random() * 2.2 + 1.2,
              color: enemy.color,
              life: 0.25,
              maxLife: 0.25
            });
          }
        }

        // Paced XP scaling: +18% per minute, steady progression
        const timeMin = this.survivalTime / 60;
        const timeMultiplier = 1.0 + timeMin * 0.18;
        const baseXP = enemy.xpVal || 2;
        const scaledXP = Math.round(baseXP * timeMultiplier);

        const dropRoll = Math.random();
        if (enemy.isBoss) {
          window.NeonLanEncounters?.bonusOnVictory(this, enemy);
          this.currentBoss = null;
          // Boss drops 10 gold gems worth 25 each (total 250 XP: gives 1-2 clean level ups)
          for (let i = 0; i < 10; i++) {
            this.gems.push({
              type: 'gem',
              x: enemy.x + (Math.random() - 0.5) * 80,
              y: enemy.y + (Math.random() - 0.5) * 80,
              value: 25,
              color: '#ffea00',
              radius: 7.0
            });
          }
          if (Math.random() < this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'heal', x: enemy.x - 35, y: enemy.y, radius: 11 });
          }
          if (Math.random() < this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'magnet', x: enemy.x + 35, y: enemy.y, radius: 11 });
          }
          if (!this.endlessMode) {
            setTimeout(() => { if (this.currentBoss === null && this.state === 'playing') this.victory(); }, 1400);
          } else {
            this.texts.push({
              x: this.player.x,
              y: this.player.y - 35,
              text: '👑 欧米茄领主已被粉碎！无尽巨额经验已释放！',
              color: '#ffea00',
              size: 18,
              life: 2.0,
              maxLife: 2.0
            });
          }
        } else if (enemy.isElite) {
          this.playCombatSound('elite-explosion', () => this.sound.playExplosion('large'), 1);
          this.screenShake = Math.max(this.screenShake, 6);
          if (this.shockwaves.length < 36) this.shockwaves.push({
            x: enemy.x, y: enemy.y, radius: 8, maxRadius: 160,
            alpha: .9, color: '#ffd700'
          });
          if (this.texts.length < 36) this.texts.push({
            x: enemy.x, y: enemy.y - 25, text: '★ 精英机甲击破!',
            color: '#ffd700', size: 16, life: 1.5, maxLife: 1.5
          });
          for (let k = 0; k < 2; k++) {
            this.gems.push({
              type: 'gem',
              x: enemy.x + (Math.random() - 0.5) * 40,
              y: enemy.y + (Math.random() - 0.5) * 40,
              value: Math.max(12, Math.round(scaledXP * 0.75)),
              color: '#ffea00',
              radius: 6.5
            });
          }
          if (Math.random() < 0.3 * this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'heal', x: enemy.x, y: enemy.y, radius: 10 });
          }
        } else {
          const drop = this.rollNormalDrop(dropRoll, source);
          if (drop !== 'gem') {
            this.gems.push({ type: drop, x: enemy.x, y: enemy.y, radius: 10 });
            if (drop === 'nuke') this.combatTelemetry.nukeDrops++;
          } else {
            let gemColor = enemy.xpColor || '#00f3ff';
            let gemRadius = 4.5;
            if (scaledXP >= 16) {
              gemColor = '#ffea00';
              gemRadius = 6.5;
            } else if (scaledXP >= 8) {
              gemColor = '#d37aff';
              gemRadius = 5.5;
            }
            this.gems.push({
              type: 'gem',
              x: enemy.x,
              y: enemy.y,
              value: scaledXP,
              color: gemColor,
              radius: gemRadius
            });
          }
        }
      }

      cleanAndCompactGems() {
        if (this.gems.length <= 90) return;
        const compacted = [];
        for (let i = 0; i < this.gems.length; i += 2) {
          const g1 = this.gems[i];
          const g2 = this.gems[i + 1];
          if (g1 && g2 && g1.type === 'gem' && g2.type === 'gem') {
            g1.value += g2.value;
            g1.color = '#ffea00';
            g1.radius = Math.min(8.5, g1.radius + 1.2);
            compacted.push(g1);
          } else {
            if (g1) compacted.push(g1);
            if (g2) compacted.push(g2);
          }
        }
        this.gems = compacted;
      }
    });
