"""Natural motion core: knees + pelvis + spine, spring dynamics on all joints (mass, overshoot, head lag),
proper gait (knee bend in swing, pelvis bob/sway, torso counter-rotation), idle weight shift and eye saccades.
Applied to render3d.html after assemble.py."""
p = 'render3d.html'
s = open(p).read()


def rep(a, b, cnt=1):
    global s
    assert a in s, a[:100]
    s = s.replace(a, b, cnt)


# ---- legs with knees ----
rep("this.hips=[];if(!long){[-1,1].forEach(sd=>{const hp=new THREE.Group();hp.position.set(sd*0.11,0.8,0);body.add(hp);mesh(new THREE.CapsuleGeometry(0.085,0.5,6,12),o.pattern==='stripes'?cl:M(o.pants||'#3d3a48'),0,-0.38,0,hp);sph(0.1,shoe,0,-0.74,0.05,hp,1,0.6,1.5);this.hips.push(hp);});}",
    "this.hips=[];this.knees=[];if(!long){const pm=o.pattern==='stripes'?cl:M(o.pants||'#3d3a48');[-1,1].forEach(sd=>{const hp=new THREE.Group();hp.position.set(sd*0.11,0.86,0);body.add(hp);"
    "mesh(new THREE.CapsuleGeometry(0.088,0.3,6,12),pm,0,-0.21,0,hp);const kn=new THREE.Group();kn.position.set(0,-0.42,0);hp.add(kn);"
    "mesh(new THREE.CapsuleGeometry(0.078,0.3,6,12),pm,0,-0.2,0,kn);const ft=new THREE.Group();ft.position.set(0,-0.4,0);kn.add(ft);sph(0.1,shoe,0,-0.03,0.05,ft,1,0.55,1.55);"
    "this.hips.push(hp);this.knees.push(kn);});}")
# ---- spine: everything above the waist moves into a chest pivot ----
rep("Object.values(this.items).forEach(it=>it.visible=false);",
    "Object.values(this.items).forEach(it=>it.visible=false);\n"
    "    const chest=this.chest=new THREE.Group();chest.position.set(0,0.95,0);[...body.children].forEach(ch=>{if(ch!==chest&&ch.position.y>0.95&&!this.hips.includes(ch)){body.remove(ch);ch.position.y-=0.95;chest.add(ch);}});body.add(chest);")

