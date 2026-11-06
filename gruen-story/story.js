// ================= STORY: Fritz und der Gruen-Effekt — warum du im Möbelhaus nie nur das kaufst, was du wolltest =================
// Object cast: Fritz (50-euro note whose VALUE counts down on his chest) + Herr Groschen (narrator).
// Light arc: morning car park -> warm showroom -> cosy restaurant -> bright market hall -> neon checkout -> sepia 1956 flashback -> dusk car park.
const STORY={
  title:['ER WOLLTE NUR','EINE GLÜHBIRNE'],
  keywords:['Glühbirne','drei','Fünfzig-Euro-Schein','raus','direkten','Kreis','Abkürzungen','übersehen','Restaurant','mehr','geschenkt','zwei','Vergessen','Hälfte','Moment','Gruen-Effekt','vergisst','Wien','Amerika','Einkaufszentrum','verachtet','Unterhalt','morgen','noch'],
  rim:{parkplatz:'#fff0d8',pfeile:'#ffe8c8',abkuerzung:'#ffe8c8',restaurant:'#ffd8a0',markthalle:'#f0f8ff',kasse:'#e0f0ff',groschen:'#f0f8ff',labyrinth:'#ffe8c8',rueckblende:'#ffd8a0',unterhalt:'#ffc890',abend:'#ffb880'},
};
const FS=0.85; // Fritz scale
// Fritz's value over the whole film (global seconds): it only ever goes down
function VAL(gt){const k=[[0,50],[ST('restaurant')+7.0,50],[ST('restaurant')+7.5,44],[ST('markthalle')+1.0,44],[ST('markthalle')+5.2,12],[ST('kasse')+0.4,12],[ST('kasse')+1.8,2],[999,2]];
  for(let i=0;i<k.length-1;i++){if(gt<k[i+1][0]){const u=clamp((gt-k[i][0])/Math.max(0.01,k[i+1][0]-k[i][0]));return Math.round(lerp(k[i][1],k[i+1][1],u));}}return 2;}
const fritzState=(scene,lt,extra={})=>{const v=VAL(ST(scene)+lt);return {value:v,crumple:clamp((50-v)/48),...extra};};
function bubble(parent,w=1.0,draw){return new Flat(parent,w,w*0.8,400,320,(g,lt)=>{g.fillStyle='#ffffff';g.strokeStyle='#1c1410';g.lineWidth=10;g.beginPath();
  [[200,140,130,100],[100,150,70,60],[300,150,70,60],[150,90,70,60],[260,90,70,60]].forEach(([x,y,rx,ry])=>{g.moveTo(x+rx,y);g.ellipse(x,y,rx,ry,0,0,7);});g.fill();g.stroke();g.fillStyle='#ffffff';g.beginPath();g.ellipse(200,140,125,95,0,0,7);g.fill();
  [[90,262,22],[60,298,13]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();});draw(g,lt);},{bill:true});}
function bulbIcon(g,x,y,s,col='#ffe23a',glow=true){g.save();g.translate(x,y);g.scale(s,s);if(glow){g.fillStyle='rgba(255,230,80,0.35)';g.beginPath();g.arc(0,-10,62,0,7);g.fill();}
  g.fillStyle=col;g.strokeStyle='#1c1410';g.lineWidth=8;g.beginPath();g.arc(0,-14,40,Math.PI*0.8,Math.PI*2.2);g.lineTo(16,32);g.lineTo(-16,32);g.closePath();g.fill();g.stroke();g.fillStyle='#9aa0aa';g.fillRect(-18,32,36,22);g.strokeRect(-18,32,36,22);
  g.strokeStyle='#c89a20';g.lineWidth=5;g.beginPath();g.moveTo(-10,20);g.lineTo(-6,-10);g.lineTo(0,4);g.lineTo(6,-10);g.lineTo(10,20);g.stroke();g.restore();}
function priceTag(parent,w,h,big,small,col='#ffe23a'){return new Flat(parent,w,h,Math.round(w*400),Math.round(h*400),g=>{const W2=Math.round(w*400),H2=Math.round(h*400);g.fillStyle=col;g.fillRect(0,0,W2,H2);g.strokeStyle='#1c1410';g.lineWidth=10;g.strokeRect(5,5,W2-10,H2-10);
  text(big,W2/2,H2*0.45,H2*0.42,'#c4281f',{ol:false});if(small)text(small,W2/2,H2*0.82,H2*0.17,'#1c1410',{ol:false});},{lit:true});}
// ---------- furniture kit ----------
function sofa(p,x,z,ry,col){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);const m=M(col),d=M(mixc(col,'#000000',0.25));box(2.0,0.42,0.9,m,0,0.31,0,g);box(2.0,0.6,0.22,m,0,0.72,-0.36,g);[-1,1].forEach(s=>box(0.22,0.55,0.9,d,s*1.0,0.42,0,g));[-0.48,0.48].forEach(cx=>box(0.9,0.12,0.7,M(mixc(col,'#ffffff',0.15)),cx,0.58,0.05,g));[-0.85,0.85].forEach(cx=>[-0.35,0.35].forEach(cz=>cyl(0.04,0.03,0.12,M('#3a2a1a'),cx,0.06,cz,g,8)));return g;}
function rug(p,x,z,w,d,c1,c2){const t=tiled(128,128,1,1,g=>{g.fillStyle=c1;g.fillRect(0,0,128,128);g.strokeStyle=c2;g.lineWidth=10;g.strokeRect(14,14,100,100);g.strokeRect(36,36,56,56);});const m=mesh(new THREE.PlaneGeometry(w,d),M('#ffffff',{map:t}),x,0.006,z,p);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}
function floorLamp(p,x,z,col='#ffe0a0'){cyl(0.15,0.18,0.04,M('#2a2a2a'),x,0.02,z,p,16);cyl(0.02,0.02,1.5,M('#2a2a2a'),x,0.77,z,p,8);const sh=cyl(0.16,0.26,0.32,M('#f2e8d4'),x,1.58,z,p,18);const L=new THREE.PointLight(col,0.9,4,2);L.position.set(x,1.5,z);p.add(L);const gl=glowSprite(col,1.1,0.4);gl.position.set(x,1.55,z);p.add(gl);return L;}
function kitchen(p,x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);const w=M('#f4f2ec'),wood=M('#c89a60'),mint=M('#7ac8b0');
  box(3.0,0.9,0.62,mint,0,0.45,0,g);box(3.06,0.05,0.66,wood,0,0.925,0,g);for(let i=0;i<5;i++){box(0.02,0.7,0.02,M('#3a4a48'),-1.2+i*0.6,0.5,0.32,g);}
  box(3.0,0.7,0.36,w,0,1.85,-0.13,g);box(0.7,1.95,0.66,M('#e8eef2'),1.9,0.975,0,g);cyl(0.012,0.012,0.6,M('#8a8e9a'),1.62,1.2,0.34,g,6);
  cyl(0.14,0.12,0.18,M('#c4281f'),-0.6,1.04,0,g,16);box(0.5,0.02,0.36,M('#e8e8ea'),0.6,0.96,0,g);return g;}
function bed(p,x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);box(1.7,0.35,2.1,M('#c89a60'),0,0.22,0,g);box(1.7,1.0,0.1,M('#a87a40'),0,0.55,-1.05,g);box(1.6,0.2,1.95,M('#ffffff'),0,0.48,0.02,g);
  box(1.64,0.08,1.3,M('#5a8ad8'),0,0.6,0.35,g);[-0.45,0.45].forEach(px=>box(0.6,0.14,0.36,M('#f2f0ea'),px,0.64,-0.75,g));[-1.15,1.15].forEach(px=>{box(0.45,0.5,0.4,M('#c89a60'),px,0.25,-0.8,g);cyl(0.08,0.1,0.25,M('#f2e8d4'),px,0.66,-0.8,g,12);});return g;}
