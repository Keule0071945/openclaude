const W=1080,H=1920;let ctx=null;let T=0;let CAM={x:0,y:0,z:1,r:0};const FONT='Nunito, NunitoX, sans-serif';const OL='#3a2314';
function setCtx(c){ctx=c;} function setT(t){T=t;} function getCtx(){return ctx;}
// ---------- utils ----------
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,k)=>a+(b-a)*k;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const back=t=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function hx(c){c=c.replace('#','');return [0,2,4].map(i=>parseInt(c.substr(i,2),16));}
function mix(c,d,k){const a=hx(c),b=hx(d);return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,'0')).join('');}
const dk=(c,k)=>mix(c,'#1a0e08',k), lt=(c,k)=>mix(c,'#ffffff',k);
function pop(lt0,t0,dur=0.35){const u=clamp((lt0-t0)/dur);return u<=0?0:back(u);}
function rgba(c,a){const v=hx(c);return `rgba(${v[0]},${v[1]},${v[2]},${a})`;}

// ---------- drawing primitives ----------
function stroke(lw=7,col=OL){ctx.lineWidth=lw;ctx.strokeStyle=col;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
function fillS(c,lw=7){ctx.fillStyle=c;ctx.fill();if(lw>0)stroke(lw);}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function ell(x,y,rx,ry,rot=0){ctx.beginPath();ctx.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot,0,Math.PI*2);}
function poly(pts){ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();}
function text(t,x,y,size,col='#fff',opt={}){ctx.save();ctx.translate(x,y);if(opt.rot)ctx.rotate(opt.rot);
  ctx.font=`900 ${size}px ${opt.font||FONT}`;ctx.textAlign=opt.align||'center';ctx.textBaseline='middle';
  if(opt.ol!==false){ctx.lineWidth=opt.olw||size*0.16;ctx.strokeStyle=opt.olc||OL;ctx.lineJoin='round';ctx.strokeText(t,0,0);}
  ctx.fillStyle=col;ctx.fillText(t,0,0);ctx.restore();}

// Layer with parallax depth. depth 1 = main plane.
let LAYER_D=1;
function layer(depth,fn,blur=0){
  const c=blur>0.4?tmp.getContext('2d'):ctx;
  if(blur>0.4){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);}
  const save=ctx; if(blur>0.4) ctx=c;
  ctx.save();ctx.translate(W/2,H/2);ctx.rotate(CAM.r*depth);const z=Math.pow(CAM.z,depth);ctx.scale(z,z);
  ctx.translate(-CAM.x*depth,-CAM.y*depth);LAYER_D=depth;fn();ctx.restore();
  if(blur>0.4){ctx=save;ctx.save();ctx.filter=`blur(${blur}px)`;ctx.drawImage(tmp,0,0);ctx.restore();}
}
// depth-of-field blur amount for a layer depth
function dof(depth,base=0){return clamp(base+Math.abs(1-depth)*(CAM.z-0.6)*5,0,9);}

// fake-3D box: front face + top + visible side, offsets driven by camera position
function box3d(x,y,w,h,d,col,o={}){
  const cx=x+w/2,cy=y+h/2;
  const sx=clamp(-(cx-CAM.x*LAYER_D)*0.12,-1,1)*d;   // side shift
  const sy=-d*0.55 - clamp((cy-CAM.y*LAYER_D)*0.05,-0.4,0.4)*d;
  // side
  ctx.beginPath();
  if(sx<0){ctx.moveTo(x,y);ctx.lineTo(x+sx,y+sy);ctx.lineTo(x+sx,y+h+sy);ctx.lineTo(x,y+h);}
  else{ctx.moveTo(x+w,y);ctx.lineTo(x+w+sx,y+sy);ctx.lineTo(x+w+sx,y+h+sy);ctx.lineTo(x+w,y+h);}
  ctx.closePath();fillS(dk(col,0.28),o.lw??6);
  // top
  if(!o.noTop){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sx,y+sy);ctx.lineTo(x+w+sx,y+sy);ctx.lineTo(x+w,y);ctx.closePath();fillS(lt(col,0.18),o.lw??6);}
  rr(x,y,w,h,o.r||3);fillS(col,o.lw??6);
  if(o.front)o.front(x,y,w,h);
}
function cyl(x,y,rx,h,col,o={}){ // upright cylinder, top ellipse at y
  const ry=rx*0.28;
  ctx.beginPath();ctx.moveTo(x-rx,y);ctx.lineTo(x-rx,y+h);ctx.ellipse(x,y+h,rx,ry,0,Math.PI,0,true);ctx.lineTo(x+rx,y);ctx.closePath();
  const g=ctx.createLinearGradient(x-rx,0,x+rx,0);g.addColorStop(0,dk(col,0.35));g.addColorStop(0.35,lt(col,0.25));g.addColorStop(0.6,col);g.addColorStop(1,dk(col,0.45));
  ctx.fillStyle=g;ctx.fill();stroke(o.lw||7);
  ell(x,y,rx,ry);fillS(o.top||lt(col,0.1),o.lw||7);
}

