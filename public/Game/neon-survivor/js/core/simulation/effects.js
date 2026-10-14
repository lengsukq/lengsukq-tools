    /* World effects: black holes, mines, trails, tethers, shockwaves, particles, text. */
    NeonCore.define(NeonSurvivorGame, class {
      updateLaserBeams(dt) {
        // --- Update Laser Beams ---
        for (let i = this.laserBeams.length - 1; i >= 0; i--) {
          const lb = this.laserBeams[i];
          lb.life -= dt;
          if (lb.life <= 0) {
            this.laserBeams.splice(i, 1);
          }
        }
      }

      updateBlackHoles(dt) {
        // --- Update Black Holes ---
        for (let i = this.blackHoles.length - 1; i >= 0; i--) {
          const bh = this.blackHoles[i];
          bh.life -= dt;
          bh.rotAngle += 4.5 * dt;
          bh.pulseTimer += dt;

          const rSq = bh.radius * bh.radius;
          for (const e of this.enemies) {
            const edx = bh.x - e.x;
            const edy = bh.y - e.y;
            const dSq = edx * edx + edy * edy;
            if (dSq < rSq && dSq > 16) {
              const d = Math.sqrt(dSq);
              const pull = Math.min(320, (1 - d / bh.radius) * 480);
              e.x += (edx / d) * pull * dt;
              e.y += (edy / d) * pull * dt;
            }
          }

          if (bh.pulseTimer >= 0.3) {
            bh.pulseTimer = 0;
            for (const e of this.enemies) {
              const edx = bh.x - e.x;
              const edy = bh.y - e.y;
              if (edx * edx + edy * edy < rSq) {
                this.dealDamage(e, bh.damage * 0.45);
              }
            }
          }

          if (bh.life <= 0) {
            this.sound.playExplosion('large');
            this.screenShake = 12;
            this.shockwaves.push({
              x: bh.x,
              y: bh.y,
              radius: 10,
              maxRadius: bh.radius * 1.15,
              alpha: 1,
              color: '#9d00ff'
            });
            for (const e of this.enemies) {
              const edx = bh.x - e.x;
              const edy = bh.y - e.y;
              if (edx * edx + edy * edy < rSq) {
                this.dealDamage(e, bh.damage * 2.5);
              }
            }
            this.blackHoles.splice(i, 1);
          }
        }
      }

      updateCryoMines(dt) {
        // --- Update Cryo Mines ---
        for (let i = this.mines.length - 1; i >= 0; i--) {
          const m = this.mines[i];
          m.life -= dt;
          m.armTimer -= dt;
          let triggered = m.life <= 0;

          if (m.armTimer <= 0 && !triggered) {
            for (const e of this.enemies) {
              const mdx = e.x - m.x;
              const mdy = e.y - m.y;
              if (mdx * mdx + mdy * mdy < (m.radius + e.radius) * (m.radius + e.radius)) {
                triggered = true;
                break;
              }
            }
          }

          if (triggered) {
            this.sound.playFreeze();
            this.shockwaves.push({
              x: m.x,
              y: m.y,
              radius: 10,
              maxRadius: m.blastRadius,
              alpha: 1,
              color: '#00f3ff'
            });
            const bSq = m.blastRadius * m.blastRadius;
            for (const e of this.enemies) {
              const mdx = e.x - m.x;
              const mdy = e.y - m.y;
              if (mdx * mdx + mdy * mdy < bSq) {
                this.dealDamage(e, m.damage, 'cryo');
                e.freezeTimer = 3.0; // 50% slow
              }
            }
            this.mines.splice(i, 1);
          }
        }
      }

      updateDashTrails(dt) {
        // --- Update Plasma Dash Trails (Warp Laser Wall) ---
        for (let i = this.dashTrails.length - 1; i >= 0; i--) {
          const dtTrail = this.dashTrails[i];
          dtTrail.life -= dt;
          for (const e of this.enemies) {
            const dx = e.x - dtTrail.x1;
            const dy = e.y - dtTrail.y1;
            const tdx = dtTrail.x2 - dtTrail.x1;
            const tdy = dtTrail.y2 - dtTrail.y1;
            const lenSq = tdx * tdx + tdy * tdy;
            if (lenSq > 1) {
              const segT = Math.max(0, Math.min(1, (dx * tdx + dy * tdy) / lenSq));
              const px = dtTrail.x1 + segT * tdx;
              const py = dtTrail.y1 + segT * tdy;
              if (Vec.dist(e.x, e.y, px, py) < 22 + e.radius) {
                this.dealDamage(e, dtTrail.damage * dt * 4, 'fire'); // Continuous plasma burning tick
              }
            }
          }
          if (dtTrail.life <= 0) {
            this.dashTrails.splice(i, 1);
          }
        }
      }

      updateLightningTetherDamage(dt) {
        // --- Lightning Tether Damage to Player ---
        if (!this.player.downed && this.player.invulnTimer <= 0 &&
            this.lightningTethers.length > 0) {
          for (const lt of this.lightningTethers) {
            const ldx = lt.x2 - lt.x1;
            const ldy = lt.y2 - lt.y1;
            const lenSq = ldx * ldx + ldy * ldy;
            if (lenSq > 1) {
              const segT = Math.max(0, Math.min(1, ((this.player.x - lt.x1) * ldx + (this.player.y - lt.y1) * ldy) / lenSq));
              const projX = lt.x1 + segT * ldx;
              const projY = lt.y1 + segT * ldy;
              if (Vec.dist(this.player.x, this.player.y, projX, projY) < 16 + this.player.radius) {
                this.hitPlayer(25 * dt * 4); // Continuous electric shock
                break;
              }
            }
          }
        }
      }

      updateShockwaves(dt) {
        // --- Update Shockwaves ---
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
          const sw = this.shockwaves[i];
          sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, 14 * dt);
          sw.alpha -= dt * 1.8;
          if (sw.alpha <= 0 || sw.radius >= sw.maxRadius - 2) {
            this.shockwaves.splice(i, 1);
          }
        }
      }

      updateParticles(dt) {
        // --- Update Particles ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.life -= dt;
          if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
          }
          if (p.type === 'spark') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
          }
        }
      }

      updateFloatingTexts(dt) {
        // --- Update Floating Combat Text ---
        for (let i = this.texts.length - 1; i >= 0; i--) {
          const t = this.texts[i];
          t.life -= dt;
          t.y -= dt * 35;
          if (t.life <= 0) {
            this.texts.splice(i, 1);
          }
        }
      }
    });
