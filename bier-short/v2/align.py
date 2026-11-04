import re, json, subprocess
OFF=3.45
txt="""Im Jahr 1516 verbot ein bayerischer Herzog, Bier aus Weizen zu brauen.
Klingt streng? Na ja. In Deutschland war Bier damals kein Luxus. Es war Alltag.
Schon im Mittelalter brauten Mönche in ihren Klöstern. In der Fastenzeit war feste Nahrung tabu. Trinken aber nicht. Also brauten sie ihr Bier extra stark. Flüssiges Brot.
Bald braute ein Kloster. Dann jedes Dorf. Dann jede Stadt.
Und manche Brauer kippten rein, was sie fanden: Kräuter, Rinde, sogar giftiges Bilsenkraut.
Also sagte der Herzog: Ab jetzt nur noch Gerste, Hopfen und Wasser.
Moment. Keine Hefe? Die kannte damals noch niemand.
Im Sommer wurde das Brauen bald ganz verboten. Zu heiß. Das Bier verdarb.
Also gruben die Brauer tiefe Keller und pflanzten Kastanien darüber. Für Schatten. Und weil es unter den Bäumen so schön kühl war, schenkten sie gleich dort aus. Der Biergarten war geboren.
Heute gibt es in Deutschland rund 1.500 Brauereien.
Aber warum eigentlich kein Weizen? Weil die Bäcker ihn für ihr Brot brauchten.
Das berühmteste Biergesetz der Welt war also vielleicht … ein Brotgesetz."""
words=txt.replace('…','… ').split()
words=[w for w in words if w!='…'] ; 
# re-attach ellipsis to 'vielleicht'
words=[('vielleicht …' if w=='vielleicht' else w) for w in words]
spoken={'1516':'fünfzehnhundertsechzehn','1.500':'eintausendfünfhundert'}
def syl(w):
    w=spoken.get(w.strip('.,?:!'),w).lower()
    return max(1,len(re.findall(r'[aeiouäöüy]+',w)))
S=[syl(w) for w in words]
# speech segments
out=subprocess.run(['ffmpeg','-hide_banner','-i','voice.mp3','-af','silencedetect=noise=-38dB:d=0.12','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
segs=[]; 
for i in range(len(en)):
    s=en[i]; e=st[i+1] if i+1<len(st) else 76.6
    if e>s: segs.append((s,e))
segs=[(a,b) for a,b in segs if b-a>0.05]
tot=sum(b-a for a,b in segs); rate=tot/sum(S)
n=len(words); m=len(segs); INF=1e18
pre=[0]
for s in S: pre.append(pre[-1]+s)
brk=[2.0 if re.search(r'[.?!:…]$',w) else (0.6 if w.endswith(',') else 0) for w in words]
dp=[[INF]*(n+1) for _ in range(m+1)]; bk=[[0]*(n+1) for _ in range(m+1)]
dp[0][0]=0
for j in range(1,m+1):
    d=segs[j-1][1]-segs[j-1][0]
    for i in range(1,n+1):
        best=INF;bi=0
        for k in range(max(0,i-14),i):
            if dp[j-1][k]>=INF: continue
            exp=(pre[i]-pre[k])*rate
            c=dp[j-1][k]+((d-exp)/max(0.5,d))**2*4 - brk[i-1]
            if c<best: best=c;bi=k
        dp[j][i]=best;bk[j][i]=bi
i=n;parts=[]
for j in range(m,0,-1):
    k=bk[j][i];parts.append((segs[j-1],k,i));i=k
parts.reverse()
wt=[]
for (a,b),k,i in parts:
    tot_s=pre[i]-pre[k];t=a
    print(f"{a-OFF:6.2f}-{b-OFF:6.2f}  "+' '.join(words[k:i]))
    for x in range(k,i):
        d=(b-a)*S[x]/tot_s; wt.append({'w':words[x],'s':round(t-OFF,3),'e':round(t+d-OFF,3)}); t+=d
json.dump(wt,open('words.json','w'),ensure_ascii=False,indent=0)