function desk(p,x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);box(1.5,0.05,0.7,M('#f2f0ea'),0,0.75,0,g);[-0.7,0.7].forEach(px=>[-0.3,0.3].forEach(pz=>cyl(0.025,0.025,0.75,M('#3a3a3a'),px,0.375,pz,g,8)));
  box(0.5,0.32,0.03,M('#2a2e38'),0,1.02,-0.2,g);box(0.55,0.9,0.5,M('#e8a040'),0,0.45,0.65,g);return g;}
function partWall(p,x,z,w,ry,col){const m=box(w,2.6,0.14,M(col),x,1.3,z,p);m.rotation.y=ry;m.userData.wall=true;return m;}
function extendFront(sc,w,len,floorTex,wallTex){const f=mesh(new THREE.PlaneGeometry(w,len),M('#ffffff',{map:floorTex}),0,0,3+len/2,sc);f.rotation.x=-Math.PI/2;f.castShadow=false;[-1,1].forEach(sd=>{const m=box(0.4,3.8,len,M('#ffffff',{map:wallTex}),sd*w/2,1.9,3+len/2,sc);m.userData.wall=true;});sc.userData.bounds.z1=3+len-0.4;}
// ---------- showroom (shared by pfeile / abkuerzung / labyrinth) ----------
const ARROW=ctex(128,128,g=>{g.fillStyle='#ffd21a';g.strokeStyle='#1c1410';g.lineWidth=6;g.beginPath();g.moveTo(64,8);g.lineTo(116,64);g.lineTo(84,64);g.lineTo(84,120);g.lineTo(44,120);g.lineTo(44,64);g.lineTo(12,64);g.closePath();g.fill();g.stroke();}).t;
const ROUTE=[[-1.0,2.2],[-2.0,0.4],[-4.2,-0.9],[-5.9,-3.0],[-5.4,-5.2],[-3.0,-6.6],[-1.0,-9.3],[1.0,-9.3],[3.0,-6.6],[5.4,-5.2],[5.9,-3.0],[4.2,-0.9],[2.0,0.4],[1.0,2.2]];
function routePos(u){const n=ROUTE.length-1;const f=clamp(u)*n;const i=Math.min(n-1,Math.floor(f));const a=ROUTE[i],b=ROUTE[i+1],k=f-i;return [lerp(a[0],b[0],k),lerp(a[1],b[1],k)];}
function showroom(sc){sc.background=gradBg(['#f4e8d8','#d8c8b0']);room(sc,{w:14,d:14,h:3.6,wall:plainNoise('#efe6d6',3,1,'#8a7a5a',0.05),floor:woodTex('#d8b07a',6,6)});
  const cw=box(0.2,2.6,8.2,M('#f4f0e8'),0,1.3,-4.4,sc);cw.userData.wall=true;
  [-2.55,2.55].forEach(x=>{box(4.9,0.9,0.12,M('#e8d8c0'),x,0.45,-4.0,sc);box(4.9,0.05,0.16,M('#c89a60'),x,0.92,-4.0,sc);});
  const ext=mesh(new THREE.PlaneGeometry(14,9.5),M('#ffffff',{map:woodTex('#d8b07a',6,4)}),0,0,7.7,sc);ext.rotation.x=-Math.PI/2;ext.castShadow=false;[-1,1].forEach(sd=>{const w=box(0.4,3.6,9.5,M('#ffffff',{map:plainNoise('#efe6d6',2,1,'#8a7a5a',0.05)}),sd*7,1.8,7.7,sc);w.userData.wall=true;});sc.userData.bounds.z1=11.8;sc.userData.bounds.y1=6;
  // living room (front left)
  rug(sc,-3.3,-1.8,3.0,2.2,'#c8584a','#f2d8a8');sofa(sc,-3.3,-2.9,0,'#3a7a8a');box(1.0,0.4,0.6,M('#c89a60'),-3.3,0.2,-1.7,sc);floorLamp(sc,-5.6,-3.4);
  const pic=new Flat(sc,1.2,0.8,360,240,()=>{const g=getCtx();g.fillStyle='#f6e7c8';g.fillRect(0,0,360,240);g.fillStyle='#e8a040';g.beginPath();g.arc(120,110,60,0,7);g.fill();g.fillStyle='#3a7a8a';g.fillRect(170,80,140,110);g.strokeStyle='#1c1410';g.lineWidth=14;g.strokeRect(7,7,346,226);},{lit:true});pic.mesh.position.set(-3.3,1.8,-3.92);pic.update(0,1);
  // kitchen (back left), bedroom (back right), study (front right)
  kitchen(sc,-3.4,-7.6,0);bed(sc,3.3,-7.3,0);rug(sc,3.3,-6.1,2.6,1.6,'#5a8ad8','#f2f0ea');desk(sc,3.4,-2.6,0);sofa(sc,5.6,-1.4,-Math.PI/2,'#e8a040');floorLamp(sc,1.6,-3.4,'#fff0d0');
  for(let i=0;i<4;i++){const z=-1-i*2.6;[-3.5,3.5].forEach(x=>{const gl=glowSprite('#fff4e0',1.6,0.32);gl.position.set(x,3.5,z);sc.add(gl);box(0.5,0.04,0.5,E('#fffaf0'),x,3.58,z,sc).castShadow=false;});}
  // floor arrows along the route
  const arrows=[];for(let i=0;i<40;i++){const u=i/40,[x,z]=routePos(u),[x2,z2]=routePos(u+0.01);const a=mesh(new THREE.PlaneGeometry(0.42,0.42),NO(new THREE.MeshLambertMaterial({map:ARROW,transparent:true,alphaTest:0.4})),x,0.012,z,sc);a.rotation.order='YXZ';a.rotation.y=Math.atan2(x-x2,z-z2)+Math.PI;a.rotation.x=-Math.PI/2;a.castShadow=false;arrows.push(a);}
  const start=new Flat(sc,1.3,0.5,520,200,()=>{rr(8,8,504,184,30);fillS('#ffd21a',8);text('START →',260,108,100,'#1c1410',{ol:false});});start.mesh.position.set(-1.6,2.6,1.2);start.update(0,1);
  lightsBasic(sc,{hemi:['#fff4e4','#8a6a44',0.95],sun:{c:'#fff0d8',i:0.62,p:[7,8,4],t:[0,0,-4],r:12}});
  return {arrows};}
function routeLine(sc){const dashes=[];for(let i=0;i<120;i++){const u=i/120,[x,z]=routePos(u),[x2,z2]=routePos(u+0.004);const d=box(0.14,0.02,0.07,E('#e8283a'),x,0.03,z,sc);d.rotation.y=Math.atan2(x2-x,z2-z)+Math.PI/2;d.castShadow=false;d.visible=false;dashes.push(d);}return dashes;}

// ---------- 1 PARKPLATZ (morning) / 11 ABEND (dusk) ----------
function carpark(sc,dusk){sky(sc,dusk?['#3a3a8a','#c8608a','#ffb070']:['#5a9ae8','#a8d0f8','#e8f4ff']);
  const asph=mesh(new THREE.PlaneGeometry(60,40),M(dusk?'#4a4458':'#7a7a84'),0,0,-4,sc);asph.rotation.x=-Math.PI/2;asph.castShadow=false;
  for(let i=0;i<8;i++){[3.2,-0.6].forEach(z=>{const l=box(0.1,0.01,2.4,E(dusk?'#c8c0d8':'#f2f2f2'),-8+i*2.4,0.006,z,sc);l.castShadow=false;});}
  const st=box(26,9,4,M('#1f8a8a'),0,4.5,-12,sc);st.userData.wall=true;box(26.2,0.6,4.2,M('#f28a2a'),0,9.1,-12,sc);
  const sign=new Flat(sc,9,1.8,1800,360,()=>{text('MÖBELHAUS',900,190,300,'#f28a2a',{olc:'#5a2a00',olw:22});});sign.mesh.position.set(0,7.2,-9.95);sign.update(0,1);
  const door=box(4,3.2,0.1,E(dusk?'#ffd8a0':'#d8f0ff'),0,1.6,-9.95,sc);door.castShadow=false;[-2,0,2].forEach(x=>box(0.14,3.3,0.16,M('#2a2e38'),x,1.65,-9.9,sc));
  const cars=[[-6,3.2,'#c4281f'],[-3.6,-0.6,'#2a6ad8'],[5.2,3.2,'#f2c42a'],[7.6,-0.6,'#3a8a5a']];cars.forEach(([x,z,c])=>{const g=new THREE.Group();g.position.set(x,0,z);sc.add(g);box(1.8,0.6,3.8,M(c),0,0.55,0,g);box(1.6,0.55,2.0,M(mixc(c,'#ffffff',0.15)),0,1.1,-0.2,g);box(1.5,0.45,1.9,E(dusk?'#3a3a58':'#a8d8f8'),0,1.1,-0.2,g).scale.set(1.08,0.85,0.96);
    [[-0.85,-1.2],[0.85,-1.2],[-0.85,1.2],[0.85,1.2]].forEach(([a,b])=>{const w=cyl(0.33,0.33,0.25,M('#1a1a1e'),a,0.33,b,g,16);w.rotation.z=Math.PI/2;});});
  if(dusk){lampPost(sc,-4,-4,'#ffc870');lampPost(sc,4,-4,'#ffc870');const dg=glowSprite('#ffd8a0',6,0.45);dg.position.set(0,1.6,-9.7);sc.add(dg);}
  lightsBasic(sc,dusk?{hemi:['#ffd8c8','#3a3a6a',1.0],sun:{c:'#ffb070',i:0.85,p:[-10,4,6],t:[0,0.5,-4],r:14}}:{hemi:['#e8f4ff','#8a8478',1.0],sun:{c:'#fff4e0',i:0.75,p:[6,10,6],t:[0,0,-3],r:14}});
  return {door};}
