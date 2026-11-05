"""Build food-short/render3d.html = shared engine (from the beer short) + story.js, with engine upgrades."""
import re
src = open('../bier-short/v2/render3d.html').read()
lines = src.split('\n')
i_sc = next(i for i, l in enumerate(lines) if l.startswith('// ================= SCENES'))
i_co = next(i for i, l in enumerate(lines) if l.startswith('// ================= compositor'))
engine = '\n'.join(lines[:i_sc])
comp = '\n'.join(lines[i_co:])
story = open('story.js').read()
s = engine + '\nconst DEF={};\n' + story + '\n' + comp


def rep(a, b, cnt=1):
    global s
    assert a in s, a[:100]
    s = s.replace(a, b, cnt)


# ---- story-driven compositor bits ----
s = re.sub(r"const RIMMAP=\{[^\n]*\};", "const RIMMAP=STORY.rim;", s)
s = re.sub(r"const KEYW=\[[^\n]*\];", "const KEYW=STORY.keywords;", s)
rep("const l1='1516',l2='DAS SELTSAMSTE BIERGESETZ';", "const l1=STORY.title[0],l2=STORY.title[1];")

# ---- Char3D upgrades ----
rep("this.skinM=M(skin);const cl=M(robeC),cloth2=M(dk(robeC,0.3)),shoe=M('#3a2418');",
    "this.skinM=M(skin);const stripe=o.pattern==='stripes'?tiled(64,64,6,3,gg=>{gg.fillStyle=robeC;gg.fillRect(0,0,64,64);gg.fillStyle=lt(robeC,0.55);gg.fillRect(0,0,64,14);}):null;\n    const cl=stripe?M('#ffffff',{map:stripe}):M(robeC),cloth2=M(dk(robeC,0.3)),shoe=M('#3a2418');")
rep("mesh(new THREE.CapsuleGeometry(0.085,0.5,6,12),M(o.pants||'#3d3a48'),0,-0.38,0,hp);",
    "mesh(new THREE.CapsuleGeometry(0.085,0.5,6,12),o.pattern==='stripes'?cl:M(o.pants||'#3d3a48'),0,-0.38,0,hp);")
rep("const head=this.head=new THREE.Group();head.position.set(0,1.64,0);head.scale.setScalar(0.74);body.add(head);",
    "const head=this.head=new THREE.Group();head.position.set(0,1.64,0);head.scale.setScalar(0.74*(o.headScale||1));body.add(head);")
rep("const sleeve=kind==='brewer'?M('#e9dcc0'):cl;", "const sleeve=o.sleeves==='skin'?this.skinM:kind==='brewer'?M('#e9dcc0'):cl;")
rep("    this.faceKey='';", "    this.faceKey='';\n    if(o.glasses){const gm2=M('#1a1a1e');[-1,1].forEach(sd=>{const r=mesh(new THREE.TorusGeometry(0.07,0.012,8,20),gm2,sd*0.085,0.0,0.27,head);});box(0.06,0.012,0.012,gm2,0,0.0,0.285,head);}")
# hand items: donut, chips, food
rep("this.items.stamp=st;", "this.items.stamp=st;\n    this.items.donut=donut3d(R,0,-0.06,0.1,0.45);this.items.chips=chipsBag(R,0,-0.28,0.08,0.55);this.items.food=sph(0.08,M('#a8443a'),0,-0.05,0.09,R,1.2,1,1);")
# sitting, belly
rep("this.hips.forEach((h,i)=>h.rotation.x=(i?-1:1)*sw*0.55);",
    "this.hips.forEach((h,i)=>h.rotation.x=this.o.sit?-1.5:(i?-1:1)*sw*0.55);")
rep("const br=Math.sin(TT*2.1+this.home.x*3)*0.01;this.body.scale.set(1,1+br,1);",
    "const br=Math.sin(TT*2.1+this.home.x*3)*0.01;const bel=1+(st.belly||0)*0.32;this.body.scale.set(bel,1+br,bel);")
rep("const want=Gs.item||(o.item==='bread'?'bread':(pn==='mug'||pn==='mugUp')?'mug':pn==='stir'?'paddle':pn==='shovel'?'shovel':null);",
    "const want=Gs.item&&Gs.item!=='hand'?Gs.item:(['donut','chips','food'].includes(o.item)?o.item:o.item==='bread'?'bread':(pn==='mug'||pn==='mugUp')?'mug':pn==='stir'?'paddle':pn==='shovel'?'shovel':null);")
