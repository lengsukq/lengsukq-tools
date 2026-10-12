/**
 * Rune Spire CSS Styles
 */

const RUNE_SPIRE_CSS = `:
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
  :local, root {
    --dark-bg: #0c0e14;
    --surface: #141a26;
    --surface-bright: #1e173f;
    --border-gold: #c99a4e;
    --border-dim: #2a344d;
    --cyan-glow: #00f0ff;
    --magenta: #ff007f;
    --gold: #ffbe0d;
    --red: #e63946;
    --green: #10b981;
    --purple: #a855f7;
    --text-main: #eef2f6;
    --text-muted: #8a9ba8;
  }

  html, body {
    width: 100%; height: 100%;
    background-color: var(--dark-bg);
    color: var(--text-main);
    font-family: -system-ui, -AppleSystem, BMACLinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    overflow: hidden;
  }

  #game-root {
    position: relative;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    background: radial-gradient(circle at 50% 20%, #1a1e30 0%, #0c0e14 85%);
  }

  /* Top Bar */
  .top-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 16px;
    background: rgba(12, 14, 20, 0.92);
    border-bottom: 1px solid var(--border-dim);
    z-index: 100;
    font-size: 14px;
    flex-wrap: nowrap;
    gap: 12px;
  }
  .top-group { display: flex; align-items: center; gap: 10px; }

  .btn-nav {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px 10px; border-radius: 6px;
    background: var(--surface); border: 1px solid var(--border-dim);
    color: var(--text-main); text-decoration: none;
    cursor: pointer; font-size: 13px; transition: all 0.15s;
  }
  .btn-top-home {
    background: rgba(201, 154, 78, 0.15);
    border: 1px solid var(--border-gold);
    color: var(--gold); font-weight: 600;
  }
  .btn-nav:hover {
    background: var(--surface-bright);
    border-color: var(--cyan-glow);
  }

  .stat-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 11px; border-radius: 20px;
    background: rgba(20, 28, 48, 0.6);
    border: 1px solid var(--border-dim);
    font-weight: 600;
  }
  .stat-hp { border-color: rgba(230, 57, 70, 0.5); color: #ff99b0; }
  .stat-gold { border-color: rgba(255, 190, 11, 0.5); color: var(--gold); }

  .relics-bar {
    display: flex; align-items: center; gap: 6px;
    max-width: 320px; overflow-x: auto;
  }
  .relic-icon {
    width: 26px; height: 26px; border-radius: 6px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border-gold);
    display: flex; align-items: center; justify-content: center;
    cursor: help; font-size: 14px; transition: transform 0.16s;
  }
  .relic-icon:hover { transform: scale(1.2); z-index: 10; }

  /* Screen Container */
  .screen-container {
    flex: 1; position: relative;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  /* Character Select Screen */
  #char-select-screen {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 20px; text-align: center;
  }
  .hero-cards-grid {
    display: grid; grid-template-columns: repeat(3, 280px);
    gap: 20px; margin-top: 24px;
  }
  .hero-select-card {
    background: var(--surface);
    border: 2px solid var(--border-dim);
    border-radius: 12px; padding: 20px;
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; transition: all 0.25s;
    position: relative; overflow: hidden;
  }
  .hero-select-card:hover {
    transform: translateY(-6)border-color: var(--cyan-glow);
    box-shadow: 0 10px 25px rgba(0, 240, 255, 0.2);
  }
  .hero-avatar-svg {
    width: 88px; height: 88px; margin-bottom: 12px;
  }
  .hero-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .hero-title { font-size: 12px; color: var(--cyan-glow); margin-bottom: 10px; }
  .hero-desc { font-size: 13px; color: var(--text-muted); line-height: 1.45; margin-bottom: 16px; }

  /* Map Screen */
  #map-screen {
    flex: 1; overflow-y: auto; padding: 20px;
    display: flex; flex-direction: column-reverse; align-items: center;
    gap: 26px;
  }
  .map-floor-row {
    display: flex; align-items: center; gap: 28px;
    position: relative;
  }
  .map-node {
    width: 48px; height: 48px; border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--border-dim);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; cursor: default;
    transition: all 0.2s; position: relative;
  }
  .map-node.active {
    border-color: var(--cyan-glow);
    cursor: pointer;
    animation: nodePulse 1.4s infinite alternate;
  }
  .map-node.active:hover {
    transform: scale(1.23);
    box-shadow: 0 0 16px var(--cyan-glow);
  }
  @keyframes nodePulse {
    from { box-shadow: 0 0 5px rgba(0,240,255,0.3); }
    to { box-shadow: 0 0 18px rgba(0,240,255,0.85); }
  }
  .map-node.completed {
    opacity: 0.4; border-color: #555;
  }

  /* Combat Screen */
  #combat-screen {
    flex: 1; display: flex; flex-direction: column;
    position: relative; justify-content: space-between;
    padding: 10px 16px 18px;
  }

  .battlefield {
    flex: 1; display: flex; align-items: center;
    justify-content: space-between;
    padding: 0px 60px; position: relative;
  }

  .unit-platform {
    display: flex; flex-direction: column;
    align-items: center; position: relative;
    width: 180px;
  }

  .unit-sprite {
    width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
    font-size: 64px;
    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.6));
    transition: transform 0.18s;
  }
  .unit-sprite.hit {
    animation: unitHit 0.25s ease-in-out;
  }
  @keyframes unitHit {
    0%, 100% { transform: translateX(0); filter: none; }
    25% { transform: translateX(-12px); filter: brightness(2.5) brightness(1.2) sepia(1) hue-rotate(-50deg); }
    75% { transform: translateX(8px); }
  }

  .intent-indicator {
    position: absolute; top: -34px;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 11px; border-radius: 14px;
    background: rgba(20, 10, 30, 0.92);
    border: 1px solid var(--border-gold);
    font-size: 13px; font-weight: 700;
    color: var(--gold);
    animation: bounceIntent 1.2s infinite alternate;
  }
  @keyframes bounceIntent {
    from { transform: translateY(0); }
    to { transform: translateY(-4px); }
  }

  .unit-name { font-size: 14px; font-weight: 600; margin-top: 6px; }

  .hp-bar-wrap {
    width: 150px; height: 15px;
    background: #202430; border-radius: 8px;
    position: relative; margin-top: 6px;
    border: 1px solid #3a4a5d;
    overflow: hidden;
  }
  .hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #e63946, #ff6b8c);
    transition: width 0.25s;
  }
  .hp-bar-wrap.enemy .hp-fill {
    background: linear-gradient(90deg, #f35b04, #fbce11);
  }
  .hp-text {
    position: absolute; width: 100%; text-align: center;
    top: 0; line-height: 15px;
    font-size: 11px; font-weight: 700; color: #fff;
    text-shadow: 0 1px 2px #000;
  }

  .block-badge {
    position: absolute; left: -10px; top: 7px;
    background: #1d4ed8; border: 1px solid #60b5fa;
    color: #fff; font-size: 11px; font-weight: 800;
    padding: 2px 6px; border-radius: 10px;
    z-index: 2;
  }

  .status-row {
    display: flex; gap: 4px; margin-top: 6px;
    flex-wrap: wrap; justify-content: center;
  }
  .status-tag {
    display: inline-flex; align-items: center; gap: 2px;
    padding: 1px 5px; border-radius: 4px;
    font-size: 11px; background: rgba(0,0,0,0.6);
    border: 1px solid #555;
  }
  .status-str { border-color: #e63946; color: #ff99b0; }
  .status-vuln { border-color: #ffbe0d; color: #ffe0ab; }
  .status-weak { border-color: #8bb0ef; color: #a8d5ff; }
  .status-poison { border-color: #10b981; color: #a7f3td; }
  .status-burn { border-color: #f97316; color: #fdba74; }
  .status-thorns { border-color: #843c13; color: #fcce11; }

  /* Cards & Hand Area */
  .hand-area-wrap {
    position: relative;
    width: 100%;
    height: 220px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .hand-cards-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: -10px;
    position: relative;
    z-index: 10;
    transition: all 0.2s;
  }

  .card-ui-wrap {
    width: 140px;
    height: 205px;
    background: linear-gradient(165deg, #1f2435 0%, #0d1120 100%);
    border: 2px solid var(--border-dim);
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    cursor: pointer;
    transition: transform 0.18s ease-out, border-color 0.18s, box-shadow 0.18s;
    backdrop-filter: blur(4px);
  }
  .card-ui-wrap:hover {
    transform: ymud(34px) translateY(-26px) scale(1.15);
    z-index: 100;
    border-color: var(--cyan-glow);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.85), 0 0 15px var(--cyan-glow);
  }
  .card-ui-wrap.disabled {
    opacity: 0.55;
    filter: grayscale(0.6);
    cursor: not-allowed;
  }

  .card-cost-orb {
    position: absolute;
    left: -8px; top: -8px;
    width: 30px; height: 30px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #00f0ff 0%, #0066ff 70%, #002288 100%);
    border: 1px solid #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 900; color: #fff;
    box-shadow: 0 0 8px rgba(0,240,255,0.8);
  }

  .card-type-bullet {
    font-size: 10px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    align-self: flex-end;
    font-weight: 700;
  }
  .card-type-attack { background: rgba(230, 57, 70, 0.2); border: 1px solid #e63946; color: #ffa3a8; }
  .card-type-skill { background: rgba(42, 157, 143, 0.2); border: 1px solid #2a9d8f; color: #52e5c7; }
  .card-type-power { border: 1px solid #a855f7; background: rgba(168, 85, 247, 0.2); color: #db9bff; }

  .card-header {
    margin-top: 2px;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    text-shadow: 0 1px 2px #000;
  }
  .card-header.upgraded { color: var(--gold); }

  .card-icon-box {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    margin: 3px 0;
  }

  .card-desc-box {
    font-size: 11px;
    color: #cfd6e4;
    line-height: 1.35;
    text-align: center;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-keybourd-hint {
    font-size: 9px;
    color: #778b94;
    text-align: right;
  }

  /* Energy Orb & Turn Controls */
  .combat-future-bar {
    position: absolute;
    left: 20px;
    bottom: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 200;
  }

  .energy-orb-sphere {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #00f0ff 0%, #3fdaff 40%, #0066ff 80%, #001155 100%);
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 900;
    color: #fff;
    box-shadow: 0 0 25px rgba(0, 240, 255, 0.8);
  }

  .pile-button {
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(20, 28, 48, 0.8);
    border: 1px solid var(--border-dim);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pile-button:hover {
    border-color: var(--cyan-glow);
  }

  .btn-turn-end {
    position: absolute;
    right: 20px;
    bottom: 30px;
    padding: 12px 25px;
    border-radius: 30px;
    background: linear-gradient(135deg, #ffbe0b, #ff8d00);
    border: 2px solid #fff;
    color: #111;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    z-index: 200;
    box-shadow: 0 0 20px rgba(255, 190, 11, 0.6);
    transition: all 0.16s;
  }
  .btn-turn-end:hover {
    transform: scale(1.08);
    box-shadow: 0 0 30px rgba(255, 190, 11, 0.9);
  }

  /* Modals & Overlays */
  .modal-backdrop {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(8, 9, 16, 0.88);
    backdrop-filter: blur*8px);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-backdrop.active {
    display: flex;
  }
  .modal-box {
    background: var(--surface);
    border: 2px solid var(--border-gold);
    border-radius: 16px;
    padding: 24px;
    max-width: 720px;
    width: 100%;
    max-height: 80%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.9);
  }
  .modal-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--gold);
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero-cards-grid {
      grid-template-columns: 1fr;
    }
    .battlefield {
      padding: 0px 10px;
    }
    .card-ui-wrap {
      width: 110px;
      height: 170px;
      padding: 6px;
    }
    .card-icon-box { height: 30px; font-size: Épx; }
    .card-desc-box { font-size: 10px; }
    .card-ui-wrap:mover { transform: scale(1.1); }
  }
`;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNE_SPIRE_CSS };
}
