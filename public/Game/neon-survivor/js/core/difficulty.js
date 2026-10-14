    /* Ascension tiers: rules, slot limits and progress records. */
    NeonCore.define(NeonSurvivorGame, class {
      getDifficultyRules() {
        return NEON_DIFFICULTIES[this.difficulty || 0];
      }

      getUpgradeSlotLimits(player = this.player) {
        return window.NeonShips?.slotLimitsFor?.(player, this.difficulty) || {
          weapons: 4, passives: this.difficulty >= 5 ? 3 : 4,
          warp: 7, activeSkills: 0
        };
      }

      getPassiveSlotLimit(player = this.player) {
        return this.getUpgradeSlotLimits(player).passives;
      }

      getEffectiveDashRecharge() {
        // Even maximum haste must leave a meaningful gap between protective dashes.
        return Math.max(0.70, this.player.dashRechargeTime * this.player.cdrMultiplier);
      }

      renderDifficultySelector() {
        const el = document.getElementById('neon-difficulty-selector');
        if (!el) return;
        const accessible = Math.max(0, this.unlockedDifficulty);
        el.innerHTML = `<div style="color:#00f3ff;font-weight:800;margin-bottom:8px">进阶难度 <small style="color:#9cb0d0">(通关逐阶解锁，规则叠加)</small></div>
          <div id="neon-difficulty-buttons" style="display:flex;gap:6px;flex-wrap:wrap"></div>
          <div id="neon-difficulty-description" style="font-size:12px;color:#bbc9e0;margin-top:9px"></div>`;
        const buttons = el.querySelector('#neon-difficulty-buttons');
        NEON_DIFFICULTIES.forEach((tier, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.disabled = index > accessible;
          button.textContent = index === 0 ? '标准' : `进阶 ${index}${index > accessible ? ' 🔒' : ''}`;
          button.style.cssText = `border:1px solid ${index === this.selectedDifficulty ? '#00f3ff' : '#43516d'};border-radius:9px;padding:8px 9px;background:${index === this.selectedDifficulty ? '#12394e' : '#151b30'};color:${index > accessible ? '#65738c' : '#eaf7ff'};cursor:${index > accessible ? 'not-allowed' : 'pointer'};font-size:12px`;
          button.onclick = () => this.selectDifficulty(index);
          buttons.appendChild(button);
        });
        el.querySelector('#neon-difficulty-description').textContent =
          `${NEON_DIFFICULTIES[this.selectedDifficulty].name}：${NEON_DIFFICULTIES[this.selectedDifficulty].rule}。当前解锁至进阶 ${accessible}。`;
      }

      selectDifficulty(index) {
        if (this.state !== 'start' && this.state !== 'gameover' && this.state !== 'victory') return;
        if (!Number.isInteger(index) || index < 0 || index > this.unlockedDifficulty || index > 6) return;
        this.selectedDifficulty = index;
        SafeStorage.set('neon_difficulty_selected', String(index));
        this.renderDifficultySelector();
      }

      saveRunResults(won) {
        const key = 'neon_ascension_records_v2';
        let records = {};
        try { records = JSON.parse(SafeStorage.get(key, '{}')) || {}; } catch (e) { records = {}; }
        const index = String(this.difficulty);
        const record = records[index] || { wins: 0, attempts: 0, bestKills: 0, bestSeconds: 0 };
        record.attempts++;
        if (won) record.wins++;
        record.bestKills = Math.max(record.bestKills, this.kills);
        record.bestSeconds = Math.max(record.bestSeconds, this.survivalTime);
        records[index] = record;
        SafeStorage.set(key, JSON.stringify(records));
        if (won) {
          this.unlockedDifficulty = Math.max(this.unlockedDifficulty, Math.min(6, this.difficulty + 1));
          SafeStorage.set('neon_ascension_unlocked', String(this.unlockedDifficulty));
          this.renderDifficultySelector();
        }
      }
    });
