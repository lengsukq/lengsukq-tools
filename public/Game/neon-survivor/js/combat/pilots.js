/* Authoritative per-pilot simulation. Never sends packets or owns a room.
 * Host executes it for every remote pilot; adding guest-2/guest-3 requires no
 * additional movement, warp or collision copy. Local input/UI is separate.
 */
(() => {
  'use strict';
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const validTick = dt => Number.isFinite(dt) && dt > 0 && dt <= .25;
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
    if (pilot?.shipId === 'astra') {
      const x = pilot.input?.dx || Math.cos(pilot.aimAngle || 0);
      const y = pilot.input?.dy || Math.sin(pilot.aimAngle || 0);
      const blinked = window.NeonAstra?.blink(pilot, game, { x, y },
        game.survivalTime || 0) || false;
      if (blinked) {
        pilot.invuln = Math.max(pilot.invuln || 0, .12);
        pilot.charges = pilot.astra?.blinkCharges ?? pilot.charges;
      }
      return blinked;
    }
    if (pilot?.shipId === 'phantom') {
      if (pilot.phantom?.shiftActive) {
        return window.NeonPhantom?.reap(pilot, game, true) || false;
      }
      const shifted = window.NeonPhantom?.enterShift(pilot, game);
      if (shifted) pilot.invuln = Math.max(pilot.invuln || 0, window.NeonPhantom?.BASE?.shiftDuration || 1.6);
      return Boolean(shifted);
    }
    if (!pilot || pilot.hp <= 0 || pilot.downed || pilot.charges <= 0 || pilot.dash > 0) return false;
    pilot.charges--;
    pilot.dash = .18;
    pilot.invuln = Math.max(pilot.invuln || 0, .28);
    const warp = pilot.dashUpgrades || {};
    if (warp.dash_aegis) pilot.invuln = Math.max(pilot.invuln, .4);
    pilot.dashHitEnemies = new Set();
    if (warp.dash_blast) {
      const radius = 100 + warp.dash_blast * 25;
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && dist(enemy,pilot) <= radius) {
          game.dealDamage(enemy,80 + warp.dash_blast * 50,'lan-ally',false,pilot);
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
    pilot.xp = game.player.xp;
    pilot.xpNeeded = game.player.xpNeeded;
    pilot.invuln = Math.max(0,(pilot.invuln || 0)-dt);
    if (pilot.shipId === 'astra' && pilot.astra) {
      // The mage maintains an independent 2–4-charge phase-blink pool.
      // Never recharge it again through Riftblade's 2.2-second dash timer.
      pilot.maxCharges = Math.min(4, 2 + (pilot.astra.warpUpgrades?.star_gate || 0));
      pilot.charges = pilot.astra.blinkCharges;
      pilot.recharge = pilot.astra.blinkRecharge || 0;
    } else if (pilot.charges < pilot.maxCharges) {
      pilot.recharge += dt;
      const thruster = pilot.passives?.thruster || 0;
      const recharge = 2.2 * (pilot.cdrMultiplier || 1) * (thruster >= 4 ? .7 : thruster >= 2 ? .85 : 1);
      if (pilot.recharge >= recharge) { pilot.recharge -= recharge; pilot.charges++; }
    } else pilot.recharge = 0;
    const speed = pilot.downed ? 0 : pilot.dash > 0 ? 780 : Math.min(385,
      ((pilot.baseSpeed || 240) + Math.min(120, (pilot.level - 1) * 6)) *
      (1 + .15 * (pilot.passives?.thruster || 0)));
    const dx = Number.isFinite(input.dx) ? input.dx : 0;
    const dy = Number.isFinite(input.dy) ? input.dy : 0;
    pilot.x += dx * speed * dt;
    pilot.y += dy * speed * dt;
    if (pilot.hp > 0 && !pilot.downed) pilot.hp = Math.min(pilot.maxHp,
      pilot.hp + dt * ((pilot.regen ?? .8) + (pilot.passives?.armor || 0) * 1.8));
    if (!pilot.downed && pilot.shipId === 'phantom' && pilot.phantom?.shiftActive) {
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && dist(enemy, pilot) <= (enemy.radius || 12) + (pilot.radius || 16)) {
          window.NeonPhantom?.markEnemy(pilot, enemy, game.survivalTime || 0);
        }
      }
    }
    if (!pilot.downed && pilot.dash > 0 && pilot.dashHitEnemies) {
      const warp = pilot.dashUpgrades || {};
      const radius = 42 + (warp.dash_area || 0) * 18;
      for (const enemy of game.enemies || []) {
        if (enemy.dead || pilot.dashHitEnemies.has(enemy) ||
          dist(enemy,pilot) > radius + (enemy.radius || 12)) continue;
        pilot.dashHitEnemies.add(enemy);
        game.dealDamage(enemy,95 * (1 + (warp.dash_dmg || 0) * .25) *
          (pilot.dmgMultiplier || 1),'lan-ally',false,pilot);
        if (warp.dash_cryo) enemy.freezeTimer = Math.max(enemy.freezeTimer || 0,.5 + warp.dash_cryo * .35);
        if (pilot.dashHitEnemies.size >= 30) break;
      }
      if (warp.dash_fire && (game.dashTrails?.length || 0) < 35) game.dashTrails?.push({
        x1:pilot.x - dx*22,y1:pilot.y - dy*22,x2:pilot.x,y2:pilot.y,
        color:'#ff8844',life:.24,maxLife:.24,damage:15*warp.dash_fire
      });
    }
    pilot.dash = Math.max(0,(pilot.dash || 0)-dt);
    return true;
  }
  function resolveRemoteHits(game,pilot) {
    if (!game || !pilot || pilot.hp <= 0 || pilot.downed) return false;
    const multiplier=window.NeonLanEncounters?.active(game) ? window.NeonLanEncounters.TUNING.enemyDamage : 1;
    const protect = raw => {
      if (pilot?.shipId === 'phantom' && pilot.phantom?.shiftActive) return 0;
      let shielded = window.NeonAstra?.incomingDamage(game,pilot,raw) ?? raw;
      if (pilot.hasDockedGunner) {
        shielded *= (1 - (window.NeonPhantom?.BASE?.carrierRearDamageReduction || 0.40));
      }
      return window.NeonLanResonance?.absorb(pilot,shielded,game.survivalTime || 0) ?? shielded;
    };
    if (pilot.invuln <= 0) {
      for (let i=(game.enemyBullets?.length || 0)-1;i>=0;i--) {
        const b=game.enemyBullets[i];
        if (dist(b,pilot) < (b.radius || 4) + (pilot.radius || 16)) {
          const suffered=protect((b.damage || 12)*multiplier);
          pilot.hp=Math.max(0,pilot.hp - suffered);
          if (suffered > 0) pilot.invuln=.6;
          game.enemyBullets.splice(i,1);
          break;
        }
      }
    }
    if (pilot.invuln <= 0) {
      for (const e of game.enemies || []) {
        if (e.dead) continue;
        if (dist(e,pilot) < (e.radius || 12) + (pilot.radius || 16)) {
          const suffered=protect(Math.max(4,e.damage || 10)*multiplier);
          pilot.hp=Math.max(0,pilot.hp - suffered);
          if (suffered > 0) pilot.invuln=.6;
          break;
        }
      }
    }
    if (pilot.hp <= 0 && (pilot.passives?.armor || 0) >= 5 && !pilot.cheatDeathUsed) {
      pilot.hp=Math.min(pilot.maxHp,35);
      pilot.invuln=1.2;
      pilot.cheatDeathUsed=true;
    }
    return pilot.hp <= 0;
  }
  window.NeonPilotSystem=Object.freeze({ inputFor, startDash, stepRemote, resolveRemoteHits });
})();
