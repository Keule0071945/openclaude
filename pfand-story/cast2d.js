// cast2d.js — designed supporting cast in the same visual language as Herr Groschen.
// Rule: every character starts from ONE primitive shape (coin = circle, Jule = bean, Kevin = egg/noodle,
// Frau Brandt = rectangle), has rubber-hose limbs, big readable eyes and 2–3 signature props. No generic body kit.
// Units: ~1000 = 1.75 m, feet at y=0. draw(g,pose,F,t) with the same pose/F contract as drawNarrator.
(function(){
const N=window.narrators.H,OUT='#1c1410';const {paint,P,eyes,brows,mouth,hl,shade,light}=N;

// ---------- shared pieces ----------
// rubber-hose limb from the current origin: two bent segments, outlined tube, one shade stripe. end(totalAngle) draws hand/shoe.
function hose(g,a1,a2,l1,l2,w,col,sd,end){g.save();g.rotate(a1);g.lineCap='round';g.lineJoin='round';
  const path=()=>{g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*w*0.3,l1*0.5,0,l1);g.save();g.translate(0,l1);g.rotate(a2);g.lineTo(0,0);g.quadraticCurveTo(-sd*w*0.25,l2*0.5,0,l2);g.restore();};
  g.strokeStyle=OUT;g.lineWidth=w+16;path();g.stroke();g.strokeStyle=col;g.lineWidth=w;path();g.stroke();
  g.save();g.translate(sd*w*0.24,0);g.strokeStyle=shade(col,0.2);g.lineWidth=w*0.32;path();g.stroke();g.restore();
  g.save();g.translate(-sd*w*0.22,0);g.strokeStyle='rgba(255,255,255,0.16)';g.lineWidth=w*0.16;path();g.stroke();g.restore();
  g.translate(0,l1);g.rotate(a2);g.translate(0,l2);if(end)end(a1+a2);g.restore();}
// mitten hand with thumb + sleeve cuff
function mitt(g,skin,open,sd,cuff){if(cuff){const c=P([-30,-20,60,26]);c.roundRect(-30,-22,60,24,9);paint(g,c,cuff,{shadow:false,lw:7});}
  const p=P([-30,-4,60,80]);if(open){p.moveTo(-24,0);p.lineTo(-30,50);p.quadraticCurveTo(-28,72,-10,74);p.lineTo(16,74);p.quadraticCurveTo(32,70,30,48);p.lineTo(24,0);p.closePath();}
  else{p.moveTo(-24,0);p.quadraticCurveTo(-34,42,-18,62);p.quadraticCurveTo(0,74,18,62);p.quadraticCurveTo(34,42,24,0);p.closePath();}
  paint(g,p,skin,{shadow:true,lw:7,shadeK:0.12,shW:0.25});const t=P([0,0,1,1]);t.moveTo(sd*20,8);t.quadraticCurveTo(sd*48,14,sd*42,40);t.quadraticCurveTo(sd*30,46,sd*20,30);paint(g,t,skin,{shadow:false,lw:7});
  g.strokeStyle=OUT;g.lineWidth=4;[-8,7].forEach(x=>{g.beginPath();g.moveTo(x,open?50:42);g.lineTo(x,open?72:60);g.stroke();});}
// shoe kept level with the ground whatever the leg does
function shoe(g,tot,dir,col,{sole='#f2efe6',size=1,heel=false,lace=false}={}){g.save();g.rotate(-tot);g.scale(dir*size,size);
  const s=P([-40,-20,140,60]);if(heel){s.moveTo(-26,-12);s.quadraticCurveTo(-34,20,-22,26);s.lineTo(56,30);s.quadraticCurveTo(80,30,70,16);s.quadraticCurveTo(30,-4,14,-12);s.closePath();}
  else{s.moveTo(-34,-14);s.quadraticCurveTo(-46,30,-20,36);s.lineTo(72,36);s.quadraticCurveTo(96,32,84,8);s.quadraticCurveTo(52,-12,24,-16);s.closePath();}
  paint(g,s,col,{shadow:false});g.save();g.clip(s);g.fillStyle=sole;g.fillRect(-60,heel?22:24,170,20);g.strokeStyle=OUT;g.lineWidth=5;g.beginPath();g.moveTo(-60,heel?22:24);g.lineTo(110,heel?22:24);g.stroke();g.restore();
  if(heel){const h=P([-30,20,24,40]);h.moveTo(-24,22);h.lineTo(-20,58);h.lineTo(-8,58);h.lineTo(-4,24);h.closePath();paint(g,h,col,{shadow:false,lw:6});}
  if(lace){g.strokeStyle=OUT;g.lineWidth=4;[8,24].forEach(x=>{g.beginPath();g.moveTo(x,-8);g.lineTo(x+12,4);g.stroke();});}
  hl(g,30,0,22,7,0.35);g.restore();}
// scalloped cloud outline (curly hair, puffs) as ONE path => one clean outline
function cloud(cx,cy,rx,ry,n,bump,ph=0){const p=P([cx-rx-bump,cy-ry-bump,2*(rx+bump),2*(ry+bump)]);for(let i=0;i<=n;i++){const a=ph+i/n*Math.PI*2,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
  if(i===0){p.moveTo(x,y);continue;}const am=ph+(i-0.5)/n*Math.PI*2;p.quadraticCurveTo(cx+Math.cos(am)*(rx+bump*2),cy+Math.sin(am)*(ry+bump*2),x,y);}p.closePath();return p;}
// heavy upper lid (bored / sceptical look) drawn over open eyes
function lids(g,F,cx,cy,sx,rx,ry,skin,k){const f=F.face||'neutral';if(['shock','happy','laugh','raised'].includes(f)||(F.eye!==undefined&&F.eye<0.2))return;
  [-1,1].forEach(sd=>{const x=cx+sd*sx;g.save();g.beginPath();g.ellipse(x,cy,rx+1,ry+4,0,0,7);g.clip();g.fillStyle=skin;g.fillRect(x-rx-4,cy-ry-6,2*rx+8,ry*2*k+2);
    g.beginPath();g.moveTo(x-rx-4,cy-ry-6+ry*2*k);g.lineTo(x+rx+4,cy-ry-6+ry*2*k+(sd*2));g.lineWidth=7;g.strokeStyle=OUT;g.stroke();g.restore();});}
const blush=(g,x,y,rx=22,ry=12,a=0.22)=>{g.fillStyle=`rgba(225,100,90,${a})`;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();};
function nose(g,x,y,len=26){g.beginPath();g.moveTo(x-4,y);g.quadraticCurveTo(x+16,y+len*0.75,x-2,y+len);g.lineWidth=6;g.strokeStyle=OUT;g.lineCap='round';g.stroke();}
// draw the two arms + body/head in the right order for the facing
function rig(g,pose,body){const turn=pose.turn||0,back=turn>=0?-1:1;const A=pose.arms||{L:{sh:0.14,el:0.12},R:{sh:-0.14,el:-0.12}};
  return {turn,back,A,front:-back,bob:pose.bob||0,legs:pose.legs||{L:{hip:0.03,knee:0},R:{hip:-0.03,knee:0}},open:pose.handOpen||{}};}
const arm=(R,sd)=>sd<0?R.A.L:R.A.R, leg=(R,sd)=>sd<0?R.legs.L:R.legs.R, op=(R,sd)=>R.open[sd<0?'L':'R'];
const toe=(R,sd)=>Math.abs(R.turn)>0.2?Math.sign(R.turn):sd;

// ================= JULE — the customer. Shape: BEAN. Signature: mustard puffer, round red glasses, curly puff + band, long scarf =================
function jule(g,pose,F,t){const R=rig(g,pose);const skin='#a8724a',jac='#e8a92a',jeans='#34446a';g.save();
  const hipY=-330+R.bob;const lean=pose.lean||0,tx=R.turn*30;
  const legF=sd=>{g.save();g.translate(sd*58,hipY);const L=leg(R,sd);hose(g,L.hip,L.knee,148,140,46,jeans,sd,tot=>shoe(g,tot,toe(R,sd),'#f6f2ea',{sole:'#d0342c',lace:true,size:1.05}));g.restore();};
  const armF=sd=>{const A=arm(R,sd);g.save();g.translate(sd*128,-272);hose(g,A.sh,A.el,140,128,50,jac,sd,()=>{g.translate(0,8);mitt(g,skin,op(R,sd),sd,shade(jac,0.12));if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);});g.restore();};
  legF(R.back);legF(R.front);
  g.save();g.translate(0,hipY);g.rotate(lean);
  armF(R.back);
  // bean body (puffer jacket)
  const b=P([-180,-350,360,400]);b.moveTo(-112,-302);b.bezierCurveTo(-172,-210,-186,-40,-150,14);b.quadraticCurveTo(0,58,150,14);b.bezierCurveTo(186,-40,172,-210,112,-302);b.quadraticCurveTo(0,-344,-112,-302);b.closePath();
  paint(g,b,jac,{sx:R.turn>0?-1:1,shW:0.24,shadeK:0.18});g.save();g.clip(b);g.strokeStyle=shade(jac,0.3);g.lineWidth=6;
  [-236,-168,-100,-32].forEach(y=>{g.beginPath();g.moveTo(-200,y);g.quadraticCurveTo(0,y+26,200,y);g.stroke();});
  g.strokeStyle=OUT;g.lineWidth=6;g.beginPath();g.moveTo(tx,-320);g.lineTo(tx*0.8,40);g.stroke();g.fillStyle='#d8d8de';g.fillRect(tx-7,-250,14,26);g.strokeRect(tx-7,-250,14,26);
  hl(g,-80+tx*0.3,-220,22,70,0.2,0.25);g.restore();
  // pocket flaps
  g.strokeStyle=OUT;g.lineWidth=6;[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*60+tx*0.5,-90);g.lineTo(sd*120+tx*0.5,-80);g.stroke();});
  // scarf: neck wrap + one long swinging end
  const sw=Math.sin(t*2.1)*0.05-lean*0.8+(R.bob?R.bob*0.003:0);
  g.save();g.translate(-58+tx,-300);g.rotate(sw);const se=P([-30,0,64,230]);se.moveTo(-26,0);se.lineTo(-30,210);se.lineTo(30,214);se.lineTo(28,0);se.closePath();paint(g,se,'#c8342c',{shadow:false,lw:8});
  g.save();g.clip(se);g.fillStyle='#f4e6cc';[40,100,160].forEach(y=>g.fillRect(-40,y,80,24));g.restore();g.strokeStyle=OUT;g.lineWidth=8;g.stroke(se);
  g.strokeStyle='#c8342c';g.lineWidth=7;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-24+i*12,214);g.lineTo(-26+i*12,240);g.stroke();}g.restore();
  const wrap=P([-140,-370,280,90]);wrap.moveTo(-124,-318);wrap.quadraticCurveTo(-130,-372,0,-376);wrap.quadraticCurveTo(130,-372,124,-318);wrap.quadraticCurveTo(0,-284,-124,-318);wrap.closePath();paint(g,wrap,'#c8342c',{sx:1,shW:0.2});
  g.save();g.clip(wrap);g.fillStyle='#f4e6cc';[-80,0,80].forEach(x=>{g.save();g.translate(x+tx*0.4,-330);g.rotate(0.5);g.fillRect(-12,-60,24,120);g.restore();});g.restore();g.lineWidth=9;g.strokeStyle=OUT;g.stroke(wrap);
  // head
  g.save();g.translate(R.turn*16,-528);g.rotate(pose.headTilt||0);g.scale(1.18,1.18);const bounce=Math.sin(t*1.7)*3-(R.bob||0)*0.25;
  const puff=cloud(0,-110+bounce,205,150,14,22,0.2);paint(g,puff,'#1e1412',{sx:1,shW:0.22,shadeK:0.3});g.save();g.clip(puff);g.strokeStyle='rgba(255,220,200,0.12)';g.lineWidth=6;for(let i=0;i<14;i++){const a=i/14*Math.PI*2;g.beginPath();g.arc(Math.cos(a)*120,-110+Math.sin(a)*90+bounce,26,a,a+2.2);g.stroke();}g.restore();
  [-1,1].forEach(sd=>{if(sd*R.turn>0.6)return;const e=P([0,0,1,1]);e.ellipse(sd*146+tx*0.4,14,22,30,0,0,7);paint(g,e,skin,{shadow:false,lw:7});g.lineWidth=7;g.strokeStyle=OUT;g.beginPath();g.arc(sd*150+tx*0.4,62,19,0,7);g.stroke();g.lineWidth=4;g.strokeStyle='#e8b84a';g.stroke();});
  const h=P([-150,-150,300,300]);h.moveTo(-142,-30);h.quadraticCurveTo(-146,-150,0+tx*0.3,-152);h.quadraticCurveTo(146,-150,142,-30);h.quadraticCurveTo(140,110,0+tx*0.5,140);h.quadraticCurveTo(-140,110,-142,-30);h.closePath();
  paint(g,h,skin,{sx:R.turn>0?-1:1,shadeK:0.16,shW:0.18});
  // hairline + headband
  const fr=P([-160,-200,320,170]);fr.moveTo(-150,-20);fr.quadraticCurveTo(-170,-150,-60,-176);fr.quadraticCurveTo(0+tx*0.3,-196,60,-176);fr.quadraticCurveTo(170,-150,150,-20);fr.quadraticCurveTo(120,-96,40+tx*0.4,-100);fr.quadraticCurveTo(-30,-96,-60,-120);fr.quadraticCurveTo(-110,-90,-150,-20);fr.closePath();paint(g,fr,'#1e1412',{sx:1,shadeK:0.3,shW:0.2});
  g.lineCap='round';g.strokeStyle=OUT;g.lineWidth=44;g.beginPath();g.moveTo(-156,-108);g.quadraticCurveTo(0+tx*0.3,-232,156,-108);g.stroke();g.strokeStyle='#2a9a8a';g.lineWidth=30;g.stroke();
  blush(g,-74+tx,62);blush(g,74+tx,62);
  eyes(g,F,tx,6,{sx:56,rx:25,ry:29,iris:'#3a2210'});brows(g,F,tx,-72,56,'#1e1412',12);
  g.lineWidth=12;g.strokeStyle=OUT;[-1,1].forEach(sd=>{g.beginPath();g.arc(sd*56+tx,6,44,0,7);g.stroke();});g.lineWidth=7;g.strokeStyle='#d0342c';[-1,1].forEach(sd=>{g.beginPath();g.arc(sd*56+tx,6,44,0,7);g.stroke();});
  g.lineWidth=7;g.strokeStyle='#d0342c';g.beginPath();g.moveTo(-12+tx,0);g.quadraticCurveTo(tx,-10,12+tx,0);g.stroke();g.fillStyle='rgba(255,255,255,0.3)';[-1,1].forEach(sd=>{g.beginPath();g.ellipse(sd*56-18+tx,-12,10,5,-0.6,0,7);g.fill();});
  nose(g,tx+R.turn*12,50,24);mouth(g,F,tx+R.turn*6,98,{w:30});
  g.restore();
  armF(R.front);g.restore();g.restore();}

