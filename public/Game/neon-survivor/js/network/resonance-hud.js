/* The co-op link badge: one small HUD element that says what the proximity
 * bonus currently is, and why it is not bigger.
 *
 * WHY IT EXISTS
 * The link's entire presentation used to be a dashed line and a line of small
 * canvas text drawn by hand inside coop.js. There was no HUD element at all, so
 * a player had no way to tell an 8% damage bonus from nothing -- and in the one
 * pairing that received nothing (two Phantoms) the text was an EMPTY string,
 * leaving only a dashed line.
 *
 * It reads whatever the caller has: the host passes the live link, a guest
 * passes the snapshot's `resonance` block. Both carry the same field names, so
 * there is one formatter.
 *
 * The DOM is written only when the rendered text changes: this is called once
 * per rendered frame, and the countdown only moves about once a second.
 */
(() => {
  'use strict';
  const BADGE_ID = 'neon-link-badge';
  let element = null;
  let lastText = null;
  let lastTier = -1;

  function ensure() {
    if (element?.isConnected) return element;
    if (typeof document === 'undefined' || !document.body) return null;
    element = document.getElementById(BADGE_ID);
    if (!element) {
      element = document.createElement('div');
      element.id = BADGE_ID;
      element.className = 'neon-link-badge';
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'off');
      element.hidden = true;
      document.body.appendChild(element);
    }
    return element;
  }

  /** `info` is a link result or a snapshot `resonance` block, or null when there
   *  is no partner at all. `role` only affects the wording. */
  function update(info, role = 'host') {
    const node = ensure();
    if (!node) return false;
    const tier = Math.max(0, Math.min(2, Math.floor(info?.tier || 0)));
    if (tier <= 0) {
      // Solo play has no badge; a co-op player out of range is told to close up.
      const text = role === 'solo' ? '' : '🔗 联动中断 · 靠近队友';
      if (!text) { node.hidden = true; lastText = null; lastTier = -1; return false; }
      if (text !== lastText) {
        node.textContent = text;
        node.dataset.tier = '0';
        lastText = text;
        lastTier = 0;
      }
      node.hidden = false;
      return true;
    }
    const parts = [`🔗 联动 ${tier === 2 ? 'Ⅱ' : 'Ⅰ'}`];
    if (info.damageBonus > 0) parts.push(`+${Math.round(info.damageBonus * 100)}% 攻击`);
    if (info.critBonus > 0) parts.push(`+${Math.round(info.critBonus * 100)}% 暴击`);
    if (info.shieldSource) {
      const seconds = Math.max(0, Math.ceil(info.shieldNext || 0));
      const own = Math.round(role === 'host' ? (info.shieldHost || 0) : (info.shieldGuest || 0));
      parts.push(seconds > 0 ? `护盾 ${seconds}s` : `护盾 ${own}`);
    }
    const text = parts.join(' · ');
    if (text !== lastText) {
      node.textContent = text;
      lastText = text;
    }
    if (tier !== lastTier) {
      node.dataset.tier = String(tier);
      lastTier = tier;
    }
    node.hidden = false;
    return true;
  }

  function hide() {
    if (element) element.hidden = true;
    lastText = null;
    lastTier = -1;
  }

  window.NeonLanResonanceHud = Object.freeze({ BADGE_ID, update, hide });
})();
