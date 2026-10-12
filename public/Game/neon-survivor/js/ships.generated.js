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

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Celestial astrolabe halo ring suspended behind the starship
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.45)' : 'rgba(182,154,255,0.6)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-8, 0, 19, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.stroke();

    // Celestial orbit motes
    ctx.fillStyle = downed ? '#ff617e' : '#e4d8ff';
    ctx.shadowColor = '#e4d8ff';
    ctx.beginPath();
    ctx.arc(-18, -13, 2.2, 0, Math.PI * 2);
    ctx.arc(-18, 13, 2.2, 0, Math.PI * 2);
    ctx.arc(-26, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main star-shuttle crystalline hull
    ctx.fillStyle = '#110a26';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = strokeColor;
    ctx.beginPath();
    ctx.moveTo(27, 0);              // Slender astral spearhead
    ctx.lineTo(8, -6);
    ctx.lineTo(-4, -13);
    ctx.lineTo(-18, -23);           // Swept ethereal wing left
    ctx.lineTo(-14, -7);
    ctx.lineTo(-17, 0);             // Tail cusp
    ctx.lineTo(-14, 7);
    ctx.lineTo(-18, 23);            // Swept ethereal wing right
    ctx.lineTo(-4, 13);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Sacred geometric prism rune inlays
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = downed ? 'rgba(255,97,126,0.6)' : '#d5c4ff';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(2, -5);
    ctx.lineTo(-10, 0);
    ctx.lineTo(2, 5);
    ctx.closePath();
    ctx.stroke();

    // 4. Central celestial singularity core
    ctx.beginPath();
    ctx.arc(3, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = downed ? '#ff617e' : '#cbbaff';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#d9b3ff';
    ctx.fill();

    // Radiant core inner focus
    ctx.beginPath();
    ctx.arc(3, 0, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 5. Stardust slipstream comet tails (ethereal propulsion)
    const drift = downed ? 4 : (9 + Math.random() * 7);
    ctx.strokeStyle = downed ? '#ff617e' : 'rgba(182,154,255,0.85)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#b69aff';
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-16 - drift * 0.9, -6);
    ctx.moveTo(-17, 0);
    ctx.lineTo(-17 - drift * 1.3, 0);
    ctx.moveTo(-16, 4);
    ctx.lineTo(-16 - drift * 0.9, 6);
    ctx.stroke();

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
    meteorCost: 50, meteorCooldown: 10, meteorDamage: 110,
    meteorRadius: 125, meteorMaxTargets: 12,
    wardCost: 60, wardCooldown: 16, wardDuration: 5,
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
    star_weave: ['◇','星梭射击命中后布置星锚，连线切割敌潮',
      ['发射星梭，最多2个星锚，节点间造成连线伤害',
       '星梭射速提高，连线伤害+25%',
       '最多3个星锚，组成完整三角星网',
       '延长星锚持续时间，扩大星网命中宽度',
       '星网收束：每6秒触发一次范围坍缩爆发']],
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
      ['每秒额外恢复0.65星能','每秒额外恢复1.3星能',
       '每秒额外恢复1.95星能','每秒额外恢复2.6星能','每秒额外恢复3.25星能']],
    weave_focus: ['◈','缩短武器与两种主动术式的冷却时间',
      ['法术冷却-6%','法术冷却-12%','法术冷却-18%',
       '法术冷却-24%','法术冷却-30%']],
    shield_refraction: ['◈','承受被护盾阻挡的攻击时周期性反击',
      ['每4秒最多触发一次伤害折射','增加折射伤害',
       '强化反制伤害','更多伤害被折射','高级折光反制']],
    star_mark_hunt: ['⌖','攻击带星痕的目标可以造成更多伤害',
      ['标记目标伤害+8%','标记目标伤害+16%','标记目标伤害+24%',
       '标记目标伤害+32%','标记目标伤害+40%']],
    glyph_extent: ['◌','扩大范围法阵和魔法攻击的覆盖面积',
      ['范围+10%','范围+20%','范围+30%','范围+40%','范围+50%']],
    danger_resonance: ['⚑','低生命值时提高输出并增强自身伤害减免',
      ['低生命攻击+8%及减伤+2%','低血攻击+16%及减伤+4%',
       '低血攻击+24%及减伤+6%','低血攻击+32%及减伤+8%',
       '低血攻击+40%及减伤+10%']],
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
    const reward = Math.min(s.hitBudgetRemaining,
      [3, 4, 5][Math.max(0, Math.min(2, s.talentLevel - 1))], s.maxMana - s.mana);
    s.hitBudgetRemaining -= reward;
    s.mana += reward;
    return reward;
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
    s.mana = Math.min(s.maxMana, s.mana + m.manaRegen * dt);
    for (const spell of Object.values(SPELLS)) {
      s.cooldowns[spell] = Math.max(0, s.cooldowns[spell] - dt);
    }
    s.wardRemaining = Math.max(0, s.wardRemaining - dt);
    if (s.wardRemaining <= 0) s.wardHarmonyBonus = 0;
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
    const cost = spell === SPELLS.meteor ? BASE.meteorCost : BASE.wardCost;
    if (s.mana < cost || s.cooldowns[spell] > 0) return false;
    if (spell === SPELLS.meteor) {
      const enemies = (game.enemies || []).filter(enemy => !enemy.dead && enemy.hp > 0);
      let focus = null, nearest = 650;
      for (const e of enemies) {
        const d = Math.hypot(e.x - pilot.x, e.y - pilot.y);
        if (d < nearest) { focus = e; nearest = d; }
      }
      if (!focus) return false; // Do not spend mana on an empty battlefield.
      s.mana -= cost; // Hit-driven energy must not be lost against a full pre-cast bar.
      const targets = enemies.filter(e => within(e, focus, BASE.meteorRadius * m.areaFactor))
        .sort((a, b) => Math.hypot(a.x - focus.x, a.y - focus.y) -
          Math.hypot(b.x - focus.x, b.y - focus.y))
        .slice(0, BASE.meteorMaxTargets);
      for (const enemy of targets) {
        game.dealDamage(enemy, BASE.meteorDamage * (pilot.dmgMultiplier || 1) *
          m.dangerBonus * (1 + harmonyBonus),
          'astra_meteor', false, pilot);
        regenOnHit(pilot, enemy, game.survivalTime || 0);
      }
      window.NeonAstraVisual?.emit(pilot,'burst',focus,null,
        BASE.meteorRadius * m.areaFactor,.6);
      if ((game.shockwaves?.length || 0) < 40) game.shockwaves?.push({
        x: focus.x, y: focus.y, radius: 12, maxRadius: BASE.meteorRadius,
        color: '#b38dff', alpha: .95
      });
    } else {
      s.mana -= cost;
      s.wardRemaining = BASE.wardDuration + (alternating ? m.harmony * .2 : 0);
      s.wardX = pilot.x;
      s.wardY = pilot.y;
      s.wardHarmonyBonus = alternating ? m.harmony * .012 : 0;
      window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,
        BASE.wardRadius * m.areaFactor,.8);
    }
    if (alternating && m.harmony > 0)
      window.NeonAstraVisual?.emit(pilot,'shield',pilot,null,50,.7);
    if (arcane) arcane.harmonyLast = spell;
    s.cooldowns[spell] = (spell === SPELLS.meteor ? BASE.meteorCooldown :
      BASE.wardCooldown) * m.cooldownFactor;
    return true;
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
    foldShield(pilot, game, timeSeconds);
    window.NeonAstraArsenal?.onBlink(pilot, game, timeSeconds);
    return true;
  }
  function renderWard(ctx, pilot) {
    const s = pilot?.astra;
    if (!s || s.wardRemaining <= 0) return;
    const radius = BASE.wardRadius * modifiers(pilot).areaFactor;
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.wardX, s.wardY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(155, 111, 239, .07)';
    ctx.fill();
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = 'rgba(177, 133, 248, .72)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  window.NeonAstra = Object.freeze({
    BASE, SPELLS, catalog, createState, state, regenOnHit,
    tick, cast, wardReduction, foldShield, tickShields, incomingDamage, blink, renderWard
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

  function createState() {
    return { anchors: [], fireElapsed: 0, linkElapsed: 0,
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
      const target = closest(enemies, pilot);
      if (target) {
        applyDamage(game, pilot, target, 28, 'astra_weave_bolt', true);
        // The signature weapon must activate the class's marked-target passive
        // without requiring a second specific weapon (star_fragments).
        if ((pilot.passives?.star_mark_hunt || 0) > 0)
          window.NeonAstraArsenal?.markEnemy(pilot,target,(game.survivalTime||0)+3);
        const angle = s.serial++ * 2.3999632;
        const newAnchor = { x: target.x + Math.cos(angle) * 25,
          y: target.y + Math.sin(angle) * 25, life: level >= 4 ? 5 : 4 };
        const maxAnchors = level >= 3 ? 3 : 2;
        if (s.anchors.length >= maxAnchors) s.anchors.shift();
        s.anchors.push(newAnchor);
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
    if (!s?.anchors?.length) return;
    ctx.save();
    ctx.strokeStyle = '#a778ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = .7;
    for (const [a, b] of linkedPairs(s.anchors)) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const anchor of s.anchors) {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#d2afff'; ctx.fill();
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
      manaRegen: 2 + conduit * .65,
      cooldownFactor: clamp(1 - focus * .06, .7, 1),
      areaFactor: 1 + extent * .10,
      markBonus: 1 + mark * .08,
      dangerBonus: low ? 1 + danger * .08 : 1,
      shieldReduction: low ? danger * .02 : 0,
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
  const fade = Math.min(1, fx.life / Math.max(.01,fx.maxLife || .32));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#a783ff';
  ctx.lineWidth = 17 * fade + 2;
  ctx.shadowColor = '#9a7aff';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(fx.x1,fx.y1);
  ctx.lineTo(fx.x2,fx.y2);
  ctx.stroke();
  ctx.strokeStyle = '#e8f9ff';
  ctx.lineWidth = 3;
  ctx.stroke();
  for(const [x,y] of [[fx.x1,fx.y1],[fx.x2,fx.y2]]) {
    ctx.beginPath();
    ctx.arc(x,y,10+24*(1-fade),0,Math.PI*2);
    ctx.stroke();
  }
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

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;

    // 1. Dual-mandible predatory stealth hull (forked needle prongs)
    ctx.fillStyle = '#130826';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(25, -4);             // Port forward strike fang
    ctx.lineTo(21, 0);              // Central notch
    ctx.lineTo(25, 4);              // Starboard forward strike fang
    ctx.lineTo(14, 9);
    ctx.lineTo(2, 10);
    ctx.lineTo(-6, 23);             // Swept stealth gull wing right
    ctx.lineTo(-14, 19);
    ctx.lineTo(-9, 7);
    ctx.lineTo(-16, 3);
    ctx.lineTo(-12, 0);             // Tail keel
    ctx.lineTo(-16, -3);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-14, -19);
    ctx.lineTo(-6, -23);            // Swept stealth gull wing left
    ctx.lineTo(2, -10);
    ctx.lineTo(14, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Negative-space void vents (hollow energy conduits inside the wings)
    ctx.fillStyle = downed ? 'rgba(255,97,126,0.3)' : 'rgba(0,240,255,0.25)';
    ctx.strokeStyle = downed ? '#ff617e' : 'rgba(0,240,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-8, -17);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-5, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-8, 17);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Symbiote docking nodes (tactical clamp anchors on wings)
    ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.arc(-4, -13, 2.0, 0, Math.PI * 2);
    ctx.arc(-4, 13, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Central ocular soul core (spectral eye)
    ctx.beginPath();
    ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = downed ? '#ff617e' : '#a855f7';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#a855f7';
    ctx.fill();

    // Vertical slit pupil ocular gleam
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(3, 0, 1.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Twin ethereal phosphor exhaust plumes
    const plume = downed ? 4 : (9 + Math.random() * 7);
    ctx.fillStyle = downed ? '#ff617e' : '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-13 - plume, -7);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-13, 6);
    ctx.lineTo(-13 - plume, 7);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Violet trailing sparks
    if (!downed) {
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(-17 - plume * 0.7, -4, 1.4, 0, Math.PI * 2);
      ctx.arc(-17 - plume * 0.7, 4, 1.4, 0, Math.PI * 2);
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
    spectral_extend: '每级延长潜行持续时间0.5秒',
    soul_detonation: '提高烙印引爆范围与伤害',
    charge_overflow: '提升可用潜行次数，最多3段',
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
      shiftTrail: [], shiftTrailTimer: 0, shiftFlash: 0, reapFlash: 0
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
    if (s.dashCharges < 1 || s.shiftActive) return false;

    s.dashCharges--;
    s.shiftActive = true;
    const extraDuration = (s.warpUpgrades.spectral_extend || 0) * 0.5;
    s.shiftRemaining = BASE.shiftDuration + extraDuration;
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

  function markEnemy(pilot, enemy, timeSeconds) {
    const s = state(pilot);
    if (!validPilot(pilot) || !s || !enemy || enemy.dead || enemy.hp <= 0) return false;
    if (!s.shiftActive) return false;
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

    // Handle shift duration
    if (s.shiftActive) {
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
      if (s.shiftRemaining <= 0) {
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
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.4;

    for (const pilot of pilots) for (const [enemy, expireAt] of (pilot?.phantom?.marks || new Map()).entries()) {
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
            window.NeonPhantomVisual?.tick(pilot,dt);
            tick(pilot, game, dt);
            window.NeonPhantomScythe?.tick(pilot, game, dt);
            window.NeonPhantomArsenal?.tick(pilot, game, dt);
          },
          onAction(pilot, game, action) {
            if (action?.kind === 'warp') return state(pilot)?.shiftActive ?
              finishShift(pilot,game,true) : enterShift(pilot,game);
            if (action === 'shift') return enterShift(pilot, game);
            if (action === 'reap') return finishShift(pilot, game, true);
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
    addEctoplasm, critBonus, enterShift, finishShift, markEnemy, reap,
    canDock, dock, undock, carrierDamageReduction, tick, renderMarks
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
    const damage = 18 + (level - 1) * 5;
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
    for (const sc of s.scythes) {
      ctx.save();
      ctx.translate(sc.x, sc.y);
      const spin = (sc.phase === 'hover') ? (now * 0.02) : (sc.angle + now * 0.012);
      ctx.rotate(spin);

      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.2;
      ctx.fillStyle = '#180b2b';

      // Twin curved scythe blades
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 0.85);
      ctx.lineTo(2, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 16, Math.PI, Math.PI * 1.85);
      ctx.lineTo(-2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing center eye
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.fill();

      // If hovering, draw expanding pulse ring
      if (sc.phase === 'hover') {
        const pulse = (now * 0.008) % 1;
        ctx.beginPath();
        ctx.arc(0, 0, 14 + pulse * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - pulse})`;
        ctx.lineWidth = 1.5;
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
    const execute = (rank(pilot,'execute_master') * (hpPercent < .35 ? .08 : 0));
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
  const trail = Array.isArray(spectral.shiftTrail) ? spectral.shiftTrail.slice(0,10) : [];
  if (!trail.length && !(spectral.reapFlash > 0) && !(spectral.shiftFlash > 0)) return;
  ctx.save();
  ctx.lineCap = 'round';
  for(let i=0;i<trail.length;i++) {
    const point=trail[i];
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
    const fade=Math.min(1,Math.max(0,(point.life||0)/.42));
    ctx.globalAlpha=fade*.48;
    ctx.fillStyle=i%2?'#7e3ad5':'#00f0ff';
    ctx.beginPath();
    ctx.arc(point.x,point.y,7+fade*9,0,Math.PI*2);
    ctx.fill();
    if(i) {
      const prev=trail[i-1];
      ctx.strokeStyle='#b967ff';
      ctx.lineWidth=2+fade*7;
      ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(point.x,point.y);ctx.stroke();
    }
  }
  const pulse=spectral.reapFlash>0?spectral.reapFlash:spectral.shiftFlash;
  if(pulse>0&&Number.isFinite(spectral.x)&&Number.isFinite(spectral.y)) {
    ctx.globalAlpha=Math.min(.9,pulse*3);
    ctx.strokeStyle=spectral.reapFlash>0?'#d38aff':'#00f0ff';
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=14;
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(spectral.x,spectral.y,25+(1-pulse/.28)*65,0,Math.PI*2);ctx.stroke();
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
