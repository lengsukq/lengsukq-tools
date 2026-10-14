    /* XP gems, drops and pickups. */
    NeonCore.define(NeonSurvivorGame, class {
      updateGems(dt) {
        // --- Update XP Gems & Drops ---
        // One mass kill / blink into a gem pile must not synchronously resolve
        // hundreds of pickups, DOM HUD changes or upgrade dialogs in one RAF.
        const pickupBudget = 24;
        let pickupsThisFrame = 0;
        for (let i = this.gems.length - 1; i >= 0; i--) {
          if (this.state !== 'playing') break;
          const g = this.gems[i];
          if (!g) continue;
          const collector = window.NeonLanExperience?.collector(this, g) || this.player;
          const dist = Vec.dist(g.x, g.y, collector.x, collector.y);
          const pullDist = g.magnetized ? 9999 :
            (window.NeonLanExperience?.pickupRadius(this, collector) || this.player.magnetRadius);

          if (dist < pullDist) {
            // Accelerate towards player
            const angle = Math.atan2(collector.y - g.y, collector.x - g.x);
            const pullSpeed = Math.max(420, 950 - dist * 1.5);
            g.x += Math.cos(angle) * pullSpeed * dt;
            g.y += Math.sin(angle) * pullSpeed * dt;

            if (dist < collector.radius + g.radius + 8) {
              if (pickupsThisFrame >= pickupBudget) continue;
              pickupsThisFrame++;
              if (g.type === 'heal') {
                const healAmt = Math.round(collector.maxHp * 0.35);
                collector.hp = Math.min(collector.maxHp, collector.hp + healAmt);
                this.sound.playHeal();
                this.texts.push({
                  x: collector.x,
                  y: collector.y - 25,
                  text: `💚 +${healAmt} 纳米修复!`,
                  color: '#00ffaa',
                  size: 18,
                  life: 1.0,
                  maxLife: 1.0
                });
              } else if (g.type === 'magnet') {
                this.sound.playZap();
                if (window.NeonLanExperience?.active(this)) {
                  window.NeonLanExperience.activateMapMagnet(this);
                } else {
                  this.gems.forEach(other => { if (other.type === 'gem') other.magnetized = true; });
                }
                this.texts.push({
                  x: collector.x,
                  y: collector.y - 25,
                  text: `🧲 全队共享经验 · 全图回收!`,
                  color: '#00f3ff',
                  size: 18,
                  life: 1.0,
                  maxLife: 1.0
                });
              } else if (g.type === 'nuke') {
                this.sound.playNuke();
                this.screenShake = 24;
                this.shockwaves.push({
                  x: this.player.x,
                  y: this.player.y,
                  radius: 10,
                  maxRadius: 700,
                  alpha: 1,
                  color: '#ffaa00'
                });
                this.texts.push({
                  x: this.player.x,
                  y: this.player.y - 25,
                  text: `💣 全域EMP歼灭脉冲!`,
                  color: '#ffaa00',
                  size: 20,
                  life: 1.2,
                  maxLife: 1.2
                });
                // Wipe small enemies & damage boss
                for (let k = this.enemies.length - 1; k >= 0; k--) {
                  const en = this.enemies[k];
                  if (en.isBoss) {
                    this.dealDamage(en, 650, 'nuke');
                  } else {
                    this.dealDamage(en, 9999, 'nuke');
                  }
                }
              } else {
                this.sound.playGemPickup();
                this.gainXP(g.value);
              }
              this.gems.splice(i, 1);
              // The first level-up pauses gameplay and yields to the upgrade
              // picker. Leave the rest of the drops for resumed simulation.
              if (this.state !== 'playing') break;
            }
          }
        }
      }
    });
