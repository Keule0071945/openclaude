"""Build popcorn-short/render3d.html = assembled food engine (3D world, camera, compositor)
with the food story swapped for Toon2D (drawn 2D characters) + story.js."""
import shutil
for f in ("cartoon2d.js", "narrators.js", "cast2d.js"):  # shared character code lives in shorts-engine
    shutil.copy("../shorts-engine/" + f, f)
src = open('../food-short/render3d.html').read()
lines = src.split('\n')
i_def = next(i for i, l in enumerate(lines) if l.startswith('const DEF={};'))
i_co = next(i for i, l in enumerate(lines) if l.startswith('// ================= compositor'))
toon = open('../shorts-engine/toon2d_engine.js').read()
story = open('story.js').read()
s = '\n'.join(lines[:i_def + 1]) + '\n' + toon + '\n' + story + '\n' + '\n'.join(lines[i_co:])
a = '<script src="lib2d.js"></script>'
assert a in s
s = s.replace(a, a + '\n<script src="cartoon2d.js"></script>\n<script src="narrators.js"></script>\n<script src="cast2d.js"></script>', 1)
for a, b in [("const SAFE={x:0.84,y:0.5};", "const SAFE={x:0.84,y:0.6};"), ("const LOOKY=0.33;", "const LOOKY=0.37;"),
             ("mctx.translate(W/2,H*0.645)", "mctx.translate(W/2,H*0.70)"),
             ("g.filter='contrast(1.08) saturate(0.86)';g.drawImage(glc,0,0)", "g.filter='contrast(1.06) saturate(0.92) brightness(1.08)';g.drawImage(glc,0,0)")]:
    assert a in s, a
    s = s.replace(a, b, 1)
open('render3d.html', 'w').write(s)
print('assembled', len(s))
