/* Two-player LAN co-op MVP.
 * Host browser owns ALL enemies / deaths / drops. Guest only transmits inputs
 * and renders bounded authoritative world snapshots.
 */
(() => {
  'use strict';
  const hz = 10;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = n => Math.round((Number(n) || 0) * 10) / 10;
  const sample = (entity, attributes) => {
    const result = {};
    for (const key of attributes) {
      const v = entity[key];
      if (typeof v === 'number') result[key] = round(v);
      else if (typeof v === 'string' || typeof v === 'boolean') result[key] = v;
    }
    return result;
  };
  const ownProfile = role => window.NeonLanTeammates?.ownProfile(role) || {
    name: role === 'guest' ? '队友' : '房主',
    color: role === 'guest' ? '#ffbb55' : '#00f3ff',
    colorId: 'auto'
  };
  const normalizeProfile = (profile, role) => window.NeonLanTeammates?.normalizeProfile(profile, role) || {
    name: role === 'guest' ? '队友' : '房主',
    color: role === 'guest' ? '#ffbb55' : '#00f3ff',
    colorId: 'auto'
  };
  function normalizeInput(data) {
    if (!data || data.type !== 'input' || !Number.isSafeInteger(data.seq) || data.seq < 0) return null;
    const valid = n => typeof n === 'number' && Number.isFinite(n);
    if (!valid(data.dx) || !valid(data.dy) || !valid(data.aim)) return null;
    const len = Math.hypot(data.dx, data.dy);
    return {
      seq: data.seq,
      dx: len > 1 ? data.dx / len : clamp(data.dx, -1, 1),
      dy: len > 1 ? data.dy / len : clamp(data.dy, -1, 1),
      aim: clamp(data.aim, -Math.PI * 2, Math.PI * 2),
      dash: Boolean(data.dash)
    };
  }
  function newAlly(game) {
    return {
      id: 'guest', x: game.player.x + 60, y: game.player.y,
      vx: 0, vy: 0, hp: 100, maxHp: 100, level: 1, radius: 16,
      aimAngle: 0, invuln: 0, dash: 0, charges: 3, recharge: 0,
      shotTime: 0, lastSeq: -1, lastInputAt: 0,
      input: { dx: 0, dy: 0, aim: 0, dash: false },
      profile: normalizeProfile(null, 'guest')
    };
  }
  function snapshot(game, ally, seq, resonance = null) {
    const limit = (array, max, fields) => (array || []).slice(0, max).map(entity => sample(entity, fields));
    return {
      type: 'snapshot', seq, time: round(game.survivalTime),
      level: game.player.level, kills: game.kills, mode: game.endlessMode ? 'endless' : 'normal',
      phase: game.state,
      resonance: resonance ? {
        tier: resonance.link?.tier || 0,
        distance: round(resonance.link?.distance || 0),
        damageBonus: resonance.link?.damageBonus || 0,
        pulseCooldown: round(resonance.pulseCooldown || 0)
      } : { tier: 0, distance: 0, damageBonus: 0, pulseCooldown: 0 },
      host: { ...sample(game.player, ['x','y','hp','maxHp','aimAngle','level','radius']),
        name: ownProfile('host').name, color: ownProfile('host').color },
      guest: { ...sample(ally, ['x','y','hp','maxHp','aimAngle','level','charges','radius']),
        name: ally.profile?.name || '队友', color: ally.profile?.color || '#ffbb55' },
      enemies: limit(game.enemies.filter(e => !e.dead), 130, ['x','y','hp','maxHp','radius','color','type','isBoss']),
      bullets: limit(game.bullets, 140, ['x','y','radius','color','type']),
      enemyBullets: limit(game.enemyBullets, 150, ['x','y','radius','color']),
      gems: limit(game.gems, 90, ['x','y','radius','type','color'])
    };
  }
  function safeSnapshot(data) {
    return data && data.type === 'snapshot' &&
      Number.isSafeInteger(data.seq) && data.seq >= 0 &&
      data.host && data.guest &&
      ['x','y'].every(k => typeof data.host[k] === 'number' && Number.isFinite(data.host[k]) &&
        typeof data.guest[k] === 'number' && Number.isFinite(data.guest[k])) &&
      Array.isArray(data.enemies) && data.enemies.length <= 130 &&
      Array.isArray(data.bullets) && data.bullets.length <= 140 &&
      Array.isArray(data.enemyBullets) && data.enemyBullets.length <= 150 &&
      Array.isArray(data.gems) && data.gems.length <= 90;
  }
  class Coop {
    constructor(game, rtc) {
      this.game = game;
      this.rtc = rtc;
      this.ally = null;
      this.latest = null;
      this.lastSnapshotSeq = -1;
      this.sendAccumulator = 0;
      this.inputAccumulator = 0;
      this.seq = 0;
      this.dashQueued = false;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
      this.guestMode = false;
      this.previousGamepadDash = false;
      this.pendingGuestProfile = null;
      this.profileAccumulator = 0;
    }
    startHost() {
      this.ally = newAlly(this.game);
      if (this.pendingGuestProfile) this.ally.profile = this.pendingGuestProfile;
      this.guestMode = false;
      this.latest = null;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
    }
    startGuest() {
      this.ally = null;
      this.guestMode = true;
      this.latest = null;
      this.lastSnapshotSeq = -1;
      this.game.hideAllModals();
      this.game.releaseJoystickTouch();
      this.game.state = 'lan-client';
      this.sendLocalProfile();
      document.body.classList?.add('neon-lan-guest');
      for (const id of ['hud', 'weapons-bar', 'xp-container', 'boss-hud']) {
        const node = document.getElementById(id);
        if (node) { node.dataset.lanPreviousDisplay = node.style.display; node.style.display = 'none'; }
      }
    }
    sendLocalProfile() {
      if (this.rtc.role !== 'guest' || !this.rtc.connected) return false;
      const p = ownProfile('guest');
      return this.rtc.send({ type: 'profile', name: p.name, color: p.colorId });
    }
    stop() {
      this.guestMode = false;
      document.body.classList?.remove('neon-lan-guest');
      this.ally = null;
      this.latest = null;
      this.dashQueued = false;
      this.pendingGuestProfile = null;
      window.NeonLanTeammates?.hide();
      for (const id of ['hud', 'weapons-bar', 'xp-container', 'boss-hud']) {
        const node = document.getElementById(id);
        if (node && Object.hasOwn(node.dataset, 'lanPreviousDisplay')) {
          node.style.display = node.dataset.lanPreviousDisplay;
          delete node.dataset.lanPreviousDisplay;
        }
      }
      if (this.game.state === 'lan-client') this.game.showStartMenu();
    }
    onMessage(message) {
      if (this.rtc.role === 'host' && message?.type === 'profile') {
        const profile = normalizeProfile(message, 'guest');
        this.pendingGuestProfile = profile;
        if (this.ally) this.ally.profile = profile;
        return;
      }
      if (this.rtc.role === 'host' && this.ally) {
        const input = normalizeInput(message);
        if (!input || input.seq <= this.ally.lastSeq) return;
        this.ally.input = input;
        this.ally.lastSeq = input.seq;
        this.ally.lastInputAt = performance.now();
        if (input.dash && this.ally.charges > 0 && this.ally.dash <= 0) {
          this.ally.charges--;
          this.ally.dash = 0.18;
          this.ally.invuln = Math.max(this.ally.invuln, 0.28);
          window.NeonLanResonance?.recordDash(this.game, this.ally, this.resonance, 'guest');
        }
      } else if (this.guestMode && safeSnapshot(message) && message.seq > this.lastSnapshotSeq) {
        this.lastSnapshotSeq = message.seq;
        this.latest = message;
      }
    }
    updateHost(dt) {
      if (!this.ally || !this.rtc.connected) return;
      const ally = this.ally, game = this.game;
      if (game.state !== 'playing') {
        this.sendAccumulator += dt;
        if (this.sendAccumulator >= 0.2) {
          this.sendAccumulator = 0;
          this.rtc.send(snapshot(game, ally, this.seq++, this.resonance));
        }
        return;
      }
      const input = performance.now() - ally.lastInputAt <= 350
        ? ally.input : { dx: 0, dy: 0, aim: ally.aimAngle };
      ally.aimAngle = input.aim;
      ally.level = game.player.level;
      ally.invuln = Math.max(0, ally.invuln - dt);
      if (ally.charges < 3) {
        ally.recharge += dt;
        if (ally.recharge >= 2.2) { ally.recharge -= 2.2; ally.charges++; }
      } else ally.recharge = 0;
      const speed = ally.dash > 0 ? 780 : 240 + Math.min(120, (ally.level - 1) * 6);
      const dx = input.dx, dy = input.dy;
      ally.x += dx * speed * dt;
      ally.y += dy * speed * dt;
      window.NeonLanResonance?.update(game, ally, this.resonance, dt);
      ally.dash = Math.max(0, ally.dash - dt);
      ally.shotTime += dt;
      if (ally.shotTime >= 0.32) {
        ally.shotTime = 0;
        // Allied starter blaster: authoritative damage, never computed on guest.
        const target = game.enemies.filter(e => !e.dead).reduce((best, e) => {
          const d = Math.hypot(e.x - ally.x, e.y - ally.y);
          return d < (best?.distance ?? 620) ? { enemy: e, distance: d } : best;
        }, null);
        if (target) {
          game.dealDamage(target.enemy, 22 * (1 + this.getLinkBonus()), 'lan-ally');
          if (game.particles && game.particles.length < 65) game.particles.push({
            type: 'lightning', x1: ally.x, y1: ally.y,
            x2: target.enemy.x, y2: target.enemy.y,
            color: '#ffbb55', life: 0.12, maxLife: 0.12
          });
        }
      }
      if (ally.invuln <= 0) {
        // Host also resolves projectiles against the guest ship, never the guest browser.
        for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
          const bullet = game.enemyBullets[i];
          if (Math.hypot(bullet.x - ally.x, bullet.y - ally.y) < (bullet.radius || 4) + ally.radius) {
            ally.hp = Math.max(0, ally.hp - (bullet.damage || 12));
            ally.invuln = 0.6;
            game.enemyBullets.splice(i, 1);
            break;
          }
        }
      }
      if (ally.invuln <= 0) {
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - ally.x, e.y - ally.y) < (e.radius || 12) + ally.radius) {
            ally.hp = Math.max(0, ally.hp - Math.max(4, e.damage || 10));
            ally.invuln = 0.6;
            break;
          }
        }
      }
      // An isolated ally cannot end the host's session; revive after 8 seconds.
      if (ally.hp <= 0) {
        ally.reviveIn = (ally.reviveIn ?? 8) - dt;
        if (ally.reviveIn <= 0) {
          ally.hp = Math.ceil(ally.maxHp / 2);
          ally.reviveIn = undefined;
          ally.x = game.player.x + 60;
          ally.y = game.player.y;
          ally.invuln = 2;
        }
      }
      this.sendAccumulator += dt;
      if (this.sendAccumulator >= 1 / hz) {
        this.sendAccumulator = 0;
        this.rtc.send(snapshot(game, ally, this.seq++, this.resonance));
      }
    }
    getLinkBonus() {
      return this.rtc.connected && this.ally && window.NeonLanResonance
        ? window.NeonLanResonance.link(this.game.player, this.ally).damageBonus : 0;
    }
    onHostDash() {
      if (this.ally && this.rtc.connected) {
        return window.NeonLanResonance?.recordDash(this.game, this.ally, this.resonance, 'host') || false;
      }
      return false;
    }
    renderHost(ctx) {
      if (!this.ally || !this.rtc.connected) {
        window.NeonLanTeammates?.hide();
        return;
      }
      window.NeonLanTeammates?.update(
        this.game, this.game.camera, this.ally, this.game.player, this.ally.profile, true
      );
      const link = window.NeonLanResonance?.link(this.game.player, this.ally);
      if (link?.active) {
        ctx.save();
        ctx.strokeStyle = link.tier === 2 ? 'rgba(122,255,218,.7)' : 'rgba(100,196,255,.45)';
        ctx.setLineDash([11, 8]);
        ctx.lineWidth = link.tier === 2 ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(this.game.player.x, this.game.player.y);
        ctx.lineTo(this.ally.x, this.ally.y);
        ctx.stroke();
        ctx.restore();
      }
      const teammate = this.ally.profile || normalizeProfile(null, 'guest');
      this.drawShip(ctx, this.ally, teammate.color, teammate.name);
      if (link) {
        ctx.save();
        ctx.fillStyle = link.active ? '#9fffe3' : '#a0afc4';
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText(link.tier === 2 ? '近距共振 +20% · 双机修复' :
          link.tier === 1 ? '战机联动 +10%' : '联动中断 · 请靠近队友',
          (this.game.player.x + this.ally.x) / 2, Math.min(this.game.player.y, this.ally.y) - 48);
        ctx.restore();
      }
    }
    drawShip(ctx, player, color, name) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.aimAngle || 0);
      ctx.strokeStyle = color;
      ctx.fillStyle = '#142238';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 0); ctx.lineTo(-15, -15); ctx.lineTo(-8, 0); ctx.lineTo(-15, 15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(name + ' ' + Math.ceil(player.hp || 0) + ' HP', player.x, player.y - 30);
      ctx.restore();
    }
    sampleInput() {
      const game = this.game, keys = game.keys || {};
      if (game.settingsOpen) {
        this.dashQueued = false;
        return { type: 'input', seq: this.seq++, dx: 0, dy: 0, aim: this.latest?.guest?.aimAngle || 0, dash: false };
      }
      let dx = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft));
      let dy = Number(Boolean(keys.s || keys.arrowdown)) - Number(Boolean(keys.w || keys.arrowup));
      if (game.touch.active) {
        dx = game.touch.currentX - game.touch.startX;
        dy = game.touch.currentY - game.touch.startY;
        if (Math.hypot(dx, dy) < (window.NeonGameSettings?.get('joystickDeadzone') || 10)) dx = dy = 0;
      }
      const pads = navigator.getGamepads?.() || [];
      const pad = Array.from(pads).find(p => p && p.connected !== false);
      if (pad && Math.hypot(pad.axes?.[0] || 0, pad.axes?.[1] || 0) > 0.2) {
        dx = pad.axes[0]; dy = pad.axes[1];
      }
      const length = Math.hypot(dx, dy);
      if (length > 1) { dx /= length; dy /= length; }
      const aim = pad && Math.hypot(pad.axes?.[2] || 0, pad.axes?.[3] || 0) > 0.2
        ? Math.atan2(pad.axes[3], pad.axes[2])
        : (length > 0.1 ? Math.atan2(dy, dx) : (this.latest?.guest?.aimAngle || 0));
      const padDash = Boolean(pad?.buttons?.[0]?.pressed);
      const dash = this.dashQueued || (padDash && !this.previousGamepadDash);
      this.previousGamepadDash = padDash;
      this.dashQueued = false;
      return { type: 'input', seq: this.seq++, dx, dy, aim, dash };
    }
    updateGuest(dt) {
      if (!this.guestMode || !this.rtc.connected) return;
      this.profileAccumulator += dt;
      if (this.profileAccumulator >= 3) {
        this.profileAccumulator = 0;
        this.sendLocalProfile();
      }
      this.inputAccumulator += dt;
      if (this.inputAccumulator >= 0.05) {
        this.inputAccumulator = 0;
        this.rtc.send(this.sampleInput());
      }
    }
    renderGuest() {
      const game = this.game, ctx = game.ctx, state = this.latest;
      ctx.save();
      try {
        ctx.clearRect(0, 0, game.width, game.height);
        ctx.fillStyle = '#050a18'; ctx.fillRect(0, 0, game.width, game.height);
        if (!state) {
          window.NeonLanTeammates?.hide();
          ctx.fillStyle = '#00f3ff'; ctx.font = '20px system-ui';
          ctx.fillText('等待房主同步战场…', 24, game.height / 2);
          return;
        }
        const zoom = Math.max(0.65, Math.min(1.5, game.cameraZoom || 1));
        ctx.translate(game.width / 2, game.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-state.guest.x, -state.guest.y);
        // Lightweight guest renderer intentionally does not run game simulation.
        for (const gem of state.gems) {
          ctx.fillStyle = gem.color || '#4ff';
          ctx.fillRect(gem.x - 4, gem.y - 4, 8, 8);
        }
        for (const e of state.enemies) {
          ctx.fillStyle = e.color || '#f25'; ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius || 12, 0, Math.PI * 2); ctx.fill();
          if (e.isBoss) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
        }
        for (const bullet of [...state.bullets, ...state.enemyBullets]) {
          ctx.fillStyle = bullet.color || '#fff'; ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2); ctx.fill();
        }
        if (state.resonance?.tier > 0) {
          ctx.strokeStyle = state.resonance.tier === 2 ? '#80ffca' : '#60caff';
          ctx.lineWidth = state.resonance.tier === 2 ? 3 : 2;
          ctx.setLineDash([10, 7]);
          ctx.beginPath();
          ctx.moveTo(state.host.x, state.host.y);
          ctx.lineTo(state.guest.x, state.guest.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const hostProfile = normalizeProfile({
          name: state.host.name, color: 'auto'
        }, 'host');
        hostProfile.color = /^#[0-9a-f]{6}$/i.test(state.host.color || '') ?
          state.host.color : hostProfile.color;
        const local = ownProfile('guest');
        this.drawShip(ctx, state.host, hostProfile.color, hostProfile.name);
        this.drawShip(ctx, state.guest, local.color, local.name + ' · 我');
        window.NeonLanTeammates?.update(
          game, { x: state.guest.x, y: state.guest.y }, state.host, state.guest,
          hostProfile, true
        );
        ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
        ctx.fillStyle = '#e6f7ff'; ctx.font = 'bold 15px system-ui';
        ctx.fillText(`局域网合作 · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} · 击杀 ${state.kills}`, 16, 35);
        ctx.fillText(`我的血量 ${Math.ceil(state.guest.hp)} / ${state.guest.maxHp} · 折跃 ${state.guest.charges}/3`, 16, 59);
        ctx.fillStyle = state.resonance?.tier ? '#9fffe3' : '#ffcf96';
        ctx.fillText(state.resonance?.tier === 2 ? '近距共振：双方伤害 +20% · 恢复生命' :
          state.resonance?.tier === 1 ? '战机联动：双方伤害 +10%' : '联动中断：靠近房主解锁协同增益',
          16, 84);
        if (state.phase !== 'playing') ctx.fillText('房主当前阶段：' + state.phase + ' · 等待继续', 16, 107);
      } finally { ctx.restore(); }
    }
  }
  window.NeonLanCoop = Object.freeze({ Coop, newAlly, normalizeInput, snapshot, safeSnapshot });
})();