# ---- new update: targets -> springs -> joints ----
a = s.index("  update(lt,st={}){const o={...this.o,...st};const F=o.f||{face:'neutral',eye:1};\n    const pn=o.pose||'down';")
b = s.index("  _blend(lt){")
new = r'''  // ---------- motion: compute targets, then integrate joint springs (mass, overshoot, lag) ----------
  _targets(lt,o){const pn=o.pose||'down';const base=JSON.parse(JSON.stringify(POSE3[pn]||POSE3.down));const W=this._walk(lt);
    const Gs=this._gesture(lt,base);const P=JSON.parse(JSON.stringify(Gs.P));const k=W.k;const ph=W.dist/(0.92*this.s)*Math.PI*2;const sn=Math.sin(ph),cs=Math.cos(ph);
    const seed=this.home.x*1.7+this.home.z*0.9;
    if(pn==='stir'){P.R.f+=Math.sin(TT*3.6)*0.22;P.R.o+=Math.cos(TT*3.6)*0.16;P.L.f+=Math.sin(TT*3.6)*0.18;}
    if(pn==='shovel'){const d=Math.pow(Math.max(0,Math.sin(TT*3.2)),2);P.R.f+=-0.5*d;P.L.f+=-0.45*d;Gs.lean+=0.18*d;}
    // arm swing while walking (opposite to the same-side leg), elbows soften on the forward swing
    if(pn==='down'&&!Gs.item){P.L.f+=0.42*sn*k;P.R.f+=-0.42*sn*k;P.L.e+=-0.25*k*Math.max(0,-sn);P.R.e+=-0.25*k*Math.max(0,sn);}
    // idle: slow weight shift + breathing, arms hang with a little life
    const idle=1-k;const ws=Math.sin(lt*0.55+seed);const brth=Math.sin(lt*1.9+seed);
    P.L.f+=0.03*brth*idle;P.R.f+=-0.025*brth*idle;P.L.o+=0.02*ws*idle;P.R.o+=-0.02*ws*idle;
    // legs (kinematic so feet do not slide): thigh swing, knee bend in swing phase, idle soft knee on the unweighted leg
    const legs=[0,1].map(i=>{const p2=ph+(i?Math.PI:0);const s2=Math.sin(p2),c2=Math.cos(p2);let th=-0.48*s2*k,kn=(0.08+0.95*Math.pow(Math.max(0,c2),1.4))*k;
      if(this.o.sit){th=-1.5;kn=1.5;}else{kn+=idle*(i?Math.max(0,ws):Math.max(0,-ws))*0.12;th+=idle*(i?Math.max(0,ws):Math.max(0,-ws))*-0.06;}return {th,kn,ft:-th-kn*0.6};});
    const pel={y:(0.028*Math.cos(2*ph)-0.012)*k+(this.o.sit?-0.33:0)-idle*0.008*Math.abs(ws),x:0.022*sn*k+idle*0.018*ws,roll:-0.04*sn*k+idle*0.025*ws};
    const chest={p:Gs.lean+0.07*k+idle*0.012*brth,y:0.13*sn*k,r:0.03*sn*k-idle*0.02*ws};
    // head: look target (act/state) or camera; keeps level while the pelvis rolls
    let tgt=null;for(const a2 of this.acts)if(a2.type==='look'&&lt>=a2.t)tgt=a2.at;if(o.lookAt)tgt=o.lookAt;
    const wp=W.pos.clone().add(new THREE.Vector3(0,1.64*this.s,0));const T=tgt?new THREE.Vector3(...tgt):camera.position;const dx=T.x-wp.x,dz=T.z-wp.z,dy=T.y-wp.y;
    let yaw=Math.atan2(dx,dz)-W.ry;yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
    const head={y:clamp(yaw,-0.75,0.75)*(tgt?0.85:0.55)-chest.y*0.8,p:clamp(-Math.atan2(dy,Math.hypot(dx,dz)),-0.35,0.35)*(tgt?0.8:0.3)+Gs.headP-chest.p*0.5,r:-pel.roll*0.6-chest.r+Math.sin(lt*0.8+seed)*0.02};
    return {W,P,legs,pel,chest,head,item:Gs.item};}
  _step(lt,o){const T=this._targets(lt,o);const dt=1/30;
    const flat=[T.chest.p,T.chest.y,T.chest.r,T.head.y,T.head.p,T.head.r,T.P.L.f,T.P.L.o,T.P.L.e,T.P.R.f,T.P.R.o,T.P.R.e];
    // natural frequencies (rad/s) and damping per DOF: spine medium, head slower (follows), arms quick with slight overshoot
    const WN=[11,11,11,8,8,8,15,15,17,15,15,17],Z=[0.85,0.85,0.85,0.8,0.8,0.8,0.68,0.7,0.66,0.68,0.7,0.66];
    if(!this._dyn)this._dyn={x:flat.slice(),v:flat.map(()=>0)};const D=this._dyn;
    for(let sub=0;sub<4;sub++){const h=dt/4;for(let i=0;i<flat.length;i++){const w=WN[i],z=Z[i];const acc=w*w*(flat[i]-D.x[i])-2*z*w*D.v[i];D.v[i]+=acc*h;D.x[i]+=D.v[i]*h;}}
    return T;}
  _apply(T,o){const D=this._dyn.x;this.root.position.copy(T.W.pos);this.root.rotation.y=T.W.ry;
    this.body.position.set(T.pel.x,T.pel.y,0);this.body.rotation.set(0,0,T.pel.roll);
    this.chest.rotation.set(D[0],D[1],D[2],'YXZ');this.head.rotation.set(D[4],D[3],D[5],'YXZ');
    this.hips.forEach((h,i)=>{h.rotation.x=T.legs[i].th;});this.knees.forEach((kn,i)=>{kn.rotation.x=T.legs[i].kn;kn.children[1]&&(kn.children[1].rotation.x=T.legs[i].ft);});
    const A=[{f:D[6],o:D[7],e:D[8]},{f:D[9],o:D[10],e:D[11]}];this.arms.forEach((a,i)=>{const q=a.sd<0?A[0]:A[1];a.sh.rotation.set(q.f,0,a.sd*q.o);a.el.rotation.set(Math.min(0.05,q.e),0,0);});}
  update(lt,st={}){const o={...this.o,...st};const F=o.f||{face:'neutral',eye:1};const pn=o.pose||'down';
    if(this._lastT!==undefined&&Math.abs(lt-this._lastT)<1e-6){/* same frame rendered twice (dissolve) */}
    else{const seq=this._lastT!==undefined&&Math.abs(lt-this._lastT-1/30)<0.002;
      if(!seq){this._dyn=null;for(let k2=45;k2>=1;k2--)this._step(lt-k2/30,o);}
      this._T=this._step(lt,o);this._lastT=lt;}
    const T=this._T;this._apply(T,o);
    // items
    const it=this.items;const want=T.item&&T.item!=='hand'?T.item:(['donut','chips','food'].includes(o.item)?o.item:o.item==='bread'?'bread':(pn==='mug'||pn==='mugUp')?'mug':pn==='stir'?'paddle':pn==='shovel'?'shovel':null);
    Object.keys(it).forEach(n=>it[n].visible=n===want);if(o.item==='bread')it.bread.visible=true;
    const bel=1+(st.belly||0)*0.32;this.body.scale.set(bel,1,bel);
    this.skinM.color.set(o.tint?mix(this.o.skin||SKIN[0],o.tint,0.5):(this.o.skin||SKIN[0]));
    // eyes: small saccades every ~0.6-1.8 s unless a look direction is forced
    const sacc=Math.floor((lt+this.home.x)/1.1);const lookX=o.look!==undefined&&o.look!==0?o.look:((rnd(sacc*3.7+this.home.z)-0.5)*0.9);
    const key=JSON.stringify([F.face,Math.round(F.eye*10),Math.round(lookX*4),!!o.sweat,o.sweat?Math.floor(TT*12):0]);
    if(key!==this.faceKey){this.faceKey=key;this.faceTex.paint(g=>{g.translate(256,166);g.scale(1.85,1.85);drawFaceAdult(F,{kind:this.kind,sweat:o.sweat,look:lookX,beard:o.beard,iris:o.iris});});}}
'''
s = s[:a] + new + s[b:]
# anchors must follow the animated body (chest), use the walk position for the root
rep("this.root.updateMatrixWorld(true);return this.root.localToWorld(v);}", "this.root.updateMatrixWorld(true);return this.root.localToWorld(v);}")
# segment warm-up helper: step characters sequentially without rendering
rep("window.renderFrame=f=>{", "window.simFrame=f=>{const t=f/30;TT=t;setT(t);if(!SEGS)buildSegs();let j=SEGS.findIndex(g=>t>=g.start&&t<g.end);if(j<0)j=SEGS.length-1;const XF=0.42;const ids=new Set([j]);if(j+1<SEGS.length&&t>SEGS[j].end-XF/2)ids.add(j+1);if(j>0&&t<SEGS[j].start+XF/2)ids.add(j-1);\n  ids.forEach(i=>{const seg=SEGS[i];const sc=TL.scenes[seg.si];const o=getScene(sc.name);applyState(segState(seg,t));o.update(t-sc.start);});};\nwindow.renderFrame=f=>{")
open(p, 'w').write(s)
print('anim2 applied')