// ================= KEVIN — the box-office teen. Shape: tall EGG on a NOODLE. Signature: paper cap, freckles, droopy lids, red vest + name tag =================
function kevin(g,pose,F,t){const R=rig(g,pose);const skin='#f2c8a0',vest='#c4281f',shirt='#f6f2ea',hair='#d8742a';g.save();
  const hipY=-462+R.bob;const lean=(pose.lean||0)+0.035,tx=R.turn*26;
  const legF=sd=>{g.save();g.translate(sd*38,hipY);const L=leg(R,sd);hose(g,L.hip,L.knee,222,206,30,'#26262e',sd,tot=>shoe(g,tot,toe(R,sd),'#1a1a1e',{sole:'#6a6a72',size:1.2}));g.restore();};
  const armF=sd=>{const A=arm(R,sd);g.save();g.translate(sd*98,-318);hose(g,A.sh,A.el,186,170,30,shirt,sd,()=>{g.translate(0,6);mitt(g,skin,op(R,sd),sd,shirt);if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);});g.restore();};
  legF(R.back);legF(R.front);g.save();g.translate(0,hipY);g.rotate(lean);armF(R.back);
  const tor=P([-110,-350,220,380]);tor.moveTo(-76,-338);tor.quadraticCurveTo(-104,-330,-104,-270);tor.lineTo(-94,14);tor.quadraticCurveTo(0,30,94,14);tor.lineTo(104,-270);tor.quadraticCurveTo(104,-330,76,-338);tor.closePath();paint(g,tor,shirt,{sx:1});
  const v=P([-110,-350,220,380]);v.moveTo(-34,-340);v.lineTo(tx*0.4,-196);v.lineTo(34,-340);v.lineTo(78,-336);v.quadraticCurveTo(104,-326,104,-270);v.lineTo(96,16);v.quadraticCurveTo(0,32,-96,16);v.lineTo(-104,-270);v.quadraticCurveTo(-104,-326,-78,-336);v.closePath();
  paint(g,v,vest,{sx:R.turn>0?-1:1,shW:0.26});g.save();g.clip(v);g.strokeStyle='rgba(28,20,16,0.35)';g.lineWidth=4;[[-70,-120,-60,-40],[60,-150,70,-60]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a,b);g.quadraticCurveTo(a+10,(b+d)/2,c,d);g.stroke();});g.restore();
  [-150,-100,-50].forEach(y=>{g.beginPath();g.arc(tx*0.4,y,9,0,7);g.fillStyle='#e8c25a';g.fill();g.lineWidth=4;g.strokeStyle=OUT;g.stroke();});
  const tag=P([20,-290,90,36]);tag.roundRect(28+tx*0.3,-290,84,34,6);paint(g,tag,'#ffffff',{shadow:false,lw:5});g.fillStyle='#1c1410';g.font='900 19px Nunito, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('KEVIN',70+tx*0.3,-272);
  // long neck + bow tie
  const nk=P([-26,-470,52,140]);nk.moveTo(-22,-460);nk.lineTo(-24,-332);nk.lineTo(24,-332);nk.lineTo(22,-460);nk.closePath();paint(g,nk,skin,{shadow:false,lw:7});g.strokeStyle=OUT;g.lineWidth=5;g.beginPath();g.moveTo(-8,-390);g.quadraticCurveTo(0,-380,8,-390);g.stroke();
  const bt=P([-50,-360,100,40]);bt.moveTo(0,-340);bt.lineTo(-44,-360);bt.lineTo(-44,-320);bt.closePath();bt.moveTo(0,-340);bt.lineTo(44,-360);bt.lineTo(44,-320);bt.closePath();paint(g,bt,'#1c1c22',{shadow:false,lw:6});
  // egg head
  g.save();g.translate(R.turn*14,-600);g.rotate((pose.headTilt||0)+0.03);g.scale(1.12,1.12);
  [-1,1].forEach(sd=>{if(sd*R.turn>0.6)return;const e=P([0,0,1,1]);e.ellipse(sd*116+tx*0.3,4,30,44,sd*0.15,0,7);paint(g,e,skin,{shadow:false,lw:7});g.strokeStyle='rgba(120,50,30,0.35)';g.lineWidth=5;g.beginPath();g.arc(sd*114+tx*0.3,6,16,sd>0?-1.2:1.9,sd>0?1.2:4.4);g.stroke();});
  const h=P([-124,-160,248,320]);h.moveTo(0+tx*0.2,-158);h.bezierCurveTo(132,-158,126,90,0+tx*0.5,150);h.bezierCurveTo(-126,90,-132,-158,0+tx*0.2,-158);h.closePath();paint(g,h,skin,{sx:R.turn>0?-1:1,shadeK:0.14,shW:0.2});
  // ginger tufts peeking out under the cap
  [-1,1].forEach(sd=>{const tf=P([0,0,1,1]);tf.moveTo(sd*112,-60);tf.lineTo(sd*128,-30);tf.lineTo(sd*108,-36);tf.lineTo(sd*118,-6);tf.lineTo(sd*96,-24);tf.quadraticCurveTo(sd*92,-60,sd*112,-60);tf.closePath();paint(g,tf,hair,{shadow:false,lw:6});});
  g.fillStyle='rgba(170,90,50,0.55)';[[-62,40],[-44,52],[-74,58],[60,40],[44,54],[76,56],[-30,44],[30,46]].forEach(([x,y])=>{g.beginPath();g.arc(x+tx,y,4,0,7);g.fill();});
  blush(g,-64+tx,60,20,10,0.18);blush(g,64+tx,60,20,10,0.18);
  eyes(g,F,tx,-14,{sx:44,rx:23,ry:27,iris:'#3a6a8a'});lids(g,F,tx,-14,44,23,27,skin,0.42);brows(g,F,tx,-74,44,'#b85a20',10);
  const ns=P([0,0,1,1]);ns.moveTo(tx+R.turn*16-6,10);ns.quadraticCurveTo(tx+R.turn*30+26,52,tx+R.turn*18,62);ns.quadraticCurveTo(tx+R.turn*10-6,62,tx+R.turn*12-8,54);g.lineWidth=6;g.strokeStyle=OUT;g.stroke(ns);
  mouth(g,F,tx+R.turn*8,100,{w:26});
  // paper soda-jerk cap, tilted
  g.save();g.translate(4,-118);g.rotate(-0.12);const cp=P([-130,-80,260,100]);cp.moveTo(-128,6);cp.lineTo(-104,-70);cp.quadraticCurveTo(0,-92,104,-70);cp.lineTo(128,6);cp.quadraticCurveTo(0,-14,-128,6);cp.closePath();paint(g,cp,'#ffffff',{sx:1,shW:0.2,shadeK:0.12});
  g.save();g.clip(cp);g.fillStyle=vest;g.fillRect(-140,-30,280,22);g.restore();g.strokeStyle=OUT;g.lineWidth=9;g.stroke(cp);g.lineWidth=5;g.beginPath();g.moveTo(0,-84);g.lineTo(0,-8);g.stroke();g.restore();
  const ck=P([0,0,1,1]);ck.moveTo(-30,-150);ck.quadraticCurveTo(-60,-210,-10,-206);ck.quadraticCurveTo(-36,-180,-8,-160);ck.closePath();paint(g,ck,hair,{shadow:false,lw:6});
  g.restore();armF(R.front);g.restore();g.restore();}

