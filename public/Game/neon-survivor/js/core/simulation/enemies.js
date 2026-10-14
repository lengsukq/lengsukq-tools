    /* Enemy advance, collision, crowd control and death. */
    NeonCore.define(NeonSurvivorGame, class {
      updateEnemies(dt) {
        // --- Update Enemies ---
        this.lightningTethers = [];
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.dead) {
            this.enemies.splice(i, 1);
            continue;
          }

          // Enemies choose the nearest living ship across the whole party,
          // never hard-code only host and the first guest.
          const targets = [this.player,
            ...((this.lanCoop?.rtc?.connected && this.lanCoop?.allies?.size)
              ? this.lanCoop.allies.values() : (this.lanCoop?.ally ? [this.lanCoop.ally] : []))]
            .filter(p => p && p.hp > 0 && !p.downed && !p.disconnected);
          const aimPlayer = targets.reduce((nearest, p) => !nearest ||
            Vec.distSq(e.x, e.y, p.x, p.y) < Vec.distSq(e.x, e.y, nearest.x, nearest.y)
              ? p : nearest, null) || this.player;
          const distToPlayer = Vec.dist(e.x, e.y, aimPlayer.x, aimPlayer.y);
          const angleToPlayer = Math.atan2(aimPlayer.y - e.y, aimPlayer.x - e.x);

          // Separation from nearby enemies
          let sepX = 0, sepY = 0;
          for (let j = 0; j < Math.min(10, this.enemies.length); j++) {
            const other = this.enemies[j];
            if (other === e) continue;
            const reach = e.radius + other.radius;
            const odSq = Vec.distSq(e.x, e.y, other.x, other.y);
            if (odSq < reach * reach && odSq > 0.01) {
              const od = Math.sqrt(odSq);
              sepX += (e.x - other.x) / od;
              sepY += (e.y - other.y) / od;
            }
          }

          // Enemy Freeze Slow (50% movement slow)
          if (!e.baseSpeed) e.baseSpeed = e.speed || 120;
          if (e.freezeTimer > 0) {
            e.freezeTimer -= dt;
            e.speed = e.baseSpeed * 0.5;
          } else {
            e.speed = e.baseSpeed;
          }

          // Enemy Behavior Types
          if (e.stunnedUntil > this.survivalTime) {
            // Ejection stun pauses both movement AND attacks, not just velocity.
            e.vx = 0;
            e.vy = 0;
          } else if (!e.isBoss && e.fearedUntil > this.survivalTime) {
            // Terror prevents special attacks while enemies retreat.
            const awayX = e.x - aimPlayer.x, awayY = e.y - aimPlayer.y;
            const awayDist = Math.max(1, Math.sqrt(awayX * awayX + awayY * awayY));
            e.vx = awayX / awayDist * (e.speed || 120) * 1.25;
            e.vy = awayY / awayDist * (e.speed || 120) * 1.25;
          } else if (e.type === 'charger') {
            e.chargeTimer -= dt;
            if (e.chargeTimer <= 0) {
              e.isCharging = true;
              e.vx = Math.cos(angleToPlayer) * 440;
              e.vy = Math.sin(angleToPlayer) * 440;
              e.chargeTimer = 3.5;
            }
            if (e.isCharging) {
              e.vx *= 0.985;
              e.vy *= 0.985;
              if (Math.sqrt(e.vx * e.vx + e.vy * e.vy) < e.speed) e.isCharging = false;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 40;
            }
          } else if (e.type === 'spitter') {
            e.shootTimer += dt;
            if (e.shootTimer >= e.shootCooldown &&
                !(e.fearedUntil > this.survivalTime) && !(e.stunnedUntil > this.survivalTime)) {
              e.shootTimer = 0;
              this.spawnEnemyBullet({
                x: e.x,
                y: e.y,
                vx: Math.cos(angleToPlayer) * 260,
                vy: Math.sin(angleToPlayer) * 260,
                radius: 5,
                color: '#00ff88',
                damage: e.damage,
                life: 3.5
              });
            }
            if (distToPlayer < 240) {
              e.vx = -Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = -Math.sin(angleToPlayer) * e.speed + sepY * 40;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 40;
            }
          } else if (e.type === 'kamikaze') {
            // Kamikaze rush & two-stage fuse: 近身先引信预警，走完才结算，拉开可空爆
            e.vx = Math.cos(angleToPlayer) * e.speed;
            e.vy = Math.sin(angleToPlayer) * e.speed;
            if (!e.arming && distToPlayer < 78) {
              e.arming = true;
              e.fuse = 0.55;
              try { this.sound.playZap(); } catch (err) {}
              this.shockwaves.push({
                x: e.x,
                y: e.y,
                radius: 6,
                maxRadius: 46,
                alpha: 0.9,
                color: '#ff3300'
              });
            }
            if (e.arming) {
              e.fuse -= dt;
              if (e.fuse <= 0 && !e.dead) {
                e.dead = true;
                this.sound.playExplosion('small');
                this.shockwaves.push({
                  x: e.x,
                  y: e.y,
                  radius: 10,
                  maxRadius: 85,
                  alpha: 1,
                  color: '#ff3300'
                });
                // 引信走完仍在90半径内才造成伤害，否则只是空爆
                if (Vec.distSq(e.x, e.y, this.player.x, this.player.y) < 8100) {
                  this.hitPlayer(e.damage);
                }
              }
            }
          } else if (e.type === 'shield_pylon') {
            e.vx = Math.cos(angleToPlayer) * e.speed * 0.7 + sepX * 50;
            e.vy = Math.sin(angleToPlayer) * e.speed * 0.7 + sepY * 50;
            // Buff nearby minions
            for (let j = 0; j < Math.min(15, this.enemies.length); j++) {
              const other = this.enemies[j];
              if (other !== e && !other.isBoss) {
                if (Vec.distSq(e.x, e.y, other.x, other.y) < 19600) other.shielded = true;
              }
            }
          } else if (e.type === 'sniper') {
            e.aimTimer = (e.aimTimer || 1.2) - dt;
            if (e.aimTimer <= 0) {
              e.aimTimer = 3.0;
              this.sound.playLaser(1100, 'sawtooth');
              this.spawnEnemyBullet({
                x: e.x,
                y: e.y,
                vx: Math.cos(angleToPlayer) * 620,
                vy: Math.sin(angleToPlayer) * 620,
                radius: 4,
                color: '#ff00aa',
                damage: e.damage,
                life: 3.0
              });
            }
            if (distToPlayer < 320) {
              e.vx = -Math.cos(angleToPlayer) * e.speed;
              e.vy = -Math.sin(angleToPlayer) * e.speed;
            } else {
              e.vx = sepX * 30;
              e.vy = sepY * 30;
            }
          } else if (e.type === 'nexus_pylon') {
            // Orbits Storm Nexus Boss
            if (this.currentBoss && this.currentBoss.type === 'boss_nexus' && !this.currentBoss.dead) {
              e.orbitAngle = (e.orbitAngle || 0) + 1.2 * dt;
              const targetX = this.currentBoss.x + Math.cos(e.orbitAngle) * 160;
              const targetY = this.currentBoss.y + Math.sin(e.orbitAngle) * 160;
              e.x += (targetX - e.x) * 4 * dt;
              e.y += (targetY - e.y) * 4 * dt;
              e.vx = 0;
              e.vy = 0;
              // Add lightning tether link
              this.lightningTethers.push({
                x1: this.currentBoss.x,
                y1: this.currentBoss.y,
                x2: e.x,
                y2: e.y,
                color: '#00f3ff'
              });
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.type === 'shield_drone') {
            // Orbits Omega Carrier Boss
            if (this.currentBoss && this.currentBoss.type === 'boss_carrier' && !this.currentBoss.dead) {
              e.orbitAngle = (e.orbitAngle || 0) + 1.0 * dt;
              const targetX = this.currentBoss.x + Math.cos(e.orbitAngle) * 180;
              const targetY = this.currentBoss.y + Math.sin(e.orbitAngle) * 180;
              e.x += (targetX - e.x) * 4 * dt;
              e.y += (targetY - e.y) * 4 * dt;
              e.vx = 0;
              e.vy = 0;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.type === 'larvae') {
            // Pulled towards Devourer boss mouth
            if (this.currentBoss && this.currentBoss.type === 'boss_devourer' && !this.currentBoss.dead) {
              const bAngle = Math.atan2(this.currentBoss.y - e.y, this.currentBoss.x - e.x);
              e.vx = Math.cos(bAngle) * 190;
              e.vy = Math.sin(bAngle) * 190;
              // If reaches boss mouth: eaten & triggers bullet storm!
              if (Vec.distSq(e.x, e.y, this.currentBoss.x, this.currentBoss.y) < 2304) {
                this.currentBoss.hp = Math.min(this.currentBoss.maxHp, this.currentBoss.hp + 120);
                this.sound.playBeam();
                // Radial shockwave
                for (let k = 0; k < 8; k++) {
                  const sAng = (k / 8) * Math.PI * 2;
                  this.spawnEnemyBullet({
                    x: this.currentBoss.x,
                    y: this.currentBoss.y,
                    vx: Math.cos(sAng) * 220,
                    vy: Math.sin(sAng) * 220,
                    radius: 5,
                    color: '#9d00ff',
                    damage: 16,
                    life: 3.5
                  });
                }
                e.dead = true;
              }
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.isBoss) {
            // BOSS ARCHETYPES
            // Ascension VI: an extra, telegraphed phase below 60% HP.
            if (this.difficulty >= 6 && e.hp < e.maxHp * 0.60) {
              e.nightmareCharge = (e.nightmareCharge === undefined ? 2.8 : e.nightmareCharge) - dt;
              if (e.nightmareCharge <= 0 && !e.nightmareTelegraph) {
                e.nightmareTelegraph = 0.60;
                e.nightmareCharge = 4.0;
                this.shockwaves.push({ x: e.x, y: e.y, radius: 12, maxRadius: 190, alpha: 1, color: '#ff3366' });
                this.texts.push({ x: e.x, y: e.y - 75, text: '⚠ 噩梦连射 · 准备闪避', color: '#ff6688', size: 18, life: 0.85, maxLife: 0.85 });
              }
              if (e.nightmareTelegraph > 0) {
                e.nightmareTelegraph -= dt;
                if (e.nightmareTelegraph <= 0) {
                  e.nightmareTelegraph = 0;
                  const baseAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                  for (let i = -3; i <= 3; i++) {
                    const angle = baseAngle + i * 0.17;
                    this.spawnEnemyBullet({
                      x: e.x, y: e.y,
                      vx: Math.cos(angle) * 280, vy: Math.sin(angle) * 280,
                      radius: 5, color: '#ff3366', damage: 23, life: 3.0
                    });
                  }
                }
              }
            }
            if (e.type === 'boss_dual_reactor' && window.NeonLanEncounters?.active(this)) {
              window.NeonLanEncounters.updateBoss(this, e, dt);
            } else if (e.type === 'boss_nexus') {
              e.attackTimer += dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
              // Electric burst attack
              if (e.attackTimer > 2.2) {
                e.attackTimer = 0;
                this.sound.playZap();
                for (let k = 0; k < 6; k++) {
                  const bAngle = (k / 6) * Math.PI * 2 + (this.survivalTime * 1.5);
                  this.spawnEnemyBullet({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 240,
                    vy: Math.sin(bAngle) * 240,
                    radius: 6,
                    color: '#00f3ff',
                    damage: 20,
                    life: 3.5
                  });
                }
              }
            } else if (e.type === 'boss_carrier') {
              if (e.stunTimer > 0) {
                e.stunTimer -= dt;
                e.vx = 0;
                e.vy = 0;
              } else {
                e.attackTimer += dt;
                e.spawnTimer = (e.spawnTimer || 0) + dt;
                e.vx = Math.cos(angleToPlayer) * e.speed;
                e.vy = Math.sin(angleToPlayer) * e.speed;

                // Summons Kamikaze ticks (节流：4.5s一只，仅无尽/半血以下才两只)
                if (e.spawnTimer > 4.5) {
                  e.spawnTimer = 0;
                  const summonCount = (this.endlessMode || e.hp < e.maxHp * 0.5) ? 2 : 1;
                  for (let s = 0; s < summonCount; s++) {
                    const offAng = (s === 0 ? -0.5 : 0.5) + Math.random() * 0.2;
                    this.enemies.push({
                      type: 'kamikaze',
                      x: e.x + Math.cos(angleToPlayer + offAng) * 45,
                      y: e.y + Math.sin(angleToPlayer + offAng) * 45,
                      vx: 0,
                      vy: 0,
                      hp: 35,
                      maxHp: 35,
                      radius: 11,
                      speed: 230,
                      color: '#ff3300',
                      damage: 18,
                      xpVal: 3
                    });
                  }
                }

                // Plasma spreads
                if (e.attackTimer > 2.0) {
                  e.attackTimer = 0;
                  for (let k = -2; k <= 2; k++) {
                    const bAngle = angleToPlayer + k * 0.22;
                    this.spawnEnemyBullet({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(bAngle) * 220,
                      vy: Math.sin(bAngle) * 220,
                      radius: 6,
                      color: '#ff007f',
                      damage: 22,
                      life: 3.8
                    });
                  }
                }
              }
            } else if (e.type === 'boss_devourer') {
              e.attackTimer += dt;
              e.devourTimer = (e.devourTimer || 0) + dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;

              // Spawns ring of larvae to feed upon
              if (e.devourTimer > 5.0) {
                e.devourTimer = 0;
                this.sound.playBlackHole();
                for (let k = 0; k < 6; k++) {
                  const lAng = (k / 6) * Math.PI * 2;
                  this.enemies.push({
                    type: 'larvae',
                    x: e.x + Math.cos(lAng) * 280,
                    y: e.y + Math.sin(lAng) * 280,
                    vx: 0,
                    vy: 0,
                    hp: 45,
                    maxHp: 45,
                    radius: 10,
                    speed: 130,
                    color: '#9d00ff',
                    damage: 12,
                    xpVal: 5
                  });
                }
              }

              // Spiral void hell
              if (e.attackTimer > 1.8) {
                e.attackTimer = 0;
                for (let k = 0; k < 10; k++) {
                  const bAngle = (k / 10) * Math.PI * 2 + (this.survivalTime * 2);
                  this.spawnEnemyBullet({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 210,
                    vy: Math.sin(bAngle) * 210,
                    radius: 6,
                    color: '#9d00ff',
                    damage: 20,
                    life: 4.0
                  });
                }
              }
            } else {
              // Generic boss fallback
              e.attackTimer += dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
              if (e.attackTimer > 1.8) {
                e.attackTimer = 0;
                for (let k = 0; k < 12; k++) {
                  const bAngle = (k / 12) * Math.PI * 2 + (this.survivalTime * 2);
                  this.spawnEnemyBullet({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 200,
                    vy: Math.sin(bAngle) * 200,
                    radius: 6,
                    color: '#ff0055',
                    damage: 18,
                    life: 4.0
                  });
                }
              }
            }
          } else {
            // Standard Chasers
            e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 50;
            e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 50;
          }

          e.x += e.vx * dt;
          e.y += e.vy * dt;

          // Melee collision with player: Ghost Form phases straight through without collision damage;
          // Repel kinetic barrier active on Phantom deflects contact damage from repelled enemies
          const isPhantomProtected = this.player.shipId === 'phantom' && (
            Boolean(this.player.phantom?.shiftActive) ||
            ((this.player.phantom?.vortexTimer || 0) > 0 && !this.player.phantom?.shiftActive)
          );
          const contact = e.radius + this.player.radius;
          if (!this.player.downed && this.player.invulnTimer <= 0 &&
              !isPhantomProtected &&
              Vec.distSq(e.x, e.y, this.player.x, this.player.y) < contact * contact) {
            this.hitPlayer(e.damage);
          }
        }
      }
    });
