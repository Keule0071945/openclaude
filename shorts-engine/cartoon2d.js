// cartoon2d.js — drawn 2D cartoon characters (thick outline, flat fill + one shade step) on a 2D skeleton.
// Units: character is ~1000 px tall, feet at y=0, x=0 centre. drawRig2D(g, spec, pose) draws one frame.
(function(){
const OUT='#1c1410', LW=9;
const GRAIN=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const d=x.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const v=120+Math.random()*135;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);x.globalAlpha=0.35;x.strokeStyle='#000';for(let i=0;i<40;i++){x.beginPath();const y=Math.random()*128;x.moveTo(0,y);x.lineTo(128,y+Math.random()*6-3);x.stroke();}return c;})();let GP=null;
function hex(c){c=c.replace('#','');return [0,2,4].map(i=>parseInt(c.substr(i,2),16));}
function mixc(a,b,k){const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('');}
const shade=(c,k=0.22)=>mixc(c,'#2a1a3a',k), light=(c,k=0.25)=>mixc(c,'#ffffff',k);
// fill a path, add one flat shadow step (clipped), outline it
function paint(g,path,col,{shadow=true,sx=-1,lw=LW,shadeK=0.22,shW=0.38,grain=0.09}={}){g.save();g.fillStyle=col;g.fill(path);
  if(grain){if(!GP)GP=g.createPattern(GRAIN,'repeat');g.save();g.clip(path);g.globalCompositeOperation='multiply';g.globalAlpha=grain;g.fillStyle=GP;g.fill(path);g.restore();}
  if(shadow){g.save();g.clip(path);g.fillStyle=shade(col,shadeK);g.beginPath();const b=path._b||[-400,-1200,800,1400];const off=(0.38-shW)*b[2];
    if(sx<0){g.ellipse(b[0]+b[2]*0.15-off,b[1]+b[3]*0.55,b[2]*shW,b[3]*0.78,0,0,7);}else{g.ellipse(b[0]+b[2]*0.85+off,b[1]+b[3]*0.55,b[2]*shW,b[3]*0.78,0,0,7);}g.fill();g.restore();}
  g.lineWidth=lw;g.strokeStyle=OUT;g.lineJoin='round';g.lineCap='round';g.stroke(path);g.restore();}
function P(b){const p=new Path2D();p._b=b;return p;}
// ---- limbs: tapered capsule from (0,0) to (0,len) ----
function limb(len,w0,w1){const p=P([-Math.max(w0,w1),-w0,2*Math.max(w0,w1),len+w0+w1]);p.moveTo(-w0,0);p.quadraticCurveTo(-w0*1.08,len*0.5,-w1,len);p.arc(0,len,w1,Math.PI,0,true);p.quadraticCurveTo(w0*1.08,len*0.5,w0,0);p.arc(0,0,w0,0,Math.PI,true);p.closePath();return p;}
function hand(g,skin,open,side){g.save();const p=P([-34,-10,68,80]);
  if(open){p.moveTo(-26,0);p.lineTo(-30,46);p.quadraticCurveTo(-30,70,-14,72);p.lineTo(18,72);p.quadraticCurveTo(32,70,30,48);p.lineTo(26,0);p.closePath();}
  else{p.moveTo(-26,0);p.quadraticCurveTo(-36,40,-20,60);p.quadraticCurveTo(0,72,20,60);p.quadraticCurveTo(36,40,26,0);p.closePath();}
  paint(g,p,skin,{shadow:false,lw:7});
  // thumb
  const t=P([0,0,1,1]);t.moveTo(side*22,8);t.quadraticCurveTo(side*46,18,side*40,40);t.quadraticCurveTo(side*30,44,side*22,30);paint(g,t,skin,{shadow:false,lw:7});
  if(open){g.strokeStyle=OUT;g.lineWidth=5;[-10,6].forEach(x=>{g.beginPath();g.moveTo(x,46);g.lineTo(x,68);g.stroke();});}
  g.restore();}
