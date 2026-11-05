// ================= STORY: Warum manche Menschen nach Essen süchtig sind =================
const STORY={
  title:['3:00 UHR NACHTS','WARUM ISST TOM OHNE HUNGER?'],
  keywords:['Kühlschrank','Hunger','Dopamin','nochmal','Vorfahren','Beeren','Selten','Fleisch','seltener','nie','Supermarkt','Chips','Donuts','Pizza','Zucker','Fett','Belohnungssystem','Bliss','Point','mehr','Moment','Natur','Muttermilch','Schluck'],
  rim:{kitchen:'#9bb8ff',brain:'#b48aff',savanna:'#ffc070',market:'#e8f4ff',lab:'#bfe8ff',sofa:'#7aa8ff',freeze:'#c8d0e0',nursery:'#ffc0b0',ending:'#ffe0b0'},
};
const S={};
const TOM={robe:'#33507e',pattern:'stripes',pants:'#33507e',hair:'#3a2416',skin:SKIN[0],iris:'#3a5a7a'};
const ST=name=>TL.scenes.find(s=>s.name===name).start;
function WT(word,scene){const st=ST(scene);return wt(word,st-0.01)-st;}

// ---------- shared props ----------
function clockFlat(parent,size=0.55){const f=new Flat(parent,size,size,256,256,g=>{g.translate(128,128);ell(0,0,118,118);fillS('#f4efe4',10);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(Math.sin(a)*92,-Math.cos(a)*92);g.lineTo(Math.sin(a)*106,-Math.cos(a)*106);stroke(i%3?5:9);}
  g.beginPath();g.moveTo(0,0);g.lineTo(0,-82);stroke(9);g.beginPath();g.moveTo(0,0);g.lineTo(58,0);stroke(12);ell(0,0,9,9);fillS('#c4281f',0);});f.update(0,1);return f;}
function chipsBag(parent,x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  const t=ctex(256,320,gg=>{gg.fillStyle='#e8b81a';gg.fillRect(0,0,256,320);gg.fillStyle='#c4281f';gg.fillRect(0,0,256,70);gg.fillRect(0,250,256,70);text('CHIPS',128,160,64,'#fff');ell(128,230,40,22);gg.fillStyle='#f6d36a';gg.fill();}).t;
  const b=box(0.36,0.48,0.12,[M('#e8b81a'),M('#e8b81a'),M('#c4281f'),M('#c4281f'),M('#ffffff',{map:t}),M('#e8b81a')],0,0.24,0,g);b.scale.set(1,1,1);sph(0.09,M('#e8b81a'),0,0.24,0.03,g,1.9,2.4,0.7);return g;}
function donut3d(parent,x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  const d=mesh(new THREE.TorusGeometry(0.16,0.075,14,28),M('#d9a05a'),0,0,0,g);d.rotation.x=Math.PI/2;
  const ic=mesh(new THREE.TorusGeometry(0.16,0.07,10,28),M('#f28ab8'),0,0.03,0,g);ic.rotation.x=Math.PI/2;ic.scale.set(1,1,0.6);
  for(let i=0;i<14;i++){const a=rnd(i)*Math.PI*2,r=0.13+rnd(i*3)*0.07;const sp=box(0.04,0.012,0.012,M(['#ffffff','#5ab0ff','#ffd34d','#7ad04a'][i%4]),Math.cos(a)*r,0.075,Math.sin(a)*r,g);sp.rotation.y=rnd(i*7)*3;sp.castShadow=false;}return g;}
function pizzaSlice(parent,x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  const sl=mesh(new THREE.CylinderGeometry(0.42,0.42,0.05,24,1,false,-0.38,0.76),M('#f0c050'),0,0,0,g);
  const crust=mesh(new THREE.TorusGeometry(0.42,0.035,8,16,0.76),M('#c88a3a'),0,0.01,0,g);crust.rotation.set(Math.PI/2,0,Math.PI/2-0.38);
  for(let i=0;i<5;i++){const a=-0.25+rnd(i)*0.5,r=0.12+rnd(i*3)*0.24;cyl(0.04,0.04,0.02,M('#c4281f'),Math.sin(a)*r,0.035,Math.cos(a)*r,g,12);}return g;}
function ham3d(parent,x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  sph(0.22,M('#a8443a'),0,0,0,g,1.3,0.9,1);const b=cyl(0.04,0.04,0.42,MAT.white,0.34,0.02,0,g,10);b.rotation.z=Math.PI/2;sph(0.05,MAT.white,0.55,0.04,0.02,g);sph(0.05,MAT.white,0.55,0.0,-0.02,g);return g;}
function berryBush(parent,x,z,s=1,seed=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);
  [[0,0.45,0,0.5],[-0.4,0.35,0.1,0.38],[0.4,0.35,-0.05,0.38],[0,0.75,-0.1,0.36]].forEach(([a,b,c,r],i)=>{const m=mesh(new THREE.IcosahedronGeometry(r,1),i%2?MAT.leaf:MAT.leaf2,a,b,c,g);});
  for(let i=0;i<22;i++){const a=rnd(seed+i)*Math.PI*2,h=0.25+rnd(seed*3+i)*0.6;sph(0.05,M('#d6243a',{emissive:'#3a0008'}),Math.cos(a)*0.5,h,Math.sin(a)*0.45+0.05,g).castShadow=false;}return g;}
function acacia(parent,x,z,s=1,seed=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);
  const tr=cyl(0.12,0.2,2.6,MAT.trunk,0,1.3,0,g,8);tr.rotation.z=(rnd(seed)-0.5)*0.2;
  [[0,2.8,0,1.6],[-0.9,2.6,0.2,1.0],[0.9,2.65,-0.1,1.1]].forEach(([a,b,c,r])=>{const m=mesh(new THREE.IcosahedronGeometry(r,1),MAT.leaf,a,b,c,g);m.scale.set(1,0.32,1);});return g;}
