// ================= STORY: Frau Brandt, die Popcornverkäuferin mit dem sehr großen Fernseher =================
// Story-first: protagonist (Jule) + antagonist-ish owner (Frau Brandt) + narrator interjection (Herr Groschen).
// Every line is an ACTION in a place; every number is an OBJECT in the world; light arc dusk -> evening -> night -> screen light.
const STORY={
  title:['DIESES KINO','VERDIENT NICHTS AN TICKETS'],
  keywords:['Kinotickets','nichts','zwölf','Hälfte','Filmstudio','Miete','Kevin','Strom','Projektor','Moment','Davon','riecht','Zufall','Eingang','kleinen','großen','Cent','Mais','Gewinn','acht','zwanzig','Popcornverkäuferin','Fernseher'],
  rim:{street:'#ffc890',kasse:'#ffe0b0',studio:'#a8c0ff',office:'#ffd8a0',groschen:'#ffe0b0',entrance:'#ffd090',counter:'#ffe0b0',scale:'#fff0d0',saal:'#a8c8ff',finale:'#e8f0ff'},
};
const WT2=(word,scene,after)=>{const st=ST(scene);return wt(word,st+after-0.01)-st;}; // n-th occurrence: search after a local time
// a camera/anchor target that follows any moving object (coins, buckets): same contract as Toon2D anchors
function track(fn,h=0.25){const r=new THREE.Object3D();return {root:r,_walk:lt=>({pos:fn(lt),ry:0}),anchor:n=>r.position.clone().add(new THREE.Vector3(0,n==='top'?h:0,0))};}
const arc=(a,b,u,hgt)=>{const p=a.clone().lerp(b,u);p.y+=Math.sin(u*Math.PI)*hgt;return p;};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function lampPost(sc,x,z,col='#ffd890'){cyl(0.06,0.08,3.4,M('#2a2a34'),x,1.7,z,sc,10);const hd=box(0.36,0.22,0.36,M('#2a2a34'),x,3.45,z,sc);const b=sph(0.14,E(col),x,3.3,z,sc);const gl=glowSprite(col,2.2,0.55);gl.position.set(x,3.3,z);sc.add(gl);
  const L=new THREE.PointLight(col,1.4,9,2);L.position.set(x,3.2,z);sc.add(L);return L;}
