    /* Elite and boss art.
     *
     * Every elite and every boss in the game is drawn from here, so the whole
     * "this enemy matters" language lives in one place instead of being spread
     * through renderEnemies' per-type if/else chain.
     *
     * Design rules, learned from how the rest of render/ works:
     *   - No gradients. Nothing else in the codebase creates one, and several
     *     test canvas stubs return undefined for createRadialGradient, so
     *     layered translucent discs do the same job with plain primitives.
     *   - ctx arrives as an argument, never through this.ctx: renderEnemies is
     *     called with a canvas that the caller supplies, and the tests rely on
     *     that (ui-labels builds a game object with no ctx property at all).
     *   - Only universally stubbed primitives. ui-labels pins a fixed method
     *     list, so strokeRect and friends are off limits; rectangles are drawn
     *     as explicit paths.
     *   - No new wire fields. A guest paints from the replicated enemy layer
     *     (x/y/vx/vy/hp/maxHp/radius/color/type/isBoss/isElite/hasShield/arming/
     *     aimTimer/coopCapture/coopExposed) plus its own view state, so every
     *     boss below is a pure function of those.
     *   - Shadows only through shadowEnabled(), which low-effects mode and the
     *     adaptive quality ladder both switch off.
     *   - Time comes from this.survivalTime, which the guest view also carries,
     *     so host and guest animation stay in sync.
     *
     * The entry points are renderEliteAura (any e.isElite), renderBossBody
     * (any e.isBoss, dispatched by type) and paintBossChassis — all called from
     * core/render/world.js with the ctx it is already drawing into.
     */
    NeonCore.define(NeonSurvivorGame, class {
      /** True when the adaptive ladder has taken shadow blur away.
       *
       *  Guarded because renderEnemies is also driven from smoke tests that load
       *  a subset of the core (ui-labels never loads render/index.js), and the
       *  cheap path there is the same field shadowEnabled() reads.
       */
      _artShadowOff() {
        const enabled = typeof this.shadowEnabled === 'function'
          ? this.shadowEnabled() : this.fxShadow !== false;
        return !enabled;
      }

      /** A soft halo built from concentric translucent discs.
       *
       * Stands in for a radial gradient: cheap, and every canvas in the tests
       * supports it. `steps` is the quality knob — the callers drop it when
       * blur is unavailable, which is the same signal the ladder uses.
       */
      paintGlow(ctx, x, y, radius, color, alpha = 0.16, steps = 4) {
        if (steps <= 0 || radius <= 0) return;
        ctx.save();
        for (let i = steps; i >= 1; i--) {
          const t = i / steps;
          ctx.globalAlpha = alpha * (1 - t) + alpha * 0.35;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, radius * t, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      /** A dashed ring whose dash gap marches with time. */
      paintDashRing(ctx, x, y, radius, color, width, dash, spin, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha ?? 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.lineDashOffset = -spin;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      /** A rectangle drawn as an explicit path.
       *
       *  fillRect is available everywhere, but strokeRect is not in the
       *  ui-labels stub's method list, so a stroked rect has to be a path.
       */
      paintRect(ctx, x, y, w, h, fill, stroke, width) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width || 1; ctx.stroke(); }
      }

      /** The shared boss chassis: threat rings and a status readout.
       *
       * Draws around the CURRENT transform origin — renderEnemies has already
       * translated to the boss — so only `e`'s replicated state is read.
       * `scale` is the boss's own radius, so a 46px nexus and a 54px devourer
       * read as one family. Returns the health fraction for callers that want
       * to tint their own core.
       */
      paintBossChassis(ctx, e, scale) {
        const t = this.survivalTime;
        const hpFrac = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 1;
        // Outer threat ring: turns red as the boss dies, so "this one is nearly
        // down" is readable without looking at the health bar.
        const danger = 1 - hpFrac;
        const ringColor = danger > 0.6 ? '#ff3b3b' : e.color;
        this.paintDashRing(ctx, 0, 0, scale * 1.55, ringColor, 2.5, [12, 10], t * 26,
          0.55 + danger * 0.35);
        // Counter-rotating inner ring: sells "alive" even while it idles.
        this.paintDashRing(ctx, 0, 0, scale * 1.3, '#ffffff', 1.6, [4, 9], -t * 40, 0.35);

        // Shield state reads on the chassis, not only inside each archetype,
        // because three of the four boss families gate damage behind it.
        if (e.hasShield) {
          this.paintDashRing(ctx, 0, 0, scale * 1.42, '#00f3ff', 3, [16, 8], t * 55, 0.9);
        }
        if ((e.coopExposed || 0) > 0) {
          // The exposed core is the window where damage actually lands: mark it
          // with a bright, fast, unmistakable pulse.
          const pulse = 0.55 + Math.sin(t * 14) * 0.3;
          this.paintDashRing(ctx, 0, 0, scale * 1.34, '#9dfff3', 3.5, [3, 6], t * 90, pulse);
        }
        return hpFrac;
      }

      /** Segmented health bar + frame, above the boss, at the current origin. */
      paintBossHealthBar(ctx, e, scale) {
        const w = scale * 2.6;
        const h = 6;
        const top = -scale - 22;
        const frac = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 1;
        ctx.save();
        this.paintRect(ctx, -w / 2 - 1.5, top - 1.5, w + 3, h + 3, 'rgba(0, 0, 0, 0.72)', null);
        // Drain bed
        ctx.fillStyle = 'rgba(255, 60, 90, 0.28)';
        ctx.fillRect(-w / 2, top, w, h);
        // Live health, colour-stepped so the last third is alarming.
        ctx.fillStyle = frac > 0.6 ? '#39ff9a' : frac > 0.3 ? '#ffd166' : '#ff4d6d';
        ctx.fillRect(-w / 2, top, w * frac, h);
        // Segment ticks every 25% make chip damage legible at a glance.
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const x = -w / 2 + (w * i) / 4;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, top + h);
          ctx.stroke();
        }
        ctx.restore();
      }

      /** Colour-washed overlay used to telegraph an invulnerable phase.
       *
       *  `accent` is the boss's own colour so the wash reads as part of the
       *  entity rather than a generic UI flash. Origin-relative, like the rest.
       */
      paintBossShieldWash(ctx, e, scale, accent, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, scale * 1.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /** Type-specific elite plating, drawn over the base body.
       *
       *  An elite is not just a normal enemy with a ring: its silhouette changes
       *  so it is identifiable mid-fight even while the aura is lost in effects.
       *  Returns false for types that carry no extra plating.
       *
       *  The directional types rotate to their own heading here, inside their own
       *  save/restore, because world.js restores the transform after drawing a
       *  body — so nothing downstream (aura, HP bar, badge text) inherits a
       *  rotation and renders mirrored.
       */
      renderEliteBody(ctx, e) {
        const R = e.radius || 18;
        const gold = '#ffd700';
        switch (e.type) {
          case 'charger': {
            ctx.save();
            ctx.rotate(Math.atan2(e.vy, e.vx));
            // Reinforced ram prow + twin afterburner streaks.
            ctx.strokeStyle = gold;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(R * 1.4, 0);
            ctx.lineTo(R * 0.35, 0);
            ctx.stroke();
            ctx.fillStyle = gold;
            ctx.beginPath();
            ctx.arc(R * 1.4, 0, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.55)';
            ctx.fillRect(-R * 2.0, -R * 0.5, R * 0.8, R * 0.2);
            ctx.fillRect(-R * 2.0, R * 0.3, R * 0.8, R * 0.2);
            ctx.restore();
            return true;
          }
          case 'sniper': {
            ctx.save();
            ctx.rotate(Math.atan2(this.player.y - e.y, this.player.x - e.x));
            // Extended rail barrel with a gold muzzle, plus a sight post.
            ctx.fillStyle = gold;
            ctx.fillRect(R * 1.4, -1.4, R * 0.85, 2.8);
            ctx.beginPath();
            ctx.arc(R * 2.25, 0, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = gold;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(R * 0.2, -R * 0.8);
            ctx.lineTo(R * 0.2, -R * 1.35);
            ctx.stroke();
            ctx.restore();
            return true;
          }
          case 'shield_pylon': {
            // Triple-band sentry dome, so the projector reads as fortified.
            ctx.strokeStyle = 'rgba(255, 234, 0, 0.9)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.arc(0, 0, R * (1.35 + i * 0.5) + Math.sin(this.survivalTime * 2 + i) * 2,
                0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.fillStyle = gold;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();
            return true;
          }
          default:
            return false;
        }
      }

      /** The elite signature: a gold double halo, chevrons and a crown badge.
       *
       *  Elites used to be identified by a lone dashed circle and 9px text. This
       *  gives them a silhouette that survives a busy screen: two counter-rotating
       *  gold rings, four marching chevrons, a breathing core glow, and a badge
       *  with a plate behind it so it stays readable over bright projectiles.
       *
       *  Called after the enemy body is drawn, with the ctx already translated
       *  to the enemy. Emits exactly ONE fillText — ui-labels asserts the elite
       *  badge is the only text an elite produces.
       */
      renderEliteAura(ctx, e) {
        const t = this.survivalTime;
        const r = e.radius || 18;
        const lowFx = this._artShadowOff();
        ctx.save();

        // Breathing core glow — first thing that reads at small sizes.
        this.paintGlow(ctx, 0, 0, r + 11, '#ffd700', lowFx ? 0 : 0.13, lowFx ? 2 : 4);

        // Two counter-rotating dashed rings: outer slow, inner fast.
        this.paintDashRing(ctx, 0, 0, r + 7, '#ffd700', 2.2, [7, 5], t * 30, 0.95);
        this.paintDashRing(ctx, 0, 0, r + 3.5, '#fff3b0', 1.4, [3, 7], -t * 55, 0.7);

        // Four chevrons marching around the rim, pointing outward.
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 4; i++) {
          const a = t * 1.6 + (i / 4) * Math.PI * 2;
          ctx.save();
          ctx.translate(Math.cos(a) * (r + 11), Math.sin(a) * (r + 11));
          ctx.rotate(a);
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(4.5, 0);
          ctx.lineTo(-2.5, -3.4);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-2.5, 3.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Crown badge on a dark plate so it never washes out. Sits clear above
        // the HP bar at -r-22 (world.js), which is why it starts at -r-27.
        const bw = 30, bh = 12, by = -r - 30;
        this.paintRect(ctx, -bw / 2, by - bh + 3, bw, bh, 'rgba(20, 16, 0, 0.75)', '#ffd700', 1);
        ctx.fillStyle = '#ffe066';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★精英', 0, by);
        ctx.restore();
      }
    });
