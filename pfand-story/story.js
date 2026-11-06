// ================= STORY: Pfand — die vergessene Flasche ist ein Geschenk (nur nicht für dich) =================
// Object cast (Flaschi + bottle extras + Herr Groschen). Light arc: supermarket day -> Leergut neon -> machine red -> dusk park -> night vault -> cellar bulb.
const STORY={
  title:['DIESE FLASCHE','IST MEHR WERT ALS IHR INHALT'],
  keywords:['neunzehn','fünfundzwanzig','Fünfundzwanzig','stolz','zurück','piep','Bon','plattgedrückt','Moment','Rest','Gebüsch','Hausmüll','Keller','bezahlt','keiner','Hersteller','Milliarden','Millionen','Müll','Geschenk','dich'],
  rim:{regal:'#e8f4ff',automat:'#d8ffe8',presse:'#ffb0a0',groschen:'#e8f4ff',park:'#ffc890',tresor:'#ffe0a0',keller:'#ffd8a0'},
};
const FL=0.85; // Flaschi scale
function tiles(a,b,rx,ry){return tiled(256,256,rx,ry,g=>{g.fillStyle=a;g.fillRect(0,0,256,256);g.fillStyle=b;g.fillRect(0,0,128,128);g.fillRect(128,128,128,128);g.strokeStyle='rgba(0,0,0,0.08)';g.lineWidth=4;g.strokeRect(0,0,256,256);});}
function miniBottle(p,x,y,z,col,cap,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);p.add(g);const m=M(col);cyl(0.06,0.06,0.2,m,0,0.1,0,g,10);cyl(0.06,0.025,0.06,m,0,0.23,0,g,10);cyl(0.022,0.022,0.03,M(cap),0,0.275,0,g,8);box(0.125,0.06,0.125,M('#ffffff'),0,0.11,0,g).castShadow=false;return g;}
function shelfUnit(sc,x,z,len,ry,seed){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;sc.add(g);const wood=M('#e8e2d6'),dark=M('#9aa4b2');
  box(len,2.3,0.08,wood,0,1.15,-0.28,g);[0.12,0.62,1.12,1.62,2.12].forEach(y=>box(len,0.05,0.6,dark,0,y,0,g));[-len/2,len/2].forEach(px=>box(0.06,2.3,0.62,dark,px,1.15,0,g));
  const cols=[['#a8dcf8','#2a6ad8'],['#5a2a14','#c4281f'],['#ffa82a','#2a9a4a'],['#c8f0c0','#2a8a3a'],['#f2f2f2','#e83a8a']];
  [0.15,0.65,1.15,1.65].forEach((y,r)=>{for(let i=0;i<Math.floor(len/0.17);i++){const c=cols[(Math.floor(i/5)+r+seed)%cols.length];miniBottle(g,-len/2+0.12+i*0.17,y,0.05*((i+r)%2),c[0],c[1]);}});return g;}
function priceTag(parent,w,h,big,small,col='#ffe23a'){return new Flat(parent,w,h,Math.round(w*400),Math.round(h*400),g=>{const W2=Math.round(w*400),H2=Math.round(h*400);g.fillStyle=col;g.fillRect(0,0,W2,H2);g.strokeStyle='#1c1410';g.lineWidth=10;g.strokeRect(5,5,W2-10,H2-10);
  text(big,W2/2,H2*0.45,H2*0.42,'#c4281f',{ol:false});if(small)text(small,W2/2,H2*0.82,H2*0.17,'#1c1410',{ol:false});},{lit:true});}

// ---------- 1 REGAL: water 0,19 € — the bottle 0,25 € ----------
function market(sc){sc.background=gradBg(['#e8eef8','#c8d0dc']);room(sc,{w:12,d:14,h:4.6,wall:plainNoise('#b8ccd8',3,1,'#3a4a5a',0.06),floor:tiles('#b8b0a4','#968e82',8,10)});const stp=mesh(new THREE.PlaneGeometry(1.0,14),M('#2a8ae8'),0,0.004,-4,sc);stp.rotation.x=-Math.PI/2;stp.castShadow=false;box(12,0.9,0.05,M('#2a8ae8'),0,0.45,-10.75,sc);
  shelfUnit(sc,-2.4,-3.6,5.5,Math.PI/2,0);shelfUnit(sc,2.4,-3.6,5.5,-Math.PI/2,2);shelfUnit(sc,-2.4,-9.2,5.5,Math.PI/2,1);shelfUnit(sc,2.4,-9.2,5.5,-Math.PI/2,3);
  for(let i=0;i<4;i++){const z=-1-i*3;const l=box(0.3,0.06,2.4,E('#ffffff'),0,4.5,z,sc);l.castShadow=false;const gl=glowSprite('#f0f8ff',2.2,0.35);gl.position.set(0,4.4,z);sc.add(gl);}
  const hs=new Flat(sc,2.4,0.7,720,210,()=>{rr(8,8,704,194,30);fillS('#2a8ae8',8);text('GETRÄNKE',360,112,110,'#ffffff',{ol:false});});hs.mesh.position.set(0,3.7,-5.5);hs.update(0,1);
  lightsBasic(sc,{hemi:['#f4f8ff','#6a6458',0.8],sun:{c:'#fff0d8',i:0.5,p:[6,8,3],t:[0,0,-3],r:12}});}
