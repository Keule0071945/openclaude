// ================= STORY: Warum Kinos so teures Popcorn haben =================
const STORY={
  title:['8 € FÜR POPCORN?','DER MAIS DARIN KOSTET CENT'],
  keywords:['Popcorn','acht','Euro','Mais','Cent','Abzocke','Kinos','Ticket','Filmstudio','Hälfte','Miete','Personal','Strom','Projektor','Gewinn','Cola','Duft','Werbung','Moment','Eimer','kleine','gratis'],
  rim:{lobby:'#ffb0d0',ticket:'#ffe0a0',costs:'#ffd8a8',three:'#fff0c0',smell:'#ffe8b0',buckets:'#ffd0a0',outro:'#ffb0d0'},
};
const ST=name=>TL.scenes.find(s=>s.name===name).start;
function WT(word,scene){const st=ST(scene);return wt(word,st-0.01)-st;}
const talkAt=(scene,lt)=>{const f=Math.floor((ST(scene)+lt)*30);return TL.env?(TL.env[f]||0):0;};
const KUNDIN={skin:'#a8724a',hair:{style:'long',color:'#1a1210'},top:{type:'dress',color:'#c4504a'},iris:'#2a1a10'};
const MANAGER={skin:'#f3c9a5',hair:{style:'bun',color:'#8a4a2a'},top:{type:'jacket',color:'#2a2a3a',shirt:'#ffffff'},pants:'#2a2a3a',iris:'#2a5a3a'};
const CASHIER={skin:'#e8b48c',hair:{style:'short',color:'#d8a050'},hat:'cap',hatC:'#c4281f',top:{type:'shirt',color:'#c4281f'},pants:'#2a2a30',iris:'#3a5a7a'};

function apron(sc,col){const f=mesh(new THREE.PlaneGeometry(60,60),M(col),0,-0.01,0,sc);f.rotation.x=-Math.PI/2;f.castShadow=false;return f;}
// ---------- props ----------
function badge(parent,w,h,txt,col='#c4281f',bg='#fff6dc'){const f=new Flat(parent,w,h,Math.round(w*300),Math.round(h*300),()=>{const W2=Math.round(w*300),H2=Math.round(h*300);rr(8,8,W2-16,H2-16,H2*0.25);fillS(bg,8);text(txt,W2/2,H2/2+4,H2*0.46,col,{ol:false});},{bill:true});f.mesh.castShadow=false;f.update(0,1);return f;}
const STRIPE=tiled(256,64,8,1,g=>{for(let i=0;i<4;i++){g.fillStyle=i%2?'#ffffff':'#d62828';g.fillRect(i*64,0,64,64);}});
function bucket3d(parent,x,y,z,s=1,label=null){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  const b=mesh(new THREE.CylinderGeometry(0.3,0.22,0.55,32,1,true),M('#ffffff',{map:STRIPE,side:THREE.DoubleSide}),0,0.275,0,g);
  cyl(0.22,0.22,0.02,M('#d62828'),0,0.01,0,g,32);
  const pc=M('#fff2c8',{flatShading:true}),pc2=M('#f2d27a',{flatShading:true});for(let i=0;i<38;i++){const a=rnd(i*3.1)*Math.PI*2,r=Math.sqrt(rnd(i*7.7))*0.27;const k=mesh(new THREE.IcosahedronGeometry(0.06+rnd(i)*0.03,0),i%5?pc:pc2,Math.cos(a)*r,0.56+rnd(i*5)*0.1+(0.27-r)*0.25,Math.sin(a)*r,g);k.rotation.set(rnd(i),rnd(i*2),0);}
  if(label){const L=badge(g,0.42,0.16,label,'#ffffff','#1c1410');L.mesh.position.set(0,0.3,0.32);L.bill=false;}return g;}
function coin3d(parent,s=1){const c=cyl(0.09*s,0.09*s,0.022*s,M('#e8b84a',{emissive:'#3a2a00'}),0,0,0,parent,20);c.rotation.x=Math.PI/2;return c;}
function popcornMachine(parent,x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
  box(0.9,0.12,0.7,M('#c4281f'),0,0.06,0,g);box(0.9,0.12,0.7,M('#c4281f'),0,1.05,0,g);[[-0.42,-0.32],[0.42,-0.32],[-0.42,0.32],[0.42,0.32]].forEach(([a,b])=>box(0.05,0.95,0.05,M('#c4281f'),a,0.55,b,g));
  const glass=box(0.84,0.9,0.64,NO(new THREE.MeshToonMaterial({color:'#fff6d8',gradientMap:gm,transparent:true,opacity:0.18})),0,0.55,0,g);glass.castShadow=false;
  const pile=new THREE.Group();g.add(pile);const pc=M('#fff2c8',{flatShading:true});for(let i=0;i<60;i++){const k=mesh(new THREE.IcosahedronGeometry(0.05,0),pc,(rnd(i)-0.5)*0.75,0.16+rnd(i*3)*0.22,(rnd(i*5)-0.5)*0.55,pile);}
  const L=new THREE.PointLight('#ffcf6a',1.2,4,2);L.position.set(0,0.7,0.2);g.add(L);const gl=glowSprite('#ffd27a',1.6,0.5);gl.position.set(0,0.6,0.2);g.add(gl);
  const sign=new Flat(g,0.9,0.28,300,94,()=>{rr(4,4,292,86,20);fillS('#ffd34d',6);text('POPCORN',150,50,52,'#c4281f',{ol:false});});sign.mesh.position.set(0,1.28,0.36);sign.update(0,1);
  const pops=particlesSprites(g,18,'#fff6d8',0.07,1);g.userData={pops,L};return g;}