function bricks(base,rx,ry){return tiled(256,256,rx,ry,g=>{g.fillStyle=base;g.fillRect(0,0,256,256);g.strokeStyle=mixc(base,'#2a1410',0.35);g.lineWidth=5;for(let r=0;r<8;r++){g.beginPath();g.moveTo(0,r*32);g.lineTo(256,r*32);g.stroke();for(let c=0;c<5;c++){const x=c*64+(r%2)*32;g.beginPath();g.moveTo(x,r*32);g.lineTo(x,r*32+32);g.stroke();}}
  for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${0.05*rnd(i)})`;g.fillRect(rnd(i*3)*256,rnd(i*7)*256,24,10);}});}
function mixc(a,b,k){const h=c=>[1,3,5].map(i=>parseInt(c.substr(i,2),16));const A=h(a),B=h(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('');}
function sky(sc,stops,stars=0){sc.background=gradBg(stops);if(stars){for(let i=0;i<stars;i++){const s=glowSprite('#ffffff',0.12+rnd(i)*0.12,0.8);s.position.set((rnd(i*3)-0.5)*60,8+rnd(i*5)*14,-30-rnd(i*7)*10);sc.add(s);}}}
function stickerNote(parent,w,h,lines,col='#fff27a'){return new Flat(parent,w,h,Math.round(w*400),Math.round(h*400),g=>{const W2=Math.round(w*400),H2=Math.round(h*400);g.fillStyle=col;g.fillRect(0,0,W2,H2);g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(0,H2-16,W2,16);
  g.fillStyle='rgba(120,170,230,0.75)';g.fillRect(W2*0.3,-4,W2*0.4,30);lines.forEach((l,i)=>text(l[0],W2/2,H2*(i+1)/(lines.length+1)+6,l[1]||46,l[2]||'#2a1a10',{ol:false}));},{lit:true});}

// ---------- 1 STREET (dusk): the hook ----------
function facade(sc){const fw=box(14,7,0.6,M('#ffffff',{map:bricks('#c8644a',5,3)}),0,3.5,-4.3,sc);
  const doorG=box(2.6,2.7,0.1,E('#ffd890'),0,1.35,-3.98,sc);doorG.castShadow=false;[-1.35,0,1.35].forEach(x=>box(0.12,2.8,0.16,M('#c8a050'),x,1.4,-3.92,sc));box(2.9,0.14,0.18,M('#c8a050'),0,2.78,-3.92,sc);
  const dg=glowSprite('#ffd890',4,0.5);dg.position.set(0,1.4,-3.6);sc.add(dg);
  box(7.2,0.55,1.9,M('#2a1a2a'),0,3.35,-3.3,sc);const mq=new Flat(sc,6.8,0.95,1360,190,(g,lt)=>{g.fillStyle='#fff2d0';g.fillRect(0,0,1360,190);g.strokeStyle='#c4281f';g.lineWidth=16;g.strokeRect(8,8,1344,174);text('KINO BRANDT',680,74,92,'#c4281f',{ol:false});text('HEUTE: TOASTER 3',680,152,52,'#2a1a10',{ol:false});});
  mq.mesh.position.set(0,3.95,-2.33);mq.update(0,1);
  const bulbs=[];for(let i=0;i<22;i++){const x=-3.5+i/21*7;const b=sph(0.05,E('#ffe8a0'),x,3.06,-2.36,sc);const gl=glowSprite('#ffd070',0.45,0.6);gl.position.set(x,3.06,-2.3);sc.add(gl);bulbs.push(gl);}
  const blade=new Flat(sc,0.9,2.6,180,520,()=>{g0=getCtx();g0.fillStyle='#2a1a2a';g0.fillRect(0,0,180,520);['K','I','N','O'].forEach((c,i)=>text(c,90,80+i*120,110,'#ff6ad5',{olc:'#5a0a3a',olw:10}));});blade.mesh.position.set(4.6,4.9,-3.4);blade.mesh.rotation.y=Math.PI/2;blade.update(0,1);
  const bg=glowSprite('#ff6ad5',3.4,0.4);bg.position.set(4.6,4.9,-3.2);sc.add(bg);
  poster(sc,'TOASTER 3','#3a8a5a',-3.4,1.7,-3.98,0);poster(sc,'DER LETZTE KEKS','#a85a2a',3.4,1.7,-3.98,0);
  return {bulbs};}
let g0=null;
function sidewalk(sc,night){const tiles=tiled(256,256,8,4,g=>{g.fillStyle=night?'#6a6a82':'#c8b8a8';g.fillRect(0,0,256,256);g.strokeStyle=night?'#4a4a62':'#a89888';g.lineWidth=6;g.strokeRect(0,0,256,256);});
  const sw=mesh(new THREE.PlaneGeometry(40,8),M('#ffffff',{map:tiles}),0,0,0,sc);sw.rotation.x=-Math.PI/2;sw.castShadow=false;
  const st=mesh(new THREE.PlaneGeometry(60,30),M(night?'#2a2a3e':'#4a4458'),0,-0.02,19,sc);st.rotation.x=-Math.PI/2;st.castShadow=false;box(40,0.16,0.3,M(night?'#8a8aa2':'#d8c8b8'),0,0.08,4,sc);}
DEF.street={build(){const sc=new THREE.Scene();sky(sc,['#4a3a8a','#c8608a','#ffb070']);sidewalk(sc,false);const F=facade(sc);
  lampPost(sc,-5.6,2.4);lampPost(sc,5.6,2.4);
  const brandt=new Toon2D(sc,0.9,-1.9,{},1.0,{kind:'brandt'});
  const t={kino:WT('Kinotickets','street'),und:WT('Und','street'),nichts:WT('nichts','street'),verkauft:WT('verkauft','street')};
  brandt.plan([{type:'g',g:'explain',t:t.verkauft-0.2},{type:'g',g:'shrug',t:t.nichts-0.45}]);
  const coin=new THREE.Group();sc.add(coin);coin3d(coin,1.6);const CP=V(0.25,0.03,-1.0);
  lightsBasic(sc,{hemi:['#ffd8c8','#4a3a6a',0.95],sun:{c:'#ffb070',i:0.9,p:[-10,4,6],t:[0,1,-3],r:12}});const dl=new THREE.PointLight('#ffd090',1.6,8,2);dl.position.set(0,1.6,-3.0);sc.add(dl);
  return {sc,anchors:{brandt},grade:{mul:'#ffd8e0',a:0.04,vig:0.2,vigCol:'#2a1030'},
    shots:[[0,0,['brandt:top','brandt:feet',[-3,4.3,-3.5],[3,4.3,-3.5]],-6,4,0],[t.kino-0.3,0,[[-3.4,4.45,-2.3],[3.4,3.0,-2.3]],10,0,0],
      [t.und-0.3,0,['brandt:top','brandt:chest'],-10,4,0.95],[t.nichts-0.3,0,[[0.25,0.03,-1.0],'brandt:top','brandt:feet'],14,12,0]],
    update(lt){brandt.update(lt,{f:faceAt(lt,[[0,'smug'],[t.und,'neutral'],[t.nichts-0.2,'tired']],7)});F.bulbs.forEach((b,i)=>b.material.opacity=0.35+0.3*(Math.sin(lt*8-i*0.9)>0?1:0));
      const u=clamp((lt-t.nichts+0.55)/0.55);coin.visible=lt>t.nichts-0.55;const bounce=u<1?(1-u*u)*1.6:Math.abs(Math.sin((lt-t.nichts)*14))*0.08*Math.exp(-(lt-t.nichts)*5);
      coin.position.set(CP.x,CP.y+bounce,CP.z);coin.rotation.set(u<1?lt*9:Math.PI/2*0+0.0,0,u<1?lt*6:0);if(u>=1){coin.rotation.set(0,0,0);coin.children[0].rotation.x=0;}}};}};

// ---------- 2 KASSE (lobby, evening): 12 € in, half shoots off by pneumatic tube ----------
DEF.kasse={build(){const sc=new THREE.Scene();const L=lobbySet(sc);boxOffice(sc,-3.9,-4.3);
  const kevin=new Toon2D(sc,-3.9,-4.5,{},0.95,{kind:'kevin'});const jule=new Toon2D(sc,-0.6,0.8,{},0.95,{kind:'jule',flipBase:true});
  const t={kauft:WT('kauft','kasse'),zwoelf:WT('zwölf','kasse'),kevin:WT('Kevin','kasse'),nimmt:WT('nimmt','kasse'),sofort:WT('sofort','kasse'),fliegt:WT('fliegt','kasse'),haelfte:WT('Hälfte','kasse')};
  jule.plan([{type:'walk',t:0,dur:1.7,from:[-0.6,0.8],to:[-2.95,-3.0]},{type:'g',g:'pay',t:t.zwoelf-0.2}]);kevin.plan([{type:'g',g:'pay',t:t.nimmt-0.3},{type:'g',g:'nod',t:t.sofort}]);
  const disp=new Flat(sc,0.78,0.3,312,120,(g,lt)=>{g.fillStyle='#0e1a12';g.fillRect(0,0,312,120);g.strokeStyle='#5a5a62';g.lineWidth=10;g.strokeRect(0,0,312,120);text(lt>t.zwoelf-0.1?'12,00 €':'--,-- €',156,66,64,'#6aff8a',{ol:false});});
  disp.mesh.position.set(-4.75,1.3,-3.63);
  // pneumatic tube to the studio
  const TX=-5.55,TZ=-4.0;const glass=NO(new THREE.MeshToonMaterial({color:'#d8f0ff',gradientMap:gm,transparent:true,opacity:0.28}));const tube=cyl(0.17,0.17,3.6,glass,TX,2.7,TZ,sc,20);glass.opacity=0.42;glass.color.set('#9fd4ff');tube.castShadow=false;
  [1.0,1.8,2.6,3.4,4.2].forEach(y=>cyl(0.2,0.2,0.07,M('#c8a050'),TX,y,TZ,sc,20));const fun=cyl(0.36,0.17,0.32,M('#c8a050'),TX,0.86,TZ,sc,20);
  const tag=stickerNote(sc,0.85,0.5,[['ROHRPOST',40],['→ FILMSTUDIO',40,'#c4281f']]);tag.mesh.position.set(TX+0.05,2.2,TZ+0.45);tag.update(0,1);
  const coins=[];for(let i=0;i<12;i++){const g=new THREE.Group();sc.add(g);coin3d(g,i<6?2.0:1.3);coins.push(g);}
  const W0=V(-3.4,1.22,-3.55),IN=V(TX,1.12,TZ),TOP=V(TX,4.7,TZ);
  const flyPos=(i,lt)=>{const t0=t.fliegt-0.35+i*0.13;const u=(lt-t0);if(u<0)return W0.clone();if(u<0.5)return arc(W0,IN,u/0.5,1.4);const v=clamp((u-0.5)/0.9);return IN.clone().lerp(TOP,v*v);};
  const lead=track(lt=>flyPos(2,lt));
  return {sc,anchors:{jule,kevin,lead},grade:{mul:'#ffe0d0',a:0.04,vig:0.2,vigCol:'#3a1010'},
    shots:[[0,0,['jule:top','jule:feet',[-3.9,2.9,-3.7]],-16,6,0,{follow:'jule'}],[t.zwoelf-0.35,0,[[-4.75,1.5,-3.63],[-4.75,1.05,-3.63],'jule:face'],18,4,0.95],
      [t.kevin-0.3,0,['kevin:top','kevin:chest'],-8,2,0.95],[t.sofort-0.3,0,[[-3.5,1.5,-3.55],[TX,2.6,TZ],[TX,0.8,TZ],[TX,3.2,TZ]],14,6,0],[t.haelfte-0.25,0,[[TX,0.75,TZ],[TX,4.3,TZ],[TX+0.05,2.2,TZ+0.45]],22,0,0]],
    update(lt){jule.update(lt,{f:faceAt(lt,[[0,'happy'],[t.fliegt,'shock'],[t.haelfte+0.3,'worried']],1)});kevin.update(lt,{f:faceAt(lt,[[0,'tired'],[t.nimmt,'neutral'],[t.sofort,'smirk']],4)});
      animMachine(L.mach,lt);L.menu.update(lt,1);disp.update(lt,lt>t.zwoelf-0.1?1:0);
      coins.forEach((c,i)=>{if(i<6){c.visible=lt>t.fliegt-0.35+i*0.13-0.01&&flyPos(i,lt).y<4.65;c.position.copy(flyPos(i,lt));c.rotation.set(lt*9+i,lt*5,0);return;}
        const k=i-6;const t0=t.nimmt+0.1+k*0.08;const u=clamp((lt-t0)/0.45);c.visible=lt>t0;c.position.copy(arc(W0,V(-4.45+k*0.14,1.1,-3.42),u,0.25));c.rotation.set(u<1?lt*8:0,0,0);});}};}};

// ---------- 3 STUDIO (night): coins rain into the studio's roof funnel ----------
DEF.studio={build(){const sc=new THREE.Scene();sky(sc,['#0a1030','#22306a','#5a4a8a'],70);
  const gr=mesh(new THREE.PlaneGeometry(80,40),M('#2a2a40'),0,0,-6,sc);gr.rotation.x=-Math.PI/2;gr.castShadow=false;
  const b=box(10,5,5,M('#e0d6c4'),0,2.5,-9,sc);box(10.4,0.4,5.4,M('#b8a888'),0,5.1,-9,sc);for(let i=0;i<10;i++){const w=box(0.7,0.8,0.05,E(rnd(i)>0.35?'#ffd890':'#3a3a52'),-3.6+(i%5)*1.8,1.6+Math.floor(i/5)*1.8,-6.47,sc);w.castShadow=false;}
  const sign=new Flat(sc,9,1.7,1350,255,()=>{text('FILMSTUDIO',675,140,220,'#ffd34d',{olc:'#5a3a00',olw:16});});sign.mesh.position.set(0,6.4,-8.2);sign.update(0,1);
  const sg=glowSprite('#ffd34d',10,0.35);sg.position.set(0,6.4,-8);sc.add(sg);
  const fun=cyl(1.3,0.35,1.2,M('#c8a050'),2.8,5.9,-9,sc,28);
  const glass=NO(new THREE.MeshToonMaterial({color:'#d8f0ff',gradientMap:gm,transparent:true,opacity:0.3}));const tb=cyl(0.25,0.25,16,glass,-5.2,7.4,-9,sc,16);tb.rotation.z=Math.PI/2-0.12;tb.castShadow=false;
  const beams=[];[-4,4].forEach((x,i)=>{const s=shaft(16,0.25,2.6,'#e8f0ff',0.16);s.position.set(x,5.3,-8);sc.add(s);beams.push(s);});
  const coins=[];for(let i=0;i<36;i++){const g=new THREE.Group();sc.add(g);coin3d(g,3);coins.push(g);}
  lightsBasic(sc,{hemi:['#9ab0ff','#1a1430',0.85],sun:{c:'#c8d8ff',i:0.5,p:[6,10,6],t:[0,0,-8],r:14}});const wl=new THREE.PointLight('#ffd890',2.0,14,2);wl.position.set(0,3,-5);sc.add(wl);
  return {sc,grade:{mul:'#c8d0ff',a:0.04,vig:0.25,vigCol:'#0a0a20'},
    shots:[[0,0,[[-5,7.2,-8],[5,7.2,-8],[0,0.3,-6]],-12,2,0]],
    update(lt){beams.forEach((s,i)=>{s.rotation.z=Math.PI+Math.sin(lt*1.3+i*2)*0.5+(i?-0.3:0.3);});
      coins.forEach((c,i)=>{const u=((lt*0.9+rnd(i))%1);const a=V(-11+rnd(i*3)*1.5,9.5+rnd(i*5),-9),bb=V(2.8,6.4,-9);c.position.copy(arc(a,bb,u,1.2));c.rotation.set(lt*6+i,lt*4,0);c.visible=lt+0.3>rnd(i*9)*0.6;});}};}};

// ---------- 4 OFFICE (night, desk lamp): the rest gets eaten ----------
DEF.office={build(){const sc=new THREE.Scene();sc.background=gradBg(['#2a2030','#140e18']);apron(sc,'#5a3418');
  room(sc,{w:10,d:8,h:3.8,wall:plainNoise('#c8956a',3,1,'#5a3a1a',0.07),floor:woodTex('#8a5430',3,3)});box(10,0.9,0.06,M('#7a4a2a'),0,0.45,-4.78,sc);
  windowGlow(sc,2.2,2.1,-4.75,1.3,1.7,'#5a7ad8',0,false);const moon=glowSprite('#e8f0ff',0.9,0.9);moon.position.set(2.45,2.5,-4.6);sc.add(moon);
  poster(sc,'TOASTER 3','#3a8a5a',-1.0,2.15,-4.75,0);
  box(3.4,0.9,1.2,M('#7a4a2a'),0,0.45,-1.8,sc);box(3.5,0.06,1.3,M('#4a2a14'),0,0.93,-1.8,sc);
  const lamp=new THREE.Group();lamp.position.set(-1.45,0.96,-2.1);sc.add(lamp);cyl(0.14,0.16,0.04,M('#2a3a2a'),0,0.02,0,lamp,16);cyl(0.02,0.02,0.5,M('#2a3a2a'),0,0.27,0,lamp,8);const sh=cyl(0.1,0.24,0.2,M('#2a6a4a'),0.0,0.56,0.05,lamp,18);sh.rotation.x=0.4;
  const ll=new THREE.PointLight('#ffc070',2.2,5,2);ll.position.set(-1.4,1.35,-1.9);sc.add(ll);const lg=glowSprite('#ffc070',1.4,0.5);lg.position.set(-1.42,1.42,-1.95);sc.add(lg);
  const bulb=new THREE.Group();bulb.position.set(-0.45,3.2,-1.6);sc.add(bulb);cyl(0.01,0.01,0.6,M('#1a1a1a'),0,0.3,0,bulb,6);const bb=sph(0.11,E('#fff0c0'),0,-0.05,0,bulb);const bgl=glowSprite('#ffe8a0',1.6,0.6);bulb.add(bgl);
  const kL=new THREE.PointLight('#ffd8a8',1.6,5,2);kL.position.set(2.2,2.3,-1.2);sc.add(kL);const brandt=new Toon2D(sc,0.2,-2.95,{},1.0,{kind:'brandt'});const kevin=new Toon2D(sc,2.5,-2.3,{},0.95,{kind:'kevin'});
  const t={rest:WT('Rest','office'),miete:WT('Miete','office'),kevin:WT('Kevin','office'),strom:WT('Strom','office'),proj:WT('Projektor','office'),uebrig:WT('Übrig','office'),nichts:WT('nichts','office')};
  kevin.plan([{type:'walk',t:t.kevin-0.9,dur:0.8,from:[3.6,-1.8],to:[2.5,-2.3]},{type:'g',g:'pay',t:t.kevin-0.15},{type:'walk',t:t.kevin+0.9,dur:0.8,to:[3.8,-1.8]}]);
  brandt.plan([{type:'g',g:'explain',t:Math.max(0.05,t.rest-0.3)},{type:'g',g:'shrug',t:t.uebrig}]);
  const glassM=NO(new THREE.MeshToonMaterial({color:'#e8f6ff',gradientMap:gm,transparent:true,opacity:0.32}));
  const jars=[['MIETE',-1.0,t.miete,2],['STROM',-0.35,t.strom,1],['PROJEKTOR',1.15,t.proj,1]].map(([l,x,tt,n])=>{const j=cyl(0.15,0.15,0.34,glassM,x,1.13,-1.4,sc,20);j.castShadow=false;cyl(0.16,0.16,0.03,M('#c8a050'),x,1.31,-1.4,sc,20);
    const lb=stickerNote(sc,0.42,0.17,[[l,l.length>6?40:52,'#c4281f']],'#fff6dc');lb.mesh.position.set(x,1.12,-1.23);lb.update(0,1);const inside=[];for(let k=0;k<n;k++){const g=new THREE.Group();sc.add(g);coin3d(g,1.3);g.position.set(x,0.99+k*0.03,-1.4);g.visible=false;inside.push(g);}return {x,tt,n,inside};});
  // 7 coins: 2 rent, 2 Kevin, 1 power, 1 projector, 1 left over
  const pile=[];for(let i=0;i<7;i++){const g=new THREE.Group();sc.add(g);coin3d(g,1.4);pile.push(g);}const P0=V(0.35,0.98,-1.55);
  const plan=[];jars.forEach(J=>{for(let k=0;k<J.n;k++)plan.push({t:J.tt+k*0.18,to:V(J.x,1.0+k*0.03,-1.4),jar:J,k});});plan.splice(2,0,{t:t.kevin-0.05,to:V(2.15,1.2,-2.2),kev:true},{t:t.kevin+0.13,to:V(2.15,1.2,-2.2),kev:true});
  const pig=new THREE.Group();pig.position.set(-0.4,0.96,-1.65);sc.add(pig);const pm=M('#f2a0b8');sph(0.2,pm,0,0.2,0,pig,1.25,1,1);cyl(0.07,0.07,0.08,pm,0.26,0.2,0,pig,12).rotation.z=Math.PI/2;[[-0.12,-0.1],[0.12,-0.1],[-0.12,0.1],[0.12,0.1]].forEach(([a,c])=>cyl(0.04,0.04,0.1,pm,a,0.05,c,pig,8));
  [-1,1].forEach(sd=>{const e=sph(0.05,pm,0.14,0.36,sd*0.07,pig,1,1.3,0.5);});box(0.12,0.012,0.02,M('#1a1a1a'),0,0.405,0,pig);
  return {sc,anchors:{brandt,kevin},grade:{mul:'#ffd8b0',a:0.05,vig:0.24,vigCol:'#1a0c06'},
    shots:[[0,0,['brandt:top','brandt:chest',[-1.3,0.96,-1.3],[1.3,0.96,-1.3]],-6,8,0],[t.miete-0.3,0,[[-1.0,1.55,-1.4],[-1.0,0.96,-1.4],[0.35,1.0,-1.55]],-14,16,0.8],
      [t.kevin-0.3,0,['kevin:top','kevin:knee',[0.4,1.0,-1.55]],18,4,0],[t.strom-0.3,0,[[-0.35,0.96,-1.4],[-0.35,3.3,-1.6]],2,-6,0],[t.proj-0.3,0,[[1.15,1.55,-1.4],[1.15,0.96,-1.4],[0.4,1.0,-1.55]],12,16,0.8],
      [t.uebrig-0.3,0,[[0.35,0.98,-1.55],'brandt:top',[-0.4,1.4,-1.65]],-4,10,0]],
    update(lt){brandt.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.miete,'worried'],[t.strom,'sad'],[t.uebrig,'tired']],5)});kevin.update(lt,{f:faceAt(lt,[[0,'tired'],[t.kevin,'happy']],4)});kevin.mesh.visible=lt>t.kevin-0.95&&lt<t.kevin+1.75;
      plan.forEach((p,i)=>{const c=pile[i];const u=clamp((lt-p.t)/0.42);if(u<=0){c.visible=true;c.position.set(P0.x,P0.y+i*0.028,P0.z);c.rotation.set(0,0,0);return;}
        if(p.kev){c.visible=u<1;c.position.copy(arc(V(P0.x,P0.y+i*0.028,P0.z),p.to,u,0.5));c.rotation.set(lt*9,0,0);return;}
        c.visible=u<1;c.position.copy(arc(V(P0.x,P0.y+i*0.028,P0.z),V(p.to.x,1.38,-1.4),u,0.45));c.rotation.set(lt*9,0,0);if(u>=1)p.jar.inside[p.k].visible=true;});
      pile[6].visible=true;pile[6].position.set(P0.x,P0.y,P0.z);
      const fl=lt>t.strom&&lt<t.strom+0.6;bb.material.color.set(fl&&Math.sin(lt*60)>0?'#ffffff':'#fff0c0');bgl.material.opacity=fl?0.9+Math.sin(lt*50)*0.3:0.55;
      pig.rotation.z=lt>t.nichts-0.2?Math.sin((lt-t.nichts)*18)*0.08*Math.exp(-(lt-t.nichts)*3):0;}};}};

// ---------- 5 GROSCHEN interrupts (lobby) ----------
DEF.groschen={build(){const sc=new THREE.Scene();const L=lobbySet(sc);const gro=new Toon2D(sc,1.0,-1.6,{},1.0,{kind:'coin'});
  const t={moment:WT('Moment','groschen'),wovon:WT('Wovon','groschen'),dann:WT('dann','groschen')};
  gro.plan([{type:'walk',t:0,dur:0.55,from:[2.6,-1.3],to:[1.0,-1.6]},{type:'g',g:'point',t:t.moment-0.15},{type:'g',g:'shrug',t:t.wovon}]);
  return {sc,anchors:{gro},grade:{mul:'#ffe0d0',a:0.04,vig:0.2,vigCol:'#3a1010'},
    shots:[[0,0,['gro:top','gro:chest'],-8,4,0.95,{follow:'gro'}],[t.wovon-0.3,0,['gro:top','gro:feet',[0.6,2.3,-4.6]],12,6,0]],
    update(lt){gro.update(lt,{f:faceAt(lt,[[0,'raised'],[t.wovon,'sideeye'],[t.dann,'smirk']],2),talk:talkAt('groschen',lt)});animMachine(L.mach,lt);L.menu.update(lt,1);}};}};

// ---------- 6 ENTRANCE (night outside, warm inside): the smell is the ad ----------
DEF.entrance={build(){const sc=new THREE.Scene();sky(sc,['#101a3a','#24306a','#3a3a7a'],40);sidewalk(sc,true);
  const wm=M('#ffffff',{map:bricks('#a85a48',3,2)});const cut=[box(6,4.2,0.4,wm,-4.3,2.1,0,sc),box(6,4.2,0.4,wm,4.3,2.1,0,sc),box(2.6,1.4,0.4,wm,0,3.5,0,sc)];
  [-1.3,1.3].forEach(x=>box(0.12,2.8,0.2,M('#c8a050'),x,1.4,0.05,sc));box(2.7,0.14,0.22,M('#c8a050'),0,2.8,0.05,sc);
  const dg=NO(new THREE.MeshToonMaterial({color:'#e8f4ff',gradientMap:gm,transparent:true,opacity:0.14}));const door=box(1.2,2.7,0.04,dg,-0.62,1.36,0.02,sc);door.castShadow=false;
  const sign=new Flat(sc,2.2,0.5,660,150,()=>{rr(6,6,648,138,30);fillS('#2a1a2a',6);text('EINGANG',330,82,96,'#ffd34d',{ol:false});});sign.mesh.position.set(0,3.25,0.22);sign.update(0,1);cut.push(sign.mesh);
  // interior: carpet, warm wall, the machine right behind the door
  const fl=mesh(new THREE.PlaneGeometry(10,6),M('#ffffff',{map:tiled(256,256,6,4,g=>{g.fillStyle='#c0303c';g.fillRect(0,0,256,256);g.strokeStyle='#f2c860';g.lineWidth=5;g.beginPath();g.arc(128,128,60,0,7);g.stroke();})}),0,0.01,-3,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  box(10,4.2,0.3,M('#ffffff',{map:woodTex('#e8b47a',3,2)}),0,2.1,-6,sc);
  box(1.3,0.95,0.9,M('#c4281f'),0.2,0.475,-2.0,sc);const mach=popcornMachine(sc,0.2,0.95,-2.0,1.05);
  const iL=new THREE.PointLight('#ffc070',2.4,9,2);iL.position.set(0.2,2.3,-2.2);sc.add(iL);
  lampPost(sc,-3.6,2.6,'#c8d8ff');
  const jule=new Toon2D(sc,2.8,3.2,{},0.95,{kind:'jule'});
  const t={davon:WT('Davon','entrance'),jule:WT('Jule','entrance'),drin:WT('drin','entrance'),riecht:WT('riecht','entrance'),zufall:WT('Zufall','entrance'),maschine:WT('Maschine','entrance'),direkt:WT('direkt','entrance')};
  jule.plan([{type:'walk',t:t.jule-0.4,dur:1.7,from:[2.8,3.2],to:[0.55,1.15]},{type:'g',g:'sniff',t:t.riecht-0.25}]);
  const ribbons=[];for(let r=0;r<3;r++){const arr=[];for(let i=0;i<24;i++){const s=glowSprite('#ffd890',0.5,0);sc.add(s);arr.push(s);}ribbons.push(arr);}
  const tape=box(0.12,0.012,2.0,M('#f2c42a'),-0.25,0.03,-1.0,sc);tape.castShadow=false;const tl=stickerNote(sc,0.9,0.4,[['2 METER',64,'#c4281f']],'#ffffff');tl.mesh.rotation.x=-Math.PI/2;tl.mesh.position.set(-0.95,0.04,-1.0);tl.update(0,1);
  lightsBasic(sc,{hemi:['#8aa0ff','#2a2040',0.8],sun:{c:'#b8c8ff',i:0.45,p:[-6,9,8],t:[0,0,0],r:10}});
  return {sc,anchors:{jule},grade:{mul:'#d8d8ff',a:0.03,vig:0.22,vigCol:'#0a0a20'},
    shots:[[0,0,[[0.2,2.25,-2.0],[0.2,0.95,-2.0]],0,4,1.35],[t.jule-0.3,0,['jule:top','jule:feet',[0,3.0,0.2]],-26,6,0,{follow:'jule'}],[t.riecht-0.3,0,['jule:top','jule:chest'],-34,4,0.95],
      [t.zufall-0.3,0,['jule:top','jule:chest',[0,2.5,0.2]],24,4,0],[t.maschine-0.3,0,[[0,0,0.8],[0.2,0,-2.6],[-1.6,0,-1],[1.6,0,-1]],0,70,0]],
    update(lt){jule.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.riecht+0.15,'happy'],[t.zufall-0.1,'raised']],3),turn:lt>t.riecht-0.3&&lt<t.zufall?-0.45:undefined});animMachine(mach,lt);
      const nose=jule.anchor('face').add(V(0,0.0,0.1));
      ribbons.forEach((arr,r)=>arr.forEach((s,i)=>{const u=i/arr.length;const a=V(0.2,1.6,-2.0),b=nose;const p=a.clone().lerp(b,u);p.y+=Math.sin(u*Math.PI)*0.5+Math.sin(lt*2.3+u*9+r*2)*0.12+r*0.08;p.x+=Math.sin(lt*1.7+u*7+r)*0.15;s.position.copy(p);
        const appear=clamp((lt-t.drin+0.6-u*1.2)/0.5);s.material.opacity=0.34*appear*(1-u*0.3);s.scale.setScalar(0.45+u*0.5);}));
      const hi=camera.position.y>3.4;cut.forEach(m=>m.visible=!hi);jule.mesh.visible=!hi;ribbons.forEach(a=>a.forEach(sp=>{if(hi)sp.visible=false;else sp.visible=true;}));tape.visible=lt>t.direkt-0.3;tape.scale.z=clamp((lt-t.direkt+0.3)/0.5)+0.0001;tape.position.z=-2.0+tape.scale.z*1.0;popS(tl.mesh,lt,t.direkt+0.15,1);}};}};

// ---------- 7 COUNTER (lobby): the +1 € upsell ----------
DEF.counter={build(){const sc=new THREE.Scene();const L=lobbySet(sc);
  const kevin=new Toon2D(sc,2.0,-5.25,{},0.95,{kind:'kevin'});const jule=new Toon2D(sc,0.9,-3.35,{},0.95,{kind:'jule'});
  const small=bucket3d(sc,1.65,1.08,-4.35,0.6,'S');const big=bucket3d(sc,2.4,1.08,-4.35,1.45,'XL');
  const plus=badge(sc,0.8,0.36,'+1 €','#ffffff','#2a8a3a');
  const t={will:WT('will','counter'),kleinen:WT('kleinen','counter'),kevin:WT('Kevin','counter'),sagt:WT('sagt','counter'),euro:WT('Euro','counter'),grossen:WT('großen','counter')};
  jule.plan([{type:'g',g:'point',t:t.kleinen-0.35}]);kevin.plan([{type:'g',g:'explain',t:t.sagt-0.1}]);
  return {sc,anchors:{jule,kevin},grade:{mul:'#ffe0d0',a:0.04,vig:0.2,vigCol:'#3a1010'},
    shots:[[0,0,['jule:top','kevin:top','jule:knee'],-22,6,0],[t.kleinen-0.3,0,[[1.65,1.6,-4.35],[1.65,1.05,-4.35],'jule:top','jule:chest'],28,8,0],[t.kevin-0.3,0,['kevin:top','kevin:chest'],10,4,0.95],
      [t.euro-0.35,0,[[2.4,2.7,-4.35],[2.4,1.05,-4.35],[1.65,1.3,-4.35]],14,8,0]],
    update(lt){jule.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.kleinen,'happy'],[t.grossen,'raised']],1),turn:-0.3});kevin.update(lt,{f:faceAt(lt,[[0,'tired'],[t.sagt,'smirk']],4)});animMachine(L.mach,lt);L.menu.update(lt,1);
      const u=easeOut(clamp((lt-t.euro+0.3)/0.6));big.position.x=3.6-u*1.2;big.visible=lt>t.euro-0.3;big.rotation.y=(1-u)*0.6;plus.mesh.position.set(2.4,2.75,-4.2);popS(plus.mesh,lt,t.euro,1);plus.update(lt,1);}};}};

// ---------- 8 SCALE (back counter, top-down): a few cents of corn, a whole euro of profit ----------
DEF.scale={build(){const sc=new THREE.Scene();sc.background=gradBg(['#f2d8b0','#c89868']);
  const top=box(4.4,0.9,2.4,M('#ffffff',{map:woodTex('#d8a868',2,1)}),0,0.45,-1.0,sc);box(4.4,2.6,0.1,M('#ffffff',{map:tiled(256,256,6,3,g=>{g.fillStyle='#f6f0e2';g.fillRect(0,0,256,256);g.strokeStyle='#d8ccb8';g.lineWidth=6;g.strokeRect(0,0,256,256);})}),0,2.2,-2.2,sc);
  const sc0=new THREE.Group();sc0.position.set(-0.4,0.9,-0.95);sc.add(sc0);box(0.62,0.08,0.5,M('#e8e8ee'),0,0.04,0,sc0);box(0.54,0.02,0.44,M('#b8bcc8'),0,0.09,0,sc0);
  const disp=new Flat(sc0,0.3,0.1,240,80,(g,lt)=>{g.fillStyle='#0e1a12';g.fillRect(0,0,240,80);text(lt+'',120,46,46,'#6aff8a',{ol:false});});disp.mesh.rotation.x=-Math.PI/2+0.35;disp.mesh.position.set(0,0.085,0.24);
  const bk=bucket3d(sc,-0.4,1.0,-0.95,1.0,null);bk.children.filter(c=>c.geometry&&c.geometry.type==='IcosahedronGeometry').forEach(c=>c.visible=false);
  const kernels=[];const kM=M('#f2c84a',{flatShading:true});for(let i=0;i<40;i++){const k=mesh(new THREE.IcosahedronGeometry(0.025,0),kM,0,0,0,sc);kernels.push(k);}
  const scoop=new THREE.Group();scoop.position.set(-0.4,2.0,-0.95);sc.add(scoop);const sp=cyl(0.14,0.1,0.2,M('#c8ccd4'),0,0,0,scoop,16);sp.rotation.z=1.0;
  const note=stickerNote(sc,0.55,0.4,[['MAIS',40],['+ 0,04 €',52,'#2a8a3a']]);note.mesh.rotation.x=-Math.PI/2;note.mesh.position.set(0.35,0.91,-0.55);note.update(0,1);
  // cash register with drawer
  const reg=new THREE.Group();reg.position.set(1.35,0.9,-1.2);sc.add(reg);box(0.9,0.42,0.7,M('#3a3e48'),0,0.21,0,reg);const scr=new Flat(reg,0.5,0.2,250,100,(g,lt)=>{g.fillStyle='#0e1a12';g.fillRect(0,0,250,100);text(lt?'+1,00 €':'0,00 €',125,56,52,'#6aff8a',{ol:false});});scr.mesh.position.set(0,0.62,0.0);
  box(0.6,0.24,0.06,M('#2a2e38'),0,0.5,-0.05,reg);const drawer=new THREE.Group();reg.add(drawer);box(0.8,0.14,0.6,M('#5a5e68'),0,0.08,0.05,drawer);for(let i=0;i<4;i++)box(0.16,0.02,0.5,M('#2a2e38'),-0.27+i*0.18,0.15,0.05,drawer);
  const euro=new THREE.Group();sc.add(euro);coin3d(euro,1.8);const spark=particlesSprites(sc,22,'#ffe866',0.09,1,THREE.AdditiveBlending);
  const t={grosse:WT('große','scale'),cent:WT('Cent','scale'),mais:WT('Mais','scale'),euro:WT('Euro','scale'),reiner:WT('reiner','scale'),gewinn:WT('Gewinn','scale')};
  lightsBasic(sc,{hemi:['#fff4e4','#8a5a34',1.15],sun:{c:'#fff0dc',i:0.7,p:[2,6,4],t:[0,0,-1],r:5}});
  return {sc,grade:{mul:'#ffe8d0',a:0.04,vig:0.18,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.9,0.9,-0.95],[0.1,0.9,-0.95],[-0.4,2.15,-0.95],[-0.4,0.92,-0.7]],-10,34,0],[t.cent-0.3,0,[[0.35,0.91,-0.55],[-0.4,1.3,-0.95]],-8,48,0.7],
      [t.euro-0.35,0,[[1.35,1.5,-1.2],[1.35,0.9,-0.9]],-12,24,0.9],[t.reiner-0.3,0,[[1.35,1.45,-1.2],[1.35,1.0,-0.9]],10,18,0.75]],
    update(lt){const pr=clamp((lt-0.2)/(t.mais-0.2));kernels.forEach((k,i)=>{const u=((lt*1.6+rnd(i))%1);const on=lt<t.mais+0.2;k.visible=on;k.position.set(-0.4+(rnd(i*3)-0.5)*0.12-0.08,1.95-u*0.9,-0.95+(rnd(i*5)-0.5)*0.12);k.rotation.set(lt*5+i,i,0);});
      scoop.rotation.z=lt<t.mais+0.2?-0.6:0;scoop.visible=lt<t.mais+0.4;disp.update(Math.round(pr*120)+' g',Math.round(pr*120));popS(note.mesh,lt,t.cent-0.05,1);
      const op=easeOut(clamp((lt-t.euro+0.6)/0.4));drawer.position.z=op*0.35;const u=clamp((lt-t.euro+0.25)/0.35);euro.visible=lt>t.euro-0.25&&lt<t.euro+0.6;euro.position.set(1.35,0.9+0.18+(1-u*u)*0.9,-1.2+0.4);euro.rotation.set(lt*7,0,lt*3);
      scr.update(lt>t.euro+0.1?1:0,lt>t.euro+0.1?1:0);spark.forEach((p,i)=>{const v=(lt-t.reiner)/1.0;p.visible=v>0&&v<1;if(!p.visible)return;const a=rnd(i)*Math.PI*2;p.position.set(1.35+Math.cos(a)*v*0.6,1.6+Math.sin(a)*v*0.4+v*0.2,-1.15);p.material.opacity=1-v;});}};}};

// ---------- 9/10 SAAL: dark auditorium lit by the screen; finale = reveal of the "very big TV" ----------
function buildSaal(sc,bright){sc.background=gradBg(['#0e0a1a','#1a1028']);
  const fl=mesh(new THREE.PlaneGeometry(16,16),M('#3a1a2a'),0,0,-1,sc);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  [-1,1].forEach(sd=>{box(0.3,7,16,M('#6a1a2a'),sd*7,3.5,-1,sc);for(let i=0;i<3;i++){const g=glowSprite('#ffc070',1.0,0.5);g.position.set(sd*6.8,2.6,-4+i*3.5);sc.add(g);}});
  const SCR=new Flat(sc,12,6.2,960,496,(g,lt)=>{const k=Math.floor(lt*3);g.fillStyle=bright?'#e8f2ff':'#a8c8f0';g.fillRect(0,0,960,496);g.fillStyle=k%2?'#f6c070':'#8ab0e8';g.fillRect(0,330,960,166);
    g.save();g.translate(480+Math.sin(lt)*60,250);g.fillStyle='#c8ccd4';g.strokeStyle='#1c1410';g.lineWidth=10;g.beginPath();g.roundRect(-150,-90,300,180,40);g.fill();g.stroke();g.fillStyle='#1c1410';g.fillRect(-110,-110,70,30);g.fillRect(40,-110,70,30);g.fillStyle='#e8a050';g.fillRect(-100,-150+Math.abs(Math.sin(lt*2))*-40,60,70);g.restore();});
  SCR.mesh.position.set(0,3.6,-6.5);const SL=new THREE.PointLight(bright?'#e8f0ff':'#8ab0ff',bright?3.2:2.4,22,1.2);SL.position.set(0,3.4,-5.2);sc.add(SL);const sg=glowSprite(bright?'#e8f0ff':'#a8c8ff',14,bright?0.35:0.25);sg.position.set(0,3.6,-6.3);sc.add(sg);
  const seatM=M('#b8202e'),seatD=M('#5a0e18');for(let r=0;r<4;r++){const y=r*0.3,z=0+r*1.2;if(r)box(14,y,1.2,M('#2a1420'),0,y/2,z,sc);for(let i=0;i<9;i++){const x=-4+i*1.0;if(Math.abs(x)<0.6&&r===0&&bright)continue;box(0.8,0.42,0.6,seatM,x,y+0.25,z,sc);box(0.8,0.75,0.14,seatM,x,y+0.75,z+0.3,sc);box(0.06,0.5,0.6,seatD,x-0.42,y+0.4,z,sc);}}
  return {SCR,SL};}
DEF.saal={build(){const sc=new THREE.Scene();const S2=buildSaal(sc,false);
  const jule=new Toon2D(sc,0.0,1.15,{},0.95,{kind:'jule',y:0.3});const bk=bucket3d(sc,0.42,0.72,0.88,1.0,null);
  const rc=new Flat(sc,0.42,0.75,252,450,(g,lt)=>{g.fillStyle='#fbf8f0';g.fillRect(0,0,252,450);g.fillStyle='#1c1410';g.font='900 26px Nunito';g.textAlign='left';g.fillText('KINO BRANDT',20,48);g.fillRect(20,64,212,4);
    g.font='900 20px Nunito';g.fillText('POPCORN XL',20,120);g.textAlign='right';g.font='900 26px Nunito';g.fillText('8,00 €',232,120);g.textAlign='left';
    if(lt){g.fillStyle='#ffe066';g.fillRect(10,170,232,90);g.fillStyle='#c4281f';g.font='900 22px Nunito';g.fillText('DAVON MAIS:',20,206);g.textAlign='right';g.font='900 34px Nunito';g.fillText('0,18 €',232,246);}
    g.fillStyle='#1c1410';g.textAlign='center';g.font='900 20px Nunito';g.fillText('VIEL SPASS!',126,420);},{lit:true});
  rc.mesh.position.set(-0.42,1.16,0.88);rc.mesh.rotation.set(0,Math.PI+0.45,-0.1);
  const t={zahlt:WT('zahlt','saal'),acht:WT('acht','saal'),mais:WT('Mais','saal'),zwanzig:WT('zwanzig','saal'),hat:WT('hat','saal')};
  lightsBasic(sc,{hemi:['#8aa0e0','#1a0a1a',0.6]});
  return {sc,anchors:{jule},grade:{mul:'#c8d8ff',a:0.04,vig:0.26,vigCol:'#05050f'},
    shots:[[0,0,[[-1.0,0.6,1.2],[1.0,0.6,1.2],'jule:top',[0,0.3,0.2]],162,12,0],[t.acht-0.1,0,['jule:top',[0.42,0.72,0.88],[-0.42,1.05,0.88]],186,4,1.0],[t.zwanzig-0.35,0,[[-0.42,1.56,0.88],[-0.42,0.78,0.88]],176,6,0.8]],
    update(lt){S2.SCR.update(lt,Math.floor(lt*10));S2.SL.intensity=2.2+Math.sin(lt*7)*0.25+(Math.floor(lt*3)%2)*0.3;jule.update(lt,{f:faceAt(lt,[[0,'happy'],[t.acht,'neutral'],[t.zwanzig+0.3,'shock']],1),pose:'hold'});
      rc.update(lt>t.mais?1:0,lt>t.mais?1:0);}};}};
DEF.finale={build(){const sc=new THREE.Scene();const S2=buildSaal(sc,true);
  const brandt=new Toon2D(sc,0.25,-4.7,{},1.0,{kind:'brandt'});box(1.2,0.9,0.8,M('#c4281f'),-1.3,0.45,-4.8,sc);const mach=popcornMachine(sc,-1.3,0.9,-4.8,1.0);
  const gro=new Toon2D(sc,3.1,-0.6,{},0.95,{kind:'coin'});
  const t={also:WT('also','finale'),sie:WT('Sie','finale'),pop:WT('Popcornverkäuferin','finale'),mit:WT('Mit','finale'),fern:WT('Fernseher','finale')};
  brandt.plan([{type:'g',g:'shrug',t:t.also},{type:'g',g:'wave',t:t.pop+0.2}]);gro.plan([{type:'g',g:'monocle',t:t.fern-0.4}]);
  const poof=glowSprite('#ffffff',3,0);poof.position.set(0.25,1.4,-4.5);sc.add(poof);
  lightsBasic(sc,{hemi:['#d8e4ff','#4a3a5a',1.15],sun:{c:'#fff0dc',i:0.5,p:[0,6,6],t:[0,1,-4],r:10}});spotOn(sc,[0.2,6,-1],[0.2,1,-4.7],'#fff0d8',1.0,0.3,0.6);
  return {sc,anchors:{brandt,gro},grade:{mul:'#e0e8ff',a:0.03,vig:0.2,vigCol:'#05050f'},
    shots:[[0,0,['brandt:top','brandt:feet',[-1.3,2.0,-4.8]],0,4,0],[t.sie-0.3,0,['brandt:top','brandt:chest'],10,2,0.95],[t.mit-0.3,0,[[-6,6.8,-6.5],[6,6.8,-6.5],[0,0,-4.7],'gro:feet'],0,6,0,{pull:true}]],
    update(lt){S2.SCR.update(lt,Math.floor(lt*10));animMachine(mach,lt);const cos=lt>t.pop-0.15;brandt.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.sie,'smug'],[t.pop,'happy']],7),costume:cos?'popcorn':null});
      poof.material.opacity=Math.max(0,1-Math.abs(lt-(t.pop-0.15))/0.2)*0.9;gro.update(lt,{f:faceAt(lt,[[0,'smirk'],[t.fern,'happy']],2),talk:talkAt('finale',lt)*(lt>t.mit-0.2?1:0)});}};}};
