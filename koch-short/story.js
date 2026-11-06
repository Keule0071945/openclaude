// ================= COZY COOKING SHORT: Fluffige Pancakes (60 s, no voice: step cards + ASMR + lo-fi) =================
// Morning sun through the kitchen window, warm butcher block, sage + terracotta + cream palette. Every preparation step on screen.
const STORY={title:null,keywords:[],rim:{intro:'#ffe0b0',trocken:'#ffe0b0',nass:'#ffe0b0',ruehren:'#ffe0b0',ruhen:'#ffd090',pfanne:'#ffc890',blasen:'#ffc890',wenden:'#ffc890',stapel:'#ffe0b0',final:'#ffd8a0'}};
const CT=0.92; // counter top height
const LT=(scene,lt)=>ST(scene)+lt;
// ---------- materials & textures ----------
const SUBWAY=tiled(256,128,6,4,g=>{g.fillStyle='#f4ecdc';g.fillRect(0,0,256,128);g.strokeStyle='#d8cbb2';g.lineWidth=6;g.strokeRect(0,0,256,64);g.strokeRect(-128,64,256,64);g.strokeRect(128,64,256,64);g.fillStyle='rgba(255,255,255,0.35)';g.fillRect(10,8,236,10);g.fillRect(10,72,108,10);g.fillRect(138,72,108,10);});
const BLOCK=tiled(512,512,3,1.4,g=>{g.fillStyle='#a8743e';g.fillRect(0,0,512,512);for(let i=0;i<8;i++){g.fillStyle=i%2?'#9e6c38':'#b07c46';g.fillRect(i*64,0,64,512);}g.strokeStyle='rgba(90,50,20,0.25)';g.lineWidth=2;for(let i=0;i<60;i++){const x=rnd(i)*512;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+8,170,x-8,340,x+4,512);g.stroke();}});
const CHECK=tiled(128,128,4,4,g=>{g.fillStyle='#f6f0e4';g.fillRect(0,0,128,128);g.fillStyle='rgba(200,70,60,0.85)';g.fillRect(0,0,64,64);g.fillRect(64,64,64,64);g.fillStyle='rgba(200,70,60,0.4)';g.fillRect(64,0,64,64);g.fillRect(0,64,64,64);});
function radialTex(stops,extra){return ctex(256,256,g=>{const gr=g.createRadialGradient(128,128,0,128,128,128);stops.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,256,256);if(extra)extra(g);}).t;}
const RAW=radialTex([[0,'#ecd08a'],[0.85,'#e6c47a'],[1,'#d8ac5a']],g=>{g.fillStyle='rgba(255,255,255,0.35)';g.beginPath();g.ellipse(100,90,50,20,-0.5,0,7);g.fill();});
const GOLD=radialTex([[0,'#c87a30'],[0.55,'#b8682a'],[0.8,'#d89a50'],[1,'#f0d090']],g=>{for(let i=0;i<120;i++){g.fillStyle=`rgba(120,60,20,${0.15*rnd(i)})`;g.beginPath();g.arc(128+(rnd(i*3)-0.5)*200,128+(rnd(i*7)-0.5)*200,2+rnd(i)*5,0,7);g.fill();}});
const SIDE=tiled(256,32,4,1,g=>{const gr=g.createLinearGradient(0,0,0,32);gr.addColorStop(0,'#c88a40');gr.addColorStop(0.5,'#f2d8a0');gr.addColorStop(1,'#c88a40');g.fillStyle=gr;g.fillRect(0,0,256,32);});
const BATTER=ctex(256,256,g=>{g.fillStyle='#e8c87a';g.fillRect(0,0,256,256);g.strokeStyle='rgba(255,246,220,0.6)';g.lineWidth=6;for(let i=0;i<7;i++){g.beginPath();g.arc(128,128,18+i*16,i,i+3.5);g.stroke();}for(let i=0;i<14;i++){g.fillStyle='rgba(230,200,140,0.9)';g.beginPath();g.arc(128+(rnd(i)-0.5)*170,128+(rnd(i*5)-0.5)*170,4+rnd(i*3)*5,0,7);g.fill();}}).t;
const DRY=ctex(256,256,g=>{g.fillStyle='#ece4d4';g.fillRect(0,0,256,256);for(let i=0;i<300;i++){g.fillStyle=`rgba(${200+rnd(i)*40},${190+rnd(i)*40},${170+rnd(i)*40},0.5)`;g.fillRect(rnd(i*3)*256,rnd(i*7)*256,3,3);}}).t;
const Mlt=(c,o={})=>M(c,o); // toon (outlined)
const glassM=(c,op)=>NO(new THREE.MeshToonMaterial({color:c,gradientMap:gm,transparent:true,opacity:op}));
function lathe(pts,mat,seg=40){const g=new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)),seg);return new THREE.Mesh(g,mat);}
// ---------- kitchen set ----------
function kitchenSet(sc,{sunAngle=0}={}){sc.background=gradBg(['#f4e4cc','#e0c8a4']);
  const fl=mesh(new THREE.PlaneGeometry(30,30),M('#b88a5a'),0,0,0,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const counter=box(7,CT,2.2,M('#7a9a82'),0,CT/2,-0.2,sc);const top=box(7.1,0.06,2.3,M('#ffffff',{map:BLOCK}),0,CT-0.0,-0.2,sc);top.castShadow=false;
  const wall=mesh(new THREE.PlaneGeometry(9,4),M('#ffffff',{map:SUBWAY}),0,CT+1.8,-1.3,sc);wall.castShadow=false;
  // window (light source), shelf with jars, plant, hanging utensils
  const win=windowGlow(sc,-1.5,CT+1.35,-1.28,1.3,1.1,'#fff2d0',0,false);win.traverse(m=>{if(m.isMesh)m.castShadow=false;});
  box(1.5,0.06,0.18,M('#c89a60'),-1.5,CT+0.78,-1.2,sc);const herbs=new THREE.Group();herbs.position.set(-1.9,CT+0.81,-1.18);sc.add(herbs);cyl(0.09,0.07,0.14,M('#d8784a'),0,0.07,0,herbs,16);[[0,0.22,0,0.09],[-0.05,0.18,0.03,0.07],[0.06,0.2,-0.02,0.07]].forEach(([x,y,z,r])=>sph(r,M('#6a9a4a'),x,y,z,herbs));
  box(1.6,0.05,0.26,M('#c89a60'),1.4,CT+1.15,-1.17,sc);[[0.85,'#f2e6c8',0.2],[1.2,'#e8c87a',0.25],[1.55,'#d8b8a0',0.18],[1.9,'#f2f0ea',0.22]].forEach(([x,c,h])=>{cyl(0.08,0.08,h,glassM('#f4f8ff',0.55),x,CT+1.18+h/2,-1.15,sc,16);cyl(0.07,0.07,h*0.7,M(c),x,CT+1.18+h*0.35,-1.15,sc,16);cyl(0.085,0.085,0.03,M('#c89a60'),x,CT+1.18+h+0.015,-1.15,sc,16);});
  const rail=cyl(0.012,0.012,1.4,M('#c8a050'),1.4,CT+0.75,-1.24,sc,8);rail.rotation.z=Math.PI/2;[[1.0,'#c8a050'],[1.35,'#8a8e9a'],[1.75,'#c89a60']].forEach(([x,c])=>{cyl(0.01,0.01,0.3,M(c),x,CT+0.58,-1.22,sc,6);sph(0.04,M(c),x,CT+0.42,-1.22,sc,1,1.2,0.4);});
  const pot=new THREE.Group();pot.position.set(2.6,CT,-0.9);sc.add(pot);cyl(0.14,0.11,0.24,M('#d8784a'),0,0.12,0,pot,16);for(let i=0;i<7;i++){const l=sph(0.1,M(i%2?'#5a8a4a':'#7aaa5a'),Math.cos(i)*0.08,0.32+rnd(i)*0.12,Math.sin(i)*0.08,pot,0.6,1.4,0.6);l.rotation.z=(rnd(i*3)-0.5)*0.8;}
  // sunlight through the window: warm key from behind-left (the back wall lets it through), long soft shadows toward camera
  const shaftM=shaft(3.2,0.55,1.1,'#ffe8b0',0.06);shaftM.position.set(-1.5,CT+1.4,-1.25);shaftM.rotation.set(0.95,0,-0.35);sc.add(shaftM);
  const dust=particlesSprites(sc,40,'#fff2d0',0.025,0.7,THREE.AdditiveBlending);
  lightsBasic(sc,{hemi:['#ffe8d0','#6a4428',0.75],sun:{c:'#ffd8a0',i:0.62,p:[-3.2+sunAngle,5.5,-4.5],t:[0.3,CT,0.2],r:4}});
  shadowCatcher(sc,CT+0.035,0.42,7,0,-0.2);const fill=new THREE.PointLight('#ffe8c8',0.5,8,2);fill.position.set(1.5,2.6,2.5);sc.add(fill);
  return {dust,update(lt){dust.forEach((d,i)=>{const u=((lt*0.05+rnd(i))%1);d.position.set(-1.5+(rnd(i*3)-0.5)*1.2+Math.sin(lt*0.3+i)*0.1,CT+0.2+u*1.6,-1.0+rnd(i*7)*1.2);d.material.opacity=0.5*Math.sin(u*Math.PI);});}};}
// ---------- props ----------
function bowl(p,x,z,r=0.22,col='#9ab8a0'){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);
  const sh=lathe([[0,0],[r*0.5,0],[r*0.85,r*0.15],[r,r*0.5],[r*1.03,r*0.72],[r*0.97,r*0.74],[r*0.93,r*0.52],[r*0.8,r*0.2],[r*0.45,r*0.05],[0,r*0.05]],M(col,{side:THREE.DoubleSide}));sh.castShadow=true;g.add(sh);
  const fill=cyl(1,1,0.02,M('#ffffff',{map:DRY}),0,0,0,g,40);fill.castShadow=false;fill.visible=false;
  g.userData={r,fill,set(level,mat){fill.visible=level>0.001;const y=r*(0.06+0.62*level);fill.position.y=y;const rr2=r*(0.5+0.47*Math.min(1,level*1.4));fill.scale.set(rr2,1,rr2);if(mat)fill.material=mat;}};return g;}
