# -*- coding: utf-8 -*-
"""Erzeugt den Rasterdaten-Block und schreibt ihn in game/index.html.

Aufruf:  python3 emit.py

Die Raster fuer Helden, Diener, Bosse und Upgrade-Icons werden hier in Python
gebaut und geprueft (Spaltenzahl, Spiegelnaehte). Der fertige Block landet
zwischen den beiden Markern in index.html; alles dazwischen wird ersetzt.
"""
import os, sys
import heroes, bosses, icons

BEGIN = '/* >>> RASTERDATEN — erzeugt von tools/emit.py, nicht von Hand aendern */'
END   = '/* <<< RASTERDATEN */'

def js_rows(rows, indent):
    pad = ' ' * indent
    return '[\n' + ',\n'.join("%s'%s'" % (pad, r) for r in rows) + '\n' + ' '*(indent-2) + ']'

def js_frames(frames, indent=4):
    pad = ' ' * indent
    return '[\n' + ',\n'.join(pad + js_rows(f, indent+2) for f in frames) + '\n' + ' '*(indent-2) + ']'

def build():
    out = [BEGIN, 'const GRID = {};']
    for name, frames in heroes.HEROES.items():
        out.append('GRID.%s = %s;' % (name, js_frames(frames)))
    for name, frames in heroes.MINIONS.items():
        out.append('GRID.%s = %s;' % (name, js_frames(frames)))
    for name, frames in bosses.BOSSES.items():
        out.append('GRID.%s = %s;' % (name, js_frames(frames)))
    out.append('const ICON_GRID = {};')
    for name, rows in icons.ICONS.items():
        out.append("ICON_GRID['%s'] = %s;" % (name, js_rows(rows, 4)))
    out.append(END)
    return '\n'.join(out) + '\n'

block = build()
target = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'index.html')
if os.path.exists(target):
    src = open(target, encoding='utf-8').read()
    if BEGIN in src and END in src:
        head, rest = src.split(BEGIN, 1)
        _, tail = rest.split(END, 1)
        open(target, 'w', encoding='utf-8').write(head + block.rstrip('\n') + tail)
        print('index.html aktualisiert')
    else:
        print('FEHLER: Marker in index.html nicht gefunden', file=sys.stderr); sys.exit(1)
else:
    open('spritedata.js', 'w', encoding='utf-8').write(block)
    print('spritedata.js geschrieben')

n = (sum(len(f) for f in heroes.HEROES.values()) + sum(len(f) for f in heroes.MINIONS.values())
     + sum(len(f) for f in bosses.BOSSES.values()))
print('%d Frames, %d Icons' % (n, len(icons.ICONS)))
