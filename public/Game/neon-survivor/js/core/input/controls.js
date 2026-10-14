    /* Keyboard, mouse, touch, fullscreen and the in-game manual. */
    NeonCore.define(NeonSurvivorGame, class {
      setupTouchControls() {
        const touchArea = document.getElementById('touch-controls');
        const joyBase = document.getElementById('joystickBase');
        const joyThumb = document.getElementById('joystickThumb');
        const dashBtn = document.getElementById('touch-dash-btn');
        if (!touchArea || !joyBase || !joyThumb || !dashBtn) return;

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
          touchArea.style.display = 'block';
          document.documentElement?.classList?.add('neon-touch-enabled');
        }

        // Only one specific finger owns the joystick. Dash touches are independent.
        window.addEventListener('touchstart', (e) => {
          if (!['playing', 'lan-client'].includes(this.state) || this.touch.active) return;
          if (e.target && typeof e.target.closest === 'function' &&
              e.target.closest('#hud, .modal-overlay, #touch-dash-btn, #combat-hud-dock, #phantom-touch-actions, #neon-settings-modal, #neon-lan-lobby')) return;
          const rect = dashBtn.getBoundingClientRect();
          for (const t of e.changedTouches || []) {
            if (t.clientX >= rect.left && t.clientX <= rect.right &&
                t.clientY >= rect.top && t.clientY <= rect.bottom) continue;
            // A left-handed skill cluster leaves the right half available
            // for the floating movement joystick, and vice versa.
            const leftHanded = window.NeonGameSettings?.get('controlSide') === 'left';
            const screenWidth = window.innerWidth || this.width || 0;
            if (screenWidth && (leftHanded ? t.clientX < screenWidth * 0.36 :
              t.clientX > screenWidth * 0.64)) continue;
            this.touch.identifier = t.identifier;
            this.touch.active = true;
            this.touch.startX = t.clientX;
            this.touch.startY = t.clientY;
            this.touch.currentX = t.clientX;
            this.touch.currentY = t.clientY;
            joyBase.style.display = 'block';
            joyBase.style.left = `${t.clientX}px`;
            joyBase.style.top = `${t.clientY}px`;
            joyThumb.style.left = '50%';
            joyThumb.style.top = '50%';
            break;
          }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
          if (!this.touch.active) return;
          const t = Array.from(e.changedTouches || []).find(t => t.identifier === this.touch.identifier);
          if (!t) return; // The dash finger must not steer the ship.
          if (e.cancelable) e.preventDefault();
          this.touch.currentX = t.clientX;
          this.touch.currentY = t.clientY;
          const dx = t.clientX - this.touch.startX;
          const dy = t.clientY - this.touch.startY;
          const dist = Math.min(50, Math.sqrt(dx * dx + dy * dy));
          const angle = Math.atan2(dy, dx);
          joyThumb.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`;
          joyThumb.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;
        }, { passive: false });

        const onTouchFinish = (e) => {
          if (!this.touch.active) return;
          const ownerReleased = Array.from(e.changedTouches || [])
            .some(t => t.identifier === this.touch.identifier);
          if (ownerReleased) this.releaseJoystickTouch();
        };
        window.addEventListener('touchend', onTouchFinish);
        window.addEventListener('touchcancel', onTouchFinish);

        dashBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.triggerDash();
        }, { passive: false });
        dashBtn.addEventListener('keydown', (e) => {
          if (!['Enter', ' '].includes(e.key) || e.repeat ||
              !['playing', 'lan-client'].includes(this.state)) return;
          e.preventDefault();
          e.stopPropagation();
          this.triggerDash();
        });
        // On mobile a second finger may tap a skill while the joystick finger
        // is moving. The global touchmove handler cancels synthetic `click`
        // in several browsers, so direct skills must respond to touchstart
        // just like the independent dash button does.
        const skillsBar = document.getElementById('ship-skills-bar');
        skillsBar?.addEventListener('touchstart', (event) => {
          const button = event.target?.closest?.('.combat-skill-btn');
          if (!button || !skillsBar.contains(button)) return;
          const action = {
            'btn-skill-ward': 'castAstraWard',
            'btn-skill-meteor': 'castAstraMeteor',
            'btn-skill-sprint': 'triggerPhantomSprint',
            'btn-skill-vortex': 'triggerPhantomVortex',
            'btn-skill-reap': 'triggerPhantomVortex',
            'btn-skill-dock': 'togglePhantomDock',
            'btn-skill-blink': 'triggerDash',
            'btn-skill-shift': 'triggerDash',
            'btn-skill-dash': 'triggerDash'
          }[button.id];
          if (!action || !['playing', 'lan-client'].includes(this.state)) return;
          button.dataset.neonSkillTouchedAt = String(performance.now());
          event.preventDefault();
          event.stopPropagation();
          this[action]();
        }, { passive: false });
        const phantomDock = document.getElementById('phantom-dock-action');
        if (phantomDock) {
          phantomDock.addEventListener('touchstart', event => {
            event.preventDefault(); event.stopPropagation(); this.togglePhantomDock();
          }, { passive: false });
          phantomDock.addEventListener('click', event => {
            event.stopPropagation(); this.togglePhantomDock();
          });
        }
      }

      setupEvents() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());

        // Keyboard
        window.addEventListener('keydown', (e) => {
          if (this.settingsOpen) return;
          if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
          if (this.state === 'levelup' && !e.repeat) {
            const number = /^[1-5]$/.test(e.key) ? Number(e.key) - 1 : -1;
            const cards = Array.from(this.upgradeGrid?.children || [])
              .filter(card => card.upgradeId);
            const direction = {
              ArrowLeft: [-1, 0], ArrowRight: [1, 0],
              ArrowUp: [0, -1], ArrowDown: [0, 1]
            }[e.key];
            if (direction && cards.length) {
              e.preventDefault();
              this.gamepadSelectedUpgradeIdx = window.NeonGamepadMenus?.gridMove(
                this.gamepadSelectedUpgradeIdx, cards.length, ...direction,
                window.NeonGamepadMenus?.columnsFor(this.upgradeGrid) || 3) ?? this.gamepadSelectedUpgradeIdx;
              cards[this.gamepadSelectedUpgradeIdx]?.scrollIntoView?.({block:'nearest'});
              return;
            }
            if (number >= 0 && cards[number]) {
              e.preventDefault();
              this.gamepadSelectedUpgradeIdx = number;
              cards[number].click();
              return;
            }
            if (e.key === 'Escape' && this.pendingUpgradeId) {
              e.preventDefault();
              this.cancelUpgradePreview();
              return;
            }
            if (e.key === 'Enter' && !['BUTTON'].includes(e.target?.tagName)) {
              e.preventDefault();
              const card = cards[this.gamepadSelectedUpgradeIdx] || cards[0];
              if (this.pendingUpgradeId) this.confirmUpgradePreview();
              else card?.click();
              return;
            }
          }
          this.keys[e.key.toLowerCase()] = true;
          this.keys[e.code] = true;
          if (e.code === 'Space') {
            this.triggerDash();
            e.preventDefault();
          }
          if (!e.repeat && (this.state === 'playing' || this.state === 'lan-client')) {
            const shipId = this.state === 'playing' ? this.player?.shipId :
              this.lanCoop?.latest?.guest?.shipId;
            const key = e.key.toLowerCase();
            if (shipId === 'astra') {
              if (key === 'j' || key === 'q') {
                this.castAstraWard();
                e.preventDefault();
              } else if (key === 'k' || key === 'e') {
                this.castAstraMeteor();
                e.preventDefault();
              }
            } else if (shipId === 'phantom') {
              if (key === 'j' || e.code === 'KeyJ') {
                this.triggerPhantomSprint();
                e.preventDefault();
              } else if (key === 'k' || e.code === 'KeyK') {
                this.triggerPhantomVortex();
                e.preventDefault();
              } else if (key === 'q' || e.code === 'KeyQ') {
                this.togglePhantomDock();
                e.preventDefault();
              } else if (key === 'e' || e.code === 'KeyE') {
                if (this.lanCoop?.ally || this.lanCoop?.latest?.host) {
                  this.togglePhantomDock();
                } else {
                  this.triggerPhantomSprint();
                }
                e.preventDefault();
              }
            }
          }
          if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (this.state === 'playing') this.pauseGame();
            else if (this.state === 'paused') this.resumeGame();
          }
          if (!e.repeat && e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey &&
              !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            this.toggleFullscreen();
            e.preventDefault();
          }
        });

        window.addEventListener('keyup', (e) => {
          this.keys[e.key.toLowerCase()] = false;
          this.keys[e.code] = false;
        });

        // Mouse
        window.addEventListener('mousemove', (e) => {
          this.mouse.x = e.clientX;
          this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
          if (e.button === 0) {
            this.mouse.down = true;
          } else if (e.button === 2) {
            this.triggerDash();
            e.preventDefault();
          }
        });

        window.addEventListener('mouseup', (e) => {
          if (e.button === 0) this.mouse.down = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        this.setupTouchControls();

        // UI Buttons
        // Gamepad Vibration Toggle Button
        const btnVibrate = document.getElementById('btn-vibrate');
        const updateVibrateBtnStyle = () => {
          if (!btnVibrate) return;
          btnVibrate.textContent = this.gamepadVibrationEnabled ? '📳' : '🔕';
          btnVibrate.style.borderColor = this.gamepadVibrationEnabled ? 'var(--neon-green)' : 'rgba(255, 255, 255, 0.2)';
          btnVibrate.style.color = this.gamepadVibrationEnabled ? '#00ffaa' : '#8899aa';
          btnVibrate.title = this.gamepadVibrationEnabled ? '手柄震动：【开启】(点击关闭)' : '手柄震动：【关闭】(点击开启)';
        };
        if (btnVibrate) {
          btnVibrate.onclick = () => {
            this.toggleGamepadVibration();
            updateVibrateBtnStyle();
          };
          updateVibrateBtnStyle();
        }

        const btnTestVibrate = document.getElementById('btn-test-vibrate');
        if (btnTestVibrate) btnTestVibrate.onclick = () => this.testGamepadVibration();

        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) btnFullscreen.onclick = () => this.toggleFullscreen();
        this.updateFullscreenButton();

        // Connected badge is an independent haptics test; the toggle is separate.
        const gamepadBadge = document.getElementById('gamepad-badge');
        if (gamepadBadge) {
          gamepadBadge.style.cursor = 'pointer';
          gamepadBadge.onclick = () => this.testGamepadVibration();
        }

        document.getElementById('btn-start-game').onclick = () => {
          this.sound.init();
          this.startNewGame();
        };
        const lanButton = document.getElementById('btn-lan-coop');
        if (lanButton) lanButton.onclick = () => window.NeonLanLobby?.open(this);

        document.getElementById('btn-sound').onclick = (e) => {
          const on = this.sound.toggle();
          e.currentTarget.textContent = on ? '🔊' : '🔇';
          window.NeonGameSettings?.set('sound', on, this);
        };

        let crtOn = true;
        document.getElementById('btn-crt').onclick = () => {
          crtOn = !crtOn;
          this.crtOverlay.style.opacity = crtOn ? '1' : '0';
          window.NeonGameSettings?.set('crt', crtOn, this);
        };

        document.getElementById('btn-pause').onclick = () => {
          if (this.state === 'playing') this.pauseGame();
          else if (this.state === 'paused') this.resumeGame();
        };

        document.getElementById('btn-resume').onclick = () => this.resumeGame();
        document.getElementById('btn-restart-pause').onclick = () => this.showStartMenu();
        const btnRestartQuick = document.getElementById('btn-restart-quick');
        if (btnRestartQuick) btnRestartQuick.onclick = () => this.startNewGame();
        document.getElementById('btn-restart-over').onclick = () => this.showStartMenu();
        const btnQuickOver = document.getElementById('btn-quick-over');
        if (btnQuickOver) btnQuickOver.onclick = () => this.startNewGame();
        document.getElementById('btn-restart-vic').onclick = () => this.showStartMenu();
        document.getElementById('btn-endless').onclick = () => {
          this.modalVictory.classList.remove('active');
          if (window.NeonRogueEndless) window.NeonRogueEndless.start(this);
          else {
            this.endlessMode = true;
            this.state = 'playing';
            this.lastTime = performance.now();
          }
        };

        // Manual / Help Modal Events
        const btnHelp = document.getElementById('btn-help');
        if (btnHelp) btnHelp.onclick = () => this.openHelpModal();

        const btnStartHelp = document.getElementById('btn-start-help');
        if (btnStartHelp) btnStartHelp.onclick = () => this.openHelpModal();

        const btnPauseHelp = document.getElementById('btn-pause-help');
        if (btnPauseHelp) btnPauseHelp.onclick = () => this.openHelpModal();

        const btnCloseHelp = document.getElementById('btn-close-help');
        if (btnCloseHelp) btnCloseHelp.onclick = () => this.closeHelpModal();

        // Help tab switching
        const tabBtns = document.querySelectorAll('.help-tab-btn');
        tabBtns.forEach(btn => {
          btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.querySelectorAll('.help-section').forEach(sec => sec.classList.remove('active'));
            const sec = document.getElementById(targetTab);
            if (sec) sec.classList.add('active');
          };
        });

        // Initialize Gamepad API
        this.setupGamepad();
      }

      openHelpModal(targetTab = 'help-controls') {
        this.prevHelpState = this.state;
        if (this.state === 'playing') {
          this.state = 'paused';
        }
        const modal = document.getElementById('modal-help');
        if (modal) modal.classList.add('active');
        this.isHelpOpen = true;

        if (targetTab) {
          const tabBtns = document.querySelectorAll('.help-tab-btn');
          tabBtns.forEach(b => {
            if (b.getAttribute('data-tab') === targetTab) b.classList.add('active');
            else b.classList.remove('active');
          });
          document.querySelectorAll('.help-section').forEach(sec => {
            if (sec.id === targetTab) sec.classList.add('active');
            else sec.classList.remove('active');
          });
        }
      }

      closeHelpModal() {
        const modal = document.getElementById('modal-help');
        if (modal) modal.classList.remove('active');
        this.isHelpOpen = false;
        if (this.prevHelpState === 'playing') {
          this.state = 'playing';
          this.lastTime = performance.now();
        }
      }

      updateFullscreenButton() {
        const button = document.getElementById('btn-fullscreen');
        if (!button) return;
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        button.textContent = active ? '⤢' : '⛶';
        button.title = active ? '退出全屏 (F)' : '进入全屏 (F)';
        button.setAttribute('aria-label', button.title);
      }

      async toggleFullscreen() {
        try {
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (!exit) throw new Error('unsupported');
            await exit.call(document);
          } else {
            const root = document.documentElement;
            const request = root.requestFullscreen || root.webkitRequestFullscreen;
            if (!request) throw new Error('unsupported');
            await request.call(root);
          }
        } catch (err) {
          this.showGamepadFeedback('浏览器不支持或阻止了全屏模式', '#ffba8a');
        }
        this.updateFullscreenButton();
      }
    });