# sitting: lower the body so the pelvis rests on the seat
rep("this.body.position.y=Math.abs(Math.cos(ph))*0.035*W.k;", "this.body.position.y=Math.abs(Math.cos(ph))*0.035*W.k-(this.o.sit?0.36:0);")
# new gestures + cart pose
rep("  nod:{dur:0.6,", "  pull:{dur:0.9,keys:[[0,'cur'],[0.35,{R:{f:-1.3,o:0.35,e:-0.3},lean:0.06}],[0.7,{R:{f:-0.7,o:0.8,e:-1.0},lean:-0.06}],[1,{R:{f:-0.3,o:0.4,e:-0.6}}]]},\n  reach:{dur:1.0,keys:[[0,'cur'],[0.45,{R:{f:-1.25,o:0.05,e:-0.15},lean:0.14}],[0.75,{R:{f:-1.2,o:0.05,e:-0.3},lean:0.12}],[1,{R:{f:-0.6,o:0.1,e:-1.2},lean:0.03}]]},\n  eat:{dur:0.55,keys:[[0,'cur'],[0.45,{R:{f:-1.25,o:-0.15,e:-2.25},headP:0.05}],[1,'base']]},\n  nod:{dur:0.6,")
rep("const POSE3={", "const POSE3={\n  cart:{L:{f:-0.85,o:-0.05,e:-0.75},R:{f:-0.85,o:-0.05,e:-0.75}},")
# follow camera: shot[6]={follow:name} keeps the subject while it walks
rep("function driftState(o,k,tau){const F=o._fit[k];return {c:F.c.clone().add(new THREE.Vector3(0,DRIFT.rise*tau*F.dist,0)),",
    "function driftState(o,k,tau,lt){const F=o._fit[k];const fo=o.shots[k][6];const c=F.c.clone();if(fo&&fo.follow&&lt!==undefined){const ch=o.anchors[fo.follow];c.add(ch._walk(lt).pos.sub(ch._walk(o.shots[k][0]).pos));}return {c:c.add(new THREE.Vector3(0,DRIFT.rise*tau*F.dist,0)),")
rep("function segState(seg,t){const o=getScene(TL.scenes[seg.si].name);return driftState(o,seg.k,t-seg.start+0.4);}",
    "function segState(seg,t){const o=getScene(TL.scenes[seg.si].name);return driftState(o,seg.k,t-seg.start+0.4,t-TL.scenes[seg.si].start);}")
# fit with the subject at the start of its shot (characters may have walked)
rep("function fitShot(sh,o){const [t,tr,pts,yaw,pitch,minS]=sh;",
    "function fitShot(sh,o){const [t,tr,pts,yaw,pitch,minS]=sh;if(o.anchors)Object.values(o.anchors).forEach(c=>{if(c._walk){const w=c._walk(t);c.root.position.copy(w.pos);c.root.rotation.y=w.ry;}});")
# QA: is anything solid between the shot subject and the camera (e.g. camera behind a wall)?
rep("const nearCut=SEGS.some(g=>Math.abs(t-g.start)<0.3);",
    "const nearCut=SEGS.some(g=>Math.abs(t-g.start)<0.3);const sc0=segState(seg,t);const ray=new THREE.Raycaster();ray.camera=camera;const toCam=camera.position.clone().sub(sc0.c);const dC=toCam.length();ray.set(sc0.c,toCam.normalize());ray.far=dC;\n  const blk=ray.intersectObjects(o.sc.children,true).filter(h=>h.object.isMesh&&h.object.visible&&h.object.material&&!h.object.material.transparent&&h.distance>0.6*dC&&!(h.object.parent&&h.object.parent.parent&&h.object.parent.parent.isGroup&&false));const blocked=blk.length?blk[0].object.geometry.type:null;")
rep("return {f,t:+t.toFixed(2),scene:sc.name,k:seg.k,lum:+L.toFixed(1),bad,nearCut,thumb};","return {f,t:+t.toFixed(2),scene:sc.name,k:seg.k,lum:+L.toFixed(1),bad,nearCut,blocked,thumb};")
rep("const DRIFT={push:0.028,","const DRIFT={push:0.02,")
open('render3d.html', 'w').write(s)
print('assembled', len(s))

exec(open('anim2.py').read())
