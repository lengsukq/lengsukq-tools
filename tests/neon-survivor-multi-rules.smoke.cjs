/* Run: node tests/neon-survivor-multi-rules.smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = 'public/Game/neon-survivor/js/network/';
const context = {window:{},console};
vm.createContext(context);
for(const script of ['multiplayer-rules','experience']){
  vm.runInContext(fs.readFileSync(root+script+'.js','utf8'),context);
}
const rules=context.window.NeonLanMultiRules;
const xp=context.window.NeonLanExperience;
const make=(id,x=0)=>({
  id,shipId:'riftblade',x,y:0,hp:100,maxHp:100,level:1,
  passives:{},pendingUpgrades:0,xp:0,xpNeeded:100
});
const game={
  state:'playing',player:make('host',0),lanCoop:{rtc:{connected:true,role:'host'},
    allies:new Map([['guest',make('guest',100)],
      ['guest-2',make('guest-2',200)],['guest-3',make('guest-3',300)]])},
  gameOver(){this.state='gameover'}
};
game.lanCoop.ally=game.lanCoop.allies.get('guest');
const guests=[...game.lanCoop.allies.values()];
game.player.level=3;game.player.xp=15;game.player.xpNeeded=75;
xp.synchronizeLevel(game);
for(const pilot of guests){
  assert.equal(pilot.level,3);
  assert.equal(pilot.pendingUpgrades,2);
  assert.equal(pilot.xp,15);
}
game.player.level=3;
xp.synchronizeLevel(game);
assert.equal(guests[1].pendingUpgrades,2,'Do not double-award credits');
assert.equal(xp.collector(game,{x:201,y:0}),guests[1]);
game.player.hp=0;
rules.tick(game,guests,.1);
assert.equal(game.player.downed,true,'Host can be incapacitated while others survive');
assert.equal(game.state,'playing');
const first=game.player.reviveDuration;
assert.equal(first,8);
const rescueSummary=rules.summary(game);
assert.equal(rescueSummary.fallen,'host');
assert.equal(rescueSummary.downedCount,1);
for(let i=0;i<81;i++)rules.tick(game,guests,.1);
assert.equal(game.player.downed,false);
assert.equal(game.player.hp,40);
assert.equal(game.player.invulnTimer,2);
// Parallel downed pilots must each have separate timers, not overwrite a
// singleton stand state used by the legacy two-player co-op mode.
guests[0].hp=0;guests[1].hp=0;
rules.tick(game,guests,.1);
assert.equal(guests[0].downed,true);
assert.equal(guests[1].downed,true);
assert.ok(guests[1].reviveDuration>guests[0].reviveDuration);
assert.equal(rules.summary(game).downedCount,2);
// The room ends only once no *connected* participant survives.
game.player.hp=0;
guests[2].hp=0;
rules.tick(game,guests,.1);
assert.equal(game.state,'gameover');
console.log('Multiplayer rules passed: 4-player shared XP, individual cards, simultaneous knockdowns and recovery.');
