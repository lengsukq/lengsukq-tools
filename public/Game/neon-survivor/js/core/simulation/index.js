    /* Main simulation update: one ordered pass over the world.
     *
     * The phases below run in the exact order the original monolithic update()
     * ran them, because they are not independent: spawning feeds enemies,
     * weapons fire at those enemies, and the camera follows the result. Each
     * phase lives in core/simulation/*.js.
     */
    NeonCore.define(NeonSurvivorGame, class {
      update(dt) {
        if (this.state !== 'playing') return;
        if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) dt = 0.016;

        // 玩家坐标与速度自愈防脱离/NaN
        if (!Number.isFinite(this.player.x) || !Number.isFinite(this.player.y)) {
          this.player.x = 0;
          this.player.y = 0;
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.isDashing = false;
        }
        if (!Number.isFinite(this.player.vx)) this.player.vx = 0;
        if (!Number.isFinite(this.player.vy)) this.player.vy = 0;

        // --- World population and ship hooks ---
        this.survivalTime += dt;
        this.dispatchPilotTicks(dt);
        this.updateSpawning(dt);
        window.NeonLanEncounters?.scaleNewEnemies(this);
        if (this.endlessMode) window.NeonRogueEndless?.update(this, dt);

        // --- Pilot state ---
        this.applyPassiveRegen(dt);
        this.decayScreenShake(dt);
        this.tickPlayerInvulnerability(dt);
        this.updateDashAndMovement(dt);
        this.updateAntiAfk(dt);
        this.updateAegis(dt);
        this.updateAutoAim(dt);
        this.updateCamera(dt);

        // --- Weapons and their persistent effects ---
        this.updateWeapons(dt);
        this.updateLaserBeams(dt);
        this.updateCompanionDrones(dt);
        this.updateBlackHoles(dt);
        this.updateCryoMines(dt);
        this.updateDashTrails(dt);

        // --- Projectiles and enemies ---
        this.updateBullets(dt);
        this.updateEnemyProjectiles(dt);
        this.updateEnemies(dt);
        this.updateLightningTetherDamage(dt);

        // --- Pickups and presentation ---
        this.updateGems(dt);
        this.updateShockwaves(dt);
        this.updateParticles(dt);
        this.updateFloatingTexts(dt);

        // Periodically compact gems to avoid excessive array count
        this.cleanAndCompactGems();
        this.updateHUD();
      }
    });