// ---------- light helpers ----------
function glow(x,y,r,col,a=0.6){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(0.4,rgba(col,a*0.35));g.addColorStop(1,rgba(col,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
function rays(x,y,ang,len,w0,w1,col,a=0.25,n=1,spread=0){ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const an=ang+(i-(n-1)/2)*spread;const dx=Math.cos(an),dy=Math.sin(an),px=-dy,py=dx;
   const g=ctx.createLinearGradient(x,y,x+dx*len,y+dy*len);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));
   ctx.fillStyle=g;poly([x+px*w0,y+py*w0,x-px*w0,y-py*w0,x+dx*len-px*w1,y+dy*len-py*w1,x+dx*len+px*w1,y+dy*len+py*w1]);ctx.fill();}
  ctx.restore();}
function screenGrade(mul,a,scr,sa){ctx.save();ctx.setTransform(1,0,0,1,0,0);
  if(mul){ctx.globalCompositeOperation='multiply';ctx.fillStyle=rgba(mul,a);ctx.fillRect(0,0,W,H);}
  if(scr){ctx.globalCompositeOperation='screen';ctx.fillStyle=rgba(scr,sa);ctx.fillRect(0,0,W,H);}
  ctx.restore();}
function vignette(a=0.45,col='#140a04'){ctx.save();ctx.setTransform(1,0,0,1,0,0);const g=ctx.createRadialGradient(W/2,H*0.45,H*0.25,W/2,H*0.45,H*0.75);g.addColorStop(0,rgba(col,0));g.addColorStop(1,rgba(col,a));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();}
function spot(x,y,r,a){ // world coords, inside a layer
  ctx.save();const g=ctx.createRadialGradient(x,y,r*0.35,x,y,r);g.addColorStop(0,'rgba(8,4,2,0)');g.addColorStop(1,`rgba(8,4,2,${a})`);ctx.fillStyle=g;ctx.fillRect(x-6000,y-6000,12000,12000);ctx.restore();}
function particles(seed,n,fn){for(let i=0;i<n;i++)fn(rnd(seed+i*3.1),rnd(seed+i*7.7),rnd(seed+i*13.3),i);}

// ---------- props ----------
function mug(x,y,s=1,o={}){ctx.save();ctx.translate(x,y);ctx.scale(s,s);if(o.rot)ctx.rotate(o.rot);
  // handle
  ctx.beginPath();ctx.ellipse(48,4,26,30,0,-1.4,1.4);ctx.lineWidth=20;ctx.strokeStyle=OL;ctx.stroke();ctx.lineWidth=10;ctx.strokeStyle='#e8f2f2';ctx.stroke();
  // glass
  rr(-46,-45,92,100,14);ctx.fillStyle='rgba(235,245,245,0.9)';ctx.fill();
  const liq=o.liq||'#f0a51c';const g=ctx.createLinearGradient(0,-40,0,55);g.addColorStop(0,lt(liq,0.15));g.addColorStop(1,dk(liq,0.25));
  rr(-38,-30,76,78,10);ctx.fillStyle=g;ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.55)';rr(-28,-24,10,62,5);ctx.fill();
  // bubbles
  particles(7,5,(a,b,c)=>{ell(-25+a*50,40-((T*60+b*80)%70),2.5+c*2,2.5+c*2);ctx.fillStyle='rgba(255,240,200,0.7)';ctx.fill();});
  rr(-46,-45,92,100,14);stroke(7);
  // foam
  ctx.beginPath();[[-34,-46,20],[-12,-54,22],[12,-52,21],[33,-45,19],[0,-40,24]].forEach(([a,b,r])=>{ctx.moveTo(a+r,b);ctx.arc(a,b,r,0,Math.PI*2);});
  ctx.fillStyle='#fffaf0';ctx.fill();stroke(6);
  ctx.restore();}
