"""Build render3d.html = shared 3D engine (food-short build) + Toon2D + kit.js + story.js, with story-format engine settings."""
import shutil
for f in ("cartoon2d.js", "narrators.js", "cast2d.js"):  # shared character code lives in shorts-engine
    shutil.copy("../shorts-engine/" + f, f)
src = open('../food-short/render3d.html').read()
lines = src.split('\n')
i_def = next(i for i, l in enumerate(lines) if l.startswith('const DEF={};'))
i_co = next(i for i, l in enumerate(lines) if l.startswith('// ================= compositor'))
toon = open('../shorts-engine/toon2d_engine.js').read()
s = '\n'.join(lines[:i_def + 1]) + '\n' + toon + '\n' + open('kit.js').read() + '\n' + open('helpers.js').read() + '\n' + open('story.js').read() + '\n' + '\n'.join(lines[i_co:])
a = '<script src="lib2d.js"></script>'
s = s.replace(a, a + '\n<script src="cartoon2d.js"></script>\n<script src="narrators.js"></script>\n<script src="cast2d.js"></script>', 1)
def rep(a, b, n=1):
    global s
    assert a in s, a[:90]
    s = s.replace(a, b, n)
rep("const SAFE={x:0.84,y:0.5};", "const SAFE={x:0.84,y:0.6};")
rep("const LOOKY=0.33;", "const LOOKY=0.37;")
rep("mctx.translate(W/2,H*0.645)", "mctx.translate(W/2,H*0.66)")
rep("g.filter='contrast(1.08) saturate(0.86)';g.drawImage(glc,0,0)", "g.filter='contrast(1.06) saturate(0.95) brightness(1.08)';g.drawImage(glc,0,0)")
# reference pacing: livelier drift (push-ins), short moving dissolves, optional pull-back reveal
rep("const DRIFT={push:0.02,", "const DRIFT={push:0.045,")
rep("dist:F.dist*Math.max(0.78,1-DRIFT.push*tau)}", "dist:F.dist*(fo&&fo.pull?1+(fo.pull===true?DRIFT.push*2.2*tau:(fo.pull-1)*smooth(Math.min(1,Math.max(0,(tau-0.4)/2.4)))):Math.max(0.72,1-DRIFT.push*tau))}")
rep("const XF=0.42;", "const XF=0.24;", 2)
rep("start:k===0?sc.start:sc.start+sh[0]-0.3", "start:k===0?sc.start:sc.start+sh[0]-0.05")
rep("window.renderFrame=", "window.getScene=getScene;window.__segs=()=>SEGS.map(g=>({start:g.start,end:g.end,k:g.k,scene:TL.scenes[g.si].name}));window.renderFrame=")

# ---------- lighting: key/fill ratio ~3:1 instead of flat hemisphere fill; every scene gets a shadow-casting key ----------
rep("function lightsBasic(scene,{hemi=['#ffffff','#444444',0.6],sun=null,amb=0}){const hl=new THREE.HemisphereLight(hemi[0],hemi[1],hemi[2]);scene.add(hl);",
    "function lightsBasic(scene,{hemi=['#ffffff','#444444',0.6],sun=null,amb=0,keep=false}){const hl=new THREE.HemisphereLight(hemi[0],hemi[1],keep?hemi[2]:hemi[2]*LIGHT.fill);scene.add(hl);if(!sun&&!keep)sun={c:'#fff2e0',i:1.0,p:[4,9,7],t:[0,0,-2],r:12};")
rep("let dl=null;if(sun){dl=new THREE.DirectionalLight(sun.c,sun.i);", "let dl=null;if(sun){dl=new THREE.DirectionalLight(sun.c,keep?sun.i:sun.i*LIGHT.key);")
rep("dl.shadow.bias=-0.0006;dl.shadow.radius=3;", "dl.shadow.bias=-0.0006;dl.shadow.normalBias=0.02;dl.shadow.radius=5;dl.shadow.blurSamples=16;")
rep("const FOV=40;", "const FOV=40;\nconst LIGHT={fill:0.38,key:2.6};")
# shadow catcher: readable cast shadows from the key even where practical lights fill the floor
rep("if(amb){scene.add(new THREE.AmbientLight('#ffffff',amb));}return {hl,dl};}",
    "if(amb){scene.add(new THREE.AmbientLight('#ffffff',amb));}if(dl&&!keep){shadowCatcher(scene,0.008,LIGHT.catcher);}return {hl,dl};}\nfunction shadowCatcher(scene,y,op,size=60,x=0,z=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.ShadowMaterial({color:'#1a0c20',opacity:op}));m.material.userData.outlineParameters={visible:false};m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=false;m.renderOrder=2;scene.add(m);return m;}")
