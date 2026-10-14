    /* Canvas frame: camera setup and the ordered draw pass.
     *
     * Draw order is painter's order — later calls paint over earlier ones — so
     * the sequence is behaviour, not style. `ctx` and the `visible` viewport
     * predicate are handed to each layer in core/render/*.js.
     */
    NeonCore.define(NeonSurvivorGame, class {
      render() {
        const ctx = this.ctx;
        ctx.save();
        try {
          ctx.clearRect(0, 0, this.width, this.height);

          // Apply Screen Shake
          let shakeX = 0, shakeY = 0;
          if (this.screenShake > 0) {
            shakeX = Math.cos(this.screenShakeAngle) * this.screenShake;
            shakeY = Math.sin(this.screenShakeAngle) * this.screenShake;
          }

          // Camera Transform (自愈校验：防止 NaN 导致整屏画面消失)
          const camX = Number.isFinite(this.camera.x) ? this.camera.x : (this.player ? this.player.x : 0);
          const camY = Number.isFinite(this.camera.y) ? this.camera.y : (this.player ? this.player.y : 0);
          const zoom = Math.max(0.65, Math.min(1.5, this.cameraZoom || 1));
          const halfWidth = this.width / (2 * zoom);
          const halfHeight = this.height / (2 * zoom);
          // Shared viewport clipping: never skip a visible boss, missile or
          // long-range sniper telegraph, only primitives entirely off-screen.
          const visible = (x, y, radius = 30) =>
            Math.abs(x - camX) <= halfWidth + radius &&
            Math.abs(y - camY) <= halfHeight + radius;
          ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
          ctx.scale(zoom, zoom);
          ctx.translate(-camX, -camY);

        // 1. Draw Cyberpunk Grid
        this.renderCyberGrid(ctx);

        // World layer: pickups, ground effects and enemies.
        this.renderGems(ctx, visible);
        this.renderShockwaves(ctx, visible);
        this.renderParticles(ctx, visible);
        this.renderEnemies(ctx, visible);

        // Effect layer: everything that sits above the world but below fighters.
        this.renderLightningTethers(ctx, visible);
        this.renderBlackHoles(ctx, visible);
        this.renderCryoMines(ctx, visible);
        this.renderLaserBeams(ctx, visible);
        this.renderCompanionDrones(ctx, visible);
        this.renderEnemyBullets(ctx, visible);
        this.renderBullets(ctx, visible);
        this.renderOrbiters(ctx, visible);
        this.renderDashTrails(ctx, visible);
        this.renderSlashFx(ctx, visible);
        this.renderAegisAura(ctx, visible);

        // All participants share this exact fighter renderer.
        const role = this.isGuestWorldView ? 'guest' : 'host';
        const localProfile = window.NeonLanTeammates?.ownProfile(role) ||
          { name: role === 'guest' ? '队友' : '房主', color: this.shipColor || '#00f3ff' };
        window.NeonShips?.drawPilotEffects?.(ctx, this.player, this);
        window.NeonShips?.drawWorldEffects?.(ctx, this);
        this.renderFighter(ctx, this.player, localProfile,
          this.isGuestWorldView || (this.lanCoop?.ally && this.lanCoop.rtc.connected));

        // The remote co-op fighter is drawn in the same world coordinates.
        this.lanCoop?.renderHost(ctx);

        // 10. Draw Floating Combat Text (High-speed batch render)
        this.renderFloatingTexts(ctx, visible);
        } catch (err) {
          console.error("Render non-fatal error caught:", err);
        } finally {
          ctx.restore();
        }
      }
    });