function bread(x,y,s=1,col='#c47a32'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ell(0,0,90,48);const g=ctx.createLinearGradient(0,-48,0,48);g.addColorStop(0,lt(col,0.2));g.addColorStop(1,dk(col,0.3));ctx.fillStyle=g;ctx.fill();stroke(7);
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*36-14,-28);ctx.quadraticCurveTo(i*36,-34,i*36+14,-16);stroke(6,dk(col,0.45));}
  ctx.fillStyle='rgba(255,240,210,0.35)';ell(-20,-22,40,10,-0.2);ctx.fill();ctx.restore();}
function wheat(x,y,s=1,n=7){ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  for(let i=0;i<n;i++){const a=(i-(n-1)/2)*0.13;ctx.save();ctx.rotate(a);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-210);stroke(9);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-210);stroke(4,'#e3b54a');
    for(let k=0;k<6;k++){[-1,1].forEach(sd=>{ell(sd*9,-215-k*17,8,14,sd*0.5);fillS('#f2c14e',4);});}
    ctx.restore();}
  rr(-38,-70,76,22,8);fillS('#b5452f',5);ctx.restore();}
function barley(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(0,60);ctx.lineTo(0,-40);stroke(8);
  for(let k=0;k<5;k++){[-1,1].forEach(sd=>{ell(sd*8,-40-k*14,7,11,sd*0.4);fillS('#e5c063',4);ctx.beginPath();ctx.moveTo(sd*10,-45-k*14);ctx.lineTo(sd*34,-80-k*16);stroke(3);});}
  ctx.restore();}
function hops(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  for(let k=4;k>=0;k--){const w=18+k*7;[-1,0,1].forEach(sd=>{ell(sd*w*0.6,-k*18+20,w*0.55,16,sd*0.3);fillS(k%2?'#8cc63f':'#6aa832',4);});}
  ctx.beginPath();ctx.moveTo(0,-70);ctx.quadraticCurveTo(20,-95,40,-90);stroke(6);ell(45,-95,22,12,-0.4);fillS('#4f8f2a',4);ctx.restore();}
function drop(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(0,-70);ctx.bezierCurveTo(45,-10,48,40,0,45);ctx.bezierCurveTo(-48,40,-45,-10,0,-70);
  const g=ctx.createLinearGradient(0,-70,0,45);g.addColorStop(0,'#9fe3ff');g.addColorStop(1,'#2d8fd5');ctx.fillStyle=g;ctx.fill();stroke(7);ctx.fillStyle='rgba(255,255,255,0.7)';ell(-14,5,8,16,0.3);ctx.fill();ctx.restore();}
function barrel(x,y,s=1,col='#9a6236'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.beginPath();ctx.moveTo(-60,-90);ctx.quadraticCurveTo(-85,0,-60,90);ctx.lineTo(60,90);ctx.quadraticCurveTo(85,0,60,-90);ctx.closePath();
  const g=ctx.createLinearGradient(-80,0,80,0);g.addColorStop(0,dk(col,0.35));g.addColorStop(0.4,lt(col,0.15));g.addColorStop(1,dk(col,0.4));ctx.fillStyle=g;ctx.fill();stroke(7);
  [-55,55].forEach(yy=>{ctx.beginPath();ctx.moveTo(-74,yy);ctx.quadraticCurveTo(0,yy+8,74,yy);stroke(12,'#4a4a52');});
  ell(0,-90,60,14);fillS(lt(col,0.1),6);ctx.restore();}
