// kit.js — reusable cinema props/sets (from popcorn-short): badge, bucket3d, coin3d, popcornMachine, poster, lobbySet, boxOffice, studioVault, stageSet
const ST=name=>TL.scenes.find(s=>s.name===name).start;
function WT(word,scene){const st=ST(scene);return wt(word,st-0.01)-st;}
const talkAt=(scene,lt)=>{const f=Math.floor((ST(scene)+lt)*30);return TL.env?(TL.env[f]||0):0;};
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
function lobbySet(sc){sc.background=gradBg(['#f2c890','#c87850']);
  const carpet=tiled(256,256,8,8,g=>{g.fillStyle='#c0303c';g.fillRect(0,0,256,256);g.strokeStyle='#f2c860';g.lineWidth=5;g.beginPath();g.arc(128,128,60,0,7);g.stroke();g.fillStyle='#9a1c2c';[[0,0],[256,0],[0,256],[256,256]].forEach(([a,b])=>{g.beginPath();g.arc(a,b,40,0,7);g.fill();});});
  room(sc,{w:12,d:10,h:4.4,wall:woodTex('#e8b47a',3,2),floor:carpet});apron(sc,'#a82834');
  box(12,1.1,0.08,M('#8a2a2a'),0,0.55,-6.78,sc);box(12,0.1,0.12,M('#f2c860'),0,1.12,-6.76,sc);[-1,1].forEach(sd=>{box(0.08,1.1,10,M('#8a2a2a'),sd*5.78,0.55,-2,sc);box(0.12,0.1,10,M('#f2c860'),sd*5.76,1.12,-2,sc);});
  for(let i=0;i<5;i++){const x=-4+i*2;const sc2=new THREE.Group();sc2.position.set(x,4.25,-6.6);sc.add(sc2);cyl(0.22,0.3,0.25,M('#f2c860'),0,0,0,sc2,16);const gl=glowSprite('#ffe8b0',1.6,0.5);gl.position.y=-0.15;sc2.add(gl);}
  const neon=new Flat(sc,2.6,0.9,780,270,(g,lt)=>{text('KINO',390,140,220,'#ff6ad5',{olc:'#5a0a3a',olw:18});});neon.mesh.position.set(-2.2,3.3,-6.75);neon.update(0,1);
  const nL=new THREE.PointLight('#ff6ad5',1.4,9,2);nL.position.set(-2.2,3.2,-6.0);sc.add(nL);const nG=glowSprite('#ff6ad5',5,0.45);nG.position.set(-2.2,3.3,-6.6);sc.add(nG);
  poster(sc,'WELTRAUM-OPA','#2a5aa8',-5.75,1.9,-3.5,Math.PI/2);poster(sc,'DER LETZTE KEKS','#a85a2a',-5.75,1.9,-1.4,Math.PI/2);poster(sc,'TOASTER 3','#3a8a5a',5.75,1.9,-2.4,-Math.PI/2);
  const counter=box(4.2,1.05,0.9,M('#8a2a2a'),1.4,0.525,-4.6,sc);box(4.3,0.07,1.0,M('#c8a050'),1.4,1.08,-4.6,sc);
  const menu=new Flat(sc,3.2,1.4,960,420,(g,lt)=>{g.fillStyle='#14100e';g.fillRect(0,0,960,420);g.strokeStyle='#c8a050';g.lineWidth=12;g.strokeRect(6,6,948,408);
    [['POPCORN','8,00 €'],['COLA','5,50 €'],['NACHOS','6,00 €']].forEach(([a,b],i)=>{text(a,240,90+i*120,64,'#ffe8b0',{ol:false});text(b,720,90+i*120,64,i===0&&lt>S.lb.acht?'#ff4a4a':'#ffe8b0',{ol:false});});});
  menu.mesh.position.set(1.4,3.0,-6.75);
  const mach=popcornMachine(sc,0.6,1.1,-4.6,1.0);
  lightsBasic(sc,{hemi:['#fff2e4','#a85a40',1.15],sun:{c:'#fff0dc',i:0.62,p:[7,7.5,3.5],t:[0,0,-3],r:12}});const cL=new THREE.PointLight('#ffe0b8',1.0,14,2);cL.position.set(0,4.0,-2);sc.add(cL);spotOn(sc,[1.5,4.2,1.5],[0.8,1.2,-1],'#ffe2c0',1.0,0.6,0.8);
  return {neon,menu,mach};}

const S={lb:{acht:99}};
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
const CURT=tiled(256,256,12,1,g=>{const gr=g.createLinearGradient(0,0,256,0);[['#5a0a14',0],['#b8222e',0.3],['#e0404a',0.5],['#b8222e',0.7],['#5a0a14',1]].forEach(([c,o])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,256,256);});
function stageSet(sc){sc.background=gradBg(['#8a2030','#3a0c14']);
  const fl=mesh(new THREE.PlaneGeometry(40,24),M('#ffffff',{map:woodTex('#c88a50',11,7)}),0,0,4,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const cu=mesh(new THREE.PlaneGeometry(18,8),M('#ffffff',{map:CURT}),0,4,-5,sc);cu.castShadow=false;
  box(18,0.9,0.4,M('#8a1420'),0,7.0,-4.7,sc);box(18,0.12,0.45,M('#c8a050'),0,6.55,-4.65,sc);
  const fls=[];for(let i=0;i<9;i++){const x=-6+i*1.5;box(0.3,0.12,0.2,M('#2a2a2a'),x,0.06,1.6,sc);const gs=glowSprite('#ffd890',0.9,0.35);gs.position.set(x,0.18,1.55);sc.add(gs);fls.push(gs);}
  lightsBasic(sc,{hemi:['#fff0e4','#8a4a30',1.1],sun:{c:'#fff0d8',i:0.7,p:[2,7,7],t:[0,0,-2],r:10}});return {cu,fls};}

