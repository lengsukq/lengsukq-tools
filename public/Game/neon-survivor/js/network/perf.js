/* Opt-in guest-side FPS diagnostics: append ?perf=1 to the game URL.
 * No observers or DOM updates during normal play.
 */
(() => {
  'use strict';
  function create(game) {
    if (!/(?:\?|&)perf=1(?:&|$)/.test(window.location?.search || '')) return null;
    const label = document.createElement('div');
    label.id = 'neon-lan-perf';
    label.setAttribute('aria-label', '联机性能诊断');
    label.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top, 0px) + 145px);' +
      'right:calc(env(safe-area-inset-right, 0px) + 8px);z-index:90;' +
      'background:rgba(5,15,27,.88);color:#a7f8e8;border:1px solid #4d8a9d;' +
      'border-radius:7px;padding:7px 9px;font:12px/1.5 monospace;' +
      'pointer-events:none;white-space:pre;text-align:right';
    document.body.appendChild(label);
    let frames = 0, packets = 0, totalMs = 0, peakMs = 0;
    let lastUpdate = performance.now(), lastPacket = 0;
    return {
      packet(now) { packets++; lastPacket = now; },
      frame(start, end) {
        const cost = Math.max(0, end - start);
        frames++;
        totalMs += cost;
        peakMs = Math.max(peakMs, cost);
        const elapsed = end - lastUpdate;
        if (elapsed < 1000) return;
        const fps = frames * 1000 / elapsed;
        const rate = packets * 1000 / elapsed;
        const age = lastPacket ? Math.max(0, end - lastPacket).toFixed(0) : '—';
        label.textContent = '联机 FPS ' + fps.toFixed(1) + '\n' +
          '渲染CPU ' + (totalMs / frames).toFixed(1) + 'ms / 峰值 ' +
          peakMs.toFixed(1) + 'ms\n快照 ' + rate.toFixed(1) +
          '/s · 距上包 ' + age + 'ms\n画布 DPR ' + (game.dpr || 1).toFixed(2);
        frames = 0;
        packets = 0;
        totalMs = 0;
        peakMs = 0;
        lastUpdate = end;
      },
      destroy() { label.remove(); }
    };
  }
  window.NeonLanPerf = Object.freeze({ create });
})();
