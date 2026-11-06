// narrators.js — distinctive narrator characters on top of cartoon2d.js (species heads, tails, coin body, detail passes)
(function(){
const C=window.cartoon2d,OUT='#1c1410';
const shade=C.shade,light=C.light,mixc=C.mixc;
function P(b){const p=new Path2D();p._b=b;return p;}
let GPn=null;const GR=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const d=x.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const v=130+Math.random()*125;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);return c;})();
function paint(g,path,col,{shadow=true,sx=-1,lw=9,shadeK=0.22,shW=0.3,grain=0.08}={}){g.save();g.fillStyle=col;g.fill(path);
  if(grain){if(!GPn)GPn=g.createPattern(GR,'repeat');g.save();g.clip(path);g.globalCompositeOperation='multiply';g.globalAlpha=grain;g.fillStyle=GPn;g.fill(path);g.restore();}
  if(shadow){g.save();g.clip(path);g.fillStyle=shade(col,shadeK);g.beginPath();const b=path._b;const off=(0.38-shW)*b[2];
    if(sx<0)g.ellipse(b[0]+b[2]*0.15-off,b[1]+b[3]*0.55,b[2]*shW,b[3]*0.8,0,0,7);else g.ellipse(b[0]+b[2]*0.85+off,b[1]+b[3]*0.55,b[2]*shW,b[3]*0.8,0,0,7);g.fill();g.restore();}
  g.lineWidth=lw;g.strokeStyle=OUT;g.lineJoin='round';g.lineCap='round';g.stroke(path);g.restore();}
function hl(g,x,y,rx,ry,a=0.55,rot=0){g.save();g.fillStyle=`rgba(255,255,255,${a})`;g.beginPath();g.ellipse(x,y,rx,ry,rot,0,7);g.fill();g.restore();}
function eyes(g,F,cx,cy,{sx=40,rx=22,ry=26,iris='#2a1a10',lids=null,glow=false}={}){const f=F.face||'neutral',e=F.eye===undefined?1:F.eye,look=(f==='sideeye'?1.6:(F.look||0))*7,lookY=f==='eyeroll'?-rx*0.45:0;
  [-1,1].forEach(sd=>{const x=cx+sd*sx;const closed=f==='laugh'||(f==='wink'&&sd<0)||e<0.2;
    if(closed){g.beginPath();g.moveTo(x-rx,cy+3);g.quadraticCurveTo(x,cy+(f==='laugh'?-14:10),x+rx,cy+3);g.lineWidth=7;g.strokeStyle=OUT;g.stroke();return;}
    const op=e*(f==='shock'?1.25:(f==='smug'||f==='sideeye'||f==='smirk')?0.6:f==='tired'?0.5:1);g.beginPath();g.ellipse(x,cy,rx,ry*op+3,0,0,7);g.fillStyle=glow?'#ffd84a':'#fffaf2';g.fill();g.lineWidth=6;g.strokeStyle=OUT;g.stroke();
    g.save();g.beginPath();g.ellipse(x,cy,rx,ry*op+3,0,0,7);g.clip();g.beginPath();g.arc(x+look,cy+3+lookY,rx*0.55,0,7);g.fillStyle=iris;g.fill();g.beginPath();g.arc(x+look,cy+3+lookY,rx*0.28,0,7);g.fillStyle='#0a0604';g.fill();g.beginPath();g.arc(x+look+5,cy-3,4,0,7);g.fillStyle='#fff';g.fill();
    if(lids){g.fillStyle=lids;g.fillRect(x-rx-2,cy-ry*op-6,2*rx+4,(f==='smug'||f==='tired')?ry*0.9:ry*0.25);}g.restore();});}
function brows(g,F,cx,cy,sx,col,w=11){const f=F.face||'neutral';[-1,1].forEach(sd=>{const x=cx+sd*sx;
  const a={neutral:[0,-6,0],happy:[2,-10,2],laugh:[4,-12,4],shock:[-10,-20,-10],worried:[sd*-8+4,-6,sd*8+4],stern:[sd*10-6,0,-sd*10-6],smug:[sd>0?-6:2,sd>0?-14:-2,sd>0?-2:2],wink:[2,-8,2],tired:[4,0,6],sad:[sd*-8,-4,sd*8],raised:sd>0?[-14,-26,-10]:[2,-4,4],eyeroll:[-4,-12,-4],sideeye:[sd*6,-2,-sd*2],smirk:[sd>0?-8:2,sd>0?-14:-4,sd>0?-4:2]}[f]||[0,-6,0];
  g.beginPath();g.moveTo(x-24,cy+a[0]);g.quadraticCurveTo(x,cy+a[1],x+24,cy+a[2]);g.lineWidth=w;g.strokeStyle=col;g.lineCap='round';g.stroke();});}