// ================= FRAU BRANDT — the cinema manager. Shape: RECTANGLE. Signature: power blazer with square shoulder pads, black helmet bob, red cat-eye glasses on a chain =================
function brandt(g,pose,F,t){const R=rig(g,pose);const skin='#f3c9a5',bl='#1f7a72',hair='#16141c';g.save();
  const hipY=-430+R.bob;const lean=pose.lean||0,tx=R.turn*26;const legs=R.legs;
  const legF=sd=>{g.save();g.translate(sd*40,hipY);const L=leg(R,sd);hose(g,L.hip,L.knee,205,192,30,'#3a3442',sd,tot=>shoe(g,tot,toe(R,sd),'#c4281f',{sole:'#7a1410',heel:true,size:1.05}));g.restore();};
  const armF=sd=>{const A=arm(R,sd);g.save();g.translate(sd*150,-322);hose(g,A.sh,A.el,170,160,40,bl,sd,()=>{g.translate(0,6);mitt(g,skin,op(R,sd),sd,'#ffffff');if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);});g.restore();};
  legF(R.back);legF(R.front);g.save();g.translate(0,hipY);g.rotate(lean);
  const fl=Math.max(Math.abs(legs.L.hip),Math.abs(legs.R.hip))*70;const sk=P([-140,-80,280,280]);sk.moveTo(-112,-70);sk.lineTo(-118-fl,186);sk.lineTo(118+fl,186);sk.lineTo(112,-70);sk.closePath();paint(g,sk,'#1d2f3a',{sx:1,shW:0.25});
  g.strokeStyle=OUT;g.lineWidth=5;g.beginPath();g.moveTo(40+tx*0.3,120);g.lineTo(44+tx*0.3,186);g.stroke();
  armF(R.back);
  const bz=P([-200,-400,400,400]);bz.moveTo(-150,-380);bz.quadraticCurveTo(-190,-378,-186,-334);bz.lineTo(-126,-18);bz.lineTo(126,-18);bz.lineTo(186,-334);bz.quadraticCurveTo(190,-378,150,-380);bz.closePath();
  paint(g,bz,bl,{sx:R.turn>0?-1:1,shW:0.24});g.save();g.clip(bz);
  g.fillStyle='#fffaf0';g.beginPath();g.moveTo(-50+tx*0.4,-384);g.lineTo(tx*0.4,-210);g.lineTo(50+tx*0.4,-384);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=7;g.stroke();
  g.fillStyle=shade(bl,0.14);[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*50+tx*0.4,-384);g.lineTo(sd*104+tx*0.4,-270);g.lineTo(sd*40+tx*0.4,-180);g.lineTo(sd*6+tx*0.4,-206);g.closePath();g.fill();g.stroke();});
  [-130,-70].forEach(y=>{g.beginPath();g.arc(tx*0.4,y,9,0,7);g.fillStyle='#e8c25a';g.fill();g.lineWidth=4;g.stroke();});
  g.lineWidth=5;g.beginPath();g.moveTo(-150+tx*0.2,-150);g.lineTo(-84+tx*0.2,-146);g.stroke();g.beginPath();g.moveTo(84,-146);g.lineTo(150,-150);g.stroke();
  g.strokeStyle='rgba(28,20,16,0.4)';g.lineWidth=5;[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*150,-372);g.quadraticCurveTo(sd*136,-340,sd*150,-310);g.stroke();});
  hl(g,-110+tx*0.3,-300,16,50,0.18,0.2);g.restore();
  g.beginPath();g.arc(-70+tx*0.4,-300,14,0,7);g.fillStyle='#e8c25a';g.fill();g.lineWidth=5;g.strokeStyle=OUT;g.stroke();g.beginPath();g.arc(-70+tx*0.4,-300,6,0,7);g.fillStyle='#c4281f';g.fill();
  if(pose.costume==='popcorn'){const ap=P([-120,-330,240,420]);ap.moveTo(-70,-330);ap.lineTo(70,-330);ap.lineTo(78,-200);ap.lineTo(122,-190);ap.lineTo(128,90);ap.lineTo(-128,90);ap.lineTo(-122,-190);ap.lineTo(-78,-200);ap.closePath();paint(g,ap,'#ffffff',{sx:1,shW:0.22,shadeK:0.12});
    g.save();g.clip(ap);g.fillStyle='#d62828';for(let x=-140;x<140;x+=56)g.fillRect(x+tx*0.3,-340,26,440);g.restore();g.lineWidth=9;g.strokeStyle=OUT;g.stroke(ap);const pk=P([-60,-80,120,70]);pk.roundRect(-58+tx*0.3,-60,116,60,10);paint(g,pk,'#ffffff',{shadow:false,lw:6});g.fillStyle='#1c1410';g.font='900 26px Nunito, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('POPCORN',tx*0.3,-30);}
  const nk=P([-26,-430,52,60]);nk.moveTo(-24,-430);nk.lineTo(-26,-376);nk.lineTo(26,-376);nk.lineTo(24,-430);nk.closePath();paint(g,nk,skin,{shadow:false,lw:7});
  // head: soft rectangle + helmet bob
  g.save();g.translate(R.turn*12,-572);g.rotate(pose.headTilt||0);g.scale(1.15,1.15);
  const bk=P([-156,-182,312,280]);bk.moveTo(-152,96);bk.lineTo(-152,-80);bk.quadraticCurveTo(-152,-182,0,-184);bk.quadraticCurveTo(152,-182,152,-80);bk.lineTo(152,96);bk.closePath();paint(g,bk,hair,{sx:1,shadeK:0.3});
  const h=P([-118,-140,236,270]);h.moveTo(-112,-90);h.quadraticCurveTo(-116,-140,-60,-142);h.lineTo(60,-142);h.quadraticCurveTo(116,-140,112,-90);h.lineTo(110,70);h.quadraticCurveTo(104,128,40+tx*0.4,134);h.lineTo(-40+tx*0.4,134);h.quadraticCurveTo(-104,128,-110,70);h.closePath();
  paint(g,h,skin,{sx:R.turn>0?-1:1,shadeK:0.14,shW:0.2});
  blush(g,-64+tx,60,20,10,0.16);blush(g,64+tx,60,20,10,0.16);
  eyes(g,F,tx,0,{sx:50,rx:22,ry:25,iris:'#2a5a3a'});lids(g,F,tx,0,50,22,25,skin,0.22);brows(g,F,tx,-52,50,hair,8);
  // red cat-eye glasses + chain
  g.lineJoin='round';[-1,1].forEach(sd=>{const x=sd*50+tx;const gl=new Path2D();gl.moveTo(x-sd*40,-14);gl.quadraticCurveTo(x,-34,x+sd*44,-30);gl.lineTo(x+sd*58,-44);gl.quadraticCurveTo(x+sd*52,22,x,28);gl.quadraticCurveTo(x-sd*42,24,x-sd*40,-14);gl.closePath();
    g.lineWidth=15;g.strokeStyle=OUT;g.stroke(gl);g.lineWidth=8;g.strokeStyle='#c4281f';g.stroke(gl);});
  g.lineWidth=8;g.strokeStyle='#c4281f';g.beginPath();g.moveTo(-10+tx,-14);g.lineTo(10+tx,-14);g.stroke();
  g.lineWidth=3;g.strokeStyle='#d8b04a';[-1,1].forEach(sd=>{g.beginPath();g.moveTo(sd*104+tx,-20);g.quadraticCurveTo(sd*124,120,sd*60,170);g.stroke();});
  nose(g,tx+R.turn*12,40,22);
  const f=F.face||'neutral';if(!['happy','laugh','shock'].includes(f)&&!(F.talk>0.08)){g.fillStyle='#b8283a';g.beginPath();g.ellipse(tx+R.turn*6,94,22,8,0,0,7);g.fill();}
  mouth(g,F,tx+R.turn*6,90,{w:28});
  const fr=P([-156,-190,312,290]);fr.moveTo(-152,96);fr.lineTo(-152,-84);fr.quadraticCurveTo(-152,-186,0,-188);fr.quadraticCurveTo(152,-186,152,-84);fr.lineTo(152,96);fr.lineTo(116,84);fr.lineTo(110,-64);fr.lineTo(-110,-64);fr.lineTo(-116,84);fr.closePath();
  paint(g,fr,hair,{sx:1,shadeK:0.3,shW:0.2});g.strokeStyle='rgba(120,160,220,0.35)';g.lineWidth=10;g.beginPath();g.arc(-20,-60,118,-2.7,-1.9);g.stroke();
  g.strokeStyle='rgba(255,255,255,0.12)';g.lineWidth=4;for(let x=-90;x<=90;x+=36){g.beginPath();g.moveTo(x,-150);g.lineTo(x+4,-70);g.stroke();}
  if(pose.costume==='popcorn'){g.save();g.translate(0,-178);g.rotate(-0.06);const ht=P([-140,-110,280,120]);ht.moveTo(-136,6);ht.lineTo(-112,-96);ht.quadraticCurveTo(0,-118,112,-96);ht.lineTo(136,6);ht.quadraticCurveTo(0,-12,-136,6);ht.closePath();paint(g,ht,'#ffffff',{sx:1,shW:0.2,shadeK:0.12});g.save();g.clip(ht);g.fillStyle='#d62828';g.fillRect(-150,-40,300,24);g.restore();g.lineWidth=9;g.strokeStyle=OUT;g.stroke(ht);g.restore();}
  g.save();g.translate(150,-30);g.rotate(-0.5);const pc=P([-10,-70,20,140]);pc.roundRect(-9,-70,18,130,3);paint(g,pc,'#f2c42a',{shadow:false,lw:5});g.fillStyle='#f4c8a0';g.beginPath();g.moveTo(-9,60);g.lineTo(0,82);g.lineTo(9,60);g.fill();g.stroke();g.restore();
  g.restore();armF(R.front);g.restore();g.restore();}


