# -*- coding: utf-8 -*-
from art import rows_of, swap

# ---------------------------------------------------------------- Helden 16x16
# Zeilen 0-11 Rumpf, 12-15 Beine (drei Varianten fuer den Laufzyklus).

GOCKEL = rows_of([
    '.....RRR........',
    '....RrRRR.......',
    '....WWWWW.......',
    '...WWWWWWW......',
    '...WWEWWWWOO....',
    '...WWWWWWWOo....',
    '...wWWWWWWw.....',
    '..WWWWWWWWww..f.',
    '.WWWWWWWWWWw.fFf',
    'WWWWWWWWWWWwSSFF',
    'WwWWWWWWWWWw.fFf',
    '.swwWWWWWWs...f.',
])
GOCKEL_LEGS = [
    ['..swwwwwws......', '....Y..Y........', '....Y..Y........', '...YYY.YYY......'],
    ['..swwwwwws......', '...Y....Y.......', '..Y......Y......', '.YYY.....YYY....'],
    ['..swwwwwws......', '....YY.Y........', '....Y..Y........', '...YY..YYY......'],
]

RITTER = rows_of([
    '....dSSSd.......',
    '...dSSSSSd......',
    '...SVVVVVS......',
    '...SVCCCVS...S..',
    '...dSSSSSd..SS..',
    '..GdddddddG.SS..',
    '..sAAAAAAAsSS...',
    '.sAAAGGGAAAS....',
    '.sAAAGGGAAAs....',
    '.sAAAAAAAAAs....',
    '..dAAAAAAAd.....',
    '..dsAAAAAsd.....',
])
RITTER_LEGS = [
    ['...dddddd.......', '...ds..sd.......', '...ds..sd.......', '..SSs..sSS......'],
    ['...dddddd.......', '..ds....sd......', '.ds......sd.....', 'SSs.......sSS...'],
    ['...dddddd.......', '...dss.sd.......', '...ds..sd.......', '..SSs..sSS......'],
]

MAGIERIN = rows_of([
    '....HHHHH.......',
    '...HHHHHHH......',
    '...HSSSSSH......',
    '...sSEsSEs......',
    '....SSSSS.......',
    '...GPPPPPG....c.',
    '..PPPPPPPPP..cCc',
    '.PPPPPPPPPPpGCCC',
    '.PPPPPPPPPPpGcCc',
    'PPPPPPPPPPPp..c.',
    'PPPPPPPPPPp.....',
    '.pppPPPPPpp.....',
])
MAGIERIN_LEGS = [
    ['..ppPPPPPPp.....', '..pppppppp......', '...qqq.qqq......', '...HHH.HHH......'],
    ['..ppPPPPPPp.....', '.ppppppppp......', '..qqq...qqq.....', '..HHH....HHH....'],
    ['..ppPPPPPPp.....', '..pppppppp......', '...qq...qqq.....', '...HH....HHH....'],
]

def hero_frames(body, legs):
    """Vier Frames: Stand, Schritt A, Stand, Schritt B."""
    base = body + legs[0]
    a    = body + legs[1]
    b    = body + legs[2]
    return [base, a, base, b]

HEROES = {
    'gockel':   hero_frames(GOCKEL, GOCKEL_LEGS),
    'ritter':   hero_frames(RITTER, RITTER_LEGS),
    'magierin': hero_frames(MAGIERIN, MAGIERIN_LEGS),
}

# --------------------------------------------------------------- Diener 12x12
BAT_A = rows_of([
    '............',
    '............',
    'k..........k',
    'kK...BB...Kk',
    'kKK.BBBB.KKk',
    '.KKKBEEBKKK.',
    '..KKBBBBKK..',
    '...kBBBBk...',
    '....BBBB....',
    '.....BB.....',
    '............',
    '............',
])
BAT_B = rows_of([
    'k..........k',
    'kK........Kk',
    'kKK......KKk',
    '.KKK.BB.KKK.',
    '..KKBBBBKK..',
    '...KBEEBK...',
    '....BBBB....',
    '....BBBB....',
    '.....BB.....',
    '............',
    '............',
    '............',
])
IMP_A = rows_of([
    '..H......H..',
    '..HR....RH..',
    '...RRRRRR...',
    '..RRYRRYRR..',
    '..RRRRRRRR..',
    '..rRRRRRRr..',
    '.RRrRRRRrRR.',
    '.R..RRRR..R.',
    '....RRRR....',
    '....r..r....',
    '...rr..rr...',
    '............',
])
IMP_B = rows_of([
    '..H......H..',
    '..HR....RH..',
    '...RRRRRR...',
    '..RRYRRYRR..',
    '..RRRRRRRR..',
    '.RRRRRRRRRR.',
    '.R.rRRRRr.R.',
    '....RRRR....',
    '....RRRR....',
    '...r....r...',
    '..rr....rr..',
    '............',
])
SKULL_A = rows_of([
    '.....C......',
    '....CCC.....',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '..WKKWWKKW..',
    '..WKKWWKKW..',
    '..WWWWWWWW..',
    '...WWKKWW...',
    '...wWKKWw...',
    '....wWWw....',
    '.....ww.....',
    '............',
])
SKULL_B = rows_of([
    '......C.....',
    '.....CC.....',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '..WKKWWKKW..',
    '..WKKWWKKW..',
    '..WWWWWWWW..',
    '...WWKKWW...',
    '...wWKKWw...',
    '....wWWw....',
    '.....ww.....',
    '............',
])
MINIONS = { 'bat':[BAT_A, BAT_B], 'imp':[IMP_A, IMP_B], 'skull':[SKULL_A, SKULL_B] }