DEF.regal={build(){const sc=new THREE.Scene();market(sc);
  const fl=new Toon2D(sc,-0.9,-2.2,{},FL,{kind:'flaschi'});
  const tag=priceTag(sc,0.62,0.36,'0,19 €','WASSER 1,5 L');tag.mesh.position.set(-2.06,1.2,-1.9);tag.mesh.rotation.y=Math.PI/2;tag.update(0,1);
  const pf=badge(sc,1.5,0.42,'+ 0,25 € PFAND','#ffffff','#ff8a2a');
  const cmp=new Flat(sc,1.6,0.9,640,360,(g,lt)=>{g.fillStyle='#ffffff';g.fillRect(0,0,640,360);g.strokeStyle='#1c1410';g.lineWidth=12;g.strokeRect(6,6,628,348);text('INHALT',170,90,52,'#2a6ad8',{ol:false});text('FLASCHE',470,90,52,'#ff8a2a',{ol:false});
    text('0,19 €',170,200,84,'#1c1410',{ol:false});text('0,25 €',470,200,84,'#1c1410',{ol:false});text('<',320,200,110,'#c4281f',{ol:false});text('MEHR WERT ALS DER INHALT',320,305,34,'#c4281f',{ol:false});},{bill:true});
  const spark=particlesSprites(sc,20,'#fff27a',0.12,1,THREE.AdditiveBlending);
  const t={wasser:WT('Wasser','regal'),neun:WT('neunzehn','regal'),die:WT2('Die','regal',2.3),selbst:WT('selbst','regal'),fuenf:WT('fünfundzwanzig','regal'),flaschi:WT('Flaschi','regal'),mehr:WT('mehr','regal'),und:WT2('Und','regal',7.5),stolz:WT('stolz','regal')};
  fl.plan([{type:'g',g:'point',t:t.fuenf-0.5},{type:'g',g:'nod',t:t.mehr}]);
  return {sc,anchors:{fl},grade:{mul:'#d8e0ec',a:0.12,vig:0.22,vigCol:'#20283a'},
    shots:[[0,0,['fl:top','fl:feet',[-0.9,2.6,-3.5]],2,4,0],[t.neun-0.3,0,[[-2.06,1.45,-1.9],[-2.06,0.95,-1.9],'fl:face'],34,4,0.9],[t.die-0.3,0,['fl:top','fl:chest',[-0.9,2.25,-2.0]],8,2,0],
      [t.flaschi-0.3,0,['fl:top','fl:feet'],-14,6,0],[t.mehr-0.3,0,[[-1.7,3.45,-2.4],[-0.1,3.45,-2.4],[-0.9,2.5,-2.4],'fl:top'],4,2,0],[t.stolz-0.35,0,['fl:top','fl:chest'],10,2,0.95]],
    update(lt){fl.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.selbst,'raised'],[t.flaschi,'smug'],[t.und,'happy']],2),pose:lt>t.und-0.2?'hips':'down'});
      pf.mesh.position.set(-0.9,2.2,-1.95);popS(pf.mesh,lt,t.fuenf-0.1,1);pf.update(lt,1);cmp.mesh.position.set(-0.9,2.95,-2.4);popS(cmp.mesh,lt,t.mehr-0.1,1);if(lt>t.und-0.3)cmp.mesh.visible=false;cmp.update(lt,1);
      spark.forEach((p,i)=>{const v=((lt-t.stolz+0.3)*0.8+rnd(i))%1;p.visible=lt>t.stolz-0.3;const a=rnd(i*3)*Math.PI*2;p.position.set(-0.9+Math.cos(a)*0.55*(0.6+v),0.9+v*1.0,-2.0+Math.sin(a)*0.2);p.material.opacity=Math.sin(v*Math.PI);});}};}};

// ---------- 2 AUTOMAT: in, beep, receipt, 25 cent ----------
function leergut(sc){sc.background=gradBg(['#e8f2ee','#c8d8d0']);room(sc,{w:9,d:9,h:3.6,wall:tiles('#c8dccf','#b0c8b8',6,3),floor:tiles('#a8b0a8','#8e968e',6,6)});
  for(let i=0;i<2;i++){const l=box(1.6,0.05,0.2,E('#f4fff8'),-1+i*2.4,3.55,-2.5,sc);l.castShadow=false;const gl=glowSprite('#e8fff0',2.4,0.35);gl.position.set(-1+i*2.4,3.45,-2.5);sc.add(gl);}
  const sign=new Flat(sc,2.2,0.6,660,180,()=>{rr(6,6,648,168,26);fillS('#2a9a4a',6);text('LEERGUT',330,96,104,'#ffffff',{ol:false});});sign.mesh.position.set(0,3.0,-5.75);sign.update(0,1);}