function eggMesh(p){const g=new THREE.Group();p.add(g);const sm=M('#f2e2c8');const top=mesh(new THREE.SphereGeometry(0.045,20,12,0,Math.PI*2,0,Math.PI/2),sm,0,0,0,g);top.scale.set(1,1.3,1);const bot=mesh(new THREE.SphereGeometry(0.045,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2),sm,0,0,0,g);bot.scale.set(1,1.3,1);
  const yolk=sph(0.022,M('#ffa82a'),0,0,0,p);const white=sph(0.04,glassM('#ffffff',0.6),0,0,0,p,1,0.35,1);yolk.visible=white.visible=false;return {g,top,bot,yolk,white};}
function stream(p,col,r=0.012){const m=cyl(r,r,1,M(col),0,0,0,p,10);m.castShadow=false;m.visible=false;return {m,set(a,b,on){m.visible=on;if(!on)return;const d=b.clone().sub(a);m.position.copy(a).addScaledVector(d,0.5);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());}};}
function steamPuffs(p,n,x,y,z,spread=0.1,h=0.6){const arr=[];for(let i=0;i<n;i++){const s=glowSprite('#ffffff',0.2,0);p.add(s);arr.push(s);}return {arr,update(lt,k=1){arr.forEach((s,i)=>{const v=((lt*0.35+rnd(i))%1);s.position.set(x+Math.sin(lt*1.3+i*2)*spread*v+(rnd(i*3)-0.5)*spread,y+v*h,z+(rnd(i*5)-0.5)*spread);const hi=camera.position.y>CT+0.9&&Math.abs(camera.position.x-x)<0.6&&Math.abs(camera.position.z-z)<0.6?0.25:1;s.material.opacity=0.22*k*hi*Math.sin(v*Math.PI);s.scale.setScalar(0.06+v*0.2);});}};}
function pan(p,x,z){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);const iron=M('#2a2a30');
  const sh=lathe([[0,0],[0.26,0],[0.29,0.02],[0.31,0.06],[0.3,0.065],[0.275,0.025],[0,0.02]],iron);sh.castShadow=true;g.add(sh);const h=box(0.32,0.03,0.05,iron,0.45,0.05,0,g);h.rotation.z=0.12;sph(0.02,iron,0.6,0.07,0,g);return g;}
