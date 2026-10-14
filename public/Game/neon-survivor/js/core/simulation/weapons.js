    /* Weapon timers, beams and companion drones. */
    NeonCore.define(NeonSurvivorGame, class {
      updateWeapons(dt) {
        // --- Weapon Timers & Firing ---
        const weapons = this.player.downed ? {} : this.player.weapons;
        if (!this.player.downed) window.NeonLegendaryArsenal?.update(this, dt);
        // Class-specific weapon and mana ticks are dispatched once through
        // NeonShips.onTick above for EVERY registered pilot. Never duplicate.
        window.NeonAstra?.tickShields(this, dt);
        // Celestial Ward Continuous Holy Burn DoT in live combat (batched 0.20s pulse)
        if (!this.player.downed && this.player.shipId === 'astra') {
          const astraState = this.player.astra;
          if (astraState && astraState.wardActive) {
            astraState.wardBurnTimer = (astraState.wardBurnTimer || 0) + dt;
            if (astraState.wardBurnTimer >= 0.20) {
              const burnInterval = astraState.wardBurnTimer;
              astraState.wardBurnTimer = 0;
              const wardR = 160 * (window.NeonAstraArsenal?.modifiers(this.player)?.areaFactor || 1);
              const wardScale = window.NeonAstra?.attackScale?.(this.player) || (this.player.dmgMultiplier || 1);
              const dotDmg = (35 + (this.player.level || 1) * 4.5) * burnInterval * wardScale;
              const wx = Number.isFinite(astraState.wardX) ? astraState.wardX : this.player.x;
              const wy = Number.isFinite(astraState.wardY) ? astraState.wardY : this.player.y;
              for (const e of this.enemies) {
                if (!e || e.dead || e.hp <= 0 || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
                if (Vec.dist(wx, wy, e.x, e.y) <= wardR) {
                  this.dealDamage(e, dotDmg, 'astra_ward_burn', false, this.player);
                }
              }
            }
          } else if (astraState) {
            astraState.wardBurnTimer = 0;
          }
        }
        // All pilots now share one firing pipeline; timers belong to the
        // pilot, while effects/kill accounting remain authoritative on game.
        window.NeonWeaponSystem?.update(this, this.player, dt);

        // 5. Orbiters Update
        if (!this.player.downed && this.orbiters.length > 0) {
          const rotSpeed = 3.2 + (weapons.orbit || 1) * 0.5;
          this.orbiters.forEach((orb) => {
            orb.angle += rotSpeed * dt;
            const ox = this.player.x + Math.cos(orb.angle) * orb.distance;
            const oy = this.player.y + Math.sin(orb.angle) * orb.distance;

            // Orbiter collision check
            for (const e of this.enemies) {
              if (Vec.dist(ox, oy, e.x, e.y) < orb.radius + e.radius) {
                this.dealDamage(e, orb.damage * dt * 4, 'orbit'); // Continuous cutting damage
              }
            }
          });
        }

        // 7. Companion Drones
        if (weapons.drones && this.companionDrones.length === 0) {
          this.syncDrones();
        }
      }

      updateCompanionDrones(dt) {
        // --- Update Companion Drones ---
        if (!this.player.downed && this.companionDrones.length > 0) {
          this.companionDrones.forEach((dr) => {
            dr.angle += 2.4 * dt;
            dr.shootTimer += dt;
            const dx = this.player.x + Math.cos(dr.angle) * dr.orbitDist;
            const dy = this.player.y + Math.sin(dr.angle) * dr.orbitDist;
            dr.x = dx;
            dr.y = dy;

            if (dr.shootTimer >= dr.shootInterval) {
              dr.shootTimer = 0;
              const target = this.findNearestEnemy(550);
              if (target) {
                const a = Math.atan2(target.y - dy, target.x - dx);
                this.sound.playLaser(920, 'triangle');
                this.bullets.push({
                  x: dx,
                  y: dy,
                  vx: Math.cos(a) * 900,
                  vy: Math.sin(a) * 900,
                  radius: 3.5,
                  damage: dr.damage,
                  color: '#00ffaa',
                  life: 0.8
                });
              }
            }
          });
        }
      }
    });