function badge(parent,w,h,txt,col='#c4281f',bg='#fff6dc'){const f=new Flat(parent,w,h,Math.round(w*300),Math.round(h*300),()=>{const W2=Math.round(w*300),H2=Math.round(h*300);rr(8,8,W2-16,H2-16,H2*0.25);fillS(bg,8);text(txt,W2/2,H2/2+4,H2*0.48,col,{ol:false});},{bill:true});f.mesh.castShadow=false;f.update(0,1);return f;}
function gaugeFlat(parent,size,label,getV){return new Flat(parent,size,size,320,320,(g,lt)=>{g.translate(160,170);ell(0,0,150,150);fillS('#f6efe0',9);
  for(let i=0;i<=10;i++){const a=Math.PI*(0.8+i*0.14);g.beginPath();g.moveTo(Math.cos(a)*118,Math.sin(a)*118);g.lineTo(Math.cos(a)*136,Math.sin(a)*136);stroke(7,i>7?'#e8322b':'#3a2314');}
  const v=getV(lt);const na=Math.PI*(0.8+1.4*clamp(v));g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(na)*110,Math.sin(na)*110);stroke(15,'#c4281f');ell(0,0,16,16);fillS('#3a2314',0);text(label,0,80,34,'#5b3416',{ol:false});});}

// ---------- 1 KITCHEN (also used for the ending) ----------
function buildKitchen(ending){const sc=new THREE.Scene();sc.background=gradBg(['#0c1424','#05080f']);sc.fog=new THREE.Fog('#0a1220',10,28);
  const tile=tiled(512,512,7,6,g=>{for(let r=0;r<4;r++)for(let c=0;c<4;c++){g.fillStyle=(r+c)%2?'#8a8f96':'#6e737a';g.fillRect(c*128,r*128,128,128);}});
  room(sc,{w:11,d:8,h:3.4,wall:plainNoise('#6a7a8e',3,1,'#101820',0.08),floor:tile});
  box(4.6,0.95,0.7,M('#c8ccd2'),-1.6,0.475,-4.55,sc);box(4.7,0.06,0.76,M('#3a3f48'),-1.6,0.98,-4.55,sc);
  box(1.8,0.8,0.42,M('#d6dade'),-0.4,2.25,-4.75,sc);
  windowGlow(sc,-2.7,2.0,-4.93,1.3,1.1,'#5f80c0',0,false);const moon=glowSprite('#dfe8ff',0.5,0.9);moon.position.set(-2.4,2.25,-4.9);sc.add(moon);
  const mw=box(0.6,0.36,0.42,M('#2e3238'),-0.9,1.19,-4.55,sc);const disp=new Flat(sc,0.22,0.08,180,64,()=>{g2();function g2(){const g=getCtx();g.fillStyle='#061006';g.fillRect(0,0,180,64);text('03:00',90,34,44,'#5aff7a',{ol:false});}});disp.mesh.position.set(-0.78,1.22,-4.33);disp.update(0,1);
  const dg=glowSprite('#5aff7a',0.35,0.5);dg.position.set(-0.78,1.22,-4.3);sc.add(dg);
  const clk=clockFlat(sc,0.6);clk.mesh.position.set(0.9,2.55,-4.94);
  // fridge with hinged door and interior light
  const fx=2.6,fz=-4.45;box(1.0,2.05,0.75,M('#e8ebee'),fx,1.025,fz,sc);
  const inner=box(0.86,1.85,0.05,E('#fff4dc'),fx,1.02,fz+0.07,sc);inner.castShadow=false;
  [0.5,0.95,1.4].forEach(y=>{const sh=box(0.86,0.03,0.55,M('#dfe6ea'),fx,y,fz+0.33,sc);});
  [[fx-0.25,0.58,'#c4281f'],[fx+0.1,0.6,'#f0c050'],[fx+0.25,1.04,'#7ad04a'],[fx-0.2,1.05,'#ffffff'],[fx+0.05,1.47,'#d9a05a']].forEach(([x,y,c],i)=>{const b=box(0.16,0.16+rnd(i)*0.1,0.16,M(c),x,y+0.05,fz+0.35,sc);});
  const dz=donut3d(sc,fx-0.05,1.0,fz+0.42,0.7);
  const door=new THREE.Group();door.position.set(fx+0.5,0,fz+0.38);sc.add(door);const dm=box(1.0,2.05,0.08,M('#eef1f3'),-0.5,1.025,0.04,door);
  box(0.04,0.6,0.05,M('#9aa3ad'),-0.88,1.2,0.1,door);
  const photo=new Flat(door,0.32,0.4,256,320,()=>{const g=getCtx();rr(6,6,244,308,8);fillS('#fffaf0',6);g.fillStyle='#ffd8c8';g.fillRect(26,26,204,200);ell(128,140,62,58);fillS('#f3c9a5',5);
    [-1,1].forEach(sd=>{ell(128+sd*22,132,6,8);g.fillStyle='#2a1a10';g.fill();});g.beginPath();g.moveTo(112,166);g.quadraticCurveTo(128,178,144,166);stroke(4);ell(128,92,46,22);fillS('#e8d0b8',0);text('TOM, 1 TAG',128,268,30,'#5b3416',{ol:false});});
  photo.mesh.position.set(-0.45,1.55,0.09);photo.update(0,1);
  const fL=new THREE.PointLight('#ffe2b8',0,7,2);fL.position.set(fx,1.3,fz+0.9);sc.add(fL);const fG=glowSprite('#fff2d8',3.2,0);fG.position.set(fx,1.2,fz+0.6);sc.add(fG);
  const tom=new Char3D(sc,ending?1.75:-3.4,ending?-3.35:0.6,{...TOM,ry:ending?-0.5:0.4},1);
  const tDoor=ending?-1:(WT('Kühlschrank','kitchen')-0.05),tStop=1.75;
  if(!ending){tom.plan([{type:'walk',t:0.05,dur:tStop,from:[-3.4,0.6],to:[1.75,-3.35],endRy:2.55},{type:'g',g:'pull',t:tDoor-0.35},{type:'look',t:tDoor+0.3,at:[fx,1.25,fz+0.3]},{type:'look',t:WT('Hunger','kitchen')-0.25,at:null}]);}
  else{tom.plan([{type:'look',t:0,at:null},{type:'g',g:'eat',t:0.4},{type:'look',t:WT('allerersten','ending')-0.6,at:[fx+0.05,1.55,fz+0.85]},{type:'look',t:WT('Schluck','ending')+0.4,at:null}]);}
  lightsBasic(sc,{hemi:['#6a7aa8','#0a0810',0.95],sun:{c:'#9fbcff',i:1.0,p:[-4,5,-2],t:[0,0,-2],r:7}});
  const shots=ending?[[0,0,['tom:top','tom:chest',[fx+0.05,1.6,fz+0.9]],-25,8,0],[2.3,0,[[3.27,1.78,-3.64],[3.27,1.32,-3.64]],100,4,0.45]]
    :[[0,0,['tom:top','tom:feet',[0.9,2.6,-4.9]],-6,6,0,{follow:'tom'}],[WT('Kühlschrank','kitchen')-0.05,0,['tom:top','tom:chest',[2.6,1.9,-4.4],[2.6,0.6,-4.0]],-18,8,0],[WT('Hunger','kitchen')-0.4,0,['tom:top','tom:face'],188,6,0.5]];
  return {sc,anchors:{tom},shots,grade:{mul:'#6a7aa8',a:0.06,vig:0.4,vigCol:'#05080f'},
    update(lt){const open=ending?1:smooth(clamp((lt-tDoor)/0.6));door.rotation.y=open*1.75;fL.intensity=open*0.62;fG.material.opacity=open*0.55;
      tom.update(lt,{f:faceAt(lt,ending?[[0,'smug'],[WT('allerersten','ending')-0.2,'happy'],[WT('Schluck','ending')+0.5,'wink']]:[[0,'neutral'],[tDoor+0.25,'dreamy'],[WT('Hunger','kitchen'),'worried']],2),pose:'down',item:ending?'donut':null});
      if(!ending)dz.visible=true;else dz.visible=false;}};}