function animMachine(m,lt){m.userData.pops.forEach((p,i)=>{const u=(lt*1.7+rnd(i))%1;p.position.set((rnd(i*3)-0.5)*0.6,0.3+Math.sin(u*Math.PI)*0.5,(rnd(i*5)-0.5)*0.4);p.material.opacity=Math.sin(u*Math.PI);});m.userData.L.intensity=1.1+Math.sin(lt*9)*0.15;}
function poster(parent,title,col,x,y,z,ry){const f=new Flat(parent,1.1,1.6,330,480,()=>{const g=getCtx();g.fillStyle=col;g.fillRect(0,0,330,480);g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(0,330,330,150);ell(165,180,90,90);g.fillStyle='rgba(255,255,255,0.2)';g.fill();text(title,165,400,title.length>12?30:38,'#fff6dc');g.strokeStyle='#1c1410';g.lineWidth=10;g.strokeRect(5,5,320,470);});
  f.mesh.position.set(x,y,z);f.mesh.rotation.y=ry;f.update(0,1);return f;}
function lobbySet(sc){sc.background=gradBg(['#2a0e1e','#120610']);sc.fog=new THREE.Fog('#1a0812',14,34);
  const carpet=tiled(256,256,8,8,g=>{g.fillStyle='#7a1a2a';g.fillRect(0,0,256,256);g.strokeStyle='#c8a050';g.lineWidth=5;g.beginPath();g.arc(128,128,60,0,7);g.stroke();g.fillStyle='#5a1020';[[0,0],[256,0],[0,256],[256,256]].forEach(([a,b])=>{g.beginPath();g.arc(a,b,40,0,7);g.fill();});});
  room(sc,{w:12,d:10,h:4.4,wall:woodTex('#4a1e26',3,2),floor:carpet});apron(sc,'#5a1420');
  const neon=new Flat(sc,2.6,0.9,780,270,(g,lt)=>{text('KINO',390,140,220,'#ff6ad5',{olc:'#5a0a3a',olw:18});});neon.mesh.position.set(-2.2,3.3,-6.75);neon.update(0,1);
  const nL=new THREE.PointLight('#ff6ad5',1.4,9,2);nL.position.set(-2.2,3.2,-6.0);sc.add(nL);const nG=glowSprite('#ff6ad5',5,0.45);nG.position.set(-2.2,3.3,-6.6);sc.add(nG);
  poster(sc,'WELTRAUM-OPA','#2a5aa8',-5.75,1.9,-3.5,Math.PI/2);poster(sc,'DER LETZTE KEKS','#a85a2a',-5.75,1.9,-1.4,Math.PI/2);poster(sc,'TOASTER 3','#3a8a5a',5.75,1.9,-2.4,-Math.PI/2);
  const counter=box(4.2,1.05,0.9,M('#2a1418'),1.4,0.525,-4.6,sc);box(4.3,0.07,1.0,M('#c8a050'),1.4,1.08,-4.6,sc);
  const menu=new Flat(sc,3.2,1.4,960,420,(g,lt)=>{g.fillStyle='#14100e';g.fillRect(0,0,960,420);g.strokeStyle='#c8a050';g.lineWidth=12;g.strokeRect(6,6,948,408);
    [['POPCORN','8,00 €'],['COLA','5,50 €'],['NACHOS','6,00 €']].forEach(([a,b],i)=>{text(a,240,90+i*120,64,'#ffe8b0',{ol:false});text(b,720,90+i*120,64,i===0&&lt>S.lb.acht?'#ff4a4a':'#ffe8b0',{ol:false});});});
  menu.mesh.position.set(1.4,3.0,-6.75);
  const mach=popcornMachine(sc,0.6,1.1,-4.6,1.0);
  lightsBasic(sc,{hemi:['#ffe0e6','#3a1420',0.82]});const cL=new THREE.PointLight('#ffd8b0',0.8,12,2);cL.position.set(2.5,3.9,-1.5);sc.add(cL);spotOn(sc,[1.5,4.2,1.5],[0.8,1.2,-1],'#ffe2c0',1.0,0.6,0.8);
  return {neon,menu,mach};}

