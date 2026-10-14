    /* Pause-screen loadout: what is equipped and what each piece actually does.
     *
     * The stats table answers "how am I doing"; this answers "what am I
     * carrying". Both are rendered into the same pause modal, and the same
     * accessors used elsewhere in the UI are reused here:
     *
     *   - card names, icons and per-level effect text come from the ACTIVE
     *     catalog (getUpgradeCatalog), never from UPGRADES_DB directly, because
     *     astra and phantom register their own decks and are absent from it;
     *   - the live action buttons are read straight out of the combat dock, so
     *     the skill names, hotkeys and effect text cannot drift from the dock
     *     the player actually taps. There is no second copy of that copy.
     *
     * Everything degrades quietly: a missing dock, an unknown card id or an
     * empty bag produces a shorter panel, never a raw internal id or
     * "undefined".
     */
    /* Card copy is authored in this repo rather than by the player, but the
     * panel is built from strings, so escape on the way in anyway. */
    const escHtml = value => String(value ?? '').replace(/[&<>]/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
    const escAttr = value => escHtml(value).replace(/"/g, '&quot;');
    NeonCore.define(NeonSurvivorGame, class {
      /** One equipped card: icon, name, level, current effect, next-level tease. */
      loadoutCardMarkup(def, id, level, limitBreak, type) {
        const maxLvl = Math.max(1, def?.maxLvl || 5);
        const text = Array.isArray(def?.statText) ? def.statText : [];
        const current = text[Math.min(level, maxLvl) - 1] || def?.desc || '';
        const next = level < maxLvl ? text[level] : null;
        const rarity = def?.rarity || 'common';
        const lb = limitBreak > 0
          ? `<span class="loadout-lb" title="超频破限：超出常规上限的额外强化">+${limitBreak} 破限</span>` : '';
        const maxed = level >= maxLvl
          ? '<span class="loadout-maxed">已满级</span>' : '';
        return `
          <article class="loadout-card ${escAttr(rarity)}" data-loadout-id="${escAttr(id)}" data-loadout-type="${escAttr(type)}">
            <div class="loadout-card-head">
              <span class="loadout-icon">${escHtml(def?.icon || '◆')}</span>
              <span class="loadout-name">${escHtml(def?.name || '未知装备')}</span>
              <span class="loadout-lvl">Lv.${level}</span>
            </div>
            <div class="loadout-tags">${maxed}${lb}</div>
            ${current ? `<p class="loadout-effect">${escHtml(current)}</p>` : ''}
            ${next ? `<p class="loadout-next">下一级 · ${escHtml(next)}</p>` : ''}
          </article>`;
      }

      /** A dashed placeholder so the player can see how much room is left. */
      loadoutEmptyMarkup(label) {
        return `<article class="loadout-card is-empty"><div class="loadout-card-head">
          <span class="loadout-icon">＋</span>
          <span class="loadout-name">${escHtml(label)}</span>
        </div></article>`;
      }

      loadoutSectionMarkup(title, cards, emptySlots, emptyLabel, count = null) {
        if (!cards.length && emptySlots <= 0) return '';
        const slots = cards.slice();
        for (let i = cards.length; i < emptySlots; i++) slots.push(this.loadoutEmptyMarkup(emptyLabel));
        const badge = count === null ? ''
          : `<span class="loadout-count">${escHtml(count)}</span>`;
        return `<section class="loadout-section">
          <h3 class="loadout-heading">${escHtml(title)}${badge}</h3>
          <div class="loadout-grid">${slots.join('')}</div>
        </section>`;
      }

      /** Card-backed bag (weapons, passives, warp specialisations). */
      loadoutBagSection(title, bag, type, slotLimit, emptyLabel) {
        const catalog = this.getUpgradeCatalog?.(this.player) || UPGRADES_DB;
        const limitBreaks = this.player?.limitBreaks || {};
        const entries = Object.entries(bag || {});
        const cards = entries.map(([id, level]) => this.loadoutCardMarkup(
          catalog.find(card => card.id === id), id, level, limitBreaks[id] || 0, type));
        const slots = Math.max(0, slotLimit);
        // "used/available" only means something where slots are a real limit.
        return this.loadoutSectionMarkup(title, cards, slots, emptyLabel,
          `${cards.length}/${Math.max(cards.length, slots)}`);
      }

      /** Live skill/action buttons, read from the combat dock the player taps. */
      loadoutSkillSection() {
        const bar = document.getElementById('ship-skills-bar');
        const buttons = bar?.querySelectorAll?.('.combat-skill-btn') || [];
        const cards = [];
        for (const button of buttons) {
          const name = button.querySelector?.('.skill-name')?.textContent?.trim();
          if (!name) continue;
          const icon = button.querySelector?.('.skill-icon')?.textContent?.trim() || '◆';
          const hotkey = button.querySelector?.('.skill-hotkey')?.textContent?.trim() || '';
          // The dock's title is "<name> [<key>]：<effect>"; the name and key are
          // already shown, so only the effect sentence is repeated here.
          const title = button.getAttribute?.('title') || '';
          const effect = title.includes('：') ? title.slice(title.indexOf('：') + 1) : title;
          cards.push(`
            <article class="loadout-card is-skill">
              <div class="loadout-card-head">
                <span class="loadout-icon">${escHtml(icon)}</span>
                <span class="loadout-name">${escHtml(name)}</span>
                ${hotkey ? `<span class="loadout-key">${escHtml(hotkey)}</span>` : ''}
              </div>
              ${effect ? `<p class="loadout-effect">${escHtml(effect)}</p>` : ''}
            </article>`);
        }
        // Actions are not slot-limited, so no "used/available" badge.
        return this.loadoutSectionMarkup('🎮 技能与操作', cards, 0, '', null);
      }

      /** Endless-mode relics and fusions: also "effects", also worth showing. */
      loadoutRogueSection() {
        const state = this.endlessState;
        if (!this.endlessMode || !state) return '';
        const cards = [];
        const relicDefs = window.NeonRogueRelics?.definitions || [];
        for (const id of state.relics || []) {
          const def = relicDefs.find(entry => entry.id === id);
          if (!def) continue;
          cards.push(`
            <article class="loadout-card is-relic">
              <div class="loadout-card-head">
                <span class="loadout-icon">🏺</span>
                <span class="loadout-name">${escHtml(def.name)}</span>
              </div>
              <p class="loadout-effect">${escHtml(def.desc)}</p>
            </article>`);
        }
        const fusionDefs = window.NeonRogueFusions?.recipes || [];
        for (const id of state.fusions || []) {
          const def = fusionDefs.find(entry => entry.id === id);
          if (!def) continue;
          cards.push(`
            <article class="loadout-card is-fusion">
              <div class="loadout-card-head">
                <span class="loadout-icon">🧬</span>
                <span class="loadout-name">${escHtml(def.name)}</span>
                <span class="loadout-lb">融合</span>
              </div>
              <p class="loadout-effect">${escHtml(def.desc)}</p>
            </article>`);
        }
        return this.loadoutSectionMarkup('♾️ 遗物与融合', cards, 0, '', String(cards.length));
      }

      renderLoadoutPanel(elementId = 'pause-loadout') {
        const el = document.getElementById(elementId);
        if (!el || !this.player) return;
        const limits = this.getUpgradeSlotLimits?.(this.player) ||
          { weapons: 4, passives: 4, warp: 7 };
        const ship = window.NeonShips?.get?.(this.player.shipId);
        const warpTitle = { riftblade: '⚡ 折跃强化', astra: '✨ 相位强化',
          phantom: '👻 潜行强化' }[this.player.shipId] || '⚡ 位移强化';
        const shipLine = ship?.name
          ? `<div class="loadout-ship">${escHtml(ship.name)}${
            ship.description ? ` · ${escHtml(ship.description)}` : ''}</div>` : '';
        el.innerHTML = shipLine + [
          this.loadoutBagSection('⚔️ 武器', this.player.weapons, 'weapon',
            limits.weapons, '空槽位 · 升级时可装入新武器'),
          this.loadoutBagSection('🔷 模组', this.player.passives, 'passive',
            limits.passives, '空槽位 · 升级时可装入新模组'),
          this.loadoutBagSection(warpTitle, this.player.dashUpgrades, 'dash',
            limits.warp, '空槽位 · 升级时可装入新强化'),
          this.loadoutSkillSection(),
          this.loadoutRogueSection()
        ].filter(Boolean).join('');
      }
    });