function candle(x,y,s=1,lit=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);rr(-14,-70,28,70,6);fillS('#f5ecd6',5);
  const f=Math.sin(T*23+x)*3;ctx.beginPath();ctx.moveTo(0,-118+f);ctx.quadraticCurveTo(14,-88,0,-74);ctx.quadraticCurveTo(-14,-88,0,-118+f);ctx.fillStyle='#ffd255';ctx.fill();stroke(4,'#b85c12');
  ctx.restore();glow(x,y-95*s,260*s*lit,'#ffb347',0.55*lit);}
function stampText(t,x,y,size,col,k,rot=-0.12){ if(k<=0)return; const s=1+(1-clamp(k))*1.5; ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);ctx.globalAlpha=clamp(k*2);
  ctx.font=`900 ${size}px ${FONT}`;const w=ctx.measureText(t).width+size*0.6;rr(-w/2,-size*0.72,w,size*1.44,size*0.25);ctx.lineWidth=size*0.12;ctx.strokeStyle=col;ctx.stroke();
  text(t,0,0,size,col,{ol:false});ctx.restore();}
function bigX(x,y,r,k){if(k<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(k,k);[[-1,-1,1,1],[1,-1,-1,1]].forEach(([a,b,c,d])=>{ctx.beginPath();ctx.moveTo(a*r,b*r);ctx.lineTo(c*r,d*r);stroke(r*0.42);ctx.beginPath();ctx.moveTo(a*r,b*r);ctx.lineTo(c*r,d*r);stroke(r*0.28,'#e8322b');});ctx.restore();}
function ring(x,y,lt0,t0,col='#fff',maxr=260){const u=(lt0-t0)/0.45;if(u<0||u>1)return;ell(x,y,maxr*easeOut(u),maxr*easeOut(u)*0.45);ctx.lineWidth=14*(1-u);ctx.strokeStyle=rgba(col,1-u);ctx.stroke();}
function dust(x,y,lt0,t0,seed,col='#e8d6b0',n=12){const u=(lt0-t0)/0.7;if(u<0||u>1)return;particles(seed,n,(a,b,c)=>{const an=a*Math.PI*2,d=easeOut(u)*(120+b*160);ell(x+Math.cos(an)*d,y+Math.sin(an)*d*0.5-u*60*c,(22+c*20)*(1-u*0.6),(22+c*20)*(1-u*0.6));ctx.fillStyle=rgba(col,0.75*(1-u));ctx.fill();});}
function steam(x,y,seed,n=8,col='#ffffff',a=0.35,spd=1){particles(seed,n,(p,q,r)=>{const u=((T*0.35*spd+p)%1);ell(x+Math.sin(u*6+q*6)*40*u+(q-0.5)*60,y-u*520,40+u*90,36+u*80);ctx.fillStyle=rgba(col,a*(1-u));ctx.fill();});}

// ---------- characters (original "egg-head" cast) ----------
const SKIN=['#f3c9a5','#e8b48c','#d49a6a','#a8724a','#f6d3b8','#c98b5e'];
function faceAt(lt0,list,seed=0){let f=list[0][1],next=null;for(let i=0;i<list.length;i++){if(lt0>=list[i][0])f=list[i][1];}
  let eye=1;for(const [tc] of list){if(tc===0)continue;const d=lt0-tc;if(d>-0.1&&d<-0.066)eye=0.45;else if(d>=-0.066&&d<0)eye=0.05;else if(d>=0&&d<0.034)eye=0.5;}
  const bp=(lt0+seed*1.37)%2.9; if(bp<0.033)eye=Math.min(eye,0.45);else if(bp<0.07)eye=Math.min(eye,0.05);else if(bp<0.1)eye=Math.min(eye,0.5);
  return {face:f,eye};}
function arm(sx,sy,hxp,hyp,col,skin){const mx=(sx+hxp)/2+(hyp<sy?-18:14)*Math.sign(hxp||1),my=(sy+hyp)/2+16;
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,hxp,hyp);ctx.lineWidth=46;ctx.strokeStyle=OL;ctx.lineCap='round';ctx.stroke();ctx.lineWidth=32;ctx.strokeStyle=col;ctx.stroke();
  ell(hxp,hyp,23,23);fillS(skin,6);}