DEF.parkplatz={build(){const sc=new THREE.Scene();carpark(sc,false);const fr=new Toon2D(sc,0.6,1.4,{},FS,{kind:'fritz'});
  const t={fritz:WT('Fritz','parkplatz'),eine:WT('Eine','parkplatz'),drei:WT('drei','parkplatz'),fritz2:WT2('Fritz','parkplatz',4.0),plan:WT('Plan','parkplatz'),rein:WT('rein','parkplatz'),birne:WT('Birne','parkplatz'),raus:WT('raus','parkplatz')};
  fr.plan([{type:'g',g:'point',t:t.eine-0.3},{type:'g',g:'nod',t:t.fritz2+0.4},{type:'walk',t:t.rein-0.1,dur:2.2,from:[0.6,1.4],to:[0.2,-4.5]}]);
  const bub=bubble(sc,1.0,(g,lt)=>{bulbIcon(g,150,130,1.1);text('1×',290,110,64,'#1c1410',{ol:false});text('3 €',290,190,58,'#c4281f',{ol:false});});
  const plan=['REIN','BIRNE','RAUS'].map((w,i)=>badge(sc,1.4,0.46,(i?'→ ':'')+w,'#ffffff',['#2a8ae8','#f2a020','#2a9a4a'][i]));
  const fifty=badge(sc,1.2,0.44,'50 € SCHEIN','#1c1410','#ffd21a');
  return {sc,anchors:{fr},grade:{mul:'#f0f4ff',a:0.04,vig:0.18,vigCol:'#1a2a4a'},
    shots:[[0,0,['fr:top','fr:knee',[0.6,2.8,1.4]],-8,4,0],[t.eine-0.3,0,[[1.2,3.25,1.3],[1.2,2.0,1.3],'fr:face'],10,2,0],[t.fritz2-0.3,0,['fr:top','fr:feet'],-12,6,0],
      [t.plan-0.3,0,[[-6,9.4,-10],[6,9.4,-10],'fr:feet'],4,-4,0,{follow:'fr'}]],
    update(lt){const hap=faceAt(lt,[[0,'neutral'],[t.eine,'raised'],[t.fritz2,'smug'],[t.plan,'happy']],2);fr.update(lt,{f:hap,...fritzState('parkplatz',lt)});
      const tp=fr.anchor('top');bub.mesh.position.set(tp.x+0.6,tp.y+0.45,tp.z-0.1);popS(bub.mesh,lt,0.3,1);if(lt>t.plan-0.2)bub.mesh.visible=false;bub.update(lt,1);
      fifty.mesh.position.set(tp.x,tp.y+0.3,tp.z);popS(fifty.mesh,lt,t.fritz2+0.3,1);if(lt>t.plan-0.2)fifty.mesh.visible=false;fifty.update(lt,1);
      plan.forEach((b,i)=>{b.mesh.position.set(-2.4+i*2.4,5.0,-6.5);popS(b.mesh,lt,[t.rein,t.birne,t.raus][i]-0.05,1.6);b.update(lt,1);});}};}};
DEF.abend={build(){const sc=new THREE.Scene();const C=carpark(sc,true);const fr=new Toon2D(sc,0.2,-5.0,{},FS,{kind:'fritz'});
  const cart=new THREE.Group();sc.add(cart);box(0.7,0.5,1.0,M('#c8ccd4'),0,0.75,0,cart);[[-0.3,-0.4],[0.3,-0.4],[-0.3,0.4],[0.3,0.4]].forEach(([a,b])=>cyl(0.08,0.08,0.05,M('#1a1a1e'),a,0.1,b,cart,10).rotation.z=Math.PI/2);
  const loot=[['#e83a3a',0.12],['#3a8a5a',0.15],['#f2c42a',0.12],['#5a8ad8',0.13],['#ffffff',0.1]];loot.forEach(([c,s],i)=>sph(s,M(c),(i%3-1)*0.18,1.1+Math.floor(i/3)*0.15,(i%2-0.5)*0.3,cart));
  const sgn=new Flat(sc,2.2,0.7,660,210,()=>{rr(6,6,648,198,26);fillS('#1c1410',6);text('MORGEN 10:00 GEÖFFNET',330,108,52,'#ffd21a',{ol:false});});sgn.mesh.position.set(3.2,2.4,-9.9);sgn.update(0,1);
  const t={fritz:WT('Fritz','abend'),morgen:WT('morgen','abend'),die:WT('Die','abend'),gl:WT('Glühbirne','abend'),fehlt:WT('fehlt','abend')};
  fr.plan([{type:'walk',t:0,dur:2.0,from:[0.2,-5.0],to:[0.6,-1.2]},{type:'g',g:'shrug',t:t.fehlt-0.2}]);
  const bub=bubble(sc,1.0,(g)=>{bulbIcon(g,200,130,1.25);});
  return {sc,anchors:{fr},grade:{mul:'#ffd8d0',a:0.05,vig:0.26,vigCol:'#1a0a2a'},
    shots:[[0,0,['fr:top','fr:feet',[3.2,2.8,-9.9]],-10,6,0,{follow:'fr'}],[t.die-0.3,0,['fr:top','fr:chest',[1.2,2.55,-1.3]],10,2,0]],
    update(lt){fr.update(lt,{f:faceAt(lt,[[0,'tired'],[t.morgen,'happy'],[t.gl,'raised']],2),...fritzState('abend',lt)});const p=fr.mesh.position;cart.position.set(p.x+0.95,0,p.z-0.35);
      const tp=fr.anchor('top');bub.mesh.position.set(tp.x+0.6,tp.y+0.4,tp.z-0.1);popS(bub.mesh,lt,t.gl-0.1,1);bub.update(lt,1);}};}};

