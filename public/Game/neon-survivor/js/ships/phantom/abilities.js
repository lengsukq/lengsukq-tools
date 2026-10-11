/* PHANTOM / 幽灵·共生拟态 — headless, host-authoritative ability foundation.
 * Supports spectral shift invulnerability, soul mark reaping,
 * ectoplasm collection, and tactical co-op docking (carrier & gunner mechanics).
 */
(() => {
  'use strict';
  const BASE = Object.freeze({
    initialEctoplasm: 0,
    maxEctoplasm: 100,
    killEctoplasm: 3,
    passThroughEctoplasm: 4,
    shiftDuration: 1.6,             // Retain generous 1.6s for deep maneuver immersion
    shiftSpeedMultiplier: 1.4,
    shiftCooldown: 7.0,
    baseDashCharges: 2,
    maxDashCharges: 3,
    dashRecharge: 5.5,
    markDuration: 4.0,
    baseReapDamage: 48,             // Balanced from 85 to prevent early-game instant one-shots
    reapLevelScale: 2.0,            // Smooth level scaling (+2 per level)
    reapTargetBonus: 0.08,          // Smooth target scaling (down from 0.15)
    reapMaxTargetBonus: 1.20,       // Max +120% target density bonus
    reapEctoMultiplier: 0.8,        // Balanced from 1.5
    reapMaxDamageCap: 360,          // Balanced damage cap to prevent boss instakills
    reapRadius: 420,
    maxReapTargets: 24,
    reapCdrRefundOnKill: 0.25,      // 25% recharge refund per reap with kills
    dockMaxDistance: 150,
    dockMaxDuration: 14.0,          // 14s symbiote overheat cycle for active co-op rhythm
    dockCooldown: 8.0,              // 8s dock cooldown after overheat/undock
    carrierRearDamageReduction: 0.40,
    carrierSpeedBonus: 0.15,
    gunnerCritBonus: 0.20,
    gunnerFireRateBonus: 0.50,
    dockEctoplasmPerSec: 5.0,
    ejectRadius: 160,
    ejectStunDuration: 1.0,
    ejectDamage: 45
  });

  const UNIQUE = Object.freeze({
    weapon: Object.freeze([
      ['phantom_scythe', '幽魂之镰', 'rare', 5],
      ['spectral_dart', '虚界毒刺', 'common', 5],
      ['soul_reap_orb', '噬魂法球', 'common', 5],
      ['void_rift_mine', '虚空裂隙雷', 'common', 5],
      ['symbiote_beam', '共鸣射线', 'rare', 5],
      ['haunt_clones', '游荡残影', 'rare', 5],
      ['curse_totem', '幽冥死灵图腾', 'rare', 5],
      ['apocalypse_scythe', '终焉断头台', 'legendary', 5],
      ['abyssal_possession', '深渊拟态侵蚀', 'legendary', 5]
    ]),
    passive: Object.freeze([
      ['phantom_core', '幽冥核心', 'common', 5],
      ['spiritual_flow', '灵能涌流', 'common', 5],
      ['stealth_armor', '相位消隐装甲', 'common', 5],
      ['execute_master', '破败残响', 'rare', 5],
      ['symbiosis_link', '共生共振环', 'rare', 5],
      ['soul_gatherer', '噬魂收割者', 'rare', 5],
      ['death_reversal', '回光返照', 'legendary', 5],
      ['dual_mind', '双极意识', 'legendary', 5]
    ]),
    dash: Object.freeze([
      ['spectral_extend', '虚空漫步', 'common', 2],
      ['soul_detonation', '烙印剧变', 'common', 2],
      ['charge_overflow', '灵能超蓄', 'rare', 2],
      ['ghost_trail', '冥火余烬', 'rare', 2],
      ['terror_shriek', '惊骇恐吓', 'rare', 2],
      ['dimension_door', '虚界门扉', 'legendary', 2],
      ['symbiote_slingshot', '共生弹弓', 'legendary', 2]
    ])
  });

  const catalog = Object.freeze(Object.values(UNIQUE).flatMap((entries, typeIndex) =>
    entries.map(([id, name, rarity, levels]) => Object.freeze({
      id, name, rarity, type: ['weapon', 'passive', 'dash'][typeIndex],
      maxLvl: levels || 5, shipId: 'phantom'
    }))));

  const validPilot = pilot => pilot?.shipId === 'phantom' && pilot.hp > 0 && !pilot.downed;
  const within = (a, b, radius) => Boolean(a && b &&
    Math.hypot(a.x - b.x, a.y - b.y) <= radius);

  function createState() {
    return {
      ectoplasm: BASE.initialEctoplasm,
      maxEctoplasm: BASE.maxEctoplasm,
      shiftActive: false,
      shiftRemaining: 0,
      dashCharges: BASE.baseDashCharges,
      dashRecharge: 0,
      marks: new Map(), // enemy -> expireAt
      docked: false,
      carrier: null,
      dockElapsed: 0,
      dockCooldownRemaining: 0,
      warpUpgrades: {},
      passiveUpgrades: {},
      lastEjectAt: -Infinity,
      slingshotBuffUntil: 0
    };
  }

  function state(pilot) {
    return pilot?.shipId === 'phantom' ? (pilot.phantom ||= createState()) : null;
  }

  function addEctoplasm(pilot, amount) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !Number.isFinite(amount) || amount <= 0) return 0;
    const bonusFlow = 1 + (s.passiveUpgrades.spiritual_flow || 0) * 0.15;
    const gain = Math.min(s.maxEctoplasm - s.ectoplasm, amount * bonusFlow);
    s.ectoplasm += gain;
    return gain;
  }

  function critBonus(pilot, now = 0) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s) return 0;
    let bonus = (s.ectoplasm / 10) * 0.025; // up to +25% from 100 ectoplasm
    const coreLevel = s.passiveUpgrades.phantom_core || 0;
    if (coreLevel > 0) {
      bonus += [0, 0.10, 0.18, 0.26, 0.34, 0.45][Math.min(5, coreLevel)];
    }
    // Natural soft-cap at 75% to prevent infinite critical creep
    bonus = Math.min(0.75, bonus);
    if (s.slingshotBuffUntil > now) {
      bonus = 1.0; // 100% crit buff from symbiote_slingshot
    }
    return bonus;
  }

  function enterShift(pilot, game) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || game?.state !== 'playing') return false;
    if (s.dashCharges < 1 || s.shiftActive) return false;

    s.dashCharges--;
    s.shiftActive = true;
    const extraDuration = (s.warpUpgrades.spectral_extend || 0) * 0.5;
    s.shiftRemaining = BASE.shiftDuration + extraDuration;

    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves?.push({
        x: pilot.x, y: pilot.y, radius: 10, maxRadius: 65,
        color: '#00f0ff', alpha: 0.8
      });
    }
    return true;
  }

  function markEnemy(pilot, enemy, timeSeconds) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !enemy || enemy.dead || enemy.hp <= 0) return false;
    if (!s.shiftActive) return false;
    if (s.marks.size >= 64) {
      // Bound map size to prevent memory explosion
      s.marks.delete(s.marks.keys().next().value);
    }
    s.marks.set(enemy, timeSeconds + BASE.markDuration);
    addEctoplasm(pilot, BASE.passThroughEctoplasm);
    return true;
  }

  function reap(pilot, game, force = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || game?.state !== 'playing') return 0;
    if (s.marks.size === 0 && !force) return 0;

    const enemies = (game.enemies || []).filter(e => !e.dead && e.hp > 0 && s.marks.has(e));
    if (enemies.length === 0) {
      s.marks.clear();
      return 0;
    }

    const detonMult = 1 + (s.warpUpgrades.soul_detonation || 0) * 0.40;
    const radiusBonus = (s.warpUpgrades.soul_detonation || 0) * 0.50;
    const maxRadius = BASE.reapRadius * (1 + radiusBonus);

    const validTargets = enemies
      .filter(e => within(e, pilot, maxRadius))
      .slice(0, BASE.maxReapTargets);

    const targetCount = validTargets.length;
    const level = pilot.level || 1;
    const densityBonus = Math.min(BASE.reapMaxTargetBonus, targetCount * BASE.reapTargetBonus);
    const scaledBase = (BASE.baseReapDamage + (level - 1) * BASE.reapLevelScale) * (1 + densityBonus);
    const rawDamage = (scaledBase + s.ectoplasm * BASE.reapEctoMultiplier) * detonMult;
    const cappedDamage = Math.min(BASE.reapMaxDamageCap, rawDamage);
    const finalDamage = cappedDamage * (pilot.dmgMultiplier || 1);

    let kills = 0;
    for (const enemy of validTargets) {
      const prevHp = enemy.hp;
      game.dealDamage(enemy, finalDamage, 'phantom_reap', false, pilot);
      if (enemy.dead || enemy.hp <= 0 || prevHp <= finalDamage) kills++;
    }

    // Cooldown refund on kill (capped to 1 refund per reap cycle)
    if (kills > 0) {
      const refund = BASE.dashRecharge * BASE.reapCdrRefundOnKill;
      s.dashRecharge = Math.min(BASE.dashRecharge, s.dashRecharge + refund);
    }

    // Terror shriek crowd control
    if ((s.warpUpgrades.terror_shriek || 0) > 0) {
      for (const e of game.enemies || []) {
        if (!e.dead && within(e, pilot, 180)) {
          e.fearedUntil = (game.survivalTime || 0) + 1.5;
        }
      }
    }

    // Shockwave FX
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves?.push({
        x: pilot.x, y: pilot.y, radius: 15, maxRadius: 180,
        color: '#a855f7', alpha: 0.95
      });
    }

    s.marks.clear();
    return targetCount;
  }

  function canDock(pilot, carrier) {
    if (!validPilot(pilot) || !carrier || carrier === pilot) return false;
    if (carrier.hp <= 0 || carrier.downed) return false;
    const s = state(pilot);
    if (!s || s.docked || s.dockCooldownRemaining > 0) return false;
    return within(pilot, carrier, BASE.dockMaxDistance);
  }

  function dock(pilot, carrier) {
    if (!canDock(pilot, carrier)) return false;
    const s = state(pilot);
    s.docked = true;
    s.carrier = carrier;
    s.dockElapsed = 0;
    carrier.hasDockedGunner = true;
    pilot.x = carrier.x;
    pilot.y = carrier.y;
    return true;
  }

  function undock(pilot, game, isEject = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !s.docked) return false;
    const carrier = s.carrier;
    s.docked = false;
    s.carrier = null;
    s.dockElapsed = 0;
    s.dockCooldownRemaining = BASE.dockCooldown;
    if (carrier) carrier.hasDockedGunner = false;

    if (isEject && game?.state === 'playing') {
      const now = game.survivalTime || 0;
      s.lastEjectAt = now;
      if ((s.warpUpgrades.symbiote_slingshot || 0) > 0) {
        s.slingshotBuffUntil = now + 3.0; // 3s 100% crit
      }

      // Radial blast knocks back and stuns enemies
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && within(enemy, pilot, BASE.ejectRadius)) {
          game.dealDamage(enemy, BASE.ejectDamage * (pilot.dmgMultiplier || 1),
            'phantom_eject', false, pilot);
          enemy.stunnedUntil = now + BASE.ejectStunDuration;
        }
      }

      if ((game.shockwaves?.length || 0) < 40) {
        game.shockwaves?.push({
          x: pilot.x, y: pilot.y, radius: 10, maxRadius: BASE.ejectRadius,
          color: '#00f0ff', alpha: 1.0
        });
      }
    }
    return true;
  }

  function carrierDamageReduction(carrier, angleDiff) {
    if (!carrier || !carrier.hasDockedGunner) return 0;
    // Rear or flanks (angle difference > PI / 2 relative to heading)
    if (Math.abs(angleDiff) > Math.PI / 2) {
      return BASE.carrierRearDamageReduction;
    }
    return 0;
  }

  function tick(pilot, game, dt) {
    const s = state(pilot);
    if (!s || !validPilot(pilot) || !Number.isFinite(dt) || dt <= 0 ||
        game?.state !== 'playing') return;

    const now = game.survivalTime || 0;

    // Handle shift duration
    if (s.shiftActive) {
      s.shiftRemaining -= dt;
      if (s.shiftRemaining <= 0) {
        s.shiftActive = false;
        s.shiftRemaining = 0;
        reap(pilot, game, false);
      }
    }

    // Handle dash recharge
    const maxCharges = Math.min(BASE.maxDashCharges,
      BASE.baseDashCharges + (s.warpUpgrades.charge_overflow || 0));
    s.dashCharges = Math.min(maxCharges, s.dashCharges);
    if (s.dashCharges < maxCharges) {
      s.dashRecharge += dt;
      if (s.dashRecharge >= BASE.dashRecharge) {
        s.dashCharges++;
        s.dashRecharge -= BASE.dashRecharge;
      }
    } else {
      s.dashRecharge = 0;
    }

    // Handle clean up of expired marks
    for (const [enemy, expireAt] of s.marks.entries()) {
      if (enemy.dead || enemy.hp <= 0 || expireAt < now) {
        s.marks.delete(enemy);
      }
    }

    // Handle docking tether, overheat cycle & natural ectoplasm gain
    if (s.docked) {
      s.dockElapsed += dt;
      if (!s.carrier || s.carrier.hp <= 0 || s.carrier.downed) {
        undock(pilot, game, true); // Carrier fell down, emergency eject!
      } else if (s.dockElapsed >= BASE.dockMaxDuration) {
        undock(pilot, game, true); // Overheat auto-eject to preserve active combat rhythm!
      } else {
        pilot.x = s.carrier.x;
        pilot.y = s.carrier.y;
        addEctoplasm(pilot, BASE.dockEctoplasmPerSec * dt);
      }
    } else {
      s.dockCooldownRemaining = Math.max(0, s.dockCooldownRemaining - dt);
    }
  }

  function renderMarks(ctx, game) {
    const pilot = game?.player;
    const s = pilot?.phantom;
    if (!s?.marks?.size || !ctx) return;
    const now = game.survivalTime || 0;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.4;

    for (const [enemy, expireAt] of s.marks.entries()) {
      if (!enemy || enemy.dead || enemy.hp <= 0 || expireAt < now) continue;
      const x = enemy.x;
      const y = enemy.y - (enemy.radius || 14) - 10;

      // Floating ethereal diamond mark
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 4, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center cyan gleam
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();
      ctx.fillStyle = '#a855f7';
    }
    ctx.restore();
  }

  // Register with V6 ship abilities & catalog if present
  if (typeof window !== 'undefined' && window.NeonShips) {
    if (window.NeonShips.registerUpgradeCatalog && catalog) {
      try { window.NeonShips.registerUpgradeCatalog('phantom', catalog); } catch {}
    }
    if (window.NeonShips.registerAbilities) {
      try {
        window.NeonShips.registerAbilities('phantom', {
          onStart(pilot) {
            state(pilot);
            window.NeonPhantomScythe?.state(pilot);
          },
          onTick(pilot, game, dt) {
            tick(pilot, game, dt);
            window.NeonPhantomScythe?.tick(pilot, game, dt);
          },
          onAction(pilot, game, action) {
            if (action === 'shift') return enterShift(pilot, game);
            if (action === 'reap') return reap(pilot, game, true);
            if (action === 'dock' || action?.kind === 'dock') return dock(pilot, action.carrier);
            if (action === 'undock' || action?.kind === 'undock') return undock(pilot, game, action?.eject);
            return false;
          },
          onUpgrade(pilot, game, card) {
            const s = state(pilot);
            if (!s || !card) return false;
            if (card.type === 'dash') s.warpUpgrades[card.id] = (s.warpUpgrades[card.id] || 0) + 1;
            else if (card.type === 'passive') s.passiveUpgrades[card.id] = (s.passiveUpgrades[card.id] || 0) + 1;
            else if (card.type === 'weapon') pilot.weapons[card.id] = (pilot.weapons[card.id] || 0) + 1;
            return true;
          }
        });
      } catch {}
    }
  }

  window.NeonPhantom = Object.freeze({
    BASE, UNIQUE, catalog, state, validPilot,
    addEctoplasm, critBonus, enterShift, markEnemy, reap,
    canDock, dock, undock, carrierDamageReduction, tick, renderMarks
  });
})();