const POSES={down:[[-108,-140],[108,-140]],mug:[[-108,-140],[92,-250]],mugUp:[[-108,-140],[130,-500]],point:[[-108,-140],[160,-520]],
  stir:[[30,-215],[115,-245]],throw:[[-108,-140],[185,-430]],hold:[[-55,-235],[55,-235]],shrug:[[-175,-330],[175,-330]],
  shovel:[[60,-190],[120,-290]],peel:[[70,-230],[150,-250]],cheer:[[-150,-530],[150,-530]],sit:[[-60,-200],[92,-250]]};
function char(o){const {x,y,s=1}=o;const skin=o.skin||SKIN[0];const kind=o.kind||'citizen';
  const robe=o.robe||({duke:'#b3262e',monk:'#7a5232',brewer:'#e9dcc0',baker:'#f4f1ea'}[kind]||'#4f7fb8');
  const F=o.f||{face:'neutral',eye:1};
  ctx.save();ctx.translate(x,y);ctx.scale(s*(o.flip?-1:1),s);
  if(!o.noShadow){ctx.fillStyle='rgba(30,15,5,0.3)';ell(0,4,135,24);ctx.fill();}
  // feet
  ['-1','1'].forEach(sd=>{rr(sd*48-28,-48,56,48,20);fillS('#4a3020',6);});
  // hood behind (monk)
  if(kind==='monk'){ell(0,-345,120,60);fillS(dk(robe,0.2),7);}
  // robe
  ctx.beginPath();ctx.moveTo(-82,-338);ctx.quadraticCurveTo(-100,-200,-132,-40);ctx.quadraticCurveTo(0,-24,132,-40);ctx.quadraticCurveTo(100,-200,82,-338);ctx.quadraticCurveTo(0,-360,-82,-338);ctx.closePath();
  const robePath=new Path2D();ctx.fillStyle=robe;ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle=rgba('#1a0e08',0.18);ctx.fillRect(-160,-400,95,400);ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(50,-400,30,400);
  if(kind==='brewer'||kind==='baker'){ctx.fillStyle=kind==='brewer'?'#3f7a4a':'#fffdf8';ctx.beginPath();ctx.moveTo(-70,-260);ctx.lineTo(70,-260);ctx.lineTo(105,-30);ctx.lineTo(-105,-30);ctx.closePath();ctx.fill();stroke(5);}
  if(kind==='monk'){ctx.beginPath();ctx.moveTo(-110,-190);ctx.quadraticCurveTo(0,-170,110,-190);stroke(14,'#d9c18a');}
  if(kind==='duke'){ctx.fillStyle='#f2e6c8';ctx.fillRect(-14,-330,28,300);}
  ctx.restore();
  ctx.beginPath();ctx.moveTo(-82,-338);ctx.quadraticCurveTo(-100,-200,-132,-40);ctx.quadraticCurveTo(0,-24,132,-40);ctx.quadraticCurveTo(100,-200,82,-338);ctx.quadraticCurveTo(0,-360,-82,-338);ctx.closePath();stroke(7);
  if(kind==='duke'){rr(-120,-350,240,62,30);fillS('#fbf8f0',6);particles(3,9,(a,b)=>{ell(-100+a*200,-330+b*30,5,8);ctx.fillStyle='#222';ctx.fill();});
    ctx.beginPath();ctx.moveTo(-60,-300);ctx.quadraticCurveTo(0,-230,60,-300);stroke(8,'#e2b23c');ell(0,-240,18,18);fillS('#f2c94c',5);}
  // arms + held items
  const P=o.pose?POSES[o.pose]:POSES.down; const sh=[[-78,-310],[78,-310]];
  const sleeve=kind==='brewer'?'#e9dcc0':robe;
  const drawItem=()=>{const h=P[1];
    if(o.item==='mug'||o.pose==='mug'||o.pose==='mugUp'||o.pose==='sit')mug(h[0]+10,h[1]-18,0.95,{liq:o.liq});
    if(o.item==='bread')bread(0,-245,0.9);
    if(o.pose==='point'){ctx.beginPath();ctx.moveTo(h[0],h[1]);ctx.lineTo(h[0]+14,h[1]-46);stroke(22);ctx.beginPath();ctx.moveTo(h[0],h[1]);ctx.lineTo(h[0]+14,h[1]-46);stroke(11,skin);}
    if(o.pose==='stir'){ctx.save();ctx.translate(70,-230);ctx.rotate(0.7+Math.sin(T*5)*0.15);rr(-10,-40,20,330,8);fillS('#a87a46',6);ctx.restore();}
    if(o.pose==='shovel'){ctx.save();ctx.translate(95,-245);ctx.rotate(0.5+Math.sin(T*7)*0.25);rr(-8,-60,16,260,6);fillS('#8a5a32',5);ctx.beginPath();ctx.moveTo(-40,195);ctx.lineTo(40,195);ctx.lineTo(30,270);ctx.quadraticCurveTo(0,290,-30,270);ctx.closePath();fillS('#9aa3ad',6);ctx.restore();}
    if(o.pose==='peel'){rr(60,-262,520,22,10);fillS('#b8864e',6);ell(610,-262,80,26);fillS('#c99a5e',6);}
  };
  if(o.pose==='stir'||o.pose==='shovel'||o.pose==='peel')drawItem();
  arm(sh[0][0],sh[0][1],P[0][0],P[0][1],sleeve,skin);
  arm(sh[1][0],sh[1][1],P[1][0],P[1][1],sleeve,skin);
  if(!(o.pose==='stir'||o.pose==='shovel'||o.pose==='peel'))drawItem();
  // head
  const hy=-462;
  ell(0,hy,100,114);ctx.fillStyle=o.tint?mix(skin,o.tint,0.45):skin;ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle='rgba(120,50,20,0.13)';ell(-60,hy+30,80,130);ctx.fill();ctx.fillStyle='rgba(255,240,220,0.35)';ell(52,hy-40,34,44);ctx.fill();ctx.restore();
  ell(0,hy,100,114);stroke(7);
  // hair / hats
  const hair=o.hair||'#6b4226';
  if(kind==='monk'){ctx.save();ell(0,hy,100,114);ctx.clip();ctx.fillStyle=hair;ctx.fillRect(-110,hy-58,220,34);ctx.restore();ctx.beginPath();ctx.moveTo(-98,hy-40);ctx.lineTo(98,hy-40);}
  else if(kind==='duke'){rr(-90,hy-190,180,120,60);fillS('#b3262e',7);rr(-118,hy-100,236,52,26);fillS('#fbf8f0',6);particles(5,7,(a,b)=>{ell(-95+a*190,hy-85+b*20,4,7);ctx.fillStyle='#222';ctx.fill();});ell(0,hy-195,16,16);fillS('#f2c94c',5);}
  else if(kind==='brewer'){ctx.beginPath();ctx.ellipse(0,hy-78,108,44,0,Math.PI,0);ctx.lineTo(125,hy-70);ctx.quadraticCurveTo(0,hy-50,-108,hy-74);ctx.closePath();fillS('#5a4632',7);}
  else if(kind==='baker'){ctx.beginPath();ctx.moveTo(-70,hy-90);ctx.lineTo(70,hy-90);ctx.lineTo(80,hy-150);ctx.arc(45,hy-175,45,0.3,-2.2,true);ctx.arc(0,hy-200,50,-0.4,-2.7,true);ctx.arc(-45,hy-175,45,-1,-2.8,true);ctx.closePath();fillS('#ffffff',7);}
  else if(o.hat==='kerchief'){ctx.beginPath();ctx.ellipse(0,hy-30,108,100,0,Math.PI*1.05,Math.PI*1.95);ctx.quadraticCurveTo(0,hy-150,-104,hy-60);fillS(o.hatc||'#d64545',7);}
  else if(o.hat==='felt'){ell(0,hy-80,140,26);fillS(o.hatc||'#3d5a3a',7);rr(-70,hy-160,140,85,30);fillS(o.hatc||'#3d5a3a',7);ctx.beginPath();ctx.moveTo(40,hy-140);ctx.lineTo(90,hy-210);stroke(6,'#e8d27a');}
  else {ctx.save();ell(0,hy,100,114);ctx.clip();ctx.beginPath();ctx.ellipse(0,hy-70,120,70,0,0,Math.PI*2);ctx.fillStyle=hair;ctx.fill();ctx.restore();ctx.beginPath();ctx.ellipse(0,hy,100,114,0,Math.PI*1.1,Math.PI*1.9);stroke(7);}
  // face
  drawFace(F,hy,o);
  ctx.restore();}
