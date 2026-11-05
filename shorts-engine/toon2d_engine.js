// ---------- Toon2D: drawn 2D characters standing in the 3D world ----------
// Billboard plane redrawn every frame from a 2D skeleton; lit by scene lights, casts/receives shadows.
// Motion: walk cycle (legs + bob), gestures with anticipation, spring dynamics on arms/lean/head (mass + overshoot),
// idle sway, blinks, eye saccades, talk (mouth from narration envelope).
const U2M=0.00175; // character units -> metres (1000 units = 1.75 m)
const G2={ // 2D gesture keyframes; arm angles in canvas radians (0 = hanging; right arm raise = negative sh)
  point:{dur:0.9,keys:[[0,'cur'],[0.4,{R:{sh:-2.0,el:-0.5},lean:-0.04}],[0.6,{R:{sh:-2.25,el:-0.25},lean:0.02}],[1,{R:{sh:-2.2,el:-0.3}}]],hold:true,open:'R'},
  wave:{dur:1.2,keys:[[0,'cur'],[0.25,{R:{sh:-2.6,el:-0.4}}],[0.45,{R:{sh:-2.6,el:0.3}}],[0.65,{R:{sh:-2.6,el:-0.4}}],[0.85,{R:{sh:-2.6,el:0.3}}],[1,'base']],open:'R'},
  shrug:{dur:1.0,keys:[[0,'cur'],[0.4,{L:{sh:0.95,el:-1.9},R:{sh:-0.95,el:1.9},lean:0,head:0.1}],[0.75,{L:{sh:0.9,el:-1.85},R:{sh:-0.9,el:1.85},head:0.12}],[1,'base']],open:'LR'},
  explain:{dur:1.2,keys:[[0,'cur'],[0.35,{L:{sh:0.35,el:-1.3},R:{sh:-0.55,el:1.45}}],[0.7,{L:{sh:0.45,el:-1.1},R:{sh:-0.45,el:1.25}}],[1,'base']],open:'LR'},
  sniff:{dur:1.4,keys:[[0,'cur'],[0.35,{lean:-0.08,head:-0.18}],[0.8,{lean:-0.1,head:-0.2}],[1,'base']]},
  eat:{dur:0.6,keys:[[0,'cur'],[0.45,{R:{sh:2.5,el:1.7},head:0.06}],[1,'base']]},
  pay:{dur:0.9,keys:[[0,'cur'],[0.4,{R:{sh:-1.3,el:0.2},lean:0.06}],[0.7,{R:{sh:-1.35,el:0.1},lean:0.07}],[1,'base']],open:'R'},
  monocle:{dur:1.3,keys:[[0,'cur'],[0.35,{R:{sh:2.8,el:2.2},head:-0.06}],[0.55,{R:{sh:2.75,el:2.3},head:-0.1}],[0.8,{R:{sh:2.8,el:2.2},head:-0.04}],[1,'base']],open:''},
  slam:{dur:0.7,keys:[[0,'cur'],[0.4,{L:{sh:2.4,el:0.4},R:{sh:-2.4,el:-0.4},lean:-0.06}],[0.6,{L:{sh:0.5,el:0},R:{sh:-0.5,el:0},lean:0.1}],[1,'base']]},
  nod:{dur:0.6,keys:[[0,'cur'],[0.4,{head:0.22}],[1,{head:0}]]},
};
const BASE2={down:{L:{sh:0.14,el:0.12},R:{sh:-0.14,el:-0.12}},hips:{L:{sh:0.95,el:-1.9},R:{sh:-0.95,el:1.9}},hold:{L:{sh:-0.4,el:-1.4},R:{sh:0.4,el:1.4}},cross:{L:{sh:-0.2,el:-2.1},R:{sh:0.2,el:2.1}}};
class Toon2D{
  constructor(parent,x,z,spec,s=1,{y=0,kind=null,ry=0,flipBase=false}={}){this.spec=spec;this.kind=kind;this.s=s;this.home=new THREE.Vector3(x,y,z);this.homeRy=ry;this.acts=[];this.flipBase=flipBase;this.tint=new THREE.Color(1,1,1);
    this.tex=ctex(768,1152);const w=1024*U2M*s,h=1536*U2M*s;const geo=new THREE.PlaneGeometry(w,h);geo.translate(0,h/2-40*U2M*s,0);
    this.mat=NO(new THREE.MeshLambertMaterial({map:this.tex.t,transparent:true,alphaTest:0.5,side:THREE.DoubleSide}));
    this.mesh=new THREE.Mesh(geo,this.mat);this.mesh.castShadow=true;this.mesh.receiveShadow=false;this.mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:this.tex.t,alphaTest:0.5});
    this.mesh.position.copy(this.home);parent.add(this.mesh);this.root=this.mesh;}
  plan(list){this.acts=list;return this;}
  _walk(lt){let pos=this.home.clone(),dir=0,k=0,dist=0;const first=this.acts.find(a=>a.type==='walk');
    for(const a of this.acts){if(a.type!=='walk')continue;const from=a.from?new THREE.Vector3(a.from[0],this.home.y,a.from[1]):pos.clone();const to=new THREE.Vector3(a.to[0],this.home.y,a.to[1]);
      if(lt<a.t){if(a===first&&a.from)pos=from;break;}const u=clamp((lt-a.t)/a.dur);const e=u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;pos=from.clone().lerp(to,e);dist=from.distanceTo(to)*e;dir=Math.sign(to.x-from.x)||dir;
      if(u<1)k=Math.min(1,Math.min(lt-a.t,a.t+a.dur-lt)/0.25);}
    return {pos,k,dist,dir,ry:this.homeRy};}
  _gesture(lt,base){let g=null;for(const a of this.acts)if(a.type==='g'&&lt>=a.t)g=a;const B={L:base.L,R:base.R,lean:0,head:0};if(!g)return {P:B,open:''};
    const G=G2[g.g];const u=(lt-g.t)/G.dur;const K=G.keys.map(([k,v])=>[k,v==='cur'||v==='base'?B:{L:v.L||base.L,R:v.R||base.R,lean:v.lean||0,head:v.head||0}]);
    if(!G.hold)K.push([1+0.45/G.dur,B]);if(u>K[K.length-1][0])return {P:B,open:''};const uu=clamp(u,0,K[K.length-1][0]);let i=0;while(i<K.length-2&&uu>K[i+1][0])i++;
    const A=K[i][1],Bk=K[i+1][1],w=smooth(clamp((uu-K[i][0])/(K[i+1][0]-K[i][0])));const L=(s2,k2)=>lerp(A[s2][k2],Bk[s2][k2],w);
    return {P:{L:{sh:L('L','sh'),el:L('L','el')},R:{sh:L('R','sh'),el:L('R','el')},lean:lerp(A.lean,Bk.lean,w),head:lerp(A.head,Bk.head,w)},open:G.open||''};}
  _targets(lt,o){const base=BASE2[o.pose||'down']||BASE2.down;const W=this._walk(lt);const Gs=this._gesture(lt,base);const P=Gs.P;const k=W.k;const ph=W.dist/(0.95*this.s)*Math.PI*2;const sn=Math.sin(ph);
    const seed=this.home.x*1.3+this.home.z;const idle=1-k;const sway=Math.sin(lt*0.6+seed);
    if(!Gs.open&&(o.pose||'down')==='down'){P.L.sh+=-0.35*sn*k;P.R.sh+=-0.35*sn*k;}
    const legs={L:{hip:0.42*sn*k+idle*0.03*sway,knee:Math.max(0,-Math.cos(ph))*0.7*k},R:{hip:-0.42*sn*k-idle*0.03*sway,knee:Math.max(0,Math.cos(ph))*0.7*k}};
    return {W,flat:[P.L.sh+idle*0.025*Math.sin(lt*1.8+seed),P.L.el,P.R.sh-idle*0.025*Math.sin(lt*1.8+seed+1),P.R.el,P.lean+0.04*k+idle*0.012*sway,P.head+idle*0.02*Math.sin(lt*0.9+seed)],legs,open:Gs.open,bob:-Math.abs(Math.cos(ph))*14*k+idle*3*Math.sin(lt*1.9+seed)};}
  _step(lt,o){const T=this._targets(lt,o);const WN=[15,17,15,17,10,8],Z=[0.68,0.66,0.68,0.66,0.85,0.8];if(!this._dyn)this._dyn={x:T.flat.slice(),v:T.flat.map(()=>0)};const D=this._dyn;
    for(let s2=0;s2<4;s2++){const h=1/120;for(let i=0;i<T.flat.length;i++){const a=WN[i]*WN[i]*(T.flat[i]-D.x[i])-2*Z[i]*WN[i]*D.v[i];D.v[i]+=a*h;D.x[i]+=D.v[i]*h;}}return T;}
  anchor(n){const p=this.mesh.position; // fitShot places the mesh at the shot time before asking for anchors
    const top=this.kind==='coin'?2.15:(this.spec.hat?2.05:1.95);const y={feet:0,knee:0.45,chest:1.15,face:1.62,top}[n]*this.s;return new THREE.Vector3(p.x,p.y+y,p.z);}
  update(lt,st={}){const o={...st};if(this._lastT===undefined||Math.abs(lt-this._lastT)>1e-6){const seq=this._lastT!==undefined&&Math.abs(lt-this._lastT-1/30)<0.002;
      if(!seq){this._dyn=null;for(let k2=45;k2>=1;k2--)this._step(lt-k2/30,o);}this._last=this._step(lt,o);this._lastT=lt;}
    const T=this._last,D=this._dyn.x;this.mesh.position.copy(T.W.pos);
    this.mesh.rotation.y=Math.atan2(camera.position.x-T.W.pos.x,camera.position.z-T.W.pos.z);
    // facing: while walking show a 3/4 turn toward the walk direction (relative to the camera's right vector)
    const camR=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);const wdir=T.W.k>0.05?Math.sign(T.W.dir*camR.x||T.W.dir):0;
    const turn=o.turn!==undefined?o.turn:(T.W.k>0.05?0.55*wdir:0);
    const F={...(o.f||{face:'neutral',eye:1})};F.look=o.look!==undefined?o.look:((rnd(Math.floor((lt+this.home.x)/1.2)*3.7)-0.5)*0.8);if(o.talk!==undefined)F.talk=o.talk;
    const pose={arms:{L:{sh:D[0],el:D[1]},R:{sh:D[2],el:D[3]}},legs:T.legs,lean:D[4],headTilt:D[5],turn,bob:T.bob,handOpen:{L:T.open.includes('L'),R:T.open.includes('R')},hold:o.hold};
    this.mat.color.copy(this.tint);
    this.tex.paint(g=>{g.translate(384,1122);g.scale(0.75*(this.flipBase?-1:1),0.75);if(this.kind)window.narrators.drawNarrator(g,this.kind,pose,F,lt);else window.cartoon2d.drawRig2D(g,this.spec,pose,F);});}
}