// ---------- 1 LOBBY intro / 7 OUTRO ----------
const S={lb:{}};
function buildLobby(outro){const sc=new THREE.Scene();const L=lobbySet(sc);const sn=outro?'outro':'lobby';
  if(!outro){S.lb.acht=WT('acht','lobby')-0.05;}else S.lb.acht=S.lb.acht||-1;
  const gro=new Toon2D(sc,0.9,-1.4,{},1.0,{kind:'coin'});
  const bk=bucket3d(sc,-0.3,0,-0.9,1.6,outro?null:'8,00 €');const ped=box(0.7,0.9,0.7,M('#2a1418'),-0.3,0.45,-0.9,sc);bk.position.y=0.9;
  const kern=new THREE.Group();sc.add(kern);const kM=M('#f2c84a',{flatShading:true});for(let i=0;i<7;i++){const k=mesh(new THREE.IcosahedronGeometry(0.035,0),kM,(rnd(i)-0.5)*0.24,0,(rnd(i*3)-0.5)*0.1,kern);}
  const cent=badge(sc,0.9,0.32,'0,05 €','#ffffff','#2a7a3a');
  const reel=outro?(()=>{const g=new THREE.Group();g.position.set(-1.3,1.12,-4.5);sc.add(g);const r=cyl(0.36,0.36,0.08,M('#3a3a42'),0,0.36,0,g,28);r.rotation.x=Math.PI/2;for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const h=cyl(0.07,0.07,0.1,M('#1a1a1e'),Math.cos(a)*0.2,0.36+Math.sin(a)*0.2,0,g,12);h.rotation.x=Math.PI/2;}return g;})():null;
  const gratis=outro?badge(sc,1.1,0.36,'GRATIS','#ffffff','#2a7a3a'):null;
  let shots,plan;
  if(!outro){const t={eimer:WT('Eimer','lobby'),acht:S.lb.acht,mais:WT('Mais','lobby'),cent:WT('Cent','lobby'),klingt:WT('Klingt','lobby'),na:WT('Na','lobby'),eig:WT('Eigentlich','lobby'),grund:WT('Grund','lobby')};S.lb.t=t;
    plan=[{type:'g',g:'point',t:t.eimer-0.2},{type:'g',g:'shrug',t:t.klingt-0.1},{type:'g',g:'explain',t:t.grund-0.3}];
    shots=[[0,0,['gro:top','gro:feet',[-0.3,2.0,-0.9]],-8,6,0],[t.acht-0.35,0,[[0.0,3.7,-6.75],[2.8,2.3,-6.75]],0,2,0],[t.mais-0.3,0,[[-0.3,2.6,-0.9],[-0.3,1.4,-0.9],[0.25,1.6,-0.6]],12,10,0],
      [t.klingt-0.3,0,['gro:top','gro:chest'],-6,4,0.95],[t.grund-0.6,0,[[-3.4,3.8,-6.75],[3.4,3.8,-6.75],'gro:feet',[0,0.3,-0.5]],0,8,0]];}
  else{const t={film:WT('Film','outro'),mais:WT('Mais','outro'),gratis:WT('gratis','outro')};S.lb.o=t;
    plan=[{type:'g',g:'explain',t:0.15},{type:'g',g:'monocle',t:t.mais-0.6},{type:'g',g:'point',t:t.gratis-0.35}];
    shots=[[0,0,['gro:top','gro:feet',[-0.3,2.0,-0.9]],6,6,0],[t.mais-0.75,0,['gro:top','gro:chest'],-4,4,0.9],[t.gratis-0.6,0,['gro:top',[-1.3,1.9,-4.5],[-0.3,2.0,-0.9]],-10,8,0]];}
  gro.plan(plan);
  return {sc,anchors:{gro},shots,grade:{mul:'#ffd0e0',a:0.05,vig:0.4,vigCol:'#120610'},
    update(lt){const tk=talkAt(sn,lt);gro.update(lt,{f:faceAt(lt,outro?[[0,'smirk'],[S.lb.o.mais-0.2,'raised'],[S.lb.o.gratis,'laugh']]:[[0,'smug'],[S.lb.t.mais,'raised'],[S.lb.t.klingt,'sideeye'],[S.lb.t.na,'smirk'],[S.lb.t.eig,'happy']],2),talk:tk});
      L.menu.update(lt,Math.floor(lt*10));animMachine(L.mach,lt);
      if(!outro){const t=S.lb.t;const u=clamp((lt-t.mais+0.1)/0.8);kern.visible=lt>t.mais-0.1;kern.position.set(-0.3+u*0.05,2.15+Math.sin(u*Math.PI)*0.4-u*0.3,-0.75+u*0.25);cent.mesh.position.set(0.35,2.0,-0.6);popS(cent.mesh,lt,t.cent-0.05,1);if(lt>t.klingt-0.25)cent.mesh.visible=false;cent.update(lt,1);}
      else{cent.mesh.visible=false;kern.visible=false;const t=S.lb.o;gratis.mesh.position.set(-1.3,2.15,-4.3);popS(gratis.mesh,lt,t.gratis-0.05,1);gratis.update(lt,1);reel.rotation.z=lt*0.8;}}};}