// ---- face ----
function face(g,spec,F,turn){const f=F.face||'neutral',eye=F.eye===undefined?1:F.eye;const tx=turn*26;const look=(f==='sideeye'?1.6:(F.look||0))*7+turn*4;const lookY=f==='eyeroll'?-12:0;
  const eyeY=-6,ex=46;const brow=spec.browC||mixc(spec.hair?.color||'#3a2416','#000000',0.25);
  [-1,1].forEach(sd=>{const x=sd*ex+tx+(sd*turn>0?-sd*6*Math.abs(turn):0);const sz=1-(sd*turn<0?0.12*Math.abs(turn):0);
    const closed=f==='laugh'||(f==='wink'&&sd<0)||eye<0.2;
    if(closed){g.beginPath();g.moveTo(x-22,eyeY+3);g.quadraticCurveTo(x,eyeY+(f==='laugh'?-14:10),x+22,eyeY+3);g.lineWidth=7;g.strokeStyle=OUT;g.stroke();}
    else{const open=eye*(f==='shock'?1.3:(f==='smug'||f==='sideeye'||f==='smirk')?0.62:f==='tired'?0.5:1);const rx=21*sz,ry=(24*open+3)*sz;
      g.beginPath();g.ellipse(x,eyeY,rx,ry,0,0,7);g.fillStyle='#fffaf2';g.fill();g.lineWidth=6;g.strokeStyle=OUT;g.stroke();
      g.save();g.beginPath();g.ellipse(x,eyeY,rx,ry,0,0,7);g.clip();g.beginPath();g.arc(x+look,eyeY+3+lookY,11*sz,0,7);g.fillStyle=spec.iris||'#3a2a1a';g.fill();
      g.beginPath();g.arc(x+look+4,eyeY-2,4,0,7);g.fillStyle='#fff';g.fill();if(f==='tired'||f==='smug'){g.fillStyle=spec.skin;g.fillRect(x-rx-2,eyeY-ry-2,2*rx+4,ry*0.9);g.beginPath();g.moveTo(x-rx,eyeY-ry*0.1);g.lineTo(x+rx,eyeY-ry*0.1);g.lineWidth=6;g.stroke();}g.restore();}
    // brows: thick, shape per expression
    const by=-46;g.beginPath();g.lineWidth=11;g.strokeStyle=brow;g.lineCap='round';
    const a={neutral:[0,-6,0],happy:[2,-10,2],laugh:[4,-12,4],shock:[-10,-20,-10],worried:[sd*-1*8+4,-6,sd*8+4],stern:[sd*10-6,0,-sd*10-6],smug:[sd>0?-6:2,sd>0?-14:-2,sd>0?-2:2],wink:[2,-8,2],tired:[4,0,6],sad:[sd*-8,-4,sd*8],raised:sd>0?[-14,-26,-10]:[2,-4,4],eyeroll:[-4,-12,-4],sideeye:[sd*6,-2,-sd*2],smirk:[sd>0?-8:2,sd>0?-14:-4,sd>0?-4:2]}[f]||[0,-6,0];
    g.moveTo(x-24,by+a[0]);g.quadraticCurveTo(x,by+a[1],x+24,by+a[2]);g.stroke();});
  // nose
  g.beginPath();g.moveTo(tx+turn*14-4,26);g.quadraticCurveTo(tx+turn*30+14,46,tx+turn*16-2,52);g.lineWidth=6;g.strokeStyle=OUT;g.stroke();
  // mouth
  const mx=tx+turn*6,my=86;g.lineWidth=7;g.strokeStyle=OUT;g.beginPath();
  if(f==='happy'||f==='laugh'){const h=f==='laugh'?40:30;g.moveTo(mx-34,my-6);g.quadraticCurveTo(mx,my+h,mx+34,my-6);g.quadraticCurveTo(mx,my+4,mx-34,my-6);g.closePath();g.fillStyle='#6a2018';g.fill();g.stroke();
    g.save();g.clip();g.fillStyle='#f6f0e4';g.fillRect(mx-36,my-10,72,14);g.fillStyle='#e0605a';g.beginPath();g.ellipse(mx,my+h*0.7,16,9,0,0,7);g.fill();g.restore();}
  else if(f==='shock'){g.ellipse(mx,my+8,15,20,0,0,7);g.fillStyle='#4a1a12';g.fill();g.stroke();}
  else if(F.talk>0.08&&f!=='laugh'&&f!=='happy'){g.ellipse(mx,my+6,22,4+F.talk*20,0,0,7);g.fillStyle='#5a1a14';g.fill();g.stroke();}
  else if(f==='smug'||f==='wink'||f==='smirk'||f==='raised'){g.moveTo(mx-26,my+4);g.quadraticCurveTo(mx+8,my+12,mx+30,my-8);g.stroke();}
  else if(f==='worried'||f==='sad'){g.moveTo(mx-24,my+10);g.quadraticCurveTo(mx,my-6,mx+24,my+10);g.stroke();}
  else if(f==='stern'){g.moveTo(mx-22,my+4);g.lineTo(mx+22,my+4);g.stroke();}
  else if(F.talk){const o=F.talk;g.ellipse(mx,my+4,20,4+o*16,0,0,7);g.fillStyle='#5a1a14';g.fill();g.stroke();}
  else{g.moveTo(mx-20,my);g.quadraticCurveTo(mx,my+10,mx+20,my);g.stroke();}
  if(spec.mustache){g.beginPath();g.moveTo(mx,my-18);g.bezierCurveTo(mx-20,my-30,mx-50,my-14,mx-58,my-26);g.bezierCurveTo(mx-50,my-2,mx-20,my-6,mx,my-10);g.bezierCurveTo(mx+20,my-6,mx+50,my-2,mx+58,my-26);g.bezierCurveTo(mx+50,my-14,mx+20,my-30,mx,my-18);g.fillStyle=spec.hair?.color||'#3a2416';g.fill();g.lineWidth=5;g.stroke();}
  if(spec.glasses){g.lineWidth=6;g.strokeStyle=OUT;[-1,1].forEach(sd=>{g.beginPath();g.arc(sd*ex+tx,eyeY,34,0,7);g.stroke();});g.beginPath();g.moveTo(-12+tx,eyeY-4);g.quadraticCurveTo(tx,eyeY-12,12+tx,eyeY-4);g.stroke();}
  if(F.sweat){g.beginPath();g.moveTo(120,-60);g.bezierCurveTo(134,-34,130,-20,120,-20);g.bezierCurveTo(110,-20,106,-34,120,-60);g.fillStyle='#9fdcff';g.fill();g.lineWidth=5;g.stroke();}}