function automat(sc,x,z){const g=new THREE.Group();g.position.set(x,0,z);sc.add(g);const body=M('#dfe4ea'),dk=M('#3a4048');
  box(1.8,2.6,0.9,body,0,1.3,0,g).userData.wall=true;box(1.84,0.22,0.94,M('#2a9a4a'),0,2.5,0,g);box(1.4,0.12,0.2,dk,0,0.15,0.45,g);
  const hole=cyl(0.33,0.33,0.1,E('#1a1e24'),0,1.22,0.46,g,32);hole.rotation.x=Math.PI/2;const ring=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.05,10,32),M('#c8ccd4'));ring.position.set(0,1.22,0.47);g.add(ring);
  const hl=new THREE.PointLight('#b8ffd0',0.0,2.2,2);hl.position.set(0,1.22,0.8);g.add(hl);const hg=glowSprite('#b8ffd0',1.1,0);hg.position.set(0,1.22,0.55);g.add(hg);
  const face=new Flat(g,1.3,0.62,520,248,(gg,F)=>{gg.fillStyle='#1a2a22';gg.fillRect(0,0,520,248);gg.save();gg.translate(260,124);gg.scale(1.15,1.15);
    const E2=(F.face==='happy')?'#6aff8a':'#8affc8';gg.fillStyle=E2;[-1,1].forEach(sd=>{gg.beginPath();if(F.eye<0.2){gg.fillRect(sd*80-36,-6,72,12);}else gg.ellipse(sd*80,-10,34,F.face==='stern'?18:30,0,0,7);gg.fill();});
    gg.strokeStyle=E2;gg.lineWidth=12;gg.lineCap='round';[-1,1].forEach(sd=>{gg.beginPath();if(F.face==='stern'){gg.moveTo(sd*120,-62);gg.lineTo(sd*40,-42);}else{gg.moveTo(sd*118,-56);gg.lineTo(sd*42,-60);}gg.stroke();});
    gg.beginPath();if(F.face==='happy'){gg.arc(0,30,46,0.15*Math.PI,0.85*Math.PI);}else{gg.moveTo(-40,54);gg.lineTo(40,54);}gg.stroke();gg.restore();});
  face.mesh.position.set(0,2.0,0.456);
  const disp=new Flat(g,0.5,0.18,250,90,(gg,ok)=>{gg.fillStyle='#0e1a12';gg.fillRect(0,0,250,90);text(ok?'✓ 0,25 €':'BITTE',125,50,46,ok?'#6aff8a':'#8a9a92',{ol:false});});disp.mesh.position.set(0.6,0.7,0.456);
  const slot=box(0.36,0.04,0.06,M('#1a1e24'),-0.5,0.62,0.45,g);
  const bon=new Flat(g,0.3,0.5,180,300,(gg)=>{gg.fillStyle='#fbf8f0';gg.fillRect(0,0,180,300);gg.fillStyle='#1c1410';gg.font='900 22px Nunito';gg.textAlign='center';gg.fillText('LEERGUT',90,40);gg.fillRect(15,54,150,3);gg.font='900 20px Nunito';gg.fillText('1 x PET',90,100);
    gg.fillStyle='#2a9a4a';gg.font='900 42px Nunito';gg.fillText('0,25 €',90,180);gg.fillStyle='#1c1410';gg.font='900 16px Nunito';gg.fillText('AN DER KASSE',90,240);gg.fillText('EINLÖSEN',90,262);},{lit:true});bon.mesh.position.set(-0.5,0.62,0.48);bon.update(0,1);
  return {g,face,disp,bon,hl,hg};}
