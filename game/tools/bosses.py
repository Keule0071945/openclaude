# -*- coding: utf-8 -*-
"""Bosse werden aus Zeilenspannen gebaut: leichter zu justieren als getippte Raster.
Jede Figur wird als linke Haelfte gezeichnet und spaeter gespiegelt."""
import math
from art import G, mirror, shift

def paint(g, spans, ch):
    for r, c0, c1 in spans: g.span(r, c0, c1, ch)
    return g

def bands(g, spans, root, width, ch_a, ch_b):
    """Faerbt eine Flaeche in konzentrischen Baendern um einen Wurzelpunkt.
    Ergibt Gefieder- bzw. Flughautstruktur ohne unruhige Einzellinien."""
    for r, c0, c1 in spans:
        for c in range(c0, c1+1):
            d = math.hypot((r - root[0]) * 1.35, c - root[1])
            g.g[r][c] = ch_a if int(d / width) % 2 == 0 else ch_b
    return g

def line(g, r0, c0, r1, c1, ch, only=None):
    """Zieht eine Linie, optional nur ueber bereits gefuellte Zeichen (Streben)."""
    dr, dc = abs(r1-r0), abs(c1-c0)
    sr, sc = (1 if r1 > r0 else -1), (1 if c1 > c0 else -1)
    err = dr - dc
    r, c = r0, c0
    while True:
        if 0 <= r < g.h and 0 <= c < g.w:
            if only is None or g.g[r][c] in only: g.g[r][c] = ch
        if r == r1 and c == c1: break
        e2 = 2*err
        if e2 > -dc: err -= dc; r += sr
        if e2 <  dr: err += dr; c += sc
    return g

# ======================================================= GORGOK (Haelfte 20x30)
def gorgok(frame=0):
    g = G(20, 30)
    # Rumpf und Schultern
    paint(g, [(10,3,19),(11,2,19),(12,2,19),(13,2,19),(14,2,19)], 'G')      # Schulterplatte
    paint(g, [(r,9,19) for r in range(13,27)], 'G')                          # Torso
    paint(g, [(10,9,19),(11,8,19),(12,8,19)], 'G')
    # Kopf, tief zwischen den Schultern
    paint(g, [(1,12,19),(2,11,19),(3,10,19),(4,10,19),(5,10,19),(6,11,19),
              (7,11,19),(8,13,19),(9,13,19)], 'G')
    # Arm, durch Spalte 8 vom Torso getrennt
    paint(g, [(r,2,7) for r in range(15,24)], 'G')
    paint(g, [(24,2,7),(25,3,7)], 'G')
    # Beine mit Mittelspalt
    paint(g, [(27,10,16),(28,9,17)], 'G')
    paint(g, [(29,8,17)], 'd')
    # Schattenkanten und Fugen
    paint(g, [(r,2,2) for r in range(11,25)], 'd')
    paint(g, [(r,9,9) for r in range(13,27)], 'd')
    paint(g, [(12,4,6),(18,11,13),(22,10,12)], 'g')
    paint(g, [(16,3,6),(20,3,6)], 'g')
    # Lichtkanten oben
    paint(g, [(10,4,19),(1,13,19),(15,10,19)], 'L')
    # Moos auf der Schulter
    paint(g, [(11,4,9),(12,5,7)], 'V')
    # Gluehende Risse im Gestein
    line(g, 12, 16, 22, 11, 'C', only='Gg')
    line(g, 14, 11, 20, 15, 'C', only='Gg')
    line(g, 17, 3, 22, 6, 'C', only='Gg')
    # Augen und Kern
    paint(g, [(4,13,14)], 'Y')
    paint(g, [(15,17,19),(16,16,19),(17,15,19),(18,16,19),(19,17,19)], 'C')
    paint(g, [(16,18,19),(17,17,19),(18,18,19)], 'c')
    rows = mirror(g.rows())
    if frame:
        rows = shift(rows, 15, 25, 0, 9, -1)            # Arme heben sich
        rows = shift(rows, 15, 25, 30, 39, -1)
        rows = shift(rows, 1, 9, 10, 29, 1)             # Kopf sackt ab
    return rows

# ==================================================== SERAPHINE (Haelfte 22x34)
WING_DOWN = [(5,11,14),(6,9,14),(7,7,14),(8,5,14),(9,3,14),(10,2,14),(11,1,14),
             (12,0,14),(13,0,13),(14,0,12),(15,1,11),(16,2,10),(17,3,9),
             (18,5,9),(19,7,9)]
WING_UP   = [(1,10,13),(2,8,13),(3,6,13),(4,4,13),(5,2,13),(6,1,13),(7,0,13),
             (8,0,13),(9,0,12),(10,1,11),(11,3,10),(12,5,10),(13,7,10),(14,9,10)]