function cooktop(p,x,z){box(0.9,0.02,0.9,M('#1c1c22'),x,CT+0.025,z,p).castShadow=false;const ring=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.012,8,40),E('#e8501a'));ring.rotation.x=-Math.PI/2;ring.position.set(x,CT+0.04,z);p.add(ring);const gl=glowSprite('#ff7a30',0.55,0.18);gl.position.set(x,CT+0.06,z);p.add(gl);
  const L=new THREE.PointLight('#ff8a40',0.35,1.2,2);L.position.set(x,CT+0.12,z);p.add(L);return {ring,gl,L};}
function pancake(p,raw=false){const g=new THREE.Group();p.add(g);const sideM=M('#ffffff',{map:SIDE});const topM=M('#ffffff',{map:raw?RAW:GOLD});const botM=M('#ffffff',{map:GOLD});
  const m=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.035,40),[sideM,topM,botM]);m.castShadow=true;m.receiveShadow=true;g.add(m);g.userData={m,topM,sideM};return g;}
function plate(p,x,z){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);const pl=lathe([[0,0],[0.2,0],[0.24,0.012],[0.32,0.03],[0.33,0.035],[0.31,0.036],[0.23,0.018],[0,0.012]],M('#fbf8f2'));g.add(pl);return g;}
function whisk(p){const g=new THREE.Group();p.add(g);cyl(0.012,0.014,0.24,M('#c89a60'),0,0.3,0,g,10);for(let i=0;i<6;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.003,6,24,Math.PI),M('#c8ccd4'));t.scale.set(1,2.4,1);t.rotation.set(0,i/6*Math.PI,Math.PI);t.position.y=0.18;g.add(t);}return g;}
function bag(p,x,z,label,col){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);box(0.22,0.32,0.14,M(col),0,0.16,0,g);box(0.22,0.04,0.12,M(mixc(col,'#000000',0.1)),0,0.34,0,g);
  const l=new Flat(g,0.18,0.12,180,120,()=>{const gg=getCtx();gg.fillStyle='#fffaf0';gg.fillRect(0,0,180,120);gg.strokeStyle='#8a5a3a';gg.lineWidth=6;gg.strokeRect(4,4,172,112);text(label,90,64,label.length>5?30:38,'#8a5a3a',{ol:false});},{lit:true});l.mesh.position.set(0,0.17,0.072);l.update(0,1);return g;}
function jug(p,x,z,col='#fbf8f2'){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);const b=lathe([[0,0],[0.08,0],[0.095,0.06],[0.085,0.2],[0.09,0.24],[0.085,0.245],[0.078,0.2],[0.085,0.06],[0.07,0.01],[0,0.01]],M(col,{side:THREE.DoubleSide}));g.add(b);
  const band=cyl(0.093,0.093,0.03,M('#5a8ad8'),0,0.12,0,g,24);band.castShadow=false;const hdl=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.012,8,16,Math.PI),M(col));hdl.position.set(-0.09,0.13,0);hdl.rotation.z=Math.PI/2;g.add(hdl);return g;}