DEF.automat={build(){const sc=new THREE.Scene();leergut(sc);const A=automat(sc,0,-4.9);
  const q=[['kola',-1.9,-2.6],['saft',-2.6,-1.6],['leer',-3.0,-0.6]].map(([k,x,z],i)=>{const b=new Toon2D(sc,x,z,{},0.8,{kind:k});b.plan([{type:'g',g:i===0?'nod':'wave',t:0.6+i*0.5}]);return b;});
  const fl=new Toon2D(sc,0.9,-2.2,{},FL,{kind:'flaschi'});
  const t={fast:WT('Fast','automat'),rein:WT('Rein','automat'),piep:WT('piep','automat'),bon:WT('Bon','automat'),fuenf:WT('Fünfundzwanzig','automat'),cent:WT('Cent','automat')};
  fl.plan([{type:'walk',t:t.rein-1.0,dur:0.8,from:[0.9,-2.2],to:[0.05,-3.95]}]);
  lightsBasic(sc,{hemi:['#e8fff0','#5a6a60',0.85],sun:{c:'#f4fff8',i:0.48,p:[4,8,4],t:[0,0,-4],r:10}});
  return {sc,anchors:{fl,q0:q[0]},grade:{mul:'#d0e4d8',a:0.12,vig:0.24,vigCol:'#102018'},
    shots:[[0,0,['q0:top','q0:feet',[0,2.8,-4.9],[0,0,-4.5]],-16,6,0],[t.rein-0.3,0,[[0,2.6,-4.9],[0,0,-4.5],'fl:top'],12,4,0],[t.piep-0.3,0,[[0,2.35,-4.45],[0,1.7,-4.45],[0.6,0.6,-4.45]],-6,2,0],
      [t.bon-0.3,0,[[-0.5,0.95,-4.4],[-0.5,0.2,-4.4]],-14,6,0.8],[t.fuenf-0.3,0,[[-0.5,0.42,-4.4],[-0.5,0.12,-4.4]],8,2,0.55]],
    update(lt){q.forEach((b,i)=>b.update(lt,{f:faceAt(lt,[[0,['tired','neutral','sad'][i]]],5+i)}));
      // Flaschi hops into the intake
      const jump=clamp((lt-t.rein-0.15)/0.45);fl.update(lt,{f:faceAt(lt,[[0,'happy'],[t.rein,'shock']],2)});if(jump>0){fl.mesh.position.set(0.05*(1-jump),fl.mesh.position.y+Math.sin(jump*Math.PI)*0.6+jump*0.5,-3.95-jump*0.55);fl.mesh.scale.setScalar(Math.max(0.01,1-jump*0.95));}else fl.mesh.scale.setScalar(1);fl.mesh.visible=jump<0.98;
      const ok=lt>t.piep-0.05;const FF={face:ok?'happy':'stern',eye:(lt%3.1<0.12)?0:1};A.face.update(FF,JSON.stringify(FF));A.disp.update(ok,ok?1:0);
      A.hl.intensity=lt>t.rein&&lt<t.piep+0.4?1.6:0.3;A.hg.material.opacity=lt>t.rein&&lt<t.piep+0.4?0.7:0.15;
      const u=easeOut(clamp((lt-t.bon+0.15)/0.6));A.bon.mesh.visible=lt>t.bon-0.15;A.bon.mesh.position.set(-0.5,0.62-u*0.28,0.48+u*0.04);A.bon.mesh.rotation.x=-0.2*u;}};}};

// ---------- 3 PRESSE: inside the machine, squashed and reborn ----------
DEF.presse={build(){const sc=new THREE.Scene();sc.background=gradBg(['#2a2a34','#141418']);
  room(sc,{w:8,d:8,h:4,wall:plainNoise('#5a5e68',3,1,'#000000',0.1),floor:plainNoise('#3a3e48',3,3,'#000000',0.1)});
  const belt=box(6,0.25,1.4,M('#2a2a30'),0,0.55,-2,sc);for(let i=0;i<14;i++)box(0.05,0.02,1.3,M('#4a4a52'),-3+i*0.45,0.68,-2,sc);
  const rails=[-1,1].forEach(sd=>box(0.2,3.4,0.2,M('#c8a020'),sd*0.9,1.7,-2.3,sc));const head=box(1.9,0.5,1.5,M('#d8b030'),0,2.6,-2,sc);const piston=cyl(0.15,0.15,1.2,M('#c8ccd4'),0,3.4,-2,sc,16);
  for(let i=0;i<6;i++){box(0.3,0.03,1.52,M(i%2?'#1c1c1c':'#f2c42a'),-0.75+i*0.3,-0.26,0,head);}
  const warn=new THREE.PointLight('#ff3a2a',2.0,8,2);warn.position.set(2.2,3.2,-3.6);sc.add(warn);const wg=glowSprite('#ff4a2a',1.4,0.7);wg.position.copy(warn.position);sc.add(wg);sph(0.15,E('#ff4a2a'),2.2,3.2,-3.7,sc);
  const fl=new Toon2D(sc,-1.6,-2,{},0.6,{kind:'flaschi',y:0.68});
  const t={dann:WT('Dann','presse'),platt:WT('plattgedrückt','presse'),neue:WT('neue','presse'),fl:WT('Flaschen','presse')};
  fl.plan([{type:'walk',t:0,dur:t.platt-0.3,from:[-1.6,-2],to:[0,-2]}]);
  const babies=[0,1,2].map(i=>{const b=new Toon2D(sc,1.2+i*0.55,-1.6+i*0.05,{},0.32,{kind:'flaschi',y:0.68});return b;});
  const spark=particlesSprites(sc,24,'#fff27a',0.1,1,THREE.AdditiveBlending);
  lightsBasic(sc,{hemi:['#c8d0ff','#2a2a34',0.9],sun:{c:'#e8f0ff',i:0.8,p:[-3,7,3],t:[0,0.6,-2],r:6}});
  return {sc,anchors:{fl},shakes:[t.platt+0.05],grade:{mul:'#ffd8d0',a:0.04,vig:0.3,vigCol:'#0a0408'},
    shots:[[0,0,[[-1.7,0.6,-2],[0.9,3.0,-2],'fl:top'],-10,6,0],[Math.max(t.platt-0.25,0.9),0,[[0,2.4,-2],[0,0.55,-2],[-1.0,0.6,-2],[1.0,0.6,-2]],34,10,0],[t.neue-0.3,0,[[0.8,0.7,-1.6],[2.6,1.5,-1.6],[0.2,0.7,-2]],14,8,0]],
    update(lt){const hit=clamp((lt-t.platt+0.12)/0.12),up=clamp((lt-t.platt-0.5)/0.6);const hy=2.6-hit*1.5+up*1.5;head.position.y=hy;piston.position.y=hy+0.8;piston.scale.y=1+(2.6-hy)/1.2;
      const sq=lt>t.platt?Math.min(0.9,0.9*clamp((lt-t.platt+0.02)/0.08)):0;fl.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.platt-0.4,'shock'],[t.platt+0.3,'laugh']],2),squash:sq});fl.mesh.visible=lt<t.neue+0.1;
      warn.intensity=1.2+Math.max(0,Math.sin(lt*9))*2.2;wg.material.opacity=0.3+Math.max(0,Math.sin(lt*9))*0.6;
      babies.forEach((b,i)=>{b.update(lt,{f:faceAt(lt,[[0,'happy']],i)});popS(b.mesh,lt,t.neue+i*0.15,1,0.4);});
      spark.forEach((p,i)=>{const v=(lt-t.neue)/0.9;p.visible=v>0&&v<1;if(!p.visible)return;const a=rnd(i)*Math.PI*2;p.position.set(0.1+Math.cos(a)*v*1.0,0.9+Math.sin(a)*v*0.7,-1.9);p.material.opacity=1-v;});}};}};

