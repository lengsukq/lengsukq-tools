    /* In-game tactical skill dock for the active ship. */
    NeonCore.define(NeonSurvivorGame, class {
      updateCombatSkillsDock() {
        const dock = document.getElementById('combat-hud-dock');
        if (!dock) return;
        const isPlaying = (this.state === 'playing') ||
          (this.state === 'lan-client' && this.lanCoop?.latest?.phase === 'playing');
        if (!isPlaying || this.settingsOpen) {
          dock.style.display = 'none';
          return;
        }
        dock.style.display = 'flex';

        const shipId = this.state === 'lan-client' ?
          this.lanCoop?.latest?.guest?.shipId : this.player?.shipId;
        const skillsBar = document.getElementById('ship-skills-bar');

        // 1. Render buttons for current ship if not already mounted
        if (skillsBar && skillsBar.getAttribute('data-ship') !== shipId) {
          skillsBar.setAttribute('data-ship', shipId || 'riftblade');
          skillsBar.replaceChildren();

          if (shipId === 'astra') {
            skillsBar.innerHTML = `
              <button type="button" class="combat-skill-btn" id="btn-skill-ward" title="天界结界 [J]：开启/关闭重装移动炮台，移速-80%禁闪现，法阵跟随移动，自身增伤+70%，持续燃能，核心防弹推怪，瓦解后获护盾加速">
                <span class="skill-hotkey">J</span>
                <span class="skill-icon">🛡️</span>
                <span class="skill-name">天界结界</span>
                <span class="skill-cost" id="cost-skill-ward">持续燃能</span>
                <div class="skill-cd-mask" id="mask-skill-ward"></div>
              </button>
              <button type="button" class="combat-skill-btn" id="btn-skill-meteor" title="苍穹星陨 [K]：【0 CD】无冷却定点轰炸，固定消耗12星能/发，造成范围伤害、短暂击晕并在落点留下滞留3秒的50%减速力场">
                <span class="skill-hotkey">K</span>
                <span class="skill-icon">☄️</span>
                <span class="skill-name">苍穹星陨</span>
                <span class="skill-cost" id="cost-skill-meteor">12星能</span>
                <div class="skill-cd-mask" id="mask-skill-meteor"></div>
              </button>
              <button type="button" class="combat-skill-btn" id="btn-skill-blink" title="相位闪现 [空格]：超维闪现，附带落地移速爆发">
                <span class="skill-hotkey">空格</span>
                <span class="skill-icon">⚡</span>
                <span class="skill-name">相位闪现</span>
                <span class="skill-cost" id="cost-skill-blink">折跃充能</span>
                <div class="skill-cd-mask" id="mask-skill-blink"></div>
              </button>`;

            skillsBar.querySelector('#btn-skill-ward')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.castAstraWard();
            });
            skillsBar.querySelector('#btn-skill-meteor')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.castAstraMeteor();
            });
            skillsBar.querySelector('#btn-skill-blink')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.triggerDash();
            });
          } else if (shipId === 'phantom') {
            skillsBar.innerHTML = `
              <button type="button" class="combat-skill-btn" id="btn-skill-sprint" title="幽影疾行 [J]：无消耗加速，持续3秒可叠加，移速+75%">
                <span class="skill-hotkey">J</span>
                <span class="skill-icon" id="icon-skill-sprint">💨</span>
                <span class="skill-name" id="name-skill-sprint">幽影疾行</span>
                <span class="skill-cost" id="cost-skill-sprint">极速推进</span>
                <div class="skill-cd-mask" id="mask-skill-sprint"></div>
              </button>
              <button type="button" class="combat-skill-btn" id="btn-skill-vortex" title="虚空力场 [K]：潜行时为大范围虚空聚拢吸怪，非潜行时为近距虚空推斥排开敌群">
                <span class="skill-hotkey">K</span>
                <span class="skill-icon" id="icon-skill-vortex">💫</span>
                <span class="skill-name" id="name-skill-vortex">虚空推斥</span>
                <span class="skill-cost" id="cost-skill-vortex">推斥就绪</span>
                <div class="skill-cd-mask" id="mask-skill-vortex"></div>
              </button>
              <button type="button" class="combat-skill-btn" id="btn-skill-shift" title="幽灵潜行 / 退出引爆 [空格]：消耗1段充能，免疫碰撞与弹幕，穿透施印并在脱离时引爆死印">
                <span class="skill-hotkey">空格</span>
                <span class="skill-icon" id="icon-skill-shift">👻</span>
                <span class="skill-name" id="name-skill-shift">幽灵潜行</span>
                <span class="skill-cost" id="cost-skill-shift">充能驱动</span>
                <div class="skill-cd-mask" id="mask-skill-shift"></div>
              </button>`;

            skillsBar.querySelector('#btn-skill-sprint')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.triggerPhantomSprint();
            });
            skillsBar.querySelector('#btn-skill-vortex')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.triggerPhantomVortex();
            });
            skillsBar.querySelector('#btn-skill-shift')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.triggerDash();
            });
          } else {
            // Riftblade
            skillsBar.innerHTML = `
              <button type="button" class="combat-skill-btn" id="btn-skill-dash" title="折跃瞬移斩 [空格 / 右键]：超空间切割冲刺">
                <span class="skill-hotkey">空格</span>
                <span class="skill-icon">⚡</span>
                <span class="skill-name">瞬影斩</span>
                <span class="skill-cost" id="cost-skill-dash">${this.player?.dashCharges || 3}段就绪</span>
                <div class="skill-cd-mask" id="mask-skill-dash"></div>
              </button>`;
            skillsBar.querySelector('#btn-skill-dash')?.addEventListener('click', (e) => {
              if (this.isDuplicateCombatSkillClick(e)) return;
              e.stopPropagation(); this.triggerDash();
            });
          }
          // Preserve keyboard glyphs in the DOM and project the connected
          // controller's glyph onto each skill without overwriting the key.
          for (const [id, key] of [
            ['btn-skill-ward', 'x'], ['btn-skill-meteor', 'y'],
            ['btn-skill-sprint', 'x'], ['btn-skill-vortex', 'y'],
            ['btn-skill-reap', 'x'], ['btn-skill-dock', 'y'],
            ['btn-skill-blink', 'rt'], ['btn-skill-shift', 'rt'],
            ['btn-skill-dash', 'rt']
          ]) {
            const hotkey = skillsBar.querySelector('#' + id + ' .skill-hotkey');
            if (hotkey) {
              hotkey.setAttribute('data-pad-input', key);
              hotkey.setAttribute('data-pad-label', window.NeonGamepadHints?.label(key) || key);
            }
          }
        }

        // 2. Real-time updates for skill buttons
        if (shipId === 'astra') {
          const astraState = window.NeonAstra?.state(this.player);
          const wardActive = Boolean(astraState?.wardActive);
          const wardCd = astraState?.cooldowns?.ward || 0;
          const mana = Math.floor(astraState?.mana || 0);

          const wardBtn = document.getElementById('btn-skill-ward');
          const wardMask = document.getElementById('mask-skill-ward');
          if (wardBtn && wardMask) {
            if (wardActive) {
              wardBtn.classList.add('active-state');
              wardMask.style.height = '100%';
              wardMask.style.background = 'rgba(168, 85, 247, 0.45)';
              wardMask.textContent = `运转中 (${mana})`;
            } else if (wardCd > 0) {
              wardBtn.classList.remove('active-state');
              wardMask.style.height = `${Math.min(100, (wardCd / 8) * 100)}%`;
              wardMask.style.background = 'rgba(0, 0, 0, 0.76)';
              wardMask.textContent = Math.ceil(wardCd) + 's';
            } else if (mana < 20) {
              wardBtn.classList.remove('active-state');
              wardMask.style.height = '100%';
              wardMask.style.background = 'rgba(0, 0, 0, 0.55)';
              wardMask.textContent = '需20';
            } else {
              wardBtn.classList.remove('active-state');
              wardMask.style.height = '0%';
              wardMask.textContent = '';
            }
          }

          const meteorBtn = document.getElementById('btn-skill-meteor');
          const meteorMask = document.getElementById('mask-skill-meteor');
          if (meteorBtn && meteorMask) {
            if (mana < 12) {
              meteorMask.style.height = '100%';
              meteorMask.style.background = 'rgba(0, 0, 0, 0.55)';
              meteorMask.textContent = '需12';
            } else {
              meteorMask.style.height = '0%';
              meteorMask.textContent = '';
            }
          }
        } else if (shipId === 'phantom') {
          const ghostState = window.NeonPhantom?.state(this.player);
          const shiftActive = Boolean(ghostState?.shiftActive);
          const pCharges = ghostState?.dashCharges ?? 0;
          const maxC = this.player?.maxDashCharges || 2;

          // 1. [J] 幽影疾行
          const sprintCost = document.getElementById('cost-skill-sprint');
          const sprintBtn = document.getElementById('btn-skill-sprint');
          const sprintMask = document.getElementById('mask-skill-sprint');
          const sprintTimer = ghostState?.sprintTimer || 0;
          const sprintCd = ghostState?.sprintCooldown || 0;
          if (sprintCost && sprintBtn) {
            if (sprintTimer > 0) {
              sprintBtn.classList.add('active-state');
              sprintCost.textContent = `疾行中 (${sprintTimer.toFixed(1)}s)`;
              if (sprintMask) {
                sprintMask.style.height = '100%';
                sprintMask.style.background = 'rgba(0, 240, 255, 0.35)';
                sprintMask.textContent = sprintTimer.toFixed(1) + 's';
              }
            } else if (sprintCd > 0) {
              sprintBtn.classList.remove('active-state');
              sprintCost.textContent = '冷却中';
              if (sprintMask) {
                sprintMask.style.height = `${Math.min(100, (sprintCd / 4.5) * 100)}%`;
                sprintMask.style.background = 'rgba(0, 0, 0, 0.76)';
                sprintMask.textContent = sprintCd.toFixed(1) + 's';
              }
            } else {
              sprintBtn.classList.remove('active-state');
              sprintCost.textContent = '极速就绪';
              if (sprintMask) {
                sprintMask.style.height = '0%';
                sprintMask.textContent = '';
              }
            }
          }

          // 2. [K] 虚空聚拢 (潜行) / 虚空推斥 (非潜行)
          const vortexIcon = document.getElementById('icon-skill-vortex');
          const vortexName = document.getElementById('name-skill-vortex');
          const vortexCost = document.getElementById('cost-skill-vortex');
          const vortexBtn = document.getElementById('btn-skill-vortex');
          const vortexMask = document.getElementById('mask-skill-vortex');
          const vTimer = ghostState?.vortexTimer || 0;
          const vCd = ghostState?.vortexCooldown || 0;
          if (vortexCost && vortexBtn) {
            if (vortexIcon) vortexIcon.textContent = shiftActive ? '🌀' : '💫';
            if (vortexName) vortexName.textContent = shiftActive ? '虚空聚拢' : '虚空推斥';
            if (vTimer > 0) {
              vortexBtn.classList.add('active-state');
              vortexCost.textContent = shiftActive ? `聚怪中 (${vTimer.toFixed(1)}s)` : `推怪中 (${vTimer.toFixed(1)}s)`;
              if (vortexMask) {
                vortexMask.style.height = '100%';
                vortexMask.style.background = shiftActive ? 'rgba(168, 85, 247, 0.35)' : 'rgba(0, 240, 255, 0.35)';
                vortexMask.textContent = vTimer.toFixed(1) + 's';
              }
            } else if (vCd > 0) {
              vortexBtn.classList.remove('active-state');
              vortexCost.textContent = '冷却中';
              if (vortexMask) {
                vortexMask.style.height = `${Math.min(100, (vCd / 6.0) * 100)}%`;
                vortexMask.style.background = 'rgba(0, 0, 0, 0.76)';
                vortexMask.textContent = vCd.toFixed(1) + 's';
              }
            } else {
              vortexBtn.classList.remove('active-state');
              vortexCost.textContent = shiftActive ? '吸怪就绪' : '推斥就绪';
              if (vortexMask) {
                vortexMask.style.height = '0%';
                vortexMask.textContent = '';
              }
            }
          }

          // 3. [空格] 幽灵潜行 / 退出引爆
          const shiftIcon = document.getElementById('icon-skill-shift');
          const shiftName = document.getElementById('name-skill-shift');
          const shiftCost = document.getElementById('cost-skill-shift');
          const shiftBtn = document.getElementById('btn-skill-shift');
          const shiftMask = document.getElementById('mask-skill-shift');
          if (shiftName && shiftCost) {
            const gaugePct = Math.max(0, Math.min(100, Math.round(((ghostState?.stealthEnergy ?? 4.8) / Math.max(0.1, ghostState?.stealthMax || 4.8)) * 100)));
            if (shiftActive) {
              const rem = ghostState?.stealthEnergy || 0;
              shiftBtn?.classList.add('active-state');
              if (shiftIcon) shiftIcon.textContent = '💥';
              shiftName.textContent = '退出引爆';
              shiftCost.textContent = `潜行中 (${rem.toFixed(1)}s)`;
              if (shiftMask) {
                shiftMask.style.height = `${100 - gaugePct}%`;
                shiftMask.style.background = 'rgba(0, 240, 255, 0.3)';
                shiftMask.textContent = rem.toFixed(1) + 's';
              }
            } else {
              shiftBtn?.classList.remove('active-state');
              if (shiftIcon) shiftIcon.textContent = '👻';
              shiftName.textContent = '持续潜行';
              shiftCost.textContent = gaugePct >= 15
                ? `能流 ${gaugePct}%`
                : '恢复中';
              if (shiftMask) {
                shiftMask.style.height = `${100 - gaugePct}%`;
                shiftMask.style.background = 'rgba(0, 0, 0, 0.72)';
                shiftMask.textContent = gaugePct < 15 ? '恢复中' : '';
              }
            }
          }
        } else {
          const charges = this.player?.dashCharges || 0;
          const maxCharges = this.player?.maxDashCharges || 3;
          const costDash = document.getElementById('cost-skill-dash');
          if (costDash) costDash.textContent = `${charges}/${maxCharges}段就绪`;
        }
      }
    });
