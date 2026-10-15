    /* Co-op boss art — the bodies for the three registry bosses.
     *
     * These live apart from coop-bosses.js because that file owns the MECHANIC
     * (capture points, flank splits, polarity pairing) and is already close to
     * the 500-line core ceiling; mixing the drawing in would couple two very
     * different kinds of change.
     *
     * Until this file existed only boss_dual_reactor had a body, drawn inline in
     * core/render/world.js. boss_mirror_bastion and boss_polarity_split had
     * NONE anywhere in the codebase, so those two encounters fought as an
     * invisible boss plus its overlay — on the host's screen as well as the
     * guest's. renderBossBody dispatches here for all three, which also means
     * the guest now paints the dual reactor's body from its snapshot instead of
     * only the capture rings.
     *
     * Shapes stay inside the replicated field set (x/y/vx/vy/hp/maxHp/radius/
     * color/type/isBoss/hasShield/arming/aimTimer/coopCapture/coopExposed), so
     * host and guest cannot disagree. In particular `arming` is the shared
     * shielded flag for both registry bosses and `aimTimer` is the polarity
     * anchor's orbit angle — the registry says so explicitly.
     */
    NeonCore.define(NeonSurvivorGame, class {
      /** BOSS — DUAL REACTOR: an octagonal fortress around two counter-rotating
       *  reactor pods, which is the pair the capture mechanic asks you to hold. */
      paintBossDualReactor(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();
        const exposed = (e.coopExposed || 0) > 0;

        this.paintGlow(ctx, 0, 0, R * 1.8, exposed ? '#9dfff3' : '#72ffe0',
          lowFx ? 0 : 0.14, lowFx ? 2 : 5);

        // Outer hull: the original 8-point star the host and guest both drew,
        // kept so the silhouette of this encounter does not change underfoot.
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = t * 0.35 + i * Math.PI / 4;
          const radius = R * (i % 2 ? 0.86 : 1.08);
          if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
          else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        }
        ctx.closePath();
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.strokeStyle = exposed ? '#9dfff3' : '#ffbf80';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Twin reactor pods. They are the visual subject of the mechanic, so
        // they get rings and a core rather than being flat discs.
        for (const offset of [-19, 19]) {
          ctx.fillStyle = exposed ? '#ffffff' : '#143747';
          ctx.beginPath();
          ctx.arc(offset, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#8fffe4';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Rotating containment band around each pod.
          ctx.save();
          ctx.translate(offset, 0);
          ctx.rotate(t * (offset < 0 ? 2.2 : -2.2));
          ctx.strokeStyle = exposed ? 'rgba(255, 255, 255, 0.9)' : 'rgba(143, 255, 228, 0.6)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 0.7);
          ctx.stroke();
          ctx.restore();
          // Charge pip: fills while the team holds the capture points.
          const charge = Math.max(0, Math.min(1, (e.coopCapture || 0) / 1.4));
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(offset, 0, 19, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
          ctx.stroke();
        }

        // Cross-feed conduit between the pods, brighter as they synchronise.
        ctx.strokeStyle = exposed ? '#ffffff' : 'rgba(143, 255, 228, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();

        // Armour ribs so the hull does not read as one flat star.
        ctx.strokeStyle = 'rgba(255, 191, 128, 0.55)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          const a = t * 0.35 + (i / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45);
          ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
          ctx.stroke();
        }

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }

      /** BOSS — MIRROR BASTION: a directional fortress. The whole design is one
       *  read: the armoured half is the side damage bounces off, and the two
       *  flank ribs are where the pincer has to be.
       *
       *  The facing comes from the replicated velocity; a stationary boss falls
       *  back to the local pilot's angle, which is a purely cosmetic difference.
       */
      paintBossMirrorBastion(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();
        const exposed = (e.coopExposed || 0) > 0;
        // `arming` is the registry's shared "shield up" flag for this boss.
        const shielded = e.arming !== false && !exposed;

        // Vec.dist rather than Math.hypot: hypot is banned from core per-frame
        // paths (see the Vec helper in core/constants.js), and this art runs on
        // every painted frame for the whole roster.
        const speed = Vec.dist(0, 0, e.vx || 0, e.vy || 0);
        const face = speed > 0.001
          ? Math.atan2(e.vy, e.vx)
          : Math.atan2(this.player.y - e.y, this.player.x - e.x);

        this.paintGlow(ctx, 0, 0, R * 1.7, exposed ? '#9dffd0' : '#ff9f43',
          lowFx ? 0 : 0.14, lowFx ? 2 : 5);

        ctx.save();
        ctx.rotate(face);
        // Hull: a hexagonal fortress with a flat front plate.
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const px = Math.cos(ang) * R;
          const py = Math.sin(ang) * R;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.strokeStyle = exposed ? '#9dffd0' : '#ffd7a8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // The mirror plate: a bright leading edge, drawn as two halves meeting
        // on the axis so the "both sides at once" rule is legible.
        if (shielded) {
          ctx.globalAlpha = 0.55 + Math.sin(t * 5) * 0.12;
          for (const sign of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.28, sign < 0 ? -Math.PI * 0.62 : Math.PI * 0.02,
              sign < 0 ? -Math.PI * 0.02 : Math.PI * 0.6);
            ctx.strokeStyle = sign < 0 ? '#9ad8ff' : '#ffc27a';
            ctx.lineWidth = 7;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Flank ribs: one per half-plane, exactly where a pilot must stand.
        for (const sign of [-1, 1]) {
          const a = face + sign * Math.PI / 2;
          const px = Math.cos(a) * R * 1.45;
          const py = Math.sin(a) * R * 1.45;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(a);
          ctx.fillStyle = exposed ? '#9dffd0' : '#ff9f43';
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-9, -7);
          ctx.lineTo(-13, 0);
          ctx.lineTo(-9, 7);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          // Charge arc that fills as the two flanks hold together.
          const charge = Math.max(0, Math.min(1, (e.coopCapture || 0) / 1.2));
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Core eye that opens while the shield is broken.
        const coreR = R * (exposed ? 0.42 : 0.24);
        ctx.fillStyle = exposed ? '#ffffff' : '#3a1c00';
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = exposed ? '#9dffd0' : '#ffbf80';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }

      /** BOSS — POLARITY SPLIT: a two-tone core joined by a charge tether, with
       *  the anchor position riding on the replicated aimTimer (which the
       *  registry documents as this boss's orbit angle). */
      paintBossPolaritySplit(ctx, e) {
        const t = this.survivalTime;
        const R = e.radius;
        const lowFx = this._artShadowOff();
        const exposed = (e.coopExposed || 0) > 0;
        const shielded = e.arming !== false && !exposed;

        this.paintGlow(ctx, 0, 0, R * 1.8, '#8f7dff', lowFx ? 0 : 0.14, lowFx ? 2 : 5);

        // Two counter-rotating polarity rings: pink (+) and blue (−).
        ctx.save();
        ctx.rotate(t * 0.5);
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.42, 0, Math.PI * 0.92);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.rotate(-t * 0.5);
        ctx.strokeStyle = '#6bd5ff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.42, Math.PI, Math.PI * 1.92);
        ctx.stroke();
        ctx.restore();

        // Body, split down the middle so neither sign owns the whole boss.
        ctx.beginPath();
        ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = '#ff6b9d';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5);
        ctx.closePath();
        ctx.fillStyle = '#6bd5ff';
        ctx.fill();
        ctx.strokeStyle = exposed ? '#ffffff' : e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
        // The seam between the two halves.
        ctx.beginPath();
        ctx.moveTo(0, -R);
        ctx.lineTo(0, R);
        ctx.stroke();

        // The shackle core: a dark ring that seals while the shield holds and
        // splits open once a + and a − charge the anchor together.
        const bond = Math.max(0, Math.min(1, (e.coopCapture || 0) / 1.4));
        ctx.fillStyle = exposed ? '#ffffff' : '#1a1030';
        ctx.beginPath();
        ctx.arc(0, 0, R * (exposed ? 0.44 : 0.32), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = exposed ? '#b9a9ff' : '#8f7dff';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        if (shielded) {
          // Four shackle bars, retracting as the bond charges.
          ctx.strokeStyle = `rgba(185, 169, 255, ${(0.85 - bond * 0.6).toFixed(3)})`;
          ctx.lineWidth = 3;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const inner = R * (0.36 - bond * 0.1);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
            ctx.stroke();
          }
        }

        // Charge arc around the core, so pairing progress is visible on the boss
        // itself and not only in the overlay text.
        ctx.strokeStyle = '#b9a9ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.14, -Math.PI / 2, -Math.PI / 2 + bond * Math.PI * 2);
        ctx.stroke();

        this.paintBossChassis(ctx, e, R);
        this.paintBossHealthBar(ctx, e, R);
      }
    });