// ---------- 4 GROSCHEN interrupts ----------
DEF.groschen={build(){const sc=new THREE.Scene();market(sc);const gro=new Toon2D(sc,0.1,-2.3,{},1.0,{kind:'coin'});
  const t={moment:WT('Moment','groschen'),fast:WT('Fast','groschen'),was:WT('Was','groschen')};
  gro.plan([{type:'walk',t:0,dur:0.5,from:[1.4,-2.0],to:[0.1,-2.3]},{type:'g',g:'point',t:t.moment-0.1},{type:'g',g:'shrug',t:t.was}]);
  return {sc,anchors:{gro},grade:{mul:'#d8e0ec',a:0.12,vig:0.22,vigCol:'#20283a'},
    shots:[[0,0,['gro:top','gro:chest'],-8,4,0.95,{follow:'gro'}],[t.was-0.3,0,['gro:top','gro:feet'],10,6,0]],
    update(lt){gro.update(lt,{f:faceAt(lt,[[0,'raised'],[t.fast,'sideeye'],[t.was,'worried']],2),talk:talkAt('groschen',lt)});}};}};

// ---------- 5 PARK (dusk): where the rest ends up ----------
DEF.park={build(){const sc=new THREE.Scene();sky(sc,['#3a3a8a','#c8608a','#ffb070']);
  const gr=mesh(new THREE.PlaneGeometry(40,30),M('#5a8a3a'),0,0,-4,sc);gr.rotation.x=-Math.PI/2;gr.castShadow=false;const path=mesh(new THREE.PlaneGeometry(2.2,30),M('#c8b090'),1.6,0.005,-4,sc);path.rotation.x=-Math.PI/2;path.castShadow=false;
  const bush=new THREE.Group();bush.position.set(-1.0,0,-3.2);sc.add(bush);const bm=M('#3a7a2a'),bm2=M('#4a9a34');[[0,0.55,0,0.75],[-0.6,0.45,0.1,0.55],[0.6,0.45,0.05,0.6],[0.2,0.95,-0.1,0.55],[-0.3,0.9,0.1,0.45]].forEach(([x,y,z,r],i)=>sph(r,i%2?bm:bm2,x,y,z,bush));
  const inBush=new Toon2D(sc,-0.75,-2.35,{},0.5,{kind:'leer'});
  const bin=new THREE.Group();bin.position.set(2.0,0,-2.2);sc.add(bin);cyl(0.32,0.28,0.95,M('#2a6a4a'),0,0.475,0,bin,20);const lid=new THREE.Group();lid.position.set(0,0.96,-0.3);bin.add(lid);const ld=cyl(0.35,0.35,0.06,M('#1f5a3a'),0,0,0.3,lid,20);
  const inBin=new Toon2D(sc,2.0,-2.2,{},0.38,{kind:'kola',y:0.55});
  const house=box(5,4,0.4,M('#ffffff',{map:bricks('#b86a50',3,2)}),-0.5,2,-6.5,sc);house.userData.wall=true;const win=new Flat(sc,0.9,0.5,360,200,()=>{const g=getCtx();const gr=g.createRadialGradient(180,90,10,180,100,200);gr.addColorStop(0,'#ffc878');gr.addColorStop(1,'#3a2210');g.fillStyle=gr;g.fillRect(0,0,360,200);g.fillStyle='#8a5a2a';g.fillRect(70,120,220,70);g.strokeStyle='#1c1410';g.lineWidth=6;g.strokeRect(70,120,220,70);for(let i=0;i<6;i++){const x=90+i*36;g.fillStyle='#d6f0ff';g.beginPath();g.roundRect(x-12,60,24,70,6);g.fill();g.stroke();g.fillStyle='#2a6ad8';g.fillRect(x-6,48,12,14);g.strokeRect(x-6,48,12,14);}});win.mesh.position.set(-1.4,0.35,-6.29);win.update(0,1);[-1.7,-1.55,-1.4,-1.25,-1.1].forEach(x=>box(0.03,0.5,0.05,M('#3a3a3a'),x,0.35,-6.24,sc));
  const crate=new THREE.Group();crate.position.set(-1.4,0.14,-6.36);sc.add(crate);for(let i=0;i<5;i++)miniBottle(crate,-0.3+i*0.15,0,0,'#d6f0ff','#2a6ad8',0.9);const cl=new THREE.PointLight('#ffc070',2.2,2.5,2);cl.position.set(-1.4,0.45,-6.45);const cg=glowSprite('#ffc070',1.0,0.45);cg.position.set(-1.4,0.4,-6.3);sc.add(cg);sc.add(cl);
  lampPost(sc,3.4,-1.2,'#ffc870');[[-2.6,-1.4],[0.6,-1.0]].forEach(([x,z])=>{const b=new THREE.Group();b.position.set(x,0.02,z);b.rotation.z=Math.PI/2;b.rotation.y=rnd(x)*3;sc.add(b);miniBottle(b,0,0,0,'#d6f0ff','#2a6ad8',1.6);});
  const t={liegt:WT('liegt','park'),gebuesch:WT('Gebüsch','park'),haus:WT('Hausmüll','park'),keller:WT('Keller','park')};
  lightsBasic(sc,{hemi:['#ffd8c8','#3a4a6a',1.0],sun:{c:'#ffb070',i:0.9,p:[-9,4,5],t:[0,0.5,-3],r:12}});
  return {sc,anchors:{inBush,inBin},grade:{mul:'#ffd8d0',a:0.04,vig:0.24,vigCol:'#20103a'},
    shots:[[0,0,[[-1.9,1.3,-3.2],[-0.1,0.2,-3.2],'inBush:top'],-10,10,0],[t.haus-0.3,0,[[2.0,1.35,-2.2],[2.0,0.2,-2.2],'inBin:top'],14,8,1.5],[t.keller-0.3,0,[[-1.4,0.75,-6.3],[-1.4,0.05,-6.3]],-6,6,1.0]],
    update(lt){inBush.update(lt,{f:faceAt(lt,[[0,'sad']],3)});lid.rotation.x=-clamp((lt-t.haus+0.4)/0.3)*1.1;inBin.update(lt,{f:faceAt(lt,[[0,'tired']],4)});inBin.mesh.visible=lt>t.haus-0.25;}};}};