DEF.lobby={build(){return buildLobby(false);}};
DEF.outro={build(){return buildLobby(true);}};

// ---------- 2 TICKET: money flows to the studio (box office inside the lobby) ----------
function boxOffice(sc,x,z){const g=new THREE.Group();g.position.set(x,0,z);sc.add(g);const red=M('#8a1a2a'),gold=M('#c8a050');
  box(2.4,2.6,0.15,M('#5a1020'),0,1.3,-0.55,g);[-1,1].forEach(sd=>box(0.15,2.6,1.2,red,sd*1.2,1.3,0,g));box(2.7,0.35,1.4,gold,0,2.78,0,g);
  box(2.4,1.0,0.15,red,0,0.5,0.55,g);box(2.55,0.07,0.45,gold,0,1.04,0.62,g);
  const glass=box(2.25,1.4,0.03,NO(new THREE.MeshToonMaterial({color:'#cfe8ff',gradientMap:gm,transparent:true,opacity:0.16})),0,1.78,0.6,g);glass.castShadow=false;
  const sign=new Flat(g,1.6,0.42,480,126,()=>{text('KASSE',240,66,96,'#5a1020',{ol:false});});sign.mesh.position.set(0,2.78,0.72);sign.update(0,1);
  const lamp=new THREE.PointLight('#ffd8a0',1.2,4,2);lamp.position.set(0,2.3,0.1);g.add(lamp);return g;}
function studioVault(sc,x,z){const g=new THREE.Group();g.position.set(x,0,z);sc.add(g);
  box(1.1,1.25,0.85,M('#3c4250'),0,0.625,0,g);box(1.16,0.08,0.9,M('#2a2e38'),0,1.27,0,g);const d=cyl(0.26,0.26,0.06,M('#c8a050'),0,0.62,0.44,g,28);d.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const h=box(0.04,0.14,0.04,M('#e8c86a'),Math.cos(a)*0.17,0.62+Math.sin(a)*0.17,0.49,g);h.rotation.z=a;}
  box(0.4,0.03,0.08,M('#0a0a0e'),0,1.315,0,g);
  const sg=new Flat(g,1.5,0.4,450,120,()=>{rr(6,6,438,108,22);fillS('#1c1410',6);text('FILMSTUDIO',225,64,64,'#ffd34d',{ol:false});});sg.mesh.position.set(0,1.62,0.1);sg.update(0,1);sg.bill=true;
  const clap=new THREE.Group();clap.position.set(0.35,1.42,0.1);clap.rotation.z=-0.15;g.add(clap);box(0.36,0.24,0.04,M('#1c1c22'),0,0,0,clap);const arm=box(0.38,0.07,0.04,M('#f2f2f2'),0,0.16,0,clap);
  g.userData={sg,arm};return g;}