function mug(p,x,z){const g=new THREE.Group();g.position.set(x,CT+0.03,z);p.add(g);cyl(0.07,0.06,0.13,M('#d8784a'),0,0.065,0,g,20);cyl(0.06,0.06,0.01,M('#4a2a14'),0,0.125,0,g,20).castShadow=false;const h=new THREE.Mesh(new THREE.TorusGeometry(0.035,0.01,8,16),M('#d8784a'));h.position.set(0.075,0.07,0);g.add(h);return g;}
function berries(p,n,cx,cy,cz,rad){const arr=[];for(let i=0;i<n;i++){const blue=i%3!==0;const b=blue?sph(0.016,M('#3a3a7a'),0,0,0,p):sph(0.02,M('#d83a4a'),0,0,0,p,1,1.1,1);const a=rnd(i*3.3)*Math.PI*2,r=Math.sqrt(rnd(i*7.1))*rad;arr.push({b,to:V(cx+Math.cos(a)*r,cy+(blue?0.016:0.02),cz+Math.sin(a)*r),d:rnd(i*1.7)});}return arr;}
// ---------- overlay: cosy step cards ----------
const CARDS=[]; // [t0,t1,num,title,sub]
function card(scene,a,b,num,title,sub){CARDS.push([ST(scene)+a,ST(scene)+b,num,title,sub]);}
function OVERLAY(g,t){
  // intro title + ingredients card
  if(t<5.2){const k=clamp(t/0.6)*clamp((5.1-t)/0.4);g.save();g.globalAlpha=k;g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(80,40,10,0.45)';g.shadowBlur=24;g.shadowOffsetY=6;
    g.font='900 104px Nunito, NunitoX, sans-serif';g.lineWidth=18;g.strokeStyle='#5a3418';g.strokeText('FLUFFIGE',W/2,220);g.fillStyle='#fff6e0';g.fillText('FLUFFIGE',W/2,220);g.strokeText('PANCAKES',W/2,330);g.fillStyle='#ffc86a';g.fillText('PANCAKES',W/2,330);
    g.shadowBlur=10;g.font='900 44px Nunito, NunitoX, sans-serif';g.lineWidth=10;g.strokeText('Sonntagsfrühstück in 1 Minute',W/2,410);g.fillStyle='#fff6e0';g.fillText('Sonntagsfrühstück in 1 Minute',W/2,410);g.restore();
    const k2=clamp((t-1.4)/0.5)*clamp((5.0-t)/0.4);if(k2>0){g.save();g.globalAlpha=k2;const x=W/2-330,y=H*0.6+ (1-k2)*40;g.shadowColor='rgba(60,30,10,0.35)';g.shadowBlur=30;g.shadowOffsetY=10;g.fillStyle='rgba(255,248,236,0.94)';g.beginPath();g.roundRect(x,y,660,500,40);g.fill();g.shadowColor='transparent';
      g.fillStyle='#c8583a';g.font='900 46px Nunito, NunitoX, sans-serif';g.textAlign='left';g.textBaseline='middle';g.fillText('Zutaten · 8 Stück',x+48,y+64);g.fillStyle='#5a3418';g.font='900 36px Nunito, NunitoX, sans-serif';
      ['250 g Mehl','2 TL Backpulver · 2 EL Zucker','1 Prise Salz','2 Eier','300 ml Milch','40 g Butter, geschmolzen'].forEach((l,i)=>{const kk=clamp((t-1.6-i*0.22)/0.3);g.globalAlpha=k2*kk;g.fillText('•  '+l,x+48+(1-kk)*20,y+136+i*58);});g.restore();}}
  for(const [a,b,num,title,sub] of CARDS){if(t<a-0.01||t>b+0.35)continue;const kin=easeOut(clamp((t-a)/0.35)),kout=clamp((b+0.35-t)/0.35);const k=kin*kout;g.save();g.globalAlpha=k;
    const w=860,h=sub?190:140,x=W/2-w/2+(1-kin)*-60,y=H*0.765;g.shadowColor='rgba(60,30,10,0.35)';g.shadowBlur=30;g.shadowOffsetY=10;g.fillStyle='rgba(255,248,236,0.95)';g.beginPath();g.roundRect(x,y,w,h,44);g.fill();g.shadowColor='transparent';
    g.fillStyle='#c8583a';g.beginPath();g.arc(x+86,y+h/2,52,0,7);g.fill();g.fillStyle='#fff6e0';g.font='900 56px Nunito, NunitoX, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(num),x+86,y+h/2+3);
    g.textAlign='left';g.fillStyle='#5a3418';g.font='900 50px Nunito, NunitoX, sans-serif';g.fillText(title,x+168,y+(sub?66:h/2+2));if(sub){g.fillStyle='#9a6a40';g.font='900 36px Nunito, NunitoX, sans-serif';g.fillText(sub,x+168,y+132);}g.restore();}
  // end card
  if(t>57.4){const k=clamp((t-57.4)/0.6);g.save();g.globalAlpha=k;g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(80,40,10,0.45)';g.shadowBlur=24;g.font='900 100px Nunito, NunitoX, sans-serif';g.lineWidth=18;g.strokeStyle='#5a3418';g.strokeText('Guten Appetit!',W/2,300);g.fillStyle='#fff6e0';g.fillText('Guten Appetit!',W/2,300);g.restore();}}

// ---------- 1 INTRO: the cosy counter with everything ready ----------
DEF.intro={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);bowl(sc,0,0,0.24);bag(sc,-0.6,-0.5,'MEHL','#efe2c4');const j=jug(sc,0.55,-0.45);
  const eggs=[0,1].map(i=>{const e=sph(0.045,M('#f2e2c8'),-0.35+i*0.1,CT+0.075,0.35,sc,1,1.3,1);return e;});const bt=box(0.12,0.05,0.07,M('#ffe27a'),0.35,CT+0.055,0.35,sc);const m=mug(sc,1.1,0.1);const st=steamPuffs(sc,10,1.1,CT+0.18,0.1,0.05,0.5);
  return {sc,grade:{mul:'#ffe8d0',a:0.06,vig:0.3,vigCol:'#3a2010'},shots:[[0,0,[[-0.8,CT,-0.5],[1.2,CT,0.4],[-1.5,CT+1.9,-1.28]],-8,22,0]],update(lt){K.update(lt);st.update(lt);}};}};

// ---------- 2 TROCKEN: flour, baking powder, sugar, salt ----------
DEF.trocken={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const B=bowl(sc,0,0,0.24);const fb=bag(sc,0,0,'MEHL','#efe2c4');
  const fstream=stream(sc,'#faf6ee',0.016);const heap=sph(1,M('#ffffff',{map:DRY}),0,0,0,sc);heap.scale.set(0.001,0.001,0.001);
  const spoon=new THREE.Group();sc.add(spoon);cyl(0.006,0.006,0.18,M('#c8ccd4'),0.09,0,0,spoon,6).rotation.z=Math.PI/2;sph(0.025,M('#c8ccd4'),0,0,0,spoon,1,0.35,0.8);const spoonLoad=sph(0.02,M('#ffffff'),0,0.006,0,spoon,1,0.4,0.8);
  const sugar=particlesSprites(sc,30,'#ffffff',0.012,1);const salt=particlesSprites(sc,14,'#ffffff',0.008,1);
  const t={mehl:0.3,bp:2.4,zuck:3.9,salz:5.4};card('trocken',0.2,2.2,1,'Mehl in die Schüssel','250 g');card('trocken',2.3,3.8,2,'Backpulver','2 TL');card('trocken',3.9,5.3,3,'Zucker','2 EL');card('trocken',5.4,6.9,4,'Salz','1 Prise');
  return {sc,grade:{mul:'#ffe8d0',a:0.06,vig:0.3,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.3,CT+0.65,0],[0.3,CT,0]],-6,28,0],[t.bp-0.2,0,[[-0.26,CT,-0.26],[0.26,CT,0.26]],0,84,0],[t.salz-0.2,0,[[-0.2,CT+0.4,0],[0.2,CT,0]],12,40,0]],
    update(lt){K.update(lt);const pour=clamp((lt-t.mehl)/1.8);const tilt=lt<t.mehl+2.0?clamp((lt-t.mehl+0.3)/0.4):clamp(1-(lt-t.mehl-2.0)/0.4);fb.position.set(-0.18,CT+0.62,-0.05);fb.rotation.z=-tilt*2.1;fb.visible=lt<t.mehl+2.6;
      fstream.set(V(-0.06,CT+0.5,-0.05),V(0,CT+0.08+pour*0.08,0),lt>t.mehl&&lt<t.mehl+1.9);const hs=0.04+pour*0.16;heap.scale.set(hs,hs*0.55*(0.4+pour),hs);heap.position.set(0,CT+0.06+pour*0.03,0);
      const sp=(tt)=>{const u=clamp((lt-tt)/1.2);spoon.visible=u>0&&u<1;spoon.position.set(lerp(0.4,0.03,Math.min(1,u*2)),CT+0.3-Math.sin(Math.min(1,u*2)*Math.PI/2)*0.1,0.05);spoon.rotation.x=u>0.5?-(u-0.5)*3:0;spoonLoad.visible=u<0.6;};
      if(lt<t.zuck)sp(t.bp);else sp(t.zuck);sugar.forEach((p,i)=>{const tt=lt<t.zuck?t.bp:t.zuck;const v=(lt-tt-0.6-rnd(i)*0.3)/0.4;p.visible=v>0&&v<1;p.position.set(0.03+(rnd(i)-0.5)*0.05,CT+0.2-v*0.14,0.05+(rnd(i*3)-0.5)*0.05);});
      salt.forEach((p,i)=>{const v=(lt-t.salz-0.3-rnd(i)*0.4)/0.35;p.visible=v>0&&v<1;p.position.set(0.05+(rnd(i)-0.5)*0.03,CT+0.32-v*0.24,0.0);});}};}};