// ---------- 2 PFEILE: no direct way ----------
DEF.pfeile={build(){const sc=new THREE.Scene();const S0=showroom(sc);const fr=new Toon2D(sc,-1.0,2.2,{},FS,{kind:'fritz'});const dashes=routeLine(sc);
  const t={aber:WT('Aber','pfeile'),weg:WT('Weg','pfeile'),pfeile:WT('Pfeile','pfeile'),wohn:WT('Wohnzimmer','pfeile'),kue:WT('Küchen','pfeile'),schlaf:WT('Schlafzimmer','pfeile'),einmal:WT('Einmal','pfeile'),kreis:WT('Kreis','pfeile')};
  fr.plan([{type:'walk',t:0,dur:t.pfeile,from:[-1.0,2.2],to:[-2.0,0.4]},{type:'walk',t:t.pfeile,dur:t.wohn-t.pfeile,to:[-3.4,-0.4]},{type:'walk',t:t.wohn-0.3,dur:0.9,from:[-4.4,-0.6],to:[-3.0,-1.3]},
    {type:'walk',t:t.kue-0.3,dur:0.8,from:[-4.6,-5.6],to:[-3.2,-6.2]},{type:'walk',t:t.schlaf-0.3,dur:0.9,from:[2.2,-5.6],to:[3.8,-5.4]},{type:'walk',t:t.einmal-0.3,dur:2.0,from:[5.4,-2.6],to:[2.6,0.2]}]);
  const shot0=['fr:top','fr:feet',[-1.6,2.85,1.2]];
  return {sc,anchors:{fr},grade:{mul:'#ffe8d0',a:0.05,vig:0.2,vigCol:'#3a2010'},
    shots:[[0,0,shot0,-12,6,0,{follow:'fr'}],[t.pfeile-0.3,0,['fr:knee','fr:feet',[-2.6,0,0.0],[-1.6,0,1.0]],-20,36,0,{follow:'fr'}],[t.wohn-0.3,0,['fr:top','fr:feet',[-3.3,0.9,-2.9]],-8,6,0],
      [t.kue-0.3,0,['fr:top','fr:chest',[-3.4,2.2,-7.6],[-3.4,0.9,-7.6]],-4,6,0],[t.schlaf-0.3,0,['fr:top','fr:chest',[3.3,1.1,-7.3]],6,6,0],[t.einmal-0.3,0,[[-6.2,0,-9.6],[6.2,0,-9.6],[0,0,2.4]],0,82,0,{free:true}]],
    update(lt){const tired=lt>t.schlaf;fr.update(lt,{f:faceAt(lt,[[0,'happy'],[t.weg,'raised'],[t.kue,'worried'],[t.einmal,'tired']],2),...fritzState('pfeile',lt)});
      const u=clamp((lt-t.einmal+0.2)/1.4);dashes.forEach((d,i)=>d.visible=i/dashes.length<u);S0.arrows.forEach((a,i)=>a.material.color.setScalar(0.9+0.2*Math.max(0,Math.sin(lt*6-i*0.6))));}};}};

// ---------- 3 ABKUERZUNG: the hidden shortcut ----------
DEF.abkuerzung={build(){const sc=new THREE.Scene();showroom(sc);const fr=new Toon2D(sc,-0.9,-2.8,{},FS,{kind:'fritz'});
  const door=box(0.06,2.0,0.9,M('#e8d8c0'),-0.13,1.0,-2.2,sc);const knob=sph(0.04,M('#c8a020'),-0.17,1.0,-1.85,sc);
  const pl=new THREE.Group();pl.position.set(-0.6,0,-1.75);sc.add(pl);cyl(0.28,0.22,0.5,M('#c86a3a'),0,0.25,0,pl,16);[[0,1.2,0,0.45],[-0.25,1.0,0.1,0.35],[0.25,1.05,0.05,0.38],[0.05,1.55,-0.05,0.32],[-0.15,0.75,0.15,0.3]].forEach(([x,y,z,r])=>sph(r,M('#3a8a3a'),x,y,z,pl,1,1.2,1));
  const tiny=new Flat(sc,0.22,0.08,220,80,()=>{const g=getCtx();g.fillStyle='#2a9a4a';g.fillRect(0,0,220,80);text('ABKÜRZUNG',110,44,30,'#ffffff',{ol:false});},{lit:true});tiny.mesh.position.set(-0.12,2.12,-2.2);tiny.mesh.rotation.y=-Math.PI/2;tiny.update(0,1);
  const ring=glowSprite('#7affb0',0.6,0);ring.position.set(-0.2,2.12,-2.2);sc.add(ring);
  const t={abk:WT('Abkürzungen','abkuerzung'),aber:WT('Aber','abkuerzung'),meisten:WT('meisten','abkuerzung'),ueber:WT('übersehen','abkuerzung')};
  fr.plan([{type:'walk',t:t.aber-0.4,dur:1.8,from:[-1.7,0.8],to:[-1.7,-3.4]}]);fr.mesh.visible=false;
  return {sc,anchors:{fr},grade:{mul:'#ffe8d0',a:0.05,vig:0.22,vigCol:'#3a2010'},
    shots:[[0,0,[[-0.12,2.3,-2.2],[-0.12,0,-2.2],[-0.12,1.0,-2.7]],-80,4,0],[t.aber-0.3,0,[[-0.12,2.2,-2.2],[-0.12,0,-2.2],'fr:top','fr:feet'],-58,6,0]],
    update(lt){fr.update(lt,{f:faceAt(lt,[[0,'happy']],2),look:-0.6,...fritzState('abkuerzung',lt)});fr.mesh.visible=lt>t.aber-0.4;ring.material.opacity=0.35+0.25*Math.sin(lt*6);}};}};