rep("const LIGHT={fill:0.38,key:2.6};", "const LIGHT={fill:0.38,key:2.6,catcher:0.4};")
# ---------- camera collision ("spring arm"): the camera never goes through objects marked userData.wall ----------
rep("function applyState(st){", "const CRAY=new THREE.Raycaster();\nfunction collide(o,st){if(!o._walls){o.sc.updateMatrixWorld(true);o._walls=[];o.sc.traverse(m=>{if(m.isMesh&&m.userData.wall)o._walls.push(m);});}if(!o._walls.length)return st;\n  const d=dirFrom(st.yaw,st.pitch);CRAY.set(st.c,d);CRAY.near=0.05;CRAY.far=st.dist;const h=CRAY.intersectObjects(o._walls,false)[0];if(h){st={...st,dist:Math.max(0.6,h.distance-0.35)};st.hit=true;const q=h.object.getWorldPosition(new THREE.Vector3()),gp=h.object.geometry.parameters;st.hitInfo=[gp.width,gp.height,gp.depth,q.x,q.y,q.z].map(v=>+(+v).toFixed(2)).join(',')+' at '+h.distance.toFixed(2)+' of '+st.dist.toFixed(2);}return st;}\nfunction applyState(st){")
rep("applyState(segState(seg,t));RIMC.value.set(", "applyState(collide(o,segState(seg,t)));RIMC.value.set(")
rep("ids.forEach(i=>{const seg=SEGS[i];const sc=TL.scenes[seg.si];const o=getScene(sc.name);applyState(segState(seg,t));", "ids.forEach(i=>{const seg=SEGS[i];const sc=TL.scenes[seg.si];const o=getScene(sc.name);applyState(collide(o,segState(seg,t)));")
# room walls are solid
rep("const wm=M('#ffffff',{map:wall});const bw=box(w,h,0.4,wm,0,h/2,-d+3,scene);", "const wm=M('#ffffff',{map:wall});const bw=box(w,h,0.4,wm,0,h/2,-d+3,scene);bw.userData.wall=true;")
rep("[-1,1].forEach(s=>{const sw=box(0.4,h,d,wm,s*w/2,h/2,-d/2+3,scene);});", "[-1,1].forEach(s=>{const sw=box(0.4,h,d,wm,s*w/2,h/2,-d/2+3,scene);sw.userData.wall=true;});")
rep("window.__segs=()=>", "window.__camcheck=f=>{const t=f/30;setT(t);if(!SEGS)buildSegs();let j=SEGS.findIndex(g=>t>=g.start&&t<g.end);if(j<0)j=SEGS.length-1;const seg=SEGS[j];const o=getScene(TL.scenes[seg.si].name);const raw=segState(seg,t);const st=collide(o,raw);return {scene:TL.scenes[seg.si].name,k:seg.k,hit:!!st.hit,dist:+raw.dist.toFixed(2),safe:+st.dist.toFixed(2),info:st.hitInfo||'',c:[raw.c.x,raw.c.y,raw.c.z].map(v=>+v.toFixed(2)),yaw:raw.yaw,pitch:raw.pitch};};window.__segs=()=>")

# ---------- rooms are camera boxes: the camera may not leave a room (no front wall = no peeking past wall edges) ----------
rep("[-1,1].forEach(s=>{const sw=box(0.4,h,d,wm,s*w/2,h/2,-d/2+3,scene);sw.userData.wall=true;});",
    "[-1,1].forEach(s=>{const sw=box(0.4,h,d,wm,s*w/2,h/2,-d/2+3,scene);sw.userData.wall=true;});scene.userData.bounds={x0:-w/2+0.35,x1:w/2-0.35,y0:0.15,y1:h-0.25,z0:-d+3+0.4,z1:2.7};")
rep("if(!o._walls.length)return st;\n  const d=dirFrom(st.yaw,st.pitch);CRAY.set(st.c,d);CRAY.near=0.05;CRAY.far=st.dist;",
    "const d=dirFrom(st.yaw,st.pitch);const B=o.bounds||o.sc.userData.bounds;if(B){let te=1e9;[['x',B.x0,B.x1],['y',B.y0,B.y1],['z',B.z0,B.z1]].forEach(([a,lo,hi])=>{const v=d[a];if(Math.abs(v)<1e-6)return;const tt=((v>0?hi:lo)-st.c[a])/v;if(tt>0)te=Math.min(te,tt);});\n    if(te<st.dist){st={...st,dist:Math.max(0.6,te)};st.hit=true;st.hitInfo='room bounds';}}\n  if(!o._walls.length)return st;CRAY.set(st.c,d);CRAY.near=0.05;CRAY.far=st.dist;")
rep("yaw:F.yaw+DRIFT.yaw*tau", "yaw:F.yaw+((fo&&fo.orbit)||DRIFT.yaw)*tau")
rep("const d=dirFrom(st.yaw,st.pitch);const B=o.bounds||o.sc.userData.bounds;", "const d=dirFrom(st.yaw,st.pitch);const B=st.free?null:(o.bounds||o.sc.userData.bounds);")
rep("return {c:c.add(new THREE.Vector3(0,DRIFT.rise*tau*F.dist,0)),", "return {free:!!(fo&&fo.free),c:c.add(new THREE.Vector3(0,DRIFT.rise*tau*F.dist,0)),")
open('render3d.html', 'w').write(s)
print('assembled', len(s))