// ---------- 3 NASS: crack eggs, pour milk, melted butter ----------
DEF.nass={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const B=bowl(sc,0,0,0.24);B.userData.set(0.35);const heap=sph(1,M('#ffffff',{map:DRY}),0,CT+0.1,0,sc);heap.scale.set(0.2,0.07,0.2);
  const E1=eggMesh(sc),E2=eggMesh(sc);const j=jug(sc,0,0);const ms=stream(sc,'#fbf8f2',0.014);const pot=new THREE.Group();sc.add(pot);cyl(0.07,0.06,0.07,M('#c8ccd4'),0,0.035,0,pot,18);cyl(0.06,0.06,0.005,M('#ffd84a'),0,0.06,0,pot,18);const hd=box(0.16,0.012,0.02,M('#2a2a2a'),0.13,0.06,0,pot);
  const bs=stream(sc,'#ffd84a',0.008);const milkFill=cyl(1,1,0.01,M('#fbf6ea'),0,0,0,sc,40);milkFill.visible=false;milkFill.castShadow=false;const yolks=[0,1].map(i=>sph(0.022,M('#ffa82a'),0.03-i*0.07,CT+0.13,0.02+i*0.04,sc));yolks.forEach(y=>y.visible=false);
  const t={e1:0.3,e2:1.6,milk:3.0,butter:5.4};card('nass',0.2,2.9,5,'Eier aufschlagen','2 Stück');card('nass',3.0,5.3,6,'Milch dazu','300 ml');card('nass',5.4,7.3,7,'Geschmolzene Butter','40 g');
  return {sc,grade:{mul:'#ffe8d0',a:0.06,vig:0.3,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.15,CT+0.45,0],[0.15,CT+0.05,0]],-10,24,0.55],[t.milk-0.2,0,[[-0.3,CT+0.55,0],[0.3,CT,0]],14,22,0],[t.butter-0.2,0,[[-0.26,CT,-0.26],[0.26,CT,0.26]],0,82,0]],
    update(lt){K.update(lt);[[E1,t.e1,0.03],[E2,t.e2,-0.04]].forEach(([e,t0,ox],i)=>{const u=lt-t0;const tap=clamp(u/0.35),open=clamp((u-0.4)/0.35);e.g.visible=u<1.4;e.g.position.set(ox+0.02,CT+0.32-Math.sin(tap*Math.PI)*0.04,0.02);
        e.top.position.set(-open*0.05,open*0.03,0);e.top.rotation.z=open*0.9;e.bot.position.set(open*0.05,-open*0.01,0);e.bot.rotation.z=-open*0.9;const f=clamp((u-0.6)/0.35);e.yolk.visible=e.white.visible=u>0.55&&f<1;e.yolk.position.set(ox+0.02,CT+0.3-f*0.18,0.02);e.white.position.set(ox+0.02,CT+0.29-f*0.17,0.02);yolks[i].visible=f>=1;});
      const mu=clamp((lt-t.milk)/2.0),mt=lt<t.milk+2.1?clamp((lt-t.milk+0.4)/0.4):clamp(1-(lt-t.milk-2.1)/0.4);j.position.set(0.32,CT+0.25,0);j.rotation.z=mt*1.7;j.visible=lt>t.milk-0.6&&lt<t.milk+2.8;
      ms.set(V(0.2,CT+0.42,0),V(0.03,CT+0.1+mu*0.06,0),lt>t.milk&&lt<t.milk+2.0);milkFill.visible=mu>0;const lvl=CT+0.06+mu*0.08;milkFill.position.set(0,lvl,0);const rr2=0.14+mu*0.07;milkFill.scale.set(rr2,1,rr2);heap.scale.y=0.07*(1-mu*0.6);yolks.forEach(y=>y.position.y=Math.max(lvl+0.012,y.position.y));
      const bu=clamp((lt-t.butter)/1.2),bt=lt<t.butter+1.3?clamp((lt-t.butter+0.3)/0.3):clamp(1-(lt-t.butter-1.3)/0.3);pot.position.set(-0.3,CT+0.28,0.04);pot.rotation.z=-bt*1.4;pot.visible=lt>t.butter-0.5&&lt<t.butter+1.9;bs.set(V(-0.23,CT+0.31,0.04),V(-0.04,lvl,0.02),lt>t.butter&&lt<t.butter+1.2);}};}};

