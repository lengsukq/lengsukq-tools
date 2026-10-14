    /* Gamepad connection, menu navigation and rumble feedback. */
    NeonCore.define(NeonSurvivorGame, class {
      showGamepadFeedback(message, color = '#00ffaa') {
        const status = document.getElementById('gamepad-name');
        if (status && this.gamepadIndex >= 0) {
          status.textContent = message;
          status.title = message;
        }
        this.texts.push({
          x: this.player ? this.player.x : this.width / 2,
          y: this.player ? this.player.y - 55 : this.height / 2 - 50,
          text: message,
          color,
          size: 15,
          life: 2.2,
          maxLife: 2.2
        });
      }

      async testGamepadVibration() {
        if (!this.gamepadVibrationEnabled) {
          this.showGamepadFeedback('震动已关闭，点击震动开关启用', '#ffba8a');
          return { status: 'disabled' };
        }
        const result = await GamepadHaptics.playConnected(this.gamepadIndex, 350, 0.95, 0.8);
        const feedback = {
          accepted: '浏览器已接受震动请求，请检查实际反馈',
          unsupported: '当前手柄或浏览器不支持震动接口',
          disconnected: '未检测到已连接的游戏手柄',
          rejected: '震动请求被浏览器或手柄拒绝'
        };
        this.showGamepadFeedback(feedback[result.status], result.status === 'accepted' ? '#00ffaa' : '#ffba8a');
        return result;
      }

      setupGamepad() {
        this.gamepadIndex = -1;
        this.gamepadPrevButtons = {};
        this.gamepadSelectedUpgradeIdx = 0;
        this.gamepadNavTimer = 0;
        this.gamepadCombatInputLocked = false;

        this.syncGamepadBadge = (gp) => {
          window.NeonGamepadHints?.sync(gp);
          const badge = document.getElementById('gamepad-badge');
          const testButton = document.getElementById('btn-test-vibrate');
          if (badge) badge.style.display = gp ? 'inline-flex' : 'none';
          if (testButton) testButton.style.display = gp ? 'inline-flex' : 'none';
          if (gp) {
            const name = document.getElementById('gamepad-name');
            if (name) name.textContent = GamepadHaptics.supportsRumble(gp)
              ? '已连接 · 点击测试震动' : '已连接 · 无震动接口';
          }
        };

        window.addEventListener('gamepadconnected', (e) => {
          this.gamepadIndex = e.gamepad.index;
          const haptics = GamepadHaptics.supportsRumble(e.gamepad);
          this.syncGamepadBadge(e.gamepad);
          this.texts.push({
            x: this.player ? this.player.x : this.width / 2,
            y: this.player ? this.player.y - 60 : this.height / 2 - 50,
            text: haptics ? '手柄已连接 · 点击测试震动' : '手柄已连接 · 未检测到震动接口',
            color: '#00ffaa',
            size: 18,
            life: 2.5,
            maxLife: 2.5
          });
          // Browsers can deny haptics without a user gesture. Do not claim
          // vibration on connect; the explicit test button supplies a gesture.
        });

        window.addEventListener('gamepaddisconnected', (e) => {
          const remaining = GamepadHaptics.connectedGamepads().find(gp => gp.index !== e.gamepad.index);
          this.gamepadIndex = remaining ? remaining.index : -1;
          this.syncGamepadBadge(remaining);
          if (!remaining) {
            this.gamepadMove = { x: 0, y: 0 };
            this.gamepadPrevButtons = {};
          }
          this.texts.push({
            x: this.player ? this.player.x : this.width / 2,
            y: this.player ? this.player.y - 60 : this.height / 2 - 50,
            text: '⚠️ 手柄已断开连接',
            color: '#ff3300',
            size: 16,
            life: 2.0,
            maxLife: 2.0
          });
        });
      }

      toggleGamepadVibration() {
        this.gamepadVibrationEnabled = !this.gamepadVibrationEnabled;
        SafeStorage.set('neon_vibration', this.gamepadVibrationEnabled ? 'true' : 'false');
        window.NeonGameSettings?.set('vibration', this.gamepadVibrationEnabled, this);
        if (this.gamepadVibrationEnabled) {
          // Called from a direct click: test immediately while user activation
          // is still available for browsers with haptic gesture restrictions.
          this.testGamepadVibration();
        }
        this.texts.push({
          x: this.player ? this.player.x : this.width / 2,
          y: this.player ? this.player.y - 40 : this.height / 2 - 30,
          text: this.gamepadVibrationEnabled ? '📳 手柄震动：已开启' : '🔕 手柄震动：已关闭',
          color: this.gamepadVibrationEnabled ? '#00ffaa' : '#8c9cb8',
          size: 16,
          life: 1.5,
          maxLife: 1.5
        });
      }

      vibrateGamepad(duration = 100, strong = 0.5, weak = 0.3) {
        if (!this.gamepadVibrationEnabled) return Promise.resolve({ status: 'disabled' });
        return GamepadHaptics.playConnected(this.gamepadIndex, duration, strong, weak);
      }

      rememberGamepadButtons(gp) {
        for (let i = 0; i < gp.buttons.length; i++) {
          const button = gp.buttons[i];
          this.gamepadPrevButtons[i] = Boolean(typeof button === 'object' ? button?.pressed : button > 0.5);
        }
      }

      finishGamepadMenuFrame(gp, lockCombat = false) {
        // A button used for menu confirmation must never also start a dash.
        this.rememberGamepadButtons(gp);
        this.gamepadMove = { x: 0, y: 0 };
        if (lockCombat) this.gamepadCombatInputLocked = true;
      }

      pollGamepad(dt) {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        let gamepads;
        try { gamepads = navigator.getGamepads(); } catch (e) { return; }
        if (!gamepads) return;

        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && gamepads[i].connected) {
            gp = gamepads[i];
            this.gamepadIndex = i;
            break;
          }
        }
        if (!gp) {
          window.NeonGamepadHints?.sync(null);
          if (this.gamepadIndex !== -1) {
            this.gamepadIndex = -1;
            this.gamepadMove = { x: 0, y: 0 };
            this.gamepadPrevButtons = {};
            this.syncGamepadBadge(null);
          }
          return;
        }

        const badge = document.getElementById('gamepad-badge');
        window.NeonGamepadHints?.sync(gp);
        if (badge && badge.style.display === 'none') this.syncGamepadBadge(gp);

        const isPressed = (btnIdx) => {
          const btn = gp.buttons[btnIdx];
          if (!btn) return false;
          return typeof btn === 'object' ? btn.pressed : btn > 0.5;
        };

        const justPressed = (btnIdx) => {
          const pressed = isPressed(btnIdx);
          const wasPressed = !!this.gamepadPrevButtons[btnIdx];
          return pressed && !wasPressed;
        };

        // Menus own all controller actions, including LAN lobby and settings.
        // Consume this frame so confirm never leaks through into a dash.
        if (window.NeonGamepadMenus?.poll(this, gp, justPressed)) {
          this.finishGamepadMenuFrame(gp, true);
          return;
        }

        if (this.state === 'lan-waiting') {
          window.NeonLanReady?.pollGamepad(this.lanCoop, justPressed);
          this.finishGamepadMenuFrame(gp, true);
          return;
        }

        if (this.state === 'endless-choice') {
          window.NeonRogueUI?.pollGamepad(this, justPressed, gp);
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // 1. Upgrade Modal Navigation (state === 'levelup')
        if (this.state === 'levelup') {
          const cards = document.querySelectorAll('#upgrade-options .upgrade-card');
          if (cards.length > 0) {
            if (this.gamepadNavTimer > 0) this.gamepadNavTimer -= dt;
            else {
              const lx = gp.axes[0] || 0;
              const ly = gp.axes[1] || 0;
              const dLeft = isPressed(14) || lx < -0.45;
              const dRight = isPressed(15) || lx > 0.45;
              const dUp = isPressed(12) || ly < -0.45;
              const dDown = isPressed(13) || ly > 0.45;
              const dx = Number(dRight) - Number(dLeft);
              const dy = Number(dDown) - Number(dUp);
              if (dx || dy) {
                this.gamepadSelectedUpgradeIdx = window.NeonGamepadMenus?.gridMove(
                  this.gamepadSelectedUpgradeIdx, cards.length, dx, dy,
                  window.NeonGamepadMenus?.columnsFor(this.upgradeGrid) || 3) ??
                  (this.gamepadSelectedUpgradeIdx + (dx || dy * 3) + cards.length) % cards.length;
                this.gamepadNavTimer = 0.22;
                this.sound.playLaser(500, 'sine');
                cards[this.gamepadSelectedUpgradeIdx]?.scrollIntoView?.({block:'nearest'});
              }
            }

            this.gamepadSelectedUpgradeIdx = Math.max(0, Math.min(this.gamepadSelectedUpgradeIdx, cards.length - 1));

            cards.forEach((c, idx) => {
              if (idx === this.gamepadSelectedUpgradeIdx) {
                c.style.transform = 'translateY(-6px) scale(1.03)';
                c.style.borderColor = '#00f3ff';
                c.style.boxShadow = '0 0 20px rgba(0, 243, 255, 0.7)';
              } else {
                c.style.transform = '';
                c.style.borderColor = '';
                c.style.boxShadow = '';
              }
            });

            // A previews (A twice also confirms), while X/RT instantly
            // accepts the highlighted eligible card. Neither action reaches
            // the combat dash handler while the upgrade modal owns focus.
            const fastConfirm = justPressed(7) || (!this.endlessMode && justPressed(2));
            const preview = justPressed(0);
            if (fastConfirm || preview) {
              const targetCard = cards[this.gamepadSelectedUpgradeIdx] || cards[0];
              if (targetCard && !targetCard.classList?.contains('picked')) {
                if (fastConfirm) {
                  if (this.pendingUpgradeId !== targetCard.upgradeId) targetCard.click();
                  this.confirmUpgradePreview();
                } else if (this.pendingUpgradeId &&
                    this.pendingUpgradeId === targetCard.upgradeId) {
                  this.confirmUpgradePreview();
                } else {
                  targetCard.click();
                }
                this.vibrateGamepad(120, 0.4, 0.2);
              }
            }
            if (this.endlessMode && justPressed(3)) this.rerollEndlessUpgrade();
            if (this.endlessMode && justPressed(2)) {
              const chosen = this.currentUpgradeChoices?.[this.gamepadSelectedUpgradeIdx];
              if (chosen) this.banishEndlessUpgrade(chosen.id);
            }
            if (justPressed(1)) {
              this.cancelUpgradePreview();
            } // B only cancels. Never accidentally bank leftover credits.
            if (!this.endlessMode && justPressed(3) && !this.pendingUpgradeId) {
              this.finishUpgradeSelection();
            }
          } else {
            // 安全退出避免弹窗死锁
            this.finishUpgradeSelection();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // 2. Modals (Start / Help / Pause / GameOver / Victory)
        if (this.isHelpOpen) {
          if (justPressed(1) || justPressed(9) || justPressed(0)) {
            this.closeHelpModal();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        } else if (this.state === 'paused') {
          if (justPressed(9) || justPressed(1) || justPressed(0)) {
            this.resumeGame();
            this.vibrateGamepad(80, 0.3, 0.2);
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Start screen confirmation
        const modalStart = document.getElementById('modal-start');
        if (modalStart && modalStart.classList.contains('active')) {
          if (justPressed(14)) this.selectDifficulty(Math.max(0, this.selectedDifficulty - 1));
          if (justPressed(15)) this.selectDifficulty(Math.min(this.unlockedDifficulty, this.selectedDifficulty + 1));
          if (justPressed(0) || justPressed(9)) {
            const btnStart = document.getElementById('btn-start-game');
            if (btnStart) btnStart.click();
            this.vibrateGamepad(150, 0.5, 0.3);
          }
          if (justPressed(3) || justPressed(2)) {
            this.openHelpModal();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Game Over screen
        const modalGameOver = document.getElementById('modal-gameover');
        if (modalGameOver && modalGameOver.classList.contains('active')) {
          if (justPressed(0) || justPressed(9)) {
            this.startNewGame();
            this.vibrateGamepad(150, 0.5, 0.3);
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Victory screen
        const modalVic = document.getElementById('modal-victory');
        if (modalVic && modalVic.classList.contains('active')) {
          if (justPressed(0) || justPressed(9)) {
            const btnEndless = document.getElementById('btn-endless');
            if (btnEndless) btnEndless.click();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        if (this.state !== 'playing') {
          this.finishGamepadMenuFrame(gp);
          return;
        }

        // On returning from any menu, require the confirmation button to be
        // physically released before gameplay actions can be dispatched.
        if (this.gamepadCombatInputLocked) {
          const actionButtons = [0, 1, 2, 3, 4, 5, 6, 7, 9];
          const released = actionButtons.every(index => !isPressed(index));
          this.finishGamepadMenuFrame(gp);
          if (released) this.gamepadCombatInputLocked = false;
          return;
        }

        // 3. Gameplay Controls (state === 'playing' or 'lan-client')
        if (this.state === 'playing' || this.state === 'lan-client') {
          const shipId = this.state === 'playing' ? this.player?.shipId :
            this.lanCoop?.latest?.guest?.shipId;

          // Pause: Start button (9)
          if (justPressed(9)) {
            if (this.state === 'playing') this.pauseGame();
            this.finishGamepadMenuFrame(gp);
            return;
          }
          if (shipId === 'astra') {
            if (justPressed(2)) this.castAstraWard();   // X
            if (justPressed(3)) this.castAstraMeteor(); // Y
          }
          if (shipId === 'phantom') {
            if (justPressed(2)) this.triggerPhantomSprint(); // X -> 幽影疾行
            if (justPressed(3)) this.triggerPhantomVortex(); // Y -> 虚空聚拢/推斥
            // LB (4, co-op), Back/View (8), or L3 (10) -> 战术共生挂载/脱离
            if (justPressed(8) || justPressed(10) || (justPressed(4) && (this.lanCoop?.ally || this.lanCoop?.latest?.host))) {
              this.togglePhantomDock();
            }
          }

          // Dash Trigger: A (0), B (1), RB (5), RT (7), LT (6), and LB (4, when not reserved for co-op dock)
          const isCoopDockTarget = shipId === 'phantom' && (this.lanCoop?.ally || this.lanCoop?.latest?.host);
          const isDashPressed = justPressed(0) || justPressed(1) || justPressed(5) || justPressed(6) || justPressed(7) ||
            (justPressed(4) && !isCoopDockTarget);
          if (isDashPressed) {
            this.triggerDash();
            this.vibrateGamepad(120, 0.6, 0.3);
          }

          // Left Stick & D-Pad: Analog Movement
          let mx = gp.axes[0] || 0;
          let my = gp.axes[1] || 0;
          const deadzone = 0.18;
          if (Math.abs(mx) < deadzone) mx = 0;
          if (Math.abs(my) < deadzone) my = 0;

          // D-Pad override/addition
          if (isPressed(14)) mx = -1; // Left
          if (isPressed(15)) mx = 1;  // Right
          if (isPressed(12)) my = -1; // Up
          if (isPressed(13)) my = 1;  // Down

          this.gamepadMove = { x: mx, y: my };

          // Weapon targeting is always automatic, even when the right stick moves.
        }

        // Record buttons for edge detection
        this.rememberGamepadButtons(gp);
      }
    });
