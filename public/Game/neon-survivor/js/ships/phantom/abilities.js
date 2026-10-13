/* PHANTOM / 幽灵·共生拟态 — headless, host-authoritative ability foundation.
 * Continuous fluid stealth gauge, independent CD sprint, dual-mode player-following
 * void singularity field, locking phantom soul orb, and chaining soul reap detonations.
 */
(() => {
  'use strict';
  const BASE = Object.freeze({
    initialEctoplasm: 0,
    maxEctoplasm: 100,
    killEctoplasm: 0,
    passThroughEctoplasm: 0,
    stealthBaseMax: 3.8,            // Base 3.8s continuous stealth (up to 6.5s via upgrades)
    shiftDuration: 3.8,             // Retain base window for assertions
    stealthRechargeSeconds: 4.8,    // 4.8s to fully recharge from 0 to 100%
    shiftSpeedMultiplier: 1.40,     // Base +40% speed during stealth
    shiftCooldown: 0,
    baseDashCharges: 2,
    maxDashCharges: 4,
    dashRecharge: 4.8,
    markDuration: 4.0,
    baseReapDamage: 52,
    reapLevelScale: 5.5,
    reapTargetBonus: 0.08,
    reapMaxTargetBonus: 1.20,
    reapMaxDamageCap: 800,
    reapRadius: 420,
    maxReapTargets: 24,
    reapKillRefundFraction: 0.20,   // 20% stealth capacity refund per kill
    reapMaxKillRefund: 0.60,        // Max 60% refund per reap
    sprintDuration: 3.0,
    sprintCooldown: 4.5,
    sprintSpeedBonus: 0.75,         // Fixed +75% move speed during sprint
    vortexDuration: 2.6,            // Active field duration
    vortexCooldown: 6.0,
    vortexRadius: 260,              // Large pull radius when in stealth
    repelRadius: 155,               // Smaller push/repel radius when out of stealth
    vortexPullSpeed: 320,           // Pull speed when in stealth
    vortexPushSpeed: 380,           // Push speed when out of stealth
    vortexSlowDuration: 1.8,
    dockMaxDistance: 150,
    dockMaxDuration: 14.0,          // 14s symbiote overheat cycle for active co-op rhythm
    dockCooldown: 8.0,              // 8s dock cooldown after overheat/undock
    carrierRearDamageReduction: 0.40,
    carrierSpeedBonus: 0.15,
    gunnerCritBonus: 0.20,
    gunnerFireRateBonus: 0.50,
    dockEctoplasmPerSec: 0,
    ejectRadius: 160,
    ejectStunDuration: 1.0,
    ejectDamage: 45
  });

  const CARD_HELP = Object.freeze({
    phantom_scythe: '射出穿透灵球锁定首个目标3秒；附着持续伤害，并释放脉动光圈减速且伤害周围敌群',
    spectral_dart: '自动锁定多名敌人连续发射虚界毒刺；提高目标数与伤害',
    soul_reap_orb: '法球贯穿附近目标并造成死魂冲击；提高连击目标数与穿透伤害',
    void_rift_mine: '敌人脚下留下0.55秒后引爆的裂隙雷；提高爆炸半径与伤害',
    symbiote_beam: '虚空射线命中多个目标；共生时为载体恢复少量生命',
    haunt_clones: '生成多个延迟追击的残影区域打击',
    curse_totem: '在敌群召唤延时幽冥图腾，潜行时附带灵魂烙印',
    apocalypse_scythe: '周期性大范围终焉镰刀斩击，最多影响16个敌人',
    abyssal_possession: '向最近敌人释放有单次上限的高伤侵蚀，普通敌人还会减速',
    phantom_core: '每级提升 +9% 暴击率 与 +12% 死印引爆伤害（最高 +45% 暴击率、+60% 引爆伤害）',
    spiritual_flow: '每级提升 +14% 潜行充能恢复速度，并缩短 [J] 幽影疾行与 [K] 虚空力场冷却时间 -8%/级',
    stealth_armor: '潜行期间及低生命时提升生命自愈速度（每级 +0.35/s）',
    execute_master: '对生命低于 35% 或带有【灵魂死印】的敌人，幽灵专属武器伤害提高',
    symbiosis_link: '每级扩大 [K] 虚空力场的聚怪/推斥范围 +15% 与减速时长，同时提升联机共生支援效果',
    soul_gatherer: '专属武器每次命中带有【灵魂死印】的敌人，额外缩减潜行充能冷却并提高暴击伤害',
    death_reversal: '本局首次致命伤害触发紧急重构免死并回血',
    dual_mind: '处于 潜行 或 幽影疾行（加速） 状态时，全局暴击率额外提升 +5%/级，攻击速度/伤害提升',
    spectral_extend: '每级延长持续潜行上限时间 +1.0秒，且潜行期间移速额外 +15%/级',
    soul_detonation: '提高死印引爆范围（+50%/级）与引爆伤害（+40%/级）',
    charge_overflow: '扩充持续潜行上限时间 +1.2秒/级，升级时立即回满潜行能流',
    ghost_trail: '潜行或加速期间每 0.36 秒在路径留下冥火灼烧敌群',
    terror_shriek: '死印引爆后恐吓周围敌群 1.5 秒',
    dimension_door: '退出潜行时冰封减速周围敌人',
    symbiote_slingshot: '开启 [J] 幽影疾行或脱离共生后 3 秒内，获得 100% 必暴击 状态！'
  });

  const UNIQUE = Object.freeze({
    weapon: Object.freeze([
      ['phantom_scythe', '噬魂灵球', 'rare', 5],
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
      ['spiritual_flow', '虚空脉动', 'common', 5],
      ['stealth_armor', '相位消隐装甲', 'common', 5],
      ['execute_master', '破败残响', 'rare', 5],
      ['symbiosis_link', '引力共振环', 'rare', 5],
      ['soul_gatherer', '噬魂收割者', 'rare', 5],
      ['death_reversal', '回光返照', 'legendary', 5],
      ['dual_mind', '双极意识', 'legendary', 5]
    ]),
    dash: Object.freeze([
      ['spectral_extend', '虚空漫步', 'common', 2],
      ['soul_detonation', '烙印剧变', 'common', 2],
      ['charge_overflow', '潜行超蓄', 'rare', 2],
      ['ghost_trail', '冥火余烬', 'rare', 2],
      ['terror_shriek', '惊骇恐吓', 'rare', 2],
      ['dimension_door', '虚界门扉', 'legendary', 2],
      ['symbiote_slingshot', '极速弹弓', 'legendary', 2]
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
  const within = (a, b, radius) => {
    if (!a || !b) return false;
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy <= radius * radius;
  };

  function createState() {
    return {
      ectoplasm: 0,
      maxEctoplasm: 100,
      shiftActive: false,
      shiftRemaining: 0,
      stealthMax: BASE.stealthBaseMax,
      stealthEnergy: BASE.stealthBaseMax,
      dashCharges: 2,
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
      sprintTimer: 0, sprintCooldown: 0,
      vortexTimer: 0, vortexCooldown: 0, vortexPulseTimer: 0,
      strikeCooldown: 0,
      ghostTrailCooldown: 0
    };
  }

  function state(pilot) {
    if (pilot?.shipId !== 'phantom') return null;
    const s = (pilot.phantom ||= createState());
    const extendLvl = s.warpUpgrades?.spectral_extend || pilot?.dashUpgrades?.spectral_extend || 0;
    const overflowLvl = s.warpUpgrades?.charge_overflow || pilot?.dashUpgrades?.charge_overflow || 0;
    s.stealthMax = BASE.stealthBaseMax + extendLvl * 1.0 + overflowLvl * 1.2;
    s.maxEctoplasm = BASE.maxEctoplasm + (s.passiveUpgrades?.phantom_core || pilot?.passives?.phantom_core || 0) * 8;
    s.dashCharges = s.shiftActive ? 0 : (s.stealthEnergy >= 0.35 ? (s.stealthEnergy > 2.0 ? 2 : 1) : 0);
    s.dashRecharge = s.stealthEnergy;
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
    let arsenalMult = 1 + extraWeap * 0.06 + passTotal * 0.05 + warpTotal * 0.06;
    const s = pilot?.phantom;
    if (s?.shiftActive || (s?.sprintTimer || 0) > 0) {
      const dualLvl = s.passiveUpgrades?.dual_mind || pilot?.passives?.dual_mind || 0;
      if (dualLvl > 0) arsenalMult *= (1 + dualLvl * 0.08);
    }
    return baseMult * levelScale * arsenalMult;
  }

  function getDashRechargeTime(pilot, s) {
    const st = s || state(pilot);
    const flowLvl = st?.passiveUpgrades?.spiritual_flow || pilot?.passives?.spiritual_flow || 0;
    const flowBonus = 1 + flowLvl * 0.14;
    const cdr = pilot?.cdrMultiplier || 1;
    return (BASE.dashRecharge / flowBonus) * cdr;
  }

  function addEctoplasm(pilot, amount) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !Number.isFinite(amount) || amount <= 0) return 0;
    const bonusFlow = 1 + (s.passiveUpgrades.spiritual_flow || pilot.passives?.spiritual_flow || 0) * 0.15;
    const gain = Math.min(s.maxEctoplasm - s.ectoplasm, amount * bonusFlow);
    s.ectoplasm += gain;
    return gain;
  }

  function critBonus(pilot, now = 0) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s) return 0;
    let bonus = 0;
    const coreLevel = s.passiveUpgrades.phantom_core || pilot.passives?.phantom_core || 0;
    if (coreLevel > 0) {
      bonus += coreLevel * 0.09;
    }
    if (s.shiftActive || (s.sprintTimer || 0) > 0) {
      const dualLvl = s.passiveUpgrades.dual_mind || pilot.passives?.dual_mind || 0;
      bonus += dualLvl * 0.05;
    }
    bonus = Math.min(0.75, bonus);
    if (s.slingshotBuffUntil > now) {
      bonus = 1.0;
    }
    return bonus;
  }

  function enterShift(pilot, game) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || game?.state !== 'playing') return false;

    // Toggle: if already in ghost state, exit and trigger reap detonation!
    if (s.shiftActive) {
      return finishShift(pilot, game, true);
    }

    if ((s.stealthEnergy || 0) < 0.35) return false;

    if (s.dashCharges > 0) s.dashCharges--;
    s.shiftActive = true;
    const extendTier = s.warpUpgrades.spectral_extend || pilot.dashUpgrades?.spectral_extend || 0;
    s.shiftRemaining = s.stealthEnergy + extendTier * 1.0;
    s.shiftTrail.length = 0;
    s.shiftTrailTimer = 0;
    s.shiftTrailSeq = (s.shiftTrailSeq || 0) + 1;
    s.shiftFlash = 0.28;
    const initAngle = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : (pilot.angle || 0);
    s.shiftTrail.push({ x: pilot.x, y: pilot.y, angle: initAngle, life: 0.44, seq: s.shiftTrailSeq });
    pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, 0.18);

    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x, y: pilot.y, radius: 10, maxRadius: 78,
        color: '#00f0ff', alpha: 0.85
      });
    }
    return true;
  }

  function markEnemy(pilot, enemy, timeSeconds, force = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !enemy || enemy.dead || enemy.hp <= 0) return false;
    if (!s.shiftActive && !force) return false;
    if ((s.marks.get(enemy) || 0) > timeSeconds) return false;
    if (s.marks.size >= 64) {
      s.marks.delete(s.marks.keys().next().value);
    }
    s.marks.set(enemy, timeSeconds + BASE.markDuration);
    addEctoplasm(pilot, 4);
    window.NeonPhantomVisual?.emit(pilot, 'mark', enemy, null, 25, 0.37);
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

    const detonMult = (1 + (s.warpUpgrades.soul_detonation || pilot.dashUpgrades?.soul_detonation || 0) * 0.40) *
      (1 + (s.passiveUpgrades.phantom_core || pilot.passives?.phantom_core || 0) * 0.12);
    const radiusBonus = (s.warpUpgrades.soul_detonation || pilot.dashUpgrades?.soul_detonation || 0) * 0.50;
    const maxRadius = BASE.reapRadius * (1 + radiusBonus);
    const maxRadiusSq = maxRadius * maxRadius;

    const validTargets = [];
    for (const e of enemies) {
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      if (dx * dx + dy * dy <= maxRadiusSq) {
        validTargets.push(e);
        if (validTargets.length >= BASE.maxReapTargets) break;
      }
    }

    const targetCount = validTargets.length;
    const level = pilot.level || 1;
    const densityBonus = Math.min(BASE.reapMaxTargetBonus, targetCount * BASE.reapTargetBonus);
    const scaledBase = (BASE.baseReapDamage + (level - 1) * BASE.reapLevelScale) * (1 + densityBonus);
    const rawDamage = scaledBase * detonMult;
    const cappedDamage = Math.min(BASE.reapMaxDamageCap, rawDamage);
    const finalDamage = cappedDamage * attackScale(pilot);

    let kills = 0;
    let fxEmitted = 0;
    for (const enemy of validTargets) {
      const prevHp = enemy.hp;
      game.dealDamage(enemy, finalDamage, 'phantom_reap', false, pilot);
      if (enemy.dead || enemy.hp <= 0 || prevHp <= finalDamage) kills++;
      if (fxEmitted < 8) {
        window.NeonPhantomVisual?.emit(pilot, 'reap_slash', pilot, enemy, 36, 0.38);
        fxEmitted++;
      }
    }

    // Continuous stealth energy refund on kill (+20% of max capacity per kill, max 60%)
    if (kills > 0) {
      const refundFraction = Math.min(BASE.reapMaxKillRefund, kills * BASE.reapKillRefundFraction);
      s.stealthEnergy = Math.min(s.stealthMax, (s.stealthEnergy || 0) + s.stealthMax * refundFraction);
      s.dashCharges = s.stealthEnergy >= 0.35 ? (s.stealthEnergy > 2.0 ? 2 : 1) : 0;
      s.dashRecharge = s.stealthEnergy;
    }

    // Terror shriek crowd control
    if ((s.warpUpgrades.terror_shriek || pilot.dashUpgrades?.terror_shriek || 0) > 0) {
      for (const e of game.enemies || []) {
        if (!e.dead && within(e, pilot, 180)) {
          e.fearedUntil = (game.survivalTime || 0) + 1.5;
        }
      }
      window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, BASE.ejectRadius, 0.45);
      window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 180, 0.45);
    }

    // Shockwave FX
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x, y: pilot.y, radius: 15, maxRadius: 195,
        color: '#a855f7', alpha: 0.95
      });
    }

    s.marks.clear();
    s.reapFlash = 0.28;
    return targetCount;
  }

  function finishShift(pilot, game, forced = false) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s?.shiftActive || game?.state !== 'playing') return false;
    s.shiftActive = false;
    s.shiftRemaining = 0;
    pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, 0.35);
    if (Number.isFinite(pilot.invuln)) pilot.invuln = Math.max(pilot.invuln, 0.35);
    s.reapFlash = 0.28;
    reap(pilot, game, forced);
    const power = Math.min(2, s.warpUpgrades.dimension_door || pilot.dashUpgrades?.dimension_door || 0);
    if (power) {
      window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 90 + power * 15, 0.4);
      for (const enemy of game.enemies || []) {
        if (enemy.dead || enemy.hp <= 0 || !within(enemy, pilot, 90 + power * 15)) continue;
        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.4 + power * 0.2);
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
      finishShift(pilot, null, true);
    }
    s.docked = true;
    s.carrier = carrier;
    s.dockElapsed = 0;
    carrier.hasDockedGunner = true;
    pilot.x = carrier.x;
    pilot.y = carrier.y;
    window.NeonPhantomVisual?.emit(pilot, 'heal', carrier, null, 40, 0.45);
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
      if ((s.warpUpgrades.symbiote_slingshot || pilot.dashUpgrades?.symbiote_slingshot || 0) > 0) {
        s.slingshotBuffUntil = now + 3.0;
        window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 90, 0.45);
      }

      const ejectScale = attackScale(pilot);
      for (const enemy of game.enemies || []) {
        if (!enemy.dead && within(enemy, pilot, BASE.ejectRadius)) {
          game.dealDamage(enemy, BASE.ejectDamage * ejectScale,
            'phantom_eject', false, pilot);
          enemy.stunnedUntil = now + BASE.ejectStunDuration;
        }
      }

      if ((game.shockwaves?.length || 0) < 40) {
        game.shockwaves.push({
          x: pilot.x, y: pilot.y, radius: 10, maxRadius: BASE.ejectRadius,
          color: '#00f0ff', alpha: 1.0
        });
      }
    }
    return true;
  }

  function carrierDamageReduction(carrier, angleDiff) {
    if (!carrier || !carrier.hasDockedGunner) return 0;
    if (Math.abs(angleDiff) > Math.PI / 2) {
      return BASE.carrierRearDamageReduction;
    }
    return 0;
  }

  function sprint(pilot, game) {
    if (!validPilot(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    if (!s || (s.sprintCooldown || 0) > 0) return false;
    const flowLvl = s.passiveUpgrades.spiritual_flow || pilot.passives?.spiritual_flow || 0;
    const flowCdr = Math.max(0.50, 1 - flowLvl * 0.08);
    s.sprintCooldown = (BASE.sprintCooldown || 4.5) * (pilot.cdrMultiplier || 1) * flowCdr;
    s.sprintTimer = (s.sprintTimer || 0) + (BASE.sprintDuration || 3.0);

    if ((s.warpUpgrades.symbiote_slingshot || pilot.dashUpgrades?.symbiote_slingshot || 0) > 0) {
      const now = game.survivalTime || 0;
      s.slingshotBuffUntil = now + 3.0;
    }

    window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 85, 0.35);
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x, y: pilot.y,
        radius: 12, maxRadius: 100,
        color: '#00f0ff', alpha: 0.8
      });
    }
    return true;
  }

  // [K] 虚空力场: Player-following gravity vortex (Stealth = Pull Inward / Non-stealth = Repel Outward)
  function vortexPull(pilot, game) {
    if (!validPilot(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    if (!s || (s.vortexCooldown || 0) > 0) return false;
    const flowLvl = s.passiveUpgrades.spiritual_flow || pilot.passives?.spiritual_flow || 0;
    const flowCdr = Math.max(0.50, 1 - flowLvl * 0.08);
    s.vortexCooldown = (BASE.vortexCooldown || 6.0) * (pilot.cdrMultiplier || 1) * flowCdr;
    s.strikeCooldown = s.vortexCooldown;

    const linkLvl = s.passiveUpgrades.symbiosis_link || pilot.passives?.symbiosis_link || 0;
    const duration = (BASE.vortexDuration || 2.6) + linkLvl * 0.40;
    s.vortexTimer = duration;
    s.vortexPulseTimer = 0.25;

    const now = game.survivalTime || 0;
    const isShift = Boolean(s.shiftActive);
    const baseR = isShift ? (BASE.vortexRadius || 260) : (BASE.repelRadius || 155);
    const vRadius = baseR * (1 + linkLvl * 0.15) * (pilot.areaMultiplier || 1);
    const vRadiusSq = vRadius * vRadius;
    const vScale = attackScale(pilot);
    const initDamage = (28 + (pilot.level || 1) * 3.5) * vScale;
    let hitCount = 0;

    for (const e of game.enemies || []) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = pilot.x - e.x;
      const dy = pilot.y - e.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > vRadiusSq || distSq < 0.01) continue;
      const dist = Math.sqrt(distSq);

      if (isShift) {
        const minDist = 6;
        if (dist > minDist) {
          const pullFraction = e.isBoss ? 0.20 : 0.45;
          const step = Math.min(dist - minDist, dist * pullFraction);
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
        }
        if (within(e, pilot, (e.radius || 14) + (pilot.radius || 16) + 22)) {
          markEnemy(pilot, e, now);
        }
      } else {
        const pushAmount = e.isBoss ? 45 : 110;
        e.x -= (dx / dist) * pushAmount;
        e.y -= (dy / dist) * pushAmount;
      }

      game.dealDamage(e, initDamage, 'phantom_vortex', false, pilot);
      e.freezeTimer = Math.max(e.freezeTimer || 0, 1.8 + linkLvl * 0.40);
      if (++hitCount >= 24) break;
    }

    const fxKind = isShift ? 'vortex' : 'repel';
    window.NeonPhantomVisual?.emit(pilot, fxKind, pilot, null, vRadius, 0.55);
    if ((game.shockwaves?.length || 0) < 40) {
      game.shockwaves.push({
        x: pilot.x, y: pilot.y,
        radius: 15, maxRadius: vRadius * 0.88,
        color: isShift ? '#a855f7' : '#00f0ff',
        alpha: 0.85
      });
    }
    return true;
  }

  function ghostStrike(pilot, game) {
    return vortexPull(pilot, game);
  }

  function tick(pilot, game, dt) {
    const s = state(pilot);
    if (!s || !validPilot(pilot) || !Number.isFinite(dt) || dt <= 0 ||
        game?.state !== 'playing') return;

    const now = game.survivalTime || 0;
    if (pilot.cheatDeathUsed && !s.deathVisualPlayed) {
      s.deathVisualPlayed = true;
      window.NeonPhantomVisual?.emit(pilot, 'heal', pilot, null, 75, 0.7);
    }
    s.shiftFlash = Math.max(0, (s.shiftFlash || 0) - dt);
    s.reapFlash = Math.max(0, (s.reapFlash || 0) - dt);
    s.sprintTimer = Math.max(0, (s.sprintTimer || 0) - dt);
    s.sprintCooldown = Math.max(0, (s.sprintCooldown || 0) - dt);
    s.vortexCooldown = Math.max(0, (s.vortexCooldown || 0) - dt);
    s.strikeCooldown = s.vortexCooldown;

    // Shift trail decay
    for (let i = s.shiftTrail.length - 1; i >= 0; i--) {
      s.shiftTrail[i].life -= dt;
      if (s.shiftTrail[i].life <= 0) s.shiftTrail.splice(i, 1);
    }
    if (s.shiftActive || (s.sprintTimer || 0) > 0) {
      s.shiftTrailTimer -= dt;
      if (s.shiftTrailTimer <= 0) {
        s.shiftTrailTimer = 0.035;
        s.shiftTrailSeq = (s.shiftTrailSeq || 0) + 1;
        const moveAng = (Math.abs(pilot.vx || 0) + Math.abs(pilot.vy || 0) > 5)
          ? Math.atan2(pilot.vy || 0, pilot.vx || 0)
          : (Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : (pilot.angle || 0));
        s.shiftTrail.push({
          x: pilot.x,
          y: pilot.y,
          angle: moveAng,
          life: 0.42,
          seq: s.shiftTrailSeq
        });
        if (s.shiftTrail.length > 8) s.shiftTrail.shift();
      }
    }

    // Player-following Void Field Aura: follows pilot coordinates
    if ((s.vortexTimer || 0) > 0) {
      s.vortexTimer = Math.max(0, s.vortexTimer - dt);
      const linkLvl = s.passiveUpgrades.symbiosis_link || pilot.passives?.symbiosis_link || 0;
      const isShift = Boolean(s.shiftActive);
      const baseR = isShift ? (BASE.vortexRadius || 260) : (BASE.repelRadius || 155);
      const vRadius = baseR * (1 + linkLvl * 0.15) * (pilot.areaMultiplier || 1);
      const vRadiusSq = vRadius * vRadius;
      let affected = 0;

      for (const enemy of game.enemies || []) {
        if (!enemy || enemy.dead || enemy.hp <= 0) continue;
        const dx = pilot.x - enemy.x;
        const dy = pilot.y - enemy.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > vRadiusSq || distSq < 0.01) continue;
        const dist = Math.sqrt(distSq);

        if (isShift) {
          const minDist = 6;
          if (dist > minDist) {
            const pullRate = (enemy.isBoss ? 90 : (BASE.vortexPullSpeed || 320)) * (1 + (vRadius - dist) / vRadius * 0.45);
            const step = Math.min(dist - minDist, pullRate * dt);
            enemy.x += (dx / dist) * step;
            enemy.y += (dy / dist) * step;
          }
          if (within(enemy, pilot, (enemy.radius || 14) + (pilot.radius || 16) + 22)) {
            markEnemy(pilot, enemy, now);
          }
        } else {
          const pushRate = (enemy.isBoss ? 90 : (BASE.vortexPushSpeed || 380));
          const step = pushRate * dt;
          enemy.x -= (dx / dist) * step;
          enemy.y -= (dy / dist) * step;
        }

        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.5);
        if (++affected >= 24) break;
      }

      s.vortexPulseTimer = (s.vortexPulseTimer || 0) - dt;
      if (s.vortexPulseTimer <= 0) {
        s.vortexPulseTimer = 0.42;
        const pulseDmg = (18 + (pilot.level || 1) * 3.0) * attackScale(pilot);
        let hitCount = 0;
        for (const enemy of game.enemies || []) {
          if (!enemy || enemy.dead || enemy.hp <= 0 || !within(enemy, pilot, vRadius)) continue;
          game.dealDamage(enemy, pulseDmg, 'phantom_vortex', false, pilot);
          if (++hitCount >= 20) break;
        }
        const fxKind = isShift ? 'vortex' : 'repel';
        window.NeonPhantomVisual?.emit(pilot, fxKind, pilot, null, vRadius, 0.42);
      }
    }

    // Ghost trail emanation during shift OR sprint
    const trailActive = s.shiftActive || (s.sprintTimer || 0) > 0;
    if (trailActive && (s.warpUpgrades.ghost_trail || pilot.dashUpgrades?.ghost_trail || 0) > 0) {
      s.ghostTrailCooldown = Math.max(0, (s.ghostTrailCooldown || 0) - dt);
      if (s.ghostTrailCooldown === 0 && (game.shockwaves?.length || 0) < 35) {
        s.ghostTrailCooldown = 0.36;
        const level = Math.min(2, s.warpUpgrades.ghost_trail || pilot.dashUpgrades?.ghost_trail || 1);
        const trailScale = attackScale(pilot);
        let hits = 0;
        for (const enemy of game.enemies || []) {
          if (enemy.dead || enemy.hp <= 0 || !within(enemy, pilot, 45 + level * 14)) continue;
          game.dealDamage(enemy, (18 + level * 12) * trailScale, 'phantom_ghost_trail', false, pilot);
          if (++hits >= 12) break;
        }
        window.NeonPhantomVisual?.emit(pilot, 'burst', pilot, null, 55 + level * 14, 0.32);
        game.shockwaves.push({
          x: pilot.x, y: pilot.y, radius: 10, maxRadius: 55 + level * 14,
          color: '#7439b5', alpha: 0.48
        });
      }
    }

    // Passing through an enemy while shifted leaves a soul mark
    if (s.shiftActive) {
      let marked = 0;
      for (const enemy of game.enemies || []) {
        if (enemy.dead || enemy.hp <= 0 || s.marks.has(enemy) ||
            !within(enemy, pilot, (enemy.radius || 14) + (pilot.radius || 16) + 18)) continue;
        markEnemy(pilot, enemy, now);
        if (++marked >= 12) break;
      }
    }

    // Continuous stealth energy loop
    if (s.shiftActive) {
      s.stealthEnergy = Math.max(0, (s.stealthEnergy || 0) - dt);
      s.shiftRemaining = s.stealthEnergy;
      if (s.stealthEnergy <= 0) {
        finishShift(pilot, game, false);
      }
    } else {
      // Smooth continuous recovery when not in stealth
      const flowLvl = s.passiveUpgrades.spiritual_flow || pilot.passives?.spiritual_flow || 0;
      const flowBonus = 1 + flowLvl * 0.14;
      const rechargeRate = (s.stealthMax / BASE.stealthRechargeSeconds) * flowBonus / (pilot.cdrMultiplier || 1);
      s.stealthEnergy = Math.min(s.stealthMax, (s.stealthEnergy || 0) + dt * rechargeRate);
      s.shiftRemaining = 0;
      s.dashCharges = s.stealthEnergy >= 0.35 ? (s.stealthEnergy > 2.0 ? 2 : 1) : 0;
      s.dashRecharge = s.stealthEnergy;
    }

    // Clean up expired marks
    for (const [enemy, expireAt] of s.marks.entries()) {
      if (enemy.dead || enemy.hp <= 0 || expireAt < now) {
        s.marks.delete(enemy);
      }
    }

    // Handle docking tether
    if (s.docked) {
      s.dockElapsed += dt;
      if (!s.carrier || s.carrier.hp <= 0 || s.carrier.downed) {
        undock(pilot, game, true);
      } else if (s.dockElapsed >= BASE.dockMaxDuration) {
        undock(pilot, game, true);
      } else {
        pilot.x = s.carrier.x;
        pilot.y = s.carrier.y;
      }
    } else {
      s.dockCooldownRemaining = Math.max(0, s.dockCooldownRemaining - dt);
    }
  }

  // Optimized marks renderer without repetitive shadowBlur calls
  function renderMarks(ctx, game) {
    const pilots = game?.players?.list?.().map(entry => entry.state) ||
      [game?.player, game?.lanCoop?.ally].filter(Boolean);
    if (!ctx || !pilots.some(pilot => pilot?.phantom?.marks?.size)) return;
    const now = game.survivalTime || 0;
    const realTime = typeof performance !== 'undefined' ? performance.now() * 0.001 : now;
    ctx.save();

    for (const pilot of pilots) for (const [enemy, expireAt] of (pilot?.phantom?.marks || new Map()).entries()) {
      if (!enemy || enemy.dead || enemy.hp <= 0 || expireAt < now) continue;
      const timeLeft = expireAt - now;
      const x = enemy.x;
      const hoverY = Math.sin(realTime * 6 + x) * 2.2;
      const y = enemy.y - (enemy.radius || 14) - 12 + hoverY;

      // 1. Vertical soul tether
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.32)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, enemy.y - (enemy.radius || 14));
      ctx.lineTo(x, y + 7);
      ctx.stroke();

      // 2. Outer pulsating halo (lightweight layered strokes instead of heavy shadowBlur)
      const pulse = Math.sin(realTime * 8) * 1.4;
      ctx.strokeStyle = timeLeft < 1.0 ? 'rgba(255, 64, 129, 0.35)' : 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(x, y, 9 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = timeLeft < 1.0 ? '#ff4081' : '#00f0ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, 9 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Floating soul diamond crest
      ctx.fillStyle = '#18072b';
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Inner soul flame
      ctx.fillStyle = timeLeft < 1.0 ? '#ff6090' : '#a855f7';
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 3.8, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 3.8, y);
      ctx.closePath();
      ctx.fill();

      // 5. Center cyan pupil
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.0, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
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
            window.NeonPhantomVisual?.tick(pilot, dt);
            tick(pilot, game, dt);
            window.NeonPhantomScythe?.tick(pilot, game, dt);
            window.NeonPhantomArsenal?.tick(pilot, game, dt);
          },
          onAction(pilot, game, action) {
            const act = typeof action === 'string' ? action : action?.kind;
            if (act === 'warp' || act === 'shift') {
              return state(pilot)?.shiftActive ? finishShift(pilot, game, true) : enterShift(pilot, game);
            }
            if (act === 'reap') return finishShift(pilot, game, true);
            if (act === 'sprint') return sprint(pilot, game);
            if (act === 'vortex' || act === 'pull') return vortexPull(pilot, game);
            if (act === 'strike' || act === 'slash' || act === 'surge') return vortexPull(pilot, game);
            if (act === 'dock') return dock(pilot, action.carrier);
            if (act === 'undock') return undock(pilot, game, action?.eject);
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
            if (def.type === 'dash') {
              s.warpUpgrades[def.id] = bag[def.id];
              if (def.id === 'charge_overflow') {
                s.stealthMax = BASE.stealthBaseMax + (s.warpUpgrades.spectral_extend || 0) * 1.0 + bag[def.id] * 1.2;
                s.stealthEnergy = s.stealthMax; // refill immediately!
              }
            } else if (def.type === 'passive') {
              s.passiveUpgrades[def.id] = bag[def.id];
            }
            return true;
          }
        });
      } catch {}
    }
  }

  window.NeonPhantom = Object.freeze({
    BASE, UNIQUE, catalog, state, attackScale, validPilot, getDashRechargeTime,
    addEctoplasm, critBonus, enterShift, finishShift, markEnemy, isMarked, markDamageBonus, reap,
    canDock, dock, undock, carrierDamageReduction, tick, renderMarks, ghostStrike, sprint, vortexPull
  });
})();