// ================= BOTTLES — object cast in Herr Groschen's language. Shape: PET bottle (tall cylinder + shoulder + neck + cap).
// Signature: liquid level that sloshes, label "shirt", petaloid base, rubber-hose limbs + white gloves, 25-ct sticker.
const BOT={
  flaschi:{plastic:'#d6f0ff',liquid:'#a8dcf8',cap:'#2a6ad8',label:'#ffffff',stripe:'#2a8ae8',brand:'QUELL',limbs:'#1f4f8a',shoe:'#ff8a2a',level:-760},
  kola:{plastic:'#e8d6c8',liquid:'#5a2a14',cap:'#c4281f',label:'#c4281f',stripe:'#ffffff',brand:'KOLA',limbs:'#3a1a10',shoe:'#ffffff',level:-800,lt:'#ffffff'},
  saft:{plastic:'#fff2d0',liquid:'#ffa82a',cap:'#2a9a4a',label:'#2a9a4a',stripe:'#ffd34d',brand:'SAFT',limbs:'#1f5a2a',shoe:'#ffd34d',level:-700,lt:'#ffffff'},
  leer:{plastic:'#e2f2fa',liquid:'#e2f2fa',cap:'#2a6ad8',label:'#ffffff',stripe:'#2a8ae8',brand:'QUELL',limbs:'#1f4f8a',shoe:'#ff8a2a',level:0,dusty:true},
};
function bottle(K){return function(g,pose,F,t){const R=rig(g,pose);g.save();const sq=pose.squash||0;g.scale(1+sq*0.55,1-sq*0.72);
  const bob=R.bob,lean=pose.lean||0,tx=R.turn*24,yB=-310+bob;
  const legF=sd=>{g.save();g.translate(sd*58,yB+12);const L=leg(R,sd);hose(g,L.hip,L.knee,150,140,34,K.limbs,sd,tot=>shoe(g,tot,toe(R,sd),K.shoe,{sole:'#ffffff',lace:true,size:1.05}));g.restore();};
  const armF=sd=>{const A=arm(R,sd);g.save();g.translate(sd*150,-300);hose(g,A.sh,A.el,130,120,30,K.limbs,sd,()=>{g.translate(0,10);N.glove(g,op(R,sd),sd,'#ffffff');if(pose.hold&&pose.hold[sd<0?'L':'R'])pose.hold[sd<0?'L':'R'](g);});g.restore();};
  legF(R.back);legF(R.front);g.save();g.translate(0,yB);g.rotate(lean);armF(R.back);
  // bottle silhouette (local: bottom 0, up negative)
  const body=()=>{const p=P([-170,-700,340,720]);p.moveTo(-150,-30);p.quadraticCurveTo(-150,-5,-120,8);for(let i=0;i<5;i++){const x0=-120+i*48;p.quadraticCurveTo(x0+24,30,x0+48,8);}
    p.quadraticCurveTo(150,-5,150,-30);p.lineTo(150,-400);p.bezierCurveTo(150,-470,60,-520,48,-560);p.lineTo(46,-600);p.lineTo(-46,-600);p.lineTo(-48,-560);p.bezierCurveTo(-60,-520,-150,-470,-150,-400);p.closePath();return p;};
  const b=body();paint(g,b,K.plastic,{sx:R.turn>0?-1:1,shW:0.2,shadeK:0.1});
  g.save();g.clip(b);
  if(K.level<0){const lv=K.level+310;const wob=Math.sin(t*3.1)*6+lean*120;g.fillStyle=K.liquid;g.globalAlpha=K.liquid===K.plastic?0:0.85;g.beginPath();g.moveTo(-170,lv-wob);g.quadraticCurveTo(0,lv+Math.sin(t*4)*8,170,lv+wob);g.lineTo(170,40);g.lineTo(-170,40);g.closePath();g.fill();g.globalAlpha=1;
    g.strokeStyle='rgba(255,255,255,0.7)';g.lineWidth=6;g.beginPath();g.moveTo(-150,lv-wob);g.quadraticCurveTo(0,lv+Math.sin(t*4)*8,150,lv+wob);g.stroke();}
  // label shirt
  g.fillStyle=K.label;g.fillRect(-170,-210,340,150);g.fillStyle=K.stripe;g.beginPath();g.moveTo(-170,-110);for(let x=-170;x<=170;x+=20)g.lineTo(x,-110+Math.sin(x*0.04+t*2)*10);g.lineTo(170,-60);g.lineTo(-170,-60);g.closePath();g.fill();
  g.strokeStyle=OUT;g.lineWidth=7;g.strokeRect(-175,-210,350,150);g.fillStyle=K.lt||K.stripe;g.font='900 58px Nunito, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(K.brand,tx*0.6,-160);
  // ridges + highlights
  g.strokeStyle='rgba(28,20,16,0.22)';g.lineWidth=5;[-260,-300,-20].forEach(y=>{g.beginPath();g.moveTo(-160,y);g.quadraticCurveTo(0,y+14,160,y);g.stroke();});
  g.fillStyle='rgba(255,255,255,0.55)';g.beginPath();g.roundRect(-118+tx*0.3,-470,26,380,13);g.fill();g.beginPath();g.roundRect(-80+tx*0.3,-440,10,300,5);g.fill();
  if(K.dusty){g.fillStyle='rgba(120,110,90,0.25)';for(let i=0;i<40;i++){g.beginPath();g.arc((Math.sin(i*12.9)*0.5)*300,-Math.abs(Math.cos(i*7.3))*560,6+i%5*2,0,7);g.fill();}}
  g.restore();g.lineWidth=9;g.strokeStyle=OUT;g.stroke(b);
  // 25 ct sticker
  g.save();g.translate(112+tx*0.4,-118);g.rotate(0.25);const st=P([-38,-38,76,76]);st.arc(0,0,36,0,7);paint(g,st,'#ff8a2a',{shadow:false,lw:6});g.fillStyle='#ffffff';g.font='900 24px Nunito, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('25ct',0,1);g.restore();
  // cap
  const cp=P([-60,-690,120,100]);cp.roundRect(-56,-668,112,72,14);paint(g,cp,K.cap,{sx:1,shW:0.25});g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=5;for(let x=-44;x<=44;x+=14){g.beginPath();g.moveTo(x,-662);g.lineTo(x,-602);g.stroke();}
  const ring=P([-62,-604,124,18]);ring.roundRect(-62,-604,124,16,6);paint(g,ring,K.cap,{shadow:false,lw:6});hl(g,-30,-650,14,8,0.4);
  // face on the shoulder area
  g.save();g.translate(tx,-370);g.rotate(pose.headTilt||0);
  eyes(g,F,0,0,{sx:64,rx:36,ry:43,iris:'#1f3a6a'});brows(g,F,0,-88,64,'#1f3a6a',13);
  g.fillStyle='rgba(255,120,120,0.22)';[-1,1].forEach(sd=>{g.beginPath();g.ellipse(sd*96,52,22,12,0,0,7);g.fill();});
  mouth(g,F,R.turn*8,92,{w:40});g.restore();
  armF(R.front);g.restore();g.restore();};}
window.cast2d={draw:{jule,kevin,brandt,flaschi:bottle(BOT.flaschi),kola:bottle(BOT.kola),saft:bottle(BOT.saft),leer:bottle(BOT.leer)},
  top:{jule:2.15,kevin:2.4,brandt:2.15,flaschi:1.75,kola:1.75,saft:1.75,leer:1.75},face:{jule:1.5,kevin:1.9,brandt:1.75,flaschi:1.2,kola:1.2,saft:1.2,leer:1.2}};
})();