// ---------- 4 RESTAURANT: right in the middle ----------
DEF.restaurant={build(){const sc=new THREE.Scene();sc.background=gradBg(['#f2d8b0','#c89868']);
  room(sc,{w:10,d:10,h:3.4,wall:woodTex('#e8c08a',3,2),floor:tiles2('#c8a070','#b08858',8,8)});extendFront(sc,10,5,tiles2('#c8a070','#b08858',8,5),woodTex('#e8c08a',2,2));
  for(let i=0;i<3;i++){const x=-2.5+i*2.5;cyl(0.4,0.4,0.05,M('#f2f0ea'),x,0.75,-2.4,sc,24);cyl(0.05,0.05,0.75,M('#3a3a3a'),x,0.37,-2.4,sc,8);const lamp=cyl(0.18,0.32,0.26,M('#f28a2a'),x,2.6,-2.4,sc,18);cyl(0.006,0.006,0.8,M('#1a1a1a'),x,3.1,-2.4,sc,4);
    const L=new THREE.PointLight('#ffc070',1.1,4.5,2);L.position.set(x,2.4,-2.4);sc.add(L);const gl=glowSprite('#ffc070',1.2,0.45);gl.position.set(x,2.45,-2.4);sc.add(gl);}
  const tab=box(1.6,0.06,0.9,M('#f2f0ea'),0,0.78,-1.2,sc);[-0.7,0.7].forEach(px=>cyl(0.03,0.03,0.78,M('#3a3a3a'),px,0.39,-1.2,sc,6));
  const plate=cyl(0.24,0.2,0.04,M('#ffffff'),0.1,0.83,-1.0,sc,24);const balls=[];for(let i=0;i<7;i++){const a=i/7*Math.PI*2;balls.push(sph(0.055,M('#8a4a24'),0.1+Math.cos(a)*0.11,0.89,-1.0+Math.sin(a)*0.11,sc));}
  sph(0.07,M('#f2e0a0'),0.0,0.88,-0.92,sc,1.2,0.6,1);sph(0.04,M('#c4281f'),0.2,0.88,-0.9,sc,1.2,0.6,1);
  const steam=[];for(let i=0;i<10;i++){const s=glowSprite('#ffffff',0.25,0);sc.add(s);steam.push(s);}
  const map=new Flat(sc,1.6,1.6,480,480,(g,lt)=>{g.fillStyle='#fbf8ef';g.fillRect(0,0,480,480);g.strokeStyle='#1c1410';g.lineWidth=12;g.strokeRect(6,6,468,468);text('HAUSPLAN',240,50,40,'#1c1410',{ol:false});
    g.strokeStyle='#ffd21a';g.lineWidth=16;g.beginPath();g.moveTo(90,420);g.lineTo(90,100);g.lineTo(390,100);g.lineTo(390,420);g.stroke();g.fillStyle='#1c1410';g.fillRect(232,120,16,300);
    g.fillStyle='#f28a2a';rr(180,200,120,90,18);g.fill();text('RESTAURANT',240,248,22,'#ffffff',{ol:false});if(Math.floor(lt*3)%2){g.fillStyle='#e8283a';g.beginPath();g.arc(240,245,58,0,7);g.lineWidth=8;g.strokeStyle='#e8283a';g.stroke();}
    text('START',90,450,24,'#2a8ae8',{ol:false});text('KASSE',390,450,24,'#2a9a4a',{ol:false});},{lit:true});map.mesh.position.set(2.6,1.7,-6.78);
  const clock=new THREE.Group();clock.position.set(-2.6,2.3,-6.76);sc.add(clock);const face=cyl(0.42,0.42,0.06,M('#ffffff'),0,0,0,clock,32);face.rotation.x=Math.PI/2;const hh=box(0.04,0.22,0.02,M('#1c1410'),0,0.1,0.05,clock);const mh=box(0.03,0.34,0.02,M('#c4281f'),0,0.16,0.06,clock);
  const hand=new THREE.Group();clock.add(hand);hand.add(mh);mh.position.set(0,0.16,0.06);const hand2=new THREE.Group();clock.add(hand2);hand2.add(hh);hh.position.set(0,0.1,0.05);
  const fr=new Toon2D(sc,0.1,-1.75,{},FS,{kind:'fritz'});const growl=badge(sc,0.9,0.32,'GRRRUMMEL','#ffffff','#c4281f');
  const t={knurrt:WT('knurrt','restaurant'),magen:WT('Magen','restaurant'),und:WT('Und','restaurant'),mitte:WT('Mitte','restaurant'),rest:WT('Restaurant','restaurant'),wer:WT('Wer','restaurant'),satt:WT('satt','restaurant'),und2:WT2('Und','restaurant',5.5),kauft:WT('kauft','restaurant'),mehr:WT('mehr','restaurant')};
  fr.plan([{type:'g',g:'eat',t:t.satt-0.2},{type:'g',g:'eat',t:t.satt+0.6}]);
  lightsBasic(sc,{hemi:['#fff0dc','#8a5a34',0.95],sun:{c:'#ffe0b0',i:0.5,p:[4,7,4],t:[0,0,-2],r:8}});
  return {sc,anchors:{fr},grade:{mul:'#ffe0c0',a:0.06,vig:0.24,vigCol:'#3a1a08'},
    shots:[[0,0,['fr:top','fr:knee'],-8,4,0],[t.mitte-0.3,0,[[1.8,2.5,-6.78],[3.4,0.9,-6.78]],6,2,0],[t.wer-0.3,0,['fr:face',[0.1,0.8,-1.0],[0.1,1.25,-1.0]],-10,16,0.95],[t.und2-0.3,0,[[-2.6,2.75,-6.76],[-2.6,1.85,-6.76]],-10,4,0.9]],
    update(lt){fr.update(lt,{f:faceAt(lt,[[0,'tired'],[t.mitte,'raised'],[t.wer,'happy'],[t.kauft,'laugh']],2),pose:lt<t.mitte?'hold':'down',...fritzState('restaurant',lt)});
      const tp=fr.anchor('chest');growl.mesh.position.set(tp.x+0.55,tp.y-0.25,tp.z+0.1);popS(growl.mesh,lt,t.knurrt,1);if(lt>t.und-0.2)growl.mesh.visible=false;growl.update(lt,1);
      map.update(lt,Math.floor(lt*3));const spin=lt>t.und2?(lt-t.und2)*9:0;hand.rotation.z=-spin;hand2.rotation.z=-spin/12;
      const eaten=lt>t.satt?Math.floor((lt-t.satt)*2.2):0;balls.forEach((b,i)=>b.visible=i>=eaten);
      steam.forEach((s,i)=>{const v=((lt*0.5+rnd(i))%1);s.position.set(0.1+Math.sin(lt*2+i)*0.06,0.92+v*0.7,-1.0);s.material.opacity=0.35*Math.sin(v*Math.PI);s.scale.setScalar(0.15+v*0.3);});}};}};
function tiles2(a,b,rx,ry){return tiled(128,128,rx,ry,g=>{g.fillStyle=a;g.fillRect(0,0,128,128);g.fillStyle=b;g.fillRect(0,0,64,64);g.fillRect(64,64,64,64);});}

// ---------- 5 MARKTHALLE: almost free ----------
DEF.markthalle={build(){const sc=new THREE.Scene();sc.background=gradBg(['#f4f8ff','#d8e0ea']);
  room(sc,{w:12,d:12,h:4.2,wall:plainNoise('#d0dae4',3,1,'#5a6a7a',0.05),floor:tiles2('#c8c2b6','#b0a99c',10,10)});extendFront(sc,12,7,tiles2('#c8c2b6','#b0a99c',10,6),plainNoise('#d0dae4',2,1,'#5a6a7a',0.05));
  const bins=[];const items=[['KERZEN','#ffffff','#e8283a',0.99],['SERVIETTEN','#ffd21a','#2a8ae8',1.49],['PFLANZEN','#3a8a3a','#c86a3a',2.99],['BECHER','#f28a2a','#ffffff',0.79],['KISSEN','#5a8ad8','#ffffff',3.99]];
  items.forEach(([n,c1,c2,p],i)=>{const x=-4+(i%3)*3.2,z=-2.5-Math.floor(i/3)*3.2;const g=new THREE.Group();g.position.set(x,0,z);sc.add(g);box(1.6,0.7,1.1,M('#c89a60'),0,0.35,0,g);
    for(let k=0;k<14;k++){const kx=(rnd(k+i*9)-0.5)*1.3,kz=(rnd(k*3+i)-0.5)*0.8;if(n==='PFLANZEN'){cyl(0.1,0.08,0.14,M(c2),kx,0.77,kz,g,10);sph(0.12,M(c1),kx,0.93,kz,g);}else if(n==='KERZEN'){cyl(0.05,0.05,0.24,M(k%2?c1:c2),kx,0.82,kz,g,10);}else box(0.22,0.12,0.22,M(k%2?c1:c2),kx,0.76+(k%3)*0.05,kz,g);}
    const pt=priceTag(sc,0.8,0.5,p.toFixed(2).replace('.',',')+' €',n);pt.mesh.position.set(x,1.25,z+0.56);pt.update(0,1);bins.push({x,z,n,c1,c2,pt});});
  for(let i=0;i<3;i++){const l=box(2.4,0.05,0.25,E('#ffffff'),-3+i*3,4.15,-3.5,sc);l.castShadow=false;const gl=glowSprite('#f4f8ff',2.6,0.32);gl.position.set(-3+i*3,4.05,-3.5);sc.add(gl);}
  const hs=new Flat(sc,3.4,0.7,1020,210,()=>{rr(8,8,1004,194,30);fillS('#f28a2a',8);text('MARKTHALLE',510,112,120,'#ffffff',{ol:false});});hs.mesh.position.set(0,3.4,-5.75);hs.update(0,1);
  const fr=new Toon2D(sc,0.6,-0.6,{},FS,{kind:'fritz'});
  const cart=new THREE.Group();sc.add(cart);box(0.8,0.55,1.1,NO(new THREE.MeshToonMaterial({color:'#c8ccd4',gradientMap:gm,transparent:true,opacity:0.75})),0,0.8,0,cart);box(0.82,0.04,1.12,M('#8a8e9a'),0,0.52,0,cart);[[-0.35,-0.45],[0.35,-0.45],[-0.35,0.45],[0.35,0.45]].forEach(([a,b])=>{cyl(0.08,0.08,0.05,M('#1a1a1e'),a,0.1,b,cart,10).rotation.z=Math.PI/2;cyl(0.015,0.015,0.45,M('#8a8e9a'),a,0.3,b,cart,6);});
  const t={ganz:WT('Ganz','markthalle'),kerzen:WT('Kerzen','markthalle'),serv:WT('Servietten','markthalle'),topf:WT('Topfpflanzen','markthalle'),alles:WT('Alles','markthalle'),euro:WT('Euro','markthalle'),fast:WT('Fast','markthalle')};
  fr.plan([{type:'walk',t:0,dur:1.0,from:[1.6,0.4],to:[0.6,-0.6]},{type:'g',g:'point',t:t.kerzen-0.3},{type:'g',g:'wave',t:t.fast-0.1}]);
  const fly=[];for(let i=0;i<16;i++){const g=new THREE.Group();sc.add(g);const b=bins[i%3];if(b.n==='PFLANZEN'){cyl(0.1,0.08,0.14,M(b.c2),0,0,0,g,10);sph(0.12,M(b.c1),0,0.16,0,g);}else if(b.n==='KERZEN')cyl(0.05,0.05,0.24,M(i%2?b.c1:b.c2),0,0,0,g,10);else box(0.22,0.12,0.22,M(i%2?b.c1:b.c2),0,0,0,g);fly.push({g,b,t0:t.kerzen-0.2+i*((t.alles-t.kerzen+0.6)/16)});}
  lightsBasic(sc,{hemi:['#f4f8ff','#6a6458',0.85],sun:{c:'#fff4e0',i:0.55,p:[6,9,4],t:[0,0,-3],r:12}});
  return {sc,anchors:{fr},grade:{mul:'#dce4f0',a:0.12,vig:0.24,vigCol:'#20283a'},
    shots:[[0,0,['fr:top','fr:feet',[0,3.75,-5.75],[-1.4,0.7,-2.5]],-6,8,0],[t.kerzen-0.3,0,[[-4,1.5,-2.0],[-4,0.7,-2.5],[-2.6,1.6,-1.6]],-14,10,0],[t.topf-0.35,0,[[2.4,1.4,-2.0],[2.4,0.7,-2.5],[1.4,1.2,-0.6]],22,10,0],
      [t.alles-0.3,0,[[2.4,1.55,-1.9],[2.4,0.95,-1.9]],10,2,0.75],[t.fast-0.3,0,['fr:top','fr:feet',[1.4,1.3,-0.6]],-8,6,0]],
    update(lt){fr.update(lt,{f:faceAt(lt,[[0,'happy'],[t.kerzen,'raised'],[t.alles,'smug'],[t.fast,'laugh']],2),...fritzState('markthalle',lt)});const p=fr.mesh.position;cart.position.set(p.x+0.85,0,p.z+0.15);
      fly.forEach((f,i)=>{const u=clamp((lt-f.t0)/0.55);f.g.visible=lt>f.t0;const a=V(f.b.x+(rnd(i)-0.5)*0.8,0.85,f.b.z),bb=V(cart.position.x+(rnd(i*3)-0.5)*0.5,0.75+Math.min(8,i)*0.03,cart.position.z+(rnd(i*5)-0.5)*0.7);f.g.position.copy(arc(a,bb,u,1.0));f.g.rotation.set(u<1?lt*7:0,u<1?lt*5:i,0);});}};}};

