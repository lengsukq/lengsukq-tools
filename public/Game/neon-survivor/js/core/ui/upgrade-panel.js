    /* Level-up card markup and selection state. */
    /* Chinese labels for the card rarity badge. The badge used to print the raw
     * internal tokens ("common"/"rare"/"legendary") and the English literals
     * "WARP UPGRADE" / "STEALTH UPGRADE" / "LIMIT BREAK" straight into the UI.
     * The domain is closed: ships.js registerUpgradeCatalog rejects any rarity
     * outside these three, and UPGRADES_DB only ever uses them. */
    const NEON_RARITY_LABELS = Object.freeze({
      common: '普通', rare: '稀有', legendary: '传说'
    });
    NeonCore.define(NeonSurvivorGame, class {
      renderUpgradeChoices(choices) {
        this.upgradeGrid.innerHTML = '';
        this.pendingUpgradeId = null;
        this.currentUpgradeChoices = choices;
        const weights = window.NeonUpgradeRarity?.weights(this.difficulty);
        const subtitle = this.modalLevelup?.querySelector?.('.modal-sub');
        if (subtitle && weights) {
          const total = weights.common + weights.rare + weights.legendary;
          const pct = tier => (100 * weights[tier] / total).toFixed(1).replace(/\.0$/, '');
          subtitle.textContent = `各稀有度均可选时：普通 ${pct('common')}% · 稀有 ${pct('rare')}% · 传说 ${pct('legendary')}%（抽空后重分配）` +
            (choices.some(card => card.pityGuaranteed) ? ' · 已触发10级传说保底' : '');
        }
        const weaponCount = Object.keys(this.player.weapons).length;
        const passiveCount = Object.keys(this.player.passives).length;
        const slotLimits = this.getUpgradeSlotLimits(this.player);

        choices.forEach(upg => {
          const isDash = upg.type === 'dash';
          const isLb = upg.type === 'limit_break';
          const isWeapon = upg.type === 'weapon' || upg.subType === 'weapon';
          const curLvl = isDash
            ? ((this.player.dashUpgrades && this.player.dashUpgrades[upg.id]) || 0)
            : (isWeapon ? (this.player.weapons[upg.id] || 0) : (this.player.passives[upg.id] || 0));
          const nextLvl = curLvl + 1;
          const nextText = upg.statText[nextLvl - 1] || upg.statText[0] || '属性全面提升';

          const isNew = curLvl === 0 && !isLb && !isDash;
          let badgeText = '';
          let badgeColor = '#00f3ff';
          if (isDash) {
            if (this.player.shipId === 'phantom') {
              badgeText = `👻 潜行特化 ➔ Lv.${nextLvl}`;
              badgeColor = '#c084fc';
            } else {
              badgeText = `⚡ 折跃特化 ➔ Lv.${nextLvl}`;
              badgeColor = '#00f3ff';
            }
          } else if (isLb) {
            badgeText = `⚡ 破限 +${upg.lbCount}`;
            badgeColor = '#ffea00';
          } else if (isNew) {
            badgeText = isWeapon ? `✨ 新武器 (已用 ${weaponCount}/${slotLimits.weapons})` :
              `🔷 新模组 (已用 ${passiveCount}/${slotLimits.passives})`;
            badgeColor = '#00ffaa';
          } else {
            badgeText = `强化 ➔ Lv.${nextLvl}`;
          }

          const card = document.createElement('div');
          card.upgradeId = upg.id;
          card.setAttribute?.('role', 'button');
          card.setAttribute?.('tabindex', upg.alreadyChosen || this.upgradeSession?.picked?.has(upg.id) ? '-1' : '0');
          card.setAttribute?.('aria-pressed', 'false');
          const alreadyPicked = upg.alreadyChosen || this.upgradeSession?.picked.has(upg.id);
          card.className = `upgrade-card ${upg.rarity} ${isLb ? 'limit-break' : ''} ${isDash ? 'dash-card' : ''} ${alreadyPicked ? 'picked' : ''}`;
          const dashTag = this.player?.shipId === 'phantom' ? '潜行强化' : '折跃强化';
          card.innerHTML = `
            <div class="rarity-tag" style="${upg.pityGuaranteed ? 'color:#ffd700;background:rgba(255,215,0,0.25);' : (isLb ? 'color:#ffd700;background:rgba(255,215,0,0.25);' : (isDash ? 'color:#00f3ff;background:rgba(0,243,255,0.2);' : ''))}">${upg.pityGuaranteed ? '★ 传说保底' : (isDash ? dashTag : (isLb ? '超频破限' : (NEON_RARITY_LABELS[upg.rarity] || '普通')))}</div>
            <div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-card-info">
              <div class="upgrade-name">${upg.name}</div>
              <div class="upgrade-desc">${upg.desc}</div>
              <div class="upgrade-lvl" style="color:${badgeColor};font-weight:700;">${badgeText}</div>
              <div class="upgrade-stat-text" style="color:${isLb ? '#ffd700' : (isDash ? '#00f3ff' : '#9cb0d0')};">⚡ ${nextText}</div>
            </div>
          `;

          card.onclick = () => {
            this.selectUpgradePreview(upg);
          };
          card.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              this.selectUpgradePreview(upg);
            }
          };
          if (this.endlessMode && this.endlessUpgradeBanishes > 0) {
            const banish = document.createElement('button');
            banish.type = 'button';
            banish.textContent = '禁用此项';
            banish.title = '本局不再出现此项升级';
            banish.style.cssText = 'margin-top:9px;padding:5px 10px;border:1px solid #f66;color:#ffb9b9;background:#341827;border-radius:7px;font-size:11px;cursor:pointer;';
            banish.onclick = event => {
              event.stopPropagation();
              this.banishEndlessUpgrade(upg.id);
            };
            card.appendChild(banish);
          }

          this.upgradeGrid.appendChild(card);
        });
        this.refreshUpgradeControls();
        const parent = this.upgradeGrid.parentNode;
        let controls = document.getElementById('endless-upgrade-actions');
        if (!controls && parent) {
          controls = document.createElement('div');
          controls.id = 'endless-upgrade-actions';
          controls.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0 0;';
          parent.appendChild(controls);
        }
        if (controls) {
          controls.replaceChildren();
          controls.style.display = this.endlessMode ? 'flex' : 'none';
          if (this.endlessMode) {
            const addAction = (caption, action, disabled = false) => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = caption;
              btn.disabled = disabled;
              btn.style.cssText = 'border:1px solid #337f9c;background:#122b3e;color:#c9edff;border-radius:10px;padding:8px 14px;cursor:pointer;opacity:' + (disabled ? '.4' : '1');
              btn.onclick = action;
              controls.appendChild(btn);
            };
            addAction('重随 Y · ' + this.endlessUpgradeRerolls, () => this.rerollEndlessUpgrade(), this.endlessUpgradeRerolls <= 0);
            addAction('跳过 · +12晶体', () => this.skipEndlessUpgrade());
            const label = document.createElement('span');
            label.style.cssText = 'font-size:11px;color:#9fb5c9;align-self:center;';
            label.textContent = '禁用余量 ' + this.endlessUpgradeBanishes + '（手柄X禁用选中卡）';
            controls.appendChild(label);
          }
        }
      }
    });
