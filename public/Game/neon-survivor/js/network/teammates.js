/* Small-screen team identity and off-screen marker.
 * Positioning is calculated in CSS pixels after the active camera zoom.
 * It never affects hit boxes, camera direction or network combat authority.
 */
(() => {
  'use strict';
  const colors = Object.freeze({
    auto: null, cyan: '#00f3ff', amber: '#ffbb55', violet: '#b18aff',
    mint: '#68ffd2', pink: '#ff77b7', gold: '#ffe179'
  });
  function sanitizeName(value, role = 'host') {
    const cleaned = typeof value === 'string'
      ? value.replace(/<[^>]*>/g, '').replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 12) : '';
    return cleaned || (role === 'guest' ? '队友' : '房主');
  }
  function normalizeProfile(value, role = 'host') {
    const selected = typeof value?.color === 'string' && Object.hasOwn(colors, value.color)
      ? value.color : 'auto';
    return {
      name: sanitizeName(value?.name, role),
      color: selected === 'auto' ? (role === 'host' ? colors.cyan : colors.amber) : colors[selected],
      colorId: selected
    };
  }
  function ownProfile(role = 'host') {
    const settings = window.NeonGameSettings;
    return normalizeProfile({
      name: settings?.get('playerName') || '',
      color: settings?.get('shipColor') || 'auto'
    }, role);
  }
  function markerPosition(view, camera, target, zoom = 1) {
    const width = Number(view?.width) || 0;
    const height = Number(view?.height) || 0;
    if (!target || width < 160 || height < 150) return null;
    const level = Math.max(0.65, Math.min(1.5, Number(zoom) || 1));
    const dx = ((Number(target.x) || 0) - (Number(camera.x) || 0)) * level;
    const dy = ((Number(target.y) || 0) - (Number(camera.y) || 0)) * level;
    const sx = width / 2 + dx;
    const sy = height / 2 + dy;
    const hudHeight = Math.max(0, Number(view.hudBottom) || 0);
    // Reserve at least half the label width, so pills never clip at the edge.
    const side = Math.min(86, Math.max(72, width * 0.25));
    const top = Math.min(height * 0.38, Math.max(60, hudHeight + 16));
    const bottom = Math.min(height * 0.28, height < 500 ? 76 : 118);
    const xMin = side, xMax = width - side;
    const yMin = top, yMax = height - bottom;
    if (sx >= xMin && sx <= xMax && sy >= yMin && sy <= yMax) return null;
    const vx = sx - width / 2, vy = sy - height / 2;
    if (Math.hypot(vx, vy) < 0.001) return null;
    const factor = Math.min(
      vx > 0 ? (xMax - width / 2) / vx : vx < 0 ? (xMin - width / 2) / vx : Infinity,
      vy > 0 ? (yMax - height / 2) / vy : vy < 0 ? (yMin - height / 2) / vy : Infinity
    );
    const safeFactor = Math.max(0, factor);
    return {
      x: Math.max(xMin, Math.min(xMax, width / 2 + vx * safeFactor)),
      y: Math.max(yMin, Math.min(yMax, height / 2 + vy * safeFactor)),
      angle: Math.atan2(vy, vx) * 180 / Math.PI
    };
  }
  let indicator = null;
  function ensureIndicator() {
    if (indicator?.isConnected) return indicator;
    if (typeof document === 'undefined' || !document.body) return null;
    indicator = document.getElementById('neon-teammate-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'neon-teammate-indicator';
      indicator.className = 'neon-teammate-indicator';
      indicator.setAttribute('role', 'status');
      indicator.setAttribute('aria-label', '离屏队友位置');
      indicator.hidden = true;
      const arrow = document.createElement('span');
      arrow.className = 'teammate-arrow';
      arrow.textContent = '➤';
      const icon = document.createElement('span');
      icon.className = 'teammate-ship';
      icon.textContent = '◆';
      const label = document.createElement('span');
      label.className = 'teammate-label';
      indicator.append(arrow, icon, label);
      document.body.appendChild(indicator);
    }
    return indicator;
  }
  function hide() { if (indicator) indicator.hidden = true; }
  function update(game, camera, target, own, profile, enabled = true) {
    if (!enabled || !game || !target || !own) { hide(); return; }
    const hud = document.getElementById('hud');
    const hudBottom = hud && hud.style.display !== 'none'
      ? (hud.getBoundingClientRect?.().bottom || 0) : (game.height < 500 ? 65 : 88);
    const marker = markerPosition(
      { width: game.width, height: game.height, hudBottom }, camera, target,
      game.cameraZoom || 1
    );
    if (!marker) { hide(); return; }
    const element = ensureIndicator();
    if (!element) return;
    // Respect the already resolved host/guest color, including "auto" profiles
    // (cyan for host and amber for guest).
    const matchingColor = Object.keys(colors).find(key => key !== 'auto' && colors[key] === profile?.color);
    const p = normalizeProfile({
      name: profile?.name,
      color: matchingColor || profile?.colorId || 'auto'
    }, 'guest');
    const distance = Math.round(Math.hypot(target.x - own.x, target.y - own.y));
    element.hidden = false;
    element.style.left = marker.x + 'px';
    element.style.top = marker.y + 'px';
    element.style.setProperty('--teammate-color', p.color);
    element.querySelector('.teammate-arrow').style.transform = `rotate(${marker.angle}deg)`;
    element.querySelector('.teammate-label').textContent = `${p.name} · 距离${distance}`;
  }
  window.NeonLanTeammates = Object.freeze({
    colors, sanitizeName, normalizeProfile, ownProfile,
    markerPosition, update, hide
  });
})();