// ---------- 6 KASSE: two euros left, light bulb forgotten ----------
DEF.kasse={build(){const sc=new THREE.Scene();sc.background=gradBg(['#e8f0f8','#c8d4e0']);
  room(sc,{w:10,d:9,h:3.6,wall:plainNoise('#d8e2ea',3,1,'#3a4a5a',0.05),floor:tiles2('#c8ccd4','#b4b8c0',8,8)});extendFront(sc,10,5,tiles2('#c8ccd4','#b4b8c0',8,5),plainNoise('#d8e2ea',2,1,'#3a4a5a',0.05));
  const counter=box(2.6,0.9,0.8,M('#2a8ae8'),0.8,0.45,-2.6,sc);box(2.6,0.05,0.8,M('#1c1c22'),0.8,0.92,-2.6,sc);const reg=new THREE.Group();reg.position.set(1.6,0.95,-2.75);sc.add(reg);box(0.5,0.3,0.4,M('#3a3e48'),0,0.15,0,reg);
  const scr=new Flat(reg,0.42,0.16,252,96,(g,v)=>{g.fillStyle='#0e1a12';g.fillRect(0,0,252,96);text(v,126,54,52,'#6aff8a',{ol:false});});scr.mesh.position.set(0,0.42,0.0);
  for(let i=0;i<2;i++){const l=box(2.0,0.05,0.25,E('#f4fbff'),-1.5+i*3,3.55,-2.5,sc);l.castShadow=false;const gl=glowSprite('#e8f4ff',2.4,0.32);gl.position.set(-1.5+i*3,3.45,-2.5);sc.add(gl);}
  // receipt that keeps growing out of the register
  const bon=new Flat(sc,0.7,1.6,420,960,(g,st)=>{const n=st[0],stamp=st[1];g.fillStyle='#fbf8f0';g.fillRect(0,0,420,960);g.fillStyle='#1c1410';g.font='900 30px Nunito';g.textAlign='left';
    const L=['KERZEN 0,99','SERVIETTEN 1,49','PFLANZE 2,99','BECHER 0,79','KISSEN 3,99','KERZEN 0,99','VASE 4,99','LAMPE 9,99','KÖRBE 3,99','TÜCHER 2,49','MÖBELHAUS-ESSEN 6,00','RAHMEN 3,49','DECKE 5,99','SCHALE 1,99'];
    for(let i=0;i<Math.min(n,L.length);i++){const y=60+i*60;g.fillStyle='#1c1410';g.fillText(L[i],18,y);if(stamp&&i%2===0||stamp&&i===L.length-1){g.fillStyle='rgba(232,40,58,0.85)';g.fillRect(12,y-30,396,40);g.fillStyle='#ffffff';g.fillText('UNGEPLANT',110,y);}}},{lit:true});
  const bulbShelf=new THREE.Group();bulbShelf.position.set(-2.4,0,-4.2);sc.add(bulbShelf);box(1.6,2.2,0.5,M('#e8e2d6'),0,1.1,0,bulbShelf);[0.6,1.2,1.8].forEach(y=>box(1.5,0.04,0.46,M('#9aa4b2'),0,y,0.02,bulbShelf));
  const lone=new THREE.Group();lone.position.set(-2.4,1.25,-4.0);sc.add(lone);sph(0.09,NO(new THREE.MeshToonMaterial({color:'#fff8d0',gradientMap:gm,transparent:true,opacity:0.85})),0,0.1,0,lone);cyl(0.045,0.045,0.07,M('#9aa0aa'),0,0.0,0,lone,12);
  const spot=spotOn(sc,[-2.4,3.4,-2.8],[-2.4,1.2,-4.0],'#fff0c0',0,0.22,0.5);const bt=priceTag(sc,0.5,0.3,'3,00 €','GLÜHBIRNE');bt.mesh.position.set(-2.4,0.95,-3.94);bt.update(0,1);
  const fr=new Toon2D(sc,0.25,-1.75,{},FS,{kind:'fritz'});
  const t={kasse:WT('Kasse','kasse'),zwei:WT('zwei','kasse'),uebrig:WT('übrig','kasse'),die:WT('Glühbirne','kasse'),verg:WT('Vergessen','kasse'),damit:WT('Damit','kasse'),laut:WT('Laut','kasse'),haelfte:WT('Hälfte','kasse'),geplant:WT('geplant','kasse')};
  fr.plan([{type:'g',g:'pay',t:0.3},{type:'g',g:'shrug',t:t.verg+0.1}]);
  lightsBasic(sc,{hemi:['#eef6ff','#6a7078',0.85],sun:{c:'#f4faff',i:0.55,p:[5,8,5],t:[0,0,-3],r:10}});
  return {sc,anchors:{fr},grade:{mul:'#e0ecf8',a:0.07,vig:0.22,vigCol:'#10182a'},
    shots:[[0,0,['fr:top','fr:feet',[1.6,1.4,-2.75]],30,6,0],[t.zwei-0.3,0,['fr:chest','fr:knee'],6,2,0.75],[t.die-0.3,0,[[-2.4,1.5,-4.0],[-2.4,0.8,-4.0]],-6,4,0.8],
      [t.verg-0.25,0,['fr:top','fr:chest'],12,2,0.95],[t.laut-0.3,0,[[2.0,2.75,-2.55],[2.0,1.15,-2.55]],-12,4,0],[t.haelfte-0.3,0,[[2.0,2.4,-2.55],[2.0,1.5,-2.55]],8,2,0.95]],
    update(lt){fr.update(lt,{f:faceAt(lt,[[0,'happy'],[t.zwei,'worried'],[t.verg-0.1,'shock'],[t.damit,'sad']],2),...fritzState('kasse',lt)});
      scr.update('48,00 €',1);const n=Math.min(14,4+Math.floor(lt*2.2));const stamp=lt>t.haelfte-0.1;bon.update([n,stamp],n*10+(stamp?1:0));
      bon.mesh.position.set(2.0,1.95,-2.55);
      spot.intensity=lt>t.die-0.2?2.4:0;lone.rotation.y=lt*0.8;}};}};

