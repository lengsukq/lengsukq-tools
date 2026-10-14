    /* One level-up session: preview, confirm, reroll, banish and carry-over. */
    NeonCore.define(NeonSurvivorGame, class {
      triggerLevelUp() {
        if ((this.pendingLevelUps || 0) <= 0) return;
        this.pendingUpgradeId = null;
        this.upgradeSession = { picked: new Set(), capacity: Math.min(3, this.pendingLevelUps) };
        const count = this.getUpgradeChoiceCount();
        const catalog = this.getUpgradeCatalog(this.player);
        const eligible = catalog.filter(u =>
          this.isUpgradeAvailableFor(this.player, u, this.banishedUpgrades));

        // If all standard upgrades are maxed, activate infinite Limit Break!
        this.levelupEligible = eligible;
        let choices = [];
        if (eligible.length === 0) {
          choices = this.getLimitBreakChoices(count);
        } else {
          choices = window.NeonUpgradeRarity?.pickForPilot(
            eligible, count, this.difficulty, this.player, catalog) ||
            [...eligible].sort(() => Math.random() - 0.5).slice(0, count);
          if (choices.length < count) {
            const lbChoices = this.getLimitBreakChoices(count);
            for (const lbc of lbChoices) {
              if (choices.length < count && !choices.some(c => c.id === lbc.id)) {
                choices.push(lbc);
              }
            }
          }
        }

        // Host and guest independently roll cards in the same paused phase.
        this.lanCoop?.prepareGuestUpgrade?.();
        this.state = 'levelup';
        this.gamepadSelectedUpgradeIdx = 0;
        try { this.sound.playLevelUp(); } catch (e) {}
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 20,
          maxRadius: 180,
          alpha: 1,
          color: '#9d00ff'
        });

        this.renderUpgradeChoices(choices);
        if (this.modalLevelup) this.modalLevelup.classList.add('active');
      }

      rerollEndlessUpgrade() {
        if (!this.endlessMode || this.state !== 'levelup' || this.endlessUpgradeRerolls <= 0) return false;
        this.endlessUpgradeRerolls--;
        this.gamepadSelectedUpgradeIdx = 0;
        this.renderUpgradeChoices(this.nextEndlessUpgradeChoices());
        return true;
      }

      banishEndlessUpgrade(id) {
        if (!this.endlessMode || this.state !== 'levelup' || this.endlessUpgradeBanishes <= 0) return false;
        if (this.upgradeSession?.picked.has(id)) return false;
        if (this.banishedUpgrades.has(id) || !(this.currentUpgradeChoices || []).some(c => c.id === id)) return false;
        this.endlessUpgradeBanishes--;
        this.banishedUpgrades.add(id);
        this.gamepadSelectedUpgradeIdx = 0;
        this.renderUpgradeChoices(this.nextEndlessUpgradeChoices());
        return true;
      }

      skipEndlessUpgrade() {
        if (!this.endlessMode || this.state !== 'levelup' || this.pendingUpgradeId) return false;
        this.player.crystals += 12;
        this.pendingLevelUps = Math.max(0, (this.pendingLevelUps || 1) - 1);
        // One opportunity is exchanged for crystals; the rest stay banked.
        return this.finishUpgradeSelection();
      }

      finishUpgradeSelection() {
        if (this.state !== 'levelup') return false;
        if (this.pendingUpgradeId) return false; // A preview is not a confirmed upgrade.
        this.upgradeSession = null;
        this.modalLevelup?.classList.remove('active');
        if (!this.lanCoop?.waitForGuestUpgrade?.()) {
          this.state = 'playing';
          this.lastTime = performance.now();
        }
        this.gamepadCombatInputLocked = true;
        return true;
      }

      selectUpgradePreview(upgrade) {
        if (!upgrade || !(this.currentUpgradeChoices || []).some(item => item.id === upgrade.id) ||
            upgrade.alreadyChosen || this.upgradeSession?.picked?.has(upgrade.id)) return false;
        if (typeof this.onUpgradePick !== 'function' &&
            ((this.state !== 'levelup') || (this.pendingLevelUps || 0) <= 0 ||
              (this.upgradeSession && this.upgradeSession.picked.size >= this.upgradeSession.capacity) ||
              (upgrade.type !== 'limit_break' &&
                !this.isUpgradeAvailableFor(this.player, upgrade, this.banishedUpgrades)))) return false;
        this.pendingUpgradeId = upgrade.id;
        const index = this.currentUpgradeChoices.findIndex(item => item.id === upgrade.id);
        if (index >= 0) this.gamepadSelectedUpgradeIdx = index;
        this.refreshUpgradePreview();
        return true;
      }

      refreshUpgradePreview() {
        for (const card of Array.from(this.upgradeGrid?.children || [])) {
          if (!card.upgradeId) continue;
          const selected = this.pendingUpgradeId === card.upgradeId;
          card.className = (card.className || '').replace(/\s*selected-pending\b/g, '') +
            (selected ? ' selected-pending' : '');
          card.setAttribute?.('aria-pressed', String(selected));
        }
        this.refreshUpgradeControls();
      }

      cancelUpgradePreview() {
        if (!this.pendingUpgradeId) return false;
        this.pendingUpgradeId = null;
        this.refreshUpgradePreview();
        return true;
      }

      confirmUpgradePreview() {
        const id = this.pendingUpgradeId;
        const upgrade = (this.currentUpgradeChoices || []).find(item => item.id === id);
        if (!upgrade || upgrade.alreadyChosen || this.upgradeSession?.picked?.has(id)) return false;
        if (typeof this.onUpgradePick === 'function') {
          // Guest sends the choice ONLY after explicit confirmation. Keep the
          // preview if the DataChannel is unavailable so it can be retried.
          if (this.onUpgradePick(upgrade) !== true) return false;
          this.pendingUpgradeId = null;
          return true;
        }
        if (this.state !== 'levelup' || (this.pendingLevelUps || 0) <= 0 ||
            (this.upgradeSession && this.upgradeSession.picked.size >= this.upgradeSession.capacity) ||
            (upgrade.type !== 'limit_break' &&
              !this.isUpgradeAvailableFor(this.player, upgrade, this.banishedUpgrades))) {
          this.cancelUpgradePreview();
          return false;
        }
        try {
          if (upgrade.type === 'limit_break') this.applyLimitBreak(upgrade);
          else this.applyUpgrade(upgrade);
        } catch (error) {
          console.error('Upgrade application error caught:', error);
          return false;
        }
        this.pendingUpgradeId = null;
        this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
        this.upgradeSession?.picked?.add(id);
        const committedCard = Array.from(this.upgradeGrid?.children || [])
          .find(card => card.upgradeId === id);
        if (committedCard) {
          committedCard.className = (committedCard.className || '')
            .replace(/\s*selected-pending\b/g, '') + ' picked';
          committedCard.setAttribute?.('tabindex', '-1');
        }
        const session = this.upgradeSession;
        const hasMore = this.currentUpgradeChoices?.some(option =>
          !session?.picked?.has(option.id) &&
          (option.type === 'limit_break' ||
            this.isUpgradeAvailableFor(this.player, option, this.banishedUpgrades)));
        if (this.pendingLevelUps <= 0 ||
            (session && session.picked.size >= session.capacity) || !hasMore) {
          this.finishUpgradeSelection();
        } else {
          this.refreshUpgradePreview();
        }
        return true;
      }

      refreshUpgradeControls() {
        const parent = this.upgradeGrid?.parentNode;
        if (!parent) return;
        let controls = parent.querySelector?.('#upgrade-bank-actions');
        if (!controls) {
          controls = document.createElement('div');
          controls.id = 'upgrade-bank-actions';
          controls.className = 'upgrade-bank-actions';
          parent.appendChild(controls);
        }
        controls.replaceChildren();
        const credits = this.onUpgradePick ? this.guestUpgradeCredits : this.pendingLevelUps;
        const chosen = this.onUpgradePick ? this.guestUpgradeChosen : this.upgradeSession?.picked?.size || 0;
        const cap = this.onUpgradePick ? this.guestUpgradeCapacity : this.upgradeSession?.capacity || 1;
        const info = document.createElement('span');
        info.textContent = `本轮 ${chosen}/${cap} 次 · 剩余 ${credits || 0} 次强化机会（可保留）`;
        controls.appendChild(info);
        const pending = (this.currentUpgradeChoices || []).find(card => card.id === this.pendingUpgradeId);
        const selection = document.createElement('span');
        selection.className = 'upgrade-preview-label';
        selection.textContent = pending ? `待确认：${pending.name}（尚未生效）` : '先点选卡片，再点击确定升级';
        controls.appendChild(selection);
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'upgrade-confirm-btn';
        confirm.textContent = '确定升级';
        confirm.disabled = !pending;
        confirm.onclick = () => this.confirmUpgradePreview();
        confirm.setAttribute?.('data-gamepad-action', 'rt');
        const confirmHint = window.NeonGamepadHints?.keyBadge('rt');
        if (confirmHint) confirm.appendChild(confirmHint);
        controls.appendChild(confirm);
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'upgrade-cancel-btn';
        cancel.textContent = '取消选择';
        cancel.disabled = !pending;
        cancel.onclick = () => this.cancelUpgradePreview();
        cancel.setAttribute?.('data-gamepad-action', 'b');
        const cancelHint = window.NeonGamepadHints?.keyBadge('b');
        if (cancelHint) cancel.appendChild(cancelHint);
        controls.appendChild(cancel);
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = credits ? `保留剩余 ${credits} 次并继续` : '完成选择';
        button.disabled = Boolean(pending);
        button.onclick = () => {
          if (this.pendingUpgradeId) return false;
          return this.onUpgradeFinish ? this.onUpgradeFinish() : this.finishUpgradeSelection();
        };
        button.setAttribute?.('data-gamepad-action', 'y');
        const bankHint = window.NeonGamepadHints?.keyBadge('y');
        if (bankHint) button.appendChild(bankHint);
        controls.appendChild(button);
        const hints = document.createElement('div');
        hints.className = 'neon-gamepad-hint-row';
        const hint = window.NeonGamepadHints;
        if (hint) {
          hints.append(
            hint.prompt('十字键 / 摇杆上下左右选卡', 'dpad'), hint.prompt('预选', 'a'),
            hint.prompt(this.endlessMode ? '放逐' : '快速确认', 'x'),
            hint.prompt('快速确认', 'rt'),
            hint.prompt('取消预选', 'b'),
            hint.prompt(this.endlessMode ? '重掷' : '保留机会', 'y')
          );
          controls.appendChild(hints);
        }
      }
    });