DEF.kitchen={build(){return buildKitchen(false);}};
DEF.ending={build(){return buildKitchen(true);}};

// ---------- 2 BRAIN CONTROL ROOM ----------
DEF.brain={build(){const sc=new THREE.Scene();sc.background=gradBg(['#12061e','#05020a']);sc.fog=new THREE.Fog('#140a24',16,44);
  const grid=tiled(256,256,10,10,g=>{g.fillStyle='#1a1424';g.fillRect(0,0,256,256);g.strokeStyle='#3a2a5a';g.lineWidth=4;g.strokeRect(0,0,256,256);});
  const fl=mesh(new THREE.PlaneGeometry(30,30),M('#ffffff',{map:grid}),0,0,-3,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const icons=[(g)=>{rr(60,40,136,176,20);fillS('#e8b81a',8);text('CHIPS',128,128,40,'#c4281f',{ol:false});},(g)=>{ell(128,128,80,80);fillS('#f28ab8',10);ell(128,128,30,30);fillS('#1a0a2a',8);},
    (g)=>{g.beginPath();g.moveTo(128,30);g.lineTo(220,210);g.lineTo(36,210);g.closePath();fillS('#f0c050',8);[[110,130],[140,170],[100,180]].forEach(([x,y])=>{ell(x,y,14,14);fillS('#c4281f',4);});},
    (g)=>{rr(40,70,176,40,20);fillS('#d9a05a',8);rr(36,110,184,26,8);fillS('#5a2a1a',6);rr(40,136,176,40,18);fillS('#d9a05a',8);},(g)=>{ell(128,140,70,80);fillS('#8a4a2a',8);ell(128,80,30,20);fillS('#fff',6);}];
  const screens=[];for(let i=0;i<7;i++){const a=(i-3)*0.32;const f=new Flat(sc,1.5,1.1,300,220,(g,lt)=>{g.fillStyle='#0a1a2a';g.fillRect(0,0,300,220);g.strokeStyle='#5ad8ff';g.lineWidth=8;g.strokeRect(4,4,292,212);g.save();g.translate(22,-18);g.scale(1,1);icons[i%5](g);g.restore();
      const fl2=(lt>S.br.slam&&lt<S.br.slam+0.5)?0.5:0;if(fl2){g.fillStyle='rgba(255,255,255,0.45)';g.fillRect(0,0,300,220);}});
    f.mesh.position.set(Math.sin(a)*5.2,2.0+(i%2)*0.2,-3.4-Math.cos(a)*1.6);f.mesh.rotation.y=-a;screens.push(f);const gs=glowSprite('#5ad8ff',2.4,0.45);gs.position.copy(f.mesh.position);sc.add(gs);}
  const sign=new Flat(sc,3.4,0.9,900,240,(g,lt)=>{const on=lt>S.br.dop?(Math.sin(lt*60)>-0.2||lt>S.br.dop+0.35?1:0):0;text('DOPAMIN',450,120,170,on?'#ffe066':'#3a2a4a',{olc:on?'#ff8a1a':'#1a1024',olw:14});});sign.mesh.position.set(0,3.7,-4.6);
  const signG=glowSprite('#ffb84a',6,0);signG.position.set(0,3.7,-4.4);sc.add(signG);
  const desk=box(2.4,0.95,0.8,M('#2a2438'),0,0.475,0.45,sc);box(2.5,0.06,0.9,M('#4a3e64'),0,0.98,0.45,sc);
  const btnBase=cyl(0.3,0.32,0.08,M('#3a3a42'),0,1.05,0.55,sc,24);const btn=cyl(0.24,0.24,0.12,M('#e8322b',{emissive:'#5a0000'}),0,1.15,0.55,sc,24);
  const btnL=new THREE.PointLight('#ff3a3a',0.9,4,2);btnL.position.set(0,1.5,0.9);sc.add(btnL);
  const lbl=badge(sc,1.2,0.3,'NOCHMAL!','#ffffff','#c4281f');lbl.mesh.position.set(0,0.65,0.86);lbl.bill=false;
  [[-0.8,'#5ad8ff'],[0.8,'#ff6ad5'],[-0.45,'#7aff8a'],[0.45,'#ffd34d']].forEach(([x,c])=>{cyl(0.06,0.06,0.05,M(c,{emissive:dk(c,0.5)}),x,1.03,0.3,sc,12);});
  const worker=new Char3D(sc,0,-0.35,{...TOM,pattern:null,robe:'#f2f2ee',dress:true,glasses:true,ry:0},0.92);
  S.br={dop:WT('Dopamin','brain')-0.05,slam:WT('nochmal','brain')+0.05};
  worker.plan([{type:'look',t:0,at:[0,2.0,-3.6]},{type:'look',t:S.br.dop-0.4,at:[0,3.7,-4.6]},{type:'look',t:WT('Er','brain')-0.2,at:null},{type:'g',g:'nod',t:WT('gut','brain')-0.1},{type:'look',t:S.br.slam-0.6,at:[0,1.15,0.55]},{type:'g',g:'slam',t:S.br.slam-0.44}]);
  const sparks=particlesSprites(sc,46,'#ffd34d',0.14,1,THREE.AdditiveBlending);
  lightsBasic(sc,{hemi:['#7a5ab8','#0a0410',0.75]});const n1=new THREE.PointLight('#ff6ad5',1.4,9,2);n1.position.set(-3,3,-2);sc.add(n1);const n2=new THREE.PointLight('#5ad8ff',1.4,9,2);n2.position.set(3,3,-2);sc.add(n2);
  spotOn(sc,[0,5,3],[0,1.4,0],'#ffe8d0',0.9,0.5,0.7);
  return {sc,anchors:{w:worker},shakes:[S.br.slam],grade:{mul:'#8a6ab8',a:0.08,vig:0.55,vigCol:'#05020a'},
    shots:[[0,0,[[-3.4,2.6,-2.9],[3.4,2.6,-2.9],'w:top',[0,0.4,0.9]],0,6,0],[S.br.dop-0.3,0,[[-1.8,4.2,-4.6],[1.8,3.2,-4.6],[0,2.4,-3.6]],0,4,0],[WT('Er','brain')-0.25,0,['w:top','w:chest'],8,4,0.95],[S.br.slam-0.55,0,['w:top',[0,1.0,0.55],[0.6,0.6,0.86]],-10,16,0]],
    update(lt){worker.update(lt,{f:faceAt(lt,[[0,'neutral'],[S.br.dop,'shock'],[WT('gut','brain'),'happy'],[S.br.slam-0.5,'stern'],[S.br.slam+0.3,'laugh']],3)});
      const press=lt>S.br.slam&&lt<S.br.slam+0.3?1:0;btn.position.y=1.15-press*0.05;btnL.intensity=0.9+press*2.5;
      sign.update(lt,Math.floor(lt*30));signG.material.opacity=lt>S.br.dop+0.35?0.55:0;screens.forEach(s=>s.update(lt,Math.floor(lt*15)));
      sparks.forEach((p,i)=>{const t0=i<26?S.br.dop+0.3:S.br.slam;const src=i<26?[0,3.4,-4.3]:[0,1.3,0.55];const u=(lt-t0)/1.1;p.visible=u>0&&u<1;if(!p.visible)return;const a=rnd(i)*Math.PI*2,sp=0.6+rnd(i*3)*1.6;
        p.position.set(src[0]+Math.cos(a)*sp*u,src[1]+Math.sin(a)*sp*u*0.7+u*0.4-u*u*1.2,src[2]+(rnd(i*5)-0.5)*u);p.material.opacity=1-u;});}};}};

// ---------- 3 SAVANNA (also frozen for the viewer interruption) ----------
function buildSavanna(frozen){const sc=new THREE.Scene();const st=ST('savanna');
  sc.background=gradBg(frozen?['#7a8aa0','#c0c8d0','#e0e0e0']:['#3a5aa8','#ff9a5a','#ffd88a']);sc.fog=new THREE.Fog(frozen?'#c0c8d0':'#ffc890',18,70);
  const grass=tiled(512,512,14,14,g=>{g.fillStyle='#c8a050';g.fillRect(0,0,512,512);for(let i=0;i<500;i++){g.strokeStyle=rgba(rnd(i)>0.5?'#8a7a30':'#e0c070',0.6);g.lineWidth=3;g.beginPath();const x=rnd(i*2)*512,y=rnd(i*3)*512;g.moveTo(x,y);g.lineTo(x+(rnd(i*5)-0.5)*10,y-14-rnd(i*7)*14);g.stroke();}});
  const gr=mesh(new THREE.PlaneGeometry(140,140),M('#ffffff',{map:grass}),0,0,-30,sc);gr.rotation.x=-Math.PI/2;gr.castShadow=false;
  for(let i=0;i<7;i++){const m=mesh(new THREE.ConeGeometry(8+rnd(i)*6,6+rnd(i*2)*6,6),M('#8a6a9a',{flatShading:true}),-40+i*14,2.5,-55-rnd(i)*8,sc);m.castShadow=false;}
  const sun=glowSprite('#ffd890',14,frozen?0.2:0.95);sun.position.set(-12,4,-60);sc.add(sun);const sunC=sph(2.2,E('#fff0c0'),-12,4,-62,sc);sunC.castShadow=false;
  [[-7,-6,1.2],[4,-11,1.4],[10,-6,1.0],[-14,-16,1.6]].forEach(([x,z,s],i)=>acacia(sc,x,z,s,i+2));
  const bush=berryBush(sc,-2.4,-1.4,1.0,3);
  const rock=mesh(new THREE.IcosahedronGeometry(0.55,0),M('#8a8478',{flatShading:true}),1.2,0.3,-2.3,sc);rock.scale.set(1.3,0.6,1);const ham=ham3d(sc,1.15,0.72,-2.25,0.9);
  // the rare combo far away: berries and meat together under a sunbeam
  const crock=mesh(new THREE.IcosahedronGeometry(0.8,0),M('#8a8478',{flatShading:true}),6.5,0.4,-11,sc);crock.scale.set(1.3,0.7,1);
  const cham=ham3d(sc,6.3,1.0,-10.9,1.0);const cb=berryBush(sc,7.2,-11.2,0.55,9);
  const beam=shaft(18,0.5,1.6,'#fff2c0',frozen?0.12:0.32);beam.position.set(6.6,17,-11);sc.add(beam);const cG=glowSprite('#fff2c0',4,0.5);cG.position.set(6.6,1.3,-10.9);sc.add(cG);
  const signs=[['SELTEN',-2.4,2.0,-1.3],['NOCH SELTENER',1.2,2.0,-2.2],['FAST NIE',6.6,3.0,-10.6]].map(([t,x,y,z])=>{const b=badge(sc,t.length>8?2.2:1.4,0.42,t);b.mesh.position.set(x,y,z);return b;});
  const q=frozen?badge(sc,0.9,0.9,'?','#ffffff','#c4281f'):null;if(q)q.mesh.position.set(6.6,4.4,-10.6);
  const cave=new Char3D(sc,-5.5,1.2,{robe:'#7a5232',sleeves:'skin',pants:SKIN[2],skin:SKIN[2],hair:'#3a2416',beard:'#3a2416',iris:'#3a2416',ry:0.6},1.0);
  const t={beer:WT('Beeren','savanna'),sel:WT('Selten','savanna'),fl:WT('Fleisch','savanna'),ns:WT('seltener','savanna'),bz:WT('zusammen','savanna'),nie:WT('nie','savanna'),also:WT('Also','savanna'),iss:WT('iss','savanna')};
  S.sv=t;
  cave.plan([{type:'walk',t:0.0,dur:2.2,from:[-5.6,1.4],to:[-2.5,-0.45],endRy:3.0},{type:'g',g:'reach',t:t.beer-0.35},{type:'walk',t:t.sel+0.25,dur:1.3,to:[0.55,-1.45],endRy:2.4},{type:'g',g:'reach',t:t.fl},
    {type:'look',t:t.bz-0.6,at:[6.6,1.2,-10.9]},{type:'walk',t:t.also-0.2,dur:0.9,to:[0.3,-0.9],endRy:0.2},{type:'look',t:t.also+0.6,at:null}].concat([0,0.6,1.2,1.8,2.4].map(d=>({type:'g',g:'eat',t:t.also+0.9+d}))));
  lightsBasic(sc,{hemi:frozen?['#d0d8e8','#8a8a80',0.7]:['#ffd0a0','#6a5030',0.55],sun:{c:frozen?'#e8eef8':'#ffb070',i:frozen?0.6:1.15,p:[-14,7,-20],t:[0,0,-3],r:16}});
  const ft=t.nie+0.25;
  return {sc,anchors:{cave},grade:frozen?{mul:'#a0a8b8',a:0.25,vig:0.5}:{mul:'#ffd8a8',a:0.06,scr:'#ff9a50',sa:0.06,vig:0.35,vigCol:'#3a1400'},
    shots:frozen?[[0,0,[[5.2,3.4,-10.6],[8,3.4,-10.6],[6.6,0.4,-10.9],'cave:top'],-8,4,0],[WT('Natur','freeze')-0.4,0,[[5.5,5,-10.6],[7.7,0.7,-10.9]],-4,4,0]]
      :[[0,0,['cave:top','cave:feet',[-7,3.5,-6],[-2.4,1.0,-1.4]],-10,4,0],[t.beer-0.45,0,['cave:top','cave:chest',[-2.4,0.2,-1.4],[-2.4,1.3,-1.3]],160,10,0],[t.fl-0.45,0,[[1.2,2.3,-2.2],[1.2,0.3,-2.3],'cave:top','cave:chest'],150,10,0,{follow:'cave'}],
       [t.bz-0.5,0,[[5.0,3.3,-10.6],[8.2,3.3,-10.6],[6.6,0.4,-10.9],'cave:top','cave:chest'],-16,4,0],[t.also+0.4,0,['cave:top','cave:chest'],10,6,0.95]],
    update(lt){const L=frozen?ft:lt;cave.update(L,{f:faceAt(L,[[0,'neutral'],[t.beer,'happy'],[t.fl,'happy'],[t.bz,'shock'],[t.also+0.5,'laugh']],5),pose:'down',item:L>t.also+0.6?'food':null,belly:clamp((L-t.also-0.8)/2.6)});
      [t.sel,t.ns,t.nie].forEach((s0,i)=>{signs[i].update(L,1);popS(signs[i].mesh,L,s0-0.05,1);if(i<2&&L>t.bz-0.3)signs[i].mesh.visible=false;});if(q){q.update(lt,1);popS(q.mesh,lt,0.25,1);}
      bush.scale.setScalar(L>t.also+1.0?Math.max(0.35,1-(L-t.also-1.0)*0.25):1);ham.visible=!(L>t.also+0.6);}};}
DEF.savanna={build(){return buildSavanna(false);}};
DEF.freeze={build(){return buildSavanna(true);}};

// ---------- 4 SUPERMARKET ----------
DEF.market={build(){const sc=new THREE.Scene();sc.background=gradBg(['#e8eef2','#c8d0d6']);sc.fog=new THREE.Fog('#dfe6ea',12,40);
  const fl=mesh(new THREE.PlaneGeometry(10,40),M('#ffffff',{map:tiled(256,256,5,20,g=>{g.fillStyle='#e6e6e0';g.fillRect(0,0,256,256);g.strokeStyle='#c8c8c0';g.lineWidth=4;g.strokeRect(0,0,256,256);})}),0,0,-12,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const cols=['#e8322b','#f0c050','#3a7ad6','#7ad04a','#f28ab8','#ff8a1a','#8a5ab8','#ffffff'];
  const prodG=new THREE.BoxGeometry(0.22,0.3,0.18);const prodM=new THREE.MeshToonMaterial({gradientMap:gm});NO(prodM);
  const N=900;const inst=new THREE.InstancedMesh(prodG,prodM,N);inst.castShadow=true;const m4=new THREE.Matrix4();const col=new THREE.Color();let k=0;
  [-1.7,1.7].forEach(x=>{box(0.6,2.3,26,M('#d8dde2'),x+(x<0?-0.25:0.25),1.15,-11,sc);[0.35,1.0,1.65].forEach(y=>{box(0.7,0.04,26,M('#b8c0c8'),x,y,-11,sc);
    for(let z=1.6;z>-24&&k<N;z-=0.26){m4.makeTranslation(x+(x<0?0.05:-0.05),y+0.17,z);m4.scale(new THREE.Vector3(1,0.8+rnd(k)*0.5,1));inst.setMatrixAt(k,m4);inst.setColorAt(k,col.set(cols[Math.floor(rnd(k*3)*cols.length)]));k++;}});});
  inst.count=k;sc.add(inst);
  for(let z=0;z>-24;z-=4){const l=box(0.5,0.06,2.6,E('#ffffff'),0,3.3,z,sc);l.castShadow=false;}
  const cart=new THREE.Group();sc.add(cart);const wire=M('#b8c0c8');box(0.62,0.04,0.9,wire,0,0.5,0,cart);[-1,1].forEach(s=>{box(0.03,0.42,0.9,wire,s*0.3,0.72,0,cart);});box(0.62,0.42,0.03,wire,0,0.72,0.44,cart);box(0.62,0.42,0.03,wire,0,0.72,-0.44,cart);
  box(0.66,0.04,0.04,M('#e8322b'),0,0.98,0.52,cart);[[-0.25,-0.38],[0.25,-0.38],[-0.25,0.38],[0.25,0.38]].forEach(([x,z])=>sph(0.06,M('#333'),x,0.07,z,cart));chipsBag(cart,0.1,0.52,0.1,0.7);
  const tom=new Char3D(sc,0,2.5,{...TOM,pattern:null,robe:'#4a6a8a',pants:'#2a2e3a'},1);
  const tS=WT('Supermarkt','market');tom.plan([{type:'walk',t:0,dur:2.6,from:[0,2.6],to:[0,-1.2],endRy:0},{type:'walk',t:5.6,dur:1.6,to:[0,-5.4],endRy:0.35}]);
  // promo end-cap with the three hero items
  const pz=-8.6;box(2.6,0.9,0.8,M('#c4281f'),0,0.45,pz,sc);const heroes=[chipsBag(sc,-0.85,0.9,pz,2.3),donut3d(sc,0,1.15,pz,2.6),pizzaSlice(sc,0.85,1.0,pz,1.8)];heroes[2].rotation.y=Math.PI;
  const tH=[WT('Chips','market'),WT('Donuts','market'),WT('Pizza','market')];
  const zuck=badge(sc,1.3,0.42,'ZUCKER','#ffffff','#3a7ad6'),fett=badge(sc,1.0,0.42,'FETT','#ffffff','#ff8a1a');const plus=badge(sc,2.6,0.5,'ZUCKER + FETT','#ffffff','#c4281f');
  const tZ=WT('Zucker','market'),tF=WT('Fett','market'),tB=WT('Belohnungssystem','market');
  const gauge=gaugeFlat(sc,1.1,'BELOHNUNG',lt=>easeOut(clamp((lt-tB)/0.9))*1.0+Math.sin(lt*30)*0.02*(lt>tB+0.9?1:0));gauge.mesh.position.set(1.35,1.75,pz+0.6);
  lightsBasic(sc,{hemi:['#ffffff','#a0a8b0',0.75],sun:{c:'#ffffff',i:0.55,p:[2,9,4],t:[0,0,-4],r:14}});
  return {sc,anchors:{tom},grade:{mul:'#e8f0f4',a:0.04,vig:0.3,vigCol:'#1a2028'},
    shots:[[0,0,['tom:top','tom:feet'],-14,8,0,{follow:'tom'}],[tH[0]-0.15,0,[[-1.4,2.1,pz],[1.4,2.1,pz],[0,0.9,pz]],24,16,0],[tZ-0.35,0,[[-1.3,2.4,pz+0.6],[1.3,2.4,pz+0.6],[0,1.4,pz]],0,6,0],[tB-0.5,0,[[1.35,2.3,pz+0.6],[-0.2,3.0,pz+0.7],'tom:top','tom:chest'],-10,6,0]],
    update(lt){const p=tom._walk(lt);cart.position.set(p.pos.x,0,p.pos.z-0.8);
      tom.update(lt,{f:faceAt(lt,[[0,'neutral'],[tH[0],'happy'],[tB+0.4,'laugh']],6),pose:'cart'});
      heroes.forEach((h,i)=>{const k2=pop(lt,tH[i]-0.05,0.4);h.visible=k2>0.01;h.scale.setScalar(Math.max(0.001,k2*(i===2?1.8:i===1?2.6:2.3)));h.rotation.y=(i===2?Math.PI:0)+lt*0.6;});
      const u=smooth(clamp((lt-tF-0.2)/0.6));zuck.mesh.position.set(lerp(-1.6,-0.35,u),2.4,pz+0.7);fett.mesh.position.set(lerp(1.6,0.45,u),2.4,pz+0.7);
      popS(zuck.mesh,lt,tZ-0.05,1);popS(fett.mesh,lt,tF-0.05,1);if(u>=0.98){zuck.mesh.visible=false;fett.mesh.visible=false;}plus.mesh.position.set(-0.2,2.75,pz+0.7);plus.mesh.visible=u>=0.98;
      gauge.update(lt,Math.floor(lt*30));popS(gauge.mesh,lt,tB-0.3,1);}};}};

// ---------- 5 FOOD LAB ----------
DEF.lab={build(){const sc=new THREE.Scene();sc.background=gradBg(['#d8e8f0','#a8c0d0']);sc.fog=new THREE.Fog('#c8dce8',10,30);
  room(sc,{w:10,d:8,h:3.6,wall:plainNoise('#e6eef2',3,1,'#8aa0b0',0.05),floor:tiled(256,256,6,6,g=>{g.fillStyle='#e8eef0';g.fillRect(0,0,256,256);g.strokeStyle='#c0ccd4';g.lineWidth=3;g.strokeRect(0,0,256,256);})});
  const tBl=WT('Bliss','lab');
  const screen=new Flat(sc,3.2,1.8,800,450,(g,lt)=>{g.fillStyle='#0a1a2a';g.fillRect(0,0,800,450);g.strokeStyle='#2a4a6a';g.lineWidth=2;for(let i=1;i<8;i++){g.beginPath();g.moveTo(i*100,0);g.lineTo(i*100,450);g.stroke();}
    g.beginPath();for(let x=0;x<=760;x+=10){const v=Math.exp(-Math.pow((x-470)/150,2));const y=400-v*320;x?g.lineTo(x+20,y):g.moveTo(x+20,y);}g.lineWidth=8;g.strokeStyle='#5ad8ff';g.stroke();
    const u=clamp(lt/(tBl+0.1));const px=60+u*410,py=400-Math.exp(-Math.pow((px-20-470)/150,2))*320;ell(px,py,16,16);fillS('#ffd34d',5);
    text('ZUCKER + FETT →',230,430,28,'#8ac8ff',{ol:false});text('BELOHNUNG',90,30,28,'#8ac8ff',{ol:false});
    if(lt>tBl){const k=pop(lt,tBl,0.35);g.save();g.translate(490,70);g.scale(k,k);text('★ BLISS POINT',0,0,58,'#ffd34d');g.restore();}});
  screen.mesh.position.set(0.4,2.75,-4.75);const sG=glowSprite('#5ad8ff',4,0.25);sG.position.set(0.4,2.75,-4.6);sc.add(sG);
  const con=box(2.6,0.9,0.9,M('#d8dde2'),0,0.45,-2.4,sc);box(2.7,0.05,1.0,M('#4a5a6a'),0,0.92,-2.4,sc);
  const knobs=[[-0.6,'ZUCKER','#3a7ad6'],[0.6,'FETT','#ff8a1a']].map(([x,l,c])=>{box(0.1,0.02,0.7,M('#2a2a32'),x,0.96,-2.4,sc);const kn=cyl(0.08,0.08,0.1,M(c),x,1.0,-2.6,sc,16);const b=badge(sc,0.8,0.24,l,'#ffffff',c);b.mesh.position.set(x,0.68,-1.94);b.bill=false;return kn;});
  const eng=new Char3D(sc,-0.2,-3.25,{robe:'#f2f2ee',dress:true,glasses:true,skin:SKIN[4],hair:'#8a6a4a',hat:'bun',iris:'#2a5a3a',ry:0},1);
  eng.plan([{type:'look',t:0,at:[-0.6,1.0,-2.6]},{type:'look',t:tBl-0.6,at:null},{type:'g',g:'reach',t:0.1}]);
  lightsBasic(sc,{hemi:['#ffffff','#8aa0b0',0.7],sun:{c:'#ffffff',i:0.6,p:[3,8,4],t:[0,0,-2],r:8}});
  return {sc,anchors:{eng},grade:{mul:'#d8ecf8',a:0.05,vig:0.3},
    shots:[[0,0,['eng:top',[-0.8,0.95,-2.0],[0.8,0.95,-2.0]],0,16,0],[tBl-0.45,0,[[-1.2,3.65,-4.75],[2.0,1.85,-4.75],'eng:top'],0,4,0]],
    update(lt){const u=smooth(clamp(lt/(tBl+0.1)));knobs[0].position.z=-2.6+u*0.45;knobs[1].position.z=-2.6+u*0.38;
      eng.update(lt,{f:faceAt(lt,[[0,'neutral'],[tBl,'smug']],7),pose:'down'});screen.update(lt,Math.floor(lt*30));}};}};

// ---------- 6 SOFA (tolerance) ----------
DEF.sofa={build(){const sc=new THREE.Scene();sc.background=gradBg(['#0a0e1a','#04060c']);sc.fog=new THREE.Fog('#080c18',8,22);
  room(sc,{w:9,d:8,h:3.2,wall:plainNoise('#4a4e66',3,1,'#101220',0.08),floor:woodTex('#5a3e2a',3,3)});
  const sofa=new THREE.Group();sofa.position.set(-0.4,0,-2.6);sc.add(sofa);const sm=M('#7a3a3a');box(2.6,0.45,0.95,sm,0,0.32,0,sofa);box(2.6,0.75,0.25,sm,0,0.75,-0.4,sofa);[-1,1].forEach(s=>box(0.25,0.62,0.95,sm,s*1.3,0.45,0,sofa));
  const tv=box(1.8,1.05,0.1,M('#1a1a1e'),0.2,1.4,2.2,sc);const scr=box(1.66,0.92,0.02,E('#6aa8ff'),0.2,1.4,2.14,sc);scr.castShadow=false;const tvL=new THREE.PointLight('#6aa8ff',1.6,8,2);tvL.position.set(0.2,1.4,1.6);sc.add(tvL);
  const lamp=candle3d(sc,-2.3,0.62,-2.6,1.2,'#ffb060',1.1,6);box(0.5,0.62,0.5,MAT.darkwood,-2.3,0.31,-2.6,sc);
  const tom=new Char3D(sc,-0.4,-2.55,{...TOM,ry:0,sit:true},1,{y:0.12});
  const tM=WT('mehr','sofa'),tAb=WT('ab','sofa');
  tom.plan([0.3,1.0,1.7,2.4,3.0,3.5,4.0,4.4,4.8,5.2].map(d=>({type:'g',g:'eat',t:d})).concat([{type:'look',t:0,at:[0.2,1.4,2.2]},{type:'look',t:WT('Sie','sofa')-0.2,at:null}]));
  const bags=[];for(let i=0;i<26;i++){const onSofa=i%3===0;const b=chipsBag(sc,-1.5+rnd(i)*2.2,onSofa?0.57:0.02+Math.floor(i/9)*0.08,onSofa?-2.45+rnd(i*3)*0.3:-1.9+rnd(i*3)*0.7,0.75);b.rotation.set(-Math.PI/2+rnd(i)*0.3,rnd(i*5)*3,0);b.userData.t=0.5+Math.pow(i/26,0.7)*5.0;bags.push(b);}
  const meter=new Flat(sc,0.5,1.6,160,512,(g,lt)=>{rr(10,10,140,492,20);fillS('#1a1a24',6);const v=1-easeOut(clamp(lt/5.4))*0.85;const h=440*v;rr(30,482-h,100,h,14);g.fillStyle=mix('#7ad04a','#e8322b',1-v);g.fill();text('GEFÜHL',80,28,24,'#ffffff',{ol:false});});
  meter.mesh.position.set(1.7,1.9,-2.0);meter.mesh.rotation.y=-0.4;
  lightsBasic(sc,{hemi:['#4a5a8a','#0a0810',0.55]});
  return {sc,anchors:{tom},grade:{mul:'#6a7aa8',a:0.14,vig:0.6,vigCol:'#04060c'},
    shots:[[0,0,['tom:top','tom:knee',[0.6,1.0,-2.0]],-10,6,0],[tAb-0.3,0,['tom:top','tom:knee',[1.7,2.7,-2.0],[1.7,1.1,-2.0]],22,12,0],[tM-0.35,0,['tom:top','tom:chest'],-6,4,0.9]],
    update(lt){const fl=0.8+Math.sin(lt*13)*0.25+Math.sin(lt*31)*0.15;tvL.intensity=1.6*fl;scr.material.color.set(mix('#6aa8ff','#c8e0ff',0.5+0.5*Math.sin(lt*7)));
      tom.update(lt,{f:faceAt(lt,[[0,'happy'],[tAb,'neutral'],[tM-0.3,'worried']],8),pose:'down',item:'chips'});
      bags.forEach(b=>{const k=pop(lt,b.userData.t,0.25);b.visible=k>0.01;b.scale.setScalar(Math.max(0.001,0.75*k));});meter.update(lt,Math.floor(lt*30));flicker(lamp);}};}};

// ---------- 7 NURSERY ----------
DEF.nursery={build(){const sc=new THREE.Scene();sc.background=gradBg(['#3a2030','#1a0a14']);sc.fog=new THREE.Fog('#2a1420',10,26);
  room(sc,{w:9,d:8,h:3.2,wall:plainNoise('#e8c8c0',3,1,'#8a5a5a',0.06),floor:woodTex('#a07a5a',3,3)});
  windowGlow(sc,1.6,1.8,-4.93,1.6,1.8,'#ffb0a0');const sh=shaft(9,0.8,1.8,'#ffc0a8',0.22);sh.position.set(1.6,2.2,-4.6);sh.rotation.set(-1.0,0,0.25);sc.add(sh);
  const crib=new THREE.Group();crib.position.set(-2.2,0,-3.4);sc.add(crib);box(1.4,0.08,0.8,MAT.white,0,0.5,0,crib);for(let i=0;i<8;i++){cyl(0.025,0.025,0.6,MAT.white,-0.65+i*0.186,0.8,0.38,crib,6);cyl(0.025,0.025,0.6,MAT.white,-0.65+i*0.186,0.8,-0.38,crib,6);}
  const mob=new THREE.Group();mob.position.set(-2.2,2.2,-3.4);sc.add(mob);[['#f28ab8'],['#5ab0ff'],['#ffd34d'],['#7ad04a']].forEach(([c],i)=>{const a=i/4*Math.PI*2;sph(0.08,M(c),Math.cos(a)*0.35,-0.25,Math.sin(a)*0.35,mob);});
  const mom=new Char3D(sc,0.2,-2.6,{robe:'#9a7ab8',dress:true,skin:SKIN[1],hair:'#6a3a1a',hat:'bun',iris:'#3a5a2a',ry:0.15},1);
  const baby=new Char3D(sc,0,0,{robe:'#f6efe0',dress:true,skin:SKIN[0],hair:'#c8a070',ry:0,headScale:1.45},0.5);
  const tP=WT('perfekt','nursery'),tMM=WT('Muttermilch','nursery');
  mom.plan([{type:'look',t:0,at:[0.25,1.2,-2.2]},{type:'look',t:tP+0.2,at:null},{type:'g',g:'nod',t:tMM+0.1}]);
  const drop=new Flat(sc,1.0,1.25,320,400,()=>{const g=getCtx();g.translate(160,210);g.beginPath();g.moveTo(0,-170);g.bezierCurveTo(120,-20,128,110,0,120);g.bezierCurveTo(-128,110,-120,-20,0,-170);fillS('#fffaf0',10);g.fillStyle='rgba(255,220,180,0.5)';ell(-40,20,30,60,0.3);g.fill();},{bill:true});drop.update(0,1);
  const zb=badge(sc,1.0,0.32,'ZUCKER','#ffffff','#3a7ad6'),fb=badge(sc,0.8,0.32,'FETT','#ffffff','#ff8a1a');const title=badge(sc,2.6,0.5,'MUTTERMILCH','#5b3416','#ffe8c8');const dG=glowSprite('#fff0d8',3,0.0);sc.add(dG);
  lightsBasic(sc,{hemi:['#ffd8c8','#4a2a2a',0.55],sun:{c:'#ffb8a0',i:0.8,p:[3,5,-8],t:[0,1,-2],r:7}});
  return {sc,anchors:{mom},grade:{mul:'#ffd0c8',a:0.08,scr:'#ff9a80',sa:0.05,vig:0.45,vigCol:'#1a0a14'},
    shots:[[0,0,['mom:top','mom:chest',[0.25,0.9,-2.2]],-12,6,0],[tP-0.4,0,[[-0.6,3.1,-1.9],[1.2,3.1,-1.9],[0.25,1.2,-2.2]],0,4,0]],
    update(lt){mom.update(lt,{f:faceAt(lt,[[0,'dreamy'],[tP,'happy']],9),pose:'hold'});
      const hp=mom.arms[1].hand.getWorldPosition(new THREE.Vector3()),hl=mom.arms[0].hand.getWorldPosition(new THREE.Vector3());baby.home.set((hp.x+hl.x)/2+0.25,(hp.y+hl.y)/2-0.05,(hp.z+hl.z)/2+0.12);baby.homeRy=0.15;
      baby.root.rotation.z=Math.PI/2-0.25;baby.update(lt,{f:{face:'laugh',eye:1}});baby.root.rotation.z=Math.PI/2-0.25+Math.sin(lt*2)*0.04;
      mob.rotation.y=lt*0.6;const k=pop(lt,tP-0.1,0.4);drop.mesh.position.set(0.3,2.75,-1.9);drop.mesh.visible=k>0.01;drop.mesh.scale.setScalar(Math.max(0.001,k));drop.update(lt,1);
      dG.position.set(0.3,2.75,-1.85);dG.material.opacity=0.6*k;const a=lt*2.2;zb.mesh.position.set(0.3+Math.cos(a)*1.0,2.75+Math.sin(a)*0.35,-1.7);fb.mesh.position.set(0.3+Math.cos(a+Math.PI)*1.0,2.75+Math.sin(a+Math.PI)*0.35,-1.7);
      popS(zb.mesh,lt,tP,1);popS(fb.mesh,lt,tP+0.1,1);title.mesh.position.set(0.3,1.75,-1.6);popS(title.mesh,lt,tMM-0.05,1);}};}};
