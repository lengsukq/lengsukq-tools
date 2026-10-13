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
    shiftDuration: 1.6,             // Retain base window for headless assertions
    shiftSpeedMultiplier: 1.45,
    shiftCooldown: 0,
    shiftDrainPerSecond: 20,        // Drains 20 ectoplasm per second
    shiftMinActivationEcto: 15,     // Minimum 15 ectoplasm required to enter
    strikeEctoCost: 15,             // Spectral strike consumes 15 ectoplasm
    maxShiftEctoplasmPerSecond: 8.0,// Hard cap on ectoplasm gained while shifted
    baseDashCharges: 2,
    maxDashCharges: 3,
    dashRecharge: 5.5,
    markDuration: 4.0,
    baseReapDamage: 48,             // Balanced from 85 to prevent early-game instant one-shots
    reapLevelScale: 4.5,            // Smooth level scaling (+4.5 per level)
    reapTargetBonus: 0.08,          // Smooth target scaling (down from 0.15)
    reapMaxTargetBonus: 1.20,       // Max +120% target density bonus
    reapEctoMultiplier: 1.0,        // Ectoplasm potency scaling
    reapMaxDamageCap: 650,          // Raw base cap before attackScale multiplier
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

  const CARD_HELP = Object.freeze({
    phantom_scythe: '双镰往返切割；升级增加伤害、飞行距离、镰刀数量和回收爆发',
    spectral_dart: '自动锁定多名敌人连续发射虚界毒刺；提高目标数与伤害',
    soul_reap_orb: '法球贯穿附近目标并回收灵质；提高连击目标数',
    void_rift_mine: '敌人脚下留下0.55秒后引爆的裂隙雷；提高爆炸半径与伤害',
    symbiote_beam: '灵质光束命中多个目标；共生时为载体恢复少量生命',
    haunt_clones: '生成多个延迟追击的残影区域打击',
    curse_totem: '在敌群召唤延时幽冥图腾，潜行时附带灵魂烙印',
    apocalypse_scythe: '周期性大范围终焉镰刀斩击，最多影响16个敌人',
    abyssal_possession: '向最近敌人释放有单次上限的高伤侵蚀，普通敌人还会减速',
    phantom_core: '提高灵质上限并增加幽灵暴击概率',
    spiritual_flow: '提高所有正向灵质收集的倍率',
    stealth_armor: '低生命时提高基础再生速度',
    execute_master: '敌人生命低于35%时提高幽灵专属武器伤害',
    symbiosis_link: '增加共生挂载期间的灵质恢复速度',
    soul_gatherer: '幽灵专属武器每次命中额外回收灵质',
    death_reversal: '本局首次致命伤害触发一次紧急重构（已消耗则不再触发）',
    dual_mind: '提高灵质系统提供的暴击概率',
    spectral_extend: '降低幽灵形态灵质消耗速度（每级-20%消耗），并小幅提升潜行灵质吸收上限，大幅延长维持时间',
    soul_detonation: '提高烙印引爆范围与伤害',
    charge_overflow: '灵能超蓄：提高灵质上限25点并降低化身门槛至10灵质',
    ghost_trail: '潜行期间每0.36秒产生近距离冥火伤害与特效',
    terror_shriek: '斩魂引爆后短暂恐吓周围敌群',
    dimension_door: '潜行结束时减速周围敌人',
    symbiote_slingshot: '共生弹射后3秒提高暴击概率'
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
      icon: ['☄','✧','◈'][typeIndex],
      desc: CARD_HELP[id],
      statText: Array.from({length:levels||5},(_,i)=>
        `Lv.${i+1}/${levels||5} · ${CARD_HELP[id]}`),
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
      slingshotBuffUntil: 0,
      shiftTrail: [], shiftTrailTimer: 0, shiftFlash: 0, reapFlash: 0,
      sprintTimer: 0, sprintCooldown: 0, strikeCooldown: 0,
      shiftEctoGainedThisSec: 0, shiftEctoTimer: 0
    };
  }

  function state(pilot) {
    if (pilot?.shipId !== 'phantom') return null;
    const s = (pilot.phantom ||= createState());
    const extraMax = (s.warpUpgrades?.charge_overflow || 0) * 25;
    s.maxEctoplasm = BASE.maxEctoplasm + (s.passiveUpgrades?.phantom_core || 0) * 8 + extraMax;
    return s;
  }

  function attackScale(pilot) {
    const baseMult = pilot?.dmgMultiplier || 1;
    const level = Math.max(1, pilot?.level || 1);
    const levelScale = 1 + (level - 1) * 0.06;
    if (pilot?._arsenalInDmgMult) return baseMult * levelScale;
    const weapTotal = Object.values(pilot?.weapons || {}).reduce((a, b) => a + (b || 0), 0);
    const extraWeap = Math.max(0, weapTotal - 1);
    const passTotal = Object.values(pilot?.passives || pilot?.phantom?.passiveUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
    const warpTotal = Object.values(pilot?.dashUpgrades || pilot?.phantom?.warpUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
    const arsenalMult = 1 + extraWeap * 0.06 + passTotal * 0.05 + warpTotal * 0.06;
    return baseMult * levelScale * arsenalMult;
  }

  function addEctoplasm(pilot, amount) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !Number.isFinite(amount) || amount <= 0) return 0;

    let allowed = amount;
    if (s.shiftActive) {
      const extendTier = s.warpUpgrades?.spectral_extend || 0;
      const maxPerSec = (BASE.maxShiftEctoplasmPerSecond || 8.0) + extendTier * 1.5;
      const budgetLeft = Math.max(0, maxPerSec - (s.shiftEctoGainedThisSec || 0));
      allowed = Math.min(amount, budgetLeft);
      if (allowed <= 0) return 0;
      s.shiftEctoGainedThisSec = (s.shiftEctoGainedThisSec || 0) + allowed;
    }

    const bonusFlow = 1 + (s.passiveUpgrades.spiritual_flow || 0) * 0.15;
    const gain = Math.min(s.maxEctoplasm - s.ectoplasm, allowed * bonusFlow);
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
    bonus += (s.passiveUpgrades.dual_mind || 0) * .035;
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

    // Toggle: if already in ghost state, exit and trigger reap explosion!
    if (s.shiftActive) {
      return finishShift(pilot, game, true);
    }

    const minEcto = (s.warpUpgrades?.charge_overflow || 0) > 0 ? 10 : BASE.shiftMinActivationEcto;
    const hasEnoughEcto = s.ectoplasm >= minEcto;
    if (!hasEnoughEcto && s.dashCharges < 1 && s.ectoplasm <= 0) return false;

    if (s.dashCharges > 0) s.dashCharges--;
    s.shiftActive = true;
    s.shiftEctoGainedThisSec = 0;
    s.shiftEctoTimer = 0;
    const extraDuration = (s.warpUpgrades.spectral_extend || 0) * 0.5;
    s.shiftRemaining = Math.max(BASE.shiftDuration + extraDuration, s.ectoplasm > 0 ? s.ectoplasm / 15 : 0);
    s.shiftTrail.length = 0;
    s.shiftTrailTimer = 0;
    s.shiftFlash = .24;
    s.shiftTrail.push({x:pilot.x,y:pilot.y,life:.5});
    pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, s.shiftRemaining);

    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves?.push({
        x: pilot.x, y: pilot.y, radius: 10, maxRadius: 65,
        color: '#00f0ff', alpha: 0.8
      });
    }
    return true;
  }

  function markEnemy(pilot, enemy, timeSeconds, force = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !enemy || enemy.dead || enemy.hp <= 0) return false;
    if (!s.shiftActive && !force) return false;
    // Guests used to re-mark the same enemy every frame and farm unlimited
    // ectoplasm without changing position. One fresh mark earns one reward.
    if ((s.marks.get(enemy) || 0) > timeSeconds) return false;
    if (s.marks.size >= 64) {
      // Bound map size to prevent memory explosion
      s.marks.delete(s.marks.keys().next().value);
    }
    s.marks.set(enemy, timeSeconds + BASE.markDuration);
    addEctoplasm(pilot, BASE.passThroughEctoplasm);
    window.NeonPhantomVisual?.emit(pilot,'mark',enemy,null,25,.37);
    return true;
  }

  function isMarked(pilot, enemy, timeSeconds = 0) {
    const s = state(pilot);
    if (!s || !enemy || !s.marks?.has(enemy)) return false;
    const expireAt = s.marks.get(enemy);
    return Number.isFinite(expireAt) ? expireAt > timeSeconds : true;
  }

  function markDamageBonus(pilot, enemy, timeSeconds = 0) {
    if (!validPilot(pilot) || !isMarked(pilot, enemy, timeSeconds)) return 1.0;
    // Branded enemies take +25% amplified damage from all of Phantom's attacks!
    return 1.25;
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
    const finalDamage = cappedDamage * attackScale(pilot);

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
      window.NeonPhantomVisual?.emit(pilot,'burst',pilot,null,BASE.ejectRadius,.45);
      window.NeonPhantomVisual?.emit(pilot,'burst',pilot,null,180,.45);
    }

    // Shockwave FX
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves?.push({
        x: pilot.x, y: pilot.y, radius: 15, maxRadius: 180,
        color: '#a855f7', alpha: 0.95
      });
    }

    s.marks.clear();
    s.reapFlash = .28;
    return targetCount;
  }

  function finishShift(pilot, game, forced = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s?.shiftActive || game?.state !== 'playing') return false;
    s.shiftActive = false;
    s.shiftRemaining = 0;
    // Ending shift early also ends its extended no-hit window.
    pilot.invulnTimer = Math.min(pilot.invulnTimer || 0,.18);
    if (Number.isFinite(pilot.invuln)) pilot.invuln = Math.min(pilot.invuln,.18);
    s.reapFlash = .28;
    reap(pilot, game, forced);
    const power = Math.min(2, s.warpUpgrades.dimension_door || 0);
    if (power) {
      window.NeonPhantomVisual?.emit(pilot,'burst',pilot,null,90+power*15,.4);
      for (const enemy of game.enemies || []) {
        if (enemy.dead || enemy.hp <= 0 || !within(enemy,pilot,90+power*15)) continue;
        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, .4+power*.2);
      }
    }
    return true;
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
    if (s.shiftActive) {
      s.shiftActive = false;
      s.shiftRemaining = 0;
    }
    s.docked = true;
    s.carrier = carrier;
    s.dockElapsed = 0;
    carrier.hasDockedGunner = true;
    pilot.x = carrier.x;
    pilot.y = carrier.y;
    window.NeonPhantomVisual?.emit(pilot,'heal',carrier,null,40,.45);
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
        window.NeonPhantomVisual?.emit(pilot,'burst',pilot,null,90,.45);
      }

      // Radial blast knocks back and stuns enemies
      const ejectScale = attackScale(pilot);
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && within(enemy, pilot, BASE.ejectRadius)) {
          game.dealDamage(enemy, BASE.ejectDamage * ejectScale,
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
    if (pilot.cheatDeathUsed && !s.deathVisualPlayed) {
      s.deathVisualPlayed = true;
      window.NeonPhantomVisual?.emit(pilot,'heal',pilot,null,75,.7);
    }
    s.shiftFlash = Math.max(0,(s.shiftFlash || 0)-dt);
    s.reapFlash = Math.max(0,(s.reapFlash || 0)-dt);
    s.sprintTimer = Math.max(0, (s.sprintTimer || 0) - dt);
    s.sprintCooldown = Math.max(0, (s.sprintCooldown || 0) - dt);
    s.strikeCooldown = Math.max(0, (s.strikeCooldown || 0) - dt);
    s.shiftEctoTimer = (s.shiftEctoTimer || 0) + dt;
    if (s.shiftEctoTimer >= 1.0) {
      s.shiftEctoTimer -= 1.0;
      s.shiftEctoGainedThisSec = 0;
    }
    for (let i = s.shiftTrail.length - 1; i >= 0; i--) {
      s.shiftTrail[i].life -= dt;
      if (s.shiftTrail[i].life <= 0) s.shiftTrail.splice(i,1);
    }
    if (s.shiftActive) {
      s.shiftTrailTimer -= dt;
      if (s.shiftTrailTimer <= 0) {
        s.shiftTrailTimer = .055;
        s.shiftTrail.push({x:pilot.x,y:pilot.y,life:.42});
        if (s.shiftTrail.length > 10) s.shiftTrail.shift();
      }
    }
    // Passing through an enemy while shifted leaves a bounded soul mark.
    // Subsequent reap can always affect a target even in solo play.
    if (s.shiftActive) {
      let marked = 0;
      for (const enemy of game.enemies || []) {
        if (enemy.dead || enemy.hp <= 0 || s.marks.has(enemy) ||
            !within(enemy, pilot, (enemy.radius || 14) + (pilot.radius || 16) + 16)) continue;
        markEnemy(pilot, enemy, now);
        if (++marked >= 12) break;
      }
    }

    // Handle shift duration & continuous ectoplasm drain
    if (s.shiftActive) {
      const extendTier = s.warpUpgrades.spectral_extend || 0;
      const drainReduction = Math.min(0.5, extendTier * 0.20);
      const drainRate = BASE.shiftDrainPerSecond * (1 - drainReduction);

      if (s.ectoplasm > 0) {
        s.ectoplasm = Math.max(0, s.ectoplasm - dt * drainRate);
      }

      if ((s.warpUpgrades.ghost_trail || 0) > 0) {
        s.ghostTrailCooldown = Math.max(0, (s.ghostTrailCooldown || 0) - dt);
        if (s.ghostTrailCooldown === 0 && (game.shockwaves?.length || 0) < 35) {
          s.ghostTrailCooldown = .36;
          const level = Math.min(2, s.warpUpgrades.ghost_trail);
          const trailScale = attackScale(pilot);
          let hits=0;
          for (const enemy of game.enemies || []) {
            if (enemy.dead || enemy.hp <= 0 || !within(enemy,pilot,45+level*12)) continue;
            game.dealDamage(enemy,(16+level*11)*trailScale,'phantom_ghost_trail',false,pilot);
            if (++hits >= 12) break;
          }
          window.NeonPhantomVisual?.emit(pilot,'burst',pilot,null,55+level*12,.32);
          game.shockwaves.push({x:pilot.x,y:pilot.y,radius:10,maxRadius:55+level*12,
            color:'#7439b5',alpha:.48});
        }
      }
      s.shiftRemaining -= dt;
      if (s.ectoplasm > 0) {
        // As long as ectoplasm remains, prevent shift from prematurely ending
        s.shiftRemaining = Math.max(s.shiftRemaining, 0.5);
      }
      if (s.shiftRemaining <= 0 || (s.ectoplasm <= 0 && s.dashCharges <= 0)) {
        finishShift(pilot, game, false);
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

    // Handle clean up of expired marks belonging to this pilot only.
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
        addEctoplasm(pilot, BASE.dockEctoplasmPerSec * dt *
          (1+(s.passiveUpgrades.symbiosis_link || 0)*.12));
      }
    } else {
      s.dockCooldownRemaining = Math.max(0, s.dockCooldownRemaining - dt);
    }
  }

  function renderMarks(ctx, game) {
    const pilots = game?.players?.list?.().map(entry=>entry.state) ||
      [game?.player,game?.lanCoop?.ally].filter(Boolean);
    if (!ctx || !pilots.some(pilot=>pilot?.phantom?.marks?.size)) return;
    const now = game.survivalTime || 0;
    const realTime = typeof performance !== 'undefined' ? performance.now() * 0.001 : now;
    ctx.save();

    for (const pilot of pilots) for (const [enemy, expireAt] of (pilot?.phantom?.marks || new Map()).entries()) {
      if (!enemy || enemy.dead || enemy.hp <= 0 || expireAt < now) continue;
      const timeLeft = expireAt - now;
      const x = enemy.x;
      const hoverY = Math.sin(realTime * 6 + x) * 2.5;
      const y = enemy.y - (enemy.radius || 14) - 13 + hoverY;

      // 1. Eerie Vertical Soul Mist Tether (ascending from enemy to seal)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, enemy.y - (enemy.radius || 14));
      ctx.lineTo(x, y + 7);
      ctx.stroke();

      // 2. Outer Pulsating Soul Seal Halo
      const pulse = Math.sin(realTime * 8) * 1.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#c084fc';
      ctx.strokeStyle = timeLeft < 1.0 ? '#ff4081' : '#00f0ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y, 9 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Floating Ethereal Soul Brand Diamond Crest
      ctx.fillStyle = '#18072b';
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner soul flame diamond
      ctx.fillStyle = timeLeft < 1.0 ? '#ff6090' : '#a855f7';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 3.8, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 3.8, y);
      ctx.closePath();
      ctx.fill();

      // 4. Center Cyan Soul Slit Pupil
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.0, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function ghostStrike(pilot, game) {
    if (!validPilot(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    if (!s || (s.strikeCooldown || 0) > 0) return false;
    const cost = BASE.strikeEctoCost || 15;
    if ((s.ectoplasm || 0) < cost) return false;
    s.ectoplasm -= cost;
    s.strikeCooldown = 4.5;

    const now = game.survivalTime || 0;
    const aim = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : 0;
    const range = 300;
    const halfWidth = 65;
    const cos = Math.cos(aim), sin = Math.sin(aim);
    const enemies = (game.enemies || []).filter(e => e && !e.dead && e.hp > 0);
    let hitCount = 0;
    const maxTargets = 10;
    const strikeScale = attackScale(pilot);

    for (const e of enemies) {
      if (hitCount >= maxTargets) break;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const forward = dx * cos + dy * sin;
      if (forward < -20 || forward > range) continue;
      const lateral = Math.abs(-dx * sin + dy * cos);
      if (lateral > halfWidth + (e.radius || 12)) continue;

      const level = pilot.level || 1;
      const slashDamage = (32 + level * 4.5) * strikeScale;
      game.dealDamage(e, slashDamage, 'phantom_strike', false, pilot);
      markEnemy(pilot, e, now + 4.5, true);
      e.freezeTimer = Math.max(e.freezeTimer || 0, 1.6);
      hitCount++;
    }

    window.NeonPhantomVisual?.emit(pilot, 'beam',
      { x: pilot.x, y: pilot.y },
      { x: pilot.x + cos * range, y: pilot.y + sin * range },
      halfWidth * 2, .32);

    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x + cos * (range * 0.45),
        y: pilot.y + sin * (range * 0.45),
        radius: 12, maxRadius: 85,
        color: '#00f0ff', alpha: 0.85
      });
    }

    return true;
  }

  function sprint(pilot, game) {
    if (!validPilot(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    if (!s || (s.sprintCooldown || 0) > 0) return false;
    s.sprintTimer = 3.0;
    s.sprintCooldown = 5.0;
    window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 80, .35);
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x, y: pilot.y,
        radius: 12, maxRadius: 100,
        color: '#00f0ff', alpha: 0.8
      });
    }
    return true;
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
            window.NeonPhantomVisual?.tick(pilot,dt);
            tick(pilot, game, dt);
            window.NeonPhantomScythe?.tick(pilot, game, dt);
            window.NeonPhantomArsenal?.tick(pilot, game, dt);
          },
          onAction(pilot, game, action) {
            if (action?.kind === 'warp' || action === 'warp') return state(pilot)?.shiftActive ?
              finishShift(pilot,game,true) : enterShift(pilot,game);
            if (action === 'shift') return state(pilot)?.shiftActive ?
              finishShift(pilot,game,true) : enterShift(pilot,game);
            if (action === 'reap') return finishShift(pilot, game, true);
            if (action === 'strike' || action === 'slash' || action === 'surge')
              return ghostStrike(pilot, game);
            if (action === 'sprint' || action?.kind === 'sprint') return sprint(pilot, game);
            if (action === 'dock' || action?.kind === 'dock') return dock(pilot, action.carrier);
            if (action === 'undock' || action?.kind === 'undock') return undock(pilot, game, action?.eject);
            return false;
          },
          onUpgrade(pilot, game, card) {
            const s = state(pilot);
            const def = catalog.find(item => item.id === card?.id && item.type === card?.type);
            if (!s || !def) return false;
            const bag = def.type === 'weapon' ? (pilot.weapons ||= {}) :
              def.type === 'passive' ? (pilot.passives ||= {}) : (pilot.dashUpgrades ||= {});
            const next = bag[def.id] || 0;
            if (next >= def.maxLvl) return false;
            bag[def.id] = next + 1;
            if (def.type === 'dash') s.warpUpgrades[def.id] = bag[def.id];
            else if (def.type === 'passive') s.passiveUpgrades[def.id] = bag[def.id];
            return true;
          }
        });
      } catch {}
    }
  }

  window.NeonPhantom = Object.freeze({
    BASE, UNIQUE, catalog, state, attackScale, validPilot,
    addEctoplasm, critBonus, enterShift, finishShift, markEnemy, isMarked, markDamageBonus, reap,
    canDock, dock, undock, carrierDamageReduction, tick, renderMarks, ghostStrike, sprint
  });
})();
