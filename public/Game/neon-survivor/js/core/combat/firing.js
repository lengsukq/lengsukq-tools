    /* Weapon firing: targeting and the seven legacy weapons. */
    NeonCore.define(NeonSurvivorGame, class {
      findNearestEnemy(range = 700, origin = this.player) {
        if (!Array.isArray(this.enemies) || !this.enemies.length) return null;
        let nearest = null;
        let minDistSq = range * range;
        for (const e of this.enemies) {
          const dx = e.x - origin.x;
          const dy = e.y - origin.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearest = e;
          }
        }
        return nearest;
      }

      fireBlaster(lvl) {
        this.sound.playLaser(620, 'sawtooth');
        const count = (lvl >= 4 ? 3 : (lvl >= 2 ? 2 : 1)) + (this.player.extraProjectiles || 0);
        const spread = 0.16;
        const pierce = lvl >= 4 ? 2 : 1;
        const baseDmg = 25 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.25);
        const radius = (lvl >= 5 ? 7 : 4.5) * this.player.areaMultiplier;
        const isPlasmaExplosion = lvl >= 5;

        for (let i = 0; i < count; i++) {
          const offsetAngle = (i - (count - 1) / 2) * spread;
          const angle = this.player.aimAngle + offsetAngle;
          this.bullets.push({
            type: 'blaster',
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * 780,
            vy: Math.sin(angle) * 780,
            radius,
            damage: baseDmg,
            pierce: pierce,
            isPlasmaExplosion: isPlasmaExplosion,
            explosionRadius: 48 * this.player.areaMultiplier,
            color: lvl >= 5 ? '#ffaa00' : '#00f3ff',
            life: 1.4,
            trail: []
          });
        }
      }

      fireTesla(lvl) {
        const nearest = this.findNearestEnemy(480 * this.player.areaMultiplier);
        if (!nearest) return;
        this.sound.playZap();

        const targets = [nearest];
        const maxJumps = 2 + (lvl >= 3 ? lvl + 1 : lvl) + (this.player.extraProjectiles || 0);
        let current = nearest;
        const damage = 42 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.3);

        for (let j = 0; j < maxJumps; j++) {
          let next = null;
          let minDSq = 280 * 280 * this.player.areaMultiplier;
          for (const e of this.enemies) {
            if (targets.includes(e)) continue;
            const dx = e.x - current.x;
            const dy = e.y - current.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDSq) {
              minDSq = dSq;
              next = e;
            }
          }
          if (next) {
            targets.push(next);
            current = next;
          } else break;
        }

        // Apply damage and spark visuals
        let prevX = this.player.x;
        let prevY = this.player.y;
        targets.forEach((tg) => {
          this.dealDamage(tg, damage, 'tesla');
          // Tesla CC: Lv.3+ adds 0.6s EMP slow (50%), Lv.5 adds 1.2s EMP paralysis stun + ball lightning burst!
          if (lvl >= 3) {
            tg.freezeTimer = Math.max(tg.freezeTimer || 0, lvl >= 5 ? 1.2 : 0.6);
          }
          if (lvl >= 5) {
            this.shockwaves.push({
              x: tg.x,
              y: tg.y,
              radius: 4,
              maxRadius: 36 * this.player.areaMultiplier,
              alpha: 0.8,
              color: '#00f3ff'
            });
          }
          // Tesla chains can jump many times per volley; keep the same particle
          // budget the damage path uses instead of allocating unbounded.
          if (this.particles.length < (this.fxLow ? 15 : 45)) {
            this.particles.push({
              type: 'lightning',
              x1: prevX,
              y1: prevY,
              x2: tg.x,
              y2: tg.y,
              color: '#00f3ff',
              life: 0.14,
              maxLife: 0.14
            });
          }
          prevX = tg.x;
          prevY = tg.y;
        });
      }

      fireMissiles(lvl) {
        const lb = (this.player.limitBreaks && this.player.limitBreaks.missiles) || 0;
        let count = 2;
        if (lvl === 2) count = 3;
        else if (lvl === 3) count = 4;
        else if (lvl === 4) count = 5;
        else if (lvl >= 5) count = 8 + Math.floor(lb / 2);
        // Keep the late-game cluster chain inside a stable physical projectile budget.
        count = Math.min(16, count + (this.player.extraProjectiles || 0) * (lvl >= 5 ? 2 : 1));

        let baseDmg = 60;
        if (lvl === 2) baseDmg = 80;
        else if (lvl === 3) baseDmg = 110;
        else if (lvl === 4) baseDmg = 145;
        else if (lvl >= 5) baseDmg = 195 + lb * 30;

        const damage = baseDmg * this.player.dmgMultiplier;

        let baseRadius = 48;
        if (lvl === 2) baseRadius = 75;
        else if (lvl === 3) baseRadius = 98;
        else if (lvl === 4) baseRadius = 122;
        else if (lvl >= 5) baseRadius = 155 + lb * 18;
        const explosionRadius = baseRadius * this.player.areaMultiplier;

        const hasCc = lvl >= 3;
        const slowDuration = lvl >= 5 ? 1.6 : (lvl >= 3 ? 1.0 : 0);
        const clusterCount = lvl >= 5 ? (3 + (lb >= 3 ? 1 : 0)) : (lvl === 4 ? 2 : 0);
        const isLevel5 = lvl >= 5;

        this.sound.playLaser(isLevel5 ? 260 : 380, 'square');

        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.22 + (Math.random() - 0.5) * 0.25;
          const angle = this.player.aimAngle + spread;
          const speed = isLevel5 ? 560 : 500;
          this.bullets.push({
            type: 'missile',
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * (speed * 0.65),
            vy: Math.sin(angle) * (speed * 0.65),
            radius: (isLevel5 ? 6.5 : (lvl >= 3 ? 5.5 : 4.5)) * this.player.areaMultiplier,
            speed: speed,
            damage: damage,
            target: this.findNearestEnemy(950),
            explosionRadius: explosionRadius,
            hasCc: hasCc,
            slowDuration: slowDuration,
            clusterCount: clusterCount,
            isLevel5: isLevel5,
            life: 2.8,
            color: isLevel5 ? '#ff00aa' : (lvl >= 4 ? '#ff007f' : '#ff3388'),
            trail: []
          });
        }
      }

      fireNova(lvl) {
        window.NeonRogueFusions?.onNova(this);
        this.sound.playExplosion('large');
        const radius = (220 + (lvl >= 2 ? 60 : 0)) * this.player.areaMultiplier;
        const damage = 85 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.4);

        // Lv.5 事件视界：爆发瞬间将周围敌群微幅吸聚后施加毁灭冲击
        if (lvl >= 5) {
          const pullR = radius * 1.15;
          const pullRSq = pullR * pullR;
          for (const e of this.enemies) {
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dSq = dx * dx + dy * dy;
            if (dSq > 16 && dSq <= pullRSq) {
              const d = Math.sqrt(dSq);
              e.vx += (dx / d) * 220;
              e.vy += (dy / d) * 220;
            }
          }
        }

        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 10,
          maxRadius: radius,
          alpha: 1,
          color: lvl >= 5 ? '#ff00aa' : '#ffaa00'
        });

        // Damage and knockback all enemies in area
        const rSq = radius * radius;
        for (const e of this.enemies) {
          const dx = e.x - this.player.x;
          const dy = e.y - this.player.y;
          if (dx * dx + dy * dy <= rSq) {
            this.dealDamage(e, damage, 'nova');
            const kAngle = Math.atan2(dy, dx);
            const kb = 320 + (lvl >= 3 ? 120 : 0);
            e.vx += Math.cos(kAngle) * kb;
            e.vy += Math.sin(kAngle) * kb;
            if (lvl >= 3) {
              e.freezeTimer = Math.max(e.freezeTimer || 0, 0.8);
            }
          }
        }
      }

      fireLaser(lvl) {
        this.sound.playBeam();
        const count = lvl >= 5 ? 2 : 1;
        const width = (12 + lvl * 3) * this.player.areaMultiplier;
        const length = 720 * this.player.areaMultiplier;
        const damage = 75 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35);

        for (let i = 0; i < count; i++) {
          const spread = count === 2 ? (i === 0 ? -0.22 : 0.22) : 0;
          const angle = this.player.aimAngle + spread;
          this.laserBeams.push({
            x: this.player.x,
            y: this.player.y,
            angle,
            length,
            width,
            damage,
            life: 0.22,
            maxLife: 0.22,
            color: '#00f3ff'
          });

          // Check line damage against all enemies
          for (const e of this.enemies) {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
            if (proj > 0 && proj < length) {
              const perpDist = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
              if (perpDist < width / 2 + e.radius) {
                this.dealDamage(e, damage, 'laser');
                // A piercing beam can hit every enemy in a line; budget the
                // sparks like every other damage path does.
                if (this.particles.length < (this.fxLow ? 15 : 45)) {
                  this.particles.push({
                    type: 'spark',
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(angle) * 140 + (Math.random() - 0.5) * 60,
                    vy: Math.sin(angle) * 140 + (Math.random() - 0.5) * 60,
                    radius: Math.random() * 2 + 1.2,
                    color: '#00f3ff',
                    life: 0.18,
                    maxLife: 0.18
                  });
                }
              }
            }
          }
        }
      }

      fireBlackHole(lvl) {
        this.sound.playBlackHole();
        const spawnDist = 240 * this.player.areaMultiplier;
        const targetX = this.player.x + Math.cos(this.player.aimAngle) * spawnDist;
        const targetY = this.player.y + Math.sin(this.player.aimAngle) * spawnDist;
        const radius = (180 + (lvl - 1) * 35) * this.player.areaMultiplier;
        const damage = 42 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35);

        this.blackHoles.push({
          x: targetX,
          y: targetY,
          radius,
          damage,
          life: 3.5 + (lvl >= 3 ? 1.0 : 0),
          maxLife: 3.5 + (lvl >= 3 ? 1.0 : 0),
          rotAngle: 0,
          pulseTimer: 0,
          color: '#9d00ff'
        });
      }

      fireCryoMine(lvl) {
        const count = 2 + (lvl >= 3 ? 1 : 0) + (this.player.extraProjectiles || 0);
        const blastRadius = (120 + (lvl - 1) * 25) * this.player.areaMultiplier;
        const damage = 65 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.4);

        for (let i = 0; i < count; i++) {
          this.mines.push({
            x: this.player.x + (Math.random() - 0.5) * 60,
            y: this.player.y + (Math.random() - 0.5) * 60,
            radius: 12,
            blastRadius,
            damage,
            life: 9.0,
            armTimer: 0.3,
            pulseTimer: 0,
            color: '#00f3ff'
          });
        }
      }
    });
