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
              const wardRSq = wardR * wardR;
              for (const e of this.enemies) {
                if (!e || e.dead || e.hp <= 0 || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
                if (Vec.distSq(wx, wy, e.x, e.y) <= wardRSq) {
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
        this.updateOrbiters(dt);
      }

      /** Every pilot the host simulates: itself plus each registered ally.
       *
       *  A remote pilot has no client running the world, so anything that is
       *  simulated "per pilot" has to be driven from here or it simply never
       *  happens -- which is why a guest's drone and orbiter weapons used to be
       *  invisible and harmless to everyone.
       */
      combatPilots() {
        const entries = this.players?.list?.();
        if (!Array.isArray(entries) || entries.length === 0) return [this.player];
        const pilots = [];
        for (const entry of entries) {
          if (entry?.state) pilots.push(entry.state);
        }
        return pilots.length > 0 ? pilots : [this.player];
      }

      updateOrbiters(dt) {
        for (const pilot of this.combatPilots()) {
          // Built lazily, for every pilot: the host has to build an ally's
          // orbiters too, because the ally's own client never runs this.
          if (pilot.weapons?.orbit && (pilot.orbiters?.length || 0) === 0) {
            this.syncOrbiters(pilot);
          }
          const list = pilot.orbiters;
          if (pilot.downed || !Array.isArray(list) || list.length === 0) continue;
          const rotSpeed = 3.2 + (pilot.weapons?.orbit || 1) * 0.5;
          for (const orb of list) {
            orb.angle += rotSpeed * dt;
            // The orbit centre is part of the entity, not something a renderer
            // may infer from "the ship I happen to be drawing". A guest drawing
            // the host's orbiters around its OWN ship was exactly the bug the
            // render-parity test caught.
            orb.centerX = pilot.x;
            orb.centerY = pilot.y;
            const ox = orb.centerX + Math.cos(orb.angle) * orb.distance;
            const oy = orb.centerY + Math.sin(orb.angle) * orb.distance;

            // Orbiter collision check
            for (const e of this.enemies) {
              const cut = orb.radius + e.radius;
              if (Vec.distSq(ox, oy, e.x, e.y) < cut * cut) {
                this.dealDamage(e, orb.damage * dt * 4, 'orbit'); // Continuous cutting damage
              }
            }
          }
        }
      }

      updateCompanionDrones(dt) {
        // --- Update Companion Drones ---
        for (const pilot of this.combatPilots()) {
          // Same laziness as the orbiters, and the same reason.
          if (pilot.weapons?.drones && (pilot.companionDrones?.length || 0) === 0) {
            this.syncDrones(pilot);
          }
          const list = pilot.companionDrones;
          if (pilot.downed || !Array.isArray(list) || list.length === 0) continue;
          list.forEach((dr) => {
            dr.angle += 2.4 * dt;
            dr.shootTimer += dt;
            const dx = pilot.x + Math.cos(dr.angle) * dr.orbitDist;
            const dy = pilot.y + Math.sin(dr.angle) * dr.orbitDist;
            dr.x = dx;
            dr.y = dy;

            if (dr.shootTimer >= dr.shootInterval) {
              dr.shootTimer = 0;
              // Search from the DRONE, not from the local player: an ally's
              // drone must shoot at what is near the ally.
              const target = this.findNearestEnemy(550, { x: dx, y: dy });
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
        this.refreshPilotEntities();
      }

      /** game.orbiters / game.companionDrones are the AGGREGATE of every pilot's
       *  own list, by reference. The renderer and the snapshot both read them, so
       *  neither has to know whose weapon it is drawing. Called once per tick,
       *  after the per-pilot weapon phases have run. */
      refreshPilotEntities() {
        const drones = [];
        const orbiters = [];
        for (const pilot of this.combatPilots()) {
          if (Array.isArray(pilot.companionDrones)) drones.push(...pilot.companionDrones);
          if (Array.isArray(pilot.orbiters)) orbiters.push(...pilot.orbiters);
        }
        this.companionDrones = drones;
        this.orbiters = orbiters;
      }
    });