// ---------- 7 GROSCHEN interrupts ----------
DEF.groschen={build(){const sc=new THREE.Scene();sc.background=gradBg(['#e8f0f8','#c8d4e0']);room(sc,{w:10,d:9,h:3.6,wall:plainNoise('#d8e2ea',3,1,'#3a4a5a',0.05),floor:tiles2('#c8ccd4','#b4b8c0',8,8)});
  box(2.6,0.9,0.8,M('#2a8ae8'),0.8,0.45,-2.6,sc);const gro=new Toon2D(sc,-0.6,-1.4,{},1.0,{kind:'coin'});
  const t={moment:WT('Moment','groschen'),wer:WT('Wer','groschen')};gro.plan([{type:'walk',t:0,dur:0.45,from:[-1.8,-1.0],to:[-0.6,-1.4]},{type:'g',g:'point',t:t.moment-0.1},{type:'g',g:'shrug',t:t.wer}]);
  lightsBasic(sc,{hemi:['#eef6ff','#6a7078',0.85],sun:{c:'#f4faff',i:0.55,p:[5,8,5],t:[0,0,-3],r:10}});
  return {sc,anchors:{gro},grade:{mul:'#e0ecf8',a:0.07,vig:0.22,vigCol:'#10182a'},shots:[[0,0,['gro:top','gro:chest'],-8,4,0.95,{follow:'gro'}],[t.wer-0.3,0,['gro:top','gro:feet'],12,6,0]],
    update(lt){gro.update(lt,{f:faceAt(lt,[[0,'raised'],[t.wer,'sideeye']],2),talk:talkAt('groschen',lt)});}};}};

// ---------- 8 LABYRINTH: the Gruen effect ----------
DEF.labyrinth={build(){const sc=new THREE.Scene();showroom(sc);const dashes=routeLine(sc);const fr=new Toon2D(sc,-3.0,-1.3,{},FS,{kind:'fritz'});
  const neon=new Flat(sc,3.0,0.68,1200,270,(g,n)=>{const s='GRUEN-EFFEKT';g.font='900 150px Nunito, sans-serif';g.textAlign='left';g.textBaseline='middle';let x=600-g.measureText(s).width/2;
    for(let i=0;i<s.length;i++){const on=i<n;g.lineWidth=18;g.strokeStyle=on?'#5a0a3a':'#3a2a2a';g.strokeText(s[i],x,140);g.fillStyle=on?'#ff6ad5':'#6a5a5a';g.fillText(s[i],x,140);x+=g.measureText(s[i]).width;}});neon.mesh.position.set(0,3.0,-0.2);box(3.3,0.95,0.06,M('#241420'),0,3.0,-0.27,sc);
  const nL=new THREE.PointLight('#ff6ad5',0,6,2);nL.position.set(0,2.8,0.6);sc.add(nL);const nG=glowSprite('#ff6ad5',4.5,0);nG.position.set(0,3.0,-0.2);sc.add(nG);
  const t={dafuer:WT('Dafür','labyrinth'),namen:WT('Namen','labyrinth'),effekt:WT('Gruen-Effekt','labyrinth'),du:WT('Du','labyrinth'),irrst:WT('irrst','labyrinth'),bis:WT('bis','labyrinth'),verg:WT('vergisst','labyrinth'),wollt:WT('wolltest','labyrinth')};
  const loop=[];for(let k=0;k<3;k++)loop.push({type:'walk',t:t.du-0.3+k*0.9,dur:0.9,from:[[-4.4,-0.6],[-2.4,-2.2],[-4.0,-2.6]][k],to:[[-2.4,-2.2],[-4.0,-2.6],[-4.4,-0.6]][k]});
  fr.plan([...loop,{type:'walk',t:t.verg-0.3,dur:1.2,from:[-3.6,-0.4],to:[-2.6,-1.0]}]);
  const bub=bubble(sc,0.9,(g,lt)=>{g.globalAlpha=Math.max(0,1-lt);bulbIcon(g,200,130,1.2);g.globalAlpha=1;g.strokeStyle='#e8283a';g.lineWidth=14;if(lt>0.6){g.beginPath();g.moveTo(130,60);g.lineTo(270,200);g.stroke();}text('?',320,90,90,'#1c1410',{ol:false});});
  return {sc,anchors:{fr},grade:{mul:'#ffe0e8',a:0.06,vig:0.24,vigCol:'#3a1030'},
    shots:[[0,0,[[-1.55,3.4,-0.3],[1.55,2.6,-0.3]],0,2,0],[t.du-0.3,0,[[-6.2,0,-4.2],[0.2,0,-4.2],[-3,0,2]],-6,78,0,{orbit:14,free:true}],[t.verg-0.3,0,['fr:top','fr:chest',[-2.0,2.6,-1.0]],-12,4,0]],
    update(lt){const n=Math.floor(clamp((lt-t.namen+0.2)/0.9)*12);neon.update(n,n);nL.intensity=n>0?1.6:0;nG.material.opacity=n>0?0.45+0.1*Math.sin(lt*30):0;
      fr.update(lt,{f:faceAt(lt,[[0,'neutral'],[t.du,'eyeroll'],[t.verg,'worried']],2),...fritzState('labyrinth',lt)});dashes.forEach((d,i)=>d.visible=true);
      const tp=fr.anchor('top');bub.mesh.position.set(tp.x+0.6,tp.y+0.35,tp.z);popS(bub.mesh,lt,t.verg-0.2,1);const u=clamp((lt-t.verg)/1.2);bub.update(u,Math.floor(u*20));}};}};