function mouth(g,F,mx,my,{w=30}={}){const f=F.face||'neutral';g.lineWidth=7;g.strokeStyle=OUT;g.beginPath();
  if(f==='happy'||f==='laugh'){const h=f==='laugh'?40:28;g.moveTo(mx-w,my-6);g.quadraticCurveTo(mx,my+h,mx+w,my-6);g.quadraticCurveTo(mx,my+4,mx-w,my-6);g.closePath();g.fillStyle='#6a2018';g.fill();g.stroke();
    g.save();g.clip();g.fillStyle='#f6f0e4';g.fillRect(mx-w,my-10,2*w,13);g.fillStyle='#e0605a';g.beginPath();g.ellipse(mx,my+h*0.72,w*0.45,8,0,0,7);g.fill();g.restore();}
  else if(f==='shock'){g.ellipse(mx,my+8,14,19,0,0,7);g.fillStyle='#4a1a12';g.fill();g.stroke();}
  else if(F.talk>0.08&&f!=='laugh'&&f!=='happy'){g.ellipse(mx,my+6,w*0.6,4+F.talk*22,0,0,7);g.fillStyle='#5a1a14';g.fill();g.stroke();}
  else if(f==='smug'||f==='wink'||f==='smirk'||f==='raised'){g.moveTo(mx-w*0.85,my+4);g.quadraticCurveTo(mx+8,my+12,mx+w,my-8);g.stroke();}
  else if(f==='worried'||f==='sad'){g.moveTo(mx-w*0.8,my+10);g.quadraticCurveTo(mx,my-6,mx+w*0.8,my+10);g.stroke();}
  else if(f==='stern'){g.moveTo(mx-w*0.7,my+4);g.lineTo(mx+w*0.7,my+4);g.stroke();}
  else{g.moveTo(mx-w*0.66,my);g.quadraticCurveTo(mx,my+10,mx+w*0.66,my);g.stroke();}}
function limb(len,w0,w1){const p=P([-Math.max(w0,w1),-w0,2*Math.max(w0,w1),len+w0+w1]);p.moveTo(-w0,0);p.quadraticCurveTo(-w0*1.08,len*0.5,-w1,len);p.arc(0,len,w1,Math.PI,0,true);p.quadraticCurveTo(w0*1.08,len*0.5,w0,0);p.arc(0,0,w0,0,Math.PI,true);p.closePath();return p;}
function folds(g,len,n=2,col='rgba(28,20,16,0.45)'){g.save();g.strokeStyle=col;g.lineWidth=4;for(let i=0;i<n;i++){const y=len*(0.35+i*0.25);g.beginPath();g.moveTo(-14,y);g.quadraticCurveTo(0,y+10,12,y-4);g.stroke();}g.restore();}
function glove(g,open,sd,col='#ffffff'){const p=P([-36,-14,72,90]);p.moveTo(-30,-6);p.quadraticCurveTo(-42,46,-20,66);p.quadraticCurveTo(0,80,22,66);p.quadraticCurveTo(42,46,30,-6);p.closePath();paint(g,p,col,{shadow:true,lw:7,shadeK:0.12});
  const t=P([0,0,1,1]);t.moveTo(sd*24,8);t.quadraticCurveTo(sd*52,16,sd*44,42);t.quadraticCurveTo(sd*32,46,sd*24,30);paint(g,t,col,{shadow:false,lw:7});
  g.strokeStyle=OUT;g.lineWidth=4;[-8,8].forEach(x=>{g.beginPath();g.moveTo(x,40);g.lineTo(x,62);g.stroke();});
  const cf=P([-34,-26,68,26]);cf.roundRect(-34,-22,68,22,10);paint(g,cf,col,{shadow:false,lw:7});}
