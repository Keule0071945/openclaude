# -*- coding: utf-8 -*-
"""Erzeugt die Sprite-Definitionen fuer Terrabruch.
Raster werden hier gebaut und auf Rechteckigkeit geprueft, dann als JS ausgegeben."""

class G:
    """Ein Zeichenraster. Zeile 0 ist oben, Spalte 0 links."""
    def __init__(self, w, h, fill='.'):
        self.w, self.h = w, h
        self.g = [[fill]*w for _ in range(h)]
    def span(self, r, c0, c1, ch):
        if r < 0 or r >= self.h: return self
        for c in range(max(0,c0), min(self.w-1, c1)+1): self.g[r][c] = ch
        return self
    def px(self, r, c, ch):
        if 0 <= r < self.h and 0 <= c < self.w: self.g[r][c] = ch
        return self
    def rect(self, r0, r1, c0, c1, ch):
        for r in range(r0, r1+1): self.span(r, c0, c1, ch)
        return self
    def blit(self, other, dr=0, dc=0):
        for r in range(other.h):
            for c in range(other.w):
                ch = other.g[r][c]
                if ch != '.': self.px(r+dr, c+dc, ch)
        return self
    def edge(self, ch, only=None):
        """Setzt Randpixel der Silhouette auf ch (fuer Konturen im Raster selbst)."""
        out = [row[:] for row in self.g]
        for r in range(self.h):
            for c in range(self.w):
                if self.g[r][c] == '.': continue
                if only and self.g[r][c] not in only: continue
                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
                    rr, cc = r+dr, c+dc
                    if not (0 <= rr < self.h and 0 <= cc < self.w) or self.g[rr][cc] == '.':
                        out[r][c] = ch; break
        self.g = out
        return self
    def rows(self):
        return [''.join(r) for r in self.g]

def rows_of(lines):
    w = len(lines[0])
    for i, l in enumerate(lines):
        assert len(l) == w, 'Zeile %d hat %d statt %d Zeichen: %r' % (i, len(l), w, l)
    return list(lines)

def mirror(rows):
    """Spiegelt eine linke Haelfte (Mitte = rechter Rand) zur Ganzfigur."""
    return [r + r[::-1] for r in rows]

def swap(base, at, rows):
    out = list(base)
    for i, r in enumerate(rows):
        assert len(r) == len(base[0]), 'Austauschzeile %d passt nicht' % i
        out[at+i] = r
    return out

def shift(rows, r0, r1, c0, c1, dy):
    """Verschiebt einen Rasterausschnitt vertikal (fuer Atem-/Flatterframes)."""
    grid = [list(r) for r in rows]
    cut = [[grid[r][c] for c in range(c0, c1+1)] for r in range(r0, r1+1)]
    for r in range(r0, r1+1):
        for c in range(c0, c1+1): grid[r][c] = '.'
    for i, line in enumerate(cut):
        rr = r0 + i + dy
        if 0 <= rr < len(grid):
            for j, ch in enumerate(line):
                if ch != '.': grid[rr][c0+j] = ch
    return [''.join(r) for r in grid]
