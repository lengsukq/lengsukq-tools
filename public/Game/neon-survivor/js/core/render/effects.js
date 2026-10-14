    /* Effect layer: tethers, holes, mines, beams, drones, bullets, fighters FX, text. */
    NeonCore.define(NeonSurvivorGame, class {
      renderLightningTethers(ctx, visible) {
        // 6. Draw Lightning Tethers (Boss 1 electric fence)
        this.lightningTethers.forEach((lt) => {
          ctx.save();
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lt.x1, lt.y1);
          const mx1 = lt.x1 * 0.65 + lt.x2 * 0.35 + (Math.random() - 0.5) * 25;
          const my1 = lt.y1 * 0.65 + lt.y2 * 0.35 + (Math.random() - 0.5) * 25;
          const mx2 = lt.x1 * 0.35 + lt.x2 * 0.65 + (Math.random() - 0.5) * 25;
          const my2 = lt.y1 * 0.35 + lt.y2 * 0.65 + (Math.random() - 0.5) * 25;
          ctx.lineTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.lineTo(lt.x2, lt.y2);
          ctx.stroke();
          ctx.restore();
        });
      }

      renderBlackHoles(ctx, visible) {
        // 7. Draw Black Holes
        this.blackHoles.forEach((bh) => {
          if (!visible(bh.x, bh.y, bh.radius || 180)) return;
          ctx.save();
          ctx.translate(bh.x, bh.y);
          ctx.rotate(bh.rotAngle);
          ctx.fillStyle = '#050010';
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9d00ff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, bh.radius * 0.55, 0, Math.PI * 1.5);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(157, 0, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, bh.radius * 0.85, Math.PI * 0.5, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      renderCryoMines(ctx, visible) {
        // 8. Draw Cryo Mines
        this.mines.forEach((m) => {
          if (!visible(m.x, m.y, 34)) return;
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2;
            const px = Math.cos(ang) * 11;
            const py = Math.sin(ang) * 11;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          const pulse = (Math.sin(this.survivalTime * 8) + 1) * 2;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 3 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      renderLaserBeams(ctx, visible) {
        // 9. Draw Laser Beams
        this.laserBeams.forEach((lb) => {
          ctx.save();
          ctx.translate(lb.x, lb.y);
          ctx.rotate(lb.angle);
          ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
          ctx.fillRect(0, -lb.width / 2, lb.length, lb.width);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, -lb.width * 0.2, lb.length, lb.width * 0.4);
          ctx.restore();
        });
      }

      renderCompanionDrones(ctx, visible) {
        // 10. Draw Companion Drones
        this.companionDrones.forEach((dr) => {
          if (!visible(dr.x, dr.y, 20)) return;
          ctx.save();
          ctx.translate(dr.x, dr.y);
          ctx.rotate(dr.angle + Math.PI / 2);
          ctx.fillStyle = '#061a30';
          ctx.strokeStyle = '#00ffaa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(9, 0);
          ctx.lineTo(-7, -7);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-7, 7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#00ffaa';
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      renderEnemyBullets(ctx, visible) {
        // 11. Draw Enemy Bullets
        this.enemyBullets.forEach((eb) => {
          if (!visible(eb.x, eb.y, (eb.radius || 4) + 6)) return;
          ctx.fillStyle = eb.color;
          ctx.beginPath();
          ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      renderBullets(ctx, visible) {
        // 12. Draw Player Bullets
        this.bullets.forEach((b) => {
          if (!visible(b.x, b.y, (b.radius || 4) + 20)) return;
          if (b.type === 'missile') {
            ctx.save();
            ctx.translate(b.x, b.y);
            const ang = Math.atan2(b.vy, b.vx);
            ctx.rotate(ang);
            // Sleek missile fuselage
            ctx.fillStyle = b.isLevel5 ? '#ff00aa' : '#ff007f';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-b.radius * 2.2, -b.radius, b.radius * 3.6, b.radius * 2, b.radius);
            } else {
              ctx.rect(-b.radius * 2.2, -b.radius, b.radius * 3.6, b.radius * 2);
            }
            ctx.fill();
            // Glowing warhead tip
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.radius * 1.4, 0, b.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            // Jet exhaust flare
            ctx.fillStyle = b.isLevel5 ? '#00f3ff' : '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(-b.radius * 2.2, -b.radius * 0.7);
            ctx.lineTo(-b.radius * 3.4, 0);
            ctx.lineTo(-b.radius * 2.2, b.radius * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else if (b.type === 'cluster_missile') {
            ctx.save();
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      renderOrbiters(ctx, visible) {
        // 13. Draw Orbiters
        this.orbiters.forEach((orb) => {
          const cx = Number.isFinite(orb.centerX) ? orb.centerX : this.player.x;
          const cy = Number.isFinite(orb.centerY) ? orb.centerY : this.player.y;
          const ox = cx + Math.cos(orb.angle) * orb.distance;
          const oy = cy + Math.sin(orb.angle) * orb.distance;
          if (!visible(cx, cy, (orb.distance || 70) + (orb.radius || 10))) return;
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = orb.color;
          ctx.fillStyle = orb.color;
          ctx.beginPath();
          ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
          ctx.fill();

          // Trailing laser arc
          ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, orb.distance, orb.angle - 0.45, orb.angle);
          ctx.stroke();
          ctx.restore();
        });
      }

      renderDashTrails(ctx, visible) {
        // Draw Plasma Dash Trails (Warp Laser Wall)
        this.dashTrails.forEach((dtTrail) => {
          ctx.save();
          const progress = Math.max(0, dtTrail.life / dtTrail.maxLife);
          ctx.lineCap = 'round';
          ctx.globalAlpha = progress * 0.85;
          ctx.strokeStyle = dtTrail.color;
          ctx.shadowColor = dtTrail.color;
          ctx.shadowBlur = 16;
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.moveTo(dtTrail.x1, dtTrail.y1);
          ctx.lineTo(dtTrail.x2, dtTrail.y2);
          ctx.stroke();

          // High-energy white core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(dtTrail.x1, dtTrail.y1);
          ctx.lineTo(dtTrail.x2, dtTrail.y2);
          ctx.stroke();
          ctx.restore();
        });
      }

      renderSlashFx(ctx, visible) {
        // Draw Riftblade Hyper-Spatial Katana Slash Ribbon
        if (this.player.lastSlashFx && this.player.lastSlashFx.life > 0) {
          const sfx = this.player.lastSlashFx;
          const fade = Math.max(0, Math.min(1, sfx.life / (sfx.maxLife || 0.28)));
          const mainCol = sfx.fire ? '#ff007f' : sfx.cryo ? '#38bdf8' : '#00f3ff';
          ctx.save();
          ctx.lineCap = 'round';
          ctx.globalAlpha = fade * 0.72;
          ctx.strokeStyle = mainCol;
          ctx.shadowColor = mainCol;
          ctx.shadowBlur = 18;
          ctx.lineWidth = 18 * fade + 4;
          ctx.beginPath();
          ctx.moveTo(sfx.x1, sfx.y1);
          ctx.lineTo(sfx.x2, sfx.y2);
          ctx.stroke();

          ctx.globalAlpha = fade;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 * fade + 1.5;
          ctx.beginPath();
          ctx.moveTo(sfx.x1, sfx.y1);
          ctx.lineTo(sfx.x2, sfx.y2);
          ctx.stroke();
          ctx.restore();
        }
      }

      renderAegisAura(ctx, visible) {
        // Draw Phase Aegis Aura (时空相位无敌光环)
        if (this.player.aegisTimer > 0) {
          ctx.save();
          ctx.translate(this.player.x, this.player.y);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3.5;
          ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
          ctx.beginPath();
          ctx.arc(0, 0, this.player.aegisRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Hexagonal energy rune ring
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.75)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 + this.survivalTime * 4.5;
            const px = Math.cos(ang) * (this.player.aegisRadius * 0.92);
            const py = Math.sin(ang) * (this.player.aegisRadius * 0.92);
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          // Expanding pulse wave
          const pulse = ((performance.now() / 250) % 1) * this.player.aegisRadius;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      renderFloatingTexts(ctx, visible) {
        // 10. Draw Floating Combat Text (High-speed batch render)
        this.texts.forEach((txt) => {
          if (!visible(txt.x, txt.y, 200)) return;
          ctx.save();
          ctx.font = `bold ${txt.size}px monospace`;
          ctx.fillStyle = txt.color;
          ctx.globalAlpha = Math.max(0, txt.life / txt.maxLife);
          ctx.fillText(txt.text, txt.x, txt.y);
          ctx.restore();
        });
      }
    });