function paw(g,col,sd){const p=P([-30,-10,60,70]);p.moveTo(-26,0);p.quadraticCurveTo(-34,44,-14,58);p.quadraticCurveTo(0,64,14,58);p.quadraticCurveTo(34,44,26,0);p.closePath();paint(g,p,col,{shadow:false,lw:7});
  g.strokeStyle=OUT;g.lineWidth=4;[-8,8].forEach(x=>{g.beginPath();g.moveTo(x,44);g.lineTo(x,58);g.stroke();});}

// ---------- shared body (coat/suit/jacket) with detail passes ----------
function coatBody(g,spec,turn){const w=spec.bodyW||124,L=spec.coatLen||360,c=spec.coat;
  const t=P([-w-30,-10,2*w+60,L+20]);t.moveTo(-w*0.6,0);t.quadraticCurveTo(-w*1.05,18,-w,110);t.lineTo(-w-(spec.flare||24),L);t.lineTo(w+(spec.flare||24),L);t.lineTo(w,110);t.quadraticCurveTo(w*1.05,18,w*0.6,0);t.quadraticCurveTo(0,-14,-w*0.6,0);t.closePath();
  paint(g,t,c,{sx:turn>0?-1:1,shW:0.26});
  g.save();g.clip(t);g.lineWidth=7;g.strokeStyle=OUT;
  if(spec.inner){g.fillStyle=spec.inner;g.beginPath();g.moveTo(-44+turn*30,-6);g.lineTo(turn*30,150);g.lineTo(44+turn*30,-6);g.closePath();g.fill();g.stroke();}
  if(spec.tie){g.fillStyle=spec.tie;g.beginPath();g.moveTo(-12+turn*30,8);g.lineTo(12+turn*30,8);g.lineTo(18+turn*30,118);g.lineTo(turn*30,146);g.lineTo(-18+turn*30,118);g.closePath();g.fill();g.stroke();g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=4;g.beginPath();g.moveTo(-8+turn*30,40);g.lineTo(10+turn*30,60);g.stroke();g.strokeStyle=OUT;g.lineWidth=7;}
  // lapels
  g.fillStyle=shade(c,0.12);[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*44+turn*30,-6);g.lineTo(sd*82+turn*30,96);g.lineTo(sd*28+turn*30,170);g.lineTo(sd*10+turn*30,150);g.closePath();g.fill();g.stroke();});
  if(spec.pinstripe){g.strokeStyle=rgba2(light(c,0.35),0.6);g.lineWidth=3;for(let x=-w-30;x<w+30;x+=22){g.beginPath();g.moveTo(x,0);g.lineTo(x+(x>0?6:-6),L);g.stroke();}g.strokeStyle=OUT;g.lineWidth=7;}
  if(spec.belted){g.fillStyle=shade(c,0.15);g.fillRect(-w-30,250,2*w+60,30);g.strokeRect(-w-30,250,2*w+60,30);g.fillStyle='#c8a050';g.fillRect(-20+turn*30,246,40,38);g.strokeRect(-20+turn*30,246,40,38);}
  if(spec.zip){g.lineWidth=5;g.beginPath();g.moveTo(turn*30,0);g.lineTo(turn*30,L);g.stroke();for(let y=10;y<L;y+=18){g.beginPath();g.moveTo(-6+turn*30,y);g.lineTo(6+turn*30,y);g.stroke();}g.lineWidth=7;}
  // buttons + pocket + seams + fold lines
  if(spec.buttons!==false){[190,240].forEach(y=>{g.beginPath();g.arc(-24+turn*30,y,8,0,7);g.fillStyle='#2a1a10';g.fill();g.beginPath();g.arc(24+turn*30,y,8,0,7);g.fill();});}
  g.lineWidth=5;g.beginPath();g.moveTo(-w+18,220);g.lineTo(-w+70,224);g.stroke();g.beginPath();g.moveTo(w-70,224);g.lineTo(w-18,220);g.stroke();
  g.strokeStyle='rgba(28,20,16,0.4)';g.lineWidth=4;[[-70,120,-60,200],[60,300,72,350],[-80,300,-90,350]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(a,b);g.quadraticCurveTo(a+12,(b+d)/2,c2,d);g.stroke();});
  hl(g,-w*0.45+turn*20,60,18,60,0.18,0.2);
  g.restore();}
function rgba2(c,a){const v=[0,2,4].map(i=>parseInt(c.replace('#','').substr(i,2),16));return `rgba(${v[0]},${v[1]},${v[2]},${a})`;}

