    /* Ship active skills and the warp/dash entry point. */
    NeonCore.define(NeonSurvivorGame, class {
      castAstraWard() {
        if (this.state === 'lan-client') {
          if (this.settingsOpen || this.lanCoop?.latest?.guest?.downed) return false;
          return this.lanCoop?.requestGuestSpell('ward') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'astra' ||
            this.settingsOpen || this.player?.downed) return false;
        const astraState = window.NeonAstra?.state(this.player);
        if (astraState) {
          if (!astraState.wardActive) {
            if (astraState.cooldowns?.ward > 0) {
              this.notifySkillFeedback(`⏳ 结界冷却中 (${Math.ceil(astraState.cooldowns.ward)}s)`, '#f43f5e');
              return false;
            }
            if (astraState.mana < 20) {
              this.notifySkillFeedback(`⚠️ 星能不足 (需20/当前${Math.floor(astraState.mana)})`, '#c084fc');
              try { this.sound?.playLaser?.(240, 'triangle'); } catch (_) {}
              return false;
            }
          }
        }
        const wasWardActive = Boolean(astraState?.wardActive);
        const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this, 'ward') === true;
        if (ok) {
          if (!wasWardActive) {
            this.notifySkillFeedback('🛡️ 移动炮台已启动！(持续燃能 · 防弹推怪)', '#a78bfa');
            try { this.sound?.playBeam?.(); } catch (_) {}
          } else {
            this.notifySkillFeedback('💨 移动炮台已关闭，激活撤离护盾与加速！', '#c084fc');
            try { this.sound?.playDash?.(); } catch (_) {}
          }
        }
        return ok;
      }

      castAstraMeteor() {
        if (this.state === 'lan-client') {
          if (this.settingsOpen || this.lanCoop?.latest?.guest?.downed) return false;
          return this.lanCoop?.requestGuestSpell('meteor') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'astra' ||
            this.settingsOpen || this.player?.downed) return false;
        const astraState = window.NeonAstra?.state(this.player);
        if (astraState) {
          if (astraState.mana < 12) {
            this.notifySkillFeedback(`⚠️ 星能不足 (需12/当前${Math.floor(astraState.mana)})`, '#c084fc');
            try { this.sound?.playLaser?.(240, 'triangle'); } catch (_) {}
            return false;
          }
        }
        const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this, 'meteor') === true;
        if (ok) {
          this.notifySkillFeedback('☄️ 苍穹星陨！(定点轰炸 · 3s减速50%力场)', '#d8b4fe');
          try { this.sound?.playExplosion?.('large'); } catch (_) {}
        }
        return ok;
      }

      triggerPhantomSprint() {
        if (this.state === 'lan-client') {
          if (this.settingsOpen || this.lanCoop?.latest?.guest?.downed) return false;
          return this.lanCoop?.requestGuestShipAction('sprint') === true;
        }
        if (!this.player || this.player.shipId !== 'phantom' || this.state !== 'playing' ||
            this.player.downed || this.player.hp <= 0) return false;
        const ghost = this.player.phantom;
        if ((ghost?.sprintCooldown || 0) > 0) {
          this.notifySkillFeedback(`⏳ 幽影疾行冷却中 (${ghost.sprintCooldown.toFixed(1)}s)`, '#f43f5e');
          return false;
        }
        const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this, 'sprint') === true;
        if (ok) {
          this.notifySkillFeedback('💨 幽影疾行！移速爆发+75% (持续时间已累加)', '#00f0ff');
          try { this.sound?.playDash?.(); } catch (_) {}
        }
        return ok;
      }

      triggerPhantomVortex() {
        if (this.state === 'lan-client') {
          if (this.settingsOpen || this.lanCoop?.latest?.guest?.downed) return false;
          return this.lanCoop?.requestGuestShipAction('vortex') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'phantom' ||
            this.settingsOpen || this.player?.downed || this.player.hp <= 0) return false;
        const ghost = this.player.phantom;
        if ((ghost?.vortexCooldown || 0) > 0) {
          this.notifySkillFeedback(`⏳ 虚空力场冷却中 (${ghost.vortexCooldown.toFixed(1)}s)`, '#f43f5e');
          return false;
        }
        const wasShift = Boolean(ghost?.shiftActive);
        const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this, 'vortex') === true;
        if (ok) {
          if (wasShift) {
            this.notifySkillFeedback('🌀 虚空聚拢！大范围引力坍缩吸怪 (跟随自身)', '#c084fc');
          } else {
            this.notifySkillFeedback('💫 虚空推斥！近身强力斥力排斥敌群', '#00f0ff');
          }
          try { this.sound?.playZap?.(); } catch (_) {}
        }
        return ok;
      }

      togglePhantomDock() {
        if (this.settingsOpen) return false;
        if (this.state === 'lan-client') {
          if (this.lanCoop?.latest?.guest?.shipId !== 'phantom') return false;
          return this.lanCoop?.requestGuestShipAction('dock_toggle') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'phantom' ||
            this.player.downed || this.player.hp <= 0) return false;
        if (this.player.phantom?.docked) {
          const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this,
            { kind:'undock', eject:true }) === true;
          if (ok) this.notifySkillFeedback('⚡ 脱离共生挂载', '#00f0ff');
          return ok;
        }
        const carrier = this.lanCoop?.ally;
        if (!carrier || !this.lanCoop?.rtc?.connected) {
          this.notifySkillFeedback('⚠️ 需在联机模式靠近队友 150px 方可共生挂载', '#f43f5e');
          return false;
        }
        const ok = window.NeonShips?.runAbility?.(this.player, 'onAction', this,
          { kind:'dock', carrier }) === true;
        if (ok) this.notifySkillFeedback('🔗 战术共生挂载成功!', '#00f0ff');
        else this.notifySkillFeedback('⚠️ 需靠近队友 150px 方可共生', '#f43f5e');
        return ok;
      }

      getWarpDirection() {
        let x = Number(Boolean(this.keys?.d || this.keys?.arrowright)) -
          Number(Boolean(this.keys?.a || this.keys?.arrowleft));
        let y = Number(Boolean(this.keys?.s || this.keys?.arrowdown)) -
          Number(Boolean(this.keys?.w || this.keys?.arrowup));
        if (this.touch?.active) {
          x = this.touch.currentX - this.touch.startX;
          y = this.touch.currentY - this.touch.startY;
        } else if (this.gamepadMove &&
          (this.gamepadMove.x * this.gamepadMove.x + this.gamepadMove.y * this.gamepadMove.y) > .04) {
          x = this.gamepadMove.x; y = this.gamepadMove.y;
        } else if (typeof navigator !== 'undefined' && navigator.getGamepads) {
          const gp = navigator.getGamepads()?.[this.gamepadIndex];
          const gx = Number.isFinite(gp?.axes?.[0]) ? gp.axes[0] : 0;
          const gy = Number.isFinite(gp?.axes?.[1]) ? gp.axes[1] : 0;
          if (gx * gx + gy * gy > .0484) { x=gx; y=gy; }
        }
        const length = Math.sqrt(x * x + y * y);
        if (Number.isFinite(length) && length>.05) return {x:x/length,y:y/length};
        const aim=Number.isFinite(this.player?.aimAngle)?this.player.aimAngle:0;
        return {x:Math.cos(aim),y:Math.sin(aim)};
      }

      triggerDash() {
        if (this.state === 'lan-client' && this.lanCoop?.guestMode) {
          if (this.lanCoop.latest?.guest?.downed) return;
          this.lanCoop.predictGuestDash?.();
          this.lanCoop.dashQueued = true;
          return;
        }
        // Every additional ship implements one common warp hook. The game
        // controller neither knows its action names nor computes its damage.
        if (this.state === 'playing' && this.player?.shipId &&
            this.player.shipId !== 'riftblade') {
          if (!this.player.downed && this.player.hp > 0) {
            if (this.player.shipId === 'astra') {
              const astraState = window.NeonAstra?.state(this.player);
              if (astraState?.wardActive) {
                this.notifySkillFeedback('⚠️ 炮台重装定锚中，无法闪现！', '#c084fc');
                try { this.sound?.playLaser?.(180, 'sine'); } catch (_) {}
                return;
              }
            }
            const isPhantom = this.player.shipId === 'phantom';
            const ghost = isPhantom ? window.NeonPhantom?.state(this.player) : null;
            if (ghost && !ghost.shiftActive && (ghost.stealthEnergy || 0) < 0.35) {
              this.notifySkillFeedback('⏳ 潜行能流恢复中...', '#a855f7');
              try { this.sound?.playLaser?.(200, 'sawtooth'); } catch (_) {}
              return;
            }
            if (ghost && !ghost.shiftActive &&
                (ghost.shiftLockUntil || 0) > (this.survivalTime || 0)) {
              this.notifySkillFeedback('🌫️ 显形冷却中，稍后才能再次潜行', '#a855f7');
              try { this.sound?.playLaser?.(200, 'sawtooth'); } catch (_) {}
              return;
            }
            const wasShiftActive = isPhantom ? Boolean(ghost?.shiftActive) : false;
            if (window.NeonShips?.runAbility?.(this.player,'onAction',this,
                {kind:'warp',direction:this.getWarpDirection()}) === true) {
              if (isPhantom) {
                if (!wasShiftActive) {
                  this.notifySkillFeedback('👻 进入持续潜行！(免疫碰撞与弹幕 · 随时引爆)', '#00f0ff');
                } else {
                  this.notifySkillFeedback('💥 退出潜行并连锁引爆死印！(获得0.35s无敌)', '#a855f7');
                }
              }
              this.sound?.playDash?.();
              this.lanCoop?.onHostDash();
              window.NeonRogueEndless?.onDash(this);
              const nearestEnemy = this.findNearestEnemy(180);
              if (nearestEnemy) {
                window.NeonRogueEndless?.onPreciseDash(this, nearestEnemy);
              }
            }
          }
          return;
        }
        if (this.player?.downed) return;
        if (this.player.dashCharges <= 0 || this.player.isDashing || this.state !== 'playing') return;
        this.lanCoop?.onHostDash();
        window.NeonRogueEndless?.onDash(this);
        if (this.survivalTime > (this.player.dashComboUntil || 0)) this.player.dashCombo = 0;
        this.player.dashPreciseHit = false;
        this.player.dashCharges--;
        this.player.isDashing = true;
        this.player.dashTimeLeft = this.player.dashDuration;
        // Movement and aura protection overlap rather than summing into a long immunity window.
        const dashProtection = this.player.dashDuration + 0.08 + (this.player.dashInvulnBonus || 0);
        this.player.invulnTimer = Math.max(this.player.invulnTimer,
          Math.min(0.40, Math.max(dashProtection, this.player.hasAegis ? this.player.aegisDuration : 0)));
        if (this.player.hasAegis) {
          this.player.aegisTimer = this.player.aegisDuration;
          this.player.aegisPulseTimer = 0;
        }
        this.player.dashStartX = this.player.x;
        this.player.dashStartY = this.player.y;
        this.player.dashHitEnemies = new Set();
        this.sound.playDash();

        this.vibrateGamepad(100, 0.45, 0.2);
        this.player.dashDir = this.getWarpDirection();

        // Spawn warp slash shockwave
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 15,
          maxRadius: 75,
          alpha: 1.0,
          color: '#00f3ff'
        });
      }
    });
