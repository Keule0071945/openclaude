"""Brightness/saturation QA against the reference look (mean luma 150-168, saturation 110-160 on 0-255)."""
import sys, glob
from PIL import Image, ImageStat
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB')
    L = ImageStat.Stat(im.convert('L')).mean[0]; S = ImageStat.Stat(im.convert('HSV')).mean[1]
    flag = ('DARK ' if L < 135 else '') + ('OVERSAT' if S > 175 else '')
    print(f"{f.split('/')[-1]:>14} L={L:5.0f} S={S:5.0f} {flag}")