// ---------- heads ----------
const HEADS={
 raccoon(g,spec,F,turn){const fur='#8a8a92',dark='#2a2a30',light2='#e8e6e2';
   [-1,1].forEach(sd=>{const e=P([sd*110-50,-210,100,120]);e.moveTo(sd*70,-120);e.lineTo(sd*120+turn*10,-210);e.quadraticCurveTo(sd*150,-130,sd*126,-80);e.closePath();paint(g,e,fur,{shadow:false});const ei=P([0,0,1,1]);ei.moveTo(sd*84,-122);ei.lineTo(sd*116+turn*10,-180);ei.lineTo(sd*118,-104);ei.closePath();g.fillStyle='#4a3a40';g.fill(ei);});
   const h=P([-150,-150,300,290]);h.moveTo(-130,-30);h.quadraticCurveTo(-140,-150,0+turn*10,-150);h.quadraticCurveTo(140,-150,130,-30);h.quadraticCurveTo(160,60,90,110);h.quadraticCurveTo(0+turn*20,160,-90,110);h.quadraticCurveTo(-160,60,-130,-30);h.closePath();paint(g,h,fur,{sx:1,shW:0.22});
   // cheek fluff
   [-1,1].forEach(sd=>{const ch=P([0,0,1,1]);ch.moveTo(sd*120,20);ch.lineTo(sd*168,40);ch.lineTo(sd*136,60);ch.lineTo(sd*160,86);ch.lineTo(sd*100,96);ch.closePath();paint(g,ch,fur,{shadow:false,lw:7});});
   // mask band
   const m=P([0,0,1,1]);m.moveTo(-140,-10);m.quadraticCurveTo(-120,-60,-50,-44);m.quadraticCurveTo(0+turn*20,-30,50,-44);m.quadraticCurveTo(120,-60,140,-10);m.quadraticCurveTo(110,40,50,30);m.quadraticCurveTo(0+turn*20,20,-50,30);m.quadraticCurveTo(-110,40,-140,-10);m.closePath();g.fillStyle=dark;g.fill(m);g.lineWidth=6;g.strokeStyle=OUT;g.stroke(m);
   // white brows + muzzle
   [-1,1].forEach(sd=>{g.fillStyle=light2;g.beginPath();g.ellipse(sd*58+turn*20,-70,40,14,sd*-0.2,0,7);g.fill();});
   const mz=P([-70,10,140,120]);mz.ellipse(0+turn*26,70,72,58,0,0,7);paint(g,mz,light2,{shadow:false,lw:7});
   eyes(g,F,turn*20,-6,{sx:52,rx:20,ry:22,iris:'#5a3a1a',glow:false});brows(g,F,turn*20,-74,52,'#f2f0ec',10);
   const n=P([0,0,1,1]);n.ellipse(turn*32,46,22,15,0,0,7);g.fillStyle='#1a1214';g.fill(n);hl(g,turn*32-6,40,7,4,0.7);
   mouth(g,F,turn*30,90,{w:26});g.strokeStyle='rgba(30,20,20,0.5)';g.lineWidth=3;[-1,1].forEach(sd=>[0,14].forEach(dy=>{g.beginPath();g.moveTo(sd*50+turn*30,62+dy);g.lineTo(sd*110+turn*30,52+dy*1.6);g.stroke();}));},
 pigeon(g,spec,F,turn){const head='#7a8aa8',neck1='#4aa88a',neck2='#8a5ab8';
   const nk=P([-90,40,180,140]);nk.moveTo(-86,60);nk.quadraticCurveTo(-96,150,-70,180);nk.lineTo(70,180);nk.quadraticCurveTo(96,150,86,60);nk.closePath();g.save();const gr=g.createLinearGradient(-90,0,90,0);gr.addColorStop(0,neck1);gr.addColorStop(0.5,neck2);gr.addColorStop(1,neck1);g.fillStyle=gr;g.fill(nk);g.lineWidth=8;g.strokeStyle=OUT;g.stroke(nk);g.restore();
   const h=P([-120,-140,240,240]);h.ellipse(turn*14,-20,118,124,0,0,7);paint(g,h,head,{sx:1,shW:0.22});hl(g,-40+turn*10,-90,40,18,0.3,-0.3);
   eyes(g,F,turn*24,-30,{sx:50,rx:22,ry:24,iris:'#e8781a'});brows(g,F,turn*24,-90,50,'#3a4a68',10);
   const bk=P([0,0,1,1]);bk.moveTo(-30+turn*40,40);bk.quadraticCurveTo(0+turn*50,26,30+turn*40,40);bk.lineTo(turn*60,110);bk.closePath();paint(g,bk,'#2a2228',{shadow:false,lw:7});const cer=P([0,0,1,1]);cer.ellipse(turn*40,36,26,12,0,0,7);paint(g,cer,'#f2f0ea',{shadow:false,lw:6});
   if(F.face==='happy'||F.face==='laugh'){g.fillStyle='#e05a6a';g.beginPath();g.moveTo(-12+turn*48,72);g.lineTo(12+turn*48,72);g.lineTo(turn*52,92);g.closePath();g.fill();}},
 granny(g,spec,F,turn){const skin=spec.skin;
   const bun=P([-70,-280,140,120]);bun.arc(0,-200,62,0,7);paint(g,bun,'#e8e8ee',{sx:1});
   [-1,1].forEach(sd=>{const e=P([0,0,1,1]);e.ellipse(sd*122+turn*20,10,24,32,0,0,7);paint(g,e,skin,{shadow:false,lw:7});});
   const h=P([-128,-150,256,290]);h.moveTo(-118,-60);h.quadraticCurveTo(-124,-150,0,-150);h.quadraticCurveTo(124,-150,118,-60);h.quadraticCurveTo(124,90,60,128);h.quadraticCurveTo(0,150,-60,128);h.quadraticCurveTo(-124,90,-118,-60);h.closePath();paint(g,h,skin,{sx:1,shadeK:0.14,shW:0.2});
   g.strokeStyle='rgba(120,60,40,0.35)';g.lineWidth=4;[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*70,60);g.quadraticCurveTo(sd*84,96,sd*62,118);g.stroke();g.beginPath();g.moveTo(sd*100,-10);g.lineTo(sd*118,-4);g.moveTo(sd*100,4);g.lineTo(sd*116,14);g.stroke();});
   const hair=P([-140,-180,280,170]);hair.moveTo(-128,-10);hair.quadraticCurveTo(-140,-178,0,-180);hair.quadraticCurveTo(140,-178,128,-10);hair.quadraticCurveTo(110,-100,40,-104);hair.quadraticCurveTo(0,-80,-40,-104);hair.quadraticCurveTo(-110,-100,-128,-10);hair.closePath();paint(g,hair,'#e8e8ee',{sx:1,shadeK:0.15});
   g.strokeStyle='rgba(140,140,160,0.6)';g.lineWidth=4;for(let i=0;i<6;i++){g.beginPath();g.moveTo(-100+i*40,-150);g.quadraticCurveTo(-90+i*40,-120,-100+i*38,-100);g.stroke();}
   // sunglasses: carry the attitude, brows peek above
   brows(g,F,turn*20,-56,50,'#c8c8d0',10);
   g.fillStyle='#14141a';[-1,1].forEach(sd=>{g.beginPath();g.roundRect(sd*50-46+turn*20,-34,92,56,22);g.fill();g.lineWidth=7;g.strokeStyle=OUT;g.stroke();});
   g.beginPath();g.moveTo(-6+turn*20,-14);g.lineTo(6+turn*20,-14);g.lineWidth=8;g.stroke();g.fillStyle='rgba(120,180,255,0.45)';[-1,1].forEach(sd=>{g.beginPath();g.ellipse(sd*50-20+turn*20,-18,14,7,-0.4,0,7);g.fill();});
   g.beginPath();g.moveTo(turn*24-4,26);g.quadraticCurveTo(turn*40+14,46,turn*24-2,54);g.lineWidth=6;g.strokeStyle=OUT;g.stroke();
   g.fillStyle='rgba(200,80,90,0.85)';mouth(g,F,turn*14,90,{w:28});
   g.fillStyle='#f4f0e8';for(let i=0;i<9;i++){const a=Math.PI*(0.15+i*0.0875);g.beginPath();g.arc(Math.cos(a)*-110,150+Math.sin(a)*40,9,0,7);g.fill();g.lineWidth=3;g.stroke();}},
};
function tail(g,t,seed){g.save();g.translate(-110,-430);g.rotate(-1.75+Math.sin(t*2.2+seed)*0.12);const n=7;
  for(let i=n;i>=0;i--){const r=54-i*2.5,y=i*58;const p=P([-r,y-r,2*r,2*r]);p.ellipse(Math.sin(i*0.5+t*2)*8,y,r,r*0.85,0,0,7);paint(g,p,i%2?'#2a2a30':'#8a8a92',{shadow:false,lw:7});}g.restore();}