// ---------- 4 RUEHREN: whisk until just combined ----------
DEF.ruehren={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const B=bowl(sc,0,0,0.24);const bm=M('#ffffff',{map:BATTER});const fill=cyl(0.21,0.21,0.02,bm,0,CT+0.16,0,sc,40);fill.castShadow=false;
  const yolkSwirl=[0,1].map(i=>sph(0.022,M('#ffa82a'),0.03-i*0.07,CT+0.175,0.02+i*0.04,sc));const lumps=[];for(let i=0;i<8;i++)lumps.push(sph(0.012,M('#f8eed0'),(rnd(i)-0.5)*0.26,CT+0.172,(rnd(i*3)-0.5)*0.26,sc));
  const W1=whisk(sc);card('ruehren',0.2,5.2,8,'Kurz verrühren','Ein paar Klümpchen sind okay');
  return {sc,grade:{mul:'#ffe8d0',a:0.06,vig:0.3,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.3,CT+0.6,0],[0.3,CT,0]],-8,30,0],[2.6,0,[[-0.22,CT,-0.22],[0.22,CT,0.22]],0,86,0,{orbit:18}]],
    update(lt){K.update(lt);const a=lt*9;W1.position.set(Math.cos(a)*0.08,CT+0.08,Math.sin(a)*0.08);W1.rotation.set(Math.sin(a)*0.25,a*0.5,Math.cos(a)*0.25);fill.rotation.y=-lt*3;
      const mix=clamp(lt/2.6);yolkSwirl.forEach((y,i)=>{y.visible=mix<0.6;y.scale.setScalar(1-mix*1.5);});bm.color.setRGB(lerp(1.05,1,mix),lerp(1.05,1,mix),lerp(1.05,1,mix));lumps.forEach((l,i)=>{l.visible=i<8-mix*5;const r=Math.hypot(l.position.x,l.position.z);const an=Math.atan2(l.position.z,l.position.x)-0.05;l.position.x=Math.cos(an)*r;l.position.z=Math.sin(an)*r;});}};}};

// ---------- 5 RUHEN: 10 minutes rest (time lapse of window light) ----------
DEF.ruhen={build(){const sc=new THREE.Scene();const K=kitchenSet(sc,{sunAngle:0});const B=bowl(sc,-0.15,0,0.24);const towel=mesh(new THREE.PlaneGeometry(0.62,0.62,8,8),M('#ffffff',{map:CHECK,side:THREE.DoubleSide}),-0.15,CT+0.2,0,sc);towel.rotation.x=-Math.PI/2;
  const pos=towel.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);const r=Math.hypot(x,y);pos.setZ(i,r>0.24?-(r-0.24)*0.9:0.02);}towel.geometry.computeVertexNormals();
  const tm=new THREE.Group();tm.position.set(0.4,CT+0.03,0.15);sc.add(tm);sph(0.08,M('#d8584a'),0,0.08,0,tm,1,0.9,1);cyl(0.07,0.07,0.03,M('#fbf8f2'),0,0.15,0,tm,24);const dial=new Flat(tm,0.12,0.12,120,120,(g,v)=>{g.clearRect(0,0,120,120);g.fillStyle='#fbf8f2';g.beginPath();g.arc(60,60,58,0,7);g.fill();g.strokeStyle='#5a3418';g.lineWidth=4;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(60+Math.cos(a)*44,60+Math.sin(a)*44);g.lineTo(60+Math.cos(a)*54,60+Math.sin(a)*54);g.stroke();}text(v,60,62,34,'#c8583a',{ol:false});});
  dial.mesh.rotation.x=-Math.PI/2;dial.mesh.position.y=0.167;card('ruhen',0.2,3.8,9,'10 Minuten ruhen lassen','Zeit für einen Kaffee');
  const sun=sc.children.find(c=>c.isDirectionalLight);const sun0=sun.position.clone();
  return {sc,grade:{mul:'#ffe0c0',a:0.07,vig:0.32,vigCol:'#3a2010'},shots:[[0,0,[[-0.5,CT,0],[0.55,CT+0.3,0.15]],-10,30,0]],
    update(lt){K.update(lt);const u=clamp(lt/3.6);const m=Math.round(10-u*10);dial.update(String(m).padStart(2,'0')+':00',m);sun.position.set(sun0.x+u*3.0,sun0.y-u*0.8,sun0.z);}};}};

// ---------- 6 PFANNE: butter sizzles, ladle of batter ----------
DEF.pfanne={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const C=cooktop(sc,0,0);const P=pan(sc,0,0);const btr=box(0.06,0.04,0.06,M('#ffe27a'),0.02,CT+0.08,0,sc);const foam=cyl(1,1,0.004,glassM('#ffe48a',0.85),0,CT+0.058,0,sc,32);foam.castShadow=false;foam.scale.set(0.01,1,0.01);
  const ladle=new THREE.Group();sc.add(ladle);sph(0.06,M('#c8ccd4',{side:THREE.DoubleSide}),0,0,0,ladle,1,0.6,1);const lh=cyl(0.008,0.008,0.4,M('#c8ccd4'),0.18,0.12,0,ladle,6);lh.rotation.z=-1.1;const lfill=sph(0.052,M('#f2d894'),0,0.01,0,ladle,1,0.3,1);
  const bstream=stream(sc,'#f2d894',0.02);const pc=pancake(sc,true);pc.visible=false;const st=steamPuffs(sc,10,0,CT+0.1,0,0.12,0.4);const sizz=particlesSprites(sc,18,'#fff4d0',0.012,1,THREE.AdditiveBlending);
  const t={butter:0.2,ladle:3.0};card('pfanne',0.2,2.9,10,'Pfanne, mittlere Hitze','Ein Stück Butter');card('pfanne',3.0,6.4,11,'Eine Kelle Teig','ca. 12 cm groß');
  return {sc,grade:{mul:'#ffe0c8',a:0.06,vig:0.32,vigCol:'#2a1008'},
    shots:[[0,0,[[-0.32,CT+0.35,0],[0.62,CT,0]],-12,32,0],[1.6,0,[[-0.2,CT,-0.2],[0.2,CT,0.2]],8,58,0.5],[t.ladle-0.2,0,[[-0.32,CT+0.5,0],[0.32,CT,0]],10,34,0],[t.ladle+1.6,0,[[-0.24,CT,-0.24],[0.24,CT,0.24]],0,84,0]],
    update(lt){K.update(lt);C.gl.material.opacity=0.16+0.03*Math.sin(lt*7);const mlt=clamp((lt-t.butter)/2.6);btr.scale.set(1-mlt*0.85,1-mlt*0.9,1-mlt*0.85);btr.visible=mlt<0.98;foam.scale.set(0.02+mlt*0.2,1,0.02+mlt*0.2);foam.visible=lt<t.ladle+1.0;
      sizz.forEach((p,i)=>{const v=((lt*2+rnd(i))%1);p.position.set((rnd(i*3)-0.5)*0.3*mlt,CT+0.06+v*0.05,(rnd(i*5)-0.5)*0.3*mlt);p.material.opacity=Math.sin(v*Math.PI)*mlt;});st.update(lt,0.6);
      const lu=clamp((lt-t.ladle)/1.3),lt2=lt<t.ladle+1.4?clamp((lt-t.ladle+0.4)/0.4):clamp(1-(lt-t.ladle-1.4)/0.4);ladle.visible=lt>t.ladle-0.6&&lt<t.ladle+2.0;ladle.position.set(0.12,CT+0.3,0);ladle.rotation.z=lt2*1.6;lfill.visible=lu<0.9;
      bstream.set(V(0.07,CT+0.27,0),V(0,CT+0.07,0),lt>t.ladle&&lt<t.ladle+1.3);pc.visible=lu>0;const r=Math.sqrt(lu);pc.scale.set(0.05+r*0.95,0.6,0.05+r*0.95);pc.position.set(0,CT+0.065,0);}};}};

