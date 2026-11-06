import sys
from PIL import Image
ts=[float(x) for x in sys.argv[2].split(',')];cols=int(sys.argv[3]) if len(sys.argv)>3 else 7
ims=[Image.open('frames/p_%.2f.jpg'%t).resize((270,480)) for t in ts]
rows=(len(ims)+cols-1)//cols;W=Image.new('RGB',(270*cols,480*rows),'#111')
for i,im in enumerate(ims):W.paste(im,((i%cols)*270,(i//cols)*480))
W.save(sys.argv[1],quality=86)
