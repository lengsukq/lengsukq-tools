    /* Solo boss art — the three archetypes the run cycles through in single
     * player: STORM NEXUS, OMEGA CARRIER and SINGULARITY DEVOURER.
     *
     * Each painter draws its boss around the CURRENT transform origin, which
     * renderEnemies has already translated to (e.x, e.y) with the boss shadow
     * configured. That keeps the dispatcher branch in world.js as short as the
     * inline version was while giving each archetype a real identity — rotating
     * armour, orbiting pods, a live threat readout — instead of one filled arc
     * plus a single arc stroke.
     *
     * Every painter is a pure function of this.survivalTime and the replicated
     * enemy fields, so the co-op guest paints the identical boss from its
     * snapshot. ctx is an argument, never this.ctx, because renderEnemies is
     * called with a caller-supplied canvas.
     */
    NeonCore.define(NeonSurvivorGame, class {
      /** BOSS 1 — STORM NEXUS: a captive lightning core inside two
       *  counter-rotating armour rings, with arcing filaments and capacitor
       *  nodes that charge in sequence as a wind-up tell. */
      paintBossNexus(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();

        this.paintGlow(ctx, 0, 0, R * 1.75, '#00f3ff', lowFx ? 0 : 0.15, lowFx ? 2 : 5);

        // Outer armour: 6 slowly rotating plates.
        ctx.save();
        ctx.rotate(t * 0.35);
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.rotate((i / 6) * Math.PI * 2);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(R * 1.02, -R * 0.2);
          ctx.lineTo(R * 1.38, -R * 0.44);
          ctx.lineTo(R * 1.46, 0);
          ctx.lineTo(R * 1.38, R * 0.44);
          ctx.lineTo(R * 1.02, R * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#bffaff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        // Counter-rotating inner cage: three interrupted arcs.
        ctx.save();
        ctx.rotate(-t * 0.9);
        ctx.strokeStyle = 'rgba(190, 250, 255, 0.85)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.82, a, a + Math.PI * 0.55);
          ctx.stroke();
        }
        ctx.restore();

        // Body.
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Captive core: a hot white nucleus with a pulsing cyan shell.
        const pulse = 0.55 + Math.sin(t * 9) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#eaffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
        ctx.stroke();

        // Arcing filaments. A kinked two-segment path reads as a discharge
        // rather than a spoke, which is the whole point of the archetype.
        ctx.strokeStyle = 'rgba(180, 250, 255, 0.8)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const a = -t * 1.5 + (i / 3) * Math.PI * 2;
          const mid = R * 0.75;
          const kink = Math.sin(t * 22 + i * 2.1) * R * 0.18;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42);
          ctx.lineTo(Math.cos(a) * mid - Math.sin(a) * kink,
            Math.sin(a) * mid + Math.cos(a) * kink);
          ctx.lineTo(Math.cos(a) * R * 1.32, Math.sin(a) * R * 1.32);
          ctx.stroke();
        }

        // Capacitor nodes at the filament tips, charging one at a time.
        for (let i = 0; i < 3; i++) {
          const a = -t * 1.5 + (i / 3) * Math.PI * 2;
          const charge = Math.max(0, Math.sin(t * 6 - i * 1.4));
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 + charge * 0.65).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * R * 1.32, Math.sin(a) * R * 1.32, 4.5 + charge * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }

      /** BOSS 2 — OMEGA CARRIER: a hexagonal fortress with a hangar bay, four
       *  turret pods, and a visible forcefield bubble while its shield holds. */
      paintBossCarrier(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();

        this.paintGlow(ctx, 0, 0, R * 1.8, '#ff007f', lowFx ? 0 : 0.14, lowFx ? 2 : 5);
        // Hangar glow behind the hull, so the bay reads as a light source.
        this.paintGlow(ctx, 0, 0, R * 0.6, '#ffe0f0', lowFx ? 0 : 0.22, 3);

        // Hull: three counter-rotating hex plates, outer to inner.
        const hex = (rad, rot, fill, stroke, lw) => {
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 + rot;
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          if (fill) { ctx.fillStyle = fill; ctx.fill(); }
          if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
        };
        hex(R * 1.22, -t * 0.22, 'rgba(255, 0, 127, 0.35)', '#ff7ab8', 2);
        hex(R, t * 0.5, e.color, '#ffffff', 3);
        hex(R * 0.62, -t * 0.85, 'rgba(10, 0, 20, 0.85)', '#ff9ecb', 2);

        // Four turret pods on the diagonals, barrels tracking the player.
        const aim = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + t * 0.3;
          const px = Math.cos(a) * R * 0.95;
          const py = Math.sin(a) * R * 0.95;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(aim);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd9ec';
          ctx.fillRect(4, -1.8, 9, 3.6);
          ctx.restore();
        }

        // Hangar bay: a bright slot with three cycling bay lights.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-R * 0.34, -R * 0.1, R * 0.68, R * 0.2);
        ctx.fillStyle = '#ff2d95';
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = Math.sin(t * 4 + i * 2) > 0 ? 1 : 0.35;
          ctx.beginPath();
          ctx.arc(-R * 0.2 + i * R * 0.2, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Forcefield bubble: hexagonal panes plus a faint lattice, so it reads
        // as a bubble rather than a second hull outline.
        if (e.hasShield) {
          const fr = R * 1.62 + Math.sin(t * 3) * 3;
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = '#00f3ff';
          ctx.beginPath();
          ctx.arc(0, 0, fr, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = '#7df9ff';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const ang = (k / 6) * Math.PI * 2 - t * 1.1;
            const px = Math.cos(ang) * fr;
            const py = Math.sin(ang) * fr;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1;
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 - t * 1.1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * fr, Math.sin(ang) * fr);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // Shield down: cracked remnants, so the phase change is unmistakable.
          ctx.save();
          ctx.strokeStyle = 'rgba(125, 249, 255, 0.4)';
          ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            const ang = (k / 3) * Math.PI * 2 + t * 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.5, ang, ang + Math.PI * 0.4);
            ctx.stroke();
          }
          ctx.restore();
        }
        // Stunned after its last drone dies: a visible vulnerability window.
        if ((e.stunTimer || 0) > 0) {
          this.paintBossShieldWash(ctx, e, R, '#ffe066', 0.18);
        }

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }

      /** BOSS 3 — SINGULARITY DEVOURER: a void eye with an event-horizon halo,
       *  an accretion ring, a slit pupil and matter spiralling inward. */
      paintBossDevourer(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();

        this.paintGlow(ctx, 0, 0, R * 2.0, '#9d00ff', lowFx ? 0 : 0.13, lowFx ? 2 : 6);

        // Accretion ring: two arcs at different radii and speeds.
        ctx.save();
        ctx.rotate(t * 0.6);
        ctx.strokeStyle = 'rgba(255, 0, 170, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.36, 0, Math.PI * 1.3);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.rotate(-t * 1.1);
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.18, 0, Math.PI * 0.9);
        ctx.stroke();
        ctx.restore();

        // Matter spiralling inward on shrinking radii, so the eye visibly eats
        // the space around it. Pure function of t, so the guest agrees.
        for (let i = 0; i < 8; i++) {
          const phase = (t * 0.55 + i / 8) % 1;
          const rad = R * (1.5 - phase * 0.85);
          const a = i * 2.399 + t * (1.2 + phase * 2.5);
          ctx.fillStyle = `rgba(255, 120, 220, ${(0.25 + phase * 0.6).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, 1.2 + (1 - phase) * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Sclera, then the void pupil.
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e9b8ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#050010';
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
        ctx.fill();

        // Slit pupil that widens as the boss loses HP — a readable "feeding"
        // tell that needs no extra state on the wire.
        const frac = e.maxHp > 0 ? Math.max(0.15, Math.min(1, e.hp / e.maxHp)) : 1;
        ctx.save();
        ctx.scale(1, (R * 0.62 * (0.35 + (1 - frac) * 0.75)) / (R * 0.62));
        ctx.fillStyle = '#ff2dce';
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // A hot pinpoint keeps the centre from reading as a flat black hole.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Iris spokes: the eye's mechanical frame.
        ctx.strokeStyle = 'rgba(255, 45, 206, 0.65)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 0.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R * 0.64, Math.sin(a) * R * 0.64);
          ctx.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97);
          ctx.stroke();
        }

        // Devour wind-up: a ring that tightens as it charges its pull.
        if ((e.devourTimer || 0) > 0) {
          const pull = 1 - Math.min(1, e.devourTimer / 2.5);
          ctx.strokeStyle = `rgba(255, 45, 206, ${(0.4 + pull * 0.5).toFixed(3)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, R * (1.9 - pull * 0.7), 0, Math.PI * 2);
          ctx.stroke();
        }

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }

      /** Boss body dispatcher — solo roster plus the co-op registry bosses.
       *
       * Until this existed, boss_mirror_bastion and boss_polarity_split had no
       * body anywhere in the codebase: those fights rendered as an invisible
       * boss with only its mechanic overlay, for host and guest alike. Routing
       * every boss type through one dispatcher is what makes that impossible to
       * repeat — a new boss type that has no painter is visually obvious here.
       *
       * Returns false for an unrecognised type so renderEnemies can keep its
       * long-standing plain-circle fallback.
       */
      renderBossBody(ctx, e) {
        switch (e.type) {
          case 'boss_nexus': this.paintBossNexus(ctx, e); return true;
          case 'boss_carrier': this.paintBossCarrier(ctx, e); return true;
          case 'boss_devourer': this.paintBossDevourer(ctx, e); return true;
          case 'boss_dual_reactor': this.paintBossDualReactor(ctx, e); return true;
          case 'boss_mirror_bastion': this.paintBossMirrorBastion(ctx, e); return true;
          case 'boss_polarity_split': this.paintBossPolaritySplit(ctx, e); return true;
          default: return false;
        }
      }
    });
