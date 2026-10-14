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
  /** A remote pilot. The registry owns its shape; there is deliberately no
   *  inline fallback, because a second copy of the pilot shape is exactly how
   *  the ally ended up with two names for every dash value. */
  function newAlly(game, shipId = 'riftblade', playerId = 'guest') {
    if (!window.NeonPlayers?.createRemotePilot) {
      throw new Error('NeonPlayers must load before the co-op transport');
    }
    return window.NeonPlayers.createRemotePilot(game, playerId, shipId);
  }

  /** One pilot block. The host block and the guest block are the SAME shape:
   *  one declaration in schema.js, scoped only where the protocol genuinely
   *  differs (upgrade negotiation belongs to a remote pilot). */
  function pilotBlock(pilot, scope, identity) {
    return window.NeonLanSchema.readPilot(pilot, { scope, identity });
  }

  function snapshot(game, ally, seq, resonance = null, receiverId = 'guest') {
    const schema = window.NeonLanSchema;
    const nearbyEnemies = [...(game.enemies || [])].filter(enemy => !enemy.dead)
      .sort((a, b) => {
        if (Boolean(a.isBoss) !== Boolean(b.isBoss)) return a.isBoss ? -1 : 1;
        const dist = enemy => Math.min(...[game.player,
          ...(game.lanCoop?.allies?.values?.() || [ally])].map(p =>
          Math.hypot(enemy.x - p.x, enemy.y - p.y)));
        return dist(a) - dist(b);
      });
    const drones = schema.readEntities(game.companionDrones,
      schema.ENTITY_ARRAYS.find(entry => entry.name === 'companionDrones'));
    const orbiters = schema.readEntities(game.orbiters,
      schema.ENTITY_ARRAYS.find(entry => entry.name === 'orbiters'))
      .map(orb => ({ ...orb, centerX: round(game.player.x), centerY: round(game.player.y) }));
    const frame = {
      type: 'snapshot', seq, round: game.lanCoop?.roundId || 0,
      time: round(game.survivalTime),
      level: game.player.level, kills: game.kills,
      difficulty: game.difficulty || 0, mode: game.endlessMode ? 'endless' : 'normal',
      teamXP: window.NeonLanExperience?.progress(game) || {
        xp: game.player.xp || 0, xpNeeded: game.player.xpNeeded || 1,
        level: game.player.level
      },
      phase: game.state,
      rescue: window.NeonLanRevive?.summary(game) || null,
      ...( (game.lanCoop?.allies?.size || 0) > 1
        ? { rescue: window.NeonLanMultiRules?.summary(game) || null } : {}),
      resonance: resonance ? {
        tier: resonance.link?.tier || 0,
        distance: round(resonance.link?.distance || 0),
        damageBonus: resonance.link?.damageBonus || 0,
        pulseCooldown: round(resonance.pulseCooldown || 0),
        shieldSource: Boolean(resonance.link?.shieldSource),
        shieldNext: round(resonance.link?.shieldSource
          ? Math.max(0, 12 - (resonance.shieldTimer || 0)) : 0),
        shieldHost: window.NeonLanResonance?.remainingShield(game.player, game.survivalTime) || 0,
        shieldGuest: window.NeonLanResonance?.remainingShield(ally, game.survivalTime) || 0,
        threatFactor: round(resonance.threatFactor || 1)
      } : { tier: 0, distance: 0, damageBonus: 0, pulseCooldown: 0 },
      host: pilotBlock(game.player, 'local', ownProfile('host')),
      guest: {
        ...pilotBlock(ally, 'remote', ally.profile || normalizeProfile(null, 'guest')),
        // Companion drones and orbiters for the guest's own weapons are
        // synthesised from its loadout, because the host only simulates the
        // host's own ones. They are appended AFTER the cap, as before.
        companionDrones: [
          ...drones,
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
          ...orbiters,
          ...Array.from({ length: ally.weapons?.orbit ? Math.min(5, 1 + ally.weapons.orbit) : 0 },
            (_, i) => ({
              id: 800000 + i, angle: round((ally.orbitPhase || 0) + i * Math.PI * 2 /
                Math.min(5, 1 + ally.weapons.orbit)), distance: round(85 * ally.areaMultiplier),
              radius: round(9 * ally.areaMultiplier), color: '#00ffaa',
              centerX: round(ally.x), centerY: round(ally.y)
            }))
        ]
      },
      enemies: schema.readEntities(nearbyEnemies,
        schema.ENTITY_ARRAYS.find(entry => entry.name === 'enemies'))
    };
    // Every remaining entity array comes straight from the contract.
    for (const spec of schema.ENTITY_ARRAYS) {
      if (frame[spec.name]) continue;
      frame[spec.name] = schema.readEntities(game[spec.name], spec);
    }
    return window.NeonLanSnapshots?.decorate(frame, game, receiverId) || frame;
  }

  // Keep within the RTCDataChannel's 40k frame limit, so crowded boss fights
  // do not silently stop synchronizing. Critical players and boss entities are
  // never removed. The budget, the trim order and the per-layer floors are all
  // declared in schema.js, next to the caps they have to agree with.
  const SNAPSHOT_LIMIT = 18000;
  function boundedSnapshot(game, ally, seq, resonance = null, receiverId = 'guest') {
    const schema = window.NeonLanSchema;
    const frame = snapshot(game, ally, seq, resonance, receiverId);
    const LIMIT = SNAPSHOT_LIMIT;
    let size = JSON.stringify(frame).length;
    if (size <= LIMIT) return frame;
    const trim = (items, floor) => {
      while (items?.length > floor && size > LIMIT) {
        // JSON-stringifying the whole snapshot for every removed effect caused
        // quadratic CPU spikes in dense fights.
        const last = items[items.length - 1];
        size -= JSON.stringify(last).length + (items.length > 1 ? 1 : 0);
        items.pop();
      }
    };
    // Pass 1: shave every decorative layer down to its floor, so the loss is
    // spread across the effects instead of emptying whichever layer is first.
    for (const spec of schema.TRIM_ORDER) trim(frame[spec.name], spec.floor);
    if (size <= LIMIT) return frame;
    // Pass 2: still oversized, so the floors have to go too.
    for (const spec of schema.TRIM_ORDER) trim(frame[spec.name], 0);
    if (size <= LIMIT) return frame;
    // Bosses survive priority culling; trim only regular enemies. There is no
    // floor here: the budget wins, and only bosses are guaranteed to remain.
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
  /** Validate a frame against the SAME declarations the producer uses, so the
   *  producer's caps and the validator's caps cannot disagree. They used to be
   *  written twice, with gems at 90 in both and therefore zero margin: raising
   *  the producer cap by one would have made this reject EVERY frame, which
   *  looks exactly like the "stuck on 正在同步房主战场" freeze. */
  function safeSnapshot(data) {
    const schema = window.NeonLanSchema;
    if (!data || data.type !== 'snapshot' || !data.host || !data.guest) return false;
    if (!Number.isSafeInteger(data.seq) || data.seq < 0) return false;
    // A peer announcing a newer contract would be misread silently; refuse it.
    if (Number.isSafeInteger(data.protocolVersion) &&
        data.protocolVersion > schema.VERSION) return false;
    for (const name of schema.requiredPilotFields()) {
      if (!Number.isFinite(data.host[name]) || !Number.isFinite(data.guest[name])) return false;
    }
    for (const spec of schema.ENTITY_ARRAYS) {
      const list = data[spec.name];
      // Absent arrays already read as empty, so they are not an error; a
      // PRESENT array must respect the same cap the producer declares.
      if (list === undefined) continue;
      if (!Array.isArray(list) || list.length > spec.safeCap) return false;
    }
    return Array.isArray(data.enemies);

  }
  function guestChoosingUpgrade(frame) {
    return (frame?.phase === 'levelup' || frame?.phase === 'coop-guest-upgrade') &&
      frame.guest?.upgradeFinished !== true &&
      Array.isArray(frame.guest?.choices) && frame.guest.choices.length > 0;
  }
  class Coop {
    constructor(game, rtc) {
      this.game = game;
      this.rtc = rtc;
      this.ally = null;
      this.allies = new Map();
      this.pendingProfiles = new Map();
      this.pendingShips = new Map();
      this.resonances = new Map();
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
      this.predictedDashFeedbackAt = -Infinity;
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
      this.roundId = 0;
      this.dashQueued = false;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
      this.rescue = window.NeonLanRevive?.newRun() || null;
      this.guestMode = false;
      this.previousGamepadDash = false;
      this.pendingGuestProfile = null;
      this.pendingGuestShipId = null;
      this.awaitingGuestShip = false;
      this.launchingMatch = false;
      this.launchingMatch = false;
      this.guestShipWaitPanel = null;
      this.readyRoom = null;
      this.launchingMatch = false;
      this.remoteReady = null;
      this.localReady = false;
      this.readySeq = 0;
      this.readyRevision = -1;
      this.refreshReadyView = null;
      this.rescue = null;
      this.profileAccumulator = 0;
    }
    // The host owns the pre-match roster, readiness and match start.
    awaitGuestShip() {
      if (this.rtc.role !== 'host' || !this.rtc.connected) return false;
      if (this.awaitingGuestShip) return false;
      this.awaitingGuestShip = true;
      this.launchingMatch = false;
      this.game.state = 'lan-waiting';
      this.localReady = false;
      this.readyRoom = new window.NeonLanReady.ReadyRoom(this.rtc.capacity || 2);
      this.readyRoom.set('host', {
        shipId: window.NeonShips.resolve(this.game.selectedShipId).id,
        name: ownProfile('host').name, connected: true
      });
      if (this.pendingGuestShipId) this.readyRoom.set('guest', {
        shipId: this.pendingGuestShipId,
        name: this.pendingGuestProfile?.name || '队友', connected: true
      });
      for (const [id, shipId] of this.pendingShips) {
        this.readyRoom.set(id, { shipId,
          name: this.pendingProfiles.get(id)?.name || '队友', connected: true });
      }
      window.NeonLanReady.mount(this);
      this.broadcastReady();
      return true;
    }
    enterGuestReady() {
      if (this.rtc.role !== 'guest' || !this.rtc.connected) return false;
      this.guestMode = false;
      this.latest = null;
      this.previous = null;
      this.predicted = null;
      this.frameSampler = null;
      this.guestView = null;
      this.lastGuestHudSeq = -1;
      this.lastSnapshotSeq = -1;
      this.guestUpgradeKey = null;
      this.guestShipWaitPanel?.remove();
      this.game.hideAllModals?.();
      this.game.releaseJoystickTouch?.();
      document.body.classList?.remove('neon-lan-guest');
      const pause = document.getElementById('btn-pause');
      if (pause && Object.hasOwn(pause.dataset, 'lanPreviousDisplay')) {
        pause.style.display = pause.dataset.lanPreviousDisplay;
        delete pause.dataset.lanPreviousDisplay;
      }
      this.game.state = 'lan-waiting';
      this.localReady = false;
      this.remoteReady = new window.NeonLanReady.ReadyRoom(this.rtc.capacity || 2).snapshot();
      this.readyRevision = -1;
      window.NeonLanReady.mount(this);
      this.sendLocalProfile();
      this.sendGuestReady(false);
      return true;
    }
    broadcastReady() {
      if (!this.readyRoom || this.rtc.role !== 'host') return false;
      this.refreshReadyView?.();
      const packet = { type: 'ready_roster', ...this.readyRoom.snapshot() };
      return this.rtc.broadcastToGuests
        ? this.rtc.broadcastToGuests(packet).length > 0
        : this.rtc.send(packet);
    }
    sendGuestReady(ready) {
      if (this.rtc.role !== 'guest' || !this.rtc.connected ||
          this.game.state !== 'lan-waiting') return false;
      const ship = window.NeonShips?.get(this.game.selectedShipId);
      if (!ship?.playable) return false;
      const delivered = this.rtc.send({
        type: 'ready_update', seq: this.readySeq++,
        round: this.roundId, shipId: ship.id, ready
      });
      if (delivered) this.localReady = ready;
      this.refreshReadyView?.();
      return delivered;
    }
    selectReadyShip(id) {
      const ship = window.NeonShips?.get(id);
      if (!ship?.playable || this.localReady ||
          this.game.state !== 'lan-waiting') return false;
      this.game.selectedShipId = id;
      if (this.rtc.role === 'host') {
        if (!this.readyRoom?.set('host', { shipId: id, ready: false })) return false;
        this.broadcastReady();
        return true;
      }
      return this.sendGuestReady(false);
    }
    setReady(ready) {
      if (typeof ready !== 'boolean' || !this.rtc.connected ||
          this.game.state !== 'lan-waiting') return false;
      if (this.rtc.role === 'host') {
        if (!this.readyRoom?.set('host', { ready })) return false;
        this.localReady = ready;
        this.broadcastReady();
        return true;
      }
      return this.sendGuestReady(ready);
    }
    beginHostMatch() {
      if (!this.awaitingGuestShip || !this.rtc.connected ||
          this.launchingMatch || !this.readyRoom?.canStart()) return false;
      const host = this.readyRoom.get('host');
      const guests = this.readyRoom.snapshot().members.filter(m => m.id !== 'host');
      if (!host || guests.some(m => !m.connected || !m.ready)) return false;
      const shipIds = Object.fromEntries(guests.map(m => [m.id, m.shipId]));
      const packet = {
        type: 'match_start', revision: this.readyRoom.revision,
        round: this.roundId + 1,
        hostShipId: host.shipId, guestShipId: shipIds.guest, shipIds
      };
      // Freeze all room mutations while match_start travels to each guest.
      // A fast first client immediately sends its profile on entering game;
      // that heartbeat must not change the revision for other guests.
      this.launchingMatch = true;
      const sent = this.rtc.broadcastToGuests
        ? this.rtc.broadcastToGuests(packet)
        : (this.rtc.send(packet) ? ['guest'] : []);
      if (sent.length !== guests.length) {
        this.launchingMatch = false;
        return false;
      }
      // Adopt the announced epoch BEFORE any snapshot is emitted. Guests set
      // their roundId from this packet, and they reject every snapshot whose
      // round does not match. Announcing roundId+1 without adopting it left the
      // host stamping snapshots with the OLD round, so a guest rejected all of
      // them and sat on "正在同步房主战场…" forever while its inputs kept
      // reaching the host.
      this.roundId = packet.round;
      this.readyRoom.start();
      this.game.selectedShipId = host.shipId;
      this.pendingGuestShipId = shipIds.guest;
      for (const [id, shipId] of Object.entries(shipIds)) this.pendingShips.set(id, shipId);
      this.awaitingGuestShip = false;
      this.guestShipWaitPanel?.remove();
      this.guestShipWaitPanel = null;
      this.refreshReadyView = null;
      this.game.startNewGame();
      // startNewGame() does not instantiate an ally before the first room
      // launch. New room restarts already owning an ally are handled there.
      if (!this.ally) this.startHost();
      this.launchingMatch = false;
      return true;
    }
    // Keep the current WebRTC room alive. All peers must re-enter readiness
    // instead of leaving remote clients stuck in their former battle state.
    returnToReady() {
      if (this.rtc.role !== 'host' || !this.rtc.connected ||
          this.awaitingGuestShip) return false;
      this.roundId++;
      const packet = {type:'ready_reset',round:this.roundId};
      if (this.rtc.broadcastToGuests) this.rtc.broadcastToGuests(packet);
      else this.rtc.send(packet);
      for (const id of this.allies.keys()) this.game.players?.remove(id);
      this.allies.clear();
      this.ally = null;
      this.readyRoom = null;
      this.guestShipWaitPanel?.remove();
      this.guestShipWaitPanel = null;
      this.game.hideAllModals?.();
      return this.awaitGuestShip();
    }
    // Quick restart skips the ready room but is still an explicit host command.
    // An incrementing round rejects late snapshots from the previous run.
    restartHostMatch() {
      if (this.rtc.role !== 'host' || !this.rtc.connected ||
          this.awaitingGuestShip || this.launchingMatch || !this.ally) return false;
      this.roundId++;
      const packet = {type:'match_restart',round:this.roundId};
      if (this.rtc.broadcastToGuests) this.rtc.broadcastToGuests(packet);
      else this.rtc.send(packet);
      return true;
    }
    onPeerConnected(id) {
      if (this.rtc.role !== 'host' || !this.readyRoom || !this.readyRoom.get(id)) return false;
      const pilot = this.readyRoom.get(id);
      // DataChannel.onopen and RTCPeerConnection.onconnectionstatechange can
      // both report the same connection; do not undo a player's Ready choice.
      if (!pilot.connected) this.readyRoom.set(id, { connected: true, ready: false });
      this.broadcastReady();
      return Boolean(pilot);
    }
    onPeerDisconnected(id) {
      if (this.rtc.role !== 'host') return false;
      if (this.readyRoom?.get(id)) {
        this.readyRoom.set(id, { connected: false, ready: false });
        this.broadcastReady();
      }
      // A departed pilot cannot continue moving, firing or granting buffs.
      const ally = this.allies.get(id);
      if (ally) {
        ally.disconnected = true;
        ally.downed = true;
        ally.hp = 0;
        ally.input = {dx:0,dy:0,dash:false};
      }
      return true;
    }
    startHost() {
      this.allies = new Map();
      this.resonances = new Map();
      const ids = ['guest','guest-2','guest-3'].slice(0, (this.rtc.capacity || 2) - 1);
      for (const id of ids) {
        const selectedShip = window.NeonShips?.get(this.pendingShips.get(id) ||
          (id === 'guest' ? this.pendingGuestShipId : null));
        const ally = newAlly(this.game, selectedShip?.playable ? selectedShip.id : 'riftblade', id);
        ally.disconnected = false;
        ally.profile = this.pendingProfiles.get(id) || (id === 'guest' && this.pendingGuestProfile) ||
          normalizeProfile(null, 'guest');
        this.allies.set(id, ally);
        this.resonances.set(id, { link: null, pulseCooldown: 0, lastDash: {} });
        if (this.game.players) {
          if (this.game.players.has(id)) this.game.players.replace(id, ally);
          else this.game.players.register(id, ally);
        }
        window.NeonShips?.runAbility?.(ally, 'onStart', this.game);
      }
      this.ally = this.allies.get('guest') || null;
      this.guestMode = false;
      this.latest = null;
      this.resonance = { link: null, pulseCooldown: 0, lastDash: {} };
      this.rescue = window.NeonLanRevive?.newRun() || null;
    }
    startGuest() {
      this.ally = null;
      for (const id of this.allies.keys()) this.game.players?.remove(id);
      this.allies.clear();
      this.resonances.clear();
      this.pendingProfiles.clear();
      this.pendingShips.clear();
      this.guestMode = true;
      this.latest = null;
      this.previous = null;
      this.predicted = null;
      this.predictedDashFeedbackAt = -Infinity;
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
        if (node) {
          // Repeated rounds must not overwrite the original display value.
          if (!Object.hasOwn(node.dataset, 'lanPreviousDisplay')) {
            node.dataset.lanPreviousDisplay = node.style.display;
          }
          node.style.display = 'none';
        }
      }
    }
    // Host-star authority: each guest gets an independent input clock,
    // pilot simulation and personal snapshot. No guest ever simulates combat.
    updateMultiHost(dt) {
      const game = this.game;
      if (this.resumeAfterUpgrades()) return;
      if (game.state === 'playing') {
        for (const [id, ally] of this.allies) {
          if (!this.rtc.peers?.get(id)?.control || ally.disconnected) continue;
          const input = window.NeonPilotSystem?.inputFor(ally, performance.now()) ||
            { dx:0, dy:0, aim:ally.aimAngle };
          window.NeonPilotSystem?.stepRemote(game, ally, input, dt);
          const resonance = this.resonances.get(id);
          if (resonance) window.NeonLanResonance?.update(game, ally, resonance, dt);
          this.updateGuestWeapons(dt, ally);
          if (ally.weapons?.drones) {
            const level = ally.weapons.drones;
            const count = Math.min(5, 1 + level);
            ally.dronePhase = (ally.dronePhase || 0) + dt * 2.4;
            ally.droneShotTime = (ally.droneShotTime || 0) + dt;
            if (ally.droneShotTime >= Math.max(.24, .58 - level * .07) * ally.cdrMultiplier) {
              ally.droneShotTime = 0;
              let target = null, closest = 550;
              for (const e of game.enemies) {
                if (e.dead) continue;
                const d = Math.hypot(e.x - ally.x, e.y - ally.y);
                if (d < closest) { target = e; closest = d; }
              }
              if (target && game.bullets.length < 160) {
                const x = ally.x + Math.cos(ally.dronePhase) * 52;
                const y = ally.y + Math.sin(ally.dronePhase) * 52;
                const a = Math.atan2(target.y - y, target.x - x);
                game.bullets.push({ type:'blaster', x, y, vx:Math.cos(a)*900,
                  vy:Math.sin(a)*900, radius:3.5, life:1,
                  damage:22*ally.dmgMultiplier*(1+(level-1)*.3),
                  pierce:1, color:'#00ffaa', owner:id, ownerId:id });
              }
            }
          }
          window.NeonPilotSystem?.resolveRemoteHits(game, ally);
        }
        // Existing Resonance works on two ships at a time. Simulate each
        // guest-to-guest edge once, so support auras depend on actual spatial
        // proximity rather than being an unconditional global four-player buff.
        const members = [...this.allies.values()].filter(p => !p.disconnected);
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const first = members[i], second = members[j];
            const id = [first.id, second.id].sort().join(':');
            if (!this.resonances.has(id)) this.resonances.set(id,
              {link:null,shieldTimer:0,linkStable:0,pulseCooldown:0,lastDash:{}});
            const pairWorld = Object.create(game);
            pairWorld.player = first;
            window.NeonLanResonance?.update(pairWorld, second, this.resonances.get(id), dt);
          }
        }
        window.NeonLanMultiRules?.tick(game, [...this.allies.values()], dt);
      }
      this.sendAccumulator += dt;
      if (this.sendAccumulator >= (game.state === 'playing' ? 1 / hz : .2)) {
        this.sendAccumulator = 0;
        for (const [id, ally] of this.allies) {
          if (ally.disconnected) continue;
          this.rtc.sendTo(id, boundedSnapshot(game, ally,
            this.seq++, this.resonances.get(id) || this.resonance, id));
        }
      }
    }
    sendLocalProfile() {
      if (this.rtc.role !== 'guest' || !this.rtc.connected) return false;
      const p = ownProfile('guest');
      const selected = window.NeonShips?.resolve(this.game.selectedShipId);
      return this.rtc.send({
        type: 'profile', name: p.name, color: p.colorId,
        shipId: selected?.id || 'riftblade'
      });
    }
    stop() {
      this.perf?.destroy();
      this.perf = null;
      const survivorDisconnected = !this.guestMode && this.game.player?.downed &&
        this.ally?.hp > 0;
      this.guestMode = false;
      document.body.classList?.remove('neon-lan-guest');
      this.ally = null;
      this.game.players?.remove('guest');
      this.latest = null;
      this.previous = null;
      this.predicted = null;
      this.predictedDashFeedbackAt = -Infinity;
      this.dashQueued = false;
      this.guestUpgradeKey = null;
      this.game.modalLevelup?.classList.remove('active');
      this.pendingGuestProfile = null;
      this.pendingGuestShipId = null;
      this.awaitingGuestShip = false;
      this.readyRoom = null;
      this.remoteReady = null;
      this.localReady = false;
      this.readyRevision = -1;
      this.guestShipWaitPanel?.remove();
      this.guestShipWaitPanel = null;
      this.refreshReadyView = null;
      window.NeonLanTeammates?.hide();
      for (const id of ['btn-pause']) {
        const node = document.getElementById(id);
        if (node && Object.hasOwn(node.dataset, 'lanPreviousDisplay')) {
          node.style.display = node.dataset.lanPreviousDisplay;
          delete node.dataset.lanPreviousDisplay;
        }
      }
      if (this.game.state === 'lan-client' ||
          this.game.state === 'lan-waiting') this.game.showStartMenu();
      if (this.game.state === 'coop-guest-upgrade') {
        this.game.state = 'playing';
        this.game.lastTime = performance.now();
      }
      // If the host is already downed and the only survivor disconnects,
      // continuing solo would leave an unwinnable zero-HP game running.
      if (survivorDisconnected && this.game.state === 'playing') this.game.gameOver();
    }
    onMessage(message, remotePlayerId = 'guest') {
      // Sender identity comes from the bound DataChannel, not the JSON body.
      if (this.rtc.role === 'host' &&
          !['guest','guest-2','guest-3'].slice(0, (this.rtc.capacity || 2) - 1)
            .includes(remotePlayerId)) return;
      const sender = this.rtc.role === 'host'
        ? (this.allies.get(remotePlayerId) || (remotePlayerId === 'guest' ? this.ally : null))
        : null;
      if (this.rtc.role === 'host' && message?.type === 'profile') {
        const profile = normalizeProfile(message, 'guest');
        this.pendingProfiles.set(remotePlayerId, profile);
        if (remotePlayerId === 'guest') this.pendingGuestProfile = profile;
        if (sender) sender.profile = profile;
        // Class choice is allowed ONLY before the host begins a round; a
        // repeated profile heartbeat must never swap a combatant mid-game.
        const selected = window.NeonShips?.get(message.shipId);
        if (!this.launchingMatch && !this.readyRoom?.started &&
            this.game.state !== 'playing' && this.game.state !== 'levelup' &&
            this.game.state !== 'coop-guest-upgrade' && !this.allies.size) {
          const shipId = selected?.playable ? selected.id : 'riftblade';
          this.pendingShips.set(remotePlayerId, shipId);
          if (remotePlayerId === 'guest') this.pendingGuestShipId = shipId;
          if (this.readyRoom?.set(remotePlayerId, {
            shipId, name: profile.name, connected: true
          })) this.broadcastReady();
        }
        return;
      }
      if (this.rtc.role === 'host' && message?.type === 'ship_action') {
        if (!sender || sender.shipId !== 'phantom' ||
            this.game.state !== 'playing' || sender.downed || sender.hp <= 0 ||
            !['dock_toggle','strike','sprint','vortex'].includes(message.action) ||
            !Number.isSafeInteger(message.seq) || message.seq < 0 ||
            message.seq <= (sender.lastShipActionSeq ?? -1)) return;
        sender.lastShipActionSeq = message.seq;
        if (message.action === 'sprint') {
          window.NeonShips?.runAbility?.(sender, 'onAction', this.game, 'sprint');
        } else if (message.action === 'vortex' || message.action === 'strike') {
          window.NeonShips?.runAbility?.(sender, 'onAction', this.game, 'vortex');
        } else if (sender.phantom?.docked) {
          window.NeonShips?.runAbility?.(sender, 'onAction', this.game,
            {kind:'undock',eject:true});
        } else if (this.game.player.hp > 0 && !this.game.player.downed) {
          window.NeonShips?.runAbility?.(sender, 'onAction', this.game,
            {kind:'dock',carrier:this.game.player});
        }
        return;
      }
      if (this.rtc.role === 'host' && message?.type === 'ready_update') {
        if (!this.awaitingGuestShip || this.game.state !== 'lan-waiting' ||
            !this.readyRoom || typeof message.ready !== 'boolean') return;
        // Old queued ready packets may arrive after a return-to-ready cycle.
        // New rounds require an explicit epoch; only initial epoch zero may
        // accept older clients/tests that omit it.
        if ((this.roundId > 0 && message.round !== this.roundId) ||
            (message.round !== undefined && message.round !== this.roundId)) return;
        const ship = window.NeonShips?.get(message.shipId);
        if (!ship?.playable) return;
        const current = this.readyRoom.get(remotePlayerId);
        // Switching ships always needs a fresh, separate Ready press.
        if (current?.shipId !== ship.id && message.ready) return;
        if (this.readyRoom.set(remotePlayerId, {
          seq: message.seq, shipId: ship.id, connected: true,
          ready: message.ready
        })) {
          this.pendingShips.set(remotePlayerId, ship.id);
          if (remotePlayerId === 'guest') this.pendingGuestShipId = ship.id;
          this.broadcastReady();
        }
        return;
      }
      if (this.rtc.role === 'guest' && message?.type === 'ready_roster') {
        if (this.game.state !== 'lan-waiting' ||
            !window.NeonLanReady?.validSnapshot(message) ||
            message.revision < this.readyRevision) return;
        this.readyRevision = message.revision;
        this.remoteReady = {
          capacity: message.capacity, revision: message.revision,
          canStart: message.canStart, members: message.members.map(member => ({ ...member }))
        };
        this.refreshReadyView?.();
        return;
      }
      if (this.rtc.role === 'guest' && message?.type === 'ready_reset') {
        if (!Number.isSafeInteger(message.round) || message.round <= this.roundId ||
            !this.rtc.connected) return;
        this.roundId = message.round;
        this.enterGuestReady();
        return;
      }
      if (this.rtc.role === 'guest' && message?.type === 'match_restart') {
        if (!Number.isSafeInteger(message.round) || message.round <= this.roundId ||
            !this.rtc.connected || !this.guestMode) return;
        this.roundId = message.round;
        this.startGuest();
        return;
      }
      if (this.rtc.role === 'guest' && message?.type === 'match_start') {
        const mine = this.rtc.localPlayerId || 'guest';
        if (this.game.state !== 'lan-waiting' || !this.localReady ||
            !this.remoteReady?.canStart ||
            message.revision !== this.readyRevision ||
            (message.shipIds?.[mine] || message.guestShipId) !== this.game.selectedShipId ||
            !window.NeonShips?.get(message.hostShipId)?.playable) return;
        if (!Number.isSafeInteger(message.round) || message.round <= this.roundId) return;
        this.roundId = message.round;
        this.guestShipWaitPanel?.remove();
        this.guestShipWaitPanel = null;
        this.refreshReadyView = null;
        this.remoteReady = null;
        this.startGuest();
        return;
      }
      if (this.rtc.role === 'host' && message?.type === 'spell_cast') {
        if (this.game.state !== 'playing' || !sender ||
            sender.shipId !== 'astra' || sender.downed || sender.hp <= 0 ||
            !Number.isSafeInteger(message.seq) || message.seq < 0 ||
            message.seq <= (sender.lastSpellSeq ?? -1) ||
            (message.spell !== 'meteor' && message.spell !== 'ward')) return;
        sender.lastSpellSeq = message.seq;
        // No network-controlled targets, mana, cooldown or damage fields.
        // The registered class hook checks all costs and hit limits on host.
        window.NeonShips?.runAbility?.(sender, 'onAction', this.game, message.spell);
        return;
      }
      if (this.rtc.role === 'host' &&
          (message?.type === 'upgrade_pick' || message?.type === 'upgrade_done')) {
        // A guest cannot choose arbitrary upgrades, spend someone else's card,
        // or alter state outside the shared upgrade phase.
        if ((this.game.state !== 'coop-guest-upgrade' && this.game.state !== 'levelup') ||
          !sender || sender.upgradeFinished ||
          !Number.isSafeInteger(message.seq) || message.seq <= (sender.lastUpgradeSeq ?? -1)) return;
        if (message.type === 'upgrade_done') {
          sender.lastUpgradeSeq = message.seq;
          this.finishGuestUpgrade(remotePlayerId);
          return;
        }
        if (sender.pendingUpgrades <= 0 ||
          sender.pickedUpgradeIds.length >= sender.upgradeCapacity ||
          typeof message.id !== 'string' || !sender.choices.includes(message.id) ||
          sender.pickedUpgradeIds.includes(message.id)) return;
        const upgrade = this.game.getCoopUpgradeDefinition(message.id, sender);
        if (!this.game.isUpgradeAvailableFor(sender, upgrade)) return;
        sender.lastUpgradeSeq = message.seq;
        this.applyGuestUpgrade(upgrade, sender);
        sender.pendingUpgrades = Math.max(0, sender.pendingUpgrades - 1);
        sender.pickedUpgradeIds.push(upgrade.id);
        sender.upgradeRound++;
        const hasChoices = sender.choices.some(id =>
          !sender.pickedUpgradeIds.includes(id) &&
          this.game.isUpgradeAvailableFor(sender, this.game.getCoopUpgradeDefinition(id, sender)));
        if (!sender.pendingUpgrades ||
          sender.pickedUpgradeIds.length >= sender.upgradeCapacity || !hasChoices) {
          this.finishGuestUpgrade(remotePlayerId);
        }
        return;
      }
      if (this.rtc.role === 'host' && sender) {
        const input = normalizeInput(message);
        if (!input || input.seq <= sender.lastSeq) return;
        // A guest cannot advance a dash (or any world action) during host pause.
        // Fresh input is required after the host resumes.
        if (this.game.state !== 'playing' || sender.downed) {
          sender.lastSeq = input.seq;
          return;
        }
        sender.input = input;
        sender.lastSeq = input.seq;
        sender.lastInputAt = performance.now();
        if (input.dash && window.NeonPilotSystem?.startDash(this.game, sender)) {
          window.NeonLanResonance?.recordDash(this.game, sender,
            this.resonances.get(remotePlayerId) || this.resonance, 'guest');
          if (this.allies.size > 1) {
            // Also recognize simultaneous blinks between two remote ships.
            for (const [otherId, other] of this.allies) {
              if (otherId === remotePlayerId || other.disconnected || other.downed) continue;
              const ids = [remotePlayerId, otherId].sort();
              const pairKey = ids.join(':');
              if (!this.resonances.has(pairKey)) this.resonances.set(pairKey,
                {link:null,shieldTimer:0,linkStable:0,pulseCooldown:0,lastDash:{}});
              const pairWorld = Object.create(this.game);
              pairWorld.player = this.allies.get(ids[0]);
              window.NeonLanResonance?.recordDash(pairWorld,
                this.allies.get(ids[1]), this.resonances.get(pairKey),
                remotePlayerId === ids[0] ? 'host' : 'guest');
            }
          }
        }
      } else if (this.guestMode && safeSnapshot(message) &&
          message.round === this.roundId && message.seq > this.lastSnapshotSeq) {
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
        this.predicted = window.NeonLanPrediction?.reconcile(
          this.predicted, guest, this.receivedAt) ||
          { x: guest.x, y: guest.y };
      }
    }
    resumeAfterUpgrades() {
      const participants = this.allies.size > 0 ? [...this.allies.values()] :
        (this.ally ? [this.ally] : []);
      if (this.game.state !== 'coop-guest-upgrade' ||
          this.game.upgradeSession || !participants.length ||
          participants.some(ally => !ally.upgradeFinished)) return false;
      this.game.state = 'playing';
      this.game.lastTime = performance.now();
      return true;
    }
    prepareGuestUpgrade() {
      if (this.rtc.role !== 'host' || !this.rtc.connected) return;
      for (const [id, ally] of this.allies.size ? this.allies :
        (this.ally ? [['guest', this.ally]] : [])) {
        if (ally.pendingUpgrades <= 0 || !ally.upgradeFinished || ally.downed) continue;
        ally.pickedUpgradeIds = [];
        ally.upgradeCapacity = Math.min(3, ally.pendingUpgrades);
        ally.upgradeFinished = false;
        ally.choices = this.game.getCoopUpgradeChoices(ally);
        if (!ally.choices.length) this.finishGuestUpgrade(id);
      }
    }
    finishGuestUpgrade(id = 'guest') {
      const ally = this.allies.get(id) || (id === 'guest' ? this.ally : null);
      if (!ally || ally.upgradeFinished) return;
      ally.upgradeFinished = true;
      ally.choices = [];
      ally.legendaryPityId = null;
      ally.upgradeRound++;
      this.resumeAfterUpgrades();
    }
    waitForGuestUpgrade() {
      if (this.rtc.role !== 'host' || !this.rtc.connected) return false;
      // Guest drafts are prepared exactly once by triggerLevelUp(). Reopening
      // here would turn a banked credit into a second modal in the SAME level.
      const participants = this.allies.size ? [...this.allies.values()] :
        (this.ally ? [this.ally] : []);
      if (!participants.some(p => !p.upgradeFinished)) return false;
      this.game.state = 'coop-guest-upgrade';
      return true;
    }
    renderHostUpgradeWait(ctx) {
      if (this.game.state !== 'coop-guest-upgrade' ||
          ![...this.allies.values()].some(p => !p.upgradeFinished) &&
          this.ally?.upgradeFinished) return;
      ctx.save();
      ctx.fillStyle = 'rgba(5, 15, 31, .78)';
      ctx.fillRect(0, 0, this.game.width, this.game.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a9fcea';
      ctx.font = 'bold 23px system-ui';
      ctx.fillText('你的升级已完成', this.game.width / 2, this.game.height / 2 - 20);
      ctx.fillStyle = '#dceeff';
      ctx.font = '15px system-ui';
      ctx.fillText('等待队友选择升级…', this.game.width / 2, this.game.height / 2 + 14);
      ctx.restore();
    }
    updateHost(dt) {
      if (!this.ally || !this.rtc.connected) return;
      if ((this.rtc.capacity || 2) > 2) {
        this.updateMultiHost(dt);
        return;
      }
      const ally = this.ally, game = this.game;
      // Only triggerLevelUp() opens a new guest draft. Saved credits must not
      // reopen the menu on each render tick while the host is still choosing.
      if (this.resumeAfterUpgrades()) return;
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
      const input = window.NeonPilotSystem?.inputFor(ally, performance.now()) ||
        { dx: 0, dy: 0, aim: ally.aimAngle };
      window.NeonPilotSystem?.stepRemote(game, ally, input, dt);
      window.NeonLanResonance?.update(game, ally, this.resonance, dt);
      // The world calls NeonShips.onTick for every registered pilot. Running
      // class weapons here again would double remote fire and mana recovery.
      this.updateGuestWeapons(dt);
      if (ally.weapons.drones) {
        const level = ally.weapons.drones;
        const nearest = game.enemies.filter(enemy => !enemy.dead).reduce((best, enemy) => {
          const distance = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
          return distance < (best?.distance || 550) ? { enemy, distance } : best;
        }, null);
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
              pierce: 1, color: '#00ffaa', life: 1.0,
              owner: ally.id || 'guest', ownerId: ally.id || 'guest'
            });
          }
        }
      }
      // All registered remote pilots use the same authority-only projectile,
      // contact, shield and one-time cheat-death resolver.
      window.NeonPilotSystem?.resolveRemoteHits(game, ally);
      if (ally.hp <= 0 && !ally.downed) window.NeonLanRevive?.knockDown(game, 'guest');
      window.NeonLanRevive?.tick(game, dt);
      this.sendAccumulator += dt;
      if (this.sendAccumulator >= 1 / hz) {
        this.sendAccumulator = 0;
        this.rtc.send(boundedSnapshot(game, ally, this.seq++, this.resonance));
      }
    }
    getLinkBonus(attacker = this.game.player) {
      if (this.allies.size > 1) {
        const team = [this.game.player, ...this.allies.values()].filter(p =>
          p && !p.disconnected && p.hp > 0 && !p.downed);
        if (!team.includes(attacker)) return 0;
        return Math.max(0, ...team.filter(p => p !== attacker).map(ally =>
          window.NeonLanResonance?.link(attacker, ally,
            { threatFactor: this.resonances.get(ally.id)?.threatFactor || 1 }).damageBonus || 0));
      }
      return this.rtc.connected && this.ally && window.NeonLanResonance
        ? window.NeonLanResonance.link(this.game.player, this.ally, {
          threatFactor: this.resonance.threatFactor || 1
        }).damageBonus : 0;
    }
    onHostDash() {
      if (this.allies.size > 1) {
        let triggered = false;
        for (const [id, ally] of this.allies) {
          triggered = window.NeonLanResonance?.recordDash(this.game, ally,
            this.resonances.get(id), 'host') || triggered;
        }
        return triggered;
      }
      if (this.ally && this.rtc.connected) {
        return window.NeonLanResonance?.recordDash(this.game, this.ally, this.resonance, 'host') || false;
      }
      return false;
    }
    applyGuestUpgrade(upgrade, ally = this.ally) {
      if (!ally) return;
      if (window.NeonShips?.runAbility?.(ally, 'onUpgrade', this.game, upgrade) === true) return;
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
      // Give the ally the SAME derived stats the host's own pilot gets, so the
      // guest's dock, HUD and aura match instead of showing a hardcoded 95
      // slash damage, no combo and no aegis/fire/cryo badges. Speed is
      // recalculated too: it was previously frozen at the ship's base value,
      // so a guest that picked Thruster never actually got faster.
      this.game.recalculateDashStats?.(ally);
      PilotSpeed.recalculate(ally);
    }
    pickGuestUpgrade(id) {
      if (!guestChoosingUpgrade(this.latest) ||
        !this.latest.guest?.choices?.includes(id) ||
        this.latest.guest?.pickedUpgradeIds?.includes(id) || this.guestUpgradeSubmitted) return false;
      this.guestUpgradeSubmitted = true;
      const success = this.rtc.send({ type: 'upgrade_pick', id, seq: this.seq++ });
      if (!success) this.guestUpgradeSubmitted = false;
      else this.showGuestUpgradeWait('升级已提交，等待房主确认…');
      return success;
    }
    selectGuestUpgradePreview(id) {
      if (!guestChoosingUpgrade(this.latest) || this.guestUpgradeSubmitted ||
          !this.latest.guest?.choices?.includes(id) ||
          this.latest.guest?.pickedUpgradeIds?.includes(id)) return false;
      const view = this.guestUpgradeView;
      if (view?.selectUpgradePreview && view.currentUpgradeChoices) {
        const card = view.currentUpgradeChoices.find(item => item.id === id);
        if (!view.selectUpgradePreview(card)) return false;
      }
      this.pendingGuestUpgradeId = id;
      this.guestSelectionIdx = this.latest.guest.choices.indexOf(id);
      return true;
    }
    cancelGuestUpgradePreview() {
      if (!this.pendingGuestUpgradeId && !this.guestUpgradeView?.pendingUpgradeId) return false;
      this.pendingGuestUpgradeId = null;
      this.guestUpgradeView?.cancelUpgradePreview?.();
      return true;
    }
    confirmGuestUpgradePreview() {
      const id = this.guestUpgradeView?.pendingUpgradeId || this.pendingGuestUpgradeId;
      if (!id) return false;
      // The guest-side card view uses the same explicit confirmation method
      // as solo/host. Stubs without a rendered view still use the same gate.
      const success = this.guestUpgradeView?.confirmUpgradePreview
        ? this.guestUpgradeView.confirmUpgradePreview()
        : this.pickGuestUpgrade(id);
      if (success) this.pendingGuestUpgradeId = null;
      return success;
    }
    requestGuestUpgradeFinish() {
      if (!guestChoosingUpgrade(this.latest) || this.guestUpgradeSubmitted) return false;
      this.guestUpgradeSubmitted = true;
      const success = this.rtc.send({ type: 'upgrade_done', seq: this.seq++ });
      if (!success) this.guestUpgradeSubmitted = false;
      else this.showGuestUpgradeWait('已保留剩余强化机会，等待队友完成…');
      return success;
    }
    showGuestUpgradeWait(message) {
      const grid = this.game.upgradeGrid;
      if (grid) {
        grid.innerHTML = '';
        const label = document.createElement('div');
        label.className = 'neon-upgrade-wait';
        label.textContent = message;
        grid.appendChild(label);
      }
      grid?.parentNode?.querySelector?.('#upgrade-bank-actions')?.replaceChildren?.();
      this.game.modalLevelup?.classList.add('active');
    }
    syncGuestUpgrade(frame, view) {
      const game = this.game;
      if (!guestChoosingUpgrade(frame)) {
        this.guestUpgradeKey = null;
        this.guestUpgradeSubmitted = false;
        this.pendingGuestUpgradeId = null;
        this.guestUpgradeView?.cancelUpgradePreview?.();
        this.guestUpgradeView = null;
        if (frame.phase === 'levelup' || frame.phase === 'coop-guest-upgrade') {
          this.showGuestUpgradeWait(frame.guest?.pendingUpgrades > 0
            ? (frame.guest?.upgradeFinished ? '剩余强化机会已保存，等待房主选择…' : '正在同步你的升级选项…')
            : '你的升级已完成，等待房主选择…');
        } else {
          game.modalLevelup?.classList.remove('active');
        }
        return;
      }
      const key = frame.guest.choices.join('|') + ':' + frame.teamXP.level +
        ':' + (frame.guest.upgradeRound || 0);
      if (key === this.guestUpgradeKey) return;
      this.guestUpgradeKey = key;
      this.guestUpgradeSubmitted = false;
      this.pendingGuestUpgradeId = null;
      this.guestSelectionIdx = 0;
      const choices = frame.guest.choices.map(id => {
        const definition = game.getCoopUpgradeDefinition(id, frame.guest);
        return definition ? { ...definition,
          pityGuaranteed: frame.guest.legendaryPityId === id,
          alreadyChosen: frame.guest.pickedUpgradeIds?.includes(id) || false } : null;
      }).filter(Boolean);
      if (!choices.length) return;
      view.endlessMode = false; // choices use the exact existing solo card component
      view.guestUpgradeCredits = frame.guest.pendingUpgrades;
      view.guestUpgradeChosen = frame.guest.pickedUpgradeIds?.length || 0;
      view.guestUpgradeCapacity = frame.guest.upgradeCapacity || 1;
      // Reuse the solo card component without changing the host game state or
      // closing the modal before the authoritative selection is acknowledged.
      view.onUpgradePick = upgrade => this.pickGuestUpgrade(upgrade.id);
      view.onUpgradeFinish = () => this.requestGuestUpgradeFinish();
      this.guestUpgradeView = view;
      game.renderUpgradeChoices.call(view, choices);
      game.modalLevelup?.classList.add('active');
    }
    updateGuestWeapons(dt, ally = this.ally) {
      const game = this.game;
      if (!ally || ally.hp <= 0) return;
      const nearest = game.enemies.filter(enemy => !enemy.dead).reduce((best, enemy) => {
        const distance = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        return distance < (best?.distance || 650) ? { enemy, distance } : best;
      }, null);
      if (nearest) {
        ally.aimAngle = Math.atan2(nearest.enemy.y - ally.y, nearest.enemy.x - ally.x);
      }
      if (window.NeonWeaponSystem?.update) {
        // Production path: every pilot fires through the same cooldown table
        // and ownerId-aware emitter; legacy path remains for isolated VM tests.
        window.NeonWeaponSystem.update(game, ally, dt);
      } else {
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
          for (const bullet of game.bullets.slice(oldBulletCount)) {
            bullet.owner = ally.id || 'guest'; bullet.ownerId = ally.id || 'guest';
          }
          for (const hole of game.blackHoles.slice(oldHoleCount)) hole.owner = ally.id || 'guest';
          for (const mine of game.mines.slice(oldMineCount)) mine.owner = ally.id || 'guest';
        }
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
        window.NeonShips?.drawNetworkEffects?.(ctx, host, this.game);
        this.game.renderFighter(ctx, host,
          { color: host.color || '#00f3ff', name: host.name || '房主' }, true);
        for (const pilot of snapshot.players || []) {
          if (pilot.id === 'host' || pilot.id === (snapshot.localPlayerId || 'guest')) continue;
          this.game.renderFighter(ctx, pilot,
            {color:pilot.color || '#90d6ff',name:pilot.name || pilot.id},true);
        }
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
          ctx.save();
          ctx.fillStyle = '#bdf8ff';
          ctx.textAlign = 'center';
          ctx.font = 'bold 12px system-ui';
          const r = snapshot.resonance;
          const info = [r.damageBonus
            ? `+${Math.round(r.damageBonus * 100)}%攻击` : '',
            r.shieldSource
              ? `星织护盾 ${Math.ceil(r.shieldNext || 0)}s · ${Math.round(r.shieldHost || 0)}/${Math.round(r.shieldGuest || 0)}`
              : ''].filter(Boolean).join(' · ');
          if (info) ctx.fillText(info, (host.x + snapshot.guest.x) / 2,
            Math.min(host.y, snapshot.guest.y) - 48);
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
      for (const [id, pilot] of this.allies) {
        if (id === 'guest' || pilot.disconnected) continue;
        window.NeonShips?.drawPilotEffects?.(ctx, pilot, this.game);
        this.game.renderFighter(ctx, pilot, pilot.profile || {
          color:'#90d6ff',name:id
        }, true);
      }
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
      window.NeonShips?.drawPilotEffects?.(ctx, this.ally, this.game);
      this.game.renderFighter(ctx, this.ally, teammate, true);
      if (link) {
        ctx.save();
        ctx.fillStyle = link.active ? '#9fffe3' : '#a0afc4';
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px system-ui';
        const shield = this.resonance.link?.shieldSource
          ? ` | 星织护盾 ${Math.max(0, Math.ceil(12 - (this.resonance.shieldTimer || 0)))}s` : '';
        ctx.fillText(link.active
          ? `战机联动 +${Math.round((this.resonance.link?.damageBonus || 0) * 100)}%攻击${shield}`
          : '联动中断 · 请靠近队友',
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
      // Match the host's dash mapping (A/B and both bumpers/triggers). A
      // single edge represents the action, even if several are held.
      const padDash = [0, 1, 4, 5, 6, 7].some(index => Boolean(pad?.buttons?.[index]?.pressed));
      const dash = this.dashQueued || (padDash && !this.previousGamepadDash);
      if (consume) {
        this.previousGamepadDash = padDash;
        this.dashQueued = false;
      }
      return { type: 'input', seq: consume ? this.seq++ : this.seq,
        dx, dy, aim, autoAim: true, dash };
    }
    predictGuestDash() {
      const now = performance.now();
      if (now - this.predictedDashFeedbackAt < 180) return;
      if (window.NeonLanPrediction?.dash(this.predicted, this.latest?.guest, now)) {
        this.predictedDashFeedbackAt = now;
        this.game.sound?.playDash?.();
        this.game.vibrateGamepad?.(85, .45, .25);
      }
    }
    requestGuestSpell(spell) {
      if (!this.guestMode || !this.rtc.connected ||
          this.latest?.phase !== 'playing' || this.latest?.guest?.shipId !== 'astra' ||
          this.latest?.guest?.downed ||
          (spell !== 'meteor' && spell !== 'ward')) return false;
      return this.rtc.send({ type: 'spell_cast', seq: this.seq++, spell });
    }
    requestGuestShipAction(action) {
      if (!this.guestMode || !this.rtc.connected ||
          this.latest?.phase !== 'playing' || this.latest?.guest?.shipId !== 'phantom' ||
          this.latest?.guest?.downed || !['dock_toggle','strike','sprint','vortex'].includes(action)) return false;
      return this.rtc.send({ type: 'ship_action', seq: this.seq++, action });
    }
    updateGuest(dt) {
      if (!this.guestMode || !this.rtc.connected) return;
      this.profileAccumulator += dt;
      if (this.profileAccumulator >= 3) {
        this.profileAccumulator = 0;
        this.sendLocalProfile();
      }
      if (guestChoosingUpgrade(this.latest)) {
        const options = this.latest.guest?.choices || [];
        const keys = this.game.keys || {};
        const pad = Array.from(navigator.getGamepads?.() || []).find(p => p && p.connected !== false);
        // Treat menu presses as already consumed when returning to combat.
        this.guestAbilityButtons = {
          x: Boolean(pad?.buttons?.[2]?.pressed),
          y: Boolean(pad?.buttons?.[3]?.pressed)
        };
        this.previousGamepadDash = [0, 1, 4, 5, 6, 7]
          .some(index => Boolean(pad?.buttons?.[index]?.pressed));
        const left = Boolean(pad?.buttons?.[14]?.pressed || (pad?.axes?.[0] || 0) < -0.55 || keys.arrowleft);
        const right = Boolean(pad?.buttons?.[15]?.pressed || (pad?.axes?.[0] || 0) > 0.55 || keys.arrowright);
        const up = Boolean(pad?.buttons?.[12]?.pressed || (pad?.axes?.[1] || 0) < -0.55 || keys.arrowup);
        const down = Boolean(pad?.buttons?.[13]?.pressed || (pad?.axes?.[1] || 0) > 0.55 || keys.arrowdown);
        const accept = Boolean(pad?.buttons?.[0]?.pressed || keys.enter);
        const fastConfirm = Boolean(pad?.buttons?.[2]?.pressed ||
          pad?.buttons?.[7]?.pressed);
        const cancel = Boolean(pad?.buttons?.[1]?.pressed || keys.escape);
        const finish = Boolean(pad?.buttons?.[3]?.pressed || keys.f);
        // Independent just-pressed edges: holding A while moving the cursor
        // must not confirm a different card merely because another key changed.
        const current = {left, right, up, down, accept, fastConfirm, cancel, finish};
        const previous = this.guestMenuButtons || {};
        const pressed = action => current[action] && !previous[action];
        {
          const dx = Number(pressed('right')) - Number(pressed('left'));
          const dy = Number(pressed('down')) - Number(pressed('up'));
          if ((dx || dy) && options.length) {
            this.guestSelectionIdx = window.NeonGamepadMenus?.gridMove(
              this.guestSelectionIdx, options.length, dx, dy,
              window.NeonGamepadMenus?.columnsFor(this.game.upgradeGrid) || 3) ??
              (this.guestSelectionIdx + (dx || dy * 3) + options.length) % options.length;
            this.game.upgradeGrid?.children?.[this.guestSelectionIdx]?.scrollIntoView?.({block:'nearest'});
          }
          if (pressed('accept') && options.length) {
            const id = options[this.guestSelectionIdx];
            if (this.pendingGuestUpgradeId === id) this.confirmGuestUpgradePreview();
            else this.selectGuestUpgradePreview(id);
          }
          if (pressed('fastConfirm') && options.length) {
            const id = options[this.guestSelectionIdx];
            // Bypass the extra click, but still use the guest's explicit
            // onUpgradePick submission and host-authoritative validation.
            if (this.pendingGuestUpgradeId !== id) this.selectGuestUpgradePreview(id);
            this.confirmGuestUpgradePreview();
          }
          if (pressed('cancel')) this.cancelGuestUpgradePreview();
          if (pressed('finish')) {
            if (!this.pendingGuestUpgradeId) this.requestGuestUpgradeFinish();
          }
        }
        this.guestMenuButtons = current;
        const number = ['1','2','3','4','5'].find(key => keys[key]);
        if (number && number !== this.lastNumberKey && options[Number(number) - 1]) {
          this.selectGuestUpgradePreview(options[Number(number) - 1]);
        }
        this.lastNumberKey = number;
        return;
      }
      this.guestMenuButtons = null;
      this.previousMenuSelection = '';
      this.lastNumberKey = '';
      // Remote guests own X/Y skill edges too; only send action IDs. The host
      // remains authoritative for cooldown, energy, damage and hit selection.
      const pad = Array.from(navigator.getGamepads?.() || []).find(p => p && p.connected !== false);
      const currentAbility = {
        x: Boolean(pad?.buttons?.[2]?.pressed),
        y: Boolean(pad?.buttons?.[3]?.pressed)
      };
      const prevAbility = this.guestAbilityButtons || {};
      this.guestAbilityButtons = currentAbility;
      if (this.latest?.phase === 'playing' && !this.latest?.guest?.downed && !this.game.settingsOpen) {
        const ship = this.latest.guest?.shipId;
        if (currentAbility.x && !prevAbility.x) {
          if (ship === 'astra') this.game.castAstraWard?.();
          else if (ship === 'phantom') this.game.triggerPhantomSprint?.();
        }
        if (currentAbility.y && !prevAbility.y) {
          if (ship === 'astra') this.game.castAstraMeteor?.();
          else if (ship === 'phantom') this.game.triggerPhantomVortex?.();
        }
      }
      // Predict local steering immediately (display-only, no damage or kills).
      // Host snapshots periodically reconcile this position.
      const canSteer = this.latest?.phase === 'playing' && !this.latest?.guest?.downed &&
        !this.game.settingsOpen;
      if (this.predicted && canSteer) {
        // Predict at rendering refresh rate. The movement model matches the
        // authoritative per-pilot simulation and keeps short input history.
        window.NeonLanPrediction?.advance(this.predicted, this.latest.guest,
          this.sampleInput(false), dt, performance.now());
      }
      this.inputAccumulator += dt;
      if (this.inputAccumulator >= 1 / INPUT_HZ) {
        this.inputAccumulator = 0;
        this.lastInput = this.sampleInput();
        if (this.lastInput.dash) this.predictGuestDash();
        window.NeonLanPrediction?.sent(this.predicted, this.lastInput.seq, performance.now());
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
        frame.guest.dash = Math.max(frame.guest.dash || 0,
          Math.max(0, (this.predicted.dashUntil || 0) - performance.now()) / 1000);
        frame.guest.visualDash = Math.max(0,
          ((this.predicted.dashEffectUntil || 0) - performance.now()) / 290);
      }
      const world = window.NeonLanWorldView;
      if (!this.guestView && world) this.guestView = world.create(game, frame, this);
      const view = this.guestView && world?.updateView(this.guestView, frame, game, this);
      if (!view) return;
      // The guest's own warp ribbon is predicted locally, so it appears on this
      // screen the moment the dash starts instead of one round-trip later.
      view.player.lastSlashFx = this.predicted?.slashFx?.life > 0
        ? this.predicted.slashFx : null;
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
    snapshot, boundedSnapshot, safeSnapshot, SNAPSHOT_LIMIT });
})();