// ---------- 7 BLASEN: bubbles = time to flip ----------
DEF.blasen={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const C=cooktop(sc,0,0);pan(sc,0,0);const pc=pancake(sc,true);pc.position.set(0,CT+0.065,0);pc.scale.set(1,0.6,1);
  const bub=[];for(let i=0;i<26;i++){const a=rnd(i*3.1)*Math.PI*2,r=Math.sqrt(rnd(i*7.3))*0.16;const b=sph(0.008+rnd(i)*0.006,glassM('#fffaf0',0.9),Math.cos(a)*r,CT+0.078,Math.sin(a)*r,sc,1,0.6,1);const h=cyl(0.006+rnd(i)*0.004,0.006,0.002,M('#d8b070'),Math.cos(a)*r,CT+0.077,Math.sin(a)*r,sc,10);h.castShadow=false;bub.push({b,h,t0:0.5+rnd(i*5)*3.8});}
  const st=steamPuffs(sc,12,0,CT+0.1,0,0.14,0.5);card('blasen',0.2,5.3,12,'Warten auf Bläschen','ca. 2 Minuten');
  return {sc,grade:{mul:'#ffe0c8',a:0.06,vig:0.32,vigCol:'#2a1008'},
    shots:[[0,0,[[-0.2,CT,-0.2],[0.2,CT,0.2]],0,72,0.35],[2.8,0,[[-0.12,CT+0.08,0],[0.12,CT+0.05,0]],-16,26,0.2]],
    update(lt){K.update(lt);st.update(lt,0.8);C.gl.material.opacity=0.16+0.03*Math.sin(lt*7);bub.forEach(o=>{const u=(lt-o.t0)/0.6;o.b.visible=u>0&&u<1;o.b.scale.setScalar(Math.max(0.01,Math.sin(Math.min(1,u)*Math.PI*0.9)));o.h.visible=u>=0.85;});
      const edge=clamp((lt-2)/3);pc.userData.sideM.color.setRGB(1,1-edge*0.12,1-edge*0.25);}};}};

// ---------- 8 WENDEN: flip, golden side up ----------
DEF.wenden={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const C=cooktop(sc,0,0);pan(sc,0,0);const pc=pancake(sc,true);const st=steamPuffs(sc,14,0,CT+0.1,0,0.14,0.6);
  const sp=new THREE.Group();sc.add(sp);box(0.14,0.006,0.12,M('#2a2a30'),0,0,0,sp);const sh=cyl(0.01,0.01,0.32,M('#c89a60'),0.22,0.06,0,sp,8);sh.rotation.z=-1.2;
  const t={flip:1.0};card('wenden',0.2,3.4,13,'Wenden','wenn der Rand fest ist');card('wenden',3.5,5.9,14,'Noch 1 Minute','goldbraun backen');
  return {sc,grade:{mul:'#ffe0c8',a:0.06,vig:0.32,vigCol:'#2a1008'},
    shots:[[0,0,[[-0.35,CT+0.45,0],[0.35,CT,0]],-16,22,0],[t.flip+0.9,0,[[-0.22,CT,-0.22],[0.22,CT,0.22]],0,80,0],[3.6,0,[[-0.25,CT+0.2,0],[0.25,CT,0]],14,30,0]],
    update(lt){K.update(lt);C.gl.material.opacity=0.16+0.03*Math.sin(lt*7);const u=clamp((lt-t.flip)/0.7);const slide=clamp((lt-t.flip+0.6)/0.6);sp.visible=lt<t.flip+1.2;sp.position.set(0.45-slide*0.45,CT+0.07+Math.sin(u*Math.PI)*0.25,0);sp.rotation.z=-u*0.4;
      pc.position.set(0,CT+0.065+Math.sin(u*Math.PI)*0.3,0);pc.rotation.z=u*Math.PI;pc.scale.set(1,0.6,1);pc.userData.topM.map=u>0.5?GOLD:RAW;pc.userData.topM.needsUpdate=true;st.update(lt,u>=1?1.2:0.6);}};}};

