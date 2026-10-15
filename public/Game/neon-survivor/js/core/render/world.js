    /* World layer: gems, shockwaves, particles and enemies. */
    NeonCore.define(NeonSurvivorGame, class {
      renderGems(ctx, visible) {
        // 2. Draw XP Gems & Items
        // Run-length batching: consecutive pickups that share a style are
        // emitted as one path and filled/stroked once. Gems arrive in bursts
        // of the same kind and colour, so a screen full of them collapses to a
        // handful of fills. No per-entity allocation and no lookup table: a
        // run is closed only when the style actually changes, so the worst
        // case is the old one-state-change-per-gem behaviour.
        const KIND_GEM = 0, KIND_HEAL = 1, KIND_MAGNET = 2, KIND_NUKE = 3;
        let kind = -1, color = null, open = false;
        const closeRun = () => {
          if (!open) return;
          if (kind === KIND_MAGNET) ctx.stroke();
          else { ctx.fill(); if (kind === KIND_NUKE) ctx.stroke(); }
          open = false;
        };
        ctx.globalAlpha = 1;
        for (const g of this.gems) {
          if (!visible(g.x, g.y, (g.radius || 8) + 12)) continue;
          const next = g.type === 'heal' ? KIND_HEAL
            : g.type === 'magnet' ? KIND_MAGNET
            : g.type === 'nuke' ? KIND_NUKE : KIND_GEM;
          if (next !== kind || (next === KIND_GEM && g.color !== color)) {
            closeRun();
            kind = next;
            color = g.color;
            if (kind === KIND_HEAL) ctx.fillStyle = '#00ff66';
            else if (kind === KIND_MAGNET) { ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3.5; }
            else if (kind === KIND_NUKE) { ctx.fillStyle = '#ffaa00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; }
            else ctx.fillStyle = color;
          }
          if (!open) { ctx.beginPath(); open = true; }
          if (kind === KIND_HEAL) {
            const s = g.radius;
            ctx.rect(g.x - s * 0.35, g.y - s, s * 0.7, s * 2);
            ctx.rect(g.x - s, g.y - s * 0.35, s * 2, s * 0.7);
          } else if (kind === KIND_MAGNET) {
            // moveTo first: an arc would otherwise be joined to the previous
            // subpath by a straight line.
            ctx.moveTo(g.x - g.radius, g.y);
            ctx.arc(g.x, g.y, g.radius, Math.PI, 0, false);
          } else if (kind === KIND_NUKE) {
            const r = g.radius * 0.9;
            ctx.moveTo(g.x + r, g.y);
            ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
          } else {
            // Standard XP Diamond (crisp and high performance)
            const r = g.radius;
            ctx.moveTo(g.x, g.y - r * 1.3);
            ctx.lineTo(g.x + r, g.y);
            ctx.lineTo(g.x, g.y + r * 1.3);
            ctx.lineTo(g.x - r, g.y);
            ctx.closePath();
          }
        }
        closeRun();
      }

      renderShockwaves(ctx, visible) {
        // 3. Draw Shockwaves
        this.shockwaves.forEach((sw) => {
          if (!visible(sw.x, sw.y, sw.radius || 30)) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.restore();
        });
      }

      renderParticles(ctx, visible) {
        // 4. Draw Particles (Optimized batch rendering)
        this.particles.forEach((p) => {
          if (!visible(p.x ?? p.x1, p.y ?? p.y1, p.type === 'lightning' ? 600 : 30)) return;
          ctx.save();
          const progress = p.life / p.maxLife;
          ctx.globalAlpha = Math.max(0, progress);

          if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'afterimage') {
            if (Number.isFinite(p.angle)) {
              ctx.translate(p.x, p.y);
              ctx.rotate(p.angle);
              ctx.strokeStyle = p.color;
              ctx.fillStyle = p.color;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(22, 0);
              ctx.lineTo(-12, -17);
              ctx.lineTo(-6, 0);
              ctx.lineTo(-12, 17);
              ctx.closePath();
              ctx.stroke();
              ctx.globalAlpha = Math.max(0, progress * 0.28);
              ctx.fill();
            } else {
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (p.type === 'lightning') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1);
            const midX = (p.x1 + p.x2) / 2 + (Math.random() - 0.5) * 30;
            const midY = (p.y1 + p.y2) / 2 + (Math.random() - 0.5) * 30;
            ctx.lineTo(midX, midY);
            ctx.lineTo(p.x2, p.y2);
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      renderEnemies(ctx, visible) {
        // 5. Draw Enemies
        this.enemies.forEach((e) => {
          const margin = e.type === 'sniper' ? 640 :
            e.type === 'shield_pylon' ? 125 : (e.radius || 20) + (e.isBoss ? 95 : 30);
          if (!visible(e.x, e.y, margin)) return;
          ctx.save();
          ctx.translate(e.x, e.y);
          if (e.isBoss && this.shadowEnabled()) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = e.color;
          }
          ctx.fillStyle = e.color;

          if (e.isBoss) {
            // Boss bodies live in core/render/boss-art.js. The dispatcher
            // returns false for an unknown boss type so the classic plain
            // circle still stands as the fallback.
            if (!this.renderBossBody(ctx, e)) {
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Body draw. Wrapped in its own save/restore because several
            // branches rotate to a heading, and the aura, HP bar and badge
            // below must not inherit that rotation (a rotated elite badge
            // renders mirrored).
            ctx.save();
            if (e.type === 'nexus_pylon') {
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (e.type === 'shield_drone') {
              ctx.beginPath();
              for (let k = 0; k < 6; k++) {
                const ang = (k / 6) * Math.PI * 2;
                const px = Math.cos(ang) * e.radius;
                const py = Math.sin(ang) * e.radius;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
              if (this.currentBoss && this.currentBoss.type === 'boss_carrier' && !this.currentBoss.dead) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.currentBoss.x - e.x, this.currentBoss.y - e.y);
                ctx.stroke();
                ctx.restore();
              }
            } else if (e.type === 'shield_pylon') {
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 234, 0, 0.4)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 110, 0, Math.PI * 2);
              ctx.stroke();
            } else if (e.type === 'kamikaze') {
              // 引信期间闪烁翻倍 + 红色预警环
              if (e.arming) {
                ctx.strokeStyle = 'rgba(255, 51, 0, 0.85)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, e.radius + 9, 0, Math.PI * 2);
                ctx.stroke();
              }
              const a = Math.atan2(e.vy, e.vx);
              ctx.rotate(a);
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
              const blinkFreq = e.arming ? 40 : 20;
              ctx.fillStyle = Math.sin(this.survivalTime * blinkFreq) > 0 ? '#ffff00' : '#ff0000';
              ctx.beginPath();
              ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (e.type === 'sniper') {
              const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
              ctx.rotate(a);
              ctx.beginPath();
              ctx.moveTo(e.radius * 1.5, 0);
              ctx.lineTo(-e.radius, -e.radius * 0.8);
              ctx.lineTo(-e.radius * 0.3, 0);
              ctx.lineTo(-e.radius, e.radius * 0.8);
              ctx.closePath();
              ctx.fill();
              if (e.aimTimer > 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 0, 170, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 8]);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(600, 0);
                ctx.stroke();
                ctx.restore();
              }
            } else if (e.type === 'larvae') {
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
            } else if (e.type === 'charger') {
              // Sharp Triangle
              const a = Math.atan2(e.vy, e.vx);
              ctx.rotate(a);
              ctx.beginPath();
              ctx.moveTo(e.radius * 1.4, 0);
              ctx.lineTo(-e.radius, -e.radius);
              ctx.lineTo(-e.radius * 0.4, 0);
              ctx.lineTo(-e.radius, e.radius);
              ctx.closePath();
              ctx.fill();
            } else if (e.type === 'spitter') {
              // Hexagon turret
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                const px = Math.cos(ang) * e.radius;
                const py = Math.sin(ang) * e.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
            } else {
              // Diamond / Swarmer
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
            }
            // Elite plating sits on top of the base body but inside the same
            // rotation scope, so a ram prow still points where the charger does.
            if (e.isElite) this.renderEliteBody(ctx, e);
            ctx.restore();
          }

          // Crowd-control Status Visuals: Freeze Slow / Stun / Fear
          if ((e.freezeTimer || 0) > 0) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (k / 6) * Math.PI * 2 + this.survivalTime * 1.5;
              const r = e.radius + 4;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
          if ((e.stunnedUntil || 0) > this.survivalTime) {
            const stunAng = this.survivalTime * 7;
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(0, -e.radius - 7, 6, stunAng, stunAng + Math.PI * 1.3);
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(Math.cos(stunAng) * 6, -e.radius - 7 + Math.sin(stunAng) * 6, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (!e.isBoss && (e.fearedUntil || 0) > this.survivalTime) {
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 5 + Math.sin(this.survivalTime * 16) * 2, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Elite Enemy Ring & Badge — the full elite art lives in
          // core/render/enemy-art.js so every elite type wears the same halo.
          if (e.isElite) {
            this.renderEliteAura(ctx, e);
          }

          // Enemy HP Bar (if damaged)
          if (e.hp < e.maxHp && !e.isBoss) {
            const barW = e.radius * 2;
            const barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -e.radius - (e.isElite ? 22 : 9), barW, barH);
            ctx.fillStyle = e.isElite ? '#ffd700' : '#00ffaa';
            ctx.fillRect(-barW / 2, -e.radius - (e.isElite ? 22 : 9), Math.max(0, (e.hp / e.maxHp) * barW), barH);
          }

          ctx.restore();
        });
      }
    });