function head(g,spec,F,turn){const skin=spec.skin;
  // back hair
  const H=spec.hair||{style:'short',color:'#3a2416'};
  if(H.style==='long'||H.style==='bun'){const b=P([-150,-160,300,300]);b.moveTo(-138,-40);b.quadraticCurveTo(-160,120,-110,150);b.lineTo(110,150);b.quadraticCurveTo(160,120,138,-40);b.closePath();if(H.style==='long')paint(g,b,H.color,{sx:1});}
  if(H.style==='bun'){const bn=P([-60,-260,120,110]);bn.arc(0,-205,52,0,7);paint(g,bn,H.color);}
  // ears
  [-1,1].forEach(sd=>{if(sd*turn>0.6)return;const e=P([0,0,1,1]);e.ellipse(sd*(122-Math.abs(turn)*10)+turn*20,10,24,32,0,0,7);paint(g,e,skin,{shadow:false,lw:7});});
  // head shape: soft rounded rectangle, jaw a bit narrower
  const h=P([-128,-150,256,290]);h.moveTo(-118+turn*8,-60);h.quadraticCurveTo(-124,-150,0+turn*10,-150);h.quadraticCurveTo(124,-150,118+turn*8,-60);h.quadraticCurveTo(124,90,60+turn*14,128);h.quadraticCurveTo(0+turn*14,150,-60+turn*14,128);h.quadraticCurveTo(-124,90,-118+turn*8,-60);h.closePath();
  paint(g,h,skin,{sx:turn>0?-1:1,shadeK:0.14,shW:0.2});
  if(spec.beard){const bd=P([-120,40,240,140]);bd.moveTo(-112,10);bd.quadraticCurveTo(-110,120,-50,140);bd.quadraticCurveTo(0+turn*14,160,50,140);bd.quadraticCurveTo(110,120,112,10);bd.quadraticCurveTo(70,70,0,72);bd.quadraticCurveTo(-70,70,-112,10);bd.closePath();paint(g,bd,spec.beardC||H.color,{shadow:false,lw:7});}
  // cheeks (subtle, adult)
  g.fillStyle='rgba(220,110,90,0.18)';[-1,1].forEach(sd=>{g.beginPath();g.ellipse(sd*70+turn*20,44,20,12,0,0,7);g.fill();});
  face(g,spec,F,turn);
  // front hair
  const hc=H.color;const fr=P([-140,-180,280,150]);
  if(H.style==='short'){fr.moveTo(-124,-40);fr.quadraticCurveTo(-140,-170,0,-178);fr.quadraticCurveTo(140,-170,124,-40);fr.quadraticCurveTo(100,-100,40+turn*20,-98);fr.quadraticCurveTo(-20,-90,-60,-118);fr.quadraticCurveTo(-90,-80,-124,-40);fr.closePath();}
  else if(H.style==='side'){fr.moveTo(-126,-30);fr.quadraticCurveTo(-140,-175,10,-180);fr.quadraticCurveTo(140,-170,126,-50);fr.quadraticCurveTo(80,-130,-30,-108);fr.quadraticCurveTo(-90,-95,-126,-30);fr.closePath();}
  else if(H.style==='curly'){for(let i=0;i<9;i++){const a=Math.PI*(1.05+i*0.11);fr.moveTo(Math.cos(a)*120+46,Math.sin(a)*150-20);fr.arc(Math.cos(a)*120,Math.sin(a)*150-20,46,0,7);}}
  else if(H.style==='bald'){fr.moveTo(-124,-10);fr.quadraticCurveTo(-130,-50,-112,-60);fr.lineTo(-104,10);fr.closePath();fr.moveTo(124,-10);fr.quadraticCurveTo(130,-50,112,-60);fr.lineTo(104,10);fr.closePath();}
  else if(H.style==='long'||H.style==='bun'){fr.moveTo(-130,-20);fr.quadraticCurveTo(-140,-175,0,-178);fr.quadraticCurveTo(140,-175,130,-20);fr.quadraticCurveTo(110,-110,0+turn*20,-118);fr.quadraticCurveTo(-110,-110,-130,-20);fr.closePath();}
  paint(g,fr,hc,{sx:1,shadeK:0.25});
  if(spec.hat==='cap'){const c=P([-140,-230,300,120]);c.moveTo(-126,-90);c.quadraticCurveTo(-120,-220,0,-222);c.quadraticCurveTo(120,-220,126,-90);c.closePath();paint(g,c,spec.hatC||'#3a5a8a');const br=P([0,0,1,1]);br.moveTo(-20+turn*60,-96);br.quadraticCurveTo(110+turn*60,-120,180+turn*60,-86);br.quadraticCurveTo(100+turn*60,-70,-20+turn*60,-80);br.closePath();paint(g,br,shade(spec.hatC||'#3a5a8a',0.2),{shadow:false});}
  if(spec.hat==='hat'){const brm=P([0,0,1,1]);brm.ellipse(0,-120,190,34,0,0,7);paint(g,brm,spec.hatC||'#2a2a30',{shadow:false});const cr=P([-110,-260,220,150]);cr.moveTo(-100,-122);cr.lineTo(-90,-250);cr.quadraticCurveTo(0,-270,90,-250);cr.lineTo(100,-122);cr.closePath();paint(g,cr,spec.hatC||'#2a2a30');g.fillStyle=spec.hatBand||'#c4281f';g.fillRect(-98,-160,196,26);g.strokeStyle=OUT;g.lineWidth=6;g.strokeRect(-98,-160,196,26);}
}
// ---- torso per outfit ----
function torso(g,spec,turn){const T=spec.top||{type:'shirt',color:'#4a7ab8'};const w=spec.body==='round'?150:spec.body==='slim'?108:126;const c=T.color;
  const t=P([-w,-10,2*w,330]);t.moveTo(-w*0.62,0);t.quadraticCurveTo(-w*1.02,20,-w,110);t.quadraticCurveTo(-w*1.04*(spec.body==='round'?1.12:1),230,-w*0.9,320);t.lineTo(w*0.9,320);t.quadraticCurveTo(w*1.04*(spec.body==='round'?1.12:1),230,w,110);t.quadraticCurveTo(w*1.02,20,w*0.62,0);t.quadraticCurveTo(0,-14,-w*0.62,0);t.closePath();
  paint(g,t,c,{sx:turn>0?-1:1});
  g.save();g.clip(t);g.lineWidth=7;g.strokeStyle=OUT;
  if(T.type==='jacket'){const sh=T.shirt||'#f2efe6';g.fillStyle=sh;g.beginPath();g.moveTo(-40+turn*30,-6);g.lineTo(0+turn*30,150);g.lineTo(40+turn*30,-6);g.closePath();g.fill();g.stroke();
    if(T.tie){g.fillStyle=T.tie;g.beginPath();g.moveTo(-12+turn*30,10);g.lineTo(12+turn*30,10);g.lineTo(18+turn*30,120);g.lineTo(turn*30,146);g.lineTo(-18+turn*30,120);g.closePath();g.fill();g.stroke();}
    g.beginPath();g.moveTo(-40+turn*30,-6);g.lineTo(-70+turn*30,90);g.lineTo(0+turn*30,170);g.moveTo(40+turn*30,-6);g.lineTo(70+turn*30,90);g.lineTo(0+turn*30,170);g.stroke();
    [200,250].forEach(y=>{g.beginPath();g.arc(12+turn*30,y,7,0,7);g.fillStyle=OUT;g.fill();});}
  else if(T.type==='hoodie'){g.beginPath();g.moveTo(-60,8);g.quadraticCurveTo(0,60,60,8);g.stroke();g.beginPath();g.moveTo(-14,40);g.lineTo(-18,110);g.moveTo(14,40);g.lineTo(18,110);g.stroke();g.beginPath();g.roundRect(-70,190,140,70,20);g.stroke();}
  else if(T.type==='apron'){g.fillStyle=T.apron||'#f6f2ea';g.beginPath();g.moveTo(-70,70);g.lineTo(70,70);g.lineTo(90,330);g.lineTo(-90,330);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(-70,70);g.lineTo(-50,-4);g.moveTo(70,70);g.lineTo(50,-4);g.stroke();}
  else if(T.type==='dress'){g.beginPath();g.moveTo(-w,200);g.quadraticCurveTo(0,220,w,200);g.stroke();}
  else{g.beginPath();g.moveTo(-36+turn*30,-4);g.lineTo(turn*30,40);g.lineTo(36+turn*30,-4);g.stroke();[70,130,190].forEach(y=>{g.beginPath();g.arc(turn*30,y,6,0,7);g.fillStyle=OUT;g.fill();});}
  if(T.belt!==false&&T.type!=='dress'&&T.type!=='apron'){g.fillStyle='#3a2416';g.fillRect(-w,276,2*w,26);g.strokeRect(-w,276,2*w,26);g.fillStyle='#d8b04a';g.fillRect(-16+turn*30,272,32,34);g.strokeRect(-16+turn*30,272,32,34);}
  g.restore();}