// ---------- 9 RUECKBLENDE (sepia, 1956): an architect from Vienna ----------
function drafting(sc,dark){sc.background=gradBg(dark?['#2a1a10','#120a06']:['#5a3a20','#2a1a10']);
  const top=box(5,0.12,3.2,M('#c89a60'),0,0.9,-1.6,sc);top.rotation.x=0.0;[[-2.3,-0.2],[2.3,-0.2],[-2.3,-3.0],[2.3,-3.0]].forEach(([x,z])=>cyl(0.06,0.06,0.9,M('#5a3a1a'),x,0.45,z,sc,8));
  const paper=mesh(new THREE.PlaneGeometry(3.4,2.4),M('#ffffff',{map:ctex(1024,720,g=>{g.fillStyle='#f2e6c8';g.fillRect(0,0,1024,720);g.strokeStyle='rgba(60,90,140,0.4)';g.lineWidth=2;for(let x=0;x<1024;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,720);g.stroke();}for(let y=0;y<720;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(1024,y);g.stroke();}
    g.strokeStyle='#2a3a5a';g.lineWidth=6;g.fillStyle='rgba(42,58,90,0.15)';g.beginPath();g.moveTo(60,520);[[60,420],[140,420],[140,380],[200,380],[200,440],[270,440],[300,140],[330,440],[400,440],[400,360],[460,360],[460,520]].forEach(([x,y])=>g.lineTo(x,y));g.closePath();g.fill();g.stroke();
    g.font='900 44px Nunito';g.fillStyle='#2a3a5a';g.fillText('WIEN',180,600);g.strokeRect(560,300,400,220);g.beginPath();g.moveTo(560,300);g.quadraticCurveTo(760,200,960,300);g.stroke();g.fillText('MALL 1956',640,600);}).t}),0.3,0.965,-1.4,sc);paper.rotation.x=-Math.PI/2;paper.castShadow=false;
  const lampL=new THREE.PointLight('#ffc070',dark?1.6:2.4,6,2);lampL.position.set(-1.8,2.2,-0.8);sc.add(lampL);const lg=glowSprite('#ffc070',1.4,0.5);lg.position.set(-1.9,2.1,-1.0);sc.add(lg);cyl(0.02,0.02,1.2,M('#2a2a2a'),-2.1,1.55,-1.3,sc,8);cyl(0.1,0.24,0.24,M('#2a5a3a'),-1.9,2.15,-1.0,sc,16);
  const plate=new Flat(sc,1.5,0.36,600,144,()=>{const g=getCtx();g.fillStyle='#c8a050';g.fillRect(0,0,600,144);g.strokeStyle='#5a3a10';g.lineWidth=10;g.strokeRect(5,5,590,134);text('V. GRUEN · ARCHITEKT',300,78,50,'#3a2408',{ol:false});},{lit:true});plate.mesh.position.set(-0.9,1.13,-0.15);plate.mesh.rotation.x=-0.5;plate.update(0,1);
  const pencil=cyl(0.02,0.02,0.8,M('#f2c42a'),1.2,0.99,-0.6,sc,6);pencil.rotation.z=Math.PI/2;pencil.rotation.y=0.6;
  // mall model (1956): snowy base, enclosed box, little cars
  const mall=new THREE.Group();mall.position.set(0.9,0.96,-2.1);sc.add(mall);box(1.6,0.04,1.1,M('#f4f4f8'),0,0.02,0,mall);const body=box(0.9,0.3,0.6,M('#e8d8c0'),0,0.19,0,mall);const roof=box(0.96,0.06,0.66,M('#8a6a4a'),0,0.37,0,mall);
  for(let i=0;i<6;i++)box(0.12,0.06,0.07,M(['#c4281f','#2a6ad8','#3a8a5a'][i%3]),-0.6+i*0.24,0.07,0.42,mall);for(let i=0;i<14;i++)sph(0.03,M('#ffffff'),(rnd(i)-0.5)*1.5,0.05,(rnd(i*3)-0.5)*1.0,mall);
  const flag=new Flat(mall,0.4,0.18,200,90,()=>{const g=getCtx();g.fillStyle='#c4281f';g.fillRect(0,0,200,90);text('1956',100,48,56,'#ffffff',{ol:false});},{bill:true});flag.mesh.position.set(0.3,0.62,0);flag.update(0,1);cyl(0.008,0.008,0.3,M('#2a2a2a'),0.12,0.5,0,mall,4);
  lightsBasic(sc,{hemi:['#ffe0b0','#3a2010',0.75],keep:true});const kd=new THREE.DirectionalLight('#ffe0b0',0.8);kd.position.set(-3,6,3);kd.target.position.set(0.5,0.9,-1.6);kd.castShadow=true;kd.shadow.mapSize.set(2048,2048);Object.assign(kd.shadow.camera,{left:-4,right:4,top:4,bottom:-4});sc.add(kd,kd.target);
  return {mall,roof,body,plate,lampL};}
DEF.rueckblende={build(){const sc=new THREE.Scene();const D=drafting(sc,false);const snow=particlesSprites(sc,60,'#ffffff',0.03,0.9);
  const t={benannt:WT('Benannt','rueckblende'),victor:WT('Victor','rueckblende'),wien:WT('Wien','rueckblende'),er:WT('Er','rueckblende'),amerika:WT('Amerika','rueckblende'),erste:WT('erste','rueckblende'),ueber:WT('überdachte','rueckblende')};
  return {sc,grade:{mul:'#e8c890',a:0.3,vig:0.4,vigCol:'#1a0e04'},
    shots:[[0,0,[[-1.8,1.3,-0.15],[0.0,1.0,-0.15]],-4,24,0],[t.wien-0.35,0,[[-1.4,0.97,-1.0],[-0.2,0.97,-1.9]],0,62,0],[t.er-0.3,0,[[0.1,0.96,-2.1],[1.7,0.96,-2.1],[0.9,1.6,-2.1]],12,22,0,{orbit:10}],[t.ueber-0.3,0,[[0.45,1.0,-2.1],[1.35,1.35,-2.1]],-8,14,0.55]],
    update(lt){snow.forEach((s,i)=>{const u=((lt*0.25+rnd(i))%1);s.position.set(0.9+(rnd(i*3)-0.5)*1.6,0.96+1.0-u*1.0,-2.1+(rnd(i*7)-0.5)*1.1);s.visible=lt>t.er-0.4;});D.roof.position.y=0.37+(lt>t.ueber?Math.sin(clamp((lt-t.ueber)/0.6)*Math.PI)*0.15:0);}};}};

// ---------- 10 UNTERHALT: he disowned his own creation ----------
DEF.unterhalt={build(){const sc=new THREE.Scene();const D=drafting(sc,true);
  const bill=new Flat(sc,0.9,1.15,360,460,(g,st)=>{g.fillStyle='#fbf8ef';g.fillRect(0,0,360,460);g.fillStyle='#1c1410';g.font='900 40px Nunito';g.textAlign='center';g.fillText('UNTERHALT',180,70);g.fillRect(30,90,300,5);g.font='900 22px Nunito';
    ['FÜR: EINKAUFSZENTREN','BETRAG: LEBENSLANG','ZAHLBAR SOFORT'].forEach((l,i)=>g.fillText(l,180,150+i*48));if(st){g.save();g.translate(180,330);g.rotate(-0.25);g.strokeStyle='#e8283a';g.lineWidth=12;g.strokeRect(-150,-50,300,100);g.fillStyle='#e8283a';g.font='900 54px Nunito';g.fillText('ABGELEHNT',0,20);g.restore();}},{lit:true});
  bill.mesh.rotation.x=-Math.PI/2;bill.mesh.position.set(-0.6,0.975,-1.2);
  const stamp=new THREE.Group();sc.add(stamp);cyl(0.14,0.14,0.08,M('#c4281f'),0,0,0,stamp,18);cyl(0.04,0.05,0.3,M('#5a3a1a'),0,0.19,0,stamp,10);sph(0.08,M('#5a3a1a'),0,0.38,0,stamp);
  const gro=new Toon2D(sc,1.9,-0.6,{},0.7,{kind:'coin'});
  const t={und:WT('Und','unterhalt'),spaeter:WT('später','unterhalt'),hat:WT('Hat','unterhalt'),verachtet:WT('verachtet','unterhalt'),fuer:WT('Für','unterhalt'),kinder:WT('Kinder','unterhalt'),keinen:WT('keinen','unterhalt'),unterhalt:WT('Unterhalt','unterhalt')};
  gro.plan([{type:'g',g:'shrug',t:t.verachtet},{type:'g',g:'monocle',t:t.keinen-0.3}]);
  return {sc,anchors:{gro},shakes:[t.keinen+0.05],grade:{mul:'#e0b880',a:0.32,vig:0.48,vigCol:'#0a0402'},
    shots:[[0,0,[[0.3,0.96,-2.1],[1.5,1.6,-2.1],'gro:top'],10,16,0],[t.hat-0.3,0,[[0.45,0.96,-2.1],[1.35,1.35,-2.1]],-14,18,0.6],[t.fuer-0.3,0,[[-1.05,0.98,-0.65],[-0.15,0.98,-1.75]],0,70,0],[t.keinen-0.3,0,[[-0.6,0.98,-1.75],[-0.6,0.98,-0.65],[-0.55,1.6,-1.0]],10,40,0]],
    update(lt){const cr=clamp((lt-t.verachtet+0.2)/0.5);D.body.scale.set(1-cr*0.25,1-cr*0.6,1);D.body.rotation.z=cr*0.12;D.roof.rotation.z=cr*0.5;D.roof.position.y=0.37-cr*0.18;D.lampL.intensity=1.6-cr*0.4;
      const s=lt>t.keinen;bill.update(s,s?1:0);const u=clamp((lt-t.keinen+0.35)/0.35),up=clamp((lt-t.keinen-0.15)/0.4);stamp.position.set(-0.55,0.99+(1-u)*0.6+up*0.5,-1.0);stamp.visible=lt>t.keinen-0.4&&up<1;
      gro.update(lt,{f:faceAt(lt,[[0,'raised'],[t.verachtet,'shock'],[t.unterhalt,'smirk']],2),talk:0});}};}};