def seraphine(frame=0):
    g = G(22, 34)
    wing = WING_UP if frame else WING_DOWN
    paint(g, wing, 'W')
    # Federkanten abdunkeln
    bands(g, wing, (wing[0][0] + 3, 15), 3.4, 'W', 'w')
    for r, c0, c1 in wing: g.span(r, c0, c0+1, 'v')
    # Heiligenschein
    paint(g, [(0,17,21)], 'H')
    paint(g, [(1,17,17)], 'H')
    # Kopf
    paint(g, [(3,16,21),(4,15,21),(5,15,21),(6,15,21),(7,15,21),(8,16,21),(9,17,21)], 'S')
    paint(g, [(3,16,18),(4,15,17)], 's')
    paint(g, [(6,17,18)], 'E')
    # Ruestung
    paint(g, [(10,13,21),(11,12,21),(12,12,21),(13,12,21),(14,13,21),(15,13,21),
              (16,14,21),(17,14,21)], 'A')
    paint(g, [(r,12,13) for r in range(11,16)], 'a')
    paint(g, [(10,14,21)], 'A')
    paint(g, [(12,17,21),(13,17,21)], 'C')
    # Gewand, nach unten breiter
    hem = [(18,15,21),(19,14,21),(20,14,21),(21,13,21),(22,13,21),(23,12,21),
           (24,12,21),(25,11,21),(26,11,21),(27,10,21),(28,10,21),(29,9,21),
           (30,9,21),(31,8,21),(32,9,21),(33,11,21)]
    paint(g, hem, 'G')
    for r, c0, c1 in hem: g.span(r, c0, c0+1, 'v')
    paint(g, [(20,16,21),(24,15,21),(28,14,21)], 'A')
    return mirror(g.rows())

# ====================================================== ABADDON (Haelfte 26x38)
DWING_DOWN = [(8,14,17),(9,11,17),(10,8,17),(11,6,17),(12,4,17),(13,2,17),
              (14,1,17),(15,0,17),(16,0,16),(17,0,15),(18,1,14),(19,3,13),
              (20,5,12),(21,7,12),(22,9,12),(23,11,12)]
DWING_UP   = [(2,13,16),(3,10,16),(4,7,16),(5,5,16),(6,3,16),(7,1,16),(8,0,16),
              (9,0,16),(10,0,15),(11,1,14),(12,3,13),(13,5,13),(14,7,13),
              (15,9,13),(16,11,13),(17,13,13)]

def abaddon(frame=0):
    g = G(26, 38)
    wing = DWING_UP if frame else DWING_DOWN
    paint(g, wing, 'K')
    bands(g, wing, (wing[0][0] + 4, 17), 4.2, 'K', 'k')
    for r, c0, c1 in wing: g.span(r, c0, c0+1, 'k')
    # Hoerner, nach aussen gebogen
    paint(g, [(0,15,16),(1,14,16),(2,14,17),(3,15,18)], 'H')
    paint(g, [(0,15,15),(1,14,14)], 'h')
    # Schaedel
    paint(g, [(3,18,25),(4,17,25),(5,16,25),(6,16,25),(7,16,25),(8,16,25),
              (9,17,25),(10,18,25),(11,19,25)], 'R')
    paint(g, [(5,17,18),(6,17,18)], 'Y')                      # Augen
    paint(g, [(9,19,25),(10,20,25)], 'q')                     # Rachen
    paint(g, [(9,20,25)], 'F')
    # Rumpf
    paint(g, [(12,16,25),(13,15,25)] + [(r,14,25) for r in range(14,27)], 'R')
    paint(g, [(r,14,15) for r in range(14,27)], 'r')
    paint(g, [(16,23,25),(17,22,25),(18,21,25),(19,21,25),
              (20,22,25),(21,23,25)], 'F')                     # Glutkern
    paint(g, [(18,24,25),(19,24,25)], 'f')
    paint(g, [(15,17,25),(23,16,25)], 'r')                    # Rippenfugen
    # Becken und Beine
    paint(g, [(27,15,25),(28,15,25),(29,16,25)], 'R')
    paint(g, [(30,16,23),(31,16,22),(32,16,21),(33,17,21)], 'R')
    paint(g, [(34,17,21),(35,17,22),(36,16,22)], 'r')
    paint(g, [(37,15,22)], 'q')
    # Schweif nach aussen
    paint(g, [(30,12,15),(31,10,14),(32,9,12),(33,8,11),(34,8,10)], 'r')
    rows = mirror(g.rows())
    if frame:
        rows = shift(rows, 3, 11, 14, 37, -1)     # Kopf hebt sich beim Fluegelschlag
    return rows

BOSSES = {
    'gorgok':    [gorgok(0), gorgok(1)],
    'seraphine': [seraphine(0), seraphine(1)],
    'abaddon':   [abaddon(0), abaddon(1)],
}
