    /* HUD, weapon bar, stats tables and skill feedback. */
    NeonCore.define(NeonSurvivorGame, class {
      renderWeaponsHUD() {
        this.weaponsBar.innerHTML = '';
        const activeCatalog = this.getUpgradeCatalog(this.player);
        const slotLimits = this.getUpgradeSlotLimits(this.player);

        // Render the configured number of weapon slots for this ship.
        const rowWeapons = document.createElement('div');
        rowWeapons.className = 'equip-group';
        const weaponEntries = Object.entries(this.player.weapons);
        for (let i = 0; i < slotLimits.weapons; i++) {
          const slot = document.createElement('div');
          if (i < weaponEntries.length) {
            const [id, lvl] = weaponEntries[i];
            const def = activeCatalog.find(u => u.id === id);
            const lb = (this.player.limitBreaks && this.player.limitBreaks[id]) || 0;
            const lvlText = lb > 0 ? `L5 <span style="color:#ffea00;font-weight:900;">+${lb}</span>` : `L${lvl}`;
            slot.className = `weapon-slot active-w ${lb > 0 ? 'limit-break' : ''}`;
            slot.title = `${def ? def.name : id} 等级 ${lvl} ${lb > 0 ? `(超频破限 +${lb})` : ''}`;
            slot.innerHTML = `<span>${def ? def.icon : '🔫'}</span><span class="lvl-text">${lvlText}</span>`;
          } else {
            slot.className = 'weapon-slot empty';
            slot.title = '武器空槽位 (通过升级选择新武器)';
            slot.innerHTML = `<span style="font-size:12px;opacity:0.35">➕</span>`;
          }
          rowWeapons.appendChild(slot);
        }
        this.weaponsBar.appendChild(rowWeapons);

        // Show the full passive layout; ascension V+ locks the final slot.
        const rowPassives = document.createElement('div');
        rowPassives.className = 'equip-group';
        const passiveEntries = Object.entries(this.player.passives);
        const configuredPassives = window.NeonShips?.slotLimitsFor?.(this.player, 0)?.passives ?? 4;
        for (let i = 0; i < configuredPassives; i++) {
          const slot = document.createElement('div');
          if (i < passiveEntries.length) {
            const [id, lvl] = passiveEntries[i];
            const def = activeCatalog.find(u => u.id === id);
            const lb = (this.player.limitBreaks && this.player.limitBreaks[id]) || 0;
            const lvlText = lb > 0 ? `L5 <span style="color:#ffea00;font-weight:900;">+${lb}</span>` : `L${lvl}`;
            slot.className = `weapon-slot passive ${lb > 0 ? 'limit-break' : ''}`;
            slot.title = `${def ? def.name : id} 等级 ${lvl} ${lb > 0 ? `(超频破限 +${lb})` : ''}`;
            slot.innerHTML = `<span>${def ? def.icon : '🔮'}</span><span class="lvl-text" style="color:${lb > 0 ? '#ffea00' : '#d37aff'}">${lvlText}</span>`;
          } else {
            const locked = i >= slotLimits.passives;
            slot.className = 'weapon-slot empty';
            slot.title = locked ? '进阶 V：该模组槽已锁定' : '模组空槽位 (通过升级选择新模组)';
            slot.innerHTML = locked ? '<span style="font-size:11px;opacity:0.55">🔒</span>' : '<span style="font-size:11px;opacity:0.3">🔷</span>';
          }
          rowPassives.appendChild(slot);
        }
        this.weaponsBar.appendChild(rowPassives);
      }

      /** Mirror ship-owned dash/blink state onto the player.
       *
       * updateHUD() also performs this mirror, but the HUD DOM pass is
       * throttled to protect frame time, and dash charges are gameplay state:
       * they must never lag behind the authoritative ship object.
       */
      syncShipHudState() {
        const shipId = this.player?.shipId;
        if (shipId === 'astra') {
          const astraState = window.NeonAstra?.state(this.player);
          if (astraState) {
            this.player.maxDashCharges = Math.min(4, 2 + (astraState.warpUpgrades.star_gate || 0));
            this.player.dashCharges = astraState.blinkCharges;
            this.player.dashRechargeTimer = astraState.blinkRecharge;
          }
        } else if (shipId === 'phantom') {
          const ghostState = window.NeonPhantom?.state(this.player);
          if (ghostState) {
            this.player.maxDashCharges = Math.min(4, 2 + (ghostState.warpUpgrades?.charge_overflow || this.player.dashUpgrades?.charge_overflow || 0));
            this.player.dashCharges = ghostState.dashCharges;
            this.player.dashRechargeTimer = ghostState.dashRecharge;
          }
        }
      }

      updateHUD() {
        const isAstra = this.player?.shipId === 'astra';
        const isPhantom = this.player?.shipId === 'phantom';
        const astraState = isAstra ? window.NeonAstra?.state(this.player) : null;
        if (astraState) {
          this.player.maxDashCharges = Math.min(4, 2 + (astraState.warpUpgrades.star_gate || 0));
          this.player.dashCharges = astraState.blinkCharges;
          this.player.dashRechargeTimer = astraState.blinkRecharge;
        }
        const ghostState = isPhantom ? window.NeonPhantom?.state(this.player) : null;
        if (ghostState) {
          this.player.maxDashCharges = Math.min(4, 2 + (ghostState.warpUpgrades?.charge_overflow || this.player.dashUpgrades?.charge_overflow || 0));
          this.player.dashCharges = ghostState.dashCharges;
          this.player.dashRechargeTimer = ghostState.dashRecharge;
        }
        const ectoPanel = document.getElementById('phantom-ecto-hud');
        if (ectoPanel) {
          ectoPanel.hidden = true; // 永久隐藏灵质条
        }
        const dockPanel = document.getElementById('phantom-touch-actions');
        if (dockPanel) {
          dockPanel.hidden = !isPhantom || (!this.lanCoop?.ally && !this.lanCoop?.latest?.host);
          const control = document.getElementById('phantom-dock-action');
          if (control) {
            control.textContent = ghostState?.docked ? '脱离共生 Q' : '共生合体 Q';
            control.disabled = this.state === 'playing' ?
              !this.lanCoop?.ally : !this.lanCoop?.latest?.host;
          }
        }
        const manaPanel = document.getElementById('astra-mana-hud');
        if (manaPanel) {
          manaPanel.hidden = !isAstra;
          if (isAstra && astraState) {
            const manaLabel = document.getElementById('astra-mana-text');
            const manaFill = document.getElementById('astra-mana-fill');
            const maxMana = Math.max(1, astraState.maxMana || 100);
            const shieldObj = this.player.astraTempShield;
            const activeShield = shieldObj && shieldObj.value > 0 && shieldObj.remaining > 0
              ? Math.ceil(shieldObj.value) : 0;
            const veilSuffix = (astraState.phaseVeilRemaining || 0) > 0 ? ' · 折光减伤' : '';
            const shieldSuffix = activeShield > 0
              ? ` · 🛡️护盾 ${activeShield}`
              : '';
            if (manaLabel) manaLabel.textContent =
              '星能 ' + Math.floor(astraState.mana) + '/' + maxMana + shieldSuffix + veilSuffix;
            if (manaFill) manaFill.style.width =
              Math.round(Math.max(0, Math.min(1, astraState.mana / maxMana)) * 100) + '%';
          }
        }
        this.hudLevel.textContent = `${this.player.level} 级`;
        const hpPct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
        this.hudHp.style.width = `${hpPct}%`;
        if (this.hudHp.parentElement) {
          const shieldVal = this.player.astraTempShield && this.player.astraTempShield.value > 0 && this.player.astraTempShield.remaining > 0
            ? ` | 星能护盾: ${Math.ceil(this.player.astraTempShield.value)}` : '';
          this.hudHp.parentElement.title = `生命值: ${Math.round(this.player.hp)}/${this.player.maxHp}${shieldVal} (自愈: +${this.player.regen.toFixed(1)}/s)`;
        }

        // Dynamic Dash Segments HUD (3–9 charges)
        const dashContainer = document.getElementById('dash-segments');
        const maxCharges = this.player.maxDashCharges || 3;
        const charges = this.player.dashCharges;
        const rechargeProgress = charges < maxCharges
          ? (this.player.dashRechargeTimer / (isAstra ? 5 : isPhantom ? (window.NeonPhantom?.getDashRechargeTime?.(this.player, ghostState) || 4.8) : this.getEffectiveDashRecharge())) * 100
          : 0;

        if (dashContainer) {
          if (isPhantom) {
            const ghost = this.player.phantom;
            const gaugePct = Math.max(0, Math.min(100, ((ghost?.stealthEnergy ?? 4.8) / Math.max(0.1, ghost?.stealthMax || 4.8)) * 100));
            if (!dashContainer.querySelector?.('.phantom-continuous-track')) {
              dashContainer.innerHTML = `
                <div class="dash-segment phantom-continuous-track" style="width:100%;height:100%;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;">
                  <div class="dash-segment-fill" id="phantom-continuous-fill" style="width:${gaugePct}%;height:100%;background:linear-gradient(90deg, #a855f7, #00f0ff);border-radius:4px;"></div>
                </div>`;
            } else {
              const fillEl = document.getElementById('phantom-continuous-fill');
              if (fillEl) fillEl.style.width = `${gaugePct}%`;
            }
          } else {
            if (dashContainer.children.length !== maxCharges || dashContainer.querySelector?.('.phantom-continuous-track')) {
              dashContainer.innerHTML = '';
              for (let k = 0; k < maxCharges; k++) {
                const seg = document.createElement('div');
                seg.className = 'dash-segment';
                const fill = document.createElement('div');
                fill.className = 'dash-segment-fill';
                fill.id = `dash-seg-${k}`;
                seg.appendChild(fill);
                dashContainer.appendChild(seg);
              }
            }

            for (let i = 0; i < maxCharges; i++) {
              const segFill = document.getElementById(`dash-seg-${i}`);
              if (segFill) {
                if (i < charges) {
                  segFill.style.width = '100%';
                } else if (i === charges) {
                  segFill.style.width = `${Math.min(100, Math.max(0, rechargeProgress))}%`;
                } else {
                  segFill.style.width = '0%';
                }
              }
            }
          }
        }

        const touchDashBtn = document.getElementById('touch-dash-btn');
        if (touchDashBtn) {
          const dashLabel = touchDashBtn.querySelector('.dash-key-label');
          const dashCount = touchDashBtn.querySelector('.dash-key-count');
          if (this.player.shipId === 'phantom') {
            const ghost = this.player.phantom;
            const shiftActive = Boolean(ghost?.shiftActive);
            const gaugePct = Math.max(0, Math.min(100, Math.round(((ghost?.stealthEnergy ?? 4.8) / Math.max(0.1, ghost?.stealthMax || 4.8)) * 100)));
            // A finished shift always leaves a short materialise lockout, so the
            // button must read as unavailable even when the gauge is already full.
            const shiftLocked = !shiftActive && (ghost?.shiftLockUntil || 0) > (this.survivalTime || 0);
            if (dashLabel) dashLabel.textContent = shiftActive ? '引爆' : (shiftLocked ? '显形' : '潜行');
            if (dashCount) dashCount.textContent = `${gaugePct}%`;
            touchDashBtn.style.setProperty('--dash-fill', `${gaugePct}%`);
            touchDashBtn.classList.toggle('dash-empty', !shiftActive && (shiftLocked || (ghost?.stealthEnergy || 0) < 0.35));
            touchDashBtn.setAttribute('aria-label', shiftActive ? '退出潜行引爆死印'
              : shiftLocked ? '显形冷却中，暂时无法再次潜行'
              : `持续潜行：${gaugePct}%能流可用`);
          } else {
            if (dashLabel && dashLabel.textContent !== '折跃') dashLabel.textContent = '折跃';
            if (dashCount) {
              const countText = `${charges}/${maxCharges}`;
              if (dashCount.textContent !== countText) dashCount.textContent = countText;
            }
            const fraction = Math.max(0, Math.min(1, charges / Math.max(1, maxCharges)));
            touchDashBtn.style.setProperty('--dash-fill', `${Math.round(fraction * 100)}%`);
            touchDashBtn.classList.toggle('dash-empty', charges === 0);
            touchDashBtn.setAttribute('aria-label', `折跃冲刺：${charges}/${maxCharges}段可用`);
          }
        }

        const statTextEl = document.getElementById('dash-stat-text');
        if (statTextEl) {
          if (isPhantom) {
            const ghost = this.player.phantom;
            const gaugePct = Math.max(0, Math.min(100, Math.round(((ghost?.stealthEnergy ?? 4.8) / Math.max(0.1, ghost?.stealthMax || 4.8)) * 100)));
            const lvl = this.player.level || 1;
            const scale = window.NeonPhantom?.attackScale?.(this.player) || 1;
            const coreBonus = (ghost?.passiveUpgrades?.phantom_core || this.player.passives?.phantom_core || 0) * 0.12;
            const detonBonus = (ghost?.warpUpgrades?.soul_detonation || this.player.dashUpgrades?.soul_detonation || 0) * 0.40;
            const reapDmg = Math.round((52 + (lvl - 1) * 5.5) * (1 + detonBonus) * (1 + coreBonus) * scale);
            const curEnergy = ghost?.stealthEnergy || 0;
            const lockLeft = (ghost?.shiftLockUntil || 0) - (this.survivalTime || 0);
            const lockBadge = !ghost?.shiftActive && lockLeft > 0
              ? ` | 🌫️ 显形 ${lockLeft.toFixed(1)}s` : '';
            statTextEl.innerHTML = `👻 持续潜行 ${gaugePct}% | 💥 死印 ~${reapDmg} | ⏱️ 持续${curEnergy.toFixed(1)}s${lockBadge}`;
          } else {
            // HUD shows the current uncritical hit value (including global level scaling).
            const slashD = Math.round((this.player.dashSlashDmg || 95) * this.getLevelDmgMult());
            const cd = this.getEffectiveDashRecharge().toFixed(1);
            let extraBadges = [];
            if (this.player.hasAegis) extraBadges.push(`🛡️光环${this.player.aegisDuration.toFixed(2)}s`);
            if (this.player.hasDashBlast) extraBadges.push('💥爆轰');
            if (this.player.hasFireTrail) extraBadges.push('🔥火墙');
            if (this.player.hasDashCryo) extraBadges.push('❄️冰封');

            const totalDashLb = ((this.player.limitBreaks && this.player.limitBreaks['dash_dmg']) || 0)
                              + ((this.player.limitBreaks && this.player.limitBreaks['dash_aegis']) || 0)
                              + ((this.player.limitBreaks && this.player.limitBreaks['dash_blast']) || 0);
            const lbStr = totalDashLb > 0 ? ` <span style="color:#ffea00;font-weight:900;">(+${totalDashLb}破限)</span>` : '';
            const extraStr = extraBadges.length > 0 ? ` | ${extraBadges.join(' ')}` : '';
            statTextEl.innerHTML = `⚡ ${maxCharges}段 | ⚔️ ${slashD}${lbStr} | ⏱️ ${cd}s | 精准连击×${this.player.dashCombo || 0}${extraStr}`;
          }
        }

        const xpPct = (this.player.xp / this.player.xpNeeded) * 100;
        this.hudXp.style.width = `${xpPct}%`;

        const mins = Math.floor(this.survivalTime / 60);
        const secs = Math.floor(this.survivalTime % 60);
        this.hudTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.hudKills.textContent = this.kills;
        this.hudCrystals.textContent = this.player.crystals;

        // Boss HUD
        if (this.currentBoss && this.currentBoss.hp > 0) {
          this.bossHud.style.display = 'flex';
          const bossPct = (this.currentBoss.hp / this.currentBoss.maxHp) * 100;
          this.bossHpFill.style.width = `${Math.max(0, bossPct)}%`;
        } else {
          this.bossHud.style.display = 'none';
        }

        // Update real-time tactical skills & ship status HUD
        this.updateCombatSkillsDock();
      }

      renderStatsTable(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const mins = Math.floor(this.survivalTime / 60);
        const secs = Math.floor(this.survivalTime % 60);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // High scores storage with SafeStorage (resilient under file:// protocol)
        const prevBestTime = parseFloat(SafeStorage.get('neon_best_time', 0));
        const prevBestKills = parseInt(SafeStorage.get('neon_best_kills', 0));
        const bestTimeSec = Math.max(this.survivalTime, isNaN(prevBestTime) ? 0 : prevBestTime);
        const bestKillsNum = Math.max(this.kills, isNaN(prevBestKills) ? 0 : prevBestKills);
        SafeStorage.set('neon_best_time', bestTimeSec);
        SafeStorage.set('neon_best_kills', bestKillsNum);

        const bMins = Math.floor(bestTimeSec / 60);
        const bSecs = Math.floor(bestTimeSec % 60);
        const bestTimeStr = `${bMins.toString().padStart(2, '0')}:${bSecs.toString().padStart(2, '0')}`;

        // Ships that register their own deck (astra, phantom) are absent from the
        // global UPGRADES_DB, so this must resolve through the ACTIVE catalog.
        // Looking only at UPGRADES_DB printed raw internal ids in the pause,
        // game-over and victory tables ("star_weave Lv.1" instead of "星梭织阵 Lv.1").
        const activeCatalog = this.getUpgradeCatalog?.(this.player) || UPGRADES_DB;
        let weaponNames = Object.keys(this.player.weapons).map(id => {
          const def = activeCatalog.find(u => u.id === id);
          return `${def ? def.name : id} Lv.${this.player.weapons[id]}`;
        }).join(', ');
        const rogue = this.endlessMode && this.endlessState ? this.endlessState : null;
        const rogueStats = rogue ? `
          <div class="stat-row"><span class="lbl">无尽阶段</span><span class="val">${rogue.stage || 1}</span></div>
          <div class="stat-row"><span class="lbl">遗物 / 融合</span><span class="val">${rogue.relics.length} / ${rogue.fusions.length}</span></div>
          <div class="stat-row"><span class="lbl">战术事件成功</span><span class="val">${rogue.eventsWon} / ${rogue.eventsDone}</span></div>` : '';

        el.innerHTML = `
          <div class="stat-row"><span class="lbl">生存时间</span><span class="val">${timeStr}</span></div>
          ${rogueStats}
          <div class="stat-row"><span class="lbl">进阶难度</span><span class="val">${this.getDifficultyRules().name}</span></div>
          <div class="stat-row"><span class="lbl">无敌覆盖率</span><span class="val">${(100 * this.combatTelemetry.invulnerableSeconds / Math.max(1, this.survivalTime)).toFixed(1)}%</span></div>
          <div class="stat-row"><span class="lbl">精准折跃 / 毁灭掉落</span><span class="val">${this.combatTelemetry.preciseDashes} / ${this.combatTelemetry.nukeDrops}</span></div>
          <div class="stat-row"><span class="lbl">每秒平均输出</span><span class="val">${Math.round(this.totalDamageDealt / Math.max(1, this.survivalTime)).toLocaleString()}</span></div>
          <div class="stat-row"><span class="lbl">本局累计承伤</span><span class="val">${Math.round(this.combatTelemetry.damageTaken)}</span></div>
          <div class="stat-row"><span class="lbl">历史最长生存</span><span class="val" style="color:#ffaa00">🏆 ${bestTimeStr}</span></div>
          <div class="stat-row"><span class="lbl">本局击杀</span><span class="val">${this.kills}</span></div>
          <div class="stat-row"><span class="lbl">最高击杀纪录</span><span class="val" style="color:#ffaa00">👑 ${bestKillsNum}</span></div>
          <div class="stat-row"><span class="lbl">达到等级</span><span class="val">LV.${this.player.level}</span></div>
          <div class="stat-row"><span class="lbl">能量核采集</span><span class="val">${this.player.crystals}</span></div>
          <div class="stat-row" style="grid-column: span 2;"><span class="lbl">总造成伤害</span><span class="val">${Math.floor(this.totalDamageDealt).toLocaleString()}</span></div>
          <div class="stat-row" style="grid-column: span 2;"><span class="lbl">装配武器</span><span class="val">${weaponNames || '无'}</span></div>
        `;
      }

      isDuplicateCombatSkillClick(event) {
        const lastTouchAt = Number(event.currentTarget?.dataset?.neonSkillTouchedAt);
        return Number.isFinite(lastTouchAt) &&
          lastTouchAt > 0 &&
          event.detail !== 0 &&
          performance.now() - lastTouchAt < 450;
      }

      notifySkillFeedback(text, color = '#00f3ff') {
        if (this.player && Array.isArray(this.texts) && this.texts.length < 40) {
          this.texts.push({
            x: this.player.x,
            y: this.player.y - 45,
            text,
            color,
            size: 15,
            life: 1.0,
            maxLife: 1.0
          });
        }
      }
    });