// ---------- full narrator rig ----------
function drawNarrator(g,kind,pose,F,t=0){g.save();const turn=pose.turn||0;const legs=pose.legs||{L:{hip:0.04,knee:0},R:{hip:-0.04,knee:0}},arms=pose.arms||{L:{sh:0.14,el:0.12},R:{sh:-0.14,el:-0.12}};
  const K={raccoon:{coat:'#b08a5a',inner:'#f2ead8',tie:'#5a2a2a',belted:true,coatLen:430,flare:44,legC:'#3a3a40',shoe:'#2a1a12',sleeve:'#b08a5a',hand:'paw',handC:'#3a3a40',head:'raccoon',hat:'fedora'},
    pigeon:{coat:'#2f3a52',inner:'#f6f2ea',tie:'#d8a83a',pinstripe:true,coatLen:330,flare:10,legC:'#d8786a',shoe:null,sleeve:'#2f3a52',hand:'wing',handC:'#7a8aa8',head:'pigeon',bird:true},
    granny:{coat:'#1e1c22',inner:'#c4285a',zip:true,buttons:false,coatLen:320,flare:12,legC:'#4a5a8a',shoe:'#f2f2f2',sleeve:'#1e1c22',hand:'skin',handC:'#f1d0b4',head:'granny',skin:'#f1d0b4'},
    coin:{}}[kind];
  const hipY=-470+(pose.bob||0),shY=-760+(pose.bob||0);
  if(kind==='coin'){ // the body IS a 2-euro coin
    const legL=(sd,L)=>{g.save();g.translate(sd*70,-452);g.rotate(L.hip);g.lineCap='round';g.lineJoin='round';const kx=Math.sin(L.knee)*200;const leg=()=>{g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-sd*6,110,0,200);g.lineTo(kx*0.0+Math.sin(L.knee)*-0,200);g.save();g.translate(0,200);g.rotate(L.knee);g.lineTo(0,0);g.quadraticCurveTo(sd*5,110,0,196);g.restore();};
      g.strokeStyle=OUT;g.lineWidth=46;leg();g.stroke();g.strokeStyle='#2c2c36';g.lineWidth=30;leg();g.stroke();g.strokeStyle='rgba(255,255,255,0.10)';g.lineWidth=8;g.save();g.translate(-8,0);leg();g.stroke();g.restore();
      g.translate(0,200);g.rotate(L.knee);g.fillStyle='#f6f2ea';g.strokeStyle=OUT;g.lineWidth=6;g.beginPath();g.roundRect(-20,150,40,40,8);g.fill();g.stroke();const s=P([-40,190,130,50]);s.moveTo(-30,206);s.quadraticCurveTo(-36,250,-10,250);s.lineTo(80,250);s.quadraticCurveTo(100,246,84,220);s.quadraticCurveTo(50,200,20,204);s.closePath();paint(g,s,'#c4281f',{shadow:false});hl(g,30,218,26,8,0.4);g.restore();};
    const armC=(sd,A,open)=>{g.save();g.translate(sd*250,-690);g.rotate(A.sh);g.lineCap='round';g.lineJoin='round';const arm=()=>{g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*6,70,0,140);g.save();g.translate(0,140);g.rotate(A.el);g.lineTo(0,0);g.quadraticCurveTo(-sd*5,65,0,128);g.restore();};
      g.strokeStyle=OUT;g.lineWidth=40;arm();g.stroke();g.strokeStyle='#2c2c36';g.lineWidth=25;arm();g.stroke();g.save();g.translate(0,140);g.rotate(A.el);g.translate(0,128);g.fillStyle='#f6f2ea';g.strokeStyle=OUT;g.lineWidth=6;g.beginPath();g.roundRect(-24,-6,48,24,8);g.fill();g.stroke();g.translate(0,14);glove(g,open,sd);g.restore();g.restore();};
    armC(-1,arms.L,(pose.handOpen||{}).L);legL(-1,legs.L);legL(1,legs.R);
    g.save();g.translate(0,-700);g.rotate(pose.lean||0);
    const outer=P([-270,-270,540,540]);outer.arc(0,0,262,0,7);paint(g,outer,'#d8dce4',{sx:1,shW:0.2,shadeK:0.18});g.save();g.clip(outer);g.strokeStyle='rgba(28,20,16,0.35)';g.lineWidth=4;for(let a=0;a<72;a++){const an=a/72*Math.PI*2;g.beginPath();g.moveTo(Math.cos(an)*250,Math.sin(an)*250);g.lineTo(Math.cos(an)*262,Math.sin(an)*262);g.stroke();}g.restore();
    const inner=P([-196,-196,392,392]);inner.arc(0,0,190,0,7);paint(g,inner,'#e8b84a',{sx:1,shW:0.2,shadeK:0.18});hl(g,-90,-110,70,30,0.35,-0.6);
    g.font='900 64px Nunito';g.fillStyle='rgba(120,80,20,0.55)';g.textAlign='center';g.fillText('2',150,-150);
    g.fillStyle='rgba(120,80,20,0.6)';for(let i=0;i<12;i++){const an=i/12*Math.PI*2;g.beginPath();g.moveTo(Math.cos(an)*226,Math.sin(an)*226-6);for(let k=0;k<5;k++){const a2=an+k*Math.PI*0.8;g.lineTo(Math.cos(an)*226+Math.cos(a2-Math.PI/2)*9,Math.sin(an)*226+Math.sin(a2-Math.PI/2)*9);}g.fill();}
    eyes(g,F,turn*20,-30,{sx:62,rx:30,ry:34,iris:'#3a2a10'});brows(g,F,turn*20,-112,62,'#7a5a1a',13);
    // monocle on the right eye
    g.lineWidth=8;g.strokeStyle='#b8902a';g.beginPath();g.arc(62+turn*20,-30,46,0,7);g.stroke();g.fillStyle='rgba(200,230,255,0.25)';g.fill();g.lineWidth=3;g.strokeStyle='#8a6a1a';g.beginPath();g.moveTo(104+turn*20,-12);g.quadraticCurveTo(150,80,120,160);g.stroke();
    mouth(g,F,turn*20,98,{w:36});
    g.beginPath();g.moveTo(-40+turn*20,40);g.bezierCurveTo(-70,24,-110,50,-124,30);g.bezierCurveTo(-110,70,-60,64,-6+turn*20,52);g.bezierCurveTo(60,64,110,70,124,30);g.bezierCurveTo(110,50,70,24,40+turn*20,40);g.closePath();g.fillStyle='#4a3014';g.fill();g.lineWidth=5;g.strokeStyle=OUT;g.stroke();
    const bt=P([-80,220,160,80]);bt.moveTo(0,262);bt.lineTo(-74,232);bt.quadraticCurveTo(-84,262,-74,292);bt.closePath();bt.moveTo(0,262);bt.lineTo(74,232);bt.quadraticCurveTo(84,262,74,292);bt.closePath();paint(g,bt,'#c4281f',{shadow:false,lw:7});const kn=P([-20,246,40,34]);kn.roundRect(-18,248,36,30,8);paint(g,kn,'#9a1a14',{shadow:false,lw:6});
    // top hat
    const brm=P([0,0,1,1]);brm.ellipse(10,-262,170,30,0.06,0,7);paint(g,brm,'#1c1c22',{shadow:false});const cr=P([-110,-500,220,250]);cr.moveTo(-96,-264);cr.lineTo(-86,-470);cr.quadraticCurveTo(10,-490,104,-470);cr.lineTo(114,-262);cr.closePath();paint(g,cr,'#1c1c22',{sx:1});
    g.fillStyle='#7a1a2a';g.fillRect(-92,-320,204,40);g.strokeStyle=OUT;g.lineWidth=6;g.strokeRect(-92,-320,204,40);hl(g,-50,-420,16,50,0.18);
    g.restore();armC(1,arms.R,(pose.handOpen||{}).R);g.restore();return;}
  const back=turn>=0?-1:1;
  const drawLeg=(sd,L)=>{g.save();g.translate(sd*48,hipY);g.rotate(L.hip);
    if(K.bird){g.strokeStyle=OUT;g.lineWidth=22;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.lineTo(0,230);g.rotate(L.knee);g.lineTo(0,440);g.stroke();g.strokeStyle=K.legC;g.lineWidth=12;g.beginPath();g.moveTo(0,0);g.lineTo(0,440);g.stroke();
      [-0.6,0,0.6].forEach(a=>{g.save();g.translate(0,440);g.rotate(a-Math.PI/2+Math.PI/2);g.strokeStyle=OUT;g.lineWidth=16;g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(a)*60+20,10);g.stroke();g.strokeStyle=K.legC;g.lineWidth=8;g.stroke();g.restore();});g.restore();return;}
    paint(g,limb(230,46,40),K.legC,{sx:sd});folds(g,230,2);g.translate(0,230);g.rotate(L.knee);paint(g,limb(220,40,34),K.legC,{sx:sd});g.translate(0,224);
    const sh=P([-40,-20,130,56]);sh.moveTo(-36,-14);sh.quadraticCurveTo(-40,30,-20,32);sh.lineTo(70,32);sh.quadraticCurveTo(84,30,70,6);sh.quadraticCurveTo(40,-10,30,-14);sh.closePath();paint(g,sh,K.shoe,{shadow:true,shadeK:0.15});
    if(K.shoe==='#f2f2f2'){g.fillStyle='#c4285a';g.fillRect(-36,14,116,8);}hl(g,24,0,20,6,0.45);g.restore();};
  const drawArm=(sd,A,open)=>{g.save();g.translate(sd*118,shY+24);g.rotate(A.sh);
    if(K.hand==='wing'){const wg=P([-60,-20,120,420]);wg.moveTo(-30,0);wg.quadraticCurveTo(-60,200,-20,380);wg.lineTo(0,330);wg.lineTo(14,390);wg.lineTo(26,330);wg.lineTo(44,370);wg.quadraticCurveTo(60,180,30,0);wg.closePath();paint(g,wg,K.sleeve,{sx:sd});g.restore();return;}
    paint(g,limb(200,38,32),K.sleeve,{sx:sd});folds(g,200,2);g.translate(0,200);g.rotate(A.el);paint(g,limb(176,32,28),K.sleeve,{sx:sd});const cuff=P([-34,150,68,30]);cuff.roundRect(-34,150,68,26,8);paint(g,cuff,shade(K.sleeve,0.15),{shadow:false,lw:7});g.translate(0,178);
    if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);
    if(K.hand==='paw')paw(g,K.handC,sd);else{const h=P([-34,-10,68,80]);h.moveTo(-26,0);h.quadraticCurveTo(-36,40,-20,60);h.quadraticCurveTo(0,72,20,60);h.quadraticCurveTo(36,40,26,0);h.closePath();paint(g,h,K.handC,{shadow:false,lw:7});}
    g.restore();};
  if(kind==='raccoon')tail(g,t,1);
  drawArm(back,back<0?arms.L:arms.R,(pose.handOpen||{})[back<0?'L':'R']);drawLeg(back,back<0?legs.L:legs.R);drawLeg(-back,back<0?legs.R:legs.L);
  g.save();g.translate(0,shY);g.rotate(pose.lean||0);coatBody(g,K,turn);
  g.save();g.translate(turn*10,-178);g.rotate(pose.headTilt||0);HEADS[K.head](g,K,F,turn);
  if(K.hat==='fedora'){const brm=P([0,0,1,1]);brm.ellipse(0,-118,200,36,-0.05,0,7);paint(g,brm,'#6a5a48',{shadow:false});const cr=P([-110,-260,220,160]);cr.moveTo(-104,-126);cr.quadraticCurveTo(-110,-240,-40,-246);cr.quadraticCurveTo(0,-226,40,-246);cr.quadraticCurveTo(110,-240,104,-126);cr.closePath();paint(g,cr,'#6a5a48',{sx:1});
    g.fillStyle='#2a1a12';g.fillRect(-102,-170,204,30);g.strokeStyle=OUT;g.lineWidth=6;g.strokeRect(-102,-170,204,30);hl(g,-50,-210,30,10,0.25);}
  g.restore();g.restore();
  drawArm(-back,back<0?arms.R:arms.L,(pose.handOpen||{})[back<0?'R':'L']);g.restore();}
window.narrators={drawNarrator,H:{paint,P,eyes,brows,mouth,hl,glove,shade,light,mixc}};
})();