// ---------- 6 TRESOR (night, the bottler's vault): unclaimed deposit piles up ----------
DEF.tresor={build(){const sc=new THREE.Scene();sc.background=gradBg(['#141a2a','#0a0c14']);
  room(sc,{w:12,d:12,h:5,wall:plainNoise('#4a5068',3,1,'#000000',0.08),floor:plainNoise('#3a3e4e',3,3,'#000000',0.06)});
  const conv=box(10,0.5,0.8,M('#2a2e3a'),0,0.9,-8.0,sc);const conveyorBottles=[];for(let i=0;i<26;i++)conveyorBottles.push(miniBottle(sc,-5+i*0.4,1.15,-8.0,'#d6f0ff','#2a6ad8',1.4));
  const vault=new THREE.Group();vault.position.set(0,0,-4.2);sc.add(vault);const glass=NO(new THREE.MeshToonMaterial({color:'#e8f6ff',gradientMap:gm,transparent:true,opacity:0.25}));
  const vb=cyl(1.1,1.1,2.6,glass,0,1.3,0,vault,32);vb.castShadow=false;const vs=cyl(1.1,0.35,0.9,glass,0,3.05,0,vault,32);vs.castShadow=false;cyl(0.36,0.36,0.4,glass,0,3.7,0,vault,24).castShadow=false;cyl(0.42,0.42,0.3,M('#c8a020'),0,4.0,0,vault,24);
  cyl(1.2,1.2,0.12,M('#c8a020'),0,0.06,0,vault,32);const COINS=tiled(256,256,3,3,g=>{g.fillStyle='#b8862a';g.fillRect(0,0,256,256);for(let i=0;i<70;i++){const x=rnd(i*3.1)*256,y=rnd(i*7.7)*256,r=14+rnd(i)*10;g.fillStyle=i%3?'#f2c84a':'#d8dce4';g.strokeStyle='#6a4a10';g.lineWidth=3;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();g.strokeStyle='rgba(255,255,255,0.5)';g.beginPath();g.arc(x-3,y-3,r*0.6,3.6,5.2);g.stroke();}});
  const pile=cyl(1.05,1.05,1,M('#ffffff',{map:COINS,emissive:'#3a2600'}),0,0.5,0,vault,32);
  const pl=new THREE.PointLight('#ffc84a',1.4,6,2);pl.position.set(0,1.4,-3.2);sc.add(pl);
  const lab=stickerNote(sc,1.9,0.55,[['UNABGEHOLTES',42,'#c4281f'],['PFAND',54]],'#fff6dc');lab.mesh.position.set(0,1.6,-3.08);lab.update(0,1);
  const chute=cyl(0.25,0.25,1.6,M('#8a8e9a'),0,4.4,-4.2,sc,16);
  const hs=new Flat(sc,3.6,0.8,1080,240,()=>{rr(8,8,1064,224,36);fillS('#1c1410',8);text('HERSTELLER',540,128,140,'#ffd34d',{ol:false});});hs.mesh.position.set(0,4.2,-7.75);hs.update(0,1);
  const ctr=new Flat(sc,2.6,0.75,780,225,(g,v)=>{g.fillStyle='#0e1a12';g.fillRect(0,0,780,225);g.strokeStyle='#c8a020';g.lineWidth=12;g.strokeRect(6,6,768,213);text(v,390,120,96,'#6aff8a',{ol:false});});ctr.mesh.position.set(-3.2,2.8,-7.75);
  const coins=[];for(let i=0;i<30;i++){const g=new THREE.Group();sc.add(g);coin3d(g,2.2);coins.push(g);}
  const t={das:WT('Das','tresor'),bezahlt:WT('bezahlt','tresor'),abholen:WT('Abholen','tresor'),also:WT('Also','tresor'),herst:WT('Hersteller','tresor'),mrd:WT('Milliarden','tresor'),weit:WT('weit','tresor'),mio:WT('Millionen','tresor')};
  lightsBasic(sc,{hemi:['#a8b8ff','#1a1a2a',0.85],sun:{c:'#ffe8c0',i:0.7,p:[4,9,3],t:[0,0,-5],r:10}});
  return {sc,grade:{mul:'#ffe8c8',a:0.04,vig:0.28,vigCol:'#05060a'},
    shots:[[0,0,[[0,4.2,-4.2],[0,0,-4.2],[0,1.6,-3.08]],-8,6,0],[t.abholen-0.3,0,[[0,2.0,-3.08],[0,0.4,-3.2]],12,8,0.9],[t.also-0.3,0,[[-1.8,4.6,-7.75],[1.8,4.6,-7.75],[0,0.3,-4.2]],0,6,0],
      [t.mrd-0.3,0,[[-4,1.6,-8],[1,1.6,-8],[-4,0.6,-8]],-24,8,0],[t.weit-0.3,0,[[-4.4,3.2,-7.75],[-2.0,2.4,-7.75]],-10,2,0]],
    update(lt){const fill=0.25+clamp(lt/(t.mio+0.5))*1.95;pile.scale.y=fill;pile.position.y=fill/2;
      coins.forEach((c,i)=>{const u=((lt*1.1+rnd(i))%1);c.position.set((rnd(i*3)-0.5)*0.3,5.2-u*(5.2-fill),-4.2+(rnd(i*5)-0.5)*0.3);c.rotation.set(lt*7+i,i,0);c.visible=lt>0.2;});
      conveyorBottles.forEach((b,i)=>{b.position.x=-5+((i*0.4+lt*1.2)%10.4);});
      const v=Math.floor(lerp(12000000,148000000,easeOut(clamp((lt-t.mrd)/(t.mio-t.mrd+0.6)))));const vs=v.toLocaleString('de-DE')+' €';ctr.update(vs,vs);pl.intensity=1.2+fill*0.4;}};}};

