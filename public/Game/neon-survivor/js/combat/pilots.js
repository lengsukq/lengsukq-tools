/* Authoritative per-pilot simulation. Never sends packets or owns a room.
 * Host executes it for every remote pilot; adding guest-2/guest-3 requires no
 * additional movement, warp or collision copy. Local input/UI is separate.
 */
(() => {
  'use strict';
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const validTick = dt => Number.isFinite(dt) && dt > 0 && dt <= .25;

  // ---------------------------------------------------------------------------
  // Movement lives in ONE place: core/simulation/speed.js (PilotSpeed).
  //
  // "How fast does a pilot move" used to be written three times -- the host's
  // own player, this file's stepRemote, and network/prediction.js -- and they
  // disagreed: the ally's dash was a hardcoded 780 px/s against the host's
  // baseSpeed * 3.6, the thruster multiplier was 0.15 here and 0.12 there,
  // limit-break speed was missing from two of them, and the ally's baseSpeed
  // was never recalculated after a guest picked Thruster. A guest therefore
  // dashed 10% short at level 1 and 44% short fully upgraded.
  //
  // PilotSpeed is a const in a later classic script, but every reference here
  // is inside a function body that only runs during gameplay, long after all
  // scripts have loaded.
  function inputFor(pilot, now) {
    if (!pilot || !Number.isFinite(now)) return { dx:0,dy:0,aim:0,dash:false };
    const fresh = now - (pilot.lastInputAt || 0) <= 350;
    const input = fresh ? pilot.input : null;
    return {
      dx: Number.isFinite(input?.dx) ? Math.max(-1,Math.min(1,input.dx)) : 0,
      dy: Number.isFinite(input?.dy) ? Math.max(-1,Math.min(1,input.dy)) : 0,
      aim: Number.isFinite(input?.aim) ? input.aim : (pilot.aimAngle || 0),
      dash: Boolean(input?.dash)
    };
  }
  function startDash(game, pilot) {
    if (pilot?.shipId && pilot.shipId !== 'riftblade') {
      const dx=Number.isFinite(pilot.input?.dx)?pilot.input.dx:0;
      const dy=Number.isFinite(pilot.input?.dy)?pilot.input.dy:0;
      const length=Math.hypot(dx,dy);
      const aim=Number.isFinite(pilot.aimAngle)?pilot.aimAngle:0;
      const direction=length>.05 ? {x:dx/length,y:dy/length} :
        {x:Math.cos(aim),y:Math.sin(aim)};
      const warped=window.NeonShips?.runAbility?.(pilot,'onAction',game,
        {kind:'warp',direction}) === true;
      if (warped) {
        // Class plugins own the meaning of warp; the shared pilot only mirrors
        // any resulting short protection and the class's existing charge pool.
        pilot.invulnTimer=Math.max(pilot.invulnTimer || 0,pilot.invulnTimer || 0);
        pilot.dashCharges=pilot.astra?.blinkCharges ?? pilot.phantom?.dashCharges ?? pilot.dashCharges;
      }
      return warped;
    }
    if (!pilot || pilot.hp <= 0 || pilot.downed || pilot.dashCharges <= 0 || pilot.dashTimeLeft > 0) return false;
    pilot.dashCharges--;
    pilot.dashTimeLeft = PilotSpeed.DASH_DURATION;
    pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, .28);
    const warp = pilot.dashUpgrades || {};
    if (warp.dash_aegis) pilot.invulnTimer = Math.max(pilot.invulnTimer, .4);
    pilot.dashHitEnemies = new Set();
    pilot.dashStartX = pilot.x;
    pilot.dashStartY = pilot.y;
    if (warp.dash_blast) {
      const radius = 100 + warp.dash_blast * 25;
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && dist(enemy,pilot) <= radius) {
          game.dealDamage(enemy,(80 + warp.dash_blast * 50) * (pilot.dmgMultiplier || 1),'lan-ally',false,pilot);
        }
      }
      if ((game.shockwaves?.length || 0) < 40) game.shockwaves?.push({
        x:pilot.x,y:pilot.y,radius:8,maxRadius:radius,alpha:1,color:'#aaffff'
      });
    }
    return true;
  }
  function stepRemote(game, pilot, input, dt) {
    if (!game || !pilot || !validTick(dt)) return false;
    pilot.aimAngle = input.aim;
    pilot.level = game.player.level;
    // Keep the cached baseSpeed in step with the level the pilot just gained,
    // so the value the snapshot sends the guest is always current.
    PilotSpeed.recalculate(pilot);
    pilot.xp = game.player.xp;
    pilot.xpNeeded = game.player.xpNeeded;
    pilot.invulnTimer = Math.max(0,(pilot.invulnTimer || 0)-dt);
    if (pilot.shipId === 'astra' && pilot.astra) {
      // The mage maintains an independent 2–4-charge phase-blink pool.
      // Never recharge it again through Riftblade's 2.2-second dash timer.
      pilot.maxDashCharges = Math.min(4, 2 + (pilot.astra.warpUpgrades?.star_gate || 0));
      pilot.dashCharges = pilot.astra.blinkCharges;
      pilot.dashRechargeTimer = pilot.astra.blinkRecharge || 0;
      pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, 0);
    } else if (pilot.shipId === 'phantom' && pilot.phantom) {
      pilot.maxDashCharges = Math.min(3, 2 + (pilot.phantom.warpUpgrades?.charge_overflow || 0));
      pilot.dashCharges = pilot.phantom.dashCharges;
      pilot.dashRechargeTimer = pilot.phantom.dashRecharge;
    } else if (pilot.dashCharges < pilot.maxDashCharges) {
      pilot.dashRechargeTimer += dt;
      const thruster = pilot.passives?.thruster || 0;
      const recharge = 2.2 * (pilot.cdrMultiplier || 1) * (thruster >= 4 ? .7 : thruster >= 2 ? .85 : 1);
      if (pilot.dashRechargeTimer >= recharge) { pilot.dashRechargeTimer -= recharge; pilot.dashCharges++; }
    } else pilot.dashRechargeTimer = 0;
    // Dash burst and class states come from the shared model, so a remote ally
    // moves at exactly the speed the host's own pilot would.
    const speed = PilotSpeed.move(pilot, pilot.dashTimeLeft > 0);
    const dx = Number.isFinite(input.dx) ? input.dx : 0;
    const dy = Number.isFinite(input.dy) ? input.dy : 0;
    if (!pilot.phantom?.docked) {
      pilot.x += dx * speed * dt;
      pilot.y += dy * speed * dt;
    }
    // The host draws the ally's warp ribbon too, so a guest's dash is as
    // visible on the host's screen as the host's own dash is.
    if (pilot.dashTimeLeft > 0 && Number.isFinite(pilot.dashStartX)) {
      const warp = pilot.dashUpgrades || {};
      pilot.lastSlashFx = {
        x1: pilot.dashStartX, y1: pilot.dashStartY, x2: pilot.x, y2: pilot.y,
        life: .28, maxLife: .28,
        fire: Boolean(warp.dash_fire), cryo: Boolean(warp.dash_cryo),
        precise: Boolean(pilot.dashPreciseHit)
      };
    } else if (pilot.lastSlashFx && pilot.lastSlashFx.life > 0) {
      pilot.lastSlashFx.life = Math.max(0, pilot.lastSlashFx.life - dt);
    }
    // Recalculate once, not once in the ship hook and again in ally regen.
    // The previous code double-added armour regen for co-op clients.
    const baseRegen = window.NeonShips?.get(pilot.shipId)?.baseStats.regen ?? .8;
    const armorRegen = (pilot.passives?.armor || 0) * 1.8;
    const stealthRegen = pilot.shipId === 'phantom' &&
      pilot.hp < pilot.maxHp * .45 ? (pilot.passives?.stealth_armor || 0) * .12 : 0;
    pilot.regen = baseRegen + armorRegen + stealthRegen;
    if (pilot.hp > 0 && !pilot.downed) pilot.hp = Math.min(pilot.maxHp,
      pilot.hp + dt * pilot.regen);
    if (!pilot.downed && pilot.shipId === 'phantom' && pilot.phantom?.shiftActive) {
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && dist(enemy, pilot) <= (enemy.radius || 12) + (pilot.radius || 16)) {
          window.NeonPhantom?.markEnemy(pilot, enemy, game.survivalTime || 0);
        }
      }
    }
    if (!pilot.downed && pilot.dashTimeLeft > 0 && pilot.dashHitEnemies) {
      const warp = pilot.dashUpgrades || {};
      const radius = 42 + (warp.dash_area || 0) * 18;
      for (const enemy of game.enemies || []) {
        if (enemy.dead || pilot.dashHitEnemies.has(enemy) ||
          dist(enemy,pilot) > radius + (enemy.radius || 12)) continue;
        pilot.dashHitEnemies.add(enemy);
        game.dealDamage(enemy,95 * (1 + (warp.dash_dmg || 0) * .6) *
          (pilot.dmgMultiplier || 1),'lan-ally',false,pilot);
        if (warp.dash_cryo) enemy.freezeTimer = Math.max(enemy.freezeTimer || 0,.5 + warp.dash_cryo * .35);
        if (pilot.dashHitEnemies.size >= 30) break;
      }
      if (warp.dash_fire && (game.dashTrails?.length || 0) < 35) game.dashTrails?.push({
        x1:pilot.x - dx*22,y1:pilot.y - dy*22,x2:pilot.x,y2:pilot.y,
        color:'#ff8844',life:.24,maxLife:.24,damage:15*warp.dash_fire*(pilot.dmgMultiplier || 1)
      });
    }
    pilot.dashTimeLeft = Math.max(0,(pilot.dashTimeLeft || 0)-dt);
    return true;
  }
  function resolveRemoteHits(game,pilot) {
    if (!game || !pilot || pilot.hp <= 0 || pilot.downed ||
        pilot.phantom?.shiftActive || pilot.phantom?.docked) return false;
    const multiplier=window.NeonLanEncounters?.active(game) ? window.NeonLanEncounters.TUNING.enemyDamage : 1;
    const protect = raw => {
      if (pilot?.shipId === 'phantom' && pilot.phantom?.shiftActive) return 0;
      let shielded = window.NeonAstra?.incomingDamage(game,pilot,raw) ?? raw;
      if (pilot.hasDockedGunner) {
        shielded *= (1 - (window.NeonPhantom?.BASE?.carrierRearDamageReduction || 0.40));
      }
      return window.NeonLanResonance?.absorb(pilot,shielded,game.survivalTime || 0) ?? shielded;
    };
    if (pilot.invulnTimer <= 0) {
      for (let i=(game.enemyBullets?.length || 0)-1;i>=0;i--) {
        const b=game.enemyBullets[i];
        if (dist(b,pilot) < (b.radius || 4) + (pilot.radius || 16)) {
          const suffered=protect((b.damage || 12)*multiplier);
          pilot.hp=Math.max(0,pilot.hp - suffered);
          pilot.invulnTimer=Math.max(pilot.invulnTimer || 0, suffered > 0 ? .6 : .28);
          game.enemyBullets.splice(i,1);
          break;
        }
      }
    }
    if (pilot.invulnTimer <= 0) {
      for (const e of game.enemies || []) {
        if (e.dead) continue;
        if (dist(e,pilot) < (e.radius || 12) + (pilot.radius || 16)) {
          const suffered=protect(Math.max(4,e.damage || 10)*multiplier);
          pilot.hp=Math.max(0,pilot.hp - suffered);
          pilot.invulnTimer=Math.max(pilot.invulnTimer || 0, suffered > 0 ? .6 : .28);
          break;
        }
      }
    }
    if (pilot.hp <= 0 && ((pilot.passives?.armor || 0) >= 5 ||
        (pilot.shipId === 'phantom' && (pilot.passives?.death_reversal || 0) > 0)) &&
        !pilot.cheatDeathUsed) {
      pilot.hp=Math.min(pilot.maxHp,35);
      pilot.invulnTimer=1.2;
      pilot.cheatDeathUsed=true;
    }
    return pilot.hp <= 0;
  }
  // Wrapped, not direct references: this file loads BEFORE core/simulation/
  // speed.js, so evaluating PilotSpeed.* here would hit the temporal dead zone.
  window.NeonPilotSystem=Object.freeze({ inputFor, startDash, stepRemote, resolveRemoteHits,
    baseSpeedFor: pilot => PilotSpeed.base(pilot),
    recalculateSpeed: pilot => PilotSpeed.recalculate(pilot),
    speedMultiplierFor: pilot => PilotSpeed.multiplier(pilot),
    moveSpeed: (pilot, dashing) => PilotSpeed.move(pilot, dashing),
    dashSpeedFor: pilot => PilotSpeed.dash(pilot) });
})();