function drawFace(F,hy,o){const f=F.face,e=F.eye;const ex=36,ey=hy-6;
  const lk=o.look||0;
  // cheeks
  ctx.fillStyle='rgba(235,110,100,0.38)';ell(-58,hy+32,18,11);ctx.fill();ell(58,hy+32,18,11);ctx.fill();
  const eyeOpen=(f==='laugh')?0:e; const big=(f==='shock')?1.3:1;
  [-1,1].forEach(sd=>{const x=sd*ex;
    if(f==='wink'&&sd<0||eyeOpen<0.2){ctx.beginPath();if(f==='laugh'||f==='wink'){ctx.moveTo(x-16,ey+4);ctx.quadraticCurveTo(x,ey-14,x+16,ey+4);}else{ctx.moveTo(x-15,ey);ctx.lineTo(x+15,ey);}stroke(7);}
    else{ell(x,ey,15*big,21*big*eyeOpen*(f==='dreamy'?0.55:1));fillS('#fff',5);ell(x+lk*5,ey+2,8*big,11*big*eyeOpen*(f==='dreamy'?0.5:1));ctx.fillStyle='#24140c';ctx.fill();ell(x+lk*5+3,ey-3,3,3);ctx.fillStyle='#fff';ctx.fill();}
    // brows
    ctx.beginPath();const by=ey-36*big;
    const tilt={neutral:0,smug:sd>0?-6:4,happy:-6,shock:-14,worried:sd*-0+10,stern:14,laugh:-8,wink:-6,dreamy:0}[f]||0;
    if(f==='worried'){ctx.moveTo(x-sd*-18,by-8);ctx.lineTo(x+sd*-18,by+6);}
    else if(f==='stern'){ctx.moveTo(x+sd*18,by-8);ctx.lineTo(x-sd*14,by+8);}
    else{ctx.moveTo(x-18,by+(tilt>0?tilt:0));ctx.quadraticCurveTo(x,by-10+(tilt<0?tilt:0),x+18,by);}
    stroke(8);});
  if(o.kind==='duke'){ctx.beginPath();ctx.moveTo(0,hy+38);ctx.bezierCurveTo(-30,hy+22,-60,hy+40,-72,hy+20);ctx.moveTo(0,hy+38);ctx.bezierCurveTo(30,hy+22,60,hy+40,72,hy+20);stroke(16,'#5a3418');}
  const my=hy+58;ctx.beginPath();
  if(f==='happy'||f==='laugh'){ctx.moveTo(-34,my-6);ctx.quadraticCurveTo(0,my+52,34,my-6);ctx.closePath();fillS('#7a2a22',6);ell(0,my+18,14,8);ctx.fillStyle='#e8706a';ctx.fill();}
  else if(f==='shock'){ell(0,my+8,16,22);fillS('#7a2a22',6);}
  else if(f==='smug'||f==='wink'){ctx.moveTo(-24,my+4);ctx.quadraticCurveTo(10,my+16,30,my-8);stroke(7);}
  else if(f==='worried'){ctx.moveTo(-26,my+8);ctx.quadraticCurveTo(-13,my-2,0,my+6);ctx.quadraticCurveTo(13,my+14,26,my+4);stroke(7);}
  else if(f==='stern'){ctx.moveTo(-24,my+6);ctx.lineTo(24,my+6);stroke(7);}
  else {ctx.moveTo(-22,my);ctx.quadraticCurveTo(0,my+16,22,my);stroke(7);}
  if(f==='worried'||o.sweat){const sy=hy-60+((T*80)%40);ctx.beginPath();ctx.moveTo(92,sy-26);ctx.bezierCurveTo(108,sy,104,sy+16,92,sy+16);ctx.bezierCurveTo(80,sy+16,76,sy,92,sy-26);fillS('#9fdcff',5);}
}


Object.assign(window,{setCtx,setT,getCtx,char,faceAt,mug,bread,wheat,barley,hops,drop,barrel,candle,stampText,bigX,text,rr,ell,poly,fillS,stroke,mix,dk,lt,rgba,clamp,lerp,ease,easeOut,back,rnd,pop,particles,glow,SKIN,drawFace,medallionFace:null});
