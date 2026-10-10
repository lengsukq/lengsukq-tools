/* Run: node tests/imaginative-games.smoke.cjs
 * Actually play and finish every stage, not just count the menu buttons.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function launch(file, debugCode){
  const html=fs.readFileSync('public/Game/'+file,'utf8');
  assert.match(html,/<meta name="viewport"/);
  assert.doesNotMatch(html,/<script[^>]+src=/i,'Game must be independent of external scripts');
  const nodes=new Map(),winListeners={},frameCallbacks=[];
  function element(id=''){
    const events={},classes=new Set();
    const node={
      id,events,children:[],dataset:{},style:{},hidden:id==='next',textContent:'',
      classList:{add(s){classes.add(s)},remove(s){classes.delete(s)},contains(s){return classes.has(s)}},
      addEventListener(type,fn){events[type]=fn},
      setAttribute(name,val){node[name]=val},
      click(){events.click?.()},
      append(...items){this.children.push(...items)},
      appendChild(x){this.children.push(x)},
      replaceChildren(...items){this.children=items},
      focus(){},
    };
    return node;
  }
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(){}});
      return()=>{};
    },set(target,key,value){target[key]=value;return true}
  });
  const dirs=['up','down','left','right'].map(dir=>{const e=element();e.dataset.dir=dir;return e});
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},
    createElement:()=>element(),
    querySelectorAll(s){return s==='[data-dir]'?dirs:[]}
  };
  document.getElementById('garden').getContext=()=>ctx;
  const storage=new Map(),window={addEventListener(type,fn){winListeners[type]=fn}};
  const sandbox={window,document,console,Math,Date,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    requestAnimationFrame(callback){frameCallbacks.push(callback)},
    performance:{now:()=>1}};
  vm.createContext(sandbox);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  const script=scripts[0][1].replace(/\}\)\(\);\s*$/,debugCode+'\n})();');
  new vm.Script(script,{filename:file});
  vm.runInContext(script,sandbox);
  assert.equal(typeof sandbox.window.__debug,'object','Test must introspect stage constraints');
  function key(code){winListeners.keydown({code,repeat:false,preventDefault(){}})}
  function frames(count=2){
    for(let i=0;i<count;i++){const cb=frameCallbacks.shift();assert.ok(cb);cb(60+i*16)}
  }
  return {$:document.getElementById.bind(document),window,storage,key,frames,dirs};
}

const theatre=launch('echo_theatre.html','window.__debug={scenes,shortest,START,DIRS};');
assert.equal(theatre.window.__debug.scenes.length,30);
assert.equal(new Set(theatre.window.__debug.scenes.map(lv=>JSON.stringify({pads:lv.pads,door:lv.door,exit:lv.exit,walls:lv.walls}))).size,30,
  'Every theatre scene needs a distinct playable layout');
const moveCodes={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
for(let n=0;n<30;n++){
  const lv=theatre.window.__debug.scenes[n];
  assert.equal(lv.pads.length,n<10?1:n<20?2:3,'Each act adds echo actors');
  for(const pad of lv.pads){
    const path=theatre.window.__debug.shortest(lv,[1,3],pad);
    assert.ok(Array.isArray(path),'Each echo pad must be reachable in scene '+n);
    path.forEach(d=>theatre.key(moveCodes[d]));
    theatre.$('seal').click();
  }
  // Every recorded echo replays its entire path, then holds its switch.
  for(let wait=0;wait<30;wait++)theatre.$('wait').click();
  const toDoor=theatre.window.__debug.shortest(lv,[1,3],[4,lv.door[1]]);
  const fromDoor=theatre.window.__debug.shortest(lv,[6,lv.door[1]],lv.exit);
  assert.ok(toDoor&&fromDoor,'Gate and exit must be reachable');
  toDoor.forEach(d=>theatre.key(moveCodes[d]));
  theatre.key('ArrowRight');theatre.key('ArrowRight');
  fromDoor.forEach(d=>theatre.key(moveCodes[d]));
  assert.equal(theatre.$('next').hidden,false,'Theatre scene '+(n+1)+' must be beatable');
  assert.equal(theatre.$('scene').textContent,String(n+1).padStart(2,'0'));
  if(n<29)theatre.$('next').click();
}
assert.equal(theatre.storage.get('echo_theatre_unlocked'),'30','All 30 stages should unlock and persist');
theatre.$('next').click();
assert.equal(theatre.$('scene').textContent,'01','Completed theatre loops to first scene');

const garden=launch('echo_greenhouse.html','window.__debug={levels,phases:()=>phases,rotate,result};');
assert.equal(garden.window.__debug.levels.length,30);
garden.frames();
for(let n=0;n<30;n++){
  const lv=garden.window.__debug.levels[n];
  assert.equal(lv.seeds.length,n<10?2:n<20?3:5);
  // The intended chord must be reachable and must be the only possible chord.
  let solutions=0;
  for(let a=0;a<7;a++)for(let b=0;b<7;b++)for(let c=0;c<(lv.active===2?1:7);c++){
    const phases=[a,b,c];
    if(lv.seeds.every(s=>(s.offset+s.coeff.reduce((sum,k,i)=>sum+k*phases[i],0))%7===s.target))solutions++;
  }
  assert.equal(solutions,1,'Every greenhouse chapter needs one uniquely identifiable chord');
  const controls=garden.$('lanterns').children;
  assert.equal(controls.length,3);
  assert.equal(controls[2].children[1].children[2].disabled,n<10);
  for(let i=0;i<lv.active;i++){
    // Click the real "+" control; never set solution phases directly.
    for(let step=0;step<lv.answer[i];step++){
      const buttons=garden.$('lanterns').children[i].children[1].children;
      buttons[2].click();
    }
  }
  assert.equal(garden.$('next').hidden,false,'Greenhouse chapter '+(n+1)+' must be beatable');
  assert.match(garden.$('flowers').textContent,new RegExp('^'+lv.seeds.length+' / '+lv.seeds.length+'$'));
  if(n<29)garden.$('next').click();
}
assert.equal(garden.storage.get('echo_greenhouse_unlocked'),'30');
garden.$('next').click();
assert.equal(garden.$('chapter').textContent,'01');

console.log('Imaginative games smoke passed: 30 temporal ghost-gate scenes and 30 sound-interference gardens, solved through real UI controls.');