DEF.ticket={build(){const sc=new THREE.Scene();const L=lobbySet(sc);
  boxOffice(sc,-3.9,-4.3);const cashier=new Toon2D(sc,-3.9,-4.5,CASHIER,0.9);
  const vault=studioVault(sc,-1.7,-3.3);
  const kund=new Toon2D(sc,-0.6,0.8,KUNDIN,0.95);
  const t={kauf:WT('kaufst','ticket'),teil:WT('Teil','ticket'),studio:WT('Filmstudio','ticket'),half:WT('Hälfte','ticket')};
  kund.plan([{type:'walk',t:0,dur:2.0,from:[-0.6,0.8],to:[-3.55,-3.05]},{type:'g',g:'pay',t:t.kauf-0.35}]);cashier.plan([{type:'g',g:'nod',t:t.kauf+0.2},{type:'g',g:'pay',t:t.teil-0.4}]);
  const coins=[];for(let i=0;i<14;i++){const g=new THREE.Group();sc.add(g);coin3d(g,1.3);coins.push(g);}
  const split=new Flat(sc,2.6,0.9,780,270,(g,lt)=>{const u=easeOut(clamp((lt-t.half+0.3)/0.8));rr(10,40,760,120,20);fillS('#2a2a30',6);rr(10,40,Math.max(40,760*0.6*u),120,20);g.fillStyle='#d62828';g.fill();
    text('STUDIO  50 %+',230,100,52,'#ffffff',{ol:false});text('KINO',650,100,52,'#ffe8b0',{ol:false});text('VOM TICKETPREIS',390,220,48,'#ffe8b0');},{bill:true});split.mesh.castShadow=false;
  const ST0=new THREE.Vector3(-3.55,1.25,-3.55),SLOT=new THREE.Vector3(-1.7,1.33,-3.3);
  return {sc,anchors:{kund,cashier},grade:{mul:'#ffd8e0',a:0.05,vig:0.4,vigCol:'#120610'},
    shots:[[0,0,['kund:top','kund:feet',[-3.9,2.9,-3.7]],-16,6,0,{follow:'kund'}],[t.kauf-0.35,0,['kund:top','cashier:top','kund:knee',[-3.9,1.0,-3.6]],14,6,0],
      [t.teil-0.3,0,[[-3.7,2.2,-3.6],[-1.7,1.9,-3.3],[-1.7,0.1,-3.3],[-2.6,2.4,-3.4]],-4,6,0],[t.half-0.45,0,[[-3.9,3.75,-2.8],[-1.3,3.4,-2.8],[-1.7,1.0,-3.3]],2,4,0]],
    update(lt){kund.update(lt,{f:faceAt(lt,[[0,'happy'],[t.studio,'shock'],[t.half+0.4,'worried']],1)});cashier.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.kauf+0.2,'happy'],[t.teil,'smirk']],4)});
      animMachine(L.mach,lt);L.menu.update(lt,1);vault.userData.arm.rotation.z=Math.max(0,Math.sin(lt*5))*0.35*(lt>t.studio-0.3&&lt<t.studio+1.5?1:0);
      coins.forEach((c,i)=>{const keep=i>=10;const t0=keep?t.kauf+0.25+(i-10)*0.1:t.teil-0.1+i*0.12;const dur=keep?0.5:0.75;const u=clamp((lt-t0)/dur);
        if(keep){c.visible=lt>t0;const end=new THREE.Vector3(-3.95+(i-10)*0.16,1.1,-3.3);c.position.lerpVectors(ST0,end,u);c.position.y+=Math.sin(u*Math.PI)*0.25;c.rotation.y=u<1?lt*8+i:0.3*i;return;}
        c.visible=lt>t0&&u<1;if(!c.visible)return;const st=new THREE.Vector3(-3.6+(i%3)*0.1,1.15,-3.4);c.position.lerpVectors(st,SLOT,u);c.position.y+=Math.sin(u*Math.PI)*0.9;c.rotation.y=lt*9+i;c.rotation.z=lt*5;});
      split.mesh.position.set(-2.6,3.45,-2.8);popS(split.mesh,lt,t.half-0.4,1);split.update(lt,Math.floor(lt*30));}};}};

// ---------- 3 COSTS: the rest is eaten by rent, staff, power, projector ----------
DEF.costs={build(){const sc=new THREE.Scene();sc.background=gradBg(['#3a2a1a','#1a1008']);
  apron(sc,'#5a3418');room(sc,{w:10,d:8,h:3.8,wall:plainNoise('#c89a68',3,1,'#5a3a1a',0.07),floor:woodTex('#7a4a28',3,3)});
  box(10,0.9,0.06,M('#7a4a2a'),0,0.45,-4.78,sc);box(10,0.06,0.1,M('#4a2a14'),0,0.92,-4.76,sc);
  const win=windowGlow(sc,2.1,2.1,-4.75,1.3,1.7,'#ffe6b8',0,false);const wL=new THREE.PointLight('#ffe0b0',1.1,7,2);wL.position.set(2.1,2.0,-3.6);sc.add(wL);
  const shelf=new THREE.Group();shelf.position.set(-2.9,0,-4.55);sc.add(shelf);box(1.7,2.4,0.4,M('#5a3a22'),0,1.2,0,shelf);[0.6,1.3,2.0].forEach(y=>{box(1.6,0.05,0.42,M('#3a2414'),0,y,0.02,shelf);for(let i=0;i<3;i++){const c=cyl(0.2,0.2,0.08,M(['#8a8a92','#c4281f','#3a5a8a'][i]),-0.5+i*0.5,y+0.24,0.05,shelf,20);c.rotation.x=Math.PI/2;}});
  poster(sc,'DER LETZTE KEKS','#a85a2a',-0.6,2.15,-4.75,0);
  const desk=box(3.2,0.9,1.1,M('#7a4a2a'),0,0.45,-1.8,sc);box(3.3,0.06,1.2,M('#4a2a14'),0,0.93,-1.8,sc);
  const lamp=candle3d(sc,-1.2,0.96,-2.0,1.4,'#ffcf86',1.0,6);
  const papers=[];for(let i=0;i<5;i++){const p=box(0.32,0.012,0.42,M('#f6f0e0'),0.9+rnd(i)*0.3,0.97+i*0.013,-1.8+rnd(i*3)*0.1,sc);p.rotation.y=(rnd(i*7)-0.5)*0.6;}
  const mgr=new Toon2D(sc,0.2,-2.9,MANAGER,1.12);
  const t={rest:WT('Rest','costs'),miete:WT('Miete','costs'),pers:WT('Personal','costs'),strom:WT('Strom','costs'),proj:WT('Projektor','costs')};
  mgr.plan([{type:'g',g:'explain',t:Math.max(0.1,t.rest-0.3)},{type:'g',g:'shrug',t:t.proj+0.3}]);
  const pile=[];for(let i=0;i<4;i++){const g=new THREE.Group();sc.add(g);coin3d(g,1.4);g.position.set(0.15+(i%2)*0.22,0.98+Math.floor(i/2)*0.03,-1.5+Math.floor(i/2)*0.05);pile.push(g);}
  const labels=[['MIETE',t.miete,2.95],['PERSONAL',t.pers,2.6],['STROM',t.strom,2.25],['PROJEKTOR',t.proj,1.9]].map(([l,tt,y])=>{const b=badge(sc,0.9,0.3,l,'#ffffff','#c4281f');const x=1.0;b.mesh.position.set(x,y,-2.0);return {b,tt,x,y};});
  lightsBasic(sc,{hemi:['#fff0dc','#4a2a14',0.8],sun:{c:'#ffe8c8',i:0.75,p:[3,6,5],t:[0,0,-2],r:8}});
  return {sc,anchors:{mgr},grade:{mul:'#ffe0b8',a:0.05,vig:0.4,vigCol:'#1a0e06'},
    shots:[[0,0,['mgr:top','mgr:chest',[0.3,0.9,-1.5],[-1.2,1.3,-2.0]],-8,6,0],[t.miete-0.35,0,['mgr:top',[1.45,3.1,-2.0],[-0.4,0.95,-1.5],[1.45,1.75,-2.0]],0,6,0]],
    update(lt){mgr.update(lt,{f:faceAt(lt,[[0,'worried'],[t.strom,'sad'],[t.proj+0.3,'tired']],5)});flicker(lamp);
      labels.forEach((L,i)=>{L.b.update(lt,1);popS(L.b.mesh,lt,L.tt-0.05,1);const c=pile[i];const u=clamp((lt-L.tt)/0.45);if(u>0){c.position.set(lerp(0.15+(i%2)*0.22,L.x-0.55,Math.sqrt(u))+Math.sin(u*Math.PI)*0.25,lerp(0.98,L.y,u*u),lerp(-1.5,-1.95,u));c.visible=u<1;}});}};}};