// ---------- 9 STAPEL: stack, berries, butter, syrup, powdered sugar ----------
DEF.stapel={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const PL=plate(sc,0,0);const cakes=[0,1,2,3,4].map(i=>{const c=pancake(sc,false);c.userData.t0=0.2+i*0.45;return c;});
  const ber=berries(sc,16,0,CT+0.06+5*0.035+0.02,0,0.14);const butter=box(0.06,0.025,0.05,M('#ffe27a'),0,0,0,sc);
  const bottle=new THREE.Group();sc.add(bottle);const bb=lathe([[0,0],[0.05,0],[0.055,0.03],[0.05,0.18],[0.02,0.24],[0.018,0.29],[0,0.29]],glassM('#c86a1a',0.85));bottle.add(bb);const ss=stream(sc,'#b8601a',0.006);
  const glaze=cyl(0.19,0.19,0.006,glassM('#c8701a',0.75),0,0,0,sc,32);glaze.castShadow=false;glaze.visible=false;const drips=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2+0.3;const d=cyl(0.008,0.006,1,glassM('#b8601a',0.85),Math.cos(a)*0.198,0,Math.sin(a)*0.198,sc,8);d.castShadow=false;drips.push({d,a,len:0.05+rnd(i)*0.08,t:rnd(i*3)*0.6});}
  const sugarP=particlesSprites(sc,60,'#ffffff',0.01,1);const st=steamPuffs(sc,10,0,CT+0.25,0,0.1,0.5);
  const T={stack:0.2,berry:2.6,butter:3.6,syrup:4.3,sugar:6.3};card('stapel',0.2,2.5,15,'Stapeln','solange sie warm sind');card('stapel',2.6,4.2,16,'Beeren & Butter','');card('stapel',4.3,6.2,17,'Ahornsirup','großzügig');card('stapel',6.3,7.9,18,'Puderzucker','zum Schluss');
  const topY=CT+0.03+0.012+5*0.035;
  return {sc,grade:{mul:'#ffe8d0',a:0.05,vig:0.28,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.35,CT+0.4,0],[0.35,CT,0]],-10,20,0],[T.berry-0.2,0,[[-0.24,topY,-0.24],[0.24,topY,0.24]],0,80,0],[T.syrup-0.2,0,[[-0.3,CT+0.6,0],[0.3,CT,0]],12,18,0],[T.sugar-0.2,0,[[-0.32,CT+0.45,0],[0.32,CT,0]],-14,24,0,{orbit:12}]],
    update(lt){K.update(lt);st.update(lt,0.8);cakes.forEach((c,i)=>{const u=clamp((lt-c.userData.t0)/0.35);c.visible=lt>c.userData.t0;const y=CT+0.03+0.012+0.0175+i*0.035;c.position.set((rnd(i)-0.5)*0.012,y+(1-u*u)*0.35,(rnd(i*3)-0.5)*0.012);c.rotation.y=i*0.7;});
      ber.forEach((o,i)=>{const u=clamp((lt-T.berry-o.d*0.6)/0.4);o.b.visible=u>0;o.b.position.set(o.to.x,o.to.y+(1-u)*0.3+Math.abs(Math.sin(u*Math.PI*2))*0.01*(1-u),o.to.z);});
      const bu=clamp((lt-T.butter)/0.3);butter.visible=bu>0;butter.position.set(0.02,topY+0.015+(1-bu)*0.2,0.01);const melt=clamp((lt-T.butter-0.6)/3);butter.scale.set(1+melt*0.4,1-melt*0.7,1+melt*0.4);
      const sy=clamp((lt-T.syrup)/1.6),stl=lt<T.syrup+1.7?clamp((lt-T.syrup+0.4)/0.4):clamp(1-(lt-T.syrup-1.7)/0.4);bottle.visible=lt>T.syrup-0.5&&lt<T.syrup+2.4;bottle.position.set(0.28,topY+0.12,0);bottle.rotation.z=stl*2.0;
      ss.set(V(0.16,topY+0.16,0),V(0.03,topY+0.01,0),lt>T.syrup&&lt<T.syrup+1.6);glaze.visible=sy>0;glaze.position.y=topY+0.004;glaze.scale.set(0.2+sy*0.8,1,0.2+sy*0.8);
      drips.forEach(o=>{const u=clamp((lt-T.syrup-0.8-o.t)/1.2);o.d.visible=u>0;const L=o.len*u+0.001;o.d.scale.set(1,L,1);o.d.position.y=topY-L/2;});
      sugarP.forEach((p,i)=>{const v=((lt-T.sugar)*0.9+rnd(i))%1;p.visible=lt>T.sugar&&lt<T.sugar+1.6;p.position.set((rnd(i*3)-0.5)*0.4,topY+0.5-v*0.5,(rnd(i*5)-0.5)*0.4);});}};}};

// ---------- 10 FINAL: hero shot by the window ----------
DEF.final={build(){const sc=new THREE.Scene();const K=kitchenSet(sc);const PL=plate(sc,0,0);for(let i=0;i<5;i++){const c=pancake(sc,false);c.position.set((rnd(i)-0.5)*0.012,CT+0.03+0.012+0.0175+i*0.035,(rnd(i*3)-0.5)*0.012);c.rotation.y=i*0.7;}
  const topY=CT+0.03+0.012+5*0.035;berries(sc,16,0,topY+0.02,0,0.14).forEach(o=>o.b.position.copy(o.to));const g=cyl(0.19,0.19,0.006,glassM('#c8701a',0.75),0,topY+0.004,0,sc,32);g.castShadow=false;box(0.08,0.012,0.07,M('#ffe27a'),0.02,topY+0.012,0.01,sc);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+0.3;const L=0.05+rnd(i)*0.08;const d=cyl(0.008,0.006,L,glassM('#b8601a',0.85),Math.cos(a)*0.198,topY-L/2,Math.sin(a)*0.198,sc,8);d.castShadow=false;}
  const dust=new THREE.Mesh(new THREE.CircleGeometry(0.17,32),NO(new THREE.MeshBasicMaterial({map:ctex(128,128,gg=>{for(let i=0;i<500;i++){gg.fillStyle='rgba(255,255,255,0.8)';gg.fillRect(rnd(i*3)*128,rnd(i*7)*128,2,2);}}).t,transparent:true})));dust.rotation.x=-Math.PI/2;dust.position.y=topY+0.03;sc.add(dust);
  const m=mug(sc,0.55,-0.3);const st=steamPuffs(sc,10,0.55,CT+0.18,-0.3,0.05,0.5);const st2=steamPuffs(sc,8,0,topY+0.05,0,0.08,0.35);
  const fork=new THREE.Group();fork.position.set(-0.42,CT+0.04,0.12);fork.rotation.y=0.4;sc.add(fork);box(0.26,0.008,0.025,M('#c8ccd4'),0,0,0,fork);for(let i=0;i<4;i++)box(0.06,0.006,0.005,M('#c8ccd4'),0.16,0,-0.009+i*0.006,fork);
  const nap=mesh(new THREE.PlaneGeometry(0.3,0.3),M('#ffffff',{map:CHECK}),-0.42,CT+0.035,0.12,sc);nap.rotation.x=-Math.PI/2;nap.rotation.z=0.3;nap.castShadow=false;
  return {sc,grade:{mul:'#ffe0c0',a:0.06,vig:0.34,vigCol:'#3a1a08'},shots:[[0,0,[[-0.3,topY+0.1,0],[0.3,CT,0]],-24,14,0,{orbit:9}]],update(lt){K.update(lt);st.update(lt);st2.update(lt,0.7);}};}};
