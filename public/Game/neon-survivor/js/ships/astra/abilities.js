/* ASTRA / 星织·织界术师 — host-authoritative abilities and transient warp FX.
 */
(() => {
  'use strict';
  const BASE = Object.freeze({
    initialMana: 60, maxMana: 100, naturalRegen: 2,
    maxHitRegenPerSecond: 12, hitRegenInterval: 1.5,
    meteorCost: 12, meteorCooldown: 0, meteorDamage: 36,
    meteorRadius: 105, meteorMaxTargets: 9, meteorStun: 0.6,
    meteorZoneDuration: 3.0, meteorZoneSlow: 0.5, maxMeteorZones: 6,
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
      ['astral_resonance', '星穹回响', 'legendary']
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
    astral_resonance: ['✺','星陨命中敌群时，每9秒引发一次星核二次爆发并获得短时自身护盾；直接施法即可触发',
      ['回响爆发30伤害、获得12护盾','回响爆发42伤害、获得20护盾',
       '回响爆发54伤害、获得28护盾','回响爆发66伤害、获得36护盾',
       '回响爆发78伤害、获得44护盾']],
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
    shieldReduction: 0, resonance: 0
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
      meteorZones: [],
      blinkCharges: 2, blinkRecharge: 0,
      warpUpgrades: {}, lastFoldAt: -Infinity,
      resonanceReadyAt: 0,
      phaseVeilRemaining: 0, mirrorEchoPending: false,
      lastBrandAt: -Infinity, blinkFx: null
    };
  }
  function state(pilot) {
    return pilot?.shipId === 'astra' ? (pilot.astra ||= createState()) : null;
  }
  function attackScale(pilot) {
    const baseMult = pilot?.dmgMultiplier || 1;
    const level = Math.max(1, pilot?.level || 1);
    const levelScale = 1 + (level - 1) * 0.02;
    if (pilot?._arsenalInDmgMult) return baseMult * levelScale;
    const weapTotal = Object.values(pilot?.weapons || {}).reduce((a, b) => a + (b || 0), 0);
    const extraWeap = Math.max(0, weapTotal - 1);
    const passTotal = Object.values(pilot?.passives || {}).reduce((a, b) => a + (b || 0), 0);
    const warpTotal = Object.values(pilot?.dashUpgrades || pilot?.astra?.warpUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
    const arsenalMult = 1 + extraWeap * 0.06 + passTotal * 0.05 + warpTotal * 0.06;
    return baseMult * levelScale * arsenalMult;
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
    s.isTurretAnchored = false;

    // 1. Emergency Astral Shield to prevent being swarmed (preserve higher existing shield)
    const currentShield = pilot.astraTempShield?.remaining > 0 ? pilot.astraTempShield.value : 0;
    pilot.astraTempShield = {
      value: Math.max(currentShield, BASE.wardExitShield),
      remaining: 3.5
    };

    // 2. Disengagement Speed Surge (+50% speed for 2.5s)
    s.kiteSpeedTimer = BASE.wardExitSpeedDuration;

    const px = Number.isFinite(pilot?.x) ? pilot.x : 0;
    const py = Number.isFinite(pilot?.y) ? pilot.y : 0;

    // 3. Radial Disperse Shockwave to repel close enemies
    if (game && Array.isArray(game.enemies)) {
      for (const e of game.enemies) {
        if (!e || e.dead || e.hp <= 0) continue;
        const d = Math.hypot(e.x - px, e.y - py);
        if (d <= 150) {
          const angle = Math.atan2(e.y - py, e.x - px) || 0;
          e.x += Math.cos(angle) * 80;
          e.y += Math.sin(angle) * 80;
          e.vx = (e.vx || 0) + Math.cos(angle) * 160;
          e.vy = (e.vy || 0) + Math.sin(angle) * 160;
        }
      }
    }
    if ((game?.shockwaves?.length || 0) < 40) {
      game?.shockwaves?.push({
        x: px, y: py,
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

    // Lingering 3-second Meteor slow zones (50% movement slow)
    if (Array.isArray(s.meteorZones) && s.meteorZones.length > 0) {
      const enemies = Array.isArray(game?.enemies) ? game.enemies : [];
      for (let z = s.meteorZones.length - 1; z >= 0; z--) {
        const zone = s.meteorZones[z];
        zone.life -= dt;
        if (zone.life <= 0) {
          s.meteorZones.splice(z, 1);
          continue;
        }
        for (const e of enemies) {
          if (!e || e.dead || e.hp <= 0 || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
          if (Math.hypot(e.x - zone.x, e.y - zone.y) <= zone.radius + (e.radius || 12)) {
            e.freezeTimer = Math.max(e.freezeTimer || 0, 0.35);
            if (e.baseSpeed) e.speed = e.baseSpeed * (1 - BASE.meteorZoneSlow);
          }
        }
      }
    }

    if (s.wardActive) {
      // Mobile Sanctuary: ward follows the ship continuously!
      s.wardX = Number.isFinite(pilot.x) ? pilot.x : 0;
      s.wardY = Number.isFinite(pilot.y) ? pilot.y : 0;
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
            if (!e || e.dead || e.hp <= 0 || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
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
            if (eb && Number.isFinite(eb.x) && Number.isFinite(eb.y) &&
                Math.hypot(eb.x - s.wardX, eb.y - s.wardY) <= wardRadius) {
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
      const zoneRadius = BASE.meteorRadius * m.areaFactor;
      const scale = attackScale(pilot);
      const targets = enemies.filter(e => within(e, focus, zoneRadius))
        .sort((a, b) => Math.hypot(a.x - focus.x, a.y - focus.y) -
          Math.hypot(b.x - focus.x, b.y - focus.y))
        .slice(0, BASE.meteorMaxTargets);
      for (const enemy of targets) {
        game.dealDamage(enemy, BASE.meteorDamage * scale *
          m.dangerBonus,
          'astra_meteor', false, pilot);
        // Short stun on enemies hit by meteor
        enemy.stunnedUntil = Math.max(enemy.stunnedUntil || 0, (game.survivalTime || 0) + BASE.meteorStun);
      }

      // Spawn a lingering 3-second 50% slow zone at the meteor impact crater
      s.meteorZones ||= [];
      if (s.meteorZones.length >= BASE.maxMeteorZones) s.meteorZones.shift();
      s.meteorZones.push({
        x: focus.x,
        y: focus.y,
        radius: zoneRadius,
        life: BASE.meteorZoneDuration,
        maxLife: BASE.meteorZoneDuration
      });
      for (const enemy of enemies) {
        if (within(enemy, focus, zoneRadius + (enemy.radius || 12))) {
          enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.35);
          if (enemy.baseSpeed) enemy.speed = enemy.baseSpeed * (1 - BASE.meteorZoneSlow);
        }
      }

      const hitCount = targets.length;
      // Legendary Star Echo: an autonomous attack/defense payoff, independent
      // of spell selection order. It procs only on real hits, is time-gated,
      // and caps targets, damage and shield so rapid meteor casts cannot farm it.
      const now = Number(game.survivalTime) || 0;
      if (hitCount && m.resonance > 0 && now >= (s.resonanceReadyAt || 0)) {
        s.resonanceReadyAt = now + 9;
        const power = 18 + 12 * m.resonance;
        const echoRadius = 115 * m.areaFactor;
        for (const enemy of enemies.filter(e => within(e, focus, echoRadius)).slice(0, 8)) {
          game.dealDamage(enemy, power * scale * m.dangerBonus,
            'astra_star_echo', false, pilot);
        }
        const shield = Math.round((4 + 8 * m.resonance) * (1 + Math.max(0, (pilot.level || 1) - 1) * 0.03));
        const current = pilot.astraTempShield?.remaining > 0 ? pilot.astraTempShield.value : 0;
        pilot.astraTempShield = {value: Math.min(160, Math.max(current, shield)), remaining: 3.5};
        window.NeonAstraVisual?.emit(pilot, 'burst', focus, null, echoRadius, .55);
        window.NeonAstraVisual?.emit(pilot, 'shield', pilot, null, 54, .65);
      }
      window.NeonAstraVisual?.emit(pilot,'burst',focus,null,
        zoneRadius,.6);
      if ((game.shockwaves?.length || 0) < 40) game.shockwaves?.push({
        x: focus.x, y: focus.y, radius: 12, maxRadius: BASE.meteorRadius,
        color: '#b38dff', alpha: .95
      });
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
      s.wardManaGainedThisSec = 0;
      s.wardManaTimer = 0;

      // Dissolve all enemy bullets within ward radius on cast
      if (Array.isArray(game?.enemyBullets)) {
        const wardRadius = BASE.wardRadius * m.areaFactor;
        for (let b = game.enemyBullets.length - 1; b >= 0; b--) {
          const eb = game.enemyBullets[b];
          if (eb && Number.isFinite(eb.x) && Number.isFinite(eb.y) &&
              Math.hypot(eb.x - pilot.x, eb.y - pilot.y) <= wardRadius) {
            game.enemyBullets.splice(b, 1);
          }
        }
      }
      window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,
        BASE.wardRadius * m.areaFactor,.8);
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
        return Math.min(.5, BASE.wardReduction);
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
    if (!pilot.astraTempShield || pilot.astraTempShield.value <= amount) {
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
      if (absorbed > 0) {
        window.NeonAstraVisual?.emit(target, 'shield', target, null, 48, 0.42);
      }
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
    const wx = Number.isFinite(s.wardX) ? s.wardX : Number.isFinite(pilot?.x) ? pilot.x : 0;
    const wy = Number.isFinite(s.wardY) ? s.wardY : Number.isFinite(pilot?.y) ? pilot.y : 0;
    const radius = BASE.wardRadius * (modifiers(pilot)?.areaFactor || 1);
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    ctx.save();
    ctx.translate(wx, wy);

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
  function renderMeteorZones(ctx, pilot) {
    const zones = pilot?.astra?.meteorZones;
    if (!Array.isArray(zones) || !zones.length || !ctx) return;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    ctx.save();
    for (const z of zones) {
      if (!z || !(z.life > 0) || !Number.isFinite(z.x) || !Number.isFinite(z.y)) continue;
      const radius = Math.min(280, Math.max(24, z.radius || BASE.meteorRadius));
      const fade = Math.min(1, z.life / Math.min(0.6, z.maxLife || BASE.meteorZoneDuration));

      ctx.save();
      ctx.translate(z.x, z.y);

      // 1. Translucent Cosmic Cryo-Gravity Crater Fill
      const pulse = Math.sin(timeSec * 4 + z.x * 0.02) * 0.03;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${(0.14 + pulse) * fade})`;
      ctx.fill();

      // 2. Outer Dashed Astral Slow Field Boundary Ring
      ctx.save();
      ctx.rotate(timeSec * 0.45);
      ctx.strokeStyle = `rgba(129, 140, 248, ${0.82 * fade})`;
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#818cf8';
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Inward-Contracting Gravity Ripple Ring (50% slow visual cue)
      const ripplePhase = (timeSec * 0.75) % 1;
      const rippleR = radius * (1 - ripplePhase * 0.68);
      ctx.beginPath();
      ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(192, 132, 252, ${(1 - ripplePhase) * 0.65 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Inner Star-Crater Core & 4 Rotating Time-Dilation Nodes
      const innerR = radius * 0.38;
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168, 85, 247, ${0.15 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(165, 243, 252, ${0.55 * fade})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const a = -timeSec * 0.9 + (i * Math.PI / 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * innerR, Math.sin(a) * innerR, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }
  function renderShield(ctx, pilot) {
    if (!ctx || !pilot || pilot.downed) return;
    const px = Number.isFinite(pilot.x) ? pilot.x : 0;
    const py = Number.isFinite(pilot.y) ? pilot.y : 0;
    const shield = pilot.astraTempShield;
    const hasTempShield = Boolean(shield && shield.remaining > 0 && shield.value > 0);
    const veilRemaining = Number(pilot.astra?.phaseVeilRemaining) || 0;
    const hasVeil = veilRemaining > 0;
    if (!hasTempShield && !hasVeil) return;

    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const timeSec = now * 0.001;

    ctx.save();
    ctx.translate(px, py);

    // A. Prism Veil (折光护幕) Counter-Rotating Diamond Refraction Halo
    if (hasVeil) {
      const veilFade = Math.min(1, veilRemaining / 0.8);
      const veilR = 40 + Math.sin(timeSec * 7) * 2;
      ctx.save();
      ctx.rotate(-timeSec * 1.8);
      ctx.strokeStyle = `rgba(240, 171, 252, ${0.85 * veilFade})`;
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#e879f9';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? veilR : veilR * 0.82;
        const vx = Math.cos(a) * r;
        const vy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // B. Astral Temp Shield (星晶棱镜护盾球: Ward Exit / Star Echo / Phase Self-Guard)
    if (hasTempShield) {
      const val = Math.ceil(shield.value);
      const rem = shield.remaining;
      const fade = Math.min(1, rem / 0.45);
      const pulse = Math.sin(timeSec * 6) * 1.8;
      const baseR = 34 + pulse;

      // 1. Translucent Cyan-Violet Crystalline Dome Fill
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${0.18 * fade})`;
      ctx.fill();

      // 2. Outer High-Contrast Glowing Forcefield Ring
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.92 * fade})`;
      ctx.lineWidth = 2.6;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Rotating Hexagonal Astral Prism Matrix Inside Dome
      ctx.save();
      ctx.rotate(timeSec * 1.15);
      const hexR = baseR * 0.84;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.75 * fade})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * hexR;
        const hy = Math.sin(a) * hexR;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // 6 Glowing Star Nodes on Hexagon Vertices
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * fade})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#67e8f9';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * hexR, Math.sin(a) * hexR, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. Outer Remaining Duration Progress Arc
      const durationRatio = Math.max(0.05, Math.min(1, rem / 3.5));
      ctx.beginPath();
      ctx.arc(0, 0, baseR + 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * durationRatio);
      ctx.strokeStyle = `rgba(165, 243, 252, ${0.95 * fade})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // 5. Overhead Shield Value Badge ("🛡️ 35")
      if (typeof ctx.fillText === 'function') {
        ctx.font = 'bold 11px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(15, 23, 42, ${0.82 * fade})`;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.9 * fade})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, -baseR - 12, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.fillText(`${val}`, 0, -baseR - 11.5);
      }
    }

    ctx.restore();
  }
  window.NeonAstra = Object.freeze({
    BASE, SPELLS, catalog, createState, state, attackScale, regenOnHit,
    tick, cast, finishWard, wardReduction, wardDamageBonus, foldShield, tickShields, incomingDamage, blink, renderWard, renderMeteorZones, renderShield
  });
})();
