/* Ship picker is a consumer of the registry, never a list of ship IDs.
 * A new playable directory automatically appears on the next generated build.
 */
(() => {
  'use strict';

  let animFrameId = null;
  let previewItems = [];

  const ARCHETYPES = {
    riftblade: {
      tag: '突击 · 极速折跃',
      color: '#00f3ff',
      weapon: '初始主武：脉冲歼灭炮',
      perk: '特性：3段折跃瞬杀斩，纳米自愈与高速突防'
    },
    astra: {
      tag: '秘术 · 织界星穹',
      color: '#c084fc',
      weapon: '初始主武：星梭织阵 (自导追踪飞弹)',
      perk: '特性：自导追踪飞弹，闪现爆发加速放风筝，天界神圣屏障与苍穹星陨轰炸'
    },
    phantom: {
      tag: '刺客 · 虚空共生',
      color: '#00f0ff',
      weapon: '初始主武：噬魂灵球',
      perk: '特性：持续虚无潜行 (4.8s)、锁定灵球光圈减速、虚空聚怪/推斥动能护盾与死印殉爆'
    }
  };

  function render(game) {
    const root = document.getElementById('neon-ship-selector');
    if (!root || !window.NeonShips) return;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    previewItems = [];

    const ships = window.NeonShips.list();
    if (!ships.some(ship => ship.id === game.selectedShipId)) {
      game.selectedShipId = window.NeonShips.DEFAULT_SHIP_ID;
    }

    root.replaceChildren();

    // 1. Section Heading (Preserved for compatibility and clear hierarchy)
    const heading = document.createElement('div');
    heading.className = 'neon-hangar-heading';
    heading.textContent = '机库战舰全息整备 · 选择参战座驾';
    root.appendChild(heading);

    // 2. Ship Choice Cards Grid
    const choices = document.createElement('div');
    choices.className = 'neon-ship-options';

    for (const ship of ships) {
      const button = document.createElement('button');
      button.type = 'button';
      const selected = ship.id === game.selectedShipId;
      button.title = ship.description;
      button.className = 'neon-ship-choice';
      button.setAttribute('data-selected', String(selected));
      button.setAttribute('data-code', ship.code);
      button.setAttribute('data-detail', ship.description);
      button.setAttribute('data-specs',
        `生命值 ${ship.baseStats.hp}   ·   航速 ${ship.baseStats.speed}   ·   ${ship.baseStats.dashCharges}段折跃`);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${ship.name}：${ship.description}`);

      button.onclick = () => {
        game.selectedShipId = ship.id;
        render(game);
      };

      // Set textContent directly (required for mock tests and a11y)
      button.textContent = ship.name;

      // In real DOM with classList support, render full rich holographic card structure
      if (typeof button.classList !== 'undefined') {
        // This fallback is the documented path for a newly added ship directory,
        // so it must never print the raw internal weapon id. Resolve the display
        // name through the ship's own registered deck and degrade to a generic
        // label rather than leaking a token like "star_weave".
        const deck = window.NeonShips?.upgradeCatalogFor?.({ shipId: ship.id });
        const startingWeaponName = deck?.find?.(card => card.id === ship.startingWeapon)?.name;
        const info = ARCHETYPES[ship.id] || {
          tag: '深空特制战机',
          color: '#38bdf8',
          weapon: `初始主武：${startingWeaponName || '战舰专属武器'}`,
          perk: ship.description
        };

        const cardInner = document.createElement('div');
        cardInner.className = 'neon-ship-card-inner';

        // Top Hologram Viewport
        const holoWrap = document.createElement('div');
        holoWrap.className = 'neon-ship-holo-wrap';

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 96;
        canvas.className = 'neon-ship-holo-canvas';
        holoWrap.appendChild(canvas);

        const holoGrid = document.createElement('div');
        holoGrid.className = 'neon-ship-holo-grid';
        holoWrap.appendChild(holoGrid);

        cardInner.appendChild(holoWrap);

        if (typeof canvas.getContext === 'function') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            previewItems.push({ canvas, ctx, ship, color: info.color });
          }
        }

        // Header Title & Tag Badge
        const titleRow = document.createElement('div');
        titleRow.className = 'neon-ship-title-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'neon-ship-name-text';
        nameSpan.textContent = ship.name;
        titleRow.appendChild(nameSpan);

        const tagSpan = document.createElement('span');
        tagSpan.className = 'neon-ship-tag-pill';
        tagSpan.textContent = info.tag;
        titleRow.appendChild(tagSpan);

        cardInner.appendChild(titleRow);

        // Tactical Specs Chips Row
        const specsRow = document.createElement('div');
        specsRow.className = 'neon-ship-specs-row';

        const hpChip = document.createElement('span');
        hpChip.className = 'neon-spec-chip';
        hpChip.textContent = `❤️ 生命值 ${ship.baseStats.hp}`;
        specsRow.appendChild(hpChip);

        const spdChip = document.createElement('span');
        spdChip.className = 'neon-spec-chip';
        spdChip.textContent = `🚀 航速 ${ship.baseStats.speed}`;
        specsRow.appendChild(spdChip);

        const dashChip = document.createElement('span');
        dashChip.className = 'neon-spec-chip';
        dashChip.textContent = ship.id === 'phantom'
          ? '👻 持续潜行'
          : (ship.id === 'astra' ? `✨ ${ship.baseStats.dashCharges}段闪现` : `⚡ ${ship.baseStats.dashCharges}段折跃`);
        specsRow.appendChild(dashChip);

        cardInner.appendChild(specsRow);

        // Weapon & Playstyle Perks
        const perkRow = document.createElement('div');
        perkRow.className = 'neon-ship-perk-row';

        const weaponSpan = document.createElement('div');
        weaponSpan.className = 'neon-ship-weapon-label';
        weaponSpan.textContent = info.weapon;
        perkRow.appendChild(weaponSpan);

        const perkSpan = document.createElement('div');
        perkSpan.className = 'neon-ship-perk-detail';
        perkSpan.textContent = info.perk;
        perkRow.appendChild(perkSpan);

        cardInner.appendChild(perkRow);

        // Status Ribbon
        const statusRibbon = document.createElement('div');
        statusRibbon.className = 'neon-ship-status-ribbon';
        statusRibbon.textContent = selected ? '⚡ 战舰已就绪' : '点击指派此战舰';
        cardInner.appendChild(statusRibbon);

        button.replaceChildren(cardInner);
      }

      choices.appendChild(button);
    }

    root.appendChild(choices);

    // 3. Locked Ships Hint
    const locked = window.NeonShips.list(false).filter(ship => !ship.playable);
    if (locked.length) {
      const info = document.createElement('div');
      info.className = 'neon-hangar-locked-info';
      info.textContent = `机库研发中（未开放）：${locked.map(ship => ship.name).join('、')}`;
      root.appendChild(info);
    }

    // 4. Start preview animation loop
    if (previewItems.length > 0 && typeof requestAnimationFrame === 'function') {
      function tick(now) {
        const modal = typeof document !== 'undefined' ? document.getElementById('modal-start') : null;
        if (!modal || !modal.classList.contains('active')) {
          animFrameId = null;
          return;
        }

        const timeSec = now * 0.001;
        for (const item of previewItems) {
          const { canvas, ctx, ship, color } = item;
          const isSelected = ship.id === game.selectedShipId;
          const w = canvas.width;
          const h = canvas.height;

          ctx.clearRect(0, 0, w, h);

          // Hangar circular launch-pad reticle
          ctx.save();
          ctx.translate(w / 2, h / 2);

          ctx.strokeStyle = isSelected ? 'rgba(0, 243, 255, 0.28)' : 'rgba(120, 160, 210, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle crosshair ticks
          ctx.beginPath();
          ctx.moveTo(-38, 0); ctx.lineTo(-32, 0);
          ctx.moveTo(32, 0); ctx.lineTo(38, 0);
          ctx.moveTo(0, -38); ctx.lineTo(0, -32);
          ctx.moveTo(0, 32); ctx.lineTo(0, 38);
          ctx.stroke();

          // Fighter Hull Hovering
          const seed = (ship.id.charCodeAt(0) || 0) * 0.1;
          const hoverY = Math.sin(timeSec * 2.2 + seed) * 2.5;
          const swayAngle = Math.sin(timeSec * 1.6 + seed) * 0.05;

          ctx.save();
          ctx.translate(0, hoverY);
          ctx.rotate(-Math.PI / 2 + swayAngle);
          ctx.scale(1.15, 1.15);

          if (window.NeonShips?.drawHull) {
            window.NeonShips.drawHull(ctx, {
              shipId: ship.id,
              downed: false,
              aimAngle: 0
            }, {
              color,
              name: ship.name
            });
          }
          ctx.restore();

          ctx.restore();

          // Dynamic scanline
          const scanY = (now * 0.05) % h;
          ctx.fillStyle = isSelected ? 'rgba(0, 243, 255, 0.08)' : 'rgba(140, 180, 230, 0.03)';
          ctx.fillRect(0, scanY, w, 2);
        }

        animFrameId = requestAnimationFrame(tick);
      }

      animFrameId = requestAnimationFrame(tick);
    }
  }

  window.NeonShipSelection = Object.freeze({ render });
})();