// ---- full rig ----
// pose: {lean, headTilt, turn(-1..1), arms:{L:{sh,el},R:{sh,el}}, legs:{L:{hip,knee},R:{hip,knee}}, handOpen:{L,R}, bob}
function drawRig2D(g,spec,pose,F){const S=spec.scale||1;g.save();g.scale(S,S);const turn=pose.turn||0;
  const top=spec.top||{};const legC=spec.pants||'#3a3a48',shoeC=spec.shoes||'#2a1c14',sleeveC=top.sleeve||top.color||'#4a7ab8',skin=spec.skin;
  const hipY=-470+(pose.bob||0),shY=-760+(pose.bob||0);
  const legs=pose.legs||{L:{hip:0,knee:0},R:{hip:0,knee:0}},arms=pose.arms||{L:{sh:0.12,el:0.15},R:{sh:-0.12,el:-0.15}};
  const drawLeg=(sd,L)=>{g.save();g.translate(sd*48,hipY);g.rotate(L.hip);if(top.type==='dress'&&!spec.legsVisible){g.restore();return;}
    paint(g,limb(230,46,40),legC,{sx:sd});g.translate(0,230);g.rotate(L.knee);paint(g,limb(220,40,34),legC,{sx:sd});g.translate(0,224);
    const sh=P([0,0,1,1]);sh.moveTo(-36,-14);sh.quadraticCurveTo(-40,30,-20,32);sh.lineTo(70*(pose.face||1),32);sh.quadraticCurveTo(84,30,70,6);sh.quadraticCurveTo(40,-10,30,-14);sh.closePath();paint(g,sh,shoeC,{shadow:false});g.restore();};
  const drawArm=(sd,A,open)=>{g.save();g.translate(sd*116,shY+24);g.rotate(A.sh);paint(g,limb(200,36,30),sleeveC,{sx:sd});g.translate(0,200);g.rotate(A.el);
    paint(g,limb(176,30,26),top.rolled?skin:sleeveC,{sx:sd});g.translate(0,176);if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);hand(g,skin,open,sd);g.restore();};
  // back limbs first (the side turned away), torso, then front limbs
  const back=turn>=0?-1:1;
  drawArm(back,back<0?arms.L:arms.R,(pose.handOpen||{})[back<0?'L':'R']);
  drawLeg(back,back<0?legs.L:legs.R);drawLeg(-back,back<0?legs.R:legs.L);
  if(top.type==='dress'){const d=P([-170,-480,340,420]);d.moveTo(-110,hipY-140);d.quadraticCurveTo(-170,hipY+200,-150,hipY+300);d.lineTo(150,hipY+300);d.quadraticCurveTo(170,hipY+200,110,hipY-140);d.closePath();paint(g,d,top.color);}
  g.save();g.translate(0,shY);g.rotate(pose.lean||0);torso(g,spec,turn);
  // neck + head
  const nk=P([-36,-60,72,70]);nk.moveTo(-34,-50);nk.lineTo(-30,6);nk.lineTo(30,6);nk.lineTo(34,-50);nk.closePath();paint(g,nk,skin,{shadow:false,lw:7});
  g.save();g.translate(turn*10,-178);g.rotate(pose.headTilt||0);head(g,spec,F,turn);g.restore();
  g.restore();
  drawArm(-back,back<0?arms.R:arms.L,(pose.handOpen||{})[back<0?'R':'L']);
  g.restore();}
window.cartoon2d={drawRig2D,mixc,shade,light};
})();
