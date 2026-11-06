// helpers shared with popcorn-story (anchors that track objects, arcs, bricks, sky, lamp posts, sticker notes)
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

