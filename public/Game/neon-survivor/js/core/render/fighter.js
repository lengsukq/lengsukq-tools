    /* Fighter hull rendering and the cyber grid backdrop. */
    NeonCore.define(NeonSurvivorGame, class {
      // Shared by both cameras: one fighter model, colors and invulnerability FX.
      renderFighter(ctx, fighter, profile, showLabel = false) {
        if (!fighter) return;
        ctx.save();
        ctx.translate(fighter.x, fighter.y);
        ctx.rotate(fighter.aimAngle || 0);
        const isPhantomShifted = fighter.shipId === 'phantom' &&
          Boolean(fighter.phantom?.shiftActive || fighter.spectral?.shiftActive);
        if (fighter.downed) {
          ctx.globalAlpha = .5;
        } else if (isPhantomShifted) {
          // Smooth breathing spectral wraith cloak instead of 60ms hit-strobe
          ctx.globalAlpha = 0.46 + Math.sin(performance.now() * 0.009) * 0.12;
        } else if ((fighter.invulnTimer || 0) > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
          ctx.globalAlpha = 0.4;
        }
        // The same bounded warp pulse is drawn for host, remote pilots and
        // the guest's immediate visual prediction. Combat logic stays on host.
        const warpPulse = Math.max(
          Math.min(1, (fighter.dash || 0) / .18),
          Math.min(1, (fighter.dashTimeLeft || 0) / .18),
          Math.min(1, fighter.visualDash || 0)
        );
        if (warpPulse > 0 && !fighter.downed) {
          ctx.save();
          const tint = fighter.shipId === 'phantom' ? '#cf82ff' :
            fighter.shipId === 'astra' ? '#8db8ff' : '#00f3ff';
          ctx.globalAlpha = .8 * warpPulse;
          ctx.shadowColor = tint;
          ctx.shadowBlur = 18;
          ctx.strokeStyle = tint;
          ctx.lineWidth = 2 + warpPulse * 2;
          ctx.beginPath();
          ctx.arc(0, 0, 21 + (1 - warpPulse) * 33, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.moveTo(-12, -12);
          ctx.lineTo(-38 - 28 * warpPulse, 0);
          ctx.lineTo(-12, 12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        // New hulls are registered by rendererId. Legacy default geometry
        // remains as a fallback for isolated tests / missing ship module.
        if (!window.NeonShips?.drawHull?.(ctx, fighter, profile)) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = profile.color;
          ctx.fillStyle = '#0a1628';
          ctx.strokeStyle = fighter.downed ? '#ff617e' : profile.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-14, -18);
          ctx.lineTo(-6, -6);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-6, 6);
          ctx.lineTo(-14, 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = fighter.downed ? '#ff617e' : profile.color;
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          const flameLen = 10 + Math.random() * 8;
          ctx.fillStyle = '#ff007f';
          ctx.shadowColor = '#ff007f';
          ctx.beginPath();
          ctx.moveTo(-16, -4);
          ctx.lineTo(-16 - flameLen, 0);
          ctx.lineTo(-16, 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        if (showLabel) {
          ctx.save();
          ctx.fillStyle = profile.color;
          ctx.font = 'bold 13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(fighter.downed ? profile.name + ' · 等待救援' :
            profile.name + ' · ' + Math.ceil(fighter.hp || 0) + ' HP',
            fighter.x, fighter.y - 35);
          ctx.restore();
        }
      }

      renderCyberGrid(ctx) {
        const gridSize = 70;
        const zoom = Math.max(0.65, Math.min(1.5, this.cameraZoom || 1));
        const left = this.camera.x - this.width / (2 * zoom) - gridSize;
        const right = this.camera.x + this.width / (2 * zoom) + gridSize;
        const top = this.camera.y - this.height / (2 * zoom) - gridSize;
        const bottom = this.camera.y + this.height / (2 * zoom) + gridSize;

        const startX = Math.floor(left / gridSize) * gridSize;
        const startY = Math.floor(top / gridSize) * gridSize;

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = startX; x <= right; x += gridSize) {
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
        }
        for (let y = startY; y <= bottom; y += gridSize) {
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
        }
        ctx.stroke();

        // Cross points
        ctx.fillStyle = 'rgba(0, 243, 255, 0.18)';
        for (let x = startX; x <= right; x += gridSize) {
          for (let y = startY; y <= bottom; y += gridSize) {
            ctx.fillRect(x - 2, y - 2, 4, 4);
          }
        }
      }
    });