// ---------- 7 KELLER (night): the forgotten bottle is a gift — just not for you ----------
DEF.keller={build(){const sc=new THREE.Scene();sc.background=gradBg(['#1a1410','#0a0806']);
  room(sc,{w:7,d:8,h:2.8,wall:bricks('#7a6a5a',3,2),floor:plainNoise('#5a5048',3,3,'#000000',0.1)});
  const bulb=new THREE.Group();bulb.position.set(0,2.75,-2.2);sc.add(bulb);cyl(0.008,0.008,0.5,M('#1a1a1a'),0,-0.25,0,bulb,6);const bb=sph(0.07,E('#ffe0a0'),0,-0.52,0,bulb);const bgl=glowSprite('#ffd890',1.6,0.6);bgl.position.y=-0.52;bulb.add(bgl);
  const bl=new THREE.PointLight('#ffc070',2.6,7,1.6);bl.position.set(0,2.2,-2.2);bl.castShadow=true;bl.shadow.mapSize.set(1024,1024);bl.shadow.bias=-0.002;sc.add(bl);
  const shelf=new THREE.Group();shelf.position.set(-2.4,0,-4.2);sc.add(shelf);[0.5,1.1,1.7].forEach(y=>{box(1.6,0.05,0.5,M('#6a4a2a'),0,y,0,shelf);for(let i=0;i<5;i++)cyl(0.08,0.08,0.22,M(['#c8382a','#e8a83a','#6a8a3a'][i%3]),-0.6+i*0.3,y+0.13,0,shelf,10);});
  const crate=new THREE.Group();crate.position.set(0.3,0,-2.6);sc.add(crate);box(1.3,0.5,0.8,M('#c8a050'),0,0.25,0,crate);for(let i=0;i<4;i++)miniBottle(crate,-0.45+i*0.3,0.45,0.2,'#d6f0ff','#2a6ad8',1.2);
  const fb=new Toon2D(sc,0.3,-2.75,{},0.62,{kind:'leer',y:0.15});
  const bow=new Flat(sc,0.7,0.5,280,200,()=>{const g=getCtx();g.fillStyle='#e8283a';g.strokeStyle='#1c1410';g.lineWidth=8;[-1,1].forEach(sd=>{g.beginPath();g.moveTo(140,100);g.quadraticCurveTo(140+sd*130,10,140+sd*120,100);g.quadraticCurveTo(140+sd*130,190,140,100);g.fill();g.stroke();});g.beginPath();g.arc(140,100,26,0,7);g.fill();g.stroke();},{bill:true});
  const tag=stickerNote(sc,0.85,0.42,[['FÜR:',30],['HERSTELLER',40,'#c4281f']],'#fff6dc');
  const door=new THREE.Group();door.position.set(3.3,0,-1.6);door.rotation.y=-Math.PI/2;sc.add(door);const dd=box(1.0,2.1,0.08,M('#6a4a2a'),0.5,1.05,0,door);const spill=glowSprite('#ffd8a0',2.4,0);spill.position.set(3.0,1.0,-1.1);sc.add(spill);
  const gro=new Toon2D(sc,1.5,-1.6,{},0.8,{kind:'coin'});
  const t={die:WT('Die','keller'),vergessene:WT('vergessene','keller'),muell:WT('Müll','keller'),sie:WT('Sie','keller'),geschenk:WT('Geschenk','keller'),nur:WT('Nur','keller'),dich:WT('dich','keller')};
  gro.plan([{type:'walk',t:t.nur-1.4,dur:0.9,from:[2.6,-0.6],to:[1.5,-1.6]},{type:'g',g:'monocle',t:t.nur-0.2}]);
  lightsBasic(sc,{hemi:['#8a7a9a','#1a100a',0.7],keep:true});
  return {sc,anchors:{fb,gro},grade:{mul:'#ffd8b0',a:0.05,vig:0.34,vigCol:'#050302'},
    shots:[[0,0,[[-1.6,1.9,-4.2],[1.2,0.2,-2.6],'fb:top'],-6,8,0],[t.muell-0.6,0,['fb:top',[0.3,0.2,-2.6]],-4,6,0.95],[t.geschenk-0.35,0,['fb:top','fb:face',[0.3,2.05,-2.75]],8,4,0.9],
      [t.nur-0.3,0,['fb:top','gro:top',[0.3,0.2,-2.6]],14,6,0]],
    update(lt){bulb.rotation.z=Math.sin(lt*1.3)*0.08;bl.position.x=Math.sin(lt*1.3)*0.04;fb.update(lt,{f:faceAt(lt,[[0,'tired'],[t.muell,'raised'],[t.geschenk,'happy'],[t.nur,'shock']],3)});
      const top=fb.anchor('top');bow.mesh.position.set(top.x,top.y+0.06,top.z+0.05);popS(bow.mesh,lt,t.geschenk-0.1,1);bow.update(lt,1);tag.mesh.position.set(top.x+0.42,top.y-0.25,top.z+0.1);popS(tag.mesh,lt,t.nur+0.1,1);tag.update(lt,1);
      door.rotation.y=-Math.PI/2+clamp((lt-t.nur+1.6)/0.6)*1.2;spill.material.opacity=0.5*clamp((lt-t.nur+1.6)/0.6);gro.update(lt,{f:faceAt(lt,[[0,'smirk'],[t.dich,'smug']],2),talk:0});gro.mesh.visible=lt>t.nur-1.5;}};}};
