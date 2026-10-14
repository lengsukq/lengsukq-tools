    /* Projectiles: player bullets and enemy projectiles. */
    NeonCore.define(NeonSurvivorGame, class {
      updateBullets(dt) {
        // --- Update Bullets ---
        for (let i = this.bullets.length - 1; i >= 0; i--) {
          const b = this.bullets[i];
          b.life -= dt;
          if (b.life <= 0) {
            if (b.type === 'cluster_missile') {
              // Cluster bomblet airburst detonation on timeout
              this.sound.playExplosion('small');
              this.shockwaves.push({
                x: b.x,
                y: b.y,
                radius: 4,
                maxRadius: b.explosionRadius,
                alpha: 0.85,
                color: b.isLevel5 ? '#ffea00' : '#ff66cc'
              });
              const rSq = b.explosionRadius * b.explosionRadius;
              for (const ae of this.enemies) {
                const edx = ae.x - b.x;
                const edy = ae.y - b.y;
                if (edx * edx + edy * edy <= rSq) {
                  this.dealDamage(ae, b.damage);
                  if (b.hasCc && b.slowDuration) {
                    ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                  }
                }
              }
            }
            this.bullets.splice(i, 1);
            continue;
          }

          if (b.type === 'missile') {
            // Homing logic
            if (!b.target || b.target.dead) {
              b.target = this.findNearestEnemy(950);
            }
            if (b.target) {
              const targetAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
              const currentAngle = Math.atan2(b.vy, b.vx);
              let diff = targetAngle - currentAngle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              const turnRate = b.isLevel5 ? 9.5 : 7.5;
              const newAngle = currentAngle + diff * Math.min(1, turnRate * dt);
              b.vx = Math.cos(newAngle) * b.speed;
              b.vy = Math.sin(newAngle) * b.speed;
            }
          } else if (b.type === 'cluster_missile') {
            if (!b.target || b.target.dead) {
              b.target = this.findNearestEnemy(550);
            }
            if (b.target) {
              const targetAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
              const currentAngle = Math.atan2(b.vy, b.vx);
              let diff = targetAngle - currentAngle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              const newAngle = currentAngle + diff * Math.min(1, 10.5 * dt);
              b.vx = Math.cos(newAngle) * b.speed;
              b.vy = Math.sin(newAngle) * b.speed;
            }
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Check bullet collision with enemies
          let hit = false;
          for (const e of this.enemies) {
            if (Vec.dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
              if (b.type === 'missile') {
                // Missile AOE explosion
                this.sound.playExplosion(b.isLevel5 ? 'large' : 'small');
                this.screenShake = Math.max(this.screenShake, b.isLevel5 ? 8 : 3.5);
                this.shockwaves.push({
                  x: b.x,
                  y: b.y,
                  radius: 8,
                  maxRadius: b.explosionRadius,
                  alpha: 1,
                  color: b.isLevel5 ? '#00f3ff' : '#ff007f'
                });

                // Lv.5 Graviton vortex pull: draws all nearby enemies within 1.25x radius inward before blast
                if (b.isLevel5) {
                  const pullRad = b.explosionRadius * 1.25;
                  const pullRadSq = pullRad * pullRad;
                  for (const pe of this.enemies) {
                    const pdx = b.x - pe.x;
                    const pdy = b.y - pe.y;
                    const pdistSq = pdx * pdx + pdy * pdy;
                    if (pdistSq > 0 && pdistSq <= pullRadSq) {
                      const pdist = Math.sqrt(pdistSq);
                      const pullForce = (1 - pdist / pullRad) * 280;
                      pe.vx += (pdx / pdist) * pullForce;
                      pe.vy += (pdy / pdist) * pullForce;
                    }
                  }
                }

                // AoE damage and crowd control
                const rSq = b.explosionRadius * b.explosionRadius;
                for (const ae of this.enemies) {
                  const edx = ae.x - b.x;
                  const edy = ae.y - b.y;
                  const distSq = edx * edx + edy * edy;
                  if (distSq <= rSq) {
                    this.dealDamage(ae, b.damage, 'missile');
                    if (b.hasCc) {
                      ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                      const dist = Math.sqrt(distSq) || 1;
                      const kbForce = b.isLevel5 ? 320 : 240;
                      ae.vx += (edx / dist) * kbForce;
                      ae.vy += (edy / dist) * kbForce;
                    }
                  }
                }

                // Spawn cluster bomblets (Lv.4 -> 2 bomblets, Lv.5 -> 3 bomblets)
                if (b.clusterCount > 0) {
                  const clusterDmg = b.damage * (b.isLevel5 ? 0.65 : 0.50);
                  const clusterRad = (55 + (b.isLevel5 ? 20 : 0)) * this.player.areaMultiplier;
                  for (let k = 0; k < b.clusterCount; k++) {
                    const cAngle = Math.random() * Math.PI * 2;
                    const cSpeed = 260 + Math.random() * 140;
                    this.bullets.push({
                      type: 'cluster_missile',
                      x: b.x,
                      y: b.y,
                      vx: Math.cos(cAngle) * cSpeed,
                      vy: Math.sin(cAngle) * cSpeed,
                      radius: 4 * this.player.areaMultiplier,
                      speed: 460,
                      damage: clusterDmg,
                      target: this.findNearestEnemy(600),
                      explosionRadius: clusterRad,
                      hasCc: b.hasCc,
                      slowDuration: b.slowDuration * 0.75,
                      isLevel5: b.isLevel5,
                      life: 0.65 + Math.random() * 0.45,
                      color: b.isLevel5 ? '#ffea00' : '#ff66cc'
                    });
                  }
                }

                hit = true;
                break;
              } else if (b.type === 'cluster_missile') {
                this.sound.playExplosion('small');
                this.shockwaves.push({
                  x: b.x,
                  y: b.y,
                  radius: 4,
                  maxRadius: b.explosionRadius,
                  alpha: 0.85,
                  color: b.isLevel5 ? '#ffea00' : '#ff66cc'
                });
                const rSq = b.explosionRadius * b.explosionRadius;
                for (const ae of this.enemies) {
                  const edx = ae.x - b.x;
                  const edy = ae.y - b.y;
                  if (edx * edx + edy * edy <= rSq) {
                    this.dealDamage(ae, b.damage, 'missile');
                    if (b.hasCc && b.slowDuration) {
                      ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                    }
                  }
                }
                hit = true;
                break;
              } else {
                this.dealDamage(e, b.damage, b.type === 'blaster' ? 'blaster' : 'combat',
                  false, this.lanCoop?.allies?.get?.(b.ownerId || b.owner) ||
                    (this.lanCoop?.allies?.get(b.owner) ||
                      (b.owner === 'guest' && this.lanCoop?.ally ? this.lanCoop.ally : this.player)));
                if (b.isPlasmaExplosion) {
                  this.shockwaves.push({
                    x: b.x,
                    y: b.y,
                    radius: 4,
                    maxRadius: b.explosionRadius,
                    alpha: 0.85,
                    color: '#ffaa00'
                  });
                  const pRadSq = b.explosionRadius * b.explosionRadius;
                  for (const pe of this.enemies) {
                    if (pe === e) continue;
                    const pdx = pe.x - b.x;
                    const pdy = pe.y - b.y;
                    if (pdx * pdx + pdy * pdy <= pRadSq) {
                      this.dealDamage(pe, b.damage * 0.65, 'blaster');
                      pe.vx += Math.sign(pdx || 1) * 160;
                      pe.vy += Math.sign(pdy || 1) * 160;
                    }
                  }
                }
                if (b.pierce) {
                  b.pierce--;
                  if (b.pierce <= 0) hit = true;
                } else {
                  hit = true;
                }
                break;
              }
            }
          }

          if (hit) {
            this.bullets.splice(i, 1);
          }
        }
      }

      updateEnemyProjectiles(dt) {
        // --- Update Enemy Projectiles ---
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
          const eb = this.enemyBullets[i];
          eb.life -= dt;
          eb.x += eb.vx * dt;
          eb.y += eb.vy * dt;

          if (eb.life <= 0) {
            this.enemyBullets.splice(i, 1);
            continue;
          }

          if (this.player.invulnTimer <= 0 && Vec.dist(eb.x, eb.y, this.player.x, this.player.y) < eb.radius + this.player.radius) {
            this.hitPlayer(eb.damage);
            this.enemyBullets.splice(i, 1);
          }
        }
      }
    });
