/* GENERATED FILE – do not edit. Run npm run ships:generate. */
/* Registered folders: astra, phantom, riftblade */
window.NeonShipsManifest = Object.freeze(["astra","phantom","riftblade"]);
// Source: ships/astra/ship.js
/* Auto-registered ship plugin */
// V5's mage archetype is registered for tooling, tests and forthcoming
  // character selection; all class weapons, active controls and host-authoritative
  // guest spell requests now load from the ship's own plugin directory.
  window.NeonShips.register({
    id: 'astra', code: 'ASTRA', name: '星织·织界术师',
    description: '星能法术、局部结界与攻守混合相位闪现', playable: true,
    baseStats: { hp: 95, speed: 235, regen: 0.8, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 2 },
    startingWeapon: 'star_weave', passiveId: null,
    activeSkillIds: ['meteor', 'ward'],
    warpTreeId: 'phase', rendererId: 'astra'
  });

if (!window.NeonShips?.get("astra")) { throw new Error("Ship astra did not register itself"); }

// Source: ships/astra/renderer.js
/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('astra', (ctx, fighter, profile) => {
  const mainColor = profile.color || '#b69aff';
  const downed = Boolean(fighter.downed);
  const strokeColor = downed ? '#ff617e' : mainColor;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const timeSec = now * 0.001;

  ctx.save();
  ctx.shadowBlur = downed ? 10 : 20;
  ctx.shadowColor = strokeColor;

  // 1. Dual-ring Celestial Astrolabe (Slowly counter-rotating mystical rings)
  if (!downed) {
    const ringAngle = timeSec * 0.9;
    ctx.save();
    ctx.translate(-7, 0);

    // Outer astrolabe ring with celestial tick marks
    ctx.strokeStyle = 'rgba(182, 154, 255, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // 4 orbital tick markers on outer ring
    for (let i = 0; i < 4; i++) {
      const a = ringAngle + (i * Math.PI / 2);
      const rx = Math.cos(a) * 22;
      const ry = Math.sin(a) * 22;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(rx, ry, i % 2 === 0 ? 1.8 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner counter-rotating astrolabe ring
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.55)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 15, -ringAngle * 1.3, -ringAngle * 1.3 + Math.PI * 1.6);
    ctx.stroke();

    // Orbiting celestial star motes
    const moteA = -ringAngle * 1.4;
    ctx.fillStyle = '#f5f3ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(Math.cos(moteA) * 15, Math.sin(moteA) * 15, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else {
    // Fractured dull ring when downed
    ctx.strokeStyle = 'rgba(255, 97, 126, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-7, 0, 20, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  }

  // 2. Main star-shuttle crystalline hull (Layered astral armor)
  ctx.fillStyle = downed ? '#1a0d18' : '#120b29';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.4;
  ctx.shadowBlur = downed ? 8 : 16;
  ctx.shadowColor = strokeColor;

  ctx.beginPath();
  ctx.moveTo(28, 0);              // Astral spearhead
  ctx.lineTo(10, -6);
  ctx.lineTo(-3, -13);
  ctx.lineTo(-19, -24);           // Swept ethereal wing port
  ctx.lineTo(-14, -8);
  ctx.lineTo(-18, 0);             // Tail keel cusp
  ctx.lineTo(-14, 8);
  ctx.lineTo(-19, 24);            // Swept ethereal wing starboard
  ctx.lineTo(-3, 13);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Sacred geometric prism inlays & facet lines
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = downed ? 'rgba(255, 97, 126, 0.5)' : 'rgba(224, 204, 255, 0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowColor = downed ? '#ff617e' : '#e0ccff';

  // Central diamond facet
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(3, -5.5);
  ctx.lineTo(-10, 0);
  ctx.lineTo(3, 5.5);
  ctx.closePath();
  ctx.stroke();

  // Wing crystal facet ribs
  ctx.beginPath();
  ctx.moveTo(3, -5.5);
  ctx.lineTo(-12, -18);
  ctx.moveTo(3, 5.5);
  ctx.lineTo(-12, 18);
  ctx.stroke();

  // Wingtip focus crystals
  ctx.fillStyle = downed ? '#ff617e' : '#f3e8ff';
  ctx.beginPath();
  ctx.arc(-17, -21, 1.8, 0, Math.PI * 2);
  ctx.arc(-17, 21, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 4. Central Celestial Singularity Core (Breathing radiance)
  const pulse = downed ? 0 : Math.sin(timeSec * 5) * 0.8;
  const coreRadius = 5.5 + pulse;

  ctx.beginPath();
  ctx.arc(3, 0, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.shadowBlur = downed ? 6 : 18;
  ctx.shadowColor = downed ? '#ff617e' : '#c084fc';
  ctx.fill();

  // Radiant core inner focus
  ctx.beginPath();
  ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 5. Stardust Slipstream Comet Exhausts (Multi-tier ethereal propulsion)
  const drift = downed ? 4 : (11 + Math.random() * 8);
  const thrusterGlow = downed ? '#ff617e' : '#c084fc';

  // Primary celestial plasma comet tail
  ctx.strokeStyle = downed ? '#ff617e' : 'rgba(192, 132, 252, 0.9)';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = thrusterGlow;
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.moveTo(-17, -4);
  ctx.lineTo(-17 - drift * 0.9, -6);
  ctx.moveTo(-18, 0);
  ctx.lineTo(-18 - drift * 1.4, 0);
  ctx.moveTo(-17, 4);
  ctx.lineTo(-17 - drift * 0.9, 6);
  ctx.stroke();

  // Inner white starlight plume core
  if (!downed) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-18 - drift * 0.8, 0);
    ctx.stroke();

    // Drifting stardust sparkles behind ship
    const sparkOffset = (now * 0.05) % 12;
    ctx.fillStyle = 'rgba(233, 213, 255, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(-22 - sparkOffset, -3 + Math.sin(timeSec * 8) * 2, 1.2, 0, Math.PI * 2);
    ctx.arc(-26 - sparkOffset * 0.7, 3 + Math.cos(timeSec * 7) * 2, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
});

// Source: ships/astra/abilities.js
/* ASTRA / 星织·织界术师 — host-authoritative abilities and transient warp FX.
 */
(() => {
  'use strict';
  const BASE = Object.freeze({
    initialMana: 60, maxMana: 100, naturalRegen: 2,
    maxHitRegenPerSecond: 12, hitRegenInterval: 1.5,
    meteorCost: 20, meteorCooldown: 0, meteorDamage: 48,
    meteorRadius: 125, meteorMaxTargets: 12,
    meteorRefundThreshold: 3, meteorRefundPerTarget: 1.5, maxMeteorManaRefund: 8.0,
    meteorWardCdrPerTarget: 0.3, maxMeteorWardCdr: 1.5,
    wardCost: 15, wardMinActivationMana: 20,
    wardCooldown: 8, wardDuration: 999,
    wardDrainPerSecond: 20, maxWardManaPerSecond: 6.0,
    wardExitShield: 35, wardExitSpeedDuration: 2.5,
    wardRadius: 160, wardReduction: .25,
    blinkDistance: 160, blinkInvulnerability: .12,
    blinkRegen: 5, maxCharges: 4,
    foldCooldown: 6, foldDuration: 2.5
  });
  const SPELLS = Object.freeze({ meteor: 'meteor', ward: 'ward' });
  const UNIQUE = Object.freeze({
    weapon: Object.freeze([
      ['star_weave', '星梭织阵', 'rare'],
      ['star_fragments', '星陨碎片', 'common'],
      ['prism_split', '棱镜分光', 'rare'],
      ['chrono_bind', '时序束缚', 'rare'],
      ['eclipse_seal', '月蚀法印', 'rare'],
      ['returning_orb', '折返星轮', 'common'],
      ['void_shock', '虚界震荡', 'common'],
      ['sky_meteor', '苍穹流星', 'legendary'],
      ['singularity_chant', '奇点咏唱', 'legendary']
    ]),
    passive: Object.freeze([
      ['star_talisman', '星能护符', 'common'],
      ['ley_conduit', '灵脉导流', 'common'],
      ['weave_focus', '织界专注', 'rare'],
      ['shield_refraction', '护盾折射', 'rare'],
      ['star_mark_hunt', '星痕追猎', 'rare'],
      ['glyph_extent', '法阵延展', 'common'],
      ['danger_resonance', '险境共鸣', 'legendary'],
      ['dual_harmony', '双相调和', 'legendary']
    ]),
    dash: Object.freeze([
      ['star_gate', '星门储能', 'rare', 2],
      ['prism_veil', '折光护幕', 'rare', 2],
      ['spatial_disturb', '空间扰动', 'common', 2],
      ['phase_self_guard', '虚相护体', 'rare', 2],
      ['rift_brand', '裂相烙印', 'rare', 2],
      ['mirror_echo', '镜像残响', 'legendary', 2],
      ['anchor_rewrite', '星轨重编', 'legendary', 2]
    ])
  });
  // UI copy is owned by the character, not by the global Riftblade card DB.
  // Every upgrade has rank-specific text for the five-card picker, help panel
  // and accessibility labels; rarity/maximum levels are defined by UNIQUE.
  const CARD_COPY = Object.freeze({
    star_weave: ['◇','星梭发射自动追踪飞弹，命中后布置星锚连线切割敌潮',
      ['发射追踪星梭飞弹，命中部署星锚并连线切割敌潮',
       '星梭升级为双发追踪弹，连线伤害+25%',
       '星梭升级为3发多目标追踪弹，组成完整三角星网',
       '星梭升级为4发多目标追踪弹，延长星锚留存并扩大星网宽度',
       '终极织阵：5发多目标追踪弹群攻，每6秒触发一次范围坍缩爆发']],
    star_fragments: ['✦','标记敌群，短暂延迟后召唤定点星陨',
      ['锁定后召唤星陨碎片','提高星陨伤害与爆炸范围',
       '缩短星陨部署周期','提升星陨标记覆盖率','大范围陨落轰击']],
    prism_split: ['✧','射出可在不同敌人之间反射的棱镜能量',
      ['棱镜攻击最多反射3个目标','反射数与伤害提高',
       '折射距离提高','反射频率提升','最多7次折射，持续清理敌群']],
    chrono_bind: ['⌛','利用时序牵引锁住敌人并造成持续压制',
      ['时序束缚最多影响4个敌人','增加伤害与覆盖范围',
       '提升束缚数量','提升减速持续时间','最多牵引8个目标']],
    eclipse_seal: ['☾','在地面留下蓄能法印，一段时间后引爆',
      ['生成延迟爆破法印','法印伤害增加','扩大法印半径',
       '加快法印部署','大范围月蚀法印重创聚集目标']],
    returning_orb: ['◉','星轮先外放后回收，制造双向攻击机会',
      ['召唤往返星轮','提升外放距离','增大回收命中范围',
       '减少星轮冷却','往返双击具有更强伤害']],
    void_shock: ['➤','向敌群释放扇形虚界冲击波',
      ['释放前方扇形震荡','扩大冲击扇角','提升震荡伤害',
       '增加射程','广角超维冲击，横扫整片区域']],
    sky_meteor: ['☄','周期性呼唤多个独立的星陨落点',
      ['召唤3处星陨落点','增加落点与伤害','减少落点间隔',
       '提升落点覆盖范围','最多5处持续星陨轰炸']],
    singularity_chant: ['◎','长时间蓄力后爆发高额星能坍缩伤害',
      ['蓄力释放大范围奇点爆破','提高坍缩伤害',
       '扩大波及半径','减少施法间隔','终极奇点：大范围高伤爆破']],
    star_talisman: ['✣','增加自身星能上限，使进攻防御法术衔接更灵活',
      ['最大星能+20','最大星能+40','最大星能+60','最大星能+80','最大星能+100']],
    ley_conduit: ['≋','加快法术资源自然恢复',
      ['每秒额外恢复1.0星能','每秒额外恢复2.0星能',
       '每秒额外恢复3.0星能','每秒额外恢复4.0星能','每秒额外恢复5.0星能']],
    weave_focus: ['◈','缩短武器与两种主动术式的冷却时间',
      ['法术冷却-7%','法术冷却-14%','法术冷却-21%',
       '法术冷却-28%','法术冷却-35%']],
    shield_refraction: ['◈','承受被护盾阻挡的攻击时周期性反击',
      ['每4秒最多触发一次伤害折射','增加折射伤害',
       '强化反制伤害','更多伤害被折射','高级折光反制']],
    star_mark_hunt: ['⌖','攻击带星痕的目标可以造成更多伤害',
      ['标记目标伤害+10%','标记目标伤害+20%','标记目标伤害+30%',
       '标记目标伤害+40%','标记目标伤害+50%']],
    glyph_extent: ['◌','扩大范围法阵和魔法攻击的覆盖面积',
      ['范围+12%','范围+24%','范围+36%','范围+48%','范围+60%']],
    danger_resonance: ['⚑','低生命值时提高输出并增强自身伤害减免',
      ['低生命攻击+10%及减伤+3%','低血攻击+20%及减伤+6%',
       '低血攻击+30%及减伤+9%','低血攻击+40%及减伤+12%',
       '低血攻击+50%及减伤+15%']],
    dual_harmony: ['☯','交替使用进攻与防御法术能够获得强化',
      ['双相轮换增益+8%','双相轮换增益+16%','双相轮换增益+24%',
       '双相轮换增益+32%','双相轮换增益+40%']],
    star_gate: ['◁','提高相位闪现储能而非攻击型九连折跃',
      ['相位闪现从2段变为3段','相位闪现提升至4段']],
    prism_veil: ['◇','闪现后获得短时减伤窗口',
      ['闪现后短暂获得折光减伤','延长折光减伤持续时间']],
    spatial_disturb: ['≋','闪现落点制造短时间时序干扰',
      ['落点小范围时序减速','扩大减速作用半径']],
    phase_self_guard: ['⬡','闪现只为自己生成临时护盾，队友由连线周期提供护盾',
      ['闪现获得12点自身护盾','闪现获得20点自身护盾']],
    rift_brand: ['✧','闪现消耗少量星能，在落点激发范围法印',
      ['落点消耗15星能制造法印','提升落点法印伤害']],
    mirror_echo: ['⊙','闪现后强化下一次法术命中',
      ['闪现后下次攻击产生镜像回响','强化镜像追击效果']],
    anchor_rewrite: ['◇','移动附近已存在的星锚，不会刷新其生命时间',
      ['闪现重编附近星锚','提升可重编星锚覆盖范围']]
  });
  // Definitions are intentionally NOT merged into the live UPGRADES_DB until
  // each special weapon/passive is implemented and scoped by shipId.
  const catalog = Object.freeze(Object.values(UNIQUE).flatMap((entries, typeIndex) =>
    entries.map(([id, name, rarity, levels]) => Object.freeze({
      id, name, rarity,
      icon: CARD_COPY[id]?.[0] || '✧',
      desc: CARD_COPY[id]?.[1] || name,
      statText: Object.freeze(CARD_COPY[id]?.[2] || []),
      type: ['weapon', 'passive', 'dash'][typeIndex],
      maxLvl: levels || 5, shipId: 'astra'
    }))));

  const validPilot = pilot => pilot?.shipId === 'astra' && pilot.hp > 0 && !pilot.downed;
  const modifiers = pilot => window.NeonAstraArsenal?.modifiers(pilot) || {
    maxMana: BASE.maxMana, manaRegen: BASE.naturalRegen,
    cooldownFactor: 1, areaFactor: 1, dangerBonus: 1,
    shieldReduction: 0, harmony: 0
  };
  const within = (a, b, radius) => Boolean(a && b &&
    Math.hypot(a.x - b.x, a.y - b.y) <= radius);
  const pilots = game => game?.players?.list?.().map(item => item.state) ||
    [game?.player, game?.lanCoop?.ally].filter(Boolean);
  function createState() {
    return {
      mana: BASE.initialMana, maxMana: BASE.maxMana,
      talentLevel: 1, hitWindow: new Map(),
      hitBudgetSecond: -1, hitBudgetRemaining: BASE.maxHitRegenPerSecond,
      wardManaTimer: 0, wardManaGainedThisSec: 0,
      wardActive: false,
      cooldowns: { meteor: 0, ward: 0 },
      wardRemaining: 0, wardX: 0, wardY: 0,
      blinkCharges: 2, blinkRecharge: 0,
      warpUpgrades: {}, lastFoldAt: -Infinity,
      wardHarmonyBonus: 0,
      phaseVeilRemaining: 0, mirrorEchoPending: false,
      lastBrandAt: -Infinity, blinkFx: null
    };
  }
  function state(pilot) {
    return pilot?.shipId === 'astra' ? (pilot.astra ||= createState()) : null;
  }
  function regenOnHit(pilot, enemy, timeSeconds) {
    const s = state(pilot);
    if (!validPilot(pilot) || !enemy || !Number.isFinite(timeSeconds)) return 0;
    s.maxMana = modifiers(pilot).maxMana;
    const second = Math.floor(timeSeconds);
    if (s.hitBudgetSecond !== second) {
      s.hitBudgetSecond = second;
      s.hitBudgetRemaining = BASE.maxHitRegenPerSecond;
    }
    const last = s.hitWindow.get(enemy);
    if (last !== undefined && timeSeconds - last < BASE.hitRegenInterval) return 0;
    if (s.hitWindow.size >= 64) {
      // Bound long-run memory: discard the oldest enemy or its last hit window.
      s.hitWindow.delete(s.hitWindow.keys().next().value);
    }
    s.hitWindow.set(enemy, timeSeconds);

    let maxGain = [3, 4, 5][Math.max(0, Math.min(2, s.talentLevel - 1))];
    if (s.wardActive) {
      const budgetLeft = Math.max(0, BASE.maxWardManaPerSecond - (s.wardManaGainedThisSec || 0));
      maxGain = Math.min(maxGain, budgetLeft);
      if (maxGain <= 0) return 0;
      s.wardManaGainedThisSec = (s.wardManaGainedThisSec || 0) + maxGain;
    }

    const reward = Math.min(s.hitBudgetRemaining, maxGain, s.maxMana - s.mana);
    s.hitBudgetRemaining -= reward;
    s.mana += reward;
    return reward;
  }
  function finishWard(pilot, game, reason = 'manual') {
    const s = state(pilot);
    if (!s || !s.wardActive) return false;
    s.wardActive = false;
    s.wardRemaining = 0;
    s.wardHarmonyBonus = 0;
    s.isTurretAnchored = false;

    // 1. Emergency Astral Shield to prevent being swarmed
    pilot.astraTempShield = { value: BASE.wardExitShield, remaining: 3.5 };

    // 2. Disengagement Speed Surge (+50% speed for 2.5s)
    s.kiteSpeedTimer = BASE.wardExitSpeedDuration;

    // 3. Radial Disperse Shockwave to repel close enemies
    if (game && Array.isArray(game.enemies)) {
      for (const e of game.enemies) {
        if (!e || e.dead || e.hp <= 0) continue;
        const d = Math.hypot(e.x - pilot.x, e.y - pilot.y);
        if (d <= 150) {
          const angle = Math.atan2(e.y - pilot.y, e.x - pilot.x) || 0;
          e.x += Math.cos(angle) * 80;
          e.y += Math.sin(angle) * 80;
          e.vx = (e.vx || 0) + Math.cos(angle) * 160;
          e.vy = (e.vy || 0) + Math.sin(angle) * 160;
        }
      }
    }
    if ((game?.shockwaves?.length || 0) < 40) {
      game?.shockwaves?.push({
        x: pilot.x, y: pilot.y,
        radius: 12, maxRadius: 150,
        color: '#c084fc', alpha: 0.85
      });
    }
    window.NeonAstraVisual?.emit(pilot, 'shield', pilot, null, 70, .6);

    const m = modifiers(pilot);
    s.cooldowns.ward = BASE.wardCooldown * m.cooldownFactor;
    return true;
  }

  function tick(pilot, game, dt) {
    const s = state(pilot);
    if (!s || !validPilot(pilot) || !Number.isFinite(dt) || dt <= 0 ||
        game?.state !== 'playing') return;
    const level = pilot.level || 1;
    const m = modifiers(pilot);
    const dangerActive = (pilot.passives?.danger_resonance || 0) > 0 &&
      pilot.hp <= (pilot.maxHp || 95) * .4;
    if (dangerActive && !s.dangerVisualActive)
      window.NeonAstraVisual?.emit(pilot,'danger',pilot,null,72,.7);
    s.dangerVisualActive = dangerActive;
    s.talentLevel = level >= 12 ? 3 : level >= 6 ? 2 : 1;
    s.maxMana = m.maxMana;

    // 1-second window reset for throttled mana gain during ward
    s.wardManaTimer = (s.wardManaTimer || 0) + dt;
    if (s.wardManaTimer >= 1.0) {
      s.wardManaTimer -= 1.0;
      s.wardManaGainedThisSec = 0;
    }

    // Natural mana regen halts while ward is active!
    if (!s.wardActive) {
      s.mana = Math.min(s.maxMana, s.mana + m.manaRegen * dt);
    }

    for (const spell of Object.values(SPELLS)) {
      s.cooldowns[spell] = Math.max(0, s.cooldowns[spell] - dt);
    }

    if (s.wardActive) {
      // Mobile Sanctuary: ward follows the ship continuously!
      s.wardX = pilot.x;
      s.wardY = pilot.y;
      s.wardRemaining = 999;
      s.isTurretAnchored = true;

      // Continuous mana drain
      s.mana = Math.max(0, s.mana - dt * BASE.wardDrainPerSecond);
      if (s.mana <= 0) {
        finishWard(pilot, game, 'exhausted');
      } else {
        const wardRadius = BASE.wardRadius * m.areaFactor;
        const innerCoreRadius = wardRadius * 0.45;

        // Continuous slow and inner core repulsion for enemies
        if (Array.isArray(game?.enemies)) {
          for (const e of game.enemies) {
            if (!e || e.dead || e.hp <= 0) continue;
            const dist = Math.hypot(e.x - s.wardX, e.y - s.wardY);
            if (dist <= wardRadius) {
              e.freezeTimer = Math.max(e.freezeTimer || 0, 0.35);
              if (dist < innerCoreRadius) {
                const angle = Math.atan2(e.y - s.wardY, e.x - s.wardX) || 0;
                const pushDist = innerCoreRadius + (e.radius || 14);
                e.x = s.wardX + Math.cos(angle) * pushDist;
                e.y = s.wardY + Math.sin(angle) * pushDist;
                e.vx = (e.vx || 0) + Math.cos(angle) * 120;
                e.vy = (e.vy || 0) + Math.sin(angle) * 120;
              }
            }
          }
        }
        // Absolute Bullet Dissolve
        if (Array.isArray(game?.enemyBullets)) {
          for (let b = game.enemyBullets.length - 1; b >= 0; b--) {
            const eb = game.enemyBullets[b];
            if (Math.hypot(eb.x - s.wardX, eb.y - s.wardY) <= wardRadius) {
              game.enemyBullets.splice(b, 1);
            }
          }
        }
      }
    } else {
      s.wardRemaining = Math.max(0, (s.wardRemaining || 0) - dt);
      s.isTurretAnchored = false;
    }

    s.kiteSpeedTimer = Math.max(0, (s.kiteSpeedTimer || 0) - dt);
    s.phaseVeilRemaining = Math.max(0, s.phaseVeilRemaining - dt);
    if (s.blinkFx) {
      s.blinkFx.life -= dt;
      if (s.blinkFx.life <= 0) s.blinkFx = null;
    }
    const maxCharges = Math.min(BASE.maxCharges, 2 + (s.warpUpgrades.star_gate || 0));
    s.blinkCharges = Math.min(maxCharges, s.blinkCharges);
    if (s.blinkCharges < maxCharges) {
      s.blinkRecharge += dt;
      while (s.blinkRecharge >= BASE.blinkRegen && s.blinkCharges < maxCharges) {
        s.blinkCharges++;
        s.blinkRecharge -= BASE.blinkRegen;
      }
    } else s.blinkRecharge = 0;
  }
  function cast(pilot, game, spell) {
    if (!validPilot(pilot) || game?.state !== 'playing' ||
        !Object.values(SPELLS).includes(spell)) return false;
    const s = state(pilot);
    const m = modifiers(pilot);
    const arcane = window.NeonAstraArsenal?.state(pilot);
    const alternating = Boolean(arcane?.harmonyLast && arcane.harmonyLast !== spell);
    const harmonyBonus = alternating ? m.harmony * .08 : 0;

    if (spell === SPELLS.meteor) {
      if (s.mana < BASE.meteorCost) return false;
      const enemies = (game.enemies || []).filter(enemy => !enemy.dead && enemy.hp > 0);
      let focus = null, nearest = 650;
      for (const e of enemies) {
        const d = Math.hypot(e.x - pilot.x, e.y - pilot.y);
        if (d < nearest) { focus = e; nearest = d; }
      }
      if (!focus) {
        // If no enemy is in close range, bombard along aim direction so the spell is responsive
        const aim = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : 0;
        focus = { x: pilot.x + Math.cos(aim) * 320, y: pilot.y + Math.sin(aim) * 320, radius: 12 };
      }
      s.mana -= BASE.meteorCost;
      const targets = enemies.filter(e => within(e, focus, BASE.meteorRadius * m.areaFactor))
        .sort((a, b) => Math.hypot(a.x - focus.x, a.y - focus.y) -
          Math.hypot(b.x - focus.x, b.y - focus.y))
        .slice(0, BASE.meteorMaxTargets);
      for (const enemy of targets) {
        game.dealDamage(enemy, BASE.meteorDamage * (pilot.dmgMultiplier || 1) *
          m.dangerBonus * (1 + harmonyBonus),
          'astra_meteor', false, pilot);
        regenOnHit(pilot, enemy, game.survivalTime || 0);
        // Stun enemies hit by meteor
        enemy.stunnedUntil = Math.max(enemy.stunnedUntil || 0, (game.survivalTime || 0) + 1.2);
      }

      // Multi-hit refund & CDR mechanics
      const hitCount = targets.length;
      if (hitCount >= BASE.meteorRefundThreshold) {
        const extraHits = hitCount - (BASE.meteorRefundThreshold - 1);
        const manaRefund = Math.min(BASE.maxMeteorManaRefund, extraHits * BASE.meteorRefundPerTarget);
        s.mana = Math.min(s.maxMana, s.mana + manaRefund);

        // Reduce Ward cooldown if ward is on cooldown
        if (s.cooldowns.ward > 0) {
          const wardCdr = Math.min(BASE.maxMeteorWardCdr, extraHits * BASE.meteorWardCdrPerTarget);
          s.cooldowns.ward = Math.max(0, s.cooldowns.ward - wardCdr);
        }

        // Accelerate Blink recharge
        const maxBlink = Math.min(BASE.maxCharges, 2 + (s.warpUpgrades.star_gate || 0));
        if (s.blinkCharges < maxBlink) {
          s.blinkRecharge = (s.blinkRecharge || 0) + 0.8;
        }

        if (game?.texts && game.texts.length < 28 && hitCount >= 5) {
          game.texts.push({
            x: focus.x, y: focus.y - 20,
            text: `☄️群体轰击! +${manaRefund.toFixed(0)}星能`,
            color: '#c084fc', size: 12, life: 0.5, maxLife: 0.5
          });
        }
      }
      window.NeonAstraVisual?.emit(pilot,'burst',focus,null,
        BASE.meteorRadius * m.areaFactor,.6);
      if ((game.shockwaves?.length || 0) < 40) game.shockwaves?.push({
        x: focus.x, y: focus.y, radius: 12, maxRadius: BASE.meteorRadius,
        color: '#b38dff', alpha: .95
      });
      if (alternating && m.harmony > 0)
        window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,50,.7);
      if (arcane) arcane.harmonyLast = spell;
      s.cooldowns.meteor = 0; // 0 CD!
      return true;
    } else {
      // Celestial Ward toggle
      if (s.wardActive) {
        return finishWard(pilot, game, 'manual');
      }
      if (s.cooldowns.ward > 0 || s.mana < BASE.wardMinActivationMana) return false;
      const cost = BASE.wardCost;
      s.mana -= cost;
      s.wardActive = true;
      s.wardRemaining = 999;
      s.wardX = pilot.x;
      s.wardY = pilot.y;
      s.wardHarmonyBonus = alternating ? m.harmony * .012 : 0;
      s.wardManaGainedThisSec = 0;
      s.wardManaTimer = 0;

      // Dissolve all enemy bullets within ward radius on cast
      if (Array.isArray(game?.enemyBullets)) {
        const wardRadius = BASE.wardRadius * m.areaFactor;
        for (let b = game.enemyBullets.length - 1; b >= 0; b--) {
          const eb = game.enemyBullets[b];
          if (Math.hypot(eb.x - pilot.x, eb.y - pilot.y) <= wardRadius) {
            game.enemyBullets.splice(b, 1);
          }
        }
      }
      window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,
        BASE.wardRadius * m.areaFactor,.8);
      if (alternating && m.harmony > 0)
        window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,50,.7);
      if (arcane) arcane.harmonyLast = spell;
      return true;
    }
  }
  function wardReduction(game, target) {
    if (!target || target.hp <= 0 || target.downed) return 0;
    for (const pilot of pilots(game)) {
      if (pilot?.shipId !== 'astra' || pilot.hp <= 0 || pilot.downed ||
          !pilot.astra || pilot.astra.wardRemaining <= 0) continue;
      // This sanctuary is anchored to the CAST LOCATION; blinking away does
      // not drag protection across the map.
      if (within({ x: pilot.astra.wardX, y: pilot.astra.wardY }, target,
        BASE.wardRadius * modifiers(pilot).areaFactor)) {
        return Math.min(.5, BASE.wardReduction +
          (pilot.astra.wardHarmonyBonus || 0));
      }
    }
    return 0; // Wards do not stack with one another.
  }
  function wardDamageBonus(game, target, attacker) {
    if (!target || target.dead || target.hp <= 0) return 1.0;
    // Personal turret amplification: Astra deals +70% extra damage while positioned within Celestial Ward!
    if (attacker && attacker.shipId === 'astra') {
      const s = attacker.astra;
      if (s && s.wardRemaining > 0) {
        const radius = BASE.wardRadius * modifiers(attacker).areaFactor;
        if (within({ x: s.wardX, y: s.wardY }, attacker, radius)) {
          return 1.70;
        }
      }
      return 1.0;
    }
    // Fallback: check all active Astra pilots
    for (const pilot of pilots(game)) {
      if (pilot?.shipId !== 'astra' || pilot.hp <= 0 || pilot.downed ||
          !pilot.astra || pilot.astra.wardRemaining <= 0) continue;
      const radius = BASE.wardRadius * modifiers(pilot).areaFactor;
      if (within({ x: pilot.astra.wardX, y: pilot.astra.wardY }, pilot, radius)) {
        return 1.70;
      }
    }
    return 1.0;
  }
  // Blink shield is strictly self-only. Periodic TEAM shields are supplied
  // exclusively by the link resonance system, not by flash upgrades.
  function foldShield(pilot, game, timeSeconds) {
    const s = state(pilot);
    const tier = s?.warpUpgrades.phase_self_guard || 0;
    if (!validPilot(pilot) || tier <= 0 ||
        timeSeconds - s.lastFoldAt < BASE.foldCooldown) return 0;
    s.lastFoldAt = timeSeconds;
    const amount = tier >= 2 ? 20 : 12;
    if (!pilot.astraTempShield || pilot.astraTempShield.value < amount) {
      pilot.astraTempShield = { value: amount, remaining: BASE.foldDuration };
      window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,50,.55);
      return 1;
    }
    return 0;
  }
  function tickShields(game, dt) {
    if (game?.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    for (const pilot of pilots(game)) {
      if (!pilot?.astraTempShield) continue;
      pilot.astraTempShield.remaining -= dt;
      if (pilot.astraTempShield.remaining <= 0 || pilot.astraTempShield.value <= 0) {
        pilot.astraTempShield = null;
      }
    }
  }
  function incomingDamage(game, target, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    let remaining = amount * (1 - Math.min(.6, wardReduction(game, target) +
      (target?.shipId === 'astra' ? modifiers(target).shieldReduction : 0) +
      (target?.astra?.phaseVeilRemaining > 0
        ? .1 + (target?.dashUpgrades?.prism_veil || 0) * .08 : 0)));
    const shield = target?.astraTempShield;
    if (shield?.remaining > 0 && shield.value > 0) {
      const absorbed = Math.min(shield.value, remaining);
      shield.value -= absorbed;
      remaining -= absorbed;
      if (shield.value <= 0) target.astraTempShield = null;
    }
    if (amount - remaining > 0 && target?.shipId === 'astra') {
      window.NeonAstraArsenal?.reflect(game, target, amount - remaining);
    }
    return remaining;
  }
  function blink(pilot, game, direction, timeSeconds) {
    if (!validPilot(pilot) || game?.state !== 'playing' ||
        !Number.isFinite(timeSeconds)) return false;
    const s = state(pilot);
    if (s.wardActive) return false; // 炮台重装定锚中能量锁闭，禁止闪现！
    if (s.blinkCharges < 1) return false;
    const dx = Number(direction?.x), dy = Number(direction?.y);
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length <= 0) return false;
    const fromX = pilot.x, fromY = pilot.y;
    s.blinkCharges--;
    pilot.x += dx / length * BASE.blinkDistance;
    pilot.y += dy / length * BASE.blinkDistance;
    // Fixed-size transient effect state; renderer has no allocations or damage
    // responsibilities, and the FX expires on simulated time (not wall time).
    s.blinkFx = { x1: fromX, y1: fromY, x2: pilot.x, y2: pilot.y,
      life: .32, maxLife: .32 };
    if ((game.shockwaves?.length || 0) < 36) {
      game.shockwaves.push({ x: pilot.x, y: pilot.y,
        radius: 8, maxRadius: 65, alpha: .8, color: '#b38dff' });
    }
    pilot.invulnTimer = Math.max(pilot.invulnTimer || 0, BASE.blinkInvulnerability);
    s.kiteSpeedTimer = 2.0;
    foldShield(pilot, game, timeSeconds);
    window.NeonAstraArsenal?.onBlink(pilot, game, timeSeconds);
    return true;
  }
  function renderWard(ctx, pilot) {
    const s = pilot?.astra;
    if (!s || s.wardRemaining <= 0 || !ctx) return;
    const radius = BASE.wardRadius * modifiers(pilot).areaFactor;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    ctx.save();
    ctx.translate(s.wardX, s.wardY);

    // 1. Translucent Cosmic Nebula Dome
    const pulse = Math.sin(timeSec * 3) * 0.03;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(155, 111, 239, ${0.11 + pulse})`;
    ctx.fill();

    // 2. Outer Radiant Runic Barrier Ring
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Rotating Celestial Dial Tick Marks (12 outer astronomical notches)
    const dialAngle = timeSec * 0.35;
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#e9d5ff';
    for (let i = 0; i < 12; i++) {
      const a = dialAngle + (i * Math.PI / 6);
      const isMajor = i % 3 === 0;
      const len = isMajor ? 8 : 4;
      const x1 = Math.cos(a) * (radius - len);
      const y1 = Math.sin(a) * (radius - len);
      const x2 = Math.cos(a) * (radius + (isMajor ? 3 : 0));
      const y2 = Math.sin(a) * (radius + (isMajor ? 3 : 0));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 4. Inner Counter-Rotating Hexagonal Sacred Geometry Ring
    ctx.save();
    ctx.rotate(-dialAngle * 0.8);
    const innerR = radius * 0.65;
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI / 3);
      const hx = Math.cos(a) * innerR;
      const hy = Math.sin(a) * innerR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();

    // Hexagonal node crystal stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI / 3);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * innerR, Math.sin(a) * innerR, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4.5. Inner Core Sanctuary (Repulsion Barrier & Bulletproof Core)
    const coreR = radius * 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(216, 180, 254, ${0.16 + Math.sin(timeSec * 5) * 0.05})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(233, 213, 255, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Ambient Stardust Motes floating within ward boundary
    ctx.fillStyle = 'rgba(245, 243, 255, 0.7)';
    for (let i = 0; i < 4; i++) {
      const moteAngle = timeSec * (0.6 + i * 0.2) + i * 1.57;
      const moteDist = radius * (0.25 + (i * 0.18));
      ctx.beginPath();
      ctx.arc(Math.cos(moteAngle) * moteDist, Math.sin(moteAngle) * moteDist, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  window.NeonAstra = Object.freeze({
    BASE, SPELLS, catalog, createState, state, regenOnHit,
    tick, cast, finishWard, wardReduction, wardDamageBonus, foldShield, tickShields, incomingDamage, blink, renderWard
  });
})();

// Source: ships/astra/weapons.js
/* ASTRA signature weapon: anchored spell links, independent of old drones.
 * The host alone calls tick(). Client rendering consumes bounded anchor state.
 * This module is safe to load while ASTRA is locked for live selection.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_TARGETS = 8;
  const FIRE_RANGE = 650;
  const LINK_INTERVAL = .5;
  const BURST_COOLDOWN = 6;
  const MAX_MISSILES = 24;

  function createState() {
    return { anchors: [], missiles: [], fireElapsed: 0, linkElapsed: 0,
      nextBurstAt: 0, serial: 0 };
  }
  function state(pilot) {
    if (!pilot || pilot.shipId !== 'astra') return null;
    return pilot.starWeave ||= createState();
  }
  function closest(enemies, pilot) {
    let best = null;
    let bestSquare = FIRE_RANGE * FIRE_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestSquare) { best = e; bestSquare = d2; }
    }
    return best;
  }
  function findTargets(enemies, pilot, count = 1) {
    const list = [];
    const maxSq = FIRE_RANGE * FIRE_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= maxSq) list.push({ e, d2 });
    }
    list.sort((a, b) => a.d2 - b.d2);
    return list.slice(0, count).map(item => item.e);
  }
  function segmentDistanceSq(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 1) return Infinity;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1);
    const ex = x - a.x - t * dx, ey = y - a.y - t * dy;
    return ex * ex + ey * ey;
  }
  function linkedPairs(anchors) {
    const pairs = [];
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        pairs.push([anchors[i], anchors[j]]);
        if (pairs.length >= 3) return pairs;
      }
    }
    return pairs;
  }
  function applyDamage(game, pilot, enemy, amount, source, energy = false) {
    game.dealDamage(enemy, amount * (pilot.dmgMultiplier || 1), source, false, pilot);
    if (energy) window.NeonAstra?.regenOnHit(pilot, enemy, game.survivalTime || 0);
  }
  function tick(pilot, game, dt) {
    const level = clamp(Math.floor(pilot?.weapons?.star_weave || 0), 0, 5);
    if (pilot?.shipId !== 'astra' || level < 1 || pilot.hp <= 0 ||
        pilot.downed || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return;
    const s = state(pilot);
    const enemies = game.enemies || [];
    for (let i = s.anchors.length - 1; i >= 0; i--) {
      s.anchors[i].life -= dt;
      if (s.anchors[i].life <= 0) s.anchors.splice(i, 1);
    }
    const interval = Math.max(.28, (level >= 2 ? .52 : .65) *
      (pilot.cdrMultiplier || 1));
    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);
      // Homing projectiles count scales with level:
      // Lv1: 1 homing missile (single target tracking)
      // Lv2: 2 homing missiles (can track 2 distinct targets)
      // Lv3: 3 homing missiles (multi-target swarm)
      // Lv4: 4 homing missiles (high barrage density)
      // Lv5: 5 homing missiles (barrage cluster swarm)
      const missileCount = Math.min(5, Math.max(1, level));
      const targets = findTargets(enemies, pilot, missileCount);
      if (targets.length > 0) {
        s.missiles ||= [];
        const baseAngle = Number.isFinite(pilot.aimAngle) ? pilot.aimAngle : 0;
        for (let i = 0; i < missileCount; i++) {
          if (s.missiles.length >= MAX_MISSILES) s.missiles.shift();
          const target = targets[i % targets.length];
          const spread = missileCount > 1 ? (i - (missileCount - 1) / 2) * 0.35 : 0;
          const launchAngle = baseAngle + spread;
          const launchSpeed = 480;
          s.missiles.push({
            x: pilot.x,
            y: pilot.y,
            vx: Math.cos(launchAngle) * launchSpeed,
            vy: Math.sin(launchAngle) * launchSpeed,
            target,
            damage: 28,
            life: 2.2,
            deployAnchor: i === 0 || i >= missileCount - 1,
            trail: [{ x: pilot.x, y: pilot.y }]
          });
        }
      }
    }

    // Update active homing missiles with sub-stepping for smooth physics & collision accuracy
    if (s.missiles?.length) {
      let remainingDt = dt;
      const step = Math.min(0.032, dt);
      while (remainingDt > 0) {
        const subDt = Math.min(step, remainingDt);
        remainingDt -= subDt;

        for (let i = s.missiles.length - 1; i >= 0; i--) {
          const m = s.missiles[i];
          m.life -= subDt;
          if (m.life <= 0) {
            s.missiles.splice(i, 1);
            continue;
          }

          // Target retargeting if current target died
          if (!m.target || m.target.dead || m.target.hp <= 0) {
            m.target = closest(enemies, m);
          }

          if (m.target && !m.target.dead && m.target.hp > 0) {
            const dx = m.target.x - m.x;
            const dy = m.target.y - m.y;
            const dist = Math.hypot(dx, dy);
            const speed = Math.hypot(m.vx, m.vy);
            const hitR = (m.target.radius || 12) + 16;

            if (dist <= hitR || dist <= speed * subDt) {
              // Impact hit
              applyDamage(game, pilot, m.target, m.damage, 'astra_weave_bolt', true);
              if ((pilot.passives?.star_mark_hunt || 0) > 0) {
                window.NeonAstraArsenal?.markEnemy(pilot, m.target, (game.survivalTime || 0) + 3);
              }

              // Deploy anchor on impact point
              if (m.deployAnchor) {
                const angle = s.serial++ * 2.3999632;
                const newAnchor = {
                  x: m.target.x + Math.cos(angle) * 25,
                  y: m.target.y + Math.sin(angle) * 25,
                  life: level >= 4 ? 5 : 4
                };
                const maxAnchors = level >= 3 ? 3 : 2;
                if (s.anchors.length >= maxAnchors) s.anchors.shift();
                s.anchors.push(newAnchor);
              }

              s.missiles.splice(i, 1);
              continue;
            }

            // Homing curve towards target
            const maxSpeed = 740;
            const targetVx = (dx / dist) * maxSpeed;
            const targetVy = (dy / dist) * maxSpeed;
            const steer = Math.min(1, 15 * subDt);
            m.vx += (targetVx - m.vx) * steer;
            m.vy += (targetVy - m.vy) * steer;
          }

          m.x += m.vx * subDt;
          m.y += m.vy * subDt;

          m.trail ||= [];
          m.trail.unshift({ x: m.x, y: m.y });
          if (m.trail.length > 7) m.trail.pop();
        }
      }
    }
    s.linkElapsed += dt;
    if (s.linkElapsed >= LINK_INTERVAL) {
      s.linkElapsed %= LINK_INTERVAL;
      const pairs = linkedPairs(s.anchors);
      const width = level >= 4 ? 16 : 11;
      const damage = 8 * (level >= 2 ? 1.25 : 1);
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0) continue;
        const range = width + (enemy.radius || 12);
        if (!pairs.some(([a, b]) => segmentDistanceSq(enemy.x, enemy.y, a, b) <= range * range)) {
          continue;
        }
        applyDamage(game, pilot, enemy, damage, 'astra_weave_link', true);
        if (++count >= MAX_TARGETS) break;
      }
    }
    // A complete 3-node network triggers a bounded blast no more than once
    // every 6 seconds. Burst damage cannot grant mana or trigger itself.
    const now = game.survivalTime || 0;
    if (level >= 5 && s.anchors.length === 3 && now >= s.nextBurstAt) {
      s.nextBurstAt = now + BURST_COOLDOWN;
      const center = s.anchors.reduce((p, a) =>
        ({ x: p.x + a.x / 3, y: p.y + a.y / 3 }), { x: 0, y: 0 });
      let count = 0;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || enemy.hp <= 0 ||
            Math.hypot(enemy.x - center.x, enemy.y - center.y) > 108 + (enemy.radius || 12)) continue;
        applyDamage(game, pilot, enemy, 110, 'astra_weave_burst', false);
        if (++count >= 12) break;
      }
      if ((game.shockwaves?.length || 0) < 35) game.shockwaves?.push({
        x: center.x, y: center.y, radius: 16, maxRadius: 108,
        color: '#c18cff', alpha: .85
      });
    }
  }
  function render(ctx, pilot) {
    const s = pilot?.starWeave;
    if (!s?.anchors?.length || !ctx) return;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;
    const pairs = linkedPairs(s.anchors);

    ctx.save();

    // 1. Constellation Enclosed Nebula Field (when 3 nodes form a celestial triangle)
    if (s.anchors.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(s.anchors[0].x, s.anchors[0].y);
      ctx.lineTo(s.anchors[1].x, s.anchors[1].y);
      ctx.lineTo(s.anchors[2].x, s.anchors[2].y);
      ctx.closePath();
      const triAlpha = 0.08 + Math.sin(timeSec * 4) * 0.04;
      ctx.fillStyle = `rgba(168, 85, 247, ${triAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(192, 132, 252, ${triAlpha * 2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Multi-tier Celestial Resonance Beams
    for (const [a, b] of pairs) {
      // Outer ethereal glow
      ctx.strokeStyle = 'rgba(167, 120, 255, 0.4)';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Core concentrated starlight laser beam
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Travelling starlight energy packets along the beam
      const travel = (timeSec * 1.5) % 1;
      const px = a.x + (b.x - a.x) * travel;
      const py = a.y + (b.y - a.y) * travel;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Four-point Celestial Star Crystal Anchor Nodes
    for (const anchor of s.anchors) {
      ctx.save();
      ctx.translate(anchor.x, anchor.y);
      const nodePulse = Math.sin(timeSec * 6 + anchor.x) * 1.5;
      const rot = timeSec * 1.8;

      // Pulsing aura ring
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#c084fc';
      ctx.beginPath();
      ctx.arc(0, 0, 9 + nodePulse, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating four-pointed starlight crystal
      ctx.rotate(rot);
      ctx.fillStyle = '#f3e8ff';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#d8b4fe';
      ctx.beginPath();
      ctx.moveTo(0, -7.5);
      ctx.lineTo(2.2, -2.2);
      ctx.lineTo(7.5, 0);
      ctx.lineTo(2.2, 2.2);
      ctx.lineTo(0, 7.5);
      ctx.lineTo(-2.2, 2.2);
      ctx.lineTo(-7.5, 0);
      ctx.lineTo(-2.2, -2.2);
      ctx.closePath();
      ctx.fill();

      // Brilliant core center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. Homing Starlight Needles / Missiles (Astral Tracking Darts)
    if (s.missiles?.length) {
      for (const m of s.missiles) {
        ctx.save();

        // Starlight trail ribbon
        if (m.trail?.length > 1) {
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
          ctx.lineWidth = 3.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#c084fc';
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let i = 1; i < m.trail.length; i++) {
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
          }
          ctx.stroke();

          // Inner white starlight filament
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let i = 1; i < m.trail.length; i++) {
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
          }
          ctx.stroke();
        }

        // Missile arrowhead
        ctx.translate(m.x, m.y);
        const heading = Math.atan2(m.vy, m.vx);
        ctx.rotate(heading);

        // Radiant core glow
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Astral needle point
        ctx.fillStyle = '#f3e8ff';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-4, -2.8);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 2.8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.restore();
  }
  window.NeonAstraWeave = Object.freeze({
    MAX_TARGETS, LINK_INTERVAL, BURST_COOLDOWN,
    createState, state, closest, segmentDistanceSq, linkedPairs, tick, render
  });
})();

// Source: ships/astra/upgrades.js
/* ASTRA / 星织: independent, capped spell arsenal and passive modifiers.
 * Each attack is executed only in the authoritative combat world. Draw/render
 * and UI state may consume snapshots without re-running hit detection.
 */
(() => {
  'use strict';
  const WEAPONS = Object.freeze({
    star_fragments: { period: 2.4, min: 1.35 },
    prism_split: { period: 2.2, min: 1.1 },
    chrono_bind: { period: 3.0, min: 1.65 },
    eclipse_seal: { period: 4.4, min: 2.5 },
    returning_orb: { period: 2.6, min: 1.5 },
    void_shock: { period: 3.1, min: 1.7 },
    sky_meteor: { period: 6.7, min: 4.1 },
    singularity_chant: { period: 7.8, min: 4.7 }
  });
  const MAX_EVENTS = 16;
  const MAX_TARGETS = 16;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rank = (p, id) => clamp(Math.floor(p?.passives?.[id] || 0), 0, 5);
  const weaponRank = (p, id) => clamp(Math.floor(p?.weapons?.[id] || 0), 0, 5);
  const safe = p => p?.shipId === 'astra' && p.hp > 0 && !p.downed;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const active = enemy => enemy && !enemy.dead && enemy.hp > 0;
  const fx = (pilot,kind,from,to,radius,life) =>
    window.NeonAstraVisual?.emit(pilot,kind,from,to,radius,life);

  function modifiers(pilot) {
    const talisman = rank(pilot, 'star_talisman');
    const conduit = rank(pilot, 'ley_conduit');
    const focus = rank(pilot, 'weave_focus');
    const mark = rank(pilot, 'star_mark_hunt');
    const extent = rank(pilot, 'glyph_extent');
    const danger = rank(pilot, 'danger_resonance');
    const low = pilot?.hp <= (pilot?.maxHp || 95) * .4;
    return {
      maxMana: 100 + talisman * 20,
      manaRegen: 2 + conduit * 1.0,
      cooldownFactor: clamp(1 - focus * .07, .65, 1),
      areaFactor: 1 + extent * .12,
      markBonus: 1 + mark * .10,
      dangerBonus: low ? 1 + danger * .10 : 1,
      shieldReduction: low ? danger * .03 : 0,
      refraction: rank(pilot, 'shield_refraction'),
      harmony: rank(pilot, 'dual_harmony')
    };
  }

  function state(pilot) {
    if (!pilot || pilot.shipId !== 'astra') return null;
    return pilot.astraArsenal ||= {
      timers: {}, pending: [], marks: new Map(),
      harmonyLast: '', harmonyAttack: 0, harmonyWard: 0,
      lastRefractionAt: -Infinity
    };
  }
  function targets(game, pilot, max = 70) {
    const result = [];
    for (const e of game.enemies || []) {
      if (active(e) && distance(e, pilot) < 950) result.push(e);
      if (result.length >= max) break;
    }
    return result;
  }
  function nearest(enemies, point, range = 800, exclude = null) {
    let chosen = null, closest = range;
    for (const e of enemies) {
      if (e === exclude || !active(e)) continue;
      const d = distance(e, point);
      if (d < closest) { chosen = e; closest = d; }
    }
    return chosen;
  }
  function markEnemy(pilot, enemy, until) {
    if (!safe(pilot) || !active(enemy)) return;
    const s = state(pilot);
    if (s.marks.size >= 48 && !s.marks.has(enemy)) {
      s.marks.delete(s.marks.keys().next().value);
    }
    s.marks.set(enemy, until);
    fx(pilot,'mark',enemy,null,24,.32);
  }
  function hit(pilot, game, enemy, base, source, mana = true) {
    if (!active(enemy) || !safe(pilot)) return false;
    const s = state(pilot);
    const m = modifiers(pilot);
    const bonus = (s.marks.get(enemy) || 0) > (game.survivalTime || 0)
      ? m.markBonus : 1;
    const echo = s.mirrorEchoPending
      ? 1 + Math.min(2, pilot.dashUpgrades?.mirror_echo || 1) * .15 : 1;
    if (s.mirrorEchoPending) s.mirrorEchoPending = false;
    const damage = base * (pilot.dmgMultiplier || 1) * m.dangerBonus * bonus * echo;
    if (echo > 1) fx(pilot,'echo',pilot,enemy,38,.32);
    game.dealDamage(enemy, damage, source, false, pilot);
    if (mana) window.NeonAstra?.regenOnHit(pilot, enemy, game.survivalTime || 0);
    return true;
  }
  function pulse(pilot, game, enemies, origin, radius, amount, source, limit = 8) {
    let count = 0;
    for (const e of enemies) {
      if (!active(e) || distance(e, origin) > radius + (e.radius || 12)) continue;
      hit(pilot, game, e, amount, source);
      if (++count >= Math.min(MAX_TARGETS, limit)) break;
    }
    return count;
  }
  function schedule(pilot, item) {
    const s = state(pilot);
    if (s.pending.length >= MAX_EVENTS) s.pending.shift();
    s.pending.push(item);
  }

  function fire(pilot, game, id, level, list) {
    const s = state(pilot);
    const mods = modifiers(pilot);
    const focus = nearest(list, pilot);
    if (!focus) return false;
    const radius = mods.areaFactor;
    const now = game.survivalTime || 0;
    switch (id) {
      case 'star_fragments': // Delayed skyfall locks the enemy's old position.
        markEnemy(pilot, focus, now + 3);
        fx(pilot,'telegraph',focus,null,(60+level*10)*radius,.5);
        schedule(pilot, { kind: 'burst', delay: .5,
          x: focus.x, y: focus.y, radius: (60 + level * 10) * radius,
          damage: 38 + level * 18, source: 'astra_fragments', targets: 10 });
        break;
      case 'prism_split': { // Limited, non-recursive chaining between targets.
        let e = focus;
        const seen = new Set();
        for (let i = 0; i < Math.min(8, 2 + level); i++) {
          if (!e || seen.has(e)) break;
          seen.add(e);
          hit(pilot, game, e, 32 + level * 13, 'astra_prism');
          const next = nearest(list.filter(other => !seen.has(other)), e, 150 + level * 12);
          fx(pilot,'chain',seen.size===1?pilot:e,next||e,55,.3);
          e=next;
        }
        break;
      }
      fx(pilot,'burst',pilot,null,radius,.28);
      case 'chrono_bind': { // Slow several linked enemies, bosses less.
        let n = 0;
        for (const e of list) {
          if (distance(e, focus) > (115 + level * 10) * radius) continue;
          hit(pilot, game, e, 22 + level * 9, 'astra_chrono');
          e.freezeTimer = Math.max(e.freezeTimer || 0, e.isBoss ? .18 : .45 + level * .12);
          fx(pilot,'shield',e,null,32,.42);
          if (++n >= 3 + level) break;
        }
        break;
      }
      case 'eclipse_seal': // Visible delayed seal; high positional payout.
        fx(pilot,'telegraph',focus,null,(100+level*10)*radius,1);
        schedule(pilot, { kind: 'burst', delay: 1,
          x: focus.x, y: focus.y, radius: (100 + level * 10) * radius,
          damage: 60 + level * 25, source: 'astra_eclipse', targets: 12 });
        break;
      case 'returning_orb': { // Distinct outgoing and returning lanes.
        const dx = focus.x - pilot.x, dy = focus.y - pilot.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const x = pilot.x + dx / d * Math.min(d, 260 + level * 16);
        const y = pilot.y + dy / d * Math.min(d, 260 + level * 16);
        schedule(pilot, { kind: 'orb', delay: .25, x, y,
          radius: (34 + level * 5) * radius,
          damage: 24 + level * 12, source: 'astra_orb_out', targets: 8 });
        schedule(pilot, { kind: 'orb', delay: .75, x: pilot.x, y: pilot.y,
          radius: (70 + level * 8) * radius,
          damage: 30 + level * 14, source: 'astra_orb_return', targets: 8 });
        fx(pilot,'orb',pilot,{x,y},40,.45);
        break;
      }
      case 'void_shock': { // A directional cone, not a generic radius blast.
        const angle = Math.atan2(focus.y - pilot.y, focus.x - pilot.x);
        fx(pilot,'beam',pilot,focus,70,.28);
        let n = 0;
        for (const e of list) {
          if (distance(e, pilot) > (250 + level * 16) * radius) continue;
          const delta = Math.atan2(Math.sin(Math.atan2(e.y - pilot.y, e.x - pilot.x) - angle),
            Math.cos(Math.atan2(e.y - pilot.y, e.x - pilot.x) - angle));
          if (Math.abs(delta) > .48 + level * .035) continue;
          hit(pilot, game, e, 35 + level * 16, 'astra_shock');
          if (++n >= 6 + level) break;
        }
        break;
      }
      case 'sky_meteor': // Separate, staggered impact zones.
        for (let i = 0; i < Math.min(5, 2 + level); i++) {
          const a = i * 2.3999632 + now * .15;
          schedule(pilot, { kind: 'burst', delay: .4 + .3 * i,
            x: focus.x + Math.cos(a) * 72, y: focus.y + Math.sin(a) * 72,
            radius: (70 + level * 6) * radius,
            damage: 52 + level * 18, source: 'astra_skyfall', targets: 9 });
          fx(pilot,'telegraph',{
            x:focus.x+Math.cos(a)*72,y:focus.y+Math.sin(a)*72
          },null,(70+level*6)*radius,.4+.3*i);
        }
        break;
      case 'singularity_chant': // Long charge & one heavily capped detonation.
        fx(pilot,'telegraph',focus,null,(135+level*12)*radius,1.4);
        schedule(pilot, { kind: 'burst', delay: 1.4,
          x: focus.x, y: focus.y, radius: (135 + level * 12) * radius,
          damage: 110 + level * 38, source: 'astra_singularity', targets: 16 });
        break;
      default: return false;
    }
    return true;
  }
  function tick(pilot, game, dt) {
    if (!safe(pilot) || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return 0;
    const s = state(pilot);
    const mods = modifiers(pilot);
    const list = targets(game, pilot);
    let fired = 0;
    for (const [id, rule] of Object.entries(WEAPONS)) {
      const level = weaponRank(pilot, id);
      if (!level) continue;
      const interval = Math.max(rule.min, rule.period * (1 - (level - 1) * .09) *
        (pilot.cdrMultiplier || 1) * mods.cooldownFactor);
      s.timers[id] = Math.min(interval, (s.timers[id] || 0) + dt);
      if (s.timers[id] < interval) continue;
      if (fire(pilot, game, id, level, list)) {
        s.timers[id] = 0;
        fired++;
      }
    }
    // Resolve queued delayed events after the weapon loop. A long stalled
    // frame never spawns an unbounded cascade and no event self-schedules.
    for (let i = s.pending.length - 1; i >= 0; i--) {
      const event = s.pending[i];
      event.delay -= dt;
      if (event.delay > 0) continue;
      s.pending.splice(i, 1);
      pulse(pilot, game, list, event, event.radius, event.damage,
        event.source, event.targets);
      fx(pilot,'burst',event,null,event.radius,.44);
      if ((game.shockwaves?.length || 0) < 35) game.shockwaves?.push({
        x: event.x, y: event.y, radius: 8, maxRadius: event.radius,
        color: '#b89bff', alpha: .7
      });
    }
    for (const [enemy, expires] of s.marks) {
      if (!active(enemy) || expires <= (game.survivalTime || 0)) s.marks.delete(enemy);
    }
    return fired;
  }

  function reflect(game, pilot, absorbed) {
    const s = state(pilot);
    const strength = modifiers(pilot).refraction;
    const now = game?.survivalTime || 0;
    if (!safe(pilot) || !strength || !(absorbed > 0) ||
        now - s.lastRefractionAt < 4 || game?.state !== 'playing') return false;
    const e = nearest(targets(game, pilot, 50), pilot, 200);
    if (!e) return false;
    s.lastRefractionAt = now;
    hit(pilot, game, e, Math.min(90, absorbed * .18 + strength * 9),
      'astra_refraction', false);
    fx(pilot,'beam',pilot,e,35,.3);
    return true;
  }

  function onBlink(pilot, game, now) {
    if (!safe(pilot) || game?.state !== 'playing') return false;
    const s = state(pilot);
    const up = pilot.dashUpgrades || {};
    const spell = window.NeonAstra?.state(pilot);
    if (up.prism_veil && spell) {
      spell.phaseVeilRemaining = Math.max(spell.phaseVeilRemaining || 0,
        1 + Math.min(2, up.prism_veil) * .6);
      fx(pilot,'shield',pilot,null,52,.45);
    }
    if (up.spatial_disturb) {
      const radius = 100 + Math.min(2, up.spatial_disturb) * 25;
      let n = 0;
      for (const e of targets(game, pilot)) {
        if (distance(e, pilot) > radius) continue;
        e.freezeTimer = Math.max(e.freezeTimer || 0, e.isBoss ? .15 : .55);
        if (++n >= 12) break;
      }
    }
    if (up.rift_brand && spell && spell.mana >= 15 &&
        now - (spell.lastBrandAt || -Infinity) >= 4) {
      spell.lastBrandAt = now;
      spell.mana -= 15;
      pulse(pilot, game, targets(game, pilot), pilot, 135,
        45 + Math.min(up.rift_brand, 2) * 28, 'astra_rift_brand', 8);
      fx(pilot,'burst',pilot,null,135,.38);
    }
    if (up.mirror_echo) {
      s.mirrorEchoPending = true;
      fx(pilot,'mark',pilot,null,34,.45);
    }
    if (up.anchor_rewrite && pilot.starWeave?.anchors?.length) {
      let nearestAnchor = null;
      let minDistance = 180 + Math.min(2, up.anchor_rewrite) * 30;
      for (const anchor of pilot.starWeave.anchors) {
        const d = distance(pilot, anchor);
        if (d < minDistance) { minDistance = d; nearestAnchor = anchor; }
      }
      if (nearestAnchor) {
        fx(pilot,'beam',nearestAnchor,pilot,24,.3);
        nearestAnchor.x = pilot.x;
        nearestAnchor.y = pilot.y;
        // Preserve remaining lifetime, so phase spam cannot extend star nets.
      }
    }
    return true;
  }

  function upgrade(pilot, card) {
    if (!safe(pilot) || !card || card.shipId !== 'astra') return false;
    const catalog = window.NeonAstra?.catalog || [];
    const def = catalog.find(item => item.id === card.id);
    if (!def || def.type !== card.type) return false;
    const bag = def.type === 'weapon' ? (pilot.weapons ||= {}) :
      def.type === 'passive' ? (pilot.passives ||= {}) : (pilot.dashUpgrades ||= {});
    const old = bag[card.id] || 0;
    if (old >= def.maxLvl) return false;
    bag[card.id] = old + 1;
    if (def.type === 'dash') {
      const astra = window.NeonAstra?.state(pilot);
      if (astra) astra.warpUpgrades[card.id] = bag[card.id];
    }
    if (card.id === 'star_talisman') {
      const astra = window.NeonAstra?.state(pilot);
      if (astra) astra.maxMana = modifiers(pilot).maxMana;
    }
    return true;
  }

  // All 24 distinct cards share the same authoritative ship hook.
  if (window.NeonShips?.registerUpgradeCatalog && window.NeonAstra?.catalog) {
    window.NeonShips.registerUpgradeCatalog('astra', window.NeonAstra.catalog);
    window.NeonShips.registerAbilities('astra', {
      onStart(pilot) { state(pilot); window.NeonAstra?.state(pilot); },
      onTick(pilot, game, dt) {
        window.NeonAstraVisual?.tick(pilot,dt);
        window.NeonAstra?.tick(pilot, game, dt);
        window.NeonAstraWeave?.tick(pilot, game, dt);
        tick(pilot, game, dt);
      },
      onAction(pilot, game, action) {
        if (action === 'meteor' || action === 'ward') return window.NeonAstra?.cast(pilot, game, action);
        if (action?.kind === 'warp' || action?.kind === 'blink') return window.NeonAstra?.blink(pilot, game,
          action.direction, game.survivalTime || 0);
        return false;
      },
      onUpgrade(pilot, game, card) { return upgrade(pilot, card); }
    });
  }
  window.NeonAstraArsenal = Object.freeze({
    WEAPONS, MAX_EVENTS, MAX_TARGETS, state, modifiers, upgrade, tick,
    fire, hit, pulse, markEnemy, reflect, onBlink
  });
})();

// Source: ships/astra/effects.js
/* Visual-only, bounded event timeline. Combat runs on the authoritative host;
 * clients draw copies of these lightweight primitives from room snapshots. */
const NeonAstraVisual = (() => {
  const MAX_FX = 24;
  function emit(pilot, kind, a, b = null, radius = 45, duration = .35) {
    if (!pilot || !a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
    const fx = pilot.astraVisual ||= [];
    if (fx.length >= MAX_FX) fx.shift();
    fx.push({kind, x:a.x, y:a.y,
      x2:Number.isFinite(b?.x)?b.x:a.x,
      y2:Number.isFinite(b?.y)?b.y:a.y,
      radius:Math.min(280,Math.max(8,radius)),
      life:duration,maxLife:duration});
  }
  function tick(pilot,dt) {
    if (!Number.isFinite(dt)||dt<=0) return;
    const fx=pilot?.astraVisual||[];
    for(let i=fx.length-1;i>=0;i--) {
      fx[i].life-=dt;
      if(fx[i].life<=0)fx.splice(i,1);
    }
  }
  function draw(ctx,entries) {
    if(!ctx||!Array.isArray(entries))return;
    ctx.save();ctx.lineCap='round';
    for(const f of entries.slice(0,MAX_FX)) {
      if(!f||!(f.life>0)||!Number.isFinite(f.x)||!Number.isFinite(f.y))continue;
      const alpha=Math.min(1,f.life/Math.max(.01,f.maxLife||.35));
      const radius=Math.min(280,Math.max(8,f.radius||45));
      ctx.globalAlpha=.8*alpha;
      ctx.strokeStyle=f.kind==='danger'?'#ff668d':f.kind==='shield'?'#85f5ff':'#bb8aff';
      ctx.fillStyle=f.kind==='danger'?'#ff668d':'#d9a6ff';
      ctx.shadowBlur=8;ctx.shadowColor=ctx.strokeStyle;
      if(['beam','chain','bolt','orb','echo'].includes(f.kind)) {
        ctx.lineWidth=f.kind==='beam'?9:4;
        ctx.beginPath();ctx.moveTo(f.x,f.y);
        ctx.lineTo(f.x2,f.y2);ctx.stroke();
        ctx.beginPath();ctx.arc(f.x2,f.y2,Math.min(14,radius*.18),0,Math.PI*2);ctx.fill();
      } else {
        ctx.lineWidth=f.kind==='shield'?4:3;
        ctx.beginPath();ctx.arc(f.x,f.y,
          f.kind==='telegraph'?radius:radius*(1-.7*alpha),0,Math.PI*2);ctx.stroke();
        if(f.kind==='burst') {
          ctx.globalAlpha=.16*alpha;
          ctx.beginPath();ctx.arc(f.x,f.y,radius*(1-.7*alpha),0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  return Object.freeze({emit,tick,draw,MAX_FX});
})();
window.NeonAstraVisual=NeonAstraVisual;
function drawAstraBlink(ctx, fx) {
  if (!fx || !ctx || !(fx.life > 0)) return;
  const fade = Math.min(1, fx.life / Math.max(.01, fx.maxLife || .32));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';

  // 1. Wide ethereal astral fracture beam
  ctx.strokeStyle = 'rgba(167, 131, 255, 0.4)';
  ctx.lineWidth = 22 * fade + 4;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(fx.x1, fx.y1);
  ctx.lineTo(fx.x2, fx.y2);
  ctx.stroke();

  // 2. High-intensity prismatic core beam
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 * fade + 1;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(fx.x1, fx.y1);
  ctx.lineTo(fx.x2, fx.y2);
  ctx.stroke();

  // 3. Dimensional gateway ripple rings at origin and destination
  for (const [x, y] of [[fx.x1, fx.y1], [fx.x2, fx.y2]]) {
    const ringRadius = 12 + 28 * (1 - fade);
    ctx.strokeStyle = '#d8b4fe';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Destination starburst diamond flare
  const flareSize = 14 * fade;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(fx.x2, fx.y2 - flareSize);
  ctx.lineTo(fx.x2 + flareSize * 0.35, fx.y2);
  ctx.lineTo(fx.x2, fx.y2 + flareSize);
  ctx.lineTo(fx.x2 - flareSize * 0.35, fx.y2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
window.NeonShips.registerEffects('astra', {
  pilot(ctx, pilot) {
    drawAstraBlink(ctx,pilot?.astra?.blinkFx);
    NeonAstraVisual.draw(ctx,pilot?.astraVisual);
    window.NeonAstra?.renderWard(ctx, pilot);
    window.NeonAstraWeave?.render(ctx, pilot);
  },
  network(ctx, snapshot) {
    const arcane = snapshot.arcane;
    drawAstraBlink(ctx,arcane?.blinkFx);
    NeonAstraVisual.draw(ctx,arcane?.visual);
    if (arcane?.wardRemaining > 0) {
      window.NeonAstra?.renderWard(ctx, {
        shipId: 'astra',
        astra: {
          wardX: arcane.wardX,
          wardY: arcane.wardY,
          wardRemaining: arcane.wardRemaining
        },
        passives: snapshot.passives || {}
      });
    }
    if (arcane?.anchors?.length) {
      window.NeonAstraWeave?.render(ctx, { starWeave: { anchors: arcane.anchors } });
    }
  }
});

// Source: ships/astra/network.js
/* Astra's capped, class-specific network projection is owned by Astra. */
window.NeonShips.registerNetworkProjection('astra', pilot => {
  const clamp = (v, a, b, fallback = 0) => Number.isFinite(v)
    ? Math.max(a, Math.min(b, v)) : fallback;
  const state = pilot.astra || {};
  const anchors = (pilot.starWeave?.anchors || []).slice(0, 3).map(a => ({
    x: clamp(a.x, -1e7, 1e7), y: clamp(a.y, -1e7, 1e7),
    life: clamp(a.life, 0, 6)
  }));
  return { arcane: {
    mana: clamp(state.mana, 0, 250, 60),
    maxMana: clamp(state.maxMana, 1, 250, 100),
    blinkCharges: clamp(state.blinkCharges, 0, 4, 2),
    blinkRecharge: clamp(state.blinkRecharge, 0, 5),
    blinkFx: state.blinkFx?.life > 0 ? {
      x1: clamp(state.blinkFx.x1,-1e7,1e7),
      y1: clamp(state.blinkFx.y1,-1e7,1e7),
      x2: clamp(state.blinkFx.x2,-1e7,1e7),
      y2: clamp(state.blinkFx.y2,-1e7,1e7),
      life: clamp(state.blinkFx.life,0,.32),maxLife:.32
    } : null,
    visual:(pilot.astraVisual||[]).slice(-24).map(fx=>({
      kind:fx.kind,
      x:clamp(fx.x,-1e7,1e7),y:clamp(fx.y,-1e7,1e7),
      x2:clamp(fx.x2,-1e7,1e7),y2:clamp(fx.y2,-1e7,1e7),
      radius:clamp(fx.radius,8,280),life:clamp(fx.life,0,3),
      maxLife:clamp(fx.maxLife,.01,3)
    })),
    meteorCooldown: clamp(state.cooldowns?.meteor, 0, 30),
    wardCooldown: clamp(state.cooldowns?.ward, 0, 30),
    wardRemaining: clamp(state.wardRemaining, 0, 10),
    wardX: clamp(state.wardX, -1e7, 1e7),
    wardY: clamp(state.wardY, -1e7, 1e7),
    shield: clamp(pilot.coopShield?.value, 0, 45),
    anchors
  } };
});

// Source: ships/phantom/ship.js
/* Auto-registered ship plugin */
window.NeonShips.register({
    id: 'phantom', code: 'PHANTOM', name: '幽灵·共生拟态',
    description: '虚无潜行、灵魂烙印引爆与联机共生挂载战舰', playable: true,
    baseStats: { hp: 85, speed: 260, regen: 0.5, dashCharges: 2 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 2 },
    startingWeapon: 'phantom_scythe', passiveId: null,
    activeSkillIds: ['spectral_shift', 'dock_link'],
    warpTreeId: 'spectral', rendererId: 'phantom'
  });

if (!window.NeonShips?.get("phantom")) { throw new Error("Ship phantom did not register itself"); }

// Source: ships/phantom/renderer.js
/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('phantom', (ctx, fighter, profile) => {
  const mainColor = profile.color || '#00f0ff';
  const downed = Boolean(fighter.downed);
  const strokeColor = downed ? '#ff617e' : mainColor;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const timeSec = now * 0.001;

  ctx.save();
  ctx.shadowBlur = downed ? 10 : 20;
  ctx.shadowColor = strokeColor;

  // 1. Dual-mandible predatory stealth hull (Forked needle prongs)
  ctx.fillStyle = downed ? '#1a0d18' : '#0e051c';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.moveTo(26, -4.5);           // Port forward strike fang
  ctx.lineTo(21, 0);              // Central notch
  ctx.lineTo(26, 4.5);            // Starboard forward strike fang
  ctx.lineTo(14, 9);
  ctx.lineTo(2, 10);
  ctx.lineTo(-6, 24);             // Swept stealth gull wing starboard
  ctx.lineTo(-14, 20);
  ctx.lineTo(-9, 7);
  ctx.lineTo(-16, 3);
  ctx.lineTo(-12, 0);             // Tail keel
  ctx.lineTo(-16, -3);
  ctx.lineTo(-9, -7);
  ctx.lineTo(-14, -20);
  ctx.lineTo(-6, -24);            // Swept stealth gull wing port
  ctx.lineTo(2, -10);
  ctx.lineTo(14, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Negative-space void vents (Hollow energy conduits inside wings)
  const ventAlpha = downed ? 0.25 : (0.35 + Math.sin(timeSec * 5) * 0.15);
  ctx.fillStyle = downed ? 'rgba(255,97,126,0.3)' : `rgba(0, 240, 255, ${ventAlpha})`;
  ctx.strokeStyle = downed ? '#ff617e' : 'rgba(0, 240, 255, 0.85)';
  ctx.lineWidth = 1.2;

  // Port void vent
  ctx.beginPath();
  ctx.moveTo(1, -8);
  ctx.lineTo(-7, -18);
  ctx.lineTo(-10, -13);
  ctx.lineTo(-5, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Starboard void vent
  ctx.beginPath();
  ctx.moveTo(1, 8);
  ctx.lineTo(-7, 18);
  ctx.lineTo(-10, 13);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Symbiote docking nodes (Tactical bioclamps on wings)
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-4, -13, 2.2, 0, Math.PI * 2);
  ctx.arc(-4, 13, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Central Ocular Soul Core (Eerie spectral eye with breathing slit pupil)
  const eyePulse = downed ? 0 : Math.sin(timeSec * 4) * 0.6;
  ctx.beginPath();
  ctx.arc(3, 0, 5.8 + eyePulse, 0, Math.PI * 2);
  ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
  ctx.shadowBlur = downed ? 6 : 18;
  ctx.shadowColor = downed ? '#ff617e' : '#c084fc';
  ctx.fill();

  // Sinister vertical slit pupil with ocular gleam
  if (!downed) {
    const slitWidth = 1.6 + Math.sin(timeSec * 6) * 0.4;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(3, 0, slitWidth, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil bright pinpoint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Twin Ethereal Phosphor Exhaust Plumes (Cyan plasma & violet soul flames)
  const plume = downed ? 4 : (10 + Math.random() * 8);
  const thrusterColor = downed ? '#ff617e' : '#00f0ff';
  ctx.fillStyle = thrusterColor;
  ctx.shadowColor = thrusterColor;
  ctx.shadowBlur = 14;

  // Port engine flame
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.lineTo(-13 - plume, -7);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();

  // Starboard engine flame
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.lineTo(-13 - plume, 7);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.fill();

  // Ethereal violet soul-fire overlayer & drifting smoke sparks
  if (!downed) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.75)';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-12 - plume * 0.7, -4.5);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-12 - plume * 0.7, 4.5);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    // Trailing spectral sparks
    const sparkT = (now * 0.04) % 10;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-17 - sparkT, -5 + Math.sin(timeSec * 7) * 2, 1.3, 0, Math.PI * 2);
    ctx.arc(-17 - sparkT, 5 + Math.cos(timeSec * 7) * 2, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
});

// Source: ships/phantom/abilities.js
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
          let hits=0;
          for (const enemy of game.enemies || []) {
            if (enemy.dead || enemy.hp <= 0 || !within(enemy,pilot,45+level*12)) continue;
            game.dealDamage(enemy,13+level*9,'phantom_ghost_trail',false,pilot);
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

    for (const e of enemies) {
      if (hitCount >= maxTargets) break;
      const dx = e.x - pilot.x, dy = e.y - pilot.y;
      const forward = dx * cos + dy * sin;
      if (forward < -20 || forward > range) continue;
      const lateral = Math.abs(-dx * sin + dy * cos);
      if (lateral > halfWidth + (e.radius || 12)) continue;

      const level = pilot.level || 1;
      const slashDamage = (26 + level * 3) * (pilot.dmgMultiplier || 1);
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
    BASE, UNIQUE, catalog, state, validPilot,
    addEctoplasm, critBonus, enterShift, finishShift, markEnemy, isMarked, markDamageBonus, reap,
    canDock, dock, undock, carrierDamageReduction, tick, renderMarks, ghostStrike, sprint
  });
})();

// Source: ships/phantom/weapons.js
/* PHANTOM signature weapon: 幽魂之镰 (Phantom Scythe).
 * Dual-phase boomerang projectile: outward slicing, peak hover spin, and curved return.
 * Reabsorbing a returned scythe recovers ectoplasm and triggers Lv5 harvest pulses.
 */
(() => {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const MAX_ACTIVE_SCYTHES = 6;
  const TARGET_RANGE = 600;

  function createState() {
    return { scythes: [], fireElapsed: 0, serial: 0 };
  }

  function state(pilot) {
    if (!pilot || pilot.shipId !== 'phantom') return null;
    return pilot.phantomScythe ||= createState();
  }

  function closestEnemy(enemies, origin) {
    let best = null;
    let bestDistSq = TARGET_RANGE * TARGET_RANGE;
    for (const e of enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const dx = e.x - origin.x, dy = e.y - origin.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) { best = e; bestDistSq = d2; }
    }
    return best;
  }

  function spawnScythe(pilot, angle, level) {
    const s = state(pilot);
    if (!s || s.scythes.length >= MAX_ACTIVE_SCYTHES) return null;

    const baseDist = level >= 2 ? 290 : 230;
    const damage = 22 + (level - 1) * 7;
    const scythe = {
      x: pilot.x,
      y: pilot.y,
      originX: pilot.x,
      originY: pilot.y,
      angle,
      targetX: pilot.x + Math.cos(angle) * baseDist,
      targetY: pilot.y + Math.sin(angle) * baseDist,
      phase: 'out', // 'out' -> 'hover' -> 'return'
      speed: 380,
      hoverTime: 0.38,
      damage,
      hitHistory: new Set(),
      hoverDamageElapsed: 0,
      level
    };
    s.scythes.push(scythe);
    return scythe;
  }

  function segmentDistanceSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    const nx = x1 + t * dx, ny = y1 + t * dy;
    return (px - nx) * (px - nx) + (py - ny) * (py - ny);
  }

  function dealScytheDamage(game, pilot, enemy, damage, source) {
    if (!enemy || enemy.dead || enemy.hp <= 0) return;
    const isCrit = (pilot.phantom && window.NeonPhantom) ?
      (Math.random() < window.NeonPhantom.critBonus(pilot, game.survivalTime || 0)) : false;
    game.dealDamage(enemy, damage * (pilot.dmgMultiplier || 1), source, isCrit, pilot);
    if (window.NeonPhantom) {
      window.NeonPhantom.addEctoplasm(pilot, 2);
    }
  }

  function tick(pilot, game, dt) {
    const level = clamp(Math.floor(pilot?.weapons?.phantom_scythe || 0), 0, 5);
    if (pilot?.shipId !== 'phantom' || level < 1 || pilot.hp <= 0 ||
        pilot.downed || game?.state !== 'playing' ||
        !Number.isFinite(dt) || dt <= 0) return;

    const s = state(pilot);
    const enemies = game.enemies || [];
    const interval = Math.max(0.65, (1.8 - (level - 1) * 0.24) * (pilot.cdrMultiplier || 1));

    s.fireElapsed += dt;
    if (s.fireElapsed >= interval) {
      s.fireElapsed = Math.min(s.fireElapsed - interval, interval);
      const target = closestEnemy(enemies, pilot);
      const baseAngle = target ? Math.atan2(target.y - pilot.y, target.x - pilot.x) :
        (pilot.angle || 0);

      const count = level >= 3 ? 3 : 2;
      const spread = 0.35;
      const startAngle = baseAngle - ((count - 1) * spread) / 2;

      for (let i = 0; i < count; i++) {
        spawnScythe(pilot, startAngle + i * spread, level);
      }
    }

    // Update active flying scythes
    for (let i = s.scythes.length - 1; i >= 0; i--) {
      const sc = s.scythes[i];
      const prevX = sc.x;
      const prevY = sc.y;

      if (sc.phase === 'out') {
        const dx = sc.targetX - sc.x;
        const dy = sc.targetY - sc.y;
        const dist = Math.hypot(dx, dy);
        const step = sc.speed * dt;
        if (dist <= step) {
          sc.x = sc.targetX;
          sc.y = sc.targetY;
          sc.phase = 'hover';
          sc.hitHistory.clear(); // Reset for hover ticks
        } else {
          sc.x += (dx / dist) * step;
          sc.y += (dy / dist) * step;
        }

        // Damage enemies on outward flight with continuous collision
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0 || sc.hitHistory.has(e)) continue;
          if (segmentDistanceSq(e.x, e.y, prevX, prevY, sc.x, sc.y) <= 36 * 36) {
            sc.hitHistory.add(e);
            dealScytheDamage(game, pilot, e, sc.damage, 'phantom_scythe_out');
          }
        }
      } else if (sc.phase === 'hover') {
        sc.hoverTime -= dt;
        sc.hoverDamageElapsed += dt;
        if (sc.hoverDamageElapsed >= 0.18) {
          sc.hoverDamageElapsed = 0;
          for (const e of enemies) {
            if (!e || e.dead || e.hp <= 0) continue;
            if (Math.hypot(e.x - sc.x, e.y - sc.y) <= 38) {
              const hoverBonus = level >= 2 ? 1.3 : 1.0;
              dealScytheDamage(game, pilot, e, sc.damage * 0.65 * hoverBonus, 'phantom_scythe_hover');
            }
          }
        }
        if (sc.hoverTime <= 0) {
          sc.phase = 'return';
          sc.hitHistory.clear(); // Reset for return flight
        }
      } else if (sc.phase === 'return') {
        const dx = pilot.x - sc.x;
        const dy = pilot.y - sc.y;
        const dist = Math.hypot(dx, dy);
        const returnSpeed = sc.speed * 1.25;
        const step = returnSpeed * dt;
        if (dist <= step || dist < 22) {
          // Reabsorbed by pilot!
          s.scythes.splice(i, 1);
          if (window.NeonPhantom) {
            window.NeonPhantom.addEctoplasm(pilot, 4);
          }

          // Lv5 Harvest Burst when reabsorbed
          if (sc.level >= 5) {
            for (const e of enemies) {
              if (!e || e.dead || e.hp <= 0) continue;
              if (Math.hypot(e.x - pilot.x, e.y - pilot.y) <= 120) {
                dealScytheDamage(game, pilot, e, 45, 'phantom_scythe_burst');
              }
            }
            if ((game.shockwaves?.length || 0) < 40) {
              game.shockwaves?.push({
                x: pilot.x, y: pilot.y, radius: 10, maxRadius: 120,
                color: '#00f0ff', alpha: 0.8
              });
            }
          }
          continue;
        } else {
          sc.x += (dx / dist) * step;
          sc.y += (dy / dist) * step;
        }

        // Damage enemies on return flight with continuous collision
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0 || sc.hitHistory.has(e)) continue;
          if (segmentDistanceSq(e.x, e.y, prevX, prevY, sc.x, sc.y) <= 36 * 36) {
            sc.hitHistory.add(e);
            dealScytheDamage(game, pilot, e, sc.damage * 1.15, 'phantom_scythe_return');
          }
        }
      }
    }
  }

  function render(ctx, pilot) {
    const s = pilot?.phantomScythe;
    if (!s?.scythes?.length || !ctx) return;
    ctx.save();
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    for (const sc of s.scythes) {
      ctx.save();
      ctx.translate(sc.x, sc.y);
      const spin = (sc.phase === 'hover') ? (now * 0.02) : (sc.angle + now * 0.012);

      // 1. Ghostly Motion-Blur Slashing Arc Trails
      const isHover = sc.phase === 'hover';
      const trailAlpha = isHover ? 0.35 : 0.55;
      ctx.save();
      ctx.rotate(spin - 0.25);
      ctx.strokeStyle = `rgba(0, 240, 255, ${trailAlpha * 0.5})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 18, Math.PI, Math.PI * 1.7);
      ctx.stroke();
      ctx.restore();

      ctx.rotate(spin);

      // 2. Twin Spectral Crescent Scythe Blades
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.4;
      ctx.fillStyle = '#120724';

      // Blade 1
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 0.88);
      ctx.lineTo(3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade 1 inner soul rune spine
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0.15, Math.PI * 0.75);
      ctx.stroke();

      // Blade 2
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 17, Math.PI, Math.PI * 1.88);
      ctx.lineTo(-3, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blade 2 inner soul rune spine
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, Math.PI + 0.15, Math.PI * 1.75);
      ctx.stroke();

      // 3. Central Ocular Void Core
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#a855f7';
      ctx.fill();

      // Slit pupil in center of scythe
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Hover Resonance Pulse Rings
      if (isHover) {
        const pulse = (now * 0.006) % 1;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + pulse * 24, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - pulse})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 8 + pulse * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.8 * (1 - pulse)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  window.NeonPhantomScythe = Object.freeze({
    state, spawnScythe, tick, render, MAX_ACTIVE_SCYTHES
  });
})();

// Source: ships/phantom/arsenal.js
/* Phantom's eight extra weapons: deterministic, host-authoritative, per-pilot.
 * Each weapon has its own cooldown/effect. Caps prevent a dense wave from
 * generating an unbounded chain of hits, delayed events or visual particles.
 */
(() => {
  'use strict';
  const RULES = Object.freeze({
    spectral_dart: [1.2, .5], soul_reap_orb: [2.6, 1.1],
    void_rift_mine: [3.5, 1.7], symbiote_beam: [2.4, 1.1],
    haunt_clones: [3.1, 1.4], curse_totem: [4.5, 2.4],
    apocalypse_scythe: [7.0, 3.6], abyssal_possession: [8.5, 4.5]
  });
  const alive = e => e && !e.dead && e.hp > 0;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const rank = (p,id) => Math.min(5, Math.max(0, p.passives?.[id] || 0));
  const fx=(pilot,kind,from,to,radius,life)=>
    window.NeonPhantomVisual?.emit(pilot,kind,from,to,radius,life);
  const state = pilot => pilot.phantomArsenal ||= { timers: {}, delayed: [] };
  function targets(game,pilot,reach=750) {
    return (game.enemies || []).filter(e => alive(e) && distance(e,pilot) <= reach)
      .sort((a,b) => distance(a,pilot) - distance(b,pilot)).slice(0,32);
  }
  function damage(pilot,game,enemy,base,source) {
    if (!alive(enemy)) return false;
    const hpPercent = enemy.hp / Math.max(enemy.maxHp || enemy.hp,1);
    const execute = (rank(pilot,'execute_master') * (hpPercent < .35 ? .12 : 0));
    const ecto = window.NeonPhantom?.state(pilot)?.ectoplasm || 0;
    const bonus = Math.min(.35, ecto / 500) + execute;
    game.dealDamage(enemy,base * (1 + bonus) * (pilot.dmgMultiplier || 1),source,
      Math.random() < Math.min(1, window.NeonPhantom?.critBonus(pilot,game.survivalTime || 0) || 0),pilot);
    window.NeonPhantom?.addEctoplasm(pilot,1 + rank(pilot,'soul_gatherer'));
    fx(pilot,'soul',pilot,enemy,15,.2);
    return true;
  }
  function pulse(pilot,game,center,radius,amount,source,limit=10) {
    let count=0;
    for(const enemy of targets(game,pilot,900)) {
      if(distance(enemy,center)>radius+(enemy.radius || 12)) continue;
      damage(pilot,game,enemy,amount,source);
      if(++count>=limit)break;
    }
    if ((game.shockwaves?.length || 0)<35)game.shockwaves?.push({
      x:center.x,y:center.y,radius:8,maxRadius:radius,color:'#a855f7',alpha:.7
    });
    fx(pilot,'burst',center,null,radius,.37);
    return count;
  }
  function queue(pilot,event){const s=state(pilot);if(s.delayed.length>=18)s.delayed.shift();s.delayed.push(event);}
  function fire(pilot,game,id,level) {
    const enemyList=targets(game,pilot);
    const first=enemyList[0];
    if(!first)return false;
    const levelDamage=1+(level-1)*.25;
    switch(id) {
      case 'spectral_dart':
        enemyList.slice(0,Math.min(5,1+level)).forEach(e=>damage(pilot,game,e,19*levelDamage,'phantom_dart'));
        for(const e of enemyList.slice(0,Math.min(5,1+level)))fx(pilot,'dart',pilot,e,22,.23);
        break;
      case 'soul_reap_orb': {
        for(const e of enemyList.slice(0,Math.min(7,2+level))){
          damage(pilot,game,e,23*levelDamage,'phantom_orb');
          fx(pilot,'orb',pilot,e,24,.36);
          window.NeonPhantom?.addEctoplasm(pilot,2);
        }
        break;
      }
      case 'void_rift_mine':
        fx(pilot,'telegraph',first,null,75+level*13,.55);
        queue(pilot,{x:first.x,y:first.y,delay:.55,radius:75+level*13,
          amount:45*levelDamage,id:'phantom_mine',limit:10});
        break;
      case 'symbiote_beam':
        enemyList.slice(0,Math.min(5,1+level)).forEach(e=>damage(pilot,game,e,28*levelDamage,'phantom_beam'));
        for(const e of enemyList.slice(0,Math.min(5,1+level)))fx(pilot,'beam',pilot,e,38,.31);
        if(pilot.phantom?.docked && pilot.phantom.carrier)
          pilot.phantom.carrier.hp=Math.min(pilot.phantom.carrier.maxHp,pilot.phantom.carrier.hp+1+level*.4);
        if(pilot.phantom?.docked&&pilot.phantom.carrier)fx(pilot,'heal',pilot.phantom.carrier,null,32,.45);
        break;
      case 'haunt_clones':
        enemyList.slice(0,Math.min(6,1+Math.ceil(level/2))).forEach((e,i)=>{
          fx(pilot,'clone',pilot,e,42,.45+i*.11);
          queue(pilot,{
          x:e.x,y:e.y,delay:.18+i*.11,radius:45+level*4,
          amount:32*levelDamage,id:'phantom_clone',limit:5
          });
        });
        break;
      case 'curse_totem':
        fx(pilot,'telegraph',first,null,110+level*15,.45);
        queue(pilot,{x:first.x,y:first.y,delay:.45,radius:110+level*15,
          amount:27*levelDamage,id:'phantom_totem',limit:14,mark:true});
        break;
      case 'apocalypse_scythe':
        fx(pilot,'burst',pilot,null,175+level*25,.45);
        pulse(pilot,game,pilot,175+level*25,70*levelDamage,'phantom_apocalypse',16);
        break;
      case 'abyssal_possession':
        fx(pilot,'soul',pilot,first,75,.55);
        damage(pilot,game,first,Math.min(210,90+level*22+Math.min(80,
          (first.maxHp || first.hp)*.012)),'phantom_possession');
        if(first.hp > 0 && !first.isBoss)first.freezeTimer=Math.max(first.freezeTimer || 0,.2+level*.1);
        break;
      default:return false;
    }
    return true;
  }
  function tick(pilot,game,dt){
    if(pilot?.shipId!=='phantom'||pilot.hp<=0||pilot.downed||
      game?.state!=='playing'||!Number.isFinite(dt)||dt<=0)return 0;
    const s=state(pilot), p=window.NeonPhantom?.state(pilot);
    if(p) {
      // Passive effects apply to the class itself, not global Riftblade slots.
      p.maxEctoplasm=100+rank(pilot,'phantom_core')*8;
      if(rank(pilot,'death_reversal')>=1 && !pilot.cheatDeathUsed)pilot.hasCheatDeath=true;
      // Recompute from registered base each tick; no permanent low-HP stacking.
      const base=(window.NeonShips?.get('phantom')?.baseStats.regen ?? .5) +
        (pilot.passives?.armor || 0)*1.8;
      const extra=pilot.hp < pilot.maxHp*.45 ? rank(pilot,'stealth_armor')*.12 : 0;
      pilot.regen=base+extra;
    }
    let fired=0;
    for(const [id,[period,min]] of Object.entries(RULES)){
      const level=Math.min(5,Math.max(0,pilot.weapons?.[id] || 0));
      if(!level)continue;
      const cooldown=Math.max(min,(period-(level-1)*.12)*(pilot.cdrMultiplier || 1));
      s.timers[id]=Math.min(cooldown,(s.timers[id] || 0)+dt);
      if(s.timers[id]>=cooldown && fire(pilot,game,id,level)){
        s.timers[id]=0;fired++;
      }
    }
    for(let i=s.delayed.length-1;i>=0;i--){
      const event=s.delayed[i];event.delay-=dt;
      if(event.delay>0)continue;
      s.delayed.splice(i,1);
      pulse(pilot,game,event,event.radius,event.amount,event.id,event.limit);
      if(event.mark && p?.shiftActive){
        for(const e of targets(game,pilot,900))
          if(distance(e,event)<event.radius)window.NeonPhantom?.markEnemy(pilot,e,game.survivalTime || 0);
      }
    }
    return fired;
  }
  window.NeonPhantomArsenal=Object.freeze({RULES,state,damage,fire,tick});
})();

// Source: ships/phantom/effects.js
const NeonPhantomVisual = (() => {
  const MAX_FX=24;
  function emit(pilot,kind,from,to=null,radius=50,duration=.32) {
    if(!pilot||!Number.isFinite(from?.x)||!Number.isFinite(from?.y))return;
    const timeline=pilot.phantomVisual ||= [];
    if(timeline.length>=MAX_FX)timeline.shift();
    timeline.push({kind,x:from.x,y:from.y,
      x2:Number.isFinite(to?.x)?to.x:from.x,
      y2:Number.isFinite(to?.y)?to.y:from.y,
      radius:Math.max(8,Math.min(280,radius)),life:duration,maxLife:duration});
  }
  function tick(pilot,dt) {
    if(!Number.isFinite(dt)||dt<=0)return;
    const events=pilot?.phantomVisual || [];
    for(let i=events.length-1;i>=0;i--){
      events[i].life-=dt;
      if(events[i].life<=0)events.splice(i,1);
    }
  }
  function draw(ctx,events) {
    if(!ctx||!Array.isArray(events))return;
    ctx.save();ctx.lineCap='round';
    for(const event of events.slice(0,MAX_FX)){
      if(!event||!(event.life>0)||!Number.isFinite(event.x)||!Number.isFinite(event.y))continue;
      const alpha=Math.min(1,event.life/Math.max(.01,event.maxLife || .32));
      const radius=Math.max(8,Math.min(280,event.radius||50));
      ctx.globalAlpha=alpha*.85;
      ctx.strokeStyle=event.kind==='soul'?'#ef88ff':event.kind==='heal'?'#66ffcb':'#9b55ee';
      ctx.fillStyle=event.kind==='heal'?'#66ffcb':'#b779f7';
      ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=9;
      if(['dart','orb','beam','clone','soul'].includes(event.kind)) {
        ctx.lineWidth=event.kind==='beam'?8:3;
        ctx.beginPath();ctx.moveTo(event.x,event.y);
        ctx.lineTo(event.x2,event.y2);ctx.stroke();
        ctx.beginPath();ctx.arc(event.x2,event.y2,Math.min(12,radius*.2),0,Math.PI*2);ctx.fill();
      } else {
        ctx.lineWidth=event.kind==='heal'?4:3;
        ctx.beginPath();ctx.arc(event.x,event.y,
          event.kind==='telegraph'?radius:radius*(1-.65*alpha),0,Math.PI*2);ctx.stroke();
        if(event.kind==='burst') {
          ctx.globalAlpha=.13*alpha;
          ctx.beginPath();ctx.arc(event.x,event.y,radius*(1-.65*alpha),0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  return Object.freeze({emit,tick,draw,MAX_FX});
})();
window.NeonPhantomVisual=NeonPhantomVisual;
function drawPhantomShift(ctx, spectral) {
  if (!ctx || !spectral) return;
  const trail = Array.isArray(spectral.shiftTrail) ? spectral.shiftTrail.slice(0, 10) : [];
  if (!trail.length && !(spectral.reapFlash > 0) && !(spectral.shiftFlash > 0)) return;
  ctx.save();
  ctx.lineCap = 'round';

  // 1. Ghostly Silhouette Trail & Spatial Tear Ribbon
  for (let i = 0; i < trail.length; i++) {
    const point = trail[i];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const fade = Math.min(1, Math.max(0, (point.life || 0) / .42));

    // Spatial tear connecting ribbon
    if (i > 0) {
      const prev = trail[i - 1];
      ctx.globalAlpha = fade * 0.45;
      ctx.strokeStyle = i % 2 === 0 ? '#00f0ff' : '#a855f7';
      ctx.lineWidth = 3 + fade * 8;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    // Ghostly Hull Silhouette Echo on prominent trail nodes
    if (i % 2 === 0) {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = 'rgba(19, 8, 38, 0.4)';
      ctx.strokeStyle = i % 4 === 0 ? '#00f0ff' : '#c084fc';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;

      // Miniature chevron ghost silhouette
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -11);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Ethereal soul ember at trail point
    ctx.globalAlpha = fade * 0.7;
    ctx.fillStyle = i % 2 ? '#a855f7' : '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 + fade * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Void Phase Detonation / Reap Nova Shockwave
  const pulse = spectral.reapFlash > 0 ? spectral.reapFlash : spectral.shiftFlash;
  if (pulse > 0 && Number.isFinite(spectral.x) && Number.isFinite(spectral.y)) {
    const isReap = spectral.reapFlash > 0;
    ctx.globalAlpha = Math.min(0.95, pulse * 3.2);
    ctx.strokeStyle = isReap ? '#ef88ff' : '#00f0ff';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.lineWidth = isReap ? 4.5 : 3.0;

    const ringR = 25 + (1 - pulse / .28) * 75;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner secondary echo ring
    ctx.strokeStyle = isReap ? '#ffffff' : '#a855f7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(spectral.x, spectral.y, ringR * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
window.NeonShips.registerEffects('phantom', {
  pilot(ctx, pilot) {
    if(pilot?.phantom)drawPhantomShift(ctx,{
      ...pilot.phantom,x:pilot.x,y:pilot.y
    });
    NeonPhantomVisual.draw(ctx,pilot?.phantomVisual);
    window.NeonPhantomScythe?.render(ctx, pilot);
  },
  world(ctx, game) {
    window.NeonPhantom?.renderMarks(ctx, game);
  },
  network(ctx, snapshot) {
    drawPhantomShift(ctx,{
      ...snapshot.spectral,x:snapshot.x,y:snapshot.y
    });
    NeonPhantomVisual.draw(ctx,snapshot.spectral?.visual);
    if (snapshot.spectral?.scythes?.length) {
      window.NeonPhantomScythe?.render(ctx, {
        phantomScythe: {scythes:snapshot.spectral.scythes}
      });
    }
  }
});

// Source: ships/phantom/network.js
/* Only bounded primitive, class-specific values enter the public snapshot. */
window.NeonShips.registerNetworkProjection('phantom', pilot => {
  const s = pilot.phantom || {};
  const clamp = (value, min, max) => Number.isFinite(value)
    ? Math.min(max, Math.max(min, value)) : min;
  return { spectral: {
    ectoplasm: clamp(s.ectoplasm, 0, s.maxEctoplasm || 100),
    maxEctoplasm: clamp(s.maxEctoplasm || 100, 1, 200),
    shiftActive: Boolean(s.shiftActive),
    shiftRemaining: clamp(s.shiftRemaining, 0, 10),
    charges: clamp(s.dashCharges, 0, 3),
    recharge: clamp(s.dashRecharge, 0, 8),
    docked: Boolean(s.docked),
    dockCooldown: clamp(s.dockCooldownRemaining, 0, 20),
    markedTargets: Math.min(64, s.marks?.size || 0),
    shiftFlash: clamp(s.shiftFlash,0,.24),
    reapFlash: clamp(s.reapFlash,0,.28),
    shiftTrail:(s.shiftTrail || []).slice(-10).map(point=>({
      x:clamp(point.x,-1e7,1e7),y:clamp(point.y,-1e7,1e7),
      life:clamp(point.life,0,.5)
    })),
    visual:(pilot.phantomVisual||[]).slice(-24).map(fx=>({
      kind:fx.kind,
      x:clamp(fx.x,-1e7,1e7),y:clamp(fx.y,-1e7,1e7),
      x2:clamp(fx.x2,-1e7,1e7),y2:clamp(fx.y2,-1e7,1e7),
      radius:clamp(fx.radius,8,280),life:clamp(fx.life,0,3),
      maxLife:clamp(fx.maxLife,.01,3)
    })),
    scythes: (pilot.phantomScythe?.scythes || []).slice(0,6).map(sc=>({
      x:clamp(sc.x,-1e7,1e7), y:clamp(sc.y,-1e7,1e7),
      angle:clamp(sc.angle,-6.29,6.29),
      phase:['out','hover','return'].includes(sc.phase)?sc.phase:'out'
    }))
  } };
});

// Source: ships/riftblade/ship.js
/* Auto-registered ship plugin */
window.NeonShips.register({
    id: 'riftblade', code: 'RIFTBLADE', name: '裂锋·虚空突击者',
    description: '进攻型折跃突击战舰', playable: true,
    baseStats: { hp: 100, speed: 240, regen: 0.8, dashCharges: 3 },
    slots: { weapons: 4, passives: 4, warp: 7, activeSkills: 0 },
    startingWeapon: 'blaster', passiveId: null, activeSkillIds: [],
    warpTreeId: 'assault', rendererId: 'riftblade'
  });

if (!window.NeonShips?.get("riftblade")) { throw new Error("Ship riftblade did not register itself"); }

// Source: ships/riftblade/renderer.js
/* Auto-registered ship plugin */
window.NeonShips.registerRenderer('riftblade', (ctx, fighter, profile) => {
    const mainColor = profile.color || '#00f3ff';
    const downed = Boolean(fighter.downed);
    const strokeColor = downed ? '#ff617e' : mainColor;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Main titanium assault chassis
    ctx.fillStyle = '#061122';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(26, 0);              // Sharp razor needle nose
    ctx.lineTo(8, -7);
    ctx.lineTo(-12, -22);           // Main wing tip left
    ctx.lineTo(-16, -18);
    ctx.lineTo(-9, -8);
    ctx.lineTo(-18, -8);           // Port thruster cowl
    ctx.lineTo(-18, -4);
    ctx.lineTo(-13, 0);            // Engine notch
    ctx.lineTo(-18, 4);            // Starboard thruster cowl
    ctx.lineTo(-18, 8);
    ctx.lineTo(-9, 8);
    ctx.lineTo(-16, 18);
    ctx.lineTo(-12, 22);           // Main wing tip right
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. High-tech panel groove inlays (accent armor plates)
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.6)' : 'rgba(0,243,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, -13);
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, 13);
    ctx.moveTo(2, -4);
    ctx.lineTo(-11, -4);
    ctx.moveTo(2, 4);
    ctx.lineTo(-11, 4);
    ctx.stroke();

    // 3. Wingtip micro navigation lights
    ctx.fillStyle = downed ? '#ff617e' : '#fff';
    ctx.beginPath();
    ctx.arc(-13, -20, 1.6, 0, Math.PI * 2);
    ctx.arc(-13, 20, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Hexagonal crystalline cockpit
    ctx.fillStyle = downed ? '#ff617e' : strokeColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(1, -4.5);
    ctx.lineTo(-6, -4.5);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-6, 4.5);
    ctx.lineTo(1, 4.5);
    ctx.closePath();
    ctx.fill();

    // Cockpit reflection glint
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 5. Twin heavy vector thruster exhausts
    const flameBase = downed ? 4 : (11 + Math.random() * 8);
    ctx.fillStyle = downed ? '#ff617e' : '#ff007f';
    ctx.shadowColor = downed ? '#ff617e' : '#ff007f';
    ctx.shadowBlur = 16;

    // Port engine flame
    ctx.beginPath();
    ctx.moveTo(-18, -7);
    ctx.lineTo(-18 - flameBase, -6);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.fill();

    // Starboard engine flame
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-18 - flameBase, 6);
    ctx.lineTo(-18, 7);
    ctx.closePath();
    ctx.fill();

    // Core energetic white thrust plume center
    if (!downed) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-18, -6, 1.5, 0, Math.PI * 2);
      ctx.arc(-18, 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
