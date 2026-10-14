    /* Pilot state: recovery, dash movement, aegis, aiming and camera. */
    NeonCore.define(NeonSurvivorGame, class {
      dispatchPilotTicks(dt) {
        // A playable ship runs the same registered hook regardless of pilot
        // identity. This scales to additional ships/teammates without adding
        // character-specific branches to the world loop.
        if (window.NeonShips?.runAbility) {
          const pilots = this.players?.list?.() || [{ id: 'host', state: this.player }];
          for (const { state: pilot } of pilots) {
            if (pilot.hp > 0 && !pilot.downed) window.NeonShips.runAbility(pilot, 'onTick', this, dt);
          }
        }
      }

      applyPassiveRegen(dt) {
        // Player Passive Regen
        if (!this.player.downed && this.player.regen > 0 && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen * dt);
        }
      }

      decayScreenShake(dt) {
        // Screen Shake decay
        if (this.screenShake > 0) {
          this.screenShake = Math.max(0, this.screenShake - dt * 25);
          this.screenShakeAngle = Math.random() * Math.PI * 2;
        }
      }

      tickPlayerInvulnerability(dt) {
        // Invulnerability
        if (this.player.invulnTimer > 0) {
          this.combatTelemetry.invulnerableSeconds += Math.min(dt, this.player.invulnTimer);
          this.player.invulnTimer -= dt;
        }
        if (this.player.lastSlashFx && this.player.lastSlashFx.life > 0) {
          this.player.lastSlashFx.life = Math.max(0, this.player.lastSlashFx.life - dt);
        }
        if (this.player.riftSurgeTimer > 0) {
          this.player.riftSurgeTimer = Math.max(0, this.player.riftSurgeTimer - dt);
        }
      }

      updateDashAndMovement(dt) {
        // Dash 3-Charge Recharge System
        if (this.player.shipId === 'phantom') {
          const ghost = window.NeonPhantom?.state(this.player);
          if (ghost) {
            this.player.maxDashCharges = Math.min(3, 2 + (ghost.warpUpgrades.charge_overflow || 0));
            this.player.dashCharges = ghost.dashCharges;
            this.player.dashRechargeTimer = ghost.dashRecharge;
          }
        }
        if (this.player.shipId === 'riftblade' && this.player.dashCharges < this.player.maxDashCharges) {
          this.player.dashRechargeTimer += dt;
          const targetRecharge = this.getEffectiveDashRecharge();
          if (this.player.dashRechargeTimer >= targetRecharge) {
            this.player.dashRechargeTimer = 0;
            this.player.dashCharges++;
          }
        } else if (this.player.shipId === 'riftblade') {
          this.player.dashRechargeTimer = 0;
        }

        if (this.player.downed) {
          // Keep simulating enemies, projectiles and the surviving teammate,
          // but a wreck may not steer, dash, heal or perform weapon attacks.
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.isDashing = false;
        } else if (this.player.isDashing) {
          this.player.dashTimeLeft -= dt;
          const dashSpeed = this.player.baseSpeed * 3.6;
          const previousDashX = this.player.x;
          const previousDashY = this.player.y;
          this.player.x += this.player.dashDir.x * dashSpeed * dt;
          this.player.y += this.player.dashDir.y * dashSpeed * dt;
          const segmentX = this.player.x - previousDashX;
          const segmentY = this.player.y - previousDashY;
          const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

          // Piercing slash damage to all enemies along the dash path!
          const slashWidth = this.player.radius + (this.player.dashSlashWidth || 18);
          const slashDmg = this.player.dashSlashDmg || Math.round(95 * this.player.dmgMultiplier);

          for (const e of this.enemies) {
            if (!this.player.dashHitEnemies.has(e)) {
              // Swept collision avoids skipping enemies at high dash speed / low FPS.
              const projection = segmentLengthSq > 0
                ? Math.max(0, Math.min(1, ((e.x - previousDashX) * segmentX + (e.y - previousDashY) * segmentY) / segmentLengthSq))
                : 1;
              const hitX = previousDashX + projection * segmentX;
              const hitY = previousDashY + projection * segmentY;
              const dSq = Vec.distSq(hitX, hitY, e.x, e.y);
              const reach = e.radius + slashWidth;
              if (dSq < reach * reach) {
                this.player.dashHitEnemies.add(e);
                const preciseReach = e.radius + Math.max(7, slashWidth * 0.40);
                const precise = dSq < preciseReach * preciseReach;
                if (precise && !this.player.dashPreciseHit) {
                  this.player.dashPreciseHit = true;
                  this.player.dashCombo = Math.min(5, (this.player.dashCombo || 0) + 1);
                  this.player.dashComboUntil = this.survivalTime + 1.20;
                  this.combatTelemetry.preciseDashes++;
                  window.NeonRogueEndless?.onPreciseDash(this, e);
                  this.texts.push({ x: e.x, y: e.y - 30, text: `精准折跃 ×${this.player.dashCombo}`, color: '#00f3ff', size: 15, life: 0.8, maxLife: 0.8 });
                  this.vibrateGamepad(55, 0.25, 0.15);
                }

                // If cryo dash is unlocked:
                if (this.player.hasDashCryo) {
                  e.freezeTimer = this.player.dashCryoDuration || 2.5;
                }

                // Critical, level, and mastery multipliers are each applied once.
                this.dealDamage(e, slashDmg * (precise ? 1 + this.player.dashCombo * 0.08 : 1),
                  'dash', this.player.dashAlwaysCrit);

                this.playCombatSound('dash-impact', () => this.sound.playLaser(780,'triangle'), 2);
                if (this.particles.length < (this.fxLow ? 20 : 60)) {
                  this.particles.push({
                    type: 'spark',
                    x: e.x, y: e.y,
                    vx: this.player.dashDir.x * 220 + (Math.random() - 0.5) * 80,
                    vy: this.player.dashDir.y * 220 + (Math.random() - 0.5) * 80,
                    radius: Math.random() * 2.5 + 1.5,
                    color: this.player.hasFireTrail ? '#ff007f' : '#00f3ff',
                    life: 0.22, maxLife: 0.22
                  });
                }
              }
            }
          }

          // Trail phantom particles & hyper-spatial slash ribbon
          const dashAng = Math.atan2(this.player.dashDir.y, this.player.dashDir.x);
          if (this.player.dashStartX !== undefined) {
            this.player.lastSlashFx = {
              x1: this.player.dashStartX,
              y1: this.player.dashStartY,
              x2: this.player.x,
              y2: this.player.y,
              angle: dashAng,
              life: 0.28,
              maxLife: 0.28,
              fire: Boolean(this.player.hasFireTrail),
              cryo: Boolean(this.player.hasDashCryo),
              precise: Boolean(this.player.dashPreciseHit)
            };
          }
          if (this.particles.length < (this.fxLow ? 20 : 60)) {
            this.particles.push({
              type: 'afterimage',
              x: this.player.x, y: this.player.y,
              angle: dashAng,
              radius: this.player.radius * (this.player.hasFireTrail ? 1.4 : 1.1),
              color: this.player.hasFireTrail ? 'rgba(255, 0, 128, 0.72)' :
                this.player.hasDashCryo ? 'rgba(56, 189, 248, 0.72)' : 'rgba(0, 243, 255, 0.65)',
              life: 0.24, maxLife: 0.24
            });
          }

          if (this.player.dashTimeLeft <= 0) {
            this.player.isDashing = false;
            if (!this.player.dashPreciseHit) {
              this.player.dashCombo = 0;
              this.player.dashComboUntil = 0;
            }

            // Riftblade Assault Surge stance (+30% weapon damage) and landing safety repulsion
            if (!this.player.shipId || this.player.shipId === 'riftblade') {
              this.player.riftSurgeTimer = 2.5;
              for (const e of this.enemies) {
                if (!e.isBoss && !e.isElite && !e.dead) {
                  const bdx = e.x - this.player.x;
                  const bdy = e.y - this.player.y;
                  const distSq = bdx * bdx + bdy * bdy;
                  if (distSq < 48 * 48 && distSq > 0) {
                    const d = Math.sqrt(distSq);
                    e.vx += (bdx / d) * 180;
                    e.vy += (bdy / d) * 180;
                  }
                }
              }
            }

            // Trigger Destination Nova Blast if upgraded!
            if (this.player.hasDashBlast) {
              this.sound.playExplosion('small');
              this.shockwaves.push({
                x: this.player.x,
                y: this.player.y,
                radius: 15,
                maxRadius: this.player.dashBlastRadius,
                alpha: 1.0,
                color: '#ffaa00'
              });
              const bSq = this.player.dashBlastRadius * this.player.dashBlastRadius;
              for (const e of this.enemies) {
                const bdx = e.x - this.player.x;
                const bdy = e.y - this.player.y;
                if (bdx * bdx + bdy * bdy <= bSq) {
                  this.dealDamage(e, this.player.dashBlastDamage);
                  const ang = Math.atan2(bdy, bdx);
                  e.vx += Math.cos(ang) * 350;
                  e.vy += Math.sin(ang) * 350;
                }
              }
            }

            // Drop Persistent Plasma Fire Trail if upgraded!
            if (this.player.hasFireTrail && this.player.dashStartX !== undefined) {
              this.dashTrails.push({
                x1: this.player.dashStartX,
                y1: this.player.dashStartY,
                x2: this.player.x,
                y2: this.player.y,
                damage: this.player.fireTrailDamage,
                life: this.player.fireTrailDuration,
                maxLife: this.player.fireTrailDuration,
                color: '#ff007f'
              });
            }
          }
        } else {
          // Standard Player Movement
          let moveX = 0, moveY = 0;
          if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
          if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
          if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
          if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

          if (this.touch.active) {
            const dx = this.touch.currentX - this.touch.startX;
            const dy = this.touch.currentY - this.touch.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > (window.NeonGameSettings?.get('joystickDeadzone') || 10)) {
              moveX = dx / dist;
              moveY = dy / dist;
            }
          }

          if (this.gamepadMove && (this.gamepadMove.x !== 0 || this.gamepadMove.y !== 0)) {
            moveX = this.gamepadMove.x;
            moveY = this.gamepadMove.y;
          }

          const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
          if (moveLen > 0.05) {
            const normX = moveX / moveLen;
            const normY = moveY / moveLen;
            const spectralExtend = this.player.phantom?.warpUpgrades?.spectral_extend ||
              this.player.dashUpgrades?.spectral_extend || 0;
            const phaseSpeed = this.player.shipId === 'phantom' &&
              this.player.phantom?.shiftActive ? (1.40 + spectralExtend * 0.15) : 1;
            const astraKite = this.player.shipId === 'astra' &&
              ((this.player.astra?.kiteSpeedTimer || 0) > 0) ? 1.5 : 1;
            const phantomSprint = this.player.shipId === 'phantom' &&
              ((this.player.phantom?.sprintTimer || 0) > 0) ? 1.75 : 1;
            const astraTurretAnchor = this.player.shipId === 'astra' &&
              this.player.astra?.wardActive ? 0.20 : 1;
            this.player.vx = normX * this.player.baseSpeed * phaseSpeed * astraKite * phantomSprint * astraTurretAnchor;
            this.player.vy = normY * this.player.baseSpeed * phaseSpeed * astraKite * phantomSprint * astraTurretAnchor;
          } else {
            this.player.vx *= 0.8;
            this.player.vy *= 0.8;
          }

          this.player.x += this.player.vx * dt;
          this.player.y += this.player.vy * dt;
        }
      }

      updateAntiAfk(dt) {
        // Anti-AFK detection: if standing idle in one spot for > 8.5s, spawn pursuers
        const afkMoveDist = Vec.dist(this.player.x, this.player.y, this.lastAfkX || 0, this.lastAfkY || 0);
        if (this.player.downed) {
          this.afkTimer = 0;
        } else if (afkMoveDist > 6) {
          this.afkTimer = 0;
          this.lastAfkX = this.player.x;
          this.lastAfkY = this.player.y;
        } else {
          this.afkTimer = (this.afkTimer || 0) + dt;
          if (this.afkTimer > 8.5) {
            this.afkTimer = 4.5;
            this.spawnAntiAfkPursuers();
          }
        }
      }

      updateAegis(dt) {
        // Update Aegis Aura (时空相位无敌光环)
        if (!this.player.downed && this.player.aegisTimer > 0) {
          this.player.aegisTimer -= dt;
          this.player.aegisPulseTimer = (this.player.aegisPulseTimer || 0) + dt;

          if (this.player.aegisDamage > 0 && this.player.aegisPulseTimer >= 0.05) {
            this.player.aegisPulseTimer = 0;
            const aRadSq = this.player.aegisRadius * this.player.aegisRadius;
            for (const e of this.enemies) {
              const dx = e.x - this.player.x;
              const dy = e.y - this.player.y;
              if (dx * dx + dy * dy <= aRadSq) {
                this.dealDamage(e, this.player.aegisDamage * 0.25);
                const ang = Math.atan2(dy, dx);
                e.vx += Math.cos(ang) * 160;
                e.vy += Math.sin(ang) * 160;
              }
            }
          }

          if (this.player.aegisTimer <= 0 && this.player.hasAegisBurst) {
            this.sound.playLaser(980, 'sawtooth');
            this.screenShake = 12;
            for (let k = 0; k < 8; k++) {
              const bAngle = (k / 8) * Math.PI * 2;
              this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(bAngle) * 880,
                vy: Math.sin(bAngle) * 880,
                radius: 6,
                damage: Math.round(180 * this.player.dmgMultiplier),
                pierce: 3,
                color: '#ffe600',
                life: 1.2
              });
            }
          }
        }
      }

      updateAutoAim(dt) {
        // Always lock onto the nearest enemy. No keyboard, mouse, or gamepad
        // action can disable automatic targeting.
        this.player.autoAim = true;
        if (this.player.downed && this.lanCoop?.ally?.hp > 0) {
          this.player.aimAngle = this.player.aimAngle || 0;
        } else {
          const nearest = this.findNearestEnemy(650);
          if (nearest) {
            this.player.aimAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
          }
        }
      }

      updateCamera(dt) {
        // Camera smoothly follows player
        const livingAlly = (this.lanCoop?.allies?.size || 0) > 1
          ? [...this.lanCoop.allies.values()].find(p =>
            !p.disconnected && p.hp > 0 && !p.downed)
          : this.lanCoop?.ally;
        const cameraTarget = this.player.downed && livingAlly?.hp > 0
          ? livingAlly : this.player;
        this.camera.x += (cameraTarget.x - this.camera.x) * 0.12;
        this.camera.y += (cameraTarget.y - this.camera.y) * 0.12;
        if (!Number.isFinite(this.camera.x) || !Number.isFinite(this.camera.y)) {
          this.camera.x = this.player.x;
          this.camera.y = this.player.y;
        }
      }
    });
