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
    const marked = window.NeonPhantom?.isMarked ? window.NeonPhantom.isMarked(pilot, enemy, game.survivalTime || 0) : false;
    const executeLvl = rank(pilot,'execute_master');
    const executeBonus = executeLvl * ((hpPercent < .35 || marked) ? 0.15 : 0);
    const scale = window.NeonPhantom?.attackScale?.(pilot) || (pilot.dmgMultiplier || 1);
    // Includes the co-op link's crit aura, which used to be computed and
    // discarded -- see js/network/resonance.js.
    const isCrit = Math.random() < Math.min(1,
      (window.NeonPhantom?.critBonus(pilot,game.survivalTime || 0) || 0) +
      (game.lanCoop?.getLinkCrit?.(pilot) || 0));
    game.dealDamage(enemy,base * (1 + executeBonus) * scale,source,isCrit,pilot);
    const gatherLvl = rank(pilot,'soul_gatherer');
    if (gatherLvl > 0 && marked) {
      const pState = window.NeonPhantom?.state(pilot);
      if (pState && pState.dashCharges < (pState.maxDashCharges || 4)) {
        pState.dashRecharge = (pState.dashRecharge || 0) + 0.15 * gatherLvl;
      }
    }
    window.NeonPhantom?.addEctoplasm(pilot,1 + gatherLvl);
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
        damage(pilot,game,first,Math.min(420,95+level*28+Math.min(180,
          (first.maxHp || first.hp)*.018)),'phantom_possession');
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
      const overflow = Math.min(2, Math.max(0, p.warpUpgrades?.charge_overflow || pilot.dashUpgrades?.charge_overflow || 0));
      p.maxEctoplasm=100+rank(pilot,'phantom_core')*8+overflow*25;
      if(rank(pilot,'death_reversal')>=1 && !pilot.cheatDeathUsed)pilot.hasCheatDeath=true;
      // Recompute from registered base each tick; no permanent low-HP stacking.
      const base=(window.NeonShips?.get('phantom')?.baseStats.regen ?? .75) +
        (pilot.passives?.armor || 0)*1.8;
      const armorLvl = rank(pilot,'stealth_armor');
      const isLowHp = pilot.hp < pilot.maxHp*.45;
      const isShift = Boolean(p.shiftActive);
      const extra = (isLowHp || isShift) ? armorLvl * 0.35 : 0;
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
