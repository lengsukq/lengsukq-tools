/* Ship picker is a consumer of the registry, never a list of ship IDs.
 * A new playable directory automatically appears on the next generated build.
 */
(() => {
  'use strict';
  function render(game) {
    const root = document.getElementById('neon-ship-selector');
    if (!root || !window.NeonShips) return;
    const ships = window.NeonShips.list();
    if (!ships.some(ship => ship.id === game.selectedShipId)) {
      game.selectedShipId = window.NeonShips.DEFAULT_SHIP_ID;
    }
    root.replaceChildren();
    const heading = document.createElement('div');
    heading.textContent = '选择战舰 · 各战舰独立能力与折跃体系';
    heading.style.cssText = 'font-weight:800;color:#00f3ff;margin-bottom:10px;';
    root.appendChild(heading);
    const choices = document.createElement('div');
    choices.className = 'neon-ship-options';
    for (const ship of ships) {
      const button = document.createElement('button');
      button.type = 'button';
      const selected = ship.id === game.selectedShipId;
      button.textContent = ship.name;
      button.title = ship.description;
      button.className = 'neon-ship-choice';
      button.setAttribute('data-selected', String(selected));
      button.setAttribute('data-code', ship.code);
      button.setAttribute('data-detail', ship.description);
      button.setAttribute('data-specs',
        `HP ${ship.baseStats.hp}   ·   移动 ${ship.baseStats.speed}   ·   ${ship.baseStats.dashCharges}段折跃`);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${ship.name}：${ship.description}`);
      button.onclick = () => {
        game.selectedShipId = ship.id;
        render(game);
      };
      choices.appendChild(button);
    }
    root.appendChild(choices);
    const locked = window.NeonShips.list(false).filter(ship => !ship.playable);
    if (locked.length) {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:11px;color:#879ab7;margin-top:9px;';
      info.textContent = `开发中（未开放）：${locked.map(ship => ship.name).join('、')}`;
      root.appendChild(info);
    }
  }
  window.NeonShipSelection = Object.freeze({ render });
})();