// ---------- stage set (cinema stage with curtain) ----------
const CURT=tiled(256,256,12,1,g=>{const gr=g.createLinearGradient(0,0,256,0);[['#5a0a14',0],['#b8222e',0.3],['#e0404a',0.5],['#b8222e',0.7],['#5a0a14',1]].forEach(([c,o])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,256,256);});
function stageSet(sc){sc.background=gradBg(['#2a0a10','#100406']);
  const fl=mesh(new THREE.PlaneGeometry(40,24),M('#ffffff',{map:woodTex('#8a5a30',11,7)}),0,0,4,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const cu=mesh(new THREE.PlaneGeometry(18,8),M('#ffffff',{map:CURT}),0,4,-5,sc);cu.castShadow=false;
  box(18,0.9,0.4,M('#8a1420'),0,7.0,-4.7,sc);box(18,0.12,0.45,M('#c8a050'),0,6.55,-4.65,sc);
  const fls=[];for(let i=0;i<9;i++){const x=-6+i*1.5;box(0.3,0.12,0.2,M('#2a2a2a'),x,0.06,1.6,sc);const gs=glowSprite('#ffd890',0.9,0.35);gs.position.set(x,0.18,1.55);sc.add(gs);fls.push(gs);}
  lightsBasic(sc,{hemi:['#ffe8dc','#3a1810',0.75],sun:{c:'#fff0d8',i:0.7,p:[2,7,7],t:[0,0,-2],r:10}});return {cu,fls};}

// ---------- 4 THREE: ticket / cola / popcorn profit ----------
DEF.three={build(){const sc=new THREE.Scene();stageSet(sc);
  const t={ticket:WT('Ticket','three'),kaum:WT('Kaum','three'),cola:WT('Cola','three'),besser:WT('besser','three'),pop:WT('Popcorn','three'),rein:WT('reiner','three')};
  const xs=[-2.2,0,2.2];const items=[];const bars=[];const hs=[0.3,1.25,2.6];const tt=[t.kaum,t.besser,t.rein];
  xs.forEach((x,i)=>{cyl(0.6,0.65,0.8,M('#2a2a3a'),x,0.4,-2,sc,32);const top=cyl(0.62,0.62,0.04,M('#c8a050'),x,0.82,-2,sc,32);
    const it=new THREE.Group();it.position.set(x,0.84,-2);sc.add(it);
    if(i===0){const tk=new Flat(it,0.9,0.45,300,150,()=>{rr(6,6,288,138,14);fillS('#ffe8b0',6);text('TICKET',150,78,54,'#7a1a2a',{ol:false});});tk.mesh.position.set(0,0.35,0);tk.update(0,1);tk.mesh.rotation.x=-0.2;}
    if(i===1){cyl(0.18,0.14,0.55,M('#d62828'),0,0.275,0,it,24);cyl(0.19,0.19,0.03,MAT.white,0,0.56,0,it,24);const st=cyl(0.015,0.015,0.35,MAT.white,0.05,0.72,0,it,8);st.rotation.z=-0.2;}
    if(i===2){const b=bucket3d(it,0,0,0,1.15);}
    items.push(it);box(0.5,0.84,0.5,M('#2a2a3a'),x+0.95,0.42,-2,sc);box(0.54,0.04,0.54,M('#c8a050'),x+0.95,0.86,-2,sc);const bar=box(0.36,1,0.36,M(i===2?'#3ac24a':'#5aa86a',{emissive:i===2?'#0a3a10':'#000000'}),x+0.95,0.5,-2,sc);bars.push(bar);});
  const verdict=[['KAUM','#c4281f'],['BESSER','#d8a83a'],['FAST ALLES','#2a8a3a']].map(([l,c],i)=>{const b=badge(sc,1.3,0.36,l,'#ffffff',c);b.mesh.position.set(xs[i]+0.95,0.4,-1.6);return b;});
  const spark=particlesSprites(sc,26,'#ffe866',0.12,1,THREE.AdditiveBlending);
  xs.forEach(x=>spotOn(sc,[x,5,1.5],[x,0.9,-2],'#fff0d8',0.5,0.32,0.6));
  return {sc,grade:{mul:'#ffe0d8',a:0.04,vig:0.4,vigCol:'#140406'},
    shots:[[0,0,[[-2.9,1.7,-2],[-0.9,1.7,-2],[-2.2,0.1,-2]],-8,8,0],[t.cola-0.3,0,[[-0.7,1.9,-2],[1.3,2.6,-2],[0,0.1,-2]],0,8,0],[t.pop-0.3,0,[[1.5,2.2,-2],[3.5,4.0,-2],[2.2,0.1,-2]],8,8,0],[t.rein+0.45,0,[[-3.0,3.2,-2],[3.4,3.4,-2],[0,0.1,-2]],0,8,0]],
    update(lt){items.forEach((it,i)=>{it.rotation.y=Math.sin(lt*0.8+i)*0.25;});
      bars.forEach((b,i)=>{const u=easeOut(clamp((lt-tt[i]+0.2)/0.7));const h=Math.max(0.02,hs[i]*u);b.scale.y=h;b.position.y=0.88+h/2;verdict[i].mesh.position.y=0.88+h+0.3;verdict[i].update(lt,1);popS(verdict[i].mesh,lt,tt[i]+0.4,1);});
      spark.forEach((p,i)=>{const u=(lt-t.rein-0.3)/1.2;p.visible=u>0&&u<1;if(!p.visible)return;const a=rnd(i)*Math.PI*2;p.position.set(3.05+Math.cos(a)*u*1.2,2.2+Math.sin(a)*u*1.2+u*0.3,-2);p.material.opacity=1-u;});}};}};

// ---------- 5 SMELL: the scent is the advertisement ----------
DEF.smell={build(){const sc=new THREE.Scene();const L=lobbySet(sc);
  // entrance doors (daylight) on the right wall
  const door=box(0.1,2.6,2.4,NO(new THREE.MeshBasicMaterial({color:'#e8c890'})),5.78,1.3,-0.6,sc);door.castShadow=false;const dG=glowSprite('#ffe0a0',3,0.28);dG.position.set(5.5,1.4,-0.6);sc.add(dG);
  const sh2=shaft(8,0.9,2.4,'#ffe8c0',0.1);sh2.position.set(5.7,2.2,-0.6);sh2.rotation.set(0,0,1.1);sc.add(sh2);
  const kund=new Toon2D(sc,5.2,-0.4,KUNDIN,0.95);const t={riecht:WT('riecht','smell'),eingang:WT('Eingang','smell'),duft:WT('Duft','smell'),werb:WT('Werbung','smell')};
  kund.plan([{type:'walk',t:0,dur:1.5,from:[5.0,-0.3],to:[3.4,-1.2]},{type:'g',g:'sniff',t:1.55},{type:'walk',t:t.duft+0.3,dur:2.2,to:[1.6,-3.2]}]);
  const ribbons=[];for(let r=0;r<3;r++){const arr=[];for(let i=0;i<26;i++){const s=glowSprite('#ffd890',0.5,0.0);sc.add(s);arr.push(s);}ribbons.push(arr);}
  const werb=badge(sc,1.5,0.42,'WERBUNG','#ffffff','#c4281f');
  return {sc,anchors:{kund},grade:{mul:'#ffd8c0',a:0.05,vig:0.4,vigCol:'#120610'},
    shots:[[0,0,[[0.6,2.2,-4.6],[4.6,2.4,-0.8],'kund:feet'],-24,8,0,{follow:'kund'}],[1.5,0,['kund:top','kund:chest'],-20,4,0.95],[t.duft-0.3,0,[[0.6,2.0,-4.6],[3.6,2.6,-1.2],'kund:top','kund:feet'],-20,8,0]],
    update(lt){kund.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.riecht+0.2,'happy'],[t.duft+0.2,'smirk']],3),turn:lt>1.5&&lt<t.duft+0.3?-0.4:undefined});animMachine(L.mach,lt);L.menu.update(lt,1);
      ribbons.forEach((arr,r)=>arr.forEach((s,i)=>{const u=i/arr.length;const ph=lt*0.9-u*2+r*0.7;const x=lerp(0.6,4.6,u),z=lerp(-4.4,-0.8,u)+Math.sin(ph*3+r)*0.3,y=1.7+Math.sin(u*Math.PI)*0.8+Math.sin(ph*2.3+r*2)*0.25+r*0.15;
        s.position.set(x,y,z);const appear=clamp((lt-0.2-u*1.5)/0.5);s.material.opacity=0.32*appear*(1-u*0.4);s.scale.setScalar(0.5+u*0.5);}));
      werb.mesh.position.set(2.6,2.95,-2.4);popS(werb.mesh,lt,t.werb-0.05,1);werb.update(lt,1);}};}};

