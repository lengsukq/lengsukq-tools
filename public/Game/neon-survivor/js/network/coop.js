/* Two-player LAN co-op MVP.
 * Host browser owns ALL enemies / deaths / drops. Guest only transmits inputs
 * and renders bounded authoritative world snapshots.
 */
(() => {
  'use strict';
  // ~15Hz authoritative world snapshots, 30Hz guest inputs. Visuals interpolate
  // at display refresh rate. These are NOT render/simulation tick rates.
  const hz = 15;
  const INPUT_HZ = 30;
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
  const networkIds = new WeakMap();
  let nextNetworkId = 1;
  const networkId = entity => {
    if (!entity || typeof entity !== 'object') return 0;
    if (!networkIds.has(entity)) networkIds.set(entity, nextNetworkId++);
    return networkIds.get(entity);
  };
  const bag = (values, max = 12) =>
    Object.fromEntries(Object.entries(values || {}).slice(0, max)
      .filter(([name, level]) => /^[a-z_]{1,30}$/.test(name) &&
        Number.isFinite(level) && level >= 0 && level <= 100)
      .map(([name, level]) => [name, Math.floor(level)]));
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
      autoAim: true,
      dash: Boolean(data.dash)
    };
  }
  function newAlly(game) {
    return {
      id: 'guest', x: game.player.x + 60, y: game.player.y,
      vx: 0, vy: 0, hp: 100, maxHp: 100, level: 1, radius: 16,
      xp: 0, xpNeeded: game.player.xpNeeded || 1,
      aimAngle: 0, invuln: 0, dash: 0, charges: 3, recharge: 0,
      maxCharges: 3, pendingUpgrades: 0, choices: [],
      upgradeRound: 0,
      weapons: { blaster: 1 }, passives: {}, dashUpgrades: {}, limitBreaks: {},
      timers: {}, dmgMultiplier: 1, areaMultiplier: 1, extraProjectiles: 0,
      cdrMultiplier: 1, critRate: 0.08, critDmg: 1.5,
      shotTime: 0, lastSeq: -1, lastInputAt: 0,
      input: { dx: 0, dy: 0, aim: 0, dash: false },
      profile: normalizeProfile(null, 'guest')
    };
  }
  function snapshot(game, ally, seq, resonance = null) {
    const limit = (array, max, fields) => (array || []).slice(0, max)
      .map(entity => ({ id: networkId(entity), ...sample(entity, fields) }));
    const nearbyEnemies = [...(game.enemies || [])].filter(enemy => !enemy.dead)
      .sort((a, b) => {
        if (Boolean(a.isBoss) !== Boolean(b.isBoss)) return a.isBoss ? -1 : 1;
        const dist = enemy => Math.min(
          Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y),
          Math.hypot(enemy.x - ally.x, enemy.y - ally.y)
        );
        return dist(a) - dist(b);
      });
    return {
      type: 'snapshot', seq, time: round(game.survivalTime),
      level: game.player.level, kills: game.kills,
      difficulty: game.difficulty || 0, mode: game.endlessMode ? 'endless' : 'normal',
      teamXP: window.NeonLanExperience?.progress(game) || {
        xp: game.player.xp || 0, xpNeeded: game.player.xpNeeded || 1,
        level: game.player.level
      },
      phase: game.state,
      rescue: window.NeonLanRevive?.summary(game) || null,
      resonance: resonance ? {
        tier: resonance.link?.tier || 0,
        distance: round(resonance.link?.distance || 0),
        damageBonus: resonance.link?.damageBonus || 0,
        pulseCooldown: round(resonance.pulseCooldown || 0)
      } : { tier: 0, distance: 0, damageBonus: 0, pulseCooldown: 0 },
      host: { ...sample(game.player, ['x','y','hp','maxHp','aimAngle','level','radius',
        'regen','crystals','invulnTimer','aegisTimer','aegisRadius','maxDashCharges',
        'dashCharges','dashRechargeTimer','dashSlashDmg','dashCombo','aegisDuration',
        'downed','reviveIn']),
        weapons: bag(game.player.weapons, 4), passives: bag(game.player.passives, 4),
        limitBreaks: bag(game.player.limitBreaks, 16),
        name: ownProfile('host').name, color: ownProfile('host').color },
      guest: { ...sample(ally, ['x','y','hp','maxHp','aimAngle','level','charges','radius',
        'invuln','recharge','lastSeq','maxCharges','pendingUpgrades',
        'cdrMultiplier','dmgMultiplier','areaMultiplier','upgradeRound',
        'downed','reviveIn']),
        weapons: bag(ally.weapons, 4), passives: bag(ally.passives, 4),
        dashUpgrades: bag(ally.dashUpgrades, 10),
        choices: Array.isArray(ally.choices) ? ally.choices.slice(0, 3) : [],
        name: ally.profile?.name || '队友', color: ally.profile?.color || '#ffbb55' },
      enemies: limit(nearbyEnemies, 105,
        ['x','y','vx','vy','hp','maxHp','radius','color','type','isBoss','isElite',
          'hasShield','arming','aimTimer','coopCapture','coopExposed']),
      bullets: limit(game.bullets, 90, ['x','y','vx','vy','radius','color','type','isLevel5']),
      enemyBullets: limit(game.enemyBullets, 90, ['x','y','radius','color','damage']),
      gems: limit(game.gems, 75, ['x','y','radius','type','color','value']),
      shockwaves: limit(game.shockwaves, 20, ['x','y','radius','color','alpha']),
      particles: limit(game.particles, 38, ['type','x','y','x1','y1','x2','y2',
        'radius','color','life','maxLife']),
      lightningTethers: limit(game.lightningTethers, 16, ['x1','y1','x2','y2']),
      blackHoles: limit(game.blackHoles, 12, ['x','y','radius','rotAngle']),
      mines: limit(game.mines, 18, ['x','y','radius']),
      laserBeams: limit(game.laserBeams, 20, ['x','y','angle','width','length']),
      companionDrones: [
        ...limit(game.companionDrones, 8, ['x','y','angle']),
        ...Array.from({
          length: ally.hp > 0 && ally.weapons?.drones ? Math.min(5, 1 + ally.weapons.drones) : 0
        }, (_, i) => {
          const angle = (ally.dronePhase || 0) + i * Math.PI * 2 /
            Math.min(5, 1 + ally.weapons.drones);
          return {
            id: 900000 + i, angle: round(angle),
            x: round(ally.x + Math.cos(angle) * 52),
            y: round(ally.y + Math.sin(angle) * 52)
          };
        })
      ],
      orbiters: [
        ...limit(game.orbiters, 8, ['angle','distance','radius','color'])
          .map(orb => ({ ...orb, centerX: round(game.player.x), centerY: round(game.player.y) })),
        ...Array.from({ length: ally.weapons?.orbit ? Math.min(5, 1 + ally.weapons.orbit) : 0 }, (_, i) => ({
          id: 800000 + i, angle: round((ally.orbitPhase || 0) + i * Math.PI * 2 /
            Math.min(5, 1 + ally.weapons.orbit)), distance: round(85 * ally.areaMultiplier),
          radius: round(9 * ally.areaMultiplier), color: '#00ffaa',
          centerX: round(ally.x), centerY: round(ally.y)
        }))
      ],
      dashTrails: limit(game.dashTrails, 16, ['x1','y1','x2','y2','color','life','maxLife']),
      texts: limit(game.texts, 18, ['x','y','text','color','size','life','maxLife'])
    };
  }
  // Keep within the RTCDataChannel's 40k frame limit, so crowded boss fights
  // do not silently stop synchronizing. Critical players and boss entities
  // are never removed. Decorative effects are the first fields to trim.
  function boundedSnapshot(game, ally, seq, resonance = null) {
    const frame = snapshot(game, ally, seq, resonance);
    // Stay below conservative mobile SCTP message budgets and minimize latency.
    const LIMIT = 15000;
    let size = JSON.stringify(frame).length;
    if (size <= LIMIT) return frame;
    for (const field of ['particles','texts','shockwaves','dashTrails',
      'companionDrones','laserBeams','mines','blackHoles','lightningTethers',
      'orbiters','gems','bullets','enemyBullets']) {
      const items = frame[field];
      while (items?.length && size > LIMIT) {
        // JSON-stringifying the whole snapshot for every removed effect
        // caused quadratic CPU spikes in dense fights.
        const last = items[items.length - 1];
        size -= JSON.stringify(last).length + (items.length > 1 ? 1 : 0);
        items.pop();
      }
      if (size <= LIMIT) return frame;
    }
    // Bosses survive priority culling; trim only regular enemies.
    while (frame.enemies.length && size > LIMIT) {
      // Avoid Array.findLastIndex: missing in some older tablet WebViews.
      let index = -1;
      for (let i = frame.enemies.length - 1; i >= 0; i--) {
        if (!frame.enemies[i].isBoss) { index = i; break; }
      }
      if (index < 0) break;
      size -= JSON.stringify(frame.enemies[index]).length +
        (frame.enemies.length > 1 ? 1 : 0);
      frame.enemies.splice(index, 1);
    }
    return frame;
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
      this.previous = null;
      this.receivedAt = 0;
      this.currentRenderState = null;
      this.frameSampler = null;
      this.guestView = null;
      this.lastGuestHudSeq = -1;
      this.perf?.destroy();
      this.perf = window.NeonLanPerf?.create(this.game) || null;
      this.perf = null;
      this.frameSampler = null;
      this.guestView = null;
      this.lastGuestHudSeq = -1;
      this.predicted = null;
      this.frameSampler = null;
      this.guestView = null;
      this.lastGuestHudSeq = -1;
      this.lastInput = null;
      this.lastHudLoadout = null;
      this.guestUpgradeKey = null;
      this.previousMenuSelection = '';
      this.guestSelectionIdx = 0;
      this.lastSnapshotSeq = -1;
      this.sendAccumulator = 0;
      this.inputAccumulator = 0;
      this.seq = 0;
      this.dashQueued = false;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
      this.rescue = window.NeonLanRevive?.newRun() || null;
      this.guestMode = false;
      this.previousGamepadDash = false;
      this.pendingGuestProfile = null;
      this.rescue = null;
      this.profileAccumulator = 0;
    }
    startHost() {
      this.ally = newAlly(this.game);
      if (this.pendingGuestProfile) this.ally.profile = this.pendingGuestProfile;
      this.guestMode = false;
      this.latest = null;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
      this.rescue = window.NeonLanRevive?.newRun() || null;
    }
    startGuest() {
      this.ally = null;
      this.guestMode = true;
      this.latest = null;
      this.previous = null;
      this.predicted = null;
      this.currentRenderState = null;
      this.lastSnapshotSeq = -1;
      this.guestUpgradeKey = null;
      this.game.hideAllModals();
      this.game.releaseJoystickTouch();
      this.game.state = 'lan-client';
      this.sendLocalProfile();
      document.body.classList?.add('neon-lan-guest');
      // The same HUD is now reused, but a guest cannot pause the room.
      for (const id of ['btn-pause']) {
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
      this.perf?.destroy();
      this.perf = null;
      const survivorDisconnected = !this.guestMode && this.game.player?.downed &&
        this.ally?.hp > 0;
      this.guestMode = false;
      document.body.classList?.remove('neon-lan-guest');
      this.ally = null;
      this.latest = null;
      this.previous = null;
      this.predicted = null;
      this.dashQueued = false;
      this.guestUpgradeKey = null;
      this.game.modalLevelup?.classList.remove('active');
      this.pendingGuestProfile = null;
      window.NeonLanTeammates?.hide();
      for (const id of ['btn-pause']) {
        const node = document.getElementById(id);
        if (node && Object.hasOwn(node.dataset, 'lanPreviousDisplay')) {
          node.style.display = node.dataset.lanPreviousDisplay;
          delete node.dataset.lanPreviousDisplay;
        }
      }
      if (this.game.state === 'lan-client') this.game.showStartMenu();
      if (this.game.state === 'coop-guest-upgrade') {
        this.game.state = 'playing';
        this.game.lastTime = performance.now();
      }
      // If the host is already downed and the only survivor disconnects,
      // continuing solo would leave an unwinnable zero-HP game running.
      if (survivorDisconnected && this.game.state === 'playing') this.game.gameOver();
    }
    onMessage(message) {
      if (this.rtc.role === 'host' && message?.type === 'profile') {
        const profile = normalizeProfile(message, 'guest');
        this.pendingGuestProfile = profile;
        if (this.ally) this.ally.profile = profile;
        return;
      }
      if (this.rtc.role === 'host' && message?.type === 'upgrade_pick') {
        // A guest cannot choose arbitrary upgrades, spend someone else's card,
        // or alter state outside the shared upgrade phase.
        if (this.game.state !== 'coop-guest-upgrade' ||
          !this.ally || !Number.isSafeInteger(message.seq) ||
          message.seq <= (this.ally.lastUpgradeSeq ?? -1) ||
          typeof message.id !== 'string' || !this.ally.choices.includes(message.id)) return;
        const upgrade = this.game.getCoopUpgradeDefinition(message.id);
        if (!upgrade) return;
        this.ally.lastUpgradeSeq = message.seq;
        this.applyGuestUpgrade(upgrade);
        this.ally.pendingUpgrades = Math.max(0, this.ally.pendingUpgrades - 1);
        this.ally.upgradeRound++;
        if (this.ally.pendingUpgrades > 0) {
          this.ally.choices = this.game.getCoopUpgradeChoices(this.ally);
          if (!this.ally.choices.length) this.ally.pendingUpgrades = 0;
        }
        if (!this.ally.pendingUpgrades) {
          this.ally.choices = [];
          this.game.state = 'playing';
          this.game.lastTime = performance.now();
        }
        return;
      }
      if (this.rtc.role === 'host' && this.ally) {
        const input = normalizeInput(message);
        if (!input || input.seq <= this.ally.lastSeq) return;
        // A guest cannot advance a dash (or any world action) during host pause.
        // Fresh input is required after the host resumes.
        if (this.game.state !== 'playing' || this.ally.downed) {
          this.ally.lastSeq = input.seq;
          return;
        }
        this.ally.input = input;
        this.ally.lastSeq = input.seq;
        this.ally.lastInputAt = performance.now();
        if (!this.ally.downed && input.dash && this.ally.charges > 0 && this.ally.dash <= 0) {
          this.ally.charges--;
          this.ally.dash = 0.18;
          this.ally.invuln = Math.max(this.ally.invuln, 0.28);
          const warp = this.ally.dashUpgrades || {};
          if (warp.dash_aegis) this.ally.invuln = Math.max(this.ally.invuln, 0.4);
          this.ally.dashHitEnemies = new Set();
          if (warp.dash_blast) {
            const radius = 100 + warp.dash_blast * 25;
            for (const enemy of this.game.enemies) {
              if (!enemy.dead &&
                  Math.hypot(enemy.x - this.ally.x, enemy.y - this.ally.y) <= radius) {
                this.game.dealDamage(enemy, 80 + warp.dash_blast * 50,
                  'lan-ally', false, this.ally);
              }
            }
            if (this.game.shockwaves?.length < 40) this.game.shockwaves.push({
              x: this.ally.x, y: this.ally.y, radius: 8,
              maxRadius: radius, alpha: 1, color: '#aaffff'
            });
          }
          window.NeonLanResonance?.recordDash(this.game, this.ally, this.resonance, 'guest');
        }
      } else if (this.guestMode && safeSnapshot(message) && message.seq > this.lastSnapshotSeq) {
        this.lastSnapshotSeq = message.seq;
        this.previous = this.latest;
        this.receivedAt = performance.now();
        this.latest = message;
        this.perf?.packet(this.receivedAt);
        // Entity correspondence is calculated when a snapshot ARRIVES,
        // never rebuilt by every animation frame.
        this.frameSampler = window.NeonLanWorldView?.createSampler(message, this.previous) || null;
        // Host is authoritative; locally predicted position is corrected
        // gradually for small differences and snapped on large drift.
        const guest = message.guest;
        if (!this.predicted) this.predicted = { x: guest.x, y: guest.y };
        const delta = Math.hypot(this.predicted.x - guest.x, this.predicted.y - guest.y);
        if (delta > 135) {
          this.predicted.x = guest.x;
          this.predicted.y = guest.y;
        } else {
          this.predicted.x += (guest.x - this.predicted.x) * 0.22;
          this.predicted.y += (guest.y - this.predicted.y) * 0.22;
        }
      }
    }
    updateHost(dt) {
      if (!this.ally || !this.rtc.connected) return;
      const ally = this.ally, game = this.game;
      if (game.state === 'playing' && ally.pendingUpgrades > 0) {
        ally.choices = game.getCoopUpgradeChoices(ally);
        if (ally.choices.length) game.state = 'coop-guest-upgrade';
        else ally.pendingUpgrades = 0;
      }
      if (game.state !== 'playing') {
        this.sendAccumulator += dt;
        if (this.sendAccumulator >= 0.2) {
          this.sendAccumulator = 0;
          this.rtc.send(boundedSnapshot(game, ally, this.seq++, this.resonance));
        }
        return;
      }
      // Death/revival countdowns advance only on authoritative active play ticks.
      // Process death before movement, and continue to simulate the survivor.
      if (ally.hp <= 0 && !ally.downed) {
        window.NeonLanRevive?.knockDown(game, 'guest');
      }
      if (game.state !== 'playing') return;
      const input = performance.now() - ally.lastInputAt <= 350
        ? ally.input : { dx: 0, dy: 0, aim: ally.aimAngle };
      ally.aimAngle = input.aim;
      ally.level = game.player.level;
      ally.xp = game.player.xp;
      ally.xpNeeded = game.player.xpNeeded;
      ally.invuln = Math.max(0, ally.invuln - dt);
      if (ally.charges < ally.maxCharges) {
        ally.recharge += dt;
        const thruster = ally.passives.thruster || 0;
        const recharge = 2.2 * ally.cdrMultiplier * (thruster >= 4 ? .7 : thruster >= 2 ? .85 : 1);
        if (ally.recharge >= recharge) {
          ally.recharge -= recharge; ally.charges++;
        }
      } else ally.recharge = 0;
      const speed = ally.downed ? 0 : ally.dash > 0 ? 780 : Math.min(385,
        (240 + Math.min(120, (ally.level - 1) * 6)) *
          (1 + .15 * (ally.passives.thruster || 0)));
      const dx = input.dx, dy = input.dy;
      ally.x += dx * speed * dt;
      ally.y += dy * speed * dt;
      if (ally.hp > 0) ally.hp = Math.min(ally.maxHp,
        ally.hp + dt * (.8 + (ally.passives.armor || 0) * 1.8));
      if (!ally.downed && ally.dash > 0 && ally.dashHitEnemies) {
        const warp = ally.dashUpgrades || {};
        const radius = 42 + (warp.dash_area || 0) * 18;
        for (const enemy of game.enemies) {
          if (enemy.dead || ally.dashHitEnemies.has(enemy) ||
              Math.hypot(enemy.x - ally.x, enemy.y - ally.y) > radius + (enemy.radius || 12)) continue;
          ally.dashHitEnemies.add(enemy);
          game.dealDamage(enemy, 95 * (1 + (warp.dash_dmg || 0) * .25) *
            ally.dmgMultiplier, 'lan-ally', false, ally);
          if (warp.dash_cryo) enemy.freezeTimer =
            Math.max(enemy.freezeTimer || 0, .5 + warp.dash_cryo * .35);
          if (ally.dashHitEnemies.size >= 30) break;
        }
        if (warp.dash_fire && game.dashTrails?.length < 35) game.dashTrails.push({
          x1: ally.x - dx * 22, y1: ally.y - dy * 22,
          x2: ally.x, y2: ally.y,
          color: '#ff8844', life: .24, maxLife: .24,
          damage: 15 * warp.dash_fire
        });
      }
      window.NeonLanResonance?.update(game, ally, this.resonance, dt);
      ally.dash = Math.max(0, ally.dash - dt);
      this.updateGuestWeapons(dt);
      if (!ally.downed && ally.invuln <= 0) {
        // Host also resolves projectiles against the guest ship, never the guest browser.
        for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
          const bullet = game.enemyBullets[i];
          if (Math.hypot(bullet.x - ally.x, bullet.y - ally.y) < (bullet.radius || 4) + ally.radius) {
            ally.hp = Math.max(0, ally.hp - (bullet.damage || 12) *
              (window.NeonLanEncounters?.active(game) ? window.NeonLanEncounters.TUNING.enemyDamage : 1));
            ally.invuln = 0.6;
            game.enemyBullets.splice(i, 1);
            break;
          }
        }
      }
      if (ally.weapons.drones) {
        const level = ally.weapons.drones;
        ally.dronePhase = (ally.dronePhase || 0) + dt * 2.4;
        ally.droneShotTime = (ally.droneShotTime || 0) + dt;
        const interval = Math.max(.24, .58 - level * .07) * ally.cdrMultiplier;
        if (ally.droneShotTime >= interval) {
          ally.droneShotTime = 0;
          if (nearest && game.bullets.length < 160) {
            const x = ally.x + Math.cos(ally.dronePhase) * 52;
            const y = ally.y + Math.sin(ally.dronePhase) * 52;
            const angle = Math.atan2(nearest.enemy.y - y, nearest.enemy.x - x);
            game.bullets.push({
              type: 'blaster', x, y, vx: Math.cos(angle) * 900,
              vy: Math.sin(angle) * 900, radius: 3.5,
              damage: 22 * ally.dmgMultiplier * (1 + (level - 1) * .3),
              pierce: 1, color: '#00ffaa', life: 1.0, owner: 'guest'
            });
          }
        }
      }
      if (!ally.downed && ally.invuln <= 0) {
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - ally.x, e.y - ally.y) < (e.radius || 12) + ally.radius) {
            ally.hp = Math.max(0, ally.hp - Math.max(4, e.damage || 10) *
              (window.NeonLanEncounters?.active(game) ? window.NeonLanEncounters.TUNING.enemyDamage : 1));
            ally.invuln = 0.6;
            break;
          }
        }
      }
      // Passive once-only cheat death is applied before a true downed state.
      if (ally.hp <= 0 && ally.passives.armor >= 5 && !ally.cheatDeathUsed) {
        ally.hp = Math.min(ally.maxHp, 35);
        ally.invuln = 1.2;
        ally.cheatDeathUsed = true;
      }
      if (ally.hp <= 0 && !ally.downed) window.NeonLanRevive?.knockDown(game, 'guest');
      window.NeonLanRevive?.tick(game, dt);
      this.sendAccumulator += dt;
      if (this.sendAccumulator >= 1 / hz) {
        this.sendAccumulator = 0;
        this.rtc.send(boundedSnapshot(game, ally, this.seq++, this.resonance));
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
    applyGuestUpgrade(upgrade) {
      const ally = this.ally;
      if (!ally) return;
      const group = upgrade.type === 'weapon' ? ally.weapons :
        upgrade.type === 'passive' ? ally.passives : ally.dashUpgrades;
      const level = group[upgrade.id] || 0;
      if (level >= upgrade.maxLvl) return;
      group[upgrade.id] = level + 1;
      if (upgrade.type === 'passive') {
        if (upgrade.id === 'power') ally.dmgMultiplier += 0.2;
        if (upgrade.id === 'haste') ally.cdrMultiplier = Math.max(.45, ally.cdrMultiplier * .90);
        if (upgrade.id === 'area') ally.areaMultiplier += .22;
        if (upgrade.id === 'multishot') ally.extraProjectiles = Math.min(4, ally.extraProjectiles + 1);
        if (upgrade.id === 'armor') {
          ally.maxHp += 35;
          ally.hp = Math.min(ally.maxHp, ally.hp + 35);
        }
        if (upgrade.id === 'crit') {
          ally.critRate = Math.min(.95, ally.critRate + .12);
          ally.critDmg += .5;
        }
      }
      if (upgrade.id === 'dash_charge') {
        ally.maxCharges = Math.min(9, 3 + (ally.dashUpgrades.dash_charge || 0));
        ally.charges = Math.min(ally.maxCharges, ally.charges + 1);
      }
    }
    pickGuestUpgrade(id) {
      if (this.latest?.phase !== 'coop-guest-upgrade' ||
        !this.latest.guest?.choices?.includes(id) || this.guestUpgradeSubmitted) return false;
      this.guestUpgradeSubmitted = true;
      const success = this.rtc.send({ type: 'upgrade_pick', id, seq: this.seq++ });
      if (!success) this.guestUpgradeSubmitted = false;
      return success;
    }
    syncGuestUpgrade(frame, view) {
      const game = this.game;
      if (frame.phase !== 'coop-guest-upgrade' || !frame.guest.choices?.length) {
        this.guestUpgradeKey = null;
        this.guestUpgradeSubmitted = false;
        game.modalLevelup?.classList.remove('active');
        return;
      }
      const key = frame.guest.choices.join('|') + ':' + frame.teamXP.level +
        ':' + (frame.guest.upgradeRound || 0);
      if (key === this.guestUpgradeKey) return;
      this.guestUpgradeKey = key;
      this.guestUpgradeSubmitted = false;
      this.guestSelectionIdx = 0;
      const choices = frame.guest.choices.map(id => game.getCoopUpgradeDefinition(id)).filter(Boolean);
      if (!choices.length) return;
      view.endlessMode = false; // choices use the exact existing solo card component
      // Keep modal visible until authoritative confirmation arrives.
      view.pendingLevelUps = 2;
      view.state = 'levelup';
      view.applyUpgrade = upgrade => this.pickGuestUpgrade(upgrade.id);
      view.applyLimitBreak = upgrade => this.pickGuestUpgrade(upgrade.id);
      view.triggerLevelUp = () => {};
      game.renderUpgradeChoices.call(view, choices);
      game.modalLevelup?.classList.add('active');
    }
    updateGuestWeapons(dt) {
      const ally = this.ally, game = this.game;
      if (!ally || ally.hp <= 0) return;
      const nearest = game.enemies.filter(enemy => !enemy.dead).reduce((best, enemy) => {
        const distance = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        return distance < (best?.distance || 650) ? { enemy, distance } : best;
      }, null);
      if (nearest) {
        ally.aimAngle = Math.atan2(nearest.enemy.y - ally.y, nearest.enemy.x - ally.x);
      }
      // The existing SOLO weapon functions are reused on a host-owned player
      // context; their projectiles/effects join the one authoritative world.
      const source = Object.create(game);
      source.player = ally;
      source.dealDamage = (enemy, damage, sourceName, forceCrit) =>
        game.dealDamage(enemy, damage, sourceName, forceCrit, ally);
      const rules = {
        blaster: [0.35, 0.05, 0.12, 'fireBlaster'],
        tesla: [2.0, 0.25, 0.6, 'fireTesla'],
        missiles: [2.4, 0.3, 0.8, 'fireMissiles'],
        nova: [5.0, 0.6, 2, 'fireNova'],
        laser: [2.0, 0.28, 0.65, 'fireLaser'],
        blackhole: [5.5, 0.6, 2.4, 'fireBlackHole'],
        cryomine: [3.0, 0.35, 1.2, 'fireCryoMine']
      };
      for (const [id, level] of Object.entries(ally.weapons)) {
        const definition = rules[id];
        if (!definition || !level) continue;
        const [base, reduction, min, method] = definition;
        const cooldown = Math.max(min, base - (level - 1) * reduction) * ally.cdrMultiplier;
        const timer = (ally.timers[id] || 0) + dt;
        if (timer < cooldown) { ally.timers[id] = timer; continue; }
        ally.timers[id] = 0;
        if (game.bullets.length > 180 || game.enemyBullets.length > 140) continue;
        if (typeof game[method] === 'function') {
          const oldBulletCount = game.bullets.length;
          const oldHoleCount = game.blackHoles.length;
          const oldMineCount = game.mines.length;
          game[method].call(source, level);
          for (const bullet of game.bullets.slice(oldBulletCount)) bullet.owner = 'guest';
          for (const hole of game.blackHoles.slice(oldHoleCount)) hole.owner = 'guest';
          for (const mine of game.mines.slice(oldMineCount)) mine.owner = 'guest';
        }
      }
      // Orbiters use the same orbiting blade visual and collision rules.
      if (ally.weapons.orbit) {
        const level = ally.weapons.orbit;
        const count = Math.min(5, 1 + level);
        ally.orbitPhase = (ally.orbitPhase || 0) + dt * (3.2 + level * .5);
        for (let i = 0; i < count; i++) {
          const angle = ally.orbitPhase + i * Math.PI * 2 / count;
          const distance = 85 * ally.areaMultiplier;
          const x = ally.x + Math.cos(angle) * distance;
          const y = ally.y + Math.sin(angle) * distance;
          for (const enemy of game.enemies) {
            if (!enemy.dead && Math.hypot(enemy.x - x, enemy.y - y) < (enemy.radius || 12) + 9) {
              game.dealDamage(enemy, 28 * ally.dmgMultiplier * dt * 4, 'orbit', false, ally);
            }
          }
        }
      }
    }
    renderHost(ctx) {
      if (this.guestMode) {
        const snapshot = this.currentRenderState;
        if (!snapshot?.host) return;
        const host = snapshot.host;
        this.game.renderFighter(ctx, host,
          { color: host.color || '#00f3ff', name: host.name || '房主' }, true);
        const boss = snapshot.enemies?.find(enemy => enemy.type === 'boss_dual_reactor');
        if (boss) {
          window.NeonLanEncounters?.renderBoss(ctx,
            { isGuestWorldView: true, lanCoop: this }, boss);
        }
        if (snapshot.resonance?.tier) {
          ctx.save();
          ctx.lineWidth = snapshot.resonance.tier === 2 ? 3 : 2;
          ctx.strokeStyle = snapshot.resonance.tier === 2 ? '#80ffca' : '#60caff';
          ctx.setLineDash([11, 8]);
          ctx.beginPath();
          ctx.moveTo(host.x, host.y);
          ctx.lineTo(snapshot.guest.x, snapshot.guest.y);
          ctx.stroke();
          ctx.restore();
        }
        window.NeonLanTeammates?.update(
          this.game, { x: snapshot.guest.x, y: snapshot.guest.y },
          host, snapshot.guest,
          { name: host.name, color: host.color }, true
        );
        return;
      }
      if (!this.ally || !this.rtc.connected) {
        window.NeonLanTeammates?.hide();
        return;
      }
      const boss = this.game.currentBoss;
      if (boss?.type === 'boss_dual_reactor') {
        window.NeonLanEncounters?.renderBoss(ctx, this.game, boss);
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
      this.perf?.frame(perfStart, performance.now());
      const teammate = this.ally.profile || normalizeProfile(null, 'guest');
      this.game.renderFighter(ctx, this.ally, teammate, true);
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
    sampleInput(consume = true) {
      const game = this.game, keys = game.keys || {};
      if (this.latest?.guest?.downed) {
        if (consume) this.dashQueued = false;
        return { type: 'input', seq: consume ? this.seq++ : this.seq, dx: 0, dy: 0,
          aim: this.latest.guest.aimAngle || 0, dash: false };
      }
      if (game.settingsOpen) {
        if (consume) this.dashQueued = false;
        return { type: 'input', seq: consume ? this.seq++ : this.seq, dx: 0, dy: 0,
          aim: this.latest?.guest?.aimAngle || 0, autoAim: true, dash: false };
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
      const aim = this.latest?.guest?.aimAngle || 0;
      const padDash = Boolean(pad?.buttons?.[0]?.pressed);
      const dash = this.dashQueued || (padDash && !this.previousGamepadDash);
      if (consume) {
        this.previousGamepadDash = padDash;
        this.dashQueued = false;
      }
      return { type: 'input', seq: consume ? this.seq++ : this.seq,
        dx, dy, aim, autoAim: true, dash };
    }
    updateGuest(dt) {
      if (!this.guestMode || !this.rtc.connected) return;
      this.profileAccumulator += dt;
      if (this.profileAccumulator >= 3) {
        this.profileAccumulator = 0;
        this.sendLocalProfile();
      }
      if (this.latest?.phase === 'coop-guest-upgrade') {
        const options = this.latest.guest?.choices || [];
        const keys = this.game.keys || {};
        const pad = Array.from(navigator.getGamepads?.() || []).find(p => p && p.connected !== false);
        const left = Boolean(pad?.buttons?.[14]?.pressed || keys.arrowleft);
        const right = Boolean(pad?.buttons?.[15]?.pressed || keys.arrowright);
        const accept = Boolean(pad?.buttons?.[0]?.pressed || keys.enter);
        const currentButtons = [left, right, accept].join(':');
        if (currentButtons !== this.previousMenuSelection) {
          if (left) this.guestSelectionIdx = (this.guestSelectionIdx + options.length - 1) %
            Math.max(1, options.length);
          if (right) this.guestSelectionIdx = (this.guestSelectionIdx + 1) %
            Math.max(1, options.length);
          if (accept && options.length) this.pickGuestUpgrade(options[this.guestSelectionIdx]);
        }
        this.previousMenuSelection = currentButtons;
        const number = ['1','2','3'].find(key => keys[key]);
        if (number && number !== this.lastNumberKey && options[Number(number) - 1]) {
          this.pickGuestUpgrade(options[Number(number) - 1]);
        }
        this.lastNumberKey = number;
        return;
      }
      this.previousMenuSelection = '';
      this.lastNumberKey = '';
      // Predict local steering immediately (display-only, no damage or kills).
      // Host snapshots periodically reconcile this position.
      const canSteer = this.latest?.phase === 'playing' && !this.latest?.guest?.downed &&
        !this.game.settingsOpen;
      if (this.predicted && canSteer) {
        // Sample without consuming dash edges each display frame: a newly
        // pressed movement direction should not wait for the next 30Hz packet.
        const input = this.sampleInput(false);
        const thruster = this.latest.guest?.passives?.thruster || 0;
        const speed = Math.min(385,
          (240 + Math.min(120, ((this.latest.teamXP?.level || 1) - 1) * 6)) *
          (1 + .15 * thruster));
        this.predicted.x += input.dx * speed * dt;
        this.predicted.y += input.dy * speed * dt;
      }
      this.inputAccumulator += dt;
      if (this.inputAccumulator >= 1 / INPUT_HZ) {
        this.inputAccumulator = 0;
        this.lastInput = this.sampleInput();
        this.rtc.send(this.lastInput);
      }
    }
    renderGuest() {
      const game = this.game, state = this.latest;
      const perfStart = this.perf ? performance.now() : 0;
      if (!state) {
        window.NeonLanTeammates?.hide();
        game.ctx.clearRect(0, 0, game.width, game.height);
        game.ctx.fillStyle = '#050a18';
        game.ctx.fillRect(0, 0, game.width, game.height);
        game.ctx.fillStyle = '#a8efff';
        game.ctx.font = '18px system-ui';
        game.ctx.fillText('正在同步房主战场…', 24, game.height / 2);
        return;
      }
      const progress = Math.min(1, (performance.now() - this.receivedAt) / (1000 / hz));
      // Tests and older peer adapters may assign latest directly.
      if (!this.frameSampler && window.NeonLanWorldView) {
        this.frameSampler = window.NeonLanWorldView.createSampler(state, this.previous);
      }
      const frame = this.frameSampler?.sample(progress) || state;
      if (this.predicted) {
        frame.guest.x = this.predicted.x;
        frame.guest.y = this.predicted.y;
      }
      const world = window.NeonLanWorldView;
      if (!this.guestView && world) this.guestView = world.create(game, frame, this);
      const view = this.guestView && world?.updateView(this.guestView, frame, game, this);
      if (!view) return;
      this.currentRenderState = frame;
      // Invoke the production render() directly. No duplicate game painter.
      game.render.call(view);
      window.NeonLanRevive?.overlay(game.ctx, game, frame);
      // HUD DOM writes, innerHTML and card reconciliation only belong to new
      // network state (~15Hz), not every 60/120Hz paint.
      if (this.lastGuestHudSeq !== state.seq) {
        this.lastGuestHudSeq = state.seq;
        game.updateHUD.call(view);
        const loadout = JSON.stringify([frame.guest.weapons, frame.guest.passives,
          frame.guest.dashUpgrades, frame.teamXP?.level]);
        if (this.lastHudLoadout !== loadout) {
          game.renderWeaponsHUD.call(view);
          this.lastHudLoadout = loadout;
        }
        this.syncGuestUpgrade(frame, view);
        const bossName = document.getElementById('boss-name');
        if (bossName && view.currentBoss) {
          const title = view.currentBoss.type === 'boss_dual_reactor' ? '双生裁决者 · 共振要塞' :
            view.currentBoss.type === 'boss_carrier' ? '欧米茄母舰' :
            view.currentBoss.type === 'boss_nexus' ? '风暴枢纽' : '奇点吞噬者';
          if (bossName.textContent !== title) bossName.textContent = title;
        }
      }
      if (frame.phase === 'paused' || frame.phase === 'levelup' ||
        (frame.phase !== 'playing' && frame.phase !== 'lan-client' &&
          frame.phase !== 'coop-guest-upgrade')) {
        const ctx = game.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(4, 12, 25, .72)';
        ctx.fillRect(0, 0, game.width, game.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a8f5ff';
        ctx.font = 'bold 22px system-ui';
        const announcement = frame.phase === 'paused' ? '房主已暂停' :
          frame.phase === 'gameover' ? '双人挑战结束' :
          frame.phase === 'victory' ? '双人挑战胜利' : '等待房主完成阶段选择';
        ctx.fillText(announcement,
          game.width / 2, game.height / 2 - 12);
        ctx.font = '14px system-ui';
        ctx.fillText('房客无法控制全局暂停', game.width / 2, game.height / 2 + 20);
        ctx.restore();
      }
    }
  }
  window.NeonLanCoop = Object.freeze({ Coop, newAlly, normalizeInput,
    snapshot, boundedSnapshot, safeSnapshot });
})();
