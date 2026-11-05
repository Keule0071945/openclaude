"""Build render3d.html = shared 3D engine (food-short build) + Toon2D + kit.js + story.js, with story-format engine settings."""
import shutil
for f in ("cartoon2d.js", "narrators.js", "cast2d.js"):  # shared character code lives in shorts-engine
    shutil.copy("../shorts-engine/" + f, f)
src = open('../food-short/render3d.html').read()
lines = src.split('\n')
i_def = next(i for i, l in enumerate(lines) if l.startswith('const DEF={};'))
i_co = next(i for i, l in enumerate(lines) if l.startswith('// ================= compositor'))
toon = open('../shorts-engine/toon2d_engine.js').read()
s = '\n'.join(lines[:i_def + 1]) + '\n' + toon + '\n' + open('kit.js').read() + '\n' + open('story.js').read() + '\n' + '\n'.join(lines[i_co:])
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
rep("dist:F.dist*Math.max(0.78,1-DRIFT.push*tau)}", "dist:F.dist*(fo&&fo.pull?1+DRIFT.push*2.2*tau:Math.max(0.72,1-DRIFT.push*tau))}")
rep("const XF=0.42;", "const XF=0.24;", 2)
rep("start:k===0?sc.start:sc.start+sh[0]-0.3", "start:k===0?sc.start:sc.start+sh[0]-0.05")
rep("window.renderFrame=", "window.getScene=getScene;window.__segs=()=>SEGS.map(g=>({start:g.start,end:g.end,k:g.k,scene:TL.scenes[g.si].name}));window.renderFrame=")
open('render3d.html', 'w').write(s)
print('assembled', len(s))
