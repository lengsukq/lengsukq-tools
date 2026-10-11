/* ASTRA / 星织·织界术师 — headless, host-authoritative ability foundation.
 * NOT enabled in the live character selector yet: the full 9+8+7 ability
 * implementations, platform controls and LAN protocol belong to V5/V6.
 * This file supplies pure combat rules that can be tested before wiring UI.
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
      lastBrandAt: -Infinity
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
    s.talentLevel = level >= 12 ? 3 : level >= 6 ? 2 : 1;
    s.maxMana = m.maxMana;
    s.mana = Math.min(s.maxMana, s.mana + m.manaRegen * dt);
    for (const spell of Object.values(SPELLS)) {
      s.cooldowns[spell] = Math.max(0, s.cooldowns[spell] - dt);
    }
    s.wardRemaining = Math.max(0, s.wardRemaining - dt);
    if (s.wardRemaining <= 0) s.wardHarmonyBonus = 0;
    s.phaseVeilRemaining = Math.max(0, s.phaseVeilRemaining - dt);
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
    }
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
    s.blinkCharges--;
    pilot.x += dx / length * BASE.blinkDistance;
    pilot.y += dy / length * BASE.blinkDistance;
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