// ---------- 6 BUCKETS: the big bucket costs the cinema almost nothing more ----------
DEF.buckets={build(){const sc=new THREE.Scene();const SS=stageSet(sc);
  const t={moment:WT('Moment','buckets'),eimer:WT('Eimer','buckets'),weil:WT('Weil','buckets'),kostet:WT('kostet','buckets'),klein:WT('kleine','buckets'),euro:WT('Euro','buckets'),gewinn:WT('Gewinn','buckets')};
  const sizes=[['S','4 €','0,25 €',0.8],['M','6 €','0,30 €',1.05],['L','7 €','0,35 €',1.3],['XL','8 €','0,40 €',1.6]];
  const bks=sizes.map(([n,p,c,s],i)=>{const x=-1.95+i*1.27;const b=bucket3d(sc,x,0,-2,s,n);const pt=badge(sc,0.8,0.3,p,'#ffffff','#1c1410');const ct=badge(sc,1.0,0.3,'Kosten '+c,'#1c1410','#bfe8b0');return {b,pt,ct,x,s};});
  const gro=new Toon2D(sc,3.15,-1.1,{},1.0,{kind:'coin'});gro.plan([{type:'walk',t:0,dur:1.1,from:[4.8,-0.9],to:[3.15,-1.1]},{type:'g',g:'point',t:t.eimer-0.6},{type:'g',g:'explain',t:t.weil-0.2},{type:'g',g:'monocle',t:t.gewinn-0.9}]);
  const rule=badge(sc,3.4,0.5,'+1 € FÜR DICH ≈ +1 € GEWINN','#ffffff','#2a7a3a');
  spotOn(sc,[0,6,3],[0,1,-2],'#fff0d8',0.7,0.6,0.7);
  return {sc,anchors:{gro},grade:{mul:'#ffe0d8',a:0.05,vig:0.4,vigCol:'#140406'},
    shots:[[0,0,['gro:top','gro:feet',[1.86,2.0,-2]],-10,6,0],[t.eimer-0.35,0,[[1.86,2.7,-2],[1.86,0.1,-2],'gro:top','gro:feet'],6,6,0],[t.weil-0.3,0,[[-2.3,1.6,-2],[2.4,2.9,-2],[0,0.1,-2]],0,8,0],[t.kostet-0.3,0,[[0.2,3.0,-2],[2.4,1.0,-2],[-0.8,2.3,-2]],6,8,0],[t.euro-0.35,0,[[-1.8,3.9,-1.5],[1.8,3.9,-1.5],[1.86,1.0,-2],'gro:top'],0,6,0]],
    update(lt){gro.update(lt,{f:faceAt(lt,[[0,'raised'],[t.weil,'smug'],[t.euro,'happy']],2),talk:talkAt('buckets',lt)});
      const frz=lt<t.weil-0.4;bks.forEach((o,i)=>{o.b.rotation.y=frz?0:Math.sin(lt*0.7+i)*0.2;o.pt.mesh.position.set(o.x,o.s*0.9+0.45,-1.6);o.ct.mesh.position.set(o.x,o.s*0.9+0.82,-1.6);o.pt.update(lt,1);o.ct.update(lt,1);popS(o.pt.mesh,lt,t.weil-0.1+i*0.12,1);popS(o.ct.mesh,lt,t.klein-0.05+i*0.12,1);});
      SS.fls.forEach((f,i)=>f.material.opacity=0.3+Math.sin(lt*2+i)*0.04);
      rule.mesh.position.set(0,3.6,-1.5);popS(rule.mesh,lt,t.euro-0.1,1);rule.update(lt,1);}};}};
